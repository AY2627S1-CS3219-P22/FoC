// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Order API transport/status/auth retry tests; author review pending.
// Prompts and verification: ../../order-service/usage-log.md.
const { test } = require("node:test"),
  assert = require("node:assert/strict")
const ts = require("typescript"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm")
function load(fetch) {
  const values = new Map([["token", "original-token"]]),
    cache = {}
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  function moduleAt(name) {
    const filename = path.resolve(__dirname, "../api", name + ".ts")
    if (cache[filename]) return cache[filename]
    const module = { exports: {} }
    cache[filename] = module.exports
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      require: (ref) => moduleAt(ref.replace("./", "")),
      fetch,
      localStorage: storage,
      Error,
      Promise,
      Date,
    })
    return module.exports
  }
  return { orders: moduleAt("orders"), client: moduleAt("client"), storage }
}
const row = {
  id: "order-1",
  supplierId: "1",
  pickupStore: "Cafe",
  pickupLocation: "COM3",
  destination: "PGP",
  requestDetails: "Coffee",
  credits: 4,
  expiryTime: "2026-10-23T12:00:00Z",
  status: "UNASSIGNED",
  creditState: "RESERVED",
  cancellationReason: null,
  requesterId: "requester",
  requesterName: "Student",
  courierId: null,
  courierName: null,
  createdAt: "2026-10-22T12:00:00Z",
}
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})
test("listing scopes and administrator read use the approved proxy contract and JWT", async () => {
  const calls = []
  const { orders } = load(async (url, options) => {
    calls.push([url, options])
    return response({ orders: [row] })
  })
  for (const scope of ["open", "requested", "assigned", undefined]) {
    const rows = await orders.getOrders(scope)
    assert.equal(rows[0].deliveryLocation, "PGP")
    assert.equal(rows[0].description, "Coffee")
    assert.equal(rows[0].supplierId, "1")
    assert.equal(rows[0].status, "open")
  }
  assert.deepEqual(
    calls.map((call) => call[0]),
    [
      "/backend/orders?scope=open",
      "/backend/orders?scope=requested",
      "/backend/orders?scope=assigned",
      "/backend/orders",
    ],
  )
  assert.ok(
    calls.every(
      (call) => call[1].headers.Authorization === "Bearer original-token",
    ),
  )
})
test("pending, settlement and expiry are mapped without inventing paid/completed results", () => {
  const { orders } = load(() => {})
  assert.equal(
    orders.fromApiOrder({
      ...row,
      status: "DELIVERED",
      creditState: "SETTLEMENT_PENDING",
    }).status,
    "delivered",
  )
  assert.equal(
    orders.fromApiOrder({ ...row, status: "DELIVERED", creditState: "SETTLED" })
      .status,
    "completed",
  )
  assert.equal(
    orders.fromApiOrder({
      ...row,
      status: "CANCELLED",
      cancellationReason: "EXPIRY",
    }).status,
    "expired",
  )
})
test("creation and edit preserve body/key and expose HTTP 202 for pending operations", async () => {
  const calls = []
  const { orders } = load(async (url, options) => {
    calls.push([url, options])
    return response(
      url.endsWith("/orders")
        ? { creationId: "pending-id", state: "PENDING" }
        : { order: row },
      202,
    )
  })
  const body = {
    supplierId: "1",
    destination: "PGP",
    requestDetails: "Coffee",
    credits: 4,
    expiryTime: row.expiryTime,
  }
  const created = await orders.createOrder(body, "stable-key")
  assert.equal(created.status, 202)
  assert.equal(created.order, undefined)
  assert.equal(created.creationId, "pending-id")
  await orders.createOrder(body, "stable-key")
  const edited = await orders.editOrder("order-1", { credits: 6 }, "edit-key")
  assert.equal(edited.status, 202)
  assert.equal(calls[0][1].body, calls[1][1].body)
  assert.equal(calls[0][1].headers["Idempotency-Key"], "stable-key")
  assert.equal(calls[2][1].method, "PATCH")
  assert.equal(calls[2][1].headers["Idempotency-Key"], "edit-key")
})
test("accept/cancel/deliver call backend and propagate denied/unavailable responses", async () => {
  let failure
  const calls = []
  const { orders } = load(async (url, options) => {
    calls.push([url, options])
    return response(
      failure ? { error: "dependency-unavailable" } : { order: row },
      failure ?? 200,
    )
  })
  for (const action of ["accept", "cancel", "deliver"])
    await orders.changeOrder("order-1", action)
  assert.deepEqual(
    calls.map((c) => c[0]),
    [
      "/backend/orders/order-1/accept",
      "/backend/orders/order-1/cancel",
      "/backend/orders/order-1/deliver",
    ],
  )
  for (const status of [403, 409, 503]) {
    failure = status
    await assert.rejects(
      () => orders.changeOrder("order-1", "accept"),
      (e) => e.status === status,
    )
  }
})
test("401 refresh retry keeps mutation idempotency key and exact JSON body", async () => {
  const calls = []
  let attempt = 0
  const { orders } = load(async (url, options) => {
    calls.push([url, options])
    if (url === "/backend/users/refresh")
      return response({ token: "refreshed" })
    return ++attempt === 1 ? response({}, 401) : response({ order: row }, 201)
  })
  await orders.createOrder(
    {
      supplierId: "1",
      destination: "PGP",
      requestDetails: "Coffee",
      credits: 4,
      expiryTime: row.expiryTime,
    },
    "same-key",
  )
  assert.equal(calls.length, 3)
  assert.equal(calls[0][1].body, calls[2][1].body)
  assert.equal(calls[2][1].headers["Idempotency-Key"], "same-key")
  assert.equal(calls[2][1].headers.Authorization, "Bearer refreshed")
})
test("network failures have no fabricated successful order response", async () => {
  const { orders } = load(async () => {
    throw new Error("offline")
  })
  await assert.rejects(
    () => orders.getOrders("open"),
    (error) => error.status === 0,
  )
})
