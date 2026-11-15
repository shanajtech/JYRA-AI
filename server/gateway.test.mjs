import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {request} from 'node:https';
import {once} from 'node:events';
import {openDatabase} from './database.mjs';
import {createMobile} from './mobile.mjs';
import {startMobileGateway} from './mobile-gateway.mjs';
test('HTTPS portal pairs a scoped device and rejects foreign origin, replay and desktop API access',async t=>{
 const s=openDatabase(':memory:'),user=s.createDemo(),mobile=createMobile(s,{chat:async u=>({answer:'Hello '+u.name})},{publicUrl:'https://localhost:0'});
 const cert=fileURLToPath(new URL('./fixtures/TEST-ONLY-localhost-cert.pem',import.meta.url)),key=fileURLToPath(new URL('./fixtures/TEST-ONLY-localhost-key.pem',import.meta.url));
 const gateway=startMobileGateway(mobile,{env:{ZYRA_MOBILE_PUBLIC_URL:'https://localhost:0',ZYRA_MOBILE_CERT_PATH:cert,ZYRA_MOBILE_KEY_PATH:key,ZYRA_MOBILE_PORT:'0'}});
 await once(gateway,'listening');t.after(async()=>{gateway.closeAllConnections();await new Promise(r=>gateway.close(r));s.close();});
 const call=(path,body,token='',origin='https://localhost:0')=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:gateway.address().port,servername:'localhost',ca:readFileSync(cert),path,method:'POST',headers:{Host:'localhost:0',Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(data)}));});req.on('error',reject);req.end(JSON.stringify(body));});
 const code=mobile.code(user,{permissions:['chat']}),pair=await call('/pair',{code:code.code,name:'TLS test phone'});assert.equal(pair.status,200);assert.ok(pair.data.token);
 assert.equal((await call('/pair',{code:code.code,name:'Replay'})).status,401);assert.equal((await call('/chat',{messages:[]},pair.data.token)).data.answer,'Hello Demo');assert.equal((await call('/tasks',{},pair.data.token)).status,403);assert.equal((await call('/chat',{},pair.data.token,'https://foreign.invalid')).status,403);assert.equal((await call('/api/state',{},pair.data.token)).status,404);
 mobile.revoke(user,{id:pair.data.device.id});assert.equal((await call('/chat',{},pair.data.token)).status,401);
});
