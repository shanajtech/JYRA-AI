import {useSyncExternalStore} from 'react';
export type CompanionPhase='Ready'|'Listening'|'Transcribing'|'Thinking'|'Speaking';
let snapshot:{phase:CompanionPhase;paused:boolean}={phase:'Ready',paused:false};
const listeners=new Set<()=>void>();
function change(next:typeof snapshot){if(next.phase===snapshot.phase&&next.paused===snapshot.paused)return;snapshot=next;listeners.forEach(f=>f());}
export function companionPhase(phase:CompanionPhase){change({phase,paused:phase==='Ready'?snapshot.paused:false});}
export function pauseCompanion(){change({phase:'Ready',paused:true});window.dispatchEvent(new Event('zyra-stop-all'));}
export function useCompanionState(){return useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f);},()=>snapshot);}
