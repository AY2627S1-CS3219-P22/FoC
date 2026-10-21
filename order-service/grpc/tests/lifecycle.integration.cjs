// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Generated real PostgreSQL/HTTP lifecycle tests; review pending; see ../../usage-log.md.
const {test,before,after}=require('node:test');const assert=require('node:assert/strict');
const {randomUUID,generateKeyPairSync}=require('node:crypto');const {once}=require('node:events');const jwt=require('jsonwebtoken');
const url=process.env.TEST_DATABASE_URL;
if(!url || !/^order_service_test(?:_[a-zA-Z0-9_]+)?$/.test(new URL(url).pathname.slice(1)))throw new Error('TEST_DATABASE_URL must name a dedicated order_service_test database');
process.env.DATABASE_URL=url;
const {PrismaClient}=require('../dist/generated/prisma');const db=new PrismaClient({datasourceUrl:url});
const {createOrderCreation}=require('../dist/services/orderCreation');const {createOrderEdits}=require('../dist/services/orderEdits');
const {createOrderLifecycle}=require('../dist/services/orderLifecycle');const {createOrderSchema,editOrderSchema}=require('../dist/api/dto/orderInput');
const {createApp}=require('../dist/api/app');
const prefix='lifecycle-'+randomUUID();let userCounter=0;
before(()=>db.$connect());
after(async()=>{
 const ids=(await db.orderCreation.findMany({where:{requesterId:{startsWith:prefix}},select:{orderId:true}})).map(r=>r.orderId);
 await db.orderEditOperation.deleteMany({where:{orderId:{in:ids}}});await db.creditOperation.deleteMany({where:{orderId:{in:ids}}});await db.order.deleteMany({where:{id:{in:ids}}});await db.orderCreation.deleteMany({where:{orderId:{in:ids}}});await db.$disconnect();
 await require('../dist/db').prisma.$disconnect();
});
function fixture() {
 const user=prefix+'-'+(++userCounter);const ledger=new Map();let calls=0;let updates=0;let releases=0;let reserveMode;let updateMode;let releaseMode;let unavailable=false;let closed=false;let invalidSupplier=false;
 const err=(code)=>Object.assign(new Error('test RPC failure'),{code});
 const credit={
  getBalance:async({userId})=>({userId,totalCredits:20,reservedCredits:0,availableCredits:20}),
  getReservation:async({orderId})=>{if(unavailable)throw err(14);const r=ledger.get(orderId);if(!r)throw err(5);return {...r}},
  reserveCredits:async({orderId,requesterId,amount})=>{
   calls++;if(reserveMode==='reject')throw err(9);
   if(reserveMode==='before'){reserveMode=undefined;throw err(4)}
   if(!ledger.has(orderId))ledger.set(orderId,{orderId,requesterId,amount,status:'RESERVED',reservationId:randomUUID(),version:1});
   if(reserveMode==='after'){reserveMode=undefined;throw err(4)}return {...ledger.get(orderId)};
  },
  updateReservation:async({orderId,amount,expectedVersion})=>{
   updates++;const r=ledger.get(orderId);if(updateMode==='reject')throw err(9);
   if(r.status!=='RESERVED')throw err(9);if(r.version!==expectedVersion){if(r.version===expectedVersion+1&&r.amount===amount)return {...r};throw err(9)}
   r.amount=amount;r.version++;if(updateMode==='after'){updateMode=undefined;throw err(4)}return {...r};
  },
  releaseCredits:async({orderId})=>{releases++;const r=ledger.get(orderId);if(!r)throw err(5);if(r.status==='SETTLED')throw err(9);if(r.status!=='RELEASED'){r.status='RELEASED';r.version++}if(releaseMode==='after'){releaseMode=undefined;throw err(4)}return {...r}},
  settleCredits:async()=>{throw new Error('out of scope')},close:()=>{},
 };
 const directories={getRequester:async(userId)=>({userId,username:'student',firstName:'Campus',lastName:'Friend'}),
  getSupplier:async(supplierId)=>{if(invalidSupplier)throw err(5);return {supplierId,name:'Cafe',locationDescription:'Level 1',buildingName:'NUS',floor:1}},
  isSupplierOpen:async()=>({isOpen:!closed}),close:()=>{}};
 const creation=createOrderCreation(db,credit,directories),edits=createOrderEdits(db,credit,directories),lifecycle=createOrderLifecycle(db,credit);
 const input=()=>createOrderSchema.parse({supplierId:'1',destination:'PGP',requestDetails:'Coffee',credits:4,expiryTime:new Date(Date.now()+7200000).toISOString()});
 return {user,credit,directories,creation,edits,lifecycle,input,ledger,get calls(){return calls},get updates(){return updates},get releases(){return releases},set reserveMode(v){reserveMode=v},set updateMode(v){updateMode=v},set releaseMode(v){releaseMode=v},set unavailable(v){unavailable=v},set closed(v){closed=v},set invalidSupplier(v){invalidSupplier=v}};
}
async function due(orderId,type='RESERVE') {await db.creditOperation.updateMany({where:{orderId,type,state:{not:'SUCCEEDED'}},data:{state:'PENDING',nextRetryAt:new Date(0),leaseExpiresAt:null}})}
async function editDue(orderId) {await db.orderEditOperation.updateMany({where:{orderId,state:{in:['PENDING','PROCESSING']}},data:{state:'PENDING',nextRetryAt:new Date(0),leaseExpiresAt:null}})}
async function create(f,key='create') {const r=await f.creation.submit(f.user,key,f.input());assert.equal(r.status,201,String(r.error));return r.order}

test('create persists UNASSIGNED with matching reservation; same-key replay and conflict',async()=>{
 const f=fixture(),input=f.input();const first=await f.creation.submit(f.user,'one',input);assert.equal(first.status,201);assert.equal(first.order.status,'UNASSIGNED');assert.equal(first.order.creditState,'RESERVED');assert.equal(first.order.requesterName,'Campus Friend');
 const replay=await f.creation.submit(f.user,'one',input);assert.equal(replay.status,200);assert.equal(replay.order.id,first.order.id);assert.equal(f.calls,1);
 assert.equal((await f.creation.submit(f.user,'one',{...input,destination:'Other'})).status,409);
 const separate=await f.creation.submit(f.user,'two',input);assert.equal(separate.status,201);assert.notEqual(separate.order.id,first.order.id);
});
test('concurrent identical same-key creation publishes only one order/reservation',async()=>{
 const f=fixture(),input=f.input();const results=await Promise.all(Array.from({length:5},()=>f.creation.submit(f.user,'race',input)));
 assert.equal(await db.order.count({where:{requesterId:f.user}}),1);assert.equal(f.calls,1);assert.ok(results.every(r=>[200,201,202].includes(r.status)));
});
test('invalid/closed supplier, short expiry, insufficient balance and explicit rejection do not publish',async()=>{
 const f=fixture();f.closed=true;assert.equal((await f.creation.submit(f.user,'closed',f.input())).status,409);f.closed=false;f.invalidSupplier=true;assert.equal((await f.creation.submit(f.user,'missing',f.input())).status,409);f.invalidSupplier=false;
 assert.equal((await f.creation.submit(f.user,'expiry',{...f.input(),expiryTime:new Date(Date.now()+1000)})).status,400);
 assert.equal((await f.creation.submit(f.user,'insufficient',{...f.input(),credits:21})).status,409);
 f.reserveMode='reject';assert.equal((await f.creation.submit(f.user,'reject',f.input())).status,409);await f.creation.recoverBatch();assert.equal(f.calls,1);assert.equal(await db.order.count({where:{requesterId:f.user}}),0);
});
for(const mode of ['before','after'])test('reservation timeout '+mode+' commit resumes after service restart',async()=>{
 const f=fixture();f.reserveMode=mode;const input=f.input();const r=await f.creation.submit(f.user,'pending',input);assert.equal(r.status,202);assert.equal(await db.order.count({where:{id:r.creationId}}),0);
 await due(r.creationId);const restarted=createOrderCreation(db,f.credit,f.directories);await restarted.recoverBatch();const replay=await restarted.submit(f.user,'pending',input);assert.equal(replay.status,200);assert.equal(f.ledger.size,1);assert.equal(f.calls,mode==='after'?1:2);
});
test('database publication failure after reservation remains recoverable',async()=>{
 const f=fixture();let fail=true;
 const broken=new Proxy(db,{get(target,key){if(key==='$transaction')return(fn,...rest)=>target.$transaction(tx=>fn(new Proxy(tx,{get(t,k){if(k==='order')return new Proxy(t.order,{get(o,m){if(m==='create')return async(...args)=>{if(fail){fail=false;throw new Error('injected persistence failure')}return o.create(...args)};return o[m]}});return t[k]}})),...rest);const value=target[key];return typeof value==='function'?value.bind(target):value}});
 const creation=createOrderCreation(broken,f.credit,f.directories);const r=await creation.submit(f.user,'db-failure',f.input());assert.equal(r.status,202);assert.equal(f.ledger.get(r.creationId).status,'RESERVED');assert.equal(await db.order.count({where:{id:r.creationId}}),0);
 await due(r.creationId);await f.creation.recoverBatch();assert.equal(await db.order.count({where:{id:r.creationId}}),1);assert.equal(f.calls,1);
});
test('pending reserved creation that expires is compensated without publishing',async()=>{
 const f=fixture();f.reserveMode='after';const r=await f.creation.submit(f.user,'expire-pending',f.input());const row=await db.orderCreation.findUniqueOrThrow({where:{orderId:r.creationId}});
 await db.orderCreation.update({where:{orderId:r.creationId},data:{payload:{...row.payload,expiryTime:new Date(Date.now()-1000).toISOString()}}});await f.creation.recoverBatch();
 assert.equal((await db.orderCreation.findUniqueOrThrow({where:{orderId:r.creationId}})).state,'FAILED');assert.equal(f.ledger.get(r.creationId).status,'RELEASED');assert.equal(await db.order.count({where:{id:r.creationId}}),0);
});
test('cancel retains history, protects ownership, releases once and supports replay',async()=>{
 const f=fixture(),order=await create(f);assert.equal((await f.lifecycle.cancel(order.id,'other')).status,403);
 const result=await f.lifecycle.cancel(order.id,f.user);assert.equal(result.order.status,'CANCELLED');assert.equal(result.order.cancellationReason,'REQUESTER');assert.equal(result.order.creditState,'REFUNDED');assert.equal(f.releases,1);
 await f.lifecycle.cancel(order.id,f.user);assert.equal(f.releases,1);assert.equal(await db.order.count({where:{id:order.id}}),1);
});
test('uncertain refund stays pending until current release is confirmed',async()=>{
 const f=fixture(),order=await create(f);f.releaseMode='after';const r=await f.lifecycle.cancel(order.id,f.user);assert.equal(r.order.creditState,'REFUND_PENDING');await due(order.id,'REFUND');await f.lifecycle.refundBatch();assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).creditState,'REFUNDED');assert.equal(f.releases,1);
});
test('expiry cancels all three active states including PICKED_UP and returns credits',async()=>{
 const f=fixture();for(const state of ['UNASSIGNED','ASSIGNED','PICKED_UP']){const order=await create(f,state);await db.order.update({where:{id:order.id},data:{status:state,expiryTime:new Date(Date.now()-1000),...(state!=='UNASSIGNED'?{courierId:'courier',acceptedAt:new Date()}:{}),...(state==='PICKED_UP'?{pickedUpAt:new Date()}: {})}});}
 await Promise.all([f.lifecycle.expireBatch(),f.lifecycle.expireBatch()]);await Promise.all([f.lifecycle.refundBatch(),f.lifecycle.refundBatch()]);
 const rows=await db.order.findMany({where:{requesterId:f.user}});assert.equal(rows.length,3);for(const r of rows){assert.equal(r.status,'CANCELLED');assert.equal(r.cancellationReason,'EXPIRY');assert.equal(r.creditState,'REFUNDED')}
});
test('edit adjusts reservation, updates fields and replays without duplicate credit updates',async()=>{
 const f=fixture(),order=await create(f);const patch=editOrderSchema.parse({credits:6,destination:'Utown'});const r=await f.edits.edit(order.id,f.user,'edit-one',patch);assert.equal(r.status,200,String(r.error));assert.equal(r.order.credits,6);assert.equal(r.order.destination,'Utown');assert.equal(f.updates,1);
 assert.equal((await f.edits.edit(order.id,f.user,'edit-one',patch)).status,200);assert.equal(f.updates,1);
 assert.equal((await f.edits.edit(order.id,f.user,'edit-one',{credits:7})).status,409);
 const lower=await f.edits.edit(order.id,f.user,'lower',{credits:2});assert.equal(lower.status,200);assert.equal(f.ledger.get(order.id).amount,2);
});
test('credit-edit timeout resumes against current version without applying the mutation twice',async()=>{
 const f=fixture(),order=await create(f);f.updateMode='after';const r=await f.edits.edit(order.id,f.user,'uncertain-edit',{credits:7});assert.equal(r.status,202);assert.equal(r.order.credits,4);await editDue(order.id);
 await createOrderEdits(db,f.credit,f.directories).recoverBatch();const updated=await db.order.findUniqueOrThrow({where:{id:order.id}});assert.equal(updated.credits,7);assert.equal(f.updates,1);
});
test('edits reject other users, accepted orders, closed suppliers and permanent credit rejection',async()=>{
 const f=fixture(),order=await create(f);assert.equal((await f.edits.edit(order.id,'other','x',{destination:'Elsewhere'})).status,403);f.closed=true;assert.equal((await f.edits.edit(order.id,f.user,'closed',{destination:'Elsewhere'})).status,409);f.closed=false;
 f.updateMode='reject';assert.equal((await f.edits.edit(order.id,f.user,'reject',{credits:19})).status,409);assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).credits,4);
 await db.order.update({where:{id:order.id},data:{status:'ASSIGNED',courierId:'courier',acceptedAt:new Date()}});assert.equal((await f.edits.edit(order.id,f.user,'assigned',{destination:'Elsewhere'})).status,409);assert.equal((await f.lifecycle.cancel(order.id,f.user)).status,409);
});
test('recovery stops after initial attempt plus five retries and retains unresolved state',async()=>{
 const f=fixture();f.unavailable=true;const r=await f.creation.submit(f.user,'exhaust',f.input());assert.equal(r.status,202);
 for(let i=0;i<5;i++){await due(r.creationId);await f.creation.recoverBatch()}
 let op=await db.creditOperation.findUniqueOrThrow({where:{orderId_type:{orderId:r.creationId,type:'RESERVE'}}});assert.equal(op.attempts,6);assert.equal(op.state,'PERMANENTLY_FAILED');await f.creation.recoverBatch();op=await db.creditOperation.findUniqueOrThrow({where:{id:op.id}});assert.equal(op.attempts,6);assert.equal((await db.orderCreation.findUniqueOrThrow({where:{orderId:r.creationId}})).state,'PENDING');
});
test('HTTP create/edit/cancel uses JWT identity, validates input and serializes bigint/date fields',async t=>{
 const f=fixture();const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const token=jwt.sign({roles:['USER']},privateKey,{algorithm:'RS256',subject:f.user,expiresIn:60});
 const app=createApp(publicKey.export({type:'spki',format:'pem'}),f.lifecycle,f.creation,f.edits);const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port+'/orders';
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json','Idempotency-Key':'http'};
 assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({})})).status,400);
 let response=await fetch(base,{method:'POST',headers,body:JSON.stringify(f.input())});assert.equal(response.status,201);let body=await response.json();assert.equal(body.order.supplierId,'1');assert.equal(body.order.requesterId,f.user);assert.ok(body.order.createdAt.endsWith('Z'));const id=body.order.id;
 response=await fetch(base+'/'+id,{method:'PATCH',headers:{...headers,'Idempotency-Key':'http-edit'},body:JSON.stringify({destination:'Library'})});assert.equal(response.status,200);
 response=await fetch(base+'/'+id+'/cancel',{method:'POST',headers,body:'{}'});assert.equal(response.status,200);assert.equal((await response.json()).order.creditState,'REFUNDED');
});

test('background worker recovers pending creation without another client request',async()=>{
 const f=fixture();f.reserveMode='after';const r=await f.creation.submit(f.user,'automatic',f.input());assert.equal(r.status,202);await due(r.creationId);
 const worker=createOrderLifecycle(db,f.credit,[()=>f.creation.recoverBatch(),()=>f.edits.recoverBatch()]);worker.startWorker();
 try {const deadline=Date.now()+5000;while(Date.now()<deadline){if(await db.order.count({where:{id:r.creationId}}))break;await new Promise(r=>setTimeout(r,50))}assert.equal(await db.order.count({where:{id:r.creationId}}),1);assert.equal(f.calls,1)}finally{await worker.stopWorker()}
});
test('worker reclaims an expired processing lease after a crashed reservation attempt',async()=>{
 const f=fixture();f.reserveMode='after';const r=await f.creation.submit(f.user,'crashed',f.input());await db.creditOperation.updateMany({where:{orderId:r.creationId,type:'RESERVE'},data:{state:'PROCESSING',leaseExpiresAt:new Date(0)}});
 await f.creation.recoverBatch();assert.equal(await db.order.count({where:{id:r.creationId}}),1);assert.equal(f.calls,1);
});
test('editing is blocked by a courier assignment that acquired the row lock first',async()=>{
 const f=fixture(),order=await create(f);let release;const gate=new Promise(r=>release=r);let locked;const ready=new Promise(r=>locked=r);
 const acceptance=db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id}::uuid FOR UPDATE`;locked();await gate;await tx.order.update({where:{id:order.id},data:{status:'ASSIGNED',courierId:'courier',acceptedAt:new Date()}})});
 await ready;const editing=f.edits.edit(order.id,f.user,'race',{credits:6});release();await acceptance;assert.equal((await editing).status,409);assert.equal(f.updates,0);
});
test('durable in-progress edit excludes another edit and cancellation until recovery completes',async()=>{
 const f=fixture(),order=await create(f);f.updateMode='after';assert.equal((await f.edits.edit(order.id,f.user,'pending-edit',{credits:6})).status,202);
 assert.equal((await f.edits.edit(order.id,f.user,'other-edit',{destination:'Elsewhere'})).status,409);assert.equal((await f.lifecycle.cancel(order.id,f.user)).status,409);
 await editDue(order.id);await f.edits.recoverBatch();assert.equal((await f.lifecycle.cancel(order.id,f.user)).order.creditState,'REFUNDED');
});
test('expiry releases the updated hold even if edit persistence has not completed',async()=>{
 const f=fixture(),order=await create(f);f.updateMode='after';assert.equal((await f.edits.edit(order.id,f.user,'edit-before-expiry',{credits:8})).status,202);
 assert.equal(f.ledger.get(order.id).amount,8);await db.order.update({where:{id:order.id},data:{expiryTime:new Date(Date.now()-1000)}});await f.lifecycle.expireBatch();await f.lifecycle.refundBatch();
 const row=await db.order.findUniqueOrThrow({where:{id:order.id}});assert.equal(row.creditState,'REFUNDED');assert.equal(f.ledger.get(order.id).status,'RELEASED');assert.equal((await db.orderEditOperation.findFirstOrThrow({where:{orderId:order.id}})).state,'FAILED');
});
test('unresolved edits exhaust five retries into RECONCILIATION_REQUIRED',async()=>{
 const f=fixture(),order=await create(f);f.updateMode='after';assert.equal((await f.edits.edit(order.id,f.user,'edit-exhaust',{credits:8})).status,202);f.unavailable=true;
 for(let i=0;i<5;i++){await editDue(order.id);await f.edits.recoverBatch()}
 const op=await db.orderEditOperation.findFirstOrThrow({where:{orderId:order.id}});assert.equal(op.attempts,6);assert.equal(op.state,'RECONCILIATION_REQUIRED');assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).credits,4);
});

test('creation integrates real User/Supplier/Credit gRPC adapters with PostgreSQL',async t=>{
 const f=fixture();const rpc=require('@foc/grpc');const grpc=require('@grpc/grpc-js');const loader=require('@grpc/proto-loader');const path=require('node:path');
 const {createDirectories}=require('../dist/dependencies/directories');const {createCreditClient}=require('../dist/dependencies/creditClient');
 const userServer=rpc.createServer(rpc.UserService.service,{GetPublicProfile:(call,cb)=>cb(null,{userId:call.request.userId,username:'student',firstName:'Campus',lastName:'Friend'})});
 const supplierServer=rpc.createServer(rpc.SupplierService.service,{GetSupplier:(call,cb)=>cb(null,{supplierId:call.request.supplierId,name:'Cafe',locationDescription:'Level 1'}),IsOpen:(_call,cb)=>cb(null,{isOpen:true})});
 const def=loader.loadSync(path.resolve(__dirname,'../proto/credit.proto'),{keepCase:false,longs:String,enums:String,defaults:true,oneofs:true});const creditServer=new grpc.Server();const CreditService=grpc.loadPackageDefinition(def).credit.CreditService;
 const handlers={};for(const [wire,method] of [['GetBalance','getBalance'],['GetReservation','getReservation'],['ReserveCredits','reserveCredits'],['UpdateReservation','updateReservation'],['ReleaseCredits','releaseCredits'],['SettleCredits','settleCredits']])handlers[wire]=(call,cb)=>{
  if(call.metadata.get('x-credit-service-token')[0]!=='integration-token'){cb({code:16});return}
  Promise.resolve().then(()=>f.credit[method](call.request)).then(value=>cb(null,value),error=>cb(error));
 };
 creditServer.addService(CreditService.service,handlers);
 const ports=await Promise.all([userServer,supplierServer,creditServer].map(server=>rpc.startServer(server,0,'127.0.0.1')));
 const dirs=createDirectories('127.0.0.1:'+ports[0],'127.0.0.1:'+ports[1],1000);const credit=createCreditClient('127.0.0.1:'+ports[2],'integration-token',1000);
 t.after(()=>{dirs.close();credit.close();userServer.forceShutdown();supplierServer.forceShutdown();creditServer.forceShutdown()});
 const service=createOrderCreation(db,credit,dirs);const r=await service.submit(f.user,'real-grpc',f.input());assert.equal(r.status,201);assert.equal(r.order.status,'UNASSIGNED');assert.equal(f.ledger.get(r.order.id).status,'RESERVED');
});

test('pending creation compensates instead of publishing when supplier is now closed',async()=>{
 const f=fixture();f.reserveMode='after';const r=await f.creation.submit(f.user,'closed-during-recovery',f.input());assert.equal(r.status,202);f.closed=true;await due(r.creationId);await f.creation.recoverBatch();
 assert.equal(await db.order.count({where:{id:r.creationId}}),0);assert.equal(f.ledger.get(r.creationId).status,'RELEASED');assert.equal((await db.orderCreation.findUniqueOrThrow({where:{orderId:r.creationId}})).state,'FAILED');
});

test('administrator GET /orders includes all statuses and history with role separation and public fields',async t=>{
 const f=fixture();const ids=[];
 for(const [status,reason] of [['UNASSIGNED',null],['ASSIGNED',null],['PICKED_UP',null],['DELIVERED',null],['CANCELLED','REQUESTER'],['CANCELLED','EXPIRY']]) {
  const order=await create(f,'admin-'+status+'-'+reason);ids.push(order.id);
  await db.order.update({where:{id:order.id},data:{status,cancellationReason:reason,
   ...(status==='DELIVERED'?{deliveredAt:new Date(),creditState:'SETTLED'}:{}),
   ...(status==='CANCELLED'?{cancelledAt:new Date(),creditState:'REFUNDED'}:{})}});
 }
 f.reserveMode='after';const pending=await f.creation.submit(f.user,'admin-pending',f.input());assert.equal(pending.status,202);
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const app=createApp(publicKey.export({type:'spki',format:'pem'}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port+'/orders';
 const headers=roles=>({Authorization:'Bearer '+jwt.sign({roles},privateKey,{algorithm:'RS256',subject:'dashboard-admin',expiresIn:60})});
 assert.equal((await fetch(base)).status,401);
 assert.equal((await fetch(base,{headers:headers(['USER'])})).status,403);
 for(const roles of [['ADMINISTRATOR'],['USER','ADMINISTRATOR']]) {
  const response=await fetch(base,{headers:headers(roles)});assert.equal(response.status,200);const body=await response.json();assert.ok(Array.isArray(body.orders));
  const ownFixtures=body.orders.filter(order=>ids.includes(order.id));assert.equal(ownFixtures.length,6);assert.ok(!body.orders.some(order=>order.id===pending.creationId));
  assert.ok(ownFixtures.some(order=>order.status==='DELIVERED'));assert.ok(ownFixtures.some(order=>order.cancellationReason==='EXPIRY'));
  for(const order of ownFixtures){assert.equal(order.requesterId,f.user);assert.equal(order.supplierId,'1');assert.ok(order.createdAt.endsWith('Z'));assert.ok(!('payload' in order));assert.ok(!('creation' in order));assert.ok(!('idempotencyKey' in order));assert.ok(!('creditOperations' in order));assert.ok(!('editOperations' in order));}
 }
 // Administrator-only access to reads does not grant USER command permissions.
 assert.equal((await fetch(base,{method:'POST',headers:{...headers(['ADMINISTRATOR']),'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(base,{method:'POST',headers:{...headers(['USER']),'Content-Type':'application/json'},body:'{}'})).status,400);
});
