import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobile} from './mobile.mjs';
import {createMail} from './mail.mjs';
import {openDatabase} from './database.mjs';
import {validateWave} from './speech.mjs';
import {validateCollection} from './validation.mjs';
import {confidentMatch} from '../src/workspace/faceMatching.ts';
import {storedZip,organizedPath} from '../src/workspace/organize.ts';
import {createRecovery} from './recovery.mjs';
import {createGmail} from './gmail.mjs';
test('paired mobile devices have single-use expiring codes, scoped permissions and revocation',async()=>{
 const s=openDatabase(':memory:');try{let now=Date.now();const a=s.createDemo(),b=s.createDemo(),m=createMobile(s,{chat:async user=>({answer:user.id})},{clock:()=>now,publicUrl:'https://zyra.example'});
 assert.throws(()=>m.code(a,{permissions:['chat']}),{status:503});m.setReady(true);const code=m.code(a,{permissions:['chat']});const device=m.pair({code:code.code,name:'Test phone'});assert.equal((await m.chat(device.token,{})).answer,a.id);assert.throws(()=>m.tasks(device.token),{status:403});assert.throws(()=>m.pair({code:code.code,name:'Replay'}),{status:401});
 m.revoke(b,{id:device.device.id});assert.equal((await m.chat(device.token,{})).answer,a.id);m.revoke(a,{id:device.device.id});await assert.rejects(m.chat(device.token,{}),{status:401});
 const old=m.code(a,{permissions:['readTasks']});now+=300001;assert.throws(()=>m.pair({code:old.code,name:'Late'}),{status:401});
 }finally{s.close();}
});
test('email is owner-only, requires explicit review and refuses header injection',async()=>{
 let sent;const env={ZYRA_SMTP_HOST:'smtp.example.invalid',ZYRA_MAIL_FROM:'owner@example.invalid',ZYRA_MAIL_USER:'test',ZYRA_MAIL_PASSWORD:'test-only',ZYRA_MAIL_OWNER_EMAIL:'owner@example.invalid'};
 const mail=createMail({env,transportFactory:()=>({sendMail:async message=>{sent=message;return {accepted:[message.to],messageId:'test'};},close(){}})}),owner={email:env.ZYRA_MAIL_OWNER_EMAIL,demo:false};
 assert.equal(mail.status({...owner,demo:true}).configured,false);await assert.rejects(mail.send({email:'other@example.invalid'},{to:'target@example.invalid'}),{status:403});
 const body={to:'target@example.invalid',subject:'Hello',text:'Reviewed test',reviewed:true};await assert.rejects(mail.send(owner,{...body,reviewed:false}),{status:400});await assert.rejects(mail.send(owner,{...body,subject:'Hello\r\nBcc: other@example.invalid'}),{status:400});assert.equal((await mail.send(owner,body)).accepted,true);assert.equal(sent.disableFileAccess,true);assert.equal(sent.disableUrlAccess,true);
});
test('malformed audio and chat history cannot smuggle system instructions or unknown fields',()=>{
 assert.throws(()=>validateWave({audio:Buffer.from('not audio').toString('base64'),language:'en'}),{status:400});assert.throws(()=>validateCollection('conversations',[{id:'00000000-0000-0000-0000-000000000000',title:'x',updatedAt:Date.now(),messages:[{role:'system',content:'execute'}]}]),{status:400});
});
test('face matches require a threshold and separation from competing identities',()=>{
 assert.equal(confidentMatch([{name:'A',score:.9},{name:'B',score:.87}]),null);assert.equal(confidentMatch([{name:'A',score:.6}]),null);assert.equal(confidentMatch([{name:'A',score:.91},{name:'A',score:.92},{name:'B',score:.7}]).name,'A');
});
test('organized ZIP preserves relative names and rejects traversal/duplicates',()=>{
 assert.equal(organizedPath('folder/nested/readme.md'),'Docs/nested/readme.md');assert.throws(()=>organizedPath('folder/../secret'));const zip=storedZip([{name:'Docs/test.txt',bytes:new TextEncoder().encode('hello')}]);assert.equal(new DataView(zip.buffer).getUint32(0,true),0x04034b50);assert.equal(new DataView(zip.buffer).getUint32(zip.length-22,true),0x06054b50);assert.throws(()=>storedZip([{name:'x',bytes:new Uint8Array()},{name:'x',bytes:new Uint8Array()}]));
});
test('local recovery is single-use, hashes codes and invalidates sessions and paired devices',async()=>{
 const s=openDatabase(':memory:');try{const user=await s.register({name:'Recovery test',email:'recover@example.invalid',password:'test-old-password-123'});createMobile(s,{});const recovery=createRecovery(s),token=s.session(user).token,{code}=recovery.issue(user);assert.notEqual(s.db.prepare('SELECT code_hash FROM recovery_codes').get().code_hash,code);
 await assert.rejects(recovery.reset({email:user.email,code:'a'.repeat(64),password:'test-new-password-123'}),{status:401});await recovery.reset({email:user.email,code,password:'test-new-password-123'});assert.equal(s.identify(token),null);await assert.rejects(s.login({email:user.email,password:'test-old-password-123'}),{status:401});assert.equal((await s.login({email:user.email,password:'test-new-password-123'})).id,user.id);await assert.rejects(recovery.reset({email:user.email,code,password:'test-new-password-456'}),{status:401});
 }finally{s.close();}
});
test('Gmail connect stores protected credentials only after verification, scoped to its account',async()=>{
 const s=openDatabase(':memory:');try{const user=await s.register({name:'Gmail test',email:'gmail@example.invalid',password:'test-password-123'}),other=s.createDemo();let verified=false;
 const gmail=createGmail(s,{crypt:async(mode,text)=>mode==='protect'?'protected:'+Buffer.from(text).toString('base64'):Buffer.from(text.slice(10),'base64').toString(),mailFactory:({env}={})=>({verify:async()=>{verified=true;assert.equal(env.ZYRA_SMTP_HOST,'smtp.gmail.com');},inbox:async()=>({messages:[]})})});
 await assert.rejects(gmail.connect(other,{email:user.email,password:'abcdefghijklmnop'}),{status:403});await gmail.connect(user,{email:user.email,password:'abcdefghijklmnop'});assert.equal(verified,true);assert.equal(gmail.status(user).configured,true);assert.equal(gmail.status(other).configured,false);assert.ok(!s.db.prepare('SELECT payload FROM integrations').get().payload.includes('abcdefghijklmnop'));gmail.disconnect(user);assert.equal(gmail.status(user).configured,false);
 }finally{s.close();}
});
