// AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
// Scope: User deletion envelope validation and failure propagation tests; review pending.
// See ../../usage-log.md.
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createUserDeletedHandler}=require('../dist/events/userDeleted');
const {NonRetryableError}=require('@foc/messaging');
const event={type:'user.deleted',eventId:'event-1',userId:'user-1',occurredAt:'2026-11-02T00:00:00.000Z',deletedAt:'2026-11-02T00:00:00.000Z'};
const envelope=(payload,eventId=payload?.eventId)=>({payload,eventId,retryCount:0});
test('invalid deletion payloads and mismatched delivery IDs cannot reach storage',async()=>{
 let writes=0;const handler=createUserDeletedHandler({userDeletionEvent:{createMany:async()=>{writes++}}});
 for(const payload of [null,{}, {...event,type:'unknown'}, {...event,userId:''}, {...event,eventId:' '}, {...event,deletedAt:'invalid'}, {...event,occurredAt:'yesterday'}])await assert.rejects(handler(envelope(payload)),NonRetryableError);
 await assert.rejects(handler(envelope(event,'different-id')),NonRetryableError);assert.equal(writes,0);
});
test('unrelated created/restored User events require no Order changes',async()=>{
 const handler=createUserDeletedHandler({});
 for(const type of ['user.created','user.restored'])await handler(envelope({type}));
});
test('database failures propagate so RabbitMQ cannot acknowledge an unrecorded deletion',async()=>{
 const failure=new Error('Database unavailable');
 const handler=createUserDeletedHandler({userDeletionEvent:{createMany:async()=>{throw failure}}});
 await assert.rejects(handler(envelope(event)),error=>error===failure);
});
