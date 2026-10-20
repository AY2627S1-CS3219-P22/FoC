// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
// Scope: Encoded and validated the human-finalized base64url user/sequence bookmark.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–025 (prior scopes retained).

import { TextDecoder } from 'node:util';
import { ValidationError } from './validation';

export function encodeHistoryBookmark(userId: string, sequenceId: string): string {
  return Buffer.from(JSON.stringify({ userId, sequenceId }), 'utf8').toString('base64url');
}

export function decodeHistoryBookmark(token: unknown, userId: string): string {
  const invalid = () => new ValidationError('Invalid history page token');
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalid();
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.toString('base64url') !== token) throw invalid();
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof TypeError
      && (error as NodeJS.ErrnoException).code === 'ERR_ENCODING_INVALID_ENCODED_DATA')) throw invalid();
    throw error;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const fields = value as Record<string, unknown>;
  if (Object.keys(fields).length !== 2 || fields.userId !== userId
    || typeof fields.sequenceId !== 'string' || !/^[1-9][0-9]*$/.test(fields.sequenceId)
    || BigInt(fields.sequenceId) > 9223372036854775807n) throw invalid();
  return fields.sequenceId;
}
