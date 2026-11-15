import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {HttpError} from '../validation.mjs';
export const COOKIE='__Host-jyra_cloud';
export function cloudConfig(env=process.env){
 const storage=!!(env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN),session=typeof env.ZYRA_SESSION_SECRET==='string'&&env.ZYRA_SESSION_SECRET.length>=43,ai=!!env.GROQ_API_KEY;
 return {ready:ai&&storage&&session,storage:storage&&session,ai,session,model:'openai/gpt-oss-20b',dailyLimit:Math.floor(Math.min(100,Math.max(1,Number(env.ZYRA_DAILY_LIMIT)||20)))};
}
export function send(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.end(JSON.stringify(value));}
export function originCheck(req){if(req.headers.origin!==`https://${req.headers.host}`)throw new HttpError(403,'Open JYRA from its own website to continue.');}
export async function readJSON(req,limit=60000){
 if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Use JSON.');if(Number(req.headers['content-length']||0)>limit)throw new HttpError(413,'Request is too large.');
 let body=req.body;if(body===undefined){const chunks=[];let bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>limit)throw new HttpError(413,'Request is too large.');chunks.push(Buffer.from(chunk));}body=Buffer.concat(chunks).toString('utf8');}
 if(typeof body==='string'){if(Buffer.byteLength(body)>limit)throw new HttpError(413,'Request is too large.');try{body=JSON.parse(body);}catch{throw new HttpError(400,'Invalid JSON.');}}
 if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>limit)throw new HttpError(400,'Invalid request.');return body;
}
export function safeError(res,error){if(res.destroyed)return;const status=error instanceof HttpError?error.status:503,message=error instanceof HttpError?error.message:'JYRA service is temporarily unavailable. Please try again.';if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));if(res.headersSent)res.end(JSON.stringify({error:message})+'\n');else send(res,status,{error:message});}
const QUOTA=`for i,k in ipairs(KEYS) do local c=tonumber(redis.call('GET',k) or '0');if c>=tonumber(ARGV[(i-1)*2+1]) then return {0,i,redis.call('TTL',k)} end end;local remaining=0;for i,k in ipairs(KEYS) do local n=redis.call('INCR',k);if n==1 then redis.call('EXPIRE',k,tonumber(ARGV[(i-1)*2+2])) end;if i==2 then remaining=tonumber(ARGV[(i-1)*2+1])-n end end;return {1,remaining,0}`;
export function createCloudServices({env=process.env,fetcher=fetch,clock=Date.now,command:injected}={}){
 const config=cloudConfig(env),app=/^[a-z0-9-]{1,32}$/.test(env.ZYRA_APP_ID||'')?env.ZYRA_APP_ID:'jyra',prefix=app+':{shared}:',secret=env.ZYRA_SESSION_SECRET||'';
 const hash=value=>createHmac('sha256',secret).update(value).digest('hex');
 async function command(args){if(injected)return injected(args);let url;try{url=new URL(env.UPSTASH_REDIS_REST_URL);}catch{throw new HttpError(503,'Cloud storage is not configured yet.');}if(url.protocol!=='https:'||!url.hostname.endsWith('.upstash.io')||url.username||url.password||url.pathname!=='/')throw new HttpError(503,'Cloud storage configuration needs attention.');
  try{const response=await fetcher(url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error();const result=await response.json();if(result.error)throw new Error();return result.result;}catch{throw new HttpError(503,'Cloud storage is unavailable. Your local data is unchanged.');}}
 function issueSession(res,id=randomUUID()){if(!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(400,'Invalid session.');const expires=clock()+30*86400000,payload=id+'.'+expires;res.setHeader('Set-Cookie',`${COOKIE}=${payload}.${hash('session:'+payload)}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);return {id,expires};}
 function session(req,res,create=false){if(!config.session)throw new HttpError(503,'The owner is preparing secure online sessions.');const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1),parts=raw?.split('.');
  if(parts?.length===3){const [id,expires,signature]=parts,payload=id+'.'+expires,expected=hash('session:'+payload);if(/^[a-f0-9-]{36}$/.test(id)&&/^\d{13}$/.test(expires)&&Number(expires)>clock()&&Number(expires)<=clock()+31*86400000&&/^[a-f0-9]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return {id,expires:Number(expires)};}
  if(!create)throw new HttpError(401,'Start an online session before using this service.');return issueSession(res);
 }
 function ip(req){const value=env.VERCEL==='1'?req.headers['x-forwarded-for']?.split(',')[0]?.trim():req.socket?.remoteAddress;if(!value||value.length>128)throw new HttpError(503,'Could not identify this connection. Please try again.');return hash('network:'+value);}
 async function consume(req,user,kind='chat'){
  if(!config.storage)throw new HttpError(503,'The owner is preparing online service limits.');const now=clock(),day=Math.floor((now+21600000)/86400000),ttlDay=Math.max(1,Math.ceil(((day+1)*86400000-21600000-now)/1000)),minute=Math.floor(now/60000),network=ip(req);
  const daily=kind==='chat'?config.dailyLimit:kind==='sync'?120:10,global=kind==='chat'?Math.min(10000,Math.max(1,Number(env.ZYRA_GLOBAL_DAILY_LIMIT)||200)):kind==='sync'?10000:1000;
  const keys=[prefix+kind+':minute:'+network+':'+minute,prefix+kind+':user:'+user.id+':'+day,prefix+kind+':network:'+network+':'+day,prefix+kind+':all:'+day];
  const result=await command(['EVAL',QUOTA,keys.length,...keys,kind==='chat'?10:30,120,daily,ttlDay,daily*3,ttlDay,global,ttlDay]);if(!Array.isArray(result)||result.length!==3)throw new HttpError(503,'Online usage limits are unavailable.');if(result[0]!==1){const error=new HttpError(429,result[1]===1?'Please wait a minute before sending more requests.':'Today’s online usage limit has been reached. Please try again after midnight in Bangladesh.');error.retryAfter=Math.max(1,Number(result[2])||60);throw error;}return {remaining:result[1],resetsAt:now+ttlDay*1000};
 }
 return {config,command,session,issueSession,consume,hash,prefix,clock};
}
