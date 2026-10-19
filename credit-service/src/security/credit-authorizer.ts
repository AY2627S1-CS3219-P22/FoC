import { createPublicKey, timingSafeEqual, type KeyObject } from 'node:crypto';
import { Metadata, status } from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';

export type CreditCaller = 'user-service' | 'order-service' | 'frontend-service' | 'admin-service';
export type CreditRpc = 'InitCredits' | 'GetBalance' | 'GetCreditHistory' | 'ReserveCredits' | 'UpdateReservation' | 'ReleaseCredits' | 'SettleCredits' | 'GetReservation';
export interface AccessEvent {
  timestamp: string;
  rpc: CreditRpc;
  caller?: CreditCaller;
  actorId?: string;
  targetUserId?: string;
  decision: 'allowed' | 'denied';
  code: number;
}
export interface CreditSecurityConfig {
  serviceTokens: Partial<Record<CreditCaller, string>>;
  userPublicKey?: string | KeyObject;
  issuer?: string;
  audience?: string;
  audit?: (event: AccessEvent) => void;
}
export class CreditAccessError extends Error {
  constructor(public readonly code: number, message: string) { super(message); }
}

const permissions: Record<CreditCaller, readonly CreditRpc[]> = {
  'user-service': ['InitCredits', 'GetBalance', 'GetCreditHistory'],
  'order-service': ['ReserveCredits', 'UpdateReservation', 'ReleaseCredits', 'SettleCredits', 'GetReservation', 'GetBalance'],
  'frontend-service': ['GetBalance', 'GetCreditHistory'],
  'admin-service': ['GetBalance', 'GetCreditHistory'],
};
const reads = new Set<CreditRpc>(['GetBalance', 'GetCreditHistory']);

function oneString(metadata: Metadata, name: string): string | undefined {
  const values = metadata.get(name);
  return values.length === 1 && typeof values[0] === 'string' ? values[0] : undefined;
}

export class CreditAuthorizer {
  private readonly tokens: [CreditCaller, Buffer][];
  private readonly publicKey?: KeyObject;
  private readonly audit: (event: AccessEvent) => void;

  constructor(private readonly config: CreditSecurityConfig) {
    const seen = new Set<string>();
    this.tokens = Object.entries(config.serviceTokens).map(([caller, token]) => {
      if (!Object.hasOwn(permissions, caller) || !token || token.length < 32 || seen.has(token)) {
        throw new Error('Credit service credentials must be distinct secrets of at least 32 characters');
      }
      seen.add(token);
      return [caller as CreditCaller, Buffer.from(token)];
    });
    if (config.userPublicKey) {
      this.publicKey = typeof config.userPublicKey === 'string' ? createPublicKey(config.userPublicKey) : config.userPublicKey;
      if (this.publicKey.type !== 'public' || this.publicKey.asymmetricKeyType !== 'rsa'
        || (this.publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
        throw new Error('User JWT verification requires an RSA public key of at least 2048 bits');
      }
    }
    if ((config.serviceTokens['frontend-service'] || config.serviceTokens['admin-service']) && !this.publicKey) {
      throw new Error('Frontend/admin credit access requires the User Service JWT public key');
    }
    this.audit = config.audit ?? (event => console.info(JSON.stringify({ event: 'credit_access', ...event })));
  }

  authorize(rpc: CreditRpc, metadata: Metadata, request: unknown): void {
    const event: AccessEvent = { timestamp: new Date().toISOString(), rpc, decision: 'denied', code: status.UNAUTHENTICATED };
    try {
      const supplied = oneString(metadata, 'x-credit-service-token');
      const actual = supplied ? Buffer.from(supplied) : Buffer.alloc(0);
      // Derive identity from the credential, never from a caller-supplied service name.
      for (const [caller, token] of this.tokens) {
        if (actual.length === token.length && timingSafeEqual(actual, token)) event.caller = caller;
      }
      if (!event.caller) throw new CreditAccessError(status.UNAUTHENTICATED, 'Valid service credentials required');
      if (!permissions[event.caller].includes(rpc)) throw new CreditAccessError(status.PERMISSION_DENIED, 'Service cannot perform this credit operation');
      if (reads.has(rpc)) {
        const target = (request as { userId?: unknown } | null)?.userId;
        if (typeof target === 'string' && target.length <= 200) event.targetUserId = target;
        // Order Service has trusted balance access for its reservation precheck; no history access.
        if (event.caller !== 'order-service') {
          const actor = this.authenticateUser(metadata);
          event.actorId = actor.sub;
          if (event.caller === 'admin-service') {
            if (!actor.roles.includes('ADMINISTRATOR')) throw new CreditAccessError(status.PERMISSION_DENIED, 'Administrator role required');
          } else if (target !== actor.sub) {
            throw new CreditAccessError(status.PERMISSION_DENIED, 'Users may only access their own credits');
          }
        }
      }
      event.decision = 'allowed';
      event.code = status.OK;
    } catch (error) {
      if (error instanceof CreditAccessError) event.code = error.code;
      throw error;
    } finally {
      // No JWTs, service secrets, or request bodies are recorded.
      this.audit(event);
    }
  }

  private authenticateUser(metadata: Metadata): { sub: string; roles: string[] } {
    try {
      const header = oneString(metadata, 'authorization');
      if (!this.publicKey || !header?.startsWith('Bearer ')) throw new Error();
      const payload = jwt.verify(header.slice(7), this.publicKey, {
        algorithms: ['RS256'], issuer: this.config.issuer, audience: this.config.audience,
      });
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.sub
        || payload.sub.length > 200 || payload.sub.trim() !== payload.sub || /[\x00-\x1f]/.test(payload.sub)
        || !Number.isInteger(payload.exp) || !Array.isArray(payload.roles) || payload.roles.length === 0
        || payload.roles.some(role => role !== 'USER' && role !== 'ADMINISTRATOR')) throw new Error();
      return { sub: payload.sub, roles: payload.roles };
    } catch { throw new CreditAccessError(status.UNAUTHENTICATED, 'Valid user authentication required'); }
  }
}
