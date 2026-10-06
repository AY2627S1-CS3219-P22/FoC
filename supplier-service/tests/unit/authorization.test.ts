import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Exercise the real router and JWT middleware without a database. Reaching a
// controller proves the role gate passed; CRUD/database tests remain separate.
vi.mock('@/api/supplier-controller', () => {
  const ok = (_req: express.Request, res: express.Response) => res.json({ reachedController: true });
  return { getAllSuppliers: ok, getSupplierById: ok, deleteSupplierById: ok,
    createSupplier: ok, updateSupplierById: ok, searchSuppliers: ok, filterSuppliersByCategory: ok };
});
const dir = mkdtempSync(path.join(tmpdir(), 'foc-auth-'));
const pair = generateKeyPairSync('rsa', { modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
writeFileSync(path.join(dir, 'public.pem'), pair.publicKey);
process.env.USER_SERVICE_PUBLIC_KEY_PATH = path.join(dir, 'public.pem');
const app = express();
beforeAll(async () => { app.use(express.json()); app.use((await import('../../src/api/router')).default); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const token = (roles: unknown, expiresIn = 300) => jwt.sign({ roles }, pair.privateKey, { algorithm: 'RS256', subject: 'user-id', expiresIn });
const valid = { name: 'Cafe', type: 'food', buildingName: 'COM3', locationDescription: 'Lobby', floor: 1, latitude: '1.3', longitude: '103.7' };
for (const [method, url, body] of [
  ['post', '/supplier', valid],
  ['put', '/supplier/1', { ...valid, expectedUpdatedAt: '2026-10-01T00:00:00.000Z' }],
  ['delete', '/supplier/1', {}],
] as const) {
  describe(`${method.toUpperCase()} ${url}`, () => {
    it('rejects anonymous callers', async () => { expect((await request(app)[method](url).send(body)).status).toBe(401); });
    it('rejects ordinary users', async () => { expect((await request(app)[method](url).set('Authorization', `Bearer ${token(['USER'])}`).send(body)).status).toBe(403); });
    it('rejects missing roles and a forged string role claim', async () => {
      for (const roles of [undefined, 'ADMINISTRATOR']) expect((await request(app)[method](url).set('Authorization', `Bearer ${token(roles)}`).send(body)).status).toBe(403);
    });
    it('rejects expired and malformed tokens', async () => {
      for (const t of [token(['ADMINISTRATOR'], -10), 'bad-token']) expect((await request(app)[method](url).set('Authorization', `Bearer ${t}`).send(body)).status).toBe(401);
    });
    it('allows authenticated administrators through to the controller', async () => {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${token(['USER', 'ADMINISTRATOR'])}`).send(body);
      expect(res.status).toBe(200); expect(res.body.reachedController).toBe(true);
    });
  });
}
it('allows public supplier reads', async () => { expect((await request(app).get('/suppliers')).status).toBe(200); });
