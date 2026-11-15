import {createSupport} from './support.mjs';
import {createRecovery} from './recovery.mjs';
import {createReminders} from './reminders.mjs';
import {inspectTailscale,activateTailscale} from './tailscale.mjs';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {readFileSync,existsSync} from 'node:fs';
import {once} from 'node:events';
import {sep,extname,dirname} from 'node:path';
import {openDatabase} from './database.mjs';
import {HttpError,collections,credentials,validateCollection} from './validation.mjs';
import {createAI} from './ai.mjs';
import {createAlarms} from './alarms.mjs';
import {createSpeech} from './speech.mjs';
import {createGmail} from './gmail.mjs';
import {createMobile} from './mobile.mjs';
import {startMobileGateway} from './mobile-gateway.mjs';

const defaultOrigins=['http://127.0.0.1:1430','http://localhost:1430','http://127.0.0.1:1420','http://localhost:1420','http://127.0.0.1:4315'];
function readBody(req,limit=8*1024*1024){return new Promise((resolve,reject)=>{
  let bytes=0,failed=false;const chunks=[];
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){if(!failed){failed=true;reject(new HttpError(413,'Request is too large.'));}return;}if(!failed)chunks.push(chunk);});
  req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}catch{reject(new HttpError(400,'Invalid JSON.'));}});
  req.on('error',reject);
});}
function cookie(req){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('zyra_session='))?.slice(13)||'';}
export function createBackend({databasePath=resolve(fileURLToPath(new URL('../data/',import.meta.url)),'zyra.sqlite'),origins=defaultOrigins,ai=createAI(),alarmOptions={},speech=createSpeech(),mail=null,frontendDir=process.env.ZYRA_FRONTEND_DIR}={}){
  const storage=openDatabase(databasePath),allowed=new Set(origins),attempts=new Map();
 const support=createSupport(storage);
  mail??=createGmail(storage);
  const configPath=databasePath===':memory:'?null:resolve(dirname(databasePath),'mobile-config.json');let mobileEnv={...process.env};
  if(configPath&&existsSync(configPath))try{const saved=JSON.parse(readFileSync(configPath,'utf8'));if(saved.ZYRA_MOBILE_BEHIND_TRUSTED_PROXY==='1'&&typeof saved.ZYRA_MOBILE_PUBLIC_URL==='string')mobileEnv={...mobileEnv,ZYRA_MOBILE_PUBLIC_URL:saved.ZYRA_MOBILE_PUBLIC_URL,ZYRA_MOBILE_BEHIND_TRUSTED_PROXY:'1',ZYRA_MOBILE_PORT:'4431'};}catch{/* Keep a malformed optional configuration disabled. */}
  const mobile=createMobile(storage,ai,{publicUrl:mobileEnv.ZYRA_MOBILE_PUBLIC_URL||''}),recovery=createRecovery(storage);let gateway=null;try{gateway=startMobileGateway(mobile,{env:mobileEnv});}catch{console.error('Mobile portal configuration is incomplete; local ZYRA is still available.');}
  const alarms=createAlarms(storage,alarmOptions),reminders=createReminders(storage,alarmOptions),timer=setInterval(()=>{try{alarms.tick();reminders.tick();}catch(error){console.error('Reminder check failed:',error.message);}},1000);timer.unref();
  function limited(key,max){const now=Date.now();if(attempts.size>1000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);let bucket=attempts.get(key);if(!bucket||bucket.until<now){bucket={count:0,until:now+60_000};attempts.set(key,bucket);}if(++bucket.count>max)throw new HttpError(429,'Too many requests. Please wait a minute.');}
  const server=createServer(async(req,res)=>{
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(body));};
    try{
      const host=req.headers.host||'';
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))throw new HttpError(403,'Invalid local host.');
      const path=new URL(req.url,'http://127.0.0.1').pathname;
      const write=!['GET','HEAD'].includes(req.method);
      if(req.headers.origin&&!allowed.has(req.headers.origin))throw new HttpError(403,'Origin is not allowed.');
      if(write){if(!allowed.has(req.headers.origin))throw new HttpError(403,'A trusted app origin is required.');if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Use JSON requests.');}
      limited(req.socket.remoteAddress||'local',180);
      if(frontendDir&&req.method==='GET'&&!path.startsWith('/api/')){
        const root=resolve(frontendDir),relative=decodeURIComponent(path).replace(/^\/+/,''),file=resolve(root,relative||'index.html');
        if(!file.startsWith(root+sep))throw new HttpError(403,'Invalid asset path.');
        const allowedExtensions={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.woff':'font/woff','.woff2':'font/woff2','.bin':'application/octet-stream','.wasm':'application/wasm','.ico':'image/x-icon'};
        if(!allowedExtensions[extname(file)])throw new HttpError(404,'Asset not found.');
        try{const info=await stat(file);if(!info.isFile()||info.size>40*1024*1024)throw new Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':allowedExtensions[extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});return res.end(bytes);}catch{throw new HttpError(404,'Asset not found.');}
      }
      if(path==='/api/health'&&req.method==='GET')return send(200,{ok:true,service:'zyra-local',database:'sqlite',version:1,features:{auth:true,storage:true,ai:true,alarmExecution:true,vision:true,fileOrganizer:true,computerUse:false,remote:mobile.ready()}});
      if(path==='/api/support'&&req.method==='POST'){limited('support:'+req.socket.remoteAddress,5);return send(201,await support.submit(await readBody(req,24000)));}
 const token=cookie(req),user=storage.identify(token);
      if(path==='/api/session'&&req.method==='GET')return send(200,{user});
      const setSession=(account,remember=false)=>{storage.logout(token);const session=storage.session(account,remember);res.setHeader('Set-Cookie',`zyra_session=${session.token}; HttpOnly; SameSite=Strict; Path=/api${session.maxAge?`; Max-Age=${session.maxAge}`:''}`);};
      if(path==='/api/auth/signup'&&req.method==='POST'){limited('signup:'+req.socket.remoteAddress,10);const details=credentials(await readBody(req,16_384),true);const account=await storage.register(details);setSession(account);return send(201,{user:account,recoveryCode:recovery.issue(account).code});}
      if(path==='/api/auth/login'&&req.method==='POST'){limited('login:'+req.socket.remoteAddress,10);const details=credentials(await readBody(req,16_384));const account=await storage.login(details);setSession(account,details.remember);return send(200,{user:account});}
      if(path==='/api/auth/demo'&&req.method==='POST'){limited('demo:'+req.socket.remoteAddress,15);await readBody(req,1024);const account=user?.demo?user:storage.createDemo();setSession(account,true);return send(200,{user:account});}
      if(path==='/api/auth/logout'&&req.method==='POST'){await readBody(req,1024);storage.logout(token);res.setHeader('Set-Cookie','zyra_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');return send(200,{ok:true});}
      if(path==='/api/auth/recover'&&req.method==='POST'){limited('recover:'+req.socket.remoteAddress,3);const result=await recovery.reset(await readBody(req,2048));res.setHeader('Set-Cookie','zyra_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');return send(200,result);}
      if(!user)throw new HttpError(401,'Sign in or start a local demo first.');
      if(path==='/api/security/session'&&req.method==='GET')return send(200,{expiresAt:storage.expiry(token)});
      if(path==='/api/security/session'&&req.method==='POST'){const body=await readBody(req,1024),expiresAt=storage.setExpiry(token,body.minutes);res.setHeader('Set-Cookie',`zyra_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${body.minutes*60}`);storage.audit(user.id,'session.expiry.updated');return send(200,{expiresAt});}
      if(path==='/api/auth/recovery-code'&&req.method==='POST'){await readBody(req,1024);return send(200,recovery.issue(user));}
      if(path==='/api/mobile/status'&&req.method==='GET')return send(200,mobile.status(user));
      if(path==='/api/mobile/setup-tailscale'&&req.method==='POST'){
        limited('tailscale:'+user.id,3);await readBody(req,1024);const settings=await inspectTailscale();
        if(gateway){gateway.closeAllConnections();await new Promise(r=>gateway.close(r));gateway=null;}mobile.setReady(false);mobile.setUrl(settings.ZYRA_MOBILE_PUBLIC_URL);
        gateway=startMobileGateway(mobile,{env:settings});await once(gateway,'listening');mobile.setReady(false);
        try{await activateTailscale();if(configPath)await writeFile(configPath,JSON.stringify(settings),{mode:0o600});mobile.setReady(true);return send(200,mobile.status(user));}
        catch(e){gateway.closeAllConnections();await new Promise(r=>gateway.close(r));gateway=null;mobile.setReady(false);throw e;}
      }
      if(path==='/api/mobile/code'&&req.method==='POST'){limited('pair:'+user.id,6);return send(200,mobile.code(user,await readBody(req,1024)));}
      if(path==='/api/mobile/revoke'&&req.method==='POST')return send(200,mobile.revoke(user,await readBody(req,1024)));
      if(path==='/api/mail/connect'&&req.method==='POST'){limited('gmail-connect:'+user.id,3);return send(200,await mail.connect(user,await readBody(req,2048)));}
      if(path==='/api/mail/disconnect'&&req.method==='POST'){await readBody(req,1024);return send(200,mail.disconnect(user));}
      if(path==='/api/mail/status'&&req.method==='GET')return send(200,mail.status(user));
      if(path==='/api/mail/inbox'&&req.method==='GET'){limited('inbox:'+user.id,10);return send(200,await mail.inbox(user));}
      if(path==='/api/mail/send'&&req.method==='POST'){limited('mail:'+user.id,5);const sent=await mail.send(user,await readBody(req,90000));storage.audit(user.id,'mail.accepted');return send(200,sent);}
      if(path==='/api/speech/status'&&req.method==='GET')return send(200,speech.status());
      if(['/api/speech/synthesize','/api/speech/transcribe'].includes(path)&&req.method==='POST'){
        limited('speech:'+user.id,20);const body=await readBody(req,path.endsWith('transcribe')?920000:16000),controller=new AbortController();
        if(path.endsWith('synthesize')&&body.online===true&&storage.all(user.id).preferences?.value?.onlineVoice!==true)throw new HttpError(403,'Enable online voice in Personalization first.');
        const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
        try{return send(200,await (path.endsWith('transcribe')?speech.transcribe(user,body,controller.signal):speech.synthesize(user,body,controller.signal)));}finally{res.off('close',cancel);}
      }
      if(path==='/api/ai/status'&&req.method==='GET')return send(200,await ai.status());
      if(path==='/api/chat/stream'&&req.method==='POST'){
        limited('chat:'+user.id,12);const body=await readBody(req,24000),controller=new AbortController();const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
        const emit=value=>{if(res.destroyed)return;if(!res.headersSent)res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.write(JSON.stringify(value)+'\n');};
        try{const result=await ai.chat(user,body,{...storage.all(user.id).preferences?.value,savedNotes:storage.all(user.id).notes?.value||[]},controller.signal,text=>emit({text}));emit({done:true,...result});res.end();}catch(error){if(res.headersSent){emit({error:'Local AI could not finish. Please try again.'});res.end();}else throw error;}finally{res.off('close',cancel);}return;
      }
      if(path==='/api/chat'&&req.method==='POST'){
        limited('chat:'+user.id,12);const body=await readBody(req,24000),controller=new AbortController();
        const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
        try{return send(200,await ai.chat(user,body,{...storage.all(user.id).preferences?.value,savedNotes:storage.all(user.id).notes?.value||[]},controller.signal));}finally{res.off('close',cancel);}
      }
      if(path==='/api/alarms/active'&&req.method==='GET')return send(200,alarms.active(user.id));
      if(path==='/api/reminders'&&req.method==='GET')return send(200,reminders.active(user.id));
      if(path==='/api/reminders/action'&&req.method==='POST')return send(200,reminders.action(user.id,await readBody(req,2048)));
      if(path==='/api/alarms/stop-all'&&req.method==='POST'){await readBody(req,1024);for(const run of alarms.active(user.id).runs)alarms.action(user.id,{id:run.id,day:run.day,action:'stop'});return send(200,{ok:true});}
      if(path==='/api/alarms/action'&&req.method==='POST')return send(200,alarms.action(user.id,await readBody(req,2048)));
      if(path==='/api/state'&&req.method==='GET')return send(200,{state:storage.all(user.id)});
      if(path==='/api/activity'&&req.method==='GET')return send(200,{activity:storage.activity(user.id)});
      if(path.startsWith('/api/state/')&&req.method==='PUT'){
        const key=path.slice('/api/state/'.length);
        if(!collections.includes(key))throw new HttpError(404,'Unknown collection.');
        const body=await readBody(req);
        if(!body||!Number.isInteger(body.version)||body.version<0||Object.keys(body).some(k=>!['version','value'].includes(k)))throw new HttpError(400,'Invalid save request.');
        const value=validateCollection(key,body.value);
        return send(200,{version:storage.write(user.id,key,value,body.version)});
      }
      throw new HttpError(404,'Endpoint not found.');
    }catch(error){const status=error instanceof HttpError?error.status:500;if(status===429)res.setHeader('Retry-After','60');send(status,{error:status===500?'The local service could not complete this request.':error.message});}
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;
  return {server,storage,close:async()=>{clearInterval(timer);if(gateway){gateway.closeAllConnections();await new Promise(r=>gateway.close(r));}return new Promise((resolve,reject)=>{server.closeAllConnections();server.close(error=>{storage.close();error&&error.code!=='ERR_SERVER_NOT_RUNNING'?reject(error):resolve();});});}};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const port=Number(process.env.ZYRA_BACKEND_PORT||4310);
  const backend=createBackend({databasePath:process.env.ZYRA_DATABASE_PATH||undefined});
  backend.server.listen(port,'127.0.0.1',()=>console.log(`ZYRA local backend ready at http://127.0.0.1:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void backend.close().then(()=>process.exit(0)));
}

