const assert = require('node:assert/strict');
const { test } = require('node:test');
const { generateKeyPairSync } = require('node:crypto');
const { Metadata, status } = require('@grpc/grpc-js');
const jwt = require('jsonwebtoken');
const { CreditAuthorizer } = require('../dist/security/credit-authorizer');

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const tokens = { 'user-service': 'u'.repeat(64), 'order-service': 'o'.repeat(64),
  'frontend-service': 'f'.repeat(64), 'admin-service': 'a'.repeat(64) };
const events = [];
const authorizer = new CreditAuthorizer({ serviceTokens: tokens, userPublicKey: keys.publicKey, audit: event => events.push(event) });
const sign = (subject = 'user-1', roles = ['USER'], options = {}) => jwt.sign({ roles }, keys.privateKey,
  { algorithm: 'RS256', subject, expiresIn: '15m', ...options });
function metadata(caller, token) {
  const value = new Metadata();
  if (caller) value.set('x-credit-service-token', tokens[caller]);
  if (token) value.set('authorization', `Bearer ${token}`);
  return value;
}
const denied = code => error => error.code === code;

test('unconfigured, missing, incorrect and duplicated credentials fail closed', () => {
  const none = new CreditAuthorizer({ serviceTokens: {}, audit() {} });
  assert.throws(() => none.authorize('InitCredits', metadata('user-service'), { userId: 'u' }), denied(status.UNAUTHENTICATED));
  assert.throws(() => authorizer.authorize('InitCredits', new Metadata(), {}), denied(status.UNAUTHENTICATED));
  const wrong = new Metadata(); wrong.set('x-credit-service-token', 'x'.repeat(64));
  assert.throws(() => authorizer.authorize('InitCredits', wrong, {}), denied(status.UNAUTHENTICATED));
  const duplicate = metadata('user-service'); duplicate.add('x-credit-service-token', tokens['order-service']);
  assert.throws(() => authorizer.authorize('InitCredits', duplicate, {}), denied(status.UNAUTHENTICATED));
});

test('User Service can initialise accounts while Order Service alone can mutate reservations', () => {
  authorizer.authorize('InitCredits', metadata('user-service'), { userId: 'u' });
  for (const rpc of ['ReserveCredits', 'UpdateReservation', 'ReleaseCredits', 'SettleCredits']) {
    authorizer.authorize(rpc, metadata('order-service'), {});
    for (const caller of ['user-service', 'frontend-service', 'admin-service']) {
      assert.throws(() => authorizer.authorize(rpc, metadata(caller, sign('admin', ['USER', 'ADMINISTRATOR'])), {}), denied(status.PERMISSION_DENIED));
    }
  }
  assert.throws(() => authorizer.authorize('InitCredits', metadata('order-service'), {}), denied(status.PERMISSION_DENIED));
  assert.throws(() => authorizer.authorize('GetCreditHistory', metadata('order-service'), { userId: 'u' }), denied(status.PERMISSION_DENIED));
});

test('user-facing reads require a verified JWT and matching subject, including users with admin roles', () => {
  for (const caller of ['user-service', 'frontend-service']) {
    for (const rpc of ['GetBalance', 'GetCreditHistory']) {
      authorizer.authorize(rpc, metadata(caller, sign()), { userId: 'user-1' });
      assert.throws(() => authorizer.authorize(rpc, metadata(caller), { userId: 'user-1' }), denied(status.UNAUTHENTICATED));
      assert.throws(() => authorizer.authorize(rpc, metadata(caller, sign()), { userId: 'other' }), denied(status.PERMISSION_DENIED));
      assert.throws(() => authorizer.authorize(rpc, metadata(caller, sign('admin', ['USER', 'ADMINISTRATOR'])), { userId: 'other' }), denied(status.PERMISSION_DENIED));
    }
  }
});

test('admin reads require both the admin-service credential and Administrator user role', () => {
  authorizer.authorize('GetCreditHistory', metadata('admin-service', sign('admin', ['USER', 'ADMINISTRATOR'])), { userId: 'other' });
  assert.throws(() => authorizer.authorize('GetBalance', metadata('admin-service', sign()), { userId: 'other' }), denied(status.PERMISSION_DENIED));
  assert.throws(() => authorizer.authorize('GetBalance', metadata('admin-service'), { userId: 'other' }), denied(status.UNAUTHENTICATED));
});

test('expired, unsigned, wrong-key, wrong-algorithm and malformed-claim tokens are rejected', () => {
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const invalid = [
    sign('user-1', ['USER'], { expiresIn: -1 }),
    jwt.sign({ roles: ['USER'] }, 'symmetric-secret', { subject: 'user-1', expiresIn: '15m', algorithm: 'HS256' }),
    jwt.sign({ roles: ['USER'] }, other.privateKey, { subject: 'user-1', expiresIn: '15m', algorithm: 'RS256' }),
    jwt.sign({ roles: ['USER'] }, keys.privateKey, { subject: 'user-1', algorithm: 'RS256' }), // No expiry.
    sign('user-1', 'ADMINISTRATOR'), sign('user-1', ['ADMIN']), sign(' user-1'),
    jwt.sign({ roles: ['USER'] }, keys.privateKey, { algorithm: 'RS256', expiresIn: '15m' }), // No subject.
    jwt.sign({ roles: ['USER'], sub: 'user-1' }, '', { algorithm: 'none' }),
  ];
  for (const token of invalid) {
    assert.throws(() => authorizer.authorize('GetBalance', metadata('frontend-service', token), { userId: 'user-1' }), denied(status.UNAUTHENTICATED));
  }
});

test('optional issuer and audience constraints are enforced when configured', () => {
  const strict = new CreditAuthorizer({ serviceTokens: tokens, userPublicKey: keys.publicKey,
    issuer: 'foc-user-service', audience: 'foc-credit', audit() {} });
  assert.throws(() => strict.authorize('GetBalance', metadata('frontend-service', sign()), { userId: 'user-1' }), denied(status.UNAUTHENTICATED));
  strict.authorize('GetBalance', metadata('frontend-service', sign('user-1', ['USER'], { issuer: 'foc-user-service', audience: 'foc-credit' })), { userId: 'user-1' });
});

test('credential configuration rejects shared secrets, weak secrets, missing verification keys and unknown callers', () => {
  assert.throws(() => new CreditAuthorizer({ serviceTokens: { 'user-service': 'short' } }), /at least 32/);
  assert.throws(() => new CreditAuthorizer({ serviceTokens: { 'user-service': tokens['user-service'], 'order-service': tokens['user-service'] } }), /distinct/);
  assert.throws(() => new CreditAuthorizer({ serviceTokens: { 'frontend-service': tokens['frontend-service'] } }), /public key/);
  assert.throws(() => new CreditAuthorizer({ serviceTokens: { attacker: 'x'.repeat(64) } }), /credentials/);
});

test('access decisions are audited without disclosing tokens or request payloads', () => {
  const token = sign();
  authorizer.authorize('GetBalance', metadata('frontend-service', token), { userId: 'user-1', secretBody: 'should-not-be-logged' });
  assert.throws(() => authorizer.authorize('GetBalance', metadata('frontend-service', token), { userId: 'other' }), denied(status.PERMISSION_DENIED));
  const logged = JSON.stringify(events.slice(-2));
  assert.ok(logged.includes('allowed') && logged.includes('denied'));
  assert.ok(logged.includes('frontend-service') && logged.includes('user-1'));
  assert.ok(!logged.includes(token) && !logged.includes(tokens['frontend-service']) && !logged.includes('should-not-be-logged'));
});

test('startup requires scoped credentials and TLS for production or remote listeners', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  function start(overrides) {
    const environment = { ...process.env, DATABASE_URL: 'postgresql://credit:credit@localhost/credit',
      CREDIT_USER_SERVICE_TOKEN: tokens['user-service'], NODE_ENV: 'test', GRPC_HOST: '127.0.0.1', ...overrides };
    for (const key of ['CREDIT_ORDER_SERVICE_TOKEN', 'CREDIT_FRONTEND_SERVICE_TOKEN', 'CREDIT_ADMIN_SERVICE_TOKEN',
      'CREDIT_TLS_CERT_PATH', 'CREDIT_TLS_KEY_PATH']) if (!(key in overrides)) delete environment[key];
    return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.resolve(__dirname, '../dist/env.js'))})`],
      { env: environment, cwd: __dirname, encoding: 'utf8', timeout: 5000 });
  }
  assert.equal(start({}).status, 0);
  const noSecrets = start({ CREDIT_USER_SERVICE_TOKEN: undefined });
  assert.notEqual(noSecrets.status, 0); assert.match(noSecrets.stderr, /scoped credit service credentials/);
  for (const settings of [{ NODE_ENV: 'production' }, { GRPC_HOST: '0.0.0.0' }]) {
    const result = start(settings);
    assert.notEqual(result.status, 0); assert.match(result.stderr, /TLS is required/);
  }
  const partial = start({ CREDIT_TLS_CERT_PATH: '/unused-cert' });
  assert.notEqual(partial.status, 0); assert.match(partial.stderr, /Both CREDIT_TLS/);
});
