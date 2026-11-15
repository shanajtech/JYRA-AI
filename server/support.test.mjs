import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackend} from './server.mjs';
test('public support validates, persists only submitted fields, rejects untrusted origins and rate limits',async t=>{
 const app=createBackend({databasePath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const url=`http://127.0.0.1:${app.server.address().port}/api/support`;
 const body={email:'test@example.com',topic:'Voice',message:'The welcome voice is not audible.'};
 const send=(value,origin='http://localhost:1430')=>fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
 assert.equal((await send(body,'https://example.com')).status,403);
 assert.equal((await send({...body,message:'short'})).status,400);
 assert.equal((await send({...body,diagnostics:'private'})).status,400);
 const response=await send(body);assert.equal(response.status,201);const result=await response.json();assert.equal(result.emailDelivery,false);assert.equal(result.status,'saved-locally');
 const row=app.storage.db.prepare('SELECT * FROM support_requests WHERE id=?').get(result.id);assert.equal(row.message,body.message);assert.equal(row.email,body.email);
 assert.equal((await fetch(url)).status,401);
 await send(body);await send(body);assert.equal((await send(body)).status,429);
});
import {openDatabase} from './database.mjs';
import {createSupport} from './support.mjs';
test('support delivery uses fixed recipient, plain text and honest failure status',async()=>{
 const storage=openDatabase(':memory:');try{
 const env={ZYRA_SUPPORT_TO:'support@example.com',ZYRA_SUPPORT_FROM:'sender@example.com',ZYRA_SUPPORT_SMTP_HOST:'smtp.example.com',ZYRA_SUPPORT_SMTP_USER:'sender',ZYRA_SUPPORT_SMTP_PASSWORD:'test-only'};let sent;
 const body={email:'visitor@example.com',topic:'Design',message:'The design is hard to read on my phone.'};
 const support=createSupport(storage,{env,transportFactory:()=>({sendMail:async message=>{sent=message;return {accepted:['support@example.com']};},close(){}})});
 const r=await support.submit(body);assert.equal(r.emailDelivery,true);assert.equal(sent.to,env.ZYRA_SUPPORT_TO);assert.equal(sent.replyTo,body.email);assert.equal(sent.disableFileAccess,true);assert.equal(sent.html,undefined);
 await assert.rejects(support.submit({...body,email:'a@example.com\r\nBcc:x@example.com'}),{status:400});
 const failed=createSupport(storage,{env,transportFactory:()=>({sendMail:async()=>{throw Error('offline');},close(){}})});const f=await failed.submit(body);assert.equal(f.emailDelivery,false);assert.ok(storage.db.prepare('SELECT id FROM support_requests WHERE id=?').get(f.id));
 }finally{storage.close();}
});
