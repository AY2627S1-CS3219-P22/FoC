import { readFileSync } from 'node:fs';
import { ServerCredentials } from '@grpc/grpc-js';
import { env } from '../env';
import type { CreditSecurityConfig } from './credit-authorizer';

export function securityConfig(): CreditSecurityConfig {
  const serviceTokens: CreditSecurityConfig['serviceTokens'] = {};
  if (env.CREDIT_USER_SERVICE_TOKEN) serviceTokens['user-service'] = env.CREDIT_USER_SERVICE_TOKEN;
  if (env.CREDIT_ORDER_SERVICE_TOKEN) serviceTokens['order-service'] = env.CREDIT_ORDER_SERVICE_TOKEN;
  if (env.CREDIT_FRONTEND_SERVICE_TOKEN) serviceTokens['frontend-service'] = env.CREDIT_FRONTEND_SERVICE_TOKEN;
  if (env.CREDIT_ADMIN_SERVICE_TOKEN) serviceTokens['admin-service'] = env.CREDIT_ADMIN_SERVICE_TOKEN;
  return { serviceTokens,
    userPublicKey: env.CREDIT_USER_JWT_PUBLIC_KEY_PATH ? readFileSync(env.CREDIT_USER_JWT_PUBLIC_KEY_PATH, 'utf8') : undefined,
    issuer: env.CREDIT_USER_JWT_ISSUER, audience: env.CREDIT_USER_JWT_AUDIENCE };
}

export function transportCredentials(): ServerCredentials {
  if (!env.CREDIT_TLS_CERT_PATH || !env.CREDIT_TLS_KEY_PATH) return ServerCredentials.createInsecure();
  return ServerCredentials.createSsl(null, [{
    cert_chain: readFileSync(env.CREDIT_TLS_CERT_PATH), private_key: readFileSync(env.CREDIT_TLS_KEY_PATH),
  }]);
}
