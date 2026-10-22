# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
# Scope: Converted existing native requests to Postman v2.1 JSON and blank environment.
# Human review pending; approved JSON attribution: README.md and ../usage-log.md.
from pathlib import Path
import json
import subprocess
import uuid

root = Path(__file__).resolve().parent
out = root / 'web-import'
out.mkdir(exist_ok=True)
def read_native(path):
    return json.loads('\n'.join(line for line in path.read_text().splitlines() if not line.startswith('#')))

collection = {
    'info': {
        '_postman_id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'foc-order-live-demo-web')),
        'name': 'Order Live Demo',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        'description': 'AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore. Generated from the approved implemented Order endpoints; converted native demo to v2.1 JSON. Human review pending. Prompts and verification: order-service/usage-log.md. Import the accompanying blank environment. Use Desktop Agent for localhost. Run folders 01–06 in order; pause in 02 to set a currently open supplierId. Folder 07 needs a real administrator token. See order-service/postman/README.md. No live API execution is claimed.'
    },
    'item': []
}
collection['event'] = [{'listen':'prerequest','script':{'type':'text/javascript','exec':(root/'auth-preflight.js').read_text().splitlines()}}]
count = 0
for folder in sorted((root / 'collections' / 'Order live demo').iterdir()):
    if not folder.is_dir(): continue
    group = {'name': folder.name, 'item': []}
    for path in sorted(folder.glob('*.request.yaml')):
        native = read_native(path)
        request = {'method': native['method'], 'header': native.get('headers', []), 'url': native['url'], 'auth': {'type': 'noauth'}}
        if 'body' in native:
            request['body'] = {'mode': 'raw', 'raw': native['body']['content'], 'options': {'raw': {'language': 'json'}}}
        events = []
        for script in native.get('scripts', []):
            subprocess.run(['node', '--check'], input=script['code'], text=True, capture_output=True, check=True)
            events.append({'listen': {'beforeRequest': 'prerequest', 'afterResponse': 'test'}[script['type']], 'script': {'type': 'text/javascript', 'exec': script['code'].splitlines()}})
        group['item'].append({'name': native['name'], 'request': request, 'event': events, 'response': []})
        count += 1
    collection['item'].append(group)
# Build a blank template from constants; never export populated native tokens.
values = {'userBaseUrl': 'http://localhost:3001', 'supplierBaseUrl': 'http://localhost:3002', 'creditBaseUrl': 'http://localhost:3004', 'orderBaseUrl': 'http://localhost:33003', 'demoPassword': 'DemoPass1!', 'supplierId': '', 'runId': '', 'expiryTime': '', 'AToken': '', 'BToken': '', 'AId': '', 'BId': '', 'orderId': '', 'cancelOrderId': '', 'adminToken': ''}
env = {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'foc-order-live-demo-env')), 'name': 'Order Live Demo - local', 'values': [{'key': k, 'value': v, 'enabled': True, 'type': 'secret' if k.endswith('Token') or k == 'demoPassword' else 'default'} for k, v in values.items()], '_postman_variable_scope': 'environment', '_postman_exported_using': 'Order demo exporter; AI disclosure in collection description and README.md'}
for name, data in [('Order-Live-Demo.postman_collection.json', collection), ('Order-Live-Demo.postman_environment.json', env)]:
    (out / name).write_text(json.dumps(data, indent=2) + '\n')
assert count == 33
assert all(not v['value'] for v in env['values'] if v['key'].endswith('Token'))
print(f'Exported {count} requests in {len(collection["item"])} folders; scripts parsed; all tokens blank.')
