# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
# Scope: Convert teammate HTTP YAML to v2.1; preserve gRPC as native YAML.
# Human review pending; approved JSON attribution in WEB-IMPORT.md and ../usage-log.md.
from pathlib import Path
import json, subprocess, uuid, shutil, re
root=Path(__file__).resolve().parent
out=root/'web-import';out.mkdir(exist_ok=True)
def read(p):
 return json.loads(subprocess.run(['ruby','-r','yaml','-r','json','-e','puts JSON.generate(YAML.load_file(ARGV[0]))',str(p)],text=True,capture_output=True,check=True).stdout)
def write(p,d):p.write_text(json.dumps(d,indent=2)+'\n')
counts={};grpc=[];script_count=0
for folder in sorted((root/'collections').iterdir()):
 if not folder.is_dir():continue
 items=[]
 def convert(directory):
  global script_count
  result=[]
  for p in sorted(directory.iterdir()):
   if p.is_dir():
    children=convert(p)
    if children:result.append({'name':p.name,'item':children})
   elif p.name.endswith('.request.yaml'):
    d=read(p)
    if d.get('$kind')=='grpc-request':
     dest=out/'native-grpc'/p.relative_to(root/'collections');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest);grpc.append(p);continue
    if d.get('$kind')!='http-request':raise ValueError('Unknown request kind: '+p.name)
    request={'method':d['method'],'url':d['url'],'header':d.get('headers',[]),'auth':{'type':'noauth'}}
    if 'body' in d:
     assert d['body']['type']=='json'
     request['body']={'mode':'raw','raw':d['body']['content'],'options':{'raw':{'language':'json'}}}
    events=[]
    for s in d.get('scripts',[]):
     subprocess.run(['node','--check'],input=s['code'],text=True,capture_output=True,check=True);script_count+=1
     events.append({'listen':{'beforeRequest':'prerequest','afterResponse':'test'}[s['type']],'script':{'type':'text/javascript','exec':s['code'].splitlines()}})
    result.append({'name':d['name'],'request':request,'event':events,'response':[]});counts[folder.name]=counts.get(folder.name,0)+1
  return result
 items=convert(folder)
 if items:
  name=re.sub(r'[^A-Za-z0-9]+','-',folder.name).strip('-')
  write(out/(name+'.postman_collection.json'),{'info':{'name':folder.name+' (postman 2)','schema':'https://schema.getpostman.com/json/collection/v2.1.0/collection.json','description':'AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23. Format conversion only; teammate requests/assertions retained. Human review pending. See order-service/postman 2/WEB-IMPORT.md and order-service/usage-log.md. No live execution claimed. Separate environments and manual stop/start pauses required.'},'item':items,'event':[{'listen':'prerequest','script':{'type':'text/javascript','exec':(root.parent/'postman'/'auth-preflight.js').read_text().splitlines()}}]})
for p in sorted((root/'environments').glob('*.yaml')):
 d=read(p);values=[]
 for v in d.get('values',[]):
  k=v['key'];value=v.get('value','')
  # Populated credentials, identities and ledger fixtures stay only in original local files.
  safe=k.lower().endswith(('baseurl','grpcurl','grpcaddr')) or k in ['supplierId','demoPassword']
  if not safe:value=''
  values.append({'key':k,'value':value,'enabled':v.get('enabled',True),'type':'secret' if 'token' in k.lower() or 'password' in k.lower() else 'default'})
 write(out/(p.stem+'.postman_environment.json'),{'name':d.get('name',p.stem)+' (Web blank)','values':values,'_postman_variable_scope':'environment','_postman_exported_using':'AI-assisted conversion; attribution in WEB-IMPORT.md'})
print('HTTP requests:',counts,'; native gRPC retained:',len(grpc),'; HTTP scripts parsed:',script_count)
