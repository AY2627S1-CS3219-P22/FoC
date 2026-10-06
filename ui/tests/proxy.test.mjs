import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { createServer, loadConfigFromFile } from 'vite'

test('Vite serves API client modules locally and proxies only endpoint paths', async () => {
  const requests = []
  const backend = createHttpServer((req, res) => {
    requests.push(req.url)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ path: req.url }))
  })
  let vite
  try {
    backend.listen(0, '127.0.0.1')
    await once(backend, 'listening')
    const root = fileURLToPath(new URL('../', import.meta.url))
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' }, `${root}vite.config.ts`)
    assert.ok(loaded)
    const proxy = Object.fromEntries(Object.entries(loaded.config.server.proxy).map(([prefix, options]) =>
      [prefix, { ...options, target: `http://127.0.0.1:${backend.address().port}` }]))
    vite = await createServer({ ...loaded.config, configFile: false, root,
      server: { ...loaded.config.server, proxy, host: '127.0.0.1', port: 0, open: false, hmr: false } })
    await vite.listen()
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`
    for (const path of ['/api/users.ts', '/api/suppliers.ts?t=1']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('Content-Type'), /javascript/)
      assert.match(await response.text(), /export/)
    }
    assert.deepEqual(requests, [], 'Source modules must never reach the backend')
    for (const [path, expected] of [['/api/users/users/me', '/users/me'], ['/api/suppliers/suppliers?type=food', '/suppliers?type=food']]) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { path: expected })
    }
    assert.deepEqual(requests, ['/users/me', '/suppliers?type=food'])
  } finally {
    await vite?.close()
    if (backend.listening) await new Promise(resolve => backend.close(resolve))
  }
})
