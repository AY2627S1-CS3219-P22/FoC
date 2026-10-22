# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
# Scope: Generated native Postman YAML demo from approved implemented endpoints.
# Human review pending; exact prompt/checks: ../usage-log.md.
from pathlib import Path
import json
import uuid

ROOT = Path(__file__).resolve().parent
HEADER = '# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23.\n# Generated demo requests; human review pending; see order-service/usage-log.md.\n'

def dump(path, value):
    # JSON syntax is valid YAML; the YAML comment supplies file attribution.
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(HEADER + json.dumps(value, indent=2) + '\n')

scripts = []
def req(folder, name, method, url, actor=None, body=None, expected=200, checks='', pre='', key=None):
    headers = []
    if actor: headers.append({'key':'Authorization','value':'Bearer {{'+actor+'Token}}'})
    if key: headers.append({'key':'Idempotency-Key','value':key})
    if body is not None: headers.append({'key':'Content-Type','value':'application/json'})
    code = f'pm.test("HTTP {expected}", () => pm.response.to.have.status({expected}));\n' + checks
    item = {'name':name,'$kind':'http-request','method':method,'url':url,'headers':headers,'scripts':[],'id':uuid.uuid5(uuid.NAMESPACE_URL, folder+name).hex[:24]}
    if pre: item['scripts'].append({'type':'beforeRequest','code':pre});scripts.append(pre)
    item['scripts'].append({'type':'afterResponse','code':code});scripts.append(code)
    if body is not None: item['body']={'type':'json','content':json.dumps(body)}
    dump(ROOT/'collections'/'Order live demo'/folder/(name+'.request.yaml'),item)

base='{{orderBaseUrl}}/orders'
init='''if (!pm.environment.get('runId')) pm.environment.set('runId', pm.variables.replaceIn('{{$guid}}'));
if (!pm.environment.get('expiryTime')) pm.environment.set('expiryTime',new Date(Date.now()+2*3600000).toISOString());'''
for actor in ['A','B']:
    req('01 Accounts',f'0{1 if actor=="A" else 3} Register {actor}','POST','{{userBaseUrl}}/users/register',body={'firstName':'Demo','lastName':actor,'username':actor+'-{{runId}}','email':actor.lower()+'-{{runId}}@u.nus.edu','password':'{{demoPassword}}'},expected=201,pre=init,checks=f"if(pm.response.code===201) pm.environment.set('{actor}Id',pm.response.json().user.id);")
    req('01 Accounts',f'0{2 if actor=="A" else 4} Login {actor}','POST','{{userBaseUrl}}/users/login',body={'email':actor.lower()+'-{{runId}}@u.nus.edu','password':'{{demoPassword}}'},checks=f"if(pm.response.code===200) pm.environment.set('{actor}Token',pm.response.json().token);")
    req('02 Readiness',f'0{1 if actor=="A" else 2} {actor} initial credits','GET','{{creditBaseUrl}}/credits/me/balance',actor,checks="if(pm.response.code===200){const b=pm.response.json();pm.test('Fresh account starts 10,0,10',()=>{pm.expect(b.totalCredits).to.eql(10);pm.expect(b.reservedCredits).to.eql(0);pm.expect(b.availableCredits).to.eql(10);});}")
req('02 Readiness','03 List suppliers - select currently open ID','GET','{{supplierBaseUrl}}/suppliers')
body={'supplierId':'{{supplierId}}','destination':'Central Library','requestDetails':'Live demo coffee collection','credits':3,'expiryTime':'{{expiryTime}}'}
def save_order(var):
    return f"if(pm.response.json().order) pm.environment.set('{var}',pm.response.json().order.id);\npm.test('UNASSIGNED',()=>pm.expect(pm.response.json().order.status).to.eql('UNASSIGNED'));"
req('03 Create and validate','01 Create A order - reserve 3','POST',base,'A',body,201,save_order('orderId'),key='{{runId}}-create')
req('03 Create and validate','02 Replay identical creation','POST',base,'A',body,checks="pm.test('Same order',()=>pm.expect(pm.response.json().order.id).to.eql(pm.environment.get('orderId')));",key='{{runId}}-create')
req('03 Create and validate','03 Same key different body','POST',base,'A',{**body,'requestDetails':'Changed body'},409,key='{{runId}}-create')
req('03 Create and validate','04 Invalid credits','POST',base,'A',{**body,'credits':0},400,key='{{runId}}-invalid')
req('03 Create and validate','05 No authentication','GET',base+'?scope=open',expected=401)

def balance(folder,name,reserved):
    req(folder,name,'GET','{{creditBaseUrl}}/credits/me/balance','A',checks=f"pm.test('Credit balance matches holds',()=>{{const b=pm.response.json();pm.expect(b.totalCredits).to.eql(10);pm.expect(b.reservedCredits).to.eql({reserved});pm.expect(b.availableCredits).to.eql({10-reserved});}});")
balance('03 Create and validate','06 A balance - 3 reserved',3)

def listing(name,scope,actor,contains):
    req('04 Visibility',name,'GET',base+'?scope='+scope,actor,checks="pm.test('Order visibility',()=>pm.expect(pm.response.json().orders.some(o=>o.id===pm.environment.get('orderId'))).to.eql("+str(contains).lower()+"));")
listing('01 A requested includes own order','requested','A',True)
listing('02 A open excludes own order','open','A',False)
listing('03 B open includes A order','open','B',True)
req('04 Visibility','04 Student cannot list all orders','GET',base,'A',expected=403)
req('05 Edit and accept','01 B cannot edit A order','PATCH',base+'/{{orderId}}','B',{'destination':'Other'},403,key='{{runId}}-wrong-editor')
req('05 Edit and accept','02 A edits credits to 4','PATCH',base+'/{{orderId}}','A',{'credits':4,'destination':'Central Library entrance'},checks="pm.test('Updated reward',()=>pm.expect(pm.response.json().order.credits).to.eql(4));",key='{{runId}}-edit')
balance('05 Edit and accept','03 A balance - 4 reserved',4)
req('05 Edit and accept','04 A cannot accept own order','POST',base+'/{{orderId}}/accept','A',{},403)
req('05 Edit and accept','05 B accepts A order','POST',base+'/{{orderId}}/accept','B',{},checks="pm.test('Assigned to B',()=>{const o=pm.response.json().order;pm.expect(o.status).to.eql('ASSIGNED');pm.expect(o.courierId).to.eql(pm.environment.get('BId'));});")
req('05 Edit and accept','06 Repeated acceptance conflicts','POST',base+'/{{orderId}}/accept','B',{},409)
req('05 Edit and accept','07 A cannot edit assigned order','PATCH',base+'/{{orderId}}','A',{'credits':5},409,key='{{runId}}-assigned-edit')
req('05 Edit and accept','08 A cannot cancel assigned order','POST',base+'/{{orderId}}/cancel','A',{},409)
req('05 Edit and accept','09 B assigned list','GET',base+'?scope=assigned','B',checks="pm.test('Assigned list includes order',()=>pm.expect(pm.response.json().orders.some(o=>o.id===pm.environment.get('orderId'))).to.eql(true));")
req('06 Cancel and refund','01 A creates second order for 2','POST',base,'A',{**body,'credits':2,'requestDetails':'Cancellation demo'},201,save_order('cancelOrderId'),key='{{runId}}-cancel-create')
balance('06 Cancel and refund','02 A balance - 6 reserved',6)
req('06 Cancel and refund','03 B cannot cancel A order','POST',base+'/{{cancelOrderId}}/cancel','B',{},403)
req('06 Cancel and refund','04 A cancels second order','POST',base+'/{{cancelOrderId}}/cancel','A',{},checks="pm.test('Cancelled and refunded',()=>{const o=pm.response.json().order;pm.expect(o.status).to.eql('CANCELLED');pm.expect(o.creditState).to.eql('REFUNDED');});")
balance('06 Cancel and refund','05 Refund leaves first hold only',4)
req('06 Cancel and refund','06 Cancelled order remains in history','GET',base+'?scope=requested','A',checks="pm.test('History retains cancellation',()=>{const o=pm.response.json().orders.find(o=>o.id===pm.environment.get('cancelOrderId'));pm.expect(o.status).to.eql('CANCELLED');});")
req('07 Optional administrator','01 Administrator lists all orders','GET',base,'admin',checks="pm.test('Orders returned',()=>pm.expect(pm.response.json().orders).to.be.an('array'));")
values={'userBaseUrl':'http://localhost:3001','supplierBaseUrl':'http://localhost:3002','creditBaseUrl':'http://localhost:3004','orderBaseUrl':'http://localhost:33003','demoPassword':'DemoPass1!','supplierId':'','runId':'','expiryTime':'','AToken':'','BToken':'','AId':'','BId':'','orderId':'','cancelOrderId':'','adminToken':''}
dump(ROOT/'environments'/'demo.environment.yaml',{'name':'Order live demo - local','values':[{'key':k,'value':v} for k,v in values.items()]})
# Parse every JavaScript script without executing requests or storing tokens.
import subprocess
for code in scripts:
    subprocess.run(['node','--check'],input=code,text=True,check=True,capture_output=True)
print(f'Generated {len(list((ROOT/"collections").rglob("*.request.yaml")))} requests; {len(scripts)} scripts passed Node syntax checks.')
