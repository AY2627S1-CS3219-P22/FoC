// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Relocated the existing constant-time service-secret verifier into the human-specified gRPC folder.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–024 (prior scopes retained).

import { createHash, timingSafeEqual } from 'node:crypto';

export class AuthenticationError extends Error {}

export function serviceIdentityVerifier(tokens: Readonly<Record<string, string>>) {
  const entries = Object.entries(tokens);
  if (entries.some(([, token]) => token.length === 0)
    || new Set(entries.map(([, token]) => token)).size !== entries.length) {
    throw new Error('Service secrets must be nonempty and distinct');
  }
  const expected = entries.map(([identity, token]) => ({
    identity, digest: createHash('sha256').update(token, 'utf8').digest(),
  }));
  return (token: unknown): string => {
    if (typeof token !== 'string' || token.length === 0) {
      throw new AuthenticationError('Missing service token');
    }
    const digest = createHash('sha256').update(token, 'utf8').digest();
    let identity: string | undefined;
    for (const entry of expected) {
      if (timingSafeEqual(digest, entry.digest)) identity = entry.identity;
    }
    if (!identity) throw new AuthenticationError('Unknown service token');
    return identity;
  };
}

