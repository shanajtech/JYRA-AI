import {createGroqAI} from '../../server/ai.mjs';
import {HttpError,validateCollection} from '../../server/validation.mjs';
import {createLegacyCloudHandler} from '../../server/cloud/legacy-chat.mjs';
import {COOKIE,createCloudServices,send,originCheck,readJSON,safeError} from '../../server/cloud/services.mjs';
export const config={maxDuration:60};
export function createCloudHandler({env=process.env,fetcher=fetch,clock=Date.now,services=createCloudServices({env,fetcher,clock})}={}){
 if(env.ZYRA_ALLOW_BYOK==='true'&&!env.GROQ_API_KEY)return createLegacyCloudHandler({fetcher,clock});
 let providerReadyUntil=0;
 return async function handler(req,res){let controller;res.setHeader('Cache-Control','no-store');
  try{if(req.method==='GET')return send(res,200,{mode:'shared',ready:services.config.ready,model:services.config.model,dailyLimit:services.config.dailyLimit,message:services.config.ready?'Online text chat is configured.':'The owner is preparing online AI. You do not need an API key.'});
   if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Use GET or POST.'});}originCheck(req);const body=await readJSON(req);
   if(Object.keys(body).some(k=>!['action','messages','language','privateSession','savedNotes'].includes(k))||!['verify','chat','disconnect'].includes(body.action))throw new HttpError(400,'Invalid conversation.');
   if(body.action==='disconnect'){res.setHeader('Set-Cookie',`${COOKIE}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return send(res,200,{ok:true});}
   if(!services.config.ready)throw new HttpError(503,'Online AI is being prepared by the owner. You do not need to provide an API key.');
   if(body.action==='verify'){const user=services.session(req,res,true);await services.consume(req,user,'session');if(clock()>providerReadyUntil){const upstream=await fetcher('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`},redirect:'error',signal:AbortSignal.timeout(10000)});if(!upstream.ok)throw new HttpError(503,'Online AI configuration needs attention. Please contact support.');const data=await upstream.json();if(!data.data?.some(model=>model.id===services.config.model))throw new HttpError(503,'The online AI model is unavailable. Please contact support.');providerReadyUntil=clock()+600000;}return send(res,200,{ready:true,mode:'shared',provider:'Groq',model:services.config.model,dailyLimit:services.config.dailyLimit});}
   const user=services.session(req,res);if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>24||body.messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000)||body.messages.at(-1).role!=='user'||JSON.stringify(body.messages).length>20000)throw new HttpError(400,'Send a short conversation ending with your message.');
   if(body.language!==undefined&&!['English','বাংলা','Auto'].includes(body.language)||body.privateSession!==undefined&&typeof body.privateSession!=='boolean')throw new HttpError(400,'Invalid conversation settings.');
   const notes=body.privateSession?[]:validateCollection('notes',body.savedNotes||[]).slice(0,20),quota=await services.consume(req,user);res.setHeader('X-JYRA-Remaining',String(quota.remaining));
   controller=new AbortController();const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
   try{const ai=createGroqAI({key:env.GROQ_API_KEY,fetcher}),emit=value=>{if(res.destroyed)return;if(!res.headersSent){res.statusCode=200;res.setHeader('Content-Type','application/x-ndjson');res.setHeader('X-Content-Type-Options','nosniff');}res.write(JSON.stringify(value)+'\n');};const result=await ai.chat(user,{messages:body.messages},{language:body.language||'Auto',privateSession:!!body.privateSession,savedNotes:notes},AbortSignal.any([controller.signal,AbortSignal.timeout(50000)]),text=>emit({text}));emit({done:true,...result,remaining:quota.remaining});res.end();}finally{res.off('close',cancel);}
  }catch(error){safeError(res,error instanceof HttpError&&error.status===401&&controller?new HttpError(503,'Online AI configuration needs attention. Please contact support.'):error);}
 };
}
export default createCloudHandler();
