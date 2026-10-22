"""Generate the 'Order + Credit' collection: Order flows with Credit balance and
history audited after every step. Run from the repository root."""
from pathlib import Path
import json
import shutil
import uuid

POSTMAN = Path(__file__).resolve().parents[1]
OUT = POSTMAN / 'collections' / 'Order + Credit'

HELPERS = r'''
const V = key => pm.environment.get(key);
const send = (method, url, actor, body, key) => new Promise((resolve, reject) => pm.sendRequest({
  method, url,
  header: {
    ...(actor ? { Authorization: 'Bearer ' + V(actor + 'Token') } : {}),
    'Content-Type': 'application/json',
    ...(key ? { 'Idempotency-Key': key } : {}),
  },
  ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body) } }),
}, (error, response) => error ? reject(error) : resolve(response)));
const ledger = actor => JSON.parse(V(actor + 'Ledger') || '[]');
const add = (actor, type, total, reserved, orderVar) =>
  pm.environment.set(actor + 'Ledger', JSON.stringify([...ledger(actor), [type, total, reserved, orderVar || null]]));
// Order answers 202 while Credit is still reconnecting; resend the identical request until it completes.
async function untilDone(again) {
  let response = { code: pm.response.code, json: () => pm.response.json() };
  for (let attempt = 0; attempt < 60 && response.code === 202; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    response = await again();
  }
  return response;
}
async function audit(actor, total, reserved) {
  const balance = await send('GET', V('creditBaseUrl') + '/credits/me/balance', actor);
  pm.test(actor + ' balance ' + total + '/' + reserved + '/' + (total - reserved), () => {
    pm.expect(balance.code).to.equal(200);
    pm.expect(balance.json()).to.deep.equal({
      userId: V(actor + 'Id'), totalCredits: total, reservedCredits: reserved, availableCredits: total - reserved,
    });
  });
  const history = await send('GET', V('creditBaseUrl') + '/credits/me/history?pageSize=100', actor);
  const expected = ledger(actor).map(([type, t, r, orderVar]) => [type, t, r, orderVar ? V(orderVar) : null]);
  pm.test(actor + ' credit history is exactly ' + expected.length + ' expected entries', () => {
    pm.expect(history.code).to.equal(200);
    const actual = history.json().entries.slice().reverse()
      .map(e => [e.type, e.totalAmountChange, e.totalReservedChange, e.orderId ?? null]);
    pm.expect(actual).to.deep.equal(expected);
  });
}
'''

INIT = '''if (!pm.environment.get('runId')) pm.environment.set('runId', pm.variables.replaceIn('{{$guid}}'));
if (!pm.environment.get('expiryTime')) pm.environment.set('expiryTime', new Date(Date.now() + 2 * 3600000).toISOString());'''


def wait_for_credit(up):
    # Lets the presenter stop/start Credit while this request waits (up to 2 minutes).
    want = 'up' if up else 'down'
    return '''(async () => {
const isUp = () => new Promise(resolve => pm.sendRequest(pm.environment.get('creditBaseUrl') + '/health',
  (error, response) => resolve(!error && response.code === 200)));
for (let i = 0; i < 240; i += 1) {
  if ((await isUp()) === %s) return;
  await new Promise(resolve => setTimeout(resolve, 500));
}
throw new Error('Credit is not %s after 2 minutes');
})();''' % ('true' if up else 'false', want)


def status(*codes):
    if len(codes) == 1:
        return f"pm.test('HTTP {codes[0]}', () => pm.response.to.have.status({codes[0]}));\n"
    return f"pm.test('HTTP {' or '.join(map(str, codes))}', () => pm.expect({list(codes)}).to.include(pm.response.code));\n"


def req(folder, name, method, url, actor=None, body=None, key=None, after='', pre=''):
    headers = []
    if actor:
        headers.append({'key': 'Authorization', 'value': 'Bearer {{' + actor + 'Token}}'})
    if key:
        headers.append({'key': 'Idempotency-Key', 'value': key})
    if body is not None:
        headers.append({'key': 'Content-Type', 'value': 'application/json'})
    item = {'name': name, '$kind': 'http-request', 'method': method, 'url': url, 'headers': headers,
            'scripts': [], 'id': uuid.uuid5(uuid.NAMESPACE_URL, 'order-credit/' + folder + name).hex[:24]}
    if pre:
        item['scripts'].append({'type': 'beforeRequest', 'code': pre})
    item['scripts'].append({'type': 'afterResponse', 'code': '(async () => {' + HELPERS + after + '\n})();'})
    if body is not None:
        item['body'] = {'type': 'json', 'content': json.dumps(body)}
    path = OUT / folder / (name + '.request.yaml')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(item, indent=2) + '\n')


orders = '{{orderBaseUrl}}/orders'


def order_body(credits, details):
    return {'supplierId': '{{supplierId}}', 'destination': 'Central Library', 'requestDetails': details,
            'credits': credits, 'expiryTime': '{{expiryTime}}'}


def save_order(var, expected_status='UNASSIGNED'):
    return (f"const order = pm.response.json().order;\n"
            f"if (order) pm.environment.set('{var}', order.id);\n"
            f"pm.test('Order {expected_status}', () => pm.expect(order && order.status).to.equal('{expected_status}'));\n")


if OUT.exists():
    shutil.rmtree(OUT)
(OUT / '.resources').mkdir(parents=True)
(OUT / '.resources' / 'definition.yaml').write_text(
    "$kind: collection\nname: Order + Credit\ndescription: Order flows with Credit balance and history audited after every step.\n")

# 01 Setup: three fresh users; Credit accounts arrive through user.created.
f = '01 Setup'
for i, actor in enumerate('ABC'):
    req(f, f'0{2 * i + 1} Register {actor}', 'POST', '{{userBaseUrl}}/users/register', pre=INIT,
        body={'firstName': 'OrderCredit', 'lastName': actor, 'username': f'oc-{actor.lower()}-{{{{runId}}}}',
              'email': f'oc-{actor.lower()}-{{{{runId}}}}@u.nus.edu', 'password': '{{demoPassword}}'},
        after=status(201) + f"if (pm.response.code === 201) pm.environment.set('{actor}Id', pm.response.json().user.id);")
    req(f, f'0{2 * i + 2} Login {actor}', 'POST', '{{userBaseUrl}}/users/login',
        body={'email': f'oc-{actor.lower()}-{{{{runId}}}}@u.nus.edu', 'password': '{{demoPassword}}'},
        after=status(200) + f"if (pm.response.code === 200) pm.environment.set('{actor}Token', pm.response.json().token);")
req(f, '07 Wait for A B C Credit accounts', 'GET', '{{creditBaseUrl}}/health', after='''
for (let attempt = 0; attempt < 40; attempt += 1) {
  const codes = await Promise.all(['A', 'B', 'C'].map(async actor =>
    (await send('GET', V('creditBaseUrl') + '/credits/me/balance', actor)).code));
  if (codes.every(code => code === 200)) break;
  await new Promise(resolve => setTimeout(resolve, 500));
}
for (const actor of ['A', 'B', 'C']) {
  pm.environment.set(actor + 'Ledger', JSON.stringify([['INITIAL_GRANT', 10, 0, null]]));
  await audit(actor, 10, 0);
}''')

# 02 Scenarios 1-4: create, replay, same key different body, above available.
f = '02 Create replay and insufficient'
req(f, '01 A creates order 1 for 4', 'POST', orders, 'A', order_body(4, 'Order 1'), '{{runId}}-order1',
    status(201) + save_order('order1Id') + "add('A', 'RESERVED', 0, 4, 'order1Id');\nawait audit('A', 10, 4);")
req(f, '02 Same key same body replays', 'POST', orders, 'A', order_body(4, 'Order 1'), '{{runId}}-order1',
    status(200) + "pm.test('Same order 1', () => pm.expect(pm.response.json().order.id).to.equal(V('order1Id')));\nawait audit('A', 10, 4);")
req(f, '03 Same key different body conflicts', 'POST', orders, 'A', order_body(4, 'Changed body'), '{{runId}}-order1',
    status(409) + "await audit('A', 10, 4);")
req(f, '04 Order for 7 above 6 available is rejected', 'POST', orders, 'A', order_body(7, 'Too expensive'), '{{runId}}-order-too-big',
    status(409) + "pm.test('Rejected by dependency', () => pm.expect(pm.response.json().error).to.equal('dependency-rejected'));\nawait audit('A', 10, 4);")

# 03 Scenario 8 (without pickup/deliver, which d3-demo does not implement).
f = '03 Acceptance rules'
req(f, '01 A creates order 4 for 2', 'POST', orders, 'A', order_body(2, 'Order 4'), '{{runId}}-order4',
    status(201) + save_order('order4Id') + "add('A', 'RESERVED', 0, 2, 'order4Id');\nawait audit('A', 10, 6);")
req(f, '02 A cannot accept own order', 'POST', orders + '/{{order4Id}}/accept', 'A', {},
    after=status(403) + "await audit('A', 10, 6);")
req(f, '03 B accepts order 4', 'POST', orders + '/{{order4Id}}/accept', 'B', {},
    after=status(200) + "pm.test('Assigned to B', () => pm.expect(pm.response.json().order.courierId).to.equal(V('BId')));\nawait audit('A', 10, 6);\nawait audit('B', 10, 0);")
req(f, '04 C cannot accept assigned order', 'POST', orders + '/{{order4Id}}/accept', 'C', {},
    after=status(409) + "await audit('A', 10, 6);\nawait audit('C', 10, 0);")
req(f, '05 B cannot deliver before pickup', 'POST', orders + '/{{order4Id}}/deliver', 'B', {},
    after=status(409) + "await audit('A', 10, 6);\nawait audit('B', 10, 0);")

# 04 Scenario 7: create then cancel; reserved goes up by 2 then back.
f = '04 Create then cancel'
req(f, '01 A creates order 3 for 2', 'POST', orders, 'A', order_body(2, 'Order 3'), '{{runId}}-order3',
    status(201) + save_order('order3Id') + "add('A', 'RESERVED', 0, 2, 'order3Id');\nawait audit('A', 10, 8);")
req(f, '02 A cancels order 3', 'POST', orders + '/{{order3Id}}/cancel', 'A', {},
    after=status(200) + "pm.test('Cancelled and refunded', () => { const o = pm.response.json().order; pm.expect(o.status).to.equal('CANCELLED'); pm.expect(o.creditState).to.equal('REFUNDED'); });\nadd('A', 'RELEASED', 0, -2, 'order3Id');\nawait audit('A', 10, 6);")
req(f, '03 Cancelling again changes nothing', 'POST', orders + '/{{order3Id}}/cancel', 'A', {},
    after=status(200) + "await audit('A', 10, 6);")

# 05-06 Scenario 9: Credit down during create. Stop Credit before 05; start it before 06.
req('05 STOP Credit then create order 5', '01 A creates order 5 for 2 while Credit is down', 'POST', orders, 'A',
    order_body(2, 'Order 5'), '{{runId}}-order5', pre=wait_for_credit(False),
    after=status(202) + "pm.test('Creation pending', () => { pm.expect(pm.response.json().state).to.equal('PENDING'); pm.expect(pm.response.json().creationId).to.be.a('string'); });")
f = '06 START Credit then retry create'
req(f, '01 Retry order 5 with the same key and body', 'POST', orders, 'A', order_body(2, 'Order 5'), '{{runId}}-order5',
    pre=wait_for_credit(True), after=f'''
const done = await untilDone(() => send('POST', V('orderBaseUrl') + '/orders', 'A',
  JSON.parse(pm.variables.replaceIn({json.dumps(json.dumps(order_body(2, 'Order 5')))})), pm.variables.replaceIn('{{{{runId}}}}-order5')));
pm.test('Creation completes once Credit is back (HTTP 200 or 201)', () => pm.expect([200, 201]).to.include(done.code));
const order = done.code === 202 ? undefined : done.json().order;
if (order) pm.environment.set('order5Id', order.id);
pm.test('Order UNASSIGNED', () => pm.expect(order && order.status).to.equal('UNASSIGNED'));
add('A', 'RESERVED', 0, 2, 'order5Id');
await audit('A', 10, 8);''')
req(f, '02 Retry again does not hold twice', 'POST', orders, 'A', order_body(2, 'Order 5'), '{{runId}}-order5',
    status(200) + "pm.test('Same order 5', () => pm.expect(pm.response.json().order.id).to.equal(V('order5Id')));\nawait audit('A', 10, 8);")
req(f, '03 A creates order 6 for 2', 'POST', orders, 'A', order_body(2, 'Order 6'), '{{runId}}-order6',
    status(201) + save_order('order6Id') + "add('A', 'RESERVED', 0, 2, 'order6Id');\nawait audit('A', 10, 10);")

# 07-08 Scenario 11: Credit down during cancel. Stop Credit before 07; start it before 08.
req('07 STOP Credit then cancel order 6', '01 A cancels order 6 while Credit is down', 'POST', orders + '/{{order6Id}}/cancel', 'A', {},
    pre=wait_for_credit(False), after=status(202) + "pm.test('Refund pending', () => { const o = pm.response.json().order; pm.expect(o.status).to.equal('CANCELLED'); pm.expect(o.creditState).to.equal('REFUND_PENDING'); });")
req('08 START Credit then retry cancel', '01 A cancels order 6 again', 'POST', orders + '/{{order6Id}}/cancel', 'A', {},
    pre=wait_for_credit(True), after='''
const done = await untilDone(() => send('POST', V('orderBaseUrl') + '/orders/' + V('order6Id') + '/cancel', 'A', {}));
pm.test('Cancellation completes once Credit is back (HTTP 200)', () => pm.expect(done.code).to.equal(200));
pm.test('Refunded', () => pm.expect(done.json().order.creditState).to.equal('REFUNDED'));
add('A', 'RELEASED', 0, -2, 'order6Id');
await audit('A', 10, 8);''')

# 09 Concurrent acceptance: B and C accept the same order at the same time.
f = '09 Concurrent acceptance'
req(f, '01 A creates order 7 for 1', 'POST', orders, 'A', order_body(1, 'Order 7'), '{{runId}}-order7',
    status(201) + save_order('order7Id') + "add('A', 'RESERVED', 0, 1, 'order7Id');\nawait audit('A', 10, 9);")
req(f, '02 B and C accept at the same time', 'GET', '{{orderBaseUrl}}/health', after='''
const url = V('orderBaseUrl') + '/orders/' + V('order7Id') + '/accept';
const [b, c] = await Promise.all([send('POST', url, 'B', {}), send('POST', url, 'C', {})]);
pm.test('Exactly one acceptance wins', () => pm.expect([b.code, c.code].sort()).to.deep.equal([200, 409]));
const winner = b.code === 200 ? 'B' : 'C';
const assigned = await send('GET', V('orderBaseUrl') + '/orders?scope=assigned', winner);
pm.test('Persisted courier is the winner (' + winner + ')', () =>
  pm.expect(assigned.json().orders.find(o => o.id === V('order7Id')).courierId).to.equal(V(winner + 'Id')));
await audit('A', 10, 9);''')

env = {'userBaseUrl': 'http://localhost:3001', 'creditBaseUrl': 'http://localhost:3004',
       'orderBaseUrl': 'http://localhost:33003', 'demoPassword': 'DemoPass1!', 'supplierId': '',
       'runId': '', 'expiryTime': ''}
(POSTMAN / 'environments' / 'order-credit.environment.yaml').write_text(json.dumps(
    {'name': 'Order + Credit - local', 'values': [{'key': k, 'value': v, 'enabled': True} for k, v in env.items()]},
    indent=2) + '\n')
print(f"Generated {len(list(OUT.rglob('*.request.yaml')))} requests in {OUT.relative_to(POSTMAN.parents[1])}")
