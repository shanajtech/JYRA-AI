import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from './server.mjs';
test('native frontend assets remain scoped; session expiry applies and demo Gmail access is blocked',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'zyra-static-test-'));await writeFile(join(folder,'index.html'),'<h1>ZYRA test</h1>');await writeFile(join(folder,'.env'),'TEST_ONLY=must-not-be-served');
 await writeFile(join(folder,'welcome.wav'),'test-audio');await writeFile(join(folder,'inter.woff2'),'test-font');
 const app=createBackend({databasePath:':memory:',frontendDir:folder});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await rm(folder,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${app.server.address().port}`,origin='http://127.0.0.1:4315';
 const home=await fetch(base+'/');assert.match(await home.text(),/ZYRA test/);assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/assets%2f..%2f..%2foutside.txt')).status,403);
 assert.equal((await fetch(base+'/welcome.wav')).headers.get('content-type'),'audio/wav');assert.equal((await fetch(base+'/inter.woff2')).headers.get('content-type'),'font/woff2');
 const demo=await fetch(base+'/api/auth/demo',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}),cookie=demo.headers.get('set-cookie').split(';')[0];
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 const bad=await fetch(base+'/api/security/session',{method:'POST',headers,body:JSON.stringify({minutes:1})});assert.equal(bad.status,400);
 const r=await fetch(base+'/api/security/session',{method:'POST',headers,body:JSON.stringify({minutes:30})}),result=await r.json();assert.equal(r.status,200);assert.ok(Math.abs(result.expiresAt-Date.now()-30*60000)<2000);assert.match(r.headers.get('set-cookie'),/Max-Age=1800/);
 const gmail=await fetch(base+'/api/mail/connect',{method:'POST',headers,body:JSON.stringify({email:'fake@gmail.com',password:'abcdefghijklmnop'})});assert.equal(gmail.status,403);
});
