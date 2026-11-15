import {useSyncExternalStore} from 'react';
let key='';
const listeners=new Set<()=>void>();
export function cloudKey(){return key;}
export function disconnectCloud(){key='';listeners.forEach(f=>f());window.dispatchEvent(new Event('zyra-stop-all'));}
export function useCloudConnection(){return useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f);},()=>!!key);}
export async function connectCloud(value:string){
 const candidate=value.trim();if(!/^gsk_[A-Za-z0-9_-]{20,200}$/.test(candidate))throw new Error('Enter a valid Groq API key.');
 const response=await fetch('/api/cloud/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${candidate}`},body:JSON.stringify({action:'verify'}),signal:AbortSignal.timeout(15000)});
 const data=await response.json().catch(()=>({error:'The online connection service is unavailable.'}));if(!response.ok||!data.ready)throw new Error(data.error||'Could not connect.');key=candidate;listeners.forEach(f=>f());
}
