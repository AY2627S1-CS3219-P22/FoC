// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Generated real gRPC contract/credential tests; review pending; see ../../usage-log.md.
const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
const grpc=require('@grpc/grpc-js');const loader=require('@grpc/proto-loader');
const {createCreditClient,classifyCreditError}=require('../dist/dependencies/creditClient');
const definition=loader.loadSync(path.resolve(__dirname,'../proto/credit.proto'),{keepCase:false,longs:String,enums:String,defaults:true,oneofs:true});
const {CreditService}=grpc.loadPackageDefinition(definition).credit;
test('agreed Credit RPCs carry token, expected version and current reservation fields',async t=>{
 const server=new grpc.Server();const id='00000000-0000-4000-8000-000000000001';
 const receipt={orderId:id,requesterId:'u',amount:4,status:'RESERVED',reservationId:'r',version:2};let seen=0;
 const handlers={};for(const name of ['GetBalance','GetReservation','ReserveCredits','UpdateReservation','ReleaseCredits','SettleCredits'])handlers[name]=(call,cb)=>{
  assert.deepEqual(call.metadata.get('x-credit-service-token'),['test-token']);seen++;
  if(name==='UpdateReservation')assert.equal(call.request.expectedVersion,2);
  cb(null,name==='GetBalance'?{userId:'u',availableCredits:6,reservedCredits:4,totalCredits:10}:receipt);
 };
 server.addService(CreditService.service,handlers);
 const port=await new Promise((r,j)=>server.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(e,p)=>e?j(e):r(p)));
 const client=createCreditClient('127.0.0.1:'+port,'test-token',1000);
 t.after(()=>{client.close();server.forceShutdown()});
 assert.equal((await client.getBalance({userId:'u'})).availableCredits,6);
 assert.equal((await client.getReservation({orderId:id})).version,2);
 await client.reserveCredits({orderId:id,requesterId:'u',amount:4});await client.updateReservation({orderId:id,amount:5,expectedVersion:2});await client.releaseCredits({orderId:id});await client.settleCredits({orderId:id,courierId:'c'});assert.equal(seen,6);
});
test('business rejection differs from uncertain or unavailable integration',()=>{
 assert.equal(classifyCreditError({code:grpc.status.FAILED_PRECONDITION}),'rejected');assert.equal(classifyCreditError({code:grpc.status.DEADLINE_EXCEEDED}),'uncertain');assert.equal(classifyCreditError({code:grpc.status.UNAVAILABLE}),'uncertain');assert.equal(classifyCreditError({code:grpc.status.UNIMPLEMENTED}),'unavailable');
});

test('plaintext Credit accepts container targets in production and retains credential validation',()=>{
 const previous=process.env.NODE_ENV;
 try {
  process.env.NODE_ENV='production';const client=createCreditClient('credit-service:50054','test-token',1000);client.close();
  assert.throws(()=>createCreditClient('credit-service:50054','',1000),/configuration/);
 } finally {if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous}
});
