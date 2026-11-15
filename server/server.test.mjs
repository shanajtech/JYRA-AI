import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,rm,rmdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createBackend} from './server.mjs';
import {openDatabase} from './database.mjs';
import {request as httpRequest} from 'node:http';

const origin='http://127.0.0.1:1430';
test('local account, persistence and request-boundary protections',async t=>{
 const app=createBackend({databasePath:':memory:'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}`;
 async function call(path,{method='GET',body,cookie='',requestOrigin=origin,headers={}}={}){
  const response=await fetch(base+'/api'+path,{method,headers:{...(method==='GET'?{}:{'Content-Type':'application/json'}),...(requestOrigin?{Origin:requestOrigin}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],setCookie:response.headers.get('set-cookie')};
 }
 const password='test-only-'+randomBytes(20).toString('hex');
 const note={id:randomUUID(),title:'Private local note',body:'Only account A should see this.'};
 let accountA,accountB;
 await t.test('health advertises only connected capabilities',async()=>{const r=await call('/health');assert.equal(r.status,200);assert.equal(r.body.features.auth,true);assert.equal(r.body.features.ai,true);assert.equal(r.body.features.alarmExecution,true);});
 await t.test('unauthenticated storage is rejected',async()=>{assert.equal((await call('/state')).status,401);});
 await t.test('signup hashes passwords and returns a protected cookie',async()=>{
  accountA=await call('/auth/signup',{method:'POST',body:{name:'Test A',email:'a@example.invalid',password}});
  assert.equal(accountA.status,201);assert.ok(accountA.cookie);assert.match(accountA.setCookie,/HttpOnly/);assert.match(accountA.setCookie,/SameSite=Strict/);
  assert.equal(accountA.body.user.password,undefined);
  const row=app.storage.db.prepare('SELECT password_hash,salt FROM users WHERE id=?').get(accountA.body.user.id);
  assert.equal(row.password_hash.length,128);assert.notEqual(row.password_hash,password);assert.equal(row.salt.length,32);
 });
 await t.test('duplicate and short-password accounts fail cleanly',async()=>{
  assert.equal((await call('/auth/signup',{method:'POST',body:{name:'Other',email:'a@example.invalid',password}})).status,409);
  assert.equal((await call('/auth/signup',{method:'POST',body:{name:'Short',email:'short@example.invalid',password:'tiny'}})).status,400);
 });
 await t.test('write/read is scoped and versioned',async()=>{
  const write=await call('/state/notes',{method:'PUT',cookie:accountA.cookie,body:{value:[note],version:0}});assert.equal(write.status,200);assert.equal(write.body.version,1);
  const read=await call('/state',{cookie:accountA.cookie});assert.deepEqual(read.body.state.notes.value,[note]);
  assert.equal((await call('/state/notes',{method:'PUT',cookie:accountA.cookie,body:{value:[],version:0}})).status,409);
  assert.equal((await call('/state',{cookie:accountA.cookie})).body.state.notes.value.length,1);
 });
 await t.test('account B cannot see account A data',async()=>{
  accountB=await call('/auth/signup',{method:'POST',body:{name:'Test B',email:'b@example.invalid',password}});assert.equal(accountB.status,201);
  assert.deepEqual((await call('/state',{cookie:accountB.cookie})).body.state,{});
 });
 await t.test('untrusted/missing origins and DNS-rebinding hosts are denied',async()=>{
  assert.equal((await call('/state/notes',{method:'PUT',cookie:accountA.cookie,requestOrigin:'https://untrusted.invalid',body:{value:[],version:1}})).status,403);
  assert.equal((await call('/state/notes',{method:'PUT',cookie:accountA.cookie,requestOrigin:null,body:{value:[],version:1}})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/state',{headers:{Host:'untrusted.invalid:4310',Cookie:accountA.cookie}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(hostStatus,403);
 });
 await t.test('malformed fields and non-photo payloads are rejected',async()=>{
  assert.equal((await call('/state/notes',{method:'PUT',cookie:accountA.cookie,body:{value:[{...note,password:'must-not-be-stored'}],version:1}})).status,400);
  assert.equal((await call('/state/people',{method:'PUT',cookie:accountA.cookie,body:{value:[{id:randomUUID(),name:'Test',greet:true,photos:['data:image/svg+xml;base64,abc']}],version:0}})).status,400);
  assert.equal((await call('/state/passwords',{method:'PUT',cookie:accountA.cookie,body:{value:[],version:0}})).status,404);
 });
 await t.test('full alarm settings survive a database round trip',async()=>{
  const alarm={id:randomUUID(),time:'05:15',label:'Morning',enabled:true,repeat:5,days:['Mon','Fri'],interval:5,snooze:10,language:'English'};
  assert.equal((await call('/state/alarms',{method:'PUT',cookie:accountA.cookie,body:{version:0,value:[alarm]}})).status,200);
  assert.deepEqual((await call('/state',{cookie:accountA.cookie})).body.state.alarms.value,[alarm]);
  assert.equal((await call('/state/alarms',{method:'PUT',cookie:accountA.cookie,body:{version:1,value:[{...alarm,interval:999}]}})).status,400);
 });
 await t.test('incorrect credentials fail and remembered login works',async()=>{
  assert.equal((await call('/auth/login',{method:'POST',body:{email:'a@example.invalid',password:'wrong'}})).status,401);
  const login=await call('/auth/login',{method:'POST',body:{email:'a@example.invalid',password,remember:true}});assert.equal(login.status,200);assert.match(login.setCookie,/Max-Age=604800/);
 });
 await t.test('demo has a distinct identity and no real-account data',async()=>{
  const demo=await call('/auth/demo',{method:'POST',body:{}});assert.equal(demo.status,200);assert.equal(demo.body.user.demo,true);
  assert.notEqual(demo.body.user.id,accountA.body.user.id);assert.deepEqual((await call('/state',{cookie:demo.cookie})).body.state,{});
  const again=await call('/auth/demo',{method:'POST',cookie:demo.cookie,body:{}});assert.equal(again.body.user.id,demo.body.user.id);
 });
 await t.test('logout invalidates access and sessions expose no hashes',async()=>{
  const session=await call('/session',{cookie:accountB.cookie});assert.equal(session.body.user.name,'Test B');assert.equal(session.body.user.password_hash,undefined);
  await call('/auth/logout',{method:'POST',cookie:accountB.cookie,body:{}});
  assert.equal((await call('/state',{cookie:accountB.cookie})).status,401);
 });
 await t.test('expired sessions do not authenticate',async()=>{app.storage.db.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await call('/session',{cookie:accountA.cookie})).body.user,null);});
});

test('SQLite state survives a backend restart',async()=>{
 const root=resolve(process.cwd(),'../work');
 const folder=await mkdtemp(resolve(root,'backend-test-'));
 if(!folder.startsWith(root+sep))throw new Error('Test directory outside workspace');
 const path=resolve(folder,'test.sqlite');let storage;
 try{
  storage=openDatabase(path);
  const user=await storage.register({name:'Persistence test',email:'persistence@example.invalid',password:'test-only-'+randomBytes(20).toString('hex')});
  storage.write(user.id,'members',['Local member'],0);storage.close();storage=null;
  storage=openDatabase(path);assert.deepEqual(storage.all(user.id).members.value,['Local member']);
 }finally{storage?.close();for(const suffix of ['','-wal','-shm'])await rm(path+suffix,{force:true});await rmdir(folder);}
});
