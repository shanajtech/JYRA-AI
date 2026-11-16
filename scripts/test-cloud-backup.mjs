import assert from 'node:assert/strict';
const root=(process.env.ZYRA_TEST_SITE_URL||'https://jyra-ai.vercel.app').replace(/\/$/,'');
const address=new URL(root);if(address.protocol!=='https:'||address.pathname!=='/'||address.search||address.hash||address.username||address.password)throw new Error('Use an HTTPS site origin for this test.');
function browser(){let cookie='';return async(body)=>{const response=await fetch(root+'/api/cloud/state',{method:body?'POST':'GET',redirect:'error',headers:{...(body?{'Content-Type':'application/json',Origin:root}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const data=await response.json();return {status:response.status,data};};}
const first=browser(),second=browser(),third=browser();
const status=await first();assert.equal(status.status,200);assert.equal(status.data.configured,true,'Cloud storage settings are not active yet.');console.log('PASS: cloud storage configuration active');
let response=await first({action:'connect',consent:true});assert.equal(response.status,200,response.data.error||'Could not connect to database.');
response=await first({action:'read'});assert.equal(response.status,200);assert.equal(response.data.version,0);assert.equal(response.data.notes.length,0);
const note={id:crypto.randomUUID(),title:'Connection test',body:'Temporary automated JYRA database connection test. No personal information.'};
response=await first({action:'write',consent:true,version:0,notes:[note],conversations:[]});assert.equal(response.status,200,response.data.error);assert.equal(response.data.version,1);
response=await first({action:'read'});assert.equal(response.status,200);assert.equal(response.data.notes[0].body,note.body);console.log('PASS: actual database save and read');
response=await first({action:'write',consent:true,version:0,notes:[],conversations:[]});assert.equal(response.status,409);console.log('PASS: old-version overwrite rejected');
assert.equal((await second({action:'connect',consent:true})).status,200);response=await second({action:'read'});assert.equal(response.data.notes.length,0);console.log('PASS: another session cannot read the first backup');
const pairing=await first({action:'code'});assert.equal(pairing.status,200);assert.equal((await third({action:'connect',consent:true})).status,200);response=await third({action:'restore',consent:true,code:pairing.data.code});assert.equal(response.status,200);assert.equal(response.data.notes[0].body,note.body);response=await third({action:'read'});assert.equal(response.data.version,1);console.log('PASS: one-time device transfer and restored session');
response=await second({action:'restore',consent:true,code:pairing.data.code});assert.equal(response.status,401);console.log('PASS: used connection code cannot be replayed');
console.log('Real cloud backup checks passed. Only synthetic test data was used; no credentials or session values were printed.');
