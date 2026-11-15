import {browserReminderPath,browserReminderRequest} from './services/browserReminderBridge.ts';
import {cloudKey} from './cloud.ts';
import {publicPreview,previewMessage} from './deployment.ts';
import {useSyncExternalStore} from 'react';
export interface LocalUser{id:string;name:string;email:string|null;demo:boolean}
interface Snapshot{status:'starting'|'online'|'offline';user:LocalUser|null;pending:number;error:string;revision:number}
let snapshot:Snapshot={status:'starting',user:null,pending:0,error:'',revision:0};
let documents:Record<string,{value:unknown;version:number}>={};
let epoch=0;
const listeners=new Set<()=>void>();
const queues=new Map<string,Promise<void>>();
const blocked=new Set<string>();
let initialization:Promise<void>|null=null;
const notify=()=>listeners.forEach(listener=>listener());
function patch(change:Partial<Snapshot>){snapshot={...snapshot,...change};notify();}
export function useBackend(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>snapshot);}
export async function request<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 if(publicPreview){if(browserReminderPath(path))return await browserReminderRequest(path,method,body) as T;throw new Error(previewMessage);}
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:signal||AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>({error:'Local backend is unavailable.'}));
 if(!response.ok)throw new Error(result.error||'Local request failed.');
 return result;
}
async function activate(user:LocalUser|null){
 epoch++;documents={};blocked.clear();queues.clear();
 if(user){const result=await request<{state:typeof documents}>('/state');documents=result.state;}
 patch({status:'online',user,pending:0,error:'',revision:snapshot.revision+1});
}
export function initializeBackend(){
 if(publicPreview){patch({status:'offline',user:null,error:''});return Promise.resolve();}
 if(!initialization)initialization=(async()=>{try{const result=await request<{user:LocalUser|null}>('/session');await activate(result.user);}catch{patch({status:'offline',user:null,error:''});}})();
 return initialization;
}
export function backendValue<T>(key:string,fallback:T):T{
 if(snapshot.user){const doc=documents[key.replace('zyra.','')];return doc?doc.value as T:fallback;}
 try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}
}
export function cacheKey(key:string){return snapshot.user?`zyra.cache.${snapshot.user.id}.${key}`:key;}
export function saveToBackend(key:string,value:unknown){
 if(!snapshot.user)return;
 const collection=key.replace('zyra.',''),generation=epoch;
 if(blocked.has(collection)){patch({error:'This collection has an unresolved save error. Reload before trying again.'});return;}
 const previous=queues.get(collection)||Promise.resolve();
 const version=documents[collection]?.version||0;
 documents[collection]={value,version};
 patch({pending:snapshot.pending+1,revision:snapshot.revision+1});
 const job=previous.then(async()=>{
  if(generation!==epoch||blocked.has(collection))return;
  const result=await request<{version:number}>(`/state/${collection}`,'PUT',{value,version:documents[collection]?.version||0});
  if(generation===epoch)documents[collection]={value:documents[collection]?.value??value,version:result.version};
 }).catch(error=>{if(generation===epoch){blocked.add(collection);patch({error:(error as Error).message+' Your local draft is retained in this browser.'});}}).finally(()=>{if(generation===epoch)patch({pending:Math.max(0,snapshot.pending-1)});});
 queues.set(collection,job);
}
export async function flushSaves(){await Promise.all(queues.values());}
export async function signIn(details:{email:string;password:string;remember:boolean}){
 await flushSaves();const result=await request<{user:LocalUser}>('/auth/login','POST',details);await activate(result.user);return result.user;
}
export async function signUp(details:{name:string;email:string;password:string}){
 await flushSaves();const result=await request<{user:LocalUser;recoveryCode:string}>('/auth/signup','POST',details);await activate(result.user);return {...result.user,recoveryCode:result.recoveryCode};
}
export async function startDemo(){
 await flushSaves();const result=await request<{user:LocalUser}>('/auth/demo','POST',{});await activate(result.user);
 // Only the demo imports old browser-demo data. Real accounts never import it.
 for(const collection of ['preferences','tasks','members','alarms','notes','people'])if(!documents[collection]){
  const raw=localStorage.getItem('zyra.'+collection);if(raw){try{saveToBackend('zyra.'+collection,JSON.parse(raw));}catch{/* Invalid old demo values are left untouched. */}}
 }
 await flushSaves();return result.user;
}
export async function signOut(){await flushSaves();try{await request('/auth/logout','POST',{});await activate(null);}catch(error){patch({error:'Could not sign out. Retry when the local service is available.'});throw error;}}
export function currentBackend(){return snapshot;}

export async function streamChat(body:unknown,signal:AbortSignal,onText:(text:string)=>void,context?:{language:string;privateSession:boolean;savedNotes:unknown[]}):Promise<{answer:string}>{
 const key=publicPreview?cloudKey():'';if(publicPreview&&!key)throw new Error('Connect online AI before sending a message.');
 const response=await fetch(publicPreview?'/api/cloud/chat':'/api/chat/stream',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(publicPreview?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify(publicPreview?{...(body as object),...context,action:'chat'}:body),signal});
 if(!response.ok){const data=await response.json();throw new Error(data.error||'Chat unavailable.');}
 if(!response.body)throw new Error('Chat response is missing.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',answer='',complete=false;
 try{while(true){const {value,done}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);if(!line.trim())continue;const data=JSON.parse(line);if(data.error)throw new Error(data.error);if(typeof data.text==='string')onText(data.text);if(data.done){answer=data.answer;complete=true;}}if(done)break;}}finally{reader.releaseLock();}
 if(!complete)throw new Error('The reply was interrupted. Please try again.');return {answer};
}
