import {useSyncExternalStore} from 'react';
let state={camera:false,screen:false,microphone:false};
const listeners=new Set<()=>void>();
export function deviceState(key:keyof typeof state,value:boolean){state={...state,[key]:value};listeners.forEach(f=>f());}
export function useDevices(){return useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f);},()=>state);}
