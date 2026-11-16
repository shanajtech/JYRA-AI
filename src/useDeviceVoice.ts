import {useCallback,useEffect,useRef,useState} from 'react';
import {selectDeviceVoice,spokenText} from './services/device-voice.mjs';
export function useDeviceVoice(){
 const [speaking,setSpeaking]=useState(false),[error,setError]=useState('');
 const current=useRef<SpeechSynthesisUtterance|null>(null),generation=useRef(0);
 const stop=useCallback(()=>{generation.current++;if(current.current&&'speechSynthesis' in window)window.speechSynthesis.cancel();current.current=null;setSpeaking(false);},[]);
 const play=useCallback(async(text:string)=>{
  stop();setError('');const run=generation.current;
  if(!('speechSynthesis' in window)){setError('This browser has no device voice. Text chat remains available.');return;}
  const synth=window.speechSynthesis;
  if(!synth.getVoices().length)await new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',finish);resolve();};const timer=setTimeout(finish,1500);synth.addEventListener('voiceschanged',finish,{once:true});});
  if(run!==generation.current)return;
  const voice=selectDeviceVoice(synth.getVoices(),text);
  if(!voice){setError(/[\u0980-\u09ff]/.test(text)?'No local Bengali female voice is available on this device. Bengali text chat still works.':'No matching local female voice is available on this device. Text chat still works.');return;}
  const utterance=new SpeechSynthesisUtterance(spokenText(text));current.current=utterance;utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.95;
  utterance.onstart=()=>{if(run===generation.current)setSpeaking(true);};
  utterance.onend=()=>{if(run===generation.current){current.current=null;setSpeaking(false);}};
  utterance.onerror=event=>{if(run===generation.current){current.current=null;setSpeaking(false);if(!['canceled','interrupted'].includes(event.error))setError('Device voice could not play. Press Listen to retry.');}};
  synth.speak(utterance);
 },[stop]);
 useEffect(()=>{window.addEventListener('zyra-stop-all',stop);return()=>{window.removeEventListener('zyra-stop-all',stop);stop();};},[stop]);
 return {speaking,error,play,stop};
}
