import { useEffect,useState } from 'react';
import {backendValue,cacheKey,saveToBackend,useBackend} from '../backend';
import type { CompanionId } from '../companionProfiles';
export interface Preferences { name:string; nickname:string; language:string; profile:CompanionId; proactive:boolean; quietStart:string; quietEnd:string; quality:string; onlineVoice?:boolean;privateSession?:boolean;memoryRetention?:string;sessionExpiry?:string;theme?:'Dark'|'Light';capabilities?:{microphone:boolean;camera:boolean;screen:boolean;computer:boolean} }
export interface Task { id:string; title:string; member:string; date:string; time:string; done:boolean; priority:string }
export interface Alarm { startDate?:string;once?:boolean;id:string; time:string; label:string; enabled:boolean; repeat:number;days?:string[];interval?:number;snooze?:number;language?:string }
export interface Person { id:string; name:string; photos:string[]; greet:boolean }
export interface Note { id:string; title:string; body:string }
export const defaults:Preferences={name:'',nickname:'',language:'English',profile:'female',proactive:true,quietStart:'22:00',quietEnd:'07:00',quality:'Balanced'};
export function useLocalData<T>(key:string,initial:T){
 const backend=useBackend();
 const scope=backend.user?.id||'browser';
 const [stored,setStored]=useState(()=>({scope,value:backendValue(key,initial)}));
 const value=stored.scope===scope?stored.value:backendValue(key,initial);
 useEffect(()=>{setStored({scope,value:backendValue(key,initial)});},[scope,key,backend.revision]);
 const [error,setError]=useState('');
 function save(next:T){try{localStorage.setItem(cacheKey(key),JSON.stringify(next));setError('');setStored({scope,value:next});saveToBackend(key,next);return true;}catch{setError('Could not save on this device. Storage may be full or unavailable.');return false;}}
 return [value,save,error||backend.error] as const;
}
export const uid=()=>crypto.randomUUID();
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
