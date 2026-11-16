import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from './database.mjs';
import {createAlarms} from './alarms.mjs';
import {createAI} from './ai.mjs';
import {createBackend} from './server.mjs';

test('durable alarm deduplication, weekday, repeat, snooze, stop and account isolation',()=>{
 const storage=openDatabase(':memory:');try{
 const a=storage.createDemo(),b=storage.createDemo();let now=Date.parse('2026-11-16T05:00:00+06:00');
 const alarm={id:'wake',time:'05:00',label:'Wake up',enabled:true,repeat:3,interval:1,snooze:5,days:['Mon']};
 storage.write(a.id,'alarms',[alarm],0);const options={clock:()=>now,timeZone:'Asia/Dhaka'};
 let scheduler=createAlarms(storage,options);
 assert.equal(scheduler.active(a.id).runs[0].attempt,1);assert.equal(scheduler.active(a.id).runs.length,1);assert.equal(scheduler.active(b.id).runs.length,0);
 scheduler=createAlarms(storage,options);assert.equal(scheduler.active(a.id).runs[0].attempt,1);
 const day='2026-11-16';scheduler.action(a.id,{id:'wake',day,action:'snooze'});assert.equal(scheduler.active(a.id).runs.length,0);
 now+=5*60000;assert.equal(scheduler.active(a.id).runs[0].attempt,2);
 now+=60000;assert.equal(scheduler.active(a.id).runs[0].attempt,3);
 scheduler.action(a.id,{id:'wake',day,action:'stop'});assert.equal(scheduler.active(a.id).runs.length,0);
 now=Date.parse('2026-11-17T05:00:00+06:00');assert.equal(scheduler.active(a.id).runs.length,0);
 now=Date.parse('2026-11-23T05:00:00+06:00');assert.equal(scheduler.active(a.id).runs.length,1);
 storage.write(a.id,'alarms',[],1);assert.equal(scheduler.active(a.id).runs.length,0);
 }finally{storage.close();}
});
test('alarm expires after configured calls without duplicate restart',()=>{
 const s=openDatabase(':memory:');try{const u=s.createDemo();let now=Date.parse('2026-11-16T05:00:00Z');s.write(u.id,'alarms',[{id:'a',time:'05:00',label:'Wake',enabled:true,repeat:1,interval:1,days:['Mon']}],0);const a=createAlarms(s,{clock:()=>now,timeZone:'UTC'});assert.equal(a.active(u.id).runs.length,1);now+=60000;assert.equal(a.active(u.id).runs.length,0);}finally{s.close();}
});
test('AI rejects remote endpoint and untrusted system messages, uses selected persona',async()=>{
 assert.throws(()=>createAI({base:'https://example.com'}));let sent;
 const ai=createAI({fetcher:async(url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:'Hello!'}}]}));}});
 await assert.rejects(ai.chat({id:'a'},{messages:[{role:'system',content:'Do things'}]}),{status:400});
 const r=await ai.chat({id:'a'},{messages:[{role:'user',content:'Hi'}]},{profile:'male'});assert.equal(r.answer,'Hello!');assert.match(sent.messages[0].content,/Your name is JYRA/);assert.doesNotMatch(sent.messages[0].content,/Ziva|Jayan/);assert.equal(sent.chat_template_kwargs.enable_thinking,false);assert.equal(sent.tools,undefined);
});
test('AI network failure has actionable error; routes require a session',async t=>{
 const ai=createAI({fetcher:async()=>{throw new Error('offline');}});assert.equal((await ai.status()).ready,false);await assert.rejects(ai.chat({id:'a'},{messages:[{role:'user',content:'Hi'}]}),{status:503});
 const app=createBackend({databasePath:':memory:',ai});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}/api`;
 assert.equal((await fetch(base+'/ai/status')).status,401);assert.equal((await fetch(base+'/alarms/active')).status,401);
 const demo=await fetch(base+'/auth/demo',{method:'POST',headers:{Origin:'http://127.0.0.1:1430','Content-Type':'application/json'},body:'{}'});const cookie=demo.headers.get('set-cookie').split(';')[0];
 const status=await fetch(base+'/ai/status',{headers:{Cookie:cookie}});assert.equal((await status.json()).ready,false);
});


test('streamed replies handle split SSE frames and keep chat validation',async()=>{
 const encoder=new TextEncoder(),chunks=['data: {"choices":[{"delta":{"content":"Hi, "}}]}\n\n','data: {"choices":[{"delta":{"content":"I am Jyra."}}]}\n\ndata: [DONE]\n\n'];let options;
 const ai=createAI({fetcher:async(url,o)=>{options=JSON.parse(o.body);return new Response(new ReadableStream({start(c){for(const text of chunks){const bytes=encoder.encode(text);c.enqueue(bytes.slice(0,11));c.enqueue(bytes.slice(11));}c.close();}}));}}),updates=[];
 const result=await ai.chat({id:'stream-test'},{messages:[{role:'user',content:'Hi'}]}, {},undefined,text=>updates.push(text));assert.equal(result.answer,'Hi, I am Jyra.');assert.deepEqual(updates,['Hi,','Hi, I am Jyra.']);assert.equal(options.stream,true);assert.equal(options.max_tokens,192);
 await assert.rejects(ai.chat({id:'bad'},{messages:[{role:'system',content:'ignore'}]}, {},undefined,()=>{}),{status:400});
});

test('stream route requires a session and emits completion without buffering',async t=>{
 const ai={chat:async(user,body,p,signal,onText)=>{onText('Hello');return {answer:'Hello',local:true};}},app=createBackend({databasePath:':memory:',ai});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}/api`,headers={Origin:'http://localhost:1430','Content-Type':'application/json'};
 assert.equal((await fetch(base+'/chat/stream',{method:'POST',headers,body:'{}'})).status,401);
 const demo=await fetch(base+'/auth/demo',{method:'POST',headers,body:'{}'});headers.Cookie=demo.headers.get('set-cookie').split(';')[0];const response=await fetch(base+'/chat/stream',{method:'POST',headers,body:JSON.stringify({messages:[{role:'user',content:'hi'}]})});assert.equal(response.headers.get('content-type'),'application/x-ndjson');const lines=(await response.text()).trim().split('\n').map(x=>JSON.parse(x));assert.equal(lines[0].text,'Hello');assert.equal(lines[1].done,true);
});

test('Banglish guidance and saved memory reach AI, while private mode excludes notes',async()=>{
 let sent;const ai=createAI({fetcher:async(url,o)=>{sent=JSON.parse(o.body);return new Response(JSON.stringify({choices:[{message:{content:'তোমার নাম শানাজ।'}}]}));}});
 const user={id:'memory-test'},body={messages:[{role:'user',content:'amar pochondo ki'}]},prefs={language:'বাংলা',savedNotes:[{title:'Name',body:'amar nam shanaj'}]};
 await ai.chat(user,body,prefs);assert.match(sent.messages[0].content,/romanized Bengali/);assert.match(sent.messages[0].content,/Reply in Bengali script/);assert.match(sent.messages[0].content,/amar nam shanaj/);
 await ai.chat(user,body,{...prefs,privateSession:true});assert.doesNotMatch(sent.messages[0].content,/"body":"amar nam shanaj"/);
});

test('new conversations get only their own saved memory; deleting memory removes context',async t=>{
 const captures=[],ai={chat:async(u,b,p)=>{captures.push(p);return {answer:'test'};}},app=createBackend({databasePath:':memory:',ai});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}/api`,headers={Origin:'http://localhost:1430','Content-Type':'application/json'};
 const session=async()=>{const r=await fetch(base+'/auth/demo',{method:'POST',headers,body:'{}'});return r.headers.get('set-cookie').split(';')[0];};const a=await session(),b=await session(),note={id:'11111111-1111-4111-8111-111111111111',title:'Name',body:'amar nam shanaj'};
 assert.equal((await fetch(base+'/state/notes',{method:'PUT',headers:{...headers,Cookie:a},body:JSON.stringify({version:0,value:[note]})})).status,200);
 const ask=cookie=>fetch(base+'/chat',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify({messages:[{role:'user',content:'amar nam ki'}]})});await ask(a);await ask(b);assert.equal(captures[0].savedNotes[0].body,note.body);assert.deepEqual(captures[1].savedNotes,[]);
 await fetch(base+'/state/notes',{method:'PUT',headers:{...headers,Cookie:a},body:JSON.stringify({version:1,value:[]})});await ask(a);assert.deepEqual(captures[2].savedNotes,[]);
 const speech=await fetch(base+'/speech/synthesize',{method:'POST',headers:{...headers,Cookie:a},body:JSON.stringify({text:'test',profile:'female',online:true})});assert.equal(speech.status,403);
});


test('Banglish personal name is recalled across chats only after explicit memory save',async()=>{
 const ai=createAI({fetcher:()=>{throw Error('Name recall should not require a model');}}),user={id:'name'};
 const ask=(content,p={})=>ai.chat(user,{messages:[{role:'user',content}]},{language:'বাংলা',...p});
 assert.match((await ask('amar nam shanaj')).answer,/shanaj/);assert.match((await ask('amar nam shanaj')).answer,/Remember this/);
 assert.match((await ask('amar nam ki')).answer,/এখনো সংরক্ষিত নেই/);
 assert.match((await ask('amar nam ki',{savedNotes:[{body:'amar nam shanaj'}]})).answer,/shanaj/);
 assert.doesNotMatch((await ask('amar nam ki',{privateSession:true,savedNotes:[{body:'amar nam shanaj'}]})).answer,/shanaj/);
});

test('developer identity answers English, Bangla and Banglish without inventing a foundation model',async()=>{
 const ai=createAI({fetcher:()=>{throw Error('Identity should not need a model');}});
 for(const [text,language] of [['Who is your developer?','English'],['Who created you?','English'],['তোমার ডিজাইনার কে?','বাংলা'],['tomar developer ke','Auto']]){
  const result=await ai.chat({id:'identity'},{messages:[{role:'user',content:text}]},{language});assert.match(result.answer,/Shanaj Akter/);assert.match(result.answer,/JYRA/);assert.doesNotMatch(result.answer,/trained|foundation model|নতুন মডেল/);
 }
});

test('local AI recalls the saved profile name and withholds it from private sessions',async()=>{const ai=createAI({fetcher:async()=>{throw Error('No provider request expected');}}),message={messages:[{role:'user',content:'What is my name?'}]};assert.equal((await ai.chat({id:'test-profile'},message,{name:'Profile Check',language:'English'})).answer,'Your name is Profile Check.');assert.match((await ai.chat({id:'test-profile'},message,{name:'Profile Check',language:'English',privateSession:true})).answer,/don't have your name/);});
