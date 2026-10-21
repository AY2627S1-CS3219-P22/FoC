// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
// Scope: Implemented the human-finalized own-balance/history REST paths, query fields, JWT identity, and JSON shapes.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–026 (prior scopes retained).
// Changes in entry 026: Pending human review; prior review markers apply to earlier content.

import { createServer, type ServerResponse } from 'node:http';
import { status } from '@grpc/grpc-js';
import type { CreditService } from '../services/CreditService';
import { AuthenticationError, userTokenVerifier } from './auth';
import { grpcError } from '../grpc/errors';
import { ValidationError } from '../services/validation';

function json(response: ServerResponse, code: number, payload: unknown): void {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function optionalQuery(query: URLSearchParams, name: string): string | undefined {
  const values = query.getAll(name);
  if (values.length > 1) throw new ValidationError(`${name} must occur at most once`);
  return values[0];
}

export function createRestServer(service: CreditService, publicKeyPem: string) {
  const identify = userTokenVerifier(publicKeyPem);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://credit-service');
      if (request.method !== 'GET' || !['/credits/me/balance', '/credits/me/history'].includes(url.pathname)) {
        json(response, 404, { error: 'Not Found', message: 'Endpoint not found.' });
        return;
      }
      const userId = identify(request.headers.authorization);
      if (url.pathname === '/credits/me/balance') {
        json(response, 200, await service.getBalance({ userId }));
      } else {
        const rawSize = optionalQuery(url.searchParams, 'pageSize');
        if (rawSize !== undefined && !/^[0-9]+$/.test(rawSize)) throw new ValidationError('Invalid pageSize');
        const result = await service.getUserCreditHistory({
          userId, pageSize: rawSize === undefined ? undefined : Number(rawSize),
          pageToken: optionalQuery(url.searchParams, 'pageToken'),
        });
        json(response, 200, result);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        json(response, 401, { error: 'Unauthorized', message: error.message });
        return;
      }
      const mapped = grpcError(error);
      const [code, label] = mapped.code === status.INVALID_ARGUMENT ? [400, 'Bad Request']
        : mapped.code === status.NOT_FOUND ? [404, 'Not Found']
        : [status.UNAVAILABLE, status.ABORTED, status.DEADLINE_EXCEEDED].includes(mapped.code) ? [503, 'Service Unavailable']
        : [500, 'Internal Server Error'];
      json(response, code, { error: label, message: mapped.details });
    }
  });
}
