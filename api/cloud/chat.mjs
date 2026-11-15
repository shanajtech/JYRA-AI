import {createHash} from 'node:crypto';
import {createGroqAI} from '../../server/ai.mjs';
import {HttpError,validateCollection} from '../../server/validation.mjs';

export const config={maxDuration:60};
export function createCloudHandler({fetcher=fetch,clock=Date.now}={}){
 const limits=new Map(),running=new Set();
 return async function handler(req,res){
  const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  let fingerprint,controller,ownsRun=false;
  try{
   if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'Use POST.'});}
   if(req.headers.origin!==`https://${req.headers.host}`)throw new HttpError(403,'Open JYRA from its own website to connect.');
   if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Use JSON.');
   const key=/^Bearer (gsk_[A-Za-z0-9_-]{20,200})$/.exec(req.headers.authorization||'')?.[1];
   if(!key)throw new HttpError(401,'Connect your own Groq key first. Never paste it in a chat message.');
   if(Number(req.headers['content-length']||0)>60000)throw new HttpError(413,'Conversation is too large.');
   let body=req.body;
   if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>60000)throw new HttpError(413,'Conversation is too large.');}try{body=JSON.parse(raw);}catch{throw new HttpError(400,'Invalid JSON.');}}
   else if(typeof body==='string'){if(Buffer.byteLength(body)>60000)throw new HttpError(413,'Conversation is too large.');try{body=JSON.parse(body);}catch{throw new HttpError(400,'Invalid JSON.');}}
   if(!body||Array.isArray(body)||typeof body!=='object'||JSON.stringify(body).length>60000||Object.keys(body).some(k=>!['action','messages','language','privateSession','savedNotes'].includes(k)))throw new HttpError(400,'Invalid conversation.');
   if(!['verify','chat'].includes(body.action))throw new HttpError(400,'Unknown action.');
   if(body.language!==undefined&&!['English','বাংলা','Auto'].includes(body.language))throw new HttpError(400,'Invalid language.');
   if(body.privateSession!==undefined&&typeof body.privateSession!=='boolean')throw new HttpError(400,'Invalid private-session choice.');
   fingerprint=createHash('sha256').update(key).digest('hex');const now=clock();
   for(const [id,entry]of limits)if(entry.until<now)limits.delete(id);
   if(limits.size>=500&&!limits.has(fingerprint))throw new HttpError(429,'JYRA is busy. Try again shortly.');
   const bucket=limits.get(fingerprint)||{count:0,until:now+60000};limits.set(fingerprint,bucket);if(++bucket.count>12)throw new HttpError(429,'Please wait a minute before sending more requests.');
   controller=new AbortController();const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
   try{
    if(body.action==='verify'){
     const upstream=await fetcher('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
     if(!upstream.ok)throw new HttpError(upstream.status===429?429:401,upstream.status===429?'Groq limit reached. Please try later.':'Groq could not verify this key.');
     const data=await upstream.json();if(!data.data?.some(m=>m.id==='openai/gpt-oss-20b'))throw new HttpError(503,'The selected model is not available to this Groq account.');
     return send(200,{ready:true,provider:'Groq',model:'openai/gpt-oss-20b'});
    }
    if(running.has(fingerprint))throw new HttpError(429,'A reply is already being prepared.');running.add(fingerprint);ownsRun=true;
    const notes=body.privateSession?[]:validateCollection('notes',body.savedNotes||[]).slice(0,20);
    const ai=createGroqAI({key,fetcher});const emit=value=>{if(res.destroyed)return;if(!res.headersSent){res.statusCode=200;res.setHeader('Content-Type','application/x-ndjson');}res.write(JSON.stringify(value)+'\n');};
    const result=await ai.chat({id:fingerprint},{messages:body.messages},{language:body.language||'Auto',privateSession:!!body.privateSession,savedNotes:notes},AbortSignal.any([controller.signal,AbortSignal.timeout(50000)]),text=>emit({text}));
    emit({done:true,...result});res.end();
   }finally{res.off('close',cancel);}
  }catch(error){if(res.destroyed)return;const message=error instanceof HttpError?error.message:'Online AI is unavailable. Try again shortly.';if(res.headersSent){res.end(JSON.stringify({error:message})+'\n');}else send(error instanceof HttpError?error.status:503,{error:message});}
  finally{if(ownsRun)running.delete(fingerprint);}
 };
}
export default createCloudHandler();
