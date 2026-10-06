import { after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
// Compile the actual API modules for Node's built-in runner; no test dependency required.
const dir = mkdtempSync(join(tmpdir(), 'foc-api-test-'))
for (const name of ['client', 'users', 'suppliers']) {
  const source = readFileSync(new URL(`../api/${name}.ts`, import.meta.url), 'utf8').replaceAll('import.meta.env', '({})').replaceAll("'./client'", "'./client.mjs'")
  writeFileSync(join(dir, `${name}.mjs`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)
}
after(() => rmSync(dir, { recursive: true, force: true }))
const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) } }
globalThis.sessionStorage = storage(); globalThis.localStorage = storage(); globalThis.window = new EventTarget()
const client = await import(pathToFileURL(join(dir, 'client.mjs')))
const suppliers = await import(pathToFileURL(join(dir, 'suppliers.mjs')))
const users = await import(pathToFileURL(join(dir, 'users.mjs')))
let calls, body, status
beforeEach(() => {
  client.clearToken(); calls = []; body = {}; status = 200
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
})
const row = { supplierId: 1, name: 'Cafe', type: 'food', buildingName: 'COM3', locationDescription: 'Lobby', floor: 1, latitude: '1.3', longitude: '103.7', startingTime: '0900hrs', closingTime: '1800hrs', imageURL: 'NA', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }
test('login uses the existing credentials contract; profile requests attach the JWT', async () => {
  body = { token: 'signed-token' }; const result = await users.login('student@u.nus.edu', 'password')
  assert.equal(calls[0].url, '/api/users/users/login'); assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'student@u.nus.edu', password: 'password' })
  client.saveToken(result.token); body = { user: { id: 'user-1', roles: ['USER'] } }; await users.getMe()
  assert.equal(calls[1].options.headers.get('Authorization'), 'Bearer signed-token')
  assert.equal(localStorage.getItem('foc.token'), null)
})
test('remember-me storage and logout clear both token stores', () => {
  client.saveToken('persistent', true); assert.equal(localStorage.getItem('foc.token'), 'persistent')
  client.saveToken('session'); assert.equal(localStorage.getItem('foc.token'), null)
  client.clearToken(); assert.equal(client.getToken(), null)
})
test('list, details, search and category requests use existing routes and normalize SQL names', async () => {
  body = { data: [row] }; assert.deepEqual(await suppliers.listSuppliers(), [row]); assert.equal(calls[0].url, '/api/suppliers/suppliers')
  body = { data: row }; assert.deepEqual(await suppliers.getSupplier(1), row)
  body = { data: [{ id: '1', Name: 'Cafe', Type: 'food', Building: 'COM3', Floor: '1', 'Location Description': 'Lobby', Latitude: '1.3', Longitude: '103.7', StartingTime: '0900hrs', ClosingTime: '1800hrs', ImageURL: 'NA', created_at: row.createdAt, updated_at: row.updatedAt }] }
  assert.deepEqual(await suppliers.listSuppliers('Cafe & coffee', 'food'), [row]); assert.match(calls.at(-1).url, /search\?q=Cafe%20%26%20coffee$/)
  assert.deepEqual(await suppliers.listSuppliers('Cafe', 'printing'), [])
  await suppliers.listSuppliers('', 'food/coffee'); assert.match(calls.at(-1).url, /category\?type=food%2Fcoffee$/)
})
test('create, update and delete preserve backend contracts and version timestamp', async () => {
  client.saveToken('admin-token'); body = { data: row }
  const { supplierId, createdAt, updatedAt, ...input } = row
  await suppliers.saveSupplier(input); assert.equal(calls[0].options.method, 'POST'); assert.deepEqual(JSON.parse(calls[0].options.body), input)
  await suppliers.saveSupplier({ ...input, name: 'New cafe' }, row)
  assert.equal(calls[1].options.method, 'PUT'); assert.equal(JSON.parse(calls[1].options.body).expectedUpdatedAt, updatedAt)
  assert.equal(calls[1].options.headers.get('Authorization'), 'Bearer admin-token')
  await suppliers.deleteSupplier(1); assert.equal(calls[2].options.method, 'DELETE')
})
test('conflicts surface to the editor without silently retrying or overwriting', async () => {
  status = 409; body = { message: 'Supplier was modified concurrently' }
  await assert.rejects(suppliers.saveSupplier({}, row), err => err.status === 409 && /concurrently/.test(err.message)); assert.equal(calls.length, 1)
})
test('unauthorized responses clear expired sessions; forbidden responses retain them', async () => {
  client.saveToken('expired'); status = 401; body = { error: 'Unauthorized' }
  let expired = false; window.addEventListener('foc:unauthorized', () => { expired = true }, { once: true })
  await assert.rejects(users.getMe()); assert.equal(client.getToken(), null); assert.equal(expired, true)
  client.saveToken('regular'); status = 403; await assert.rejects(suppliers.deleteSupplier(1)); assert.equal(client.getToken(), 'regular')
})
test('validation errors include field details', async () => {
  status = 400; body = { error: 'Validation failed', details: { email: ['Email must be an NUS address'] } }
  await assert.rejects(users.register({}), /email: Email must be an NUS address/)
})
