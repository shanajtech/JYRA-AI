import {useEffect,useRef,useState} from 'react';
import {backendValue,request} from '../backend';
import {deviceState} from './devices';
function wave(samples:Float32Array,rate:number){
 const length=Math.min(320000,Math.floor(samples.length*16000/rate)),buffer=new ArrayBuffer(44+length*2),v=new DataView(buffer);
 const str=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*2,true);
 for(let i=0;i<length;i++){const start=Math.floor(i*rate/16000),end=Math.max(start+1,Math.floor((i+1)*rate/16000));let sum=0;for(let j=start;j<end&&j<samples.length;j++)sum+=samples[j];const n=Math.max(-1,Math.min(1,sum/(end-start)));v.setInt16(44+i*2,n<0?n*32768:n*32767,true);}
 let encoded='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(encoded);
}
export function useRecorder(onText:(text:string)=>void,language:string){
 const [recording,setRecording]=useState(false),[processing,setProcessing]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const [blocked,setBlocked]=useState(false);
 const acquiring=useRef(false);
 const cleanup=useRef<null|(()=>void)>(null),abort=useRef<AbortController|null>(null),generation=useRef(0);
 useEffect(()=>{const cancel=()=>{generation.current++;cleanup.current?.();abort.current?.abort();acquiring.current=false;setRecording(false);setProcessing(false);setStarting(false);};window.addEventListener('zyra-stop-all',cancel);return()=>{window.removeEventListener('zyra-stop-all',cancel);generation.current++;cleanup.current?.();abort.current?.abort();};},[]);
 async function start(){
  if(recording||processing||acquiring.current)return;acquiring.current=true;setStarting(true);setError('');setBlocked(false);const epoch=++generation.current;let acquired:MediaStream|null=null;
  try{
   if(backendValue<{capabilities?:{microphone:boolean}}>('zyra.preferences',{}).capabilities?.microphone===false)throw new Error('Microphone is off. Enable it in Security & permissions first.');
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs localhost or HTTPS in a supported browser.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true},video:false});
   acquired=stream;
   if(epoch!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
   const context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1),mute=context.createGain();mute.gain.value=0;
   const chunks:Float32Array[]=[];let size=0;processor.onaudioprocess=e=>{if(size<context.sampleRate*20){const data=e.inputBuffer.getChannelData(0).slice();chunks.push(data);size+=data.length;}};
   source.connect(processor);processor.connect(mute);mute.connect(context.destination);setRecording(true);deviceState('microphone',true);
   const timer=setTimeout(()=>void finish(),20000);
   cleanup.current=()=>{clearTimeout(timer);processor.disconnect();source.disconnect();mute.disconnect();stream.getTracks().forEach(t=>t.stop());void context.close();deviceState('microphone',false);cleanup.current=null;};
   async function finish(){
    if(!cleanup.current)return;cleanup.current();setRecording(false);if(epoch!==generation.current)return;setProcessing(true);
    try{const all=new Float32Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}if(size<context.sampleRate*.1)throw new Error('Record at least a short sentence.');
     const c=new AbortController();abort.current=c;const r=await request<{text:string}>('/speech/transcribe','POST',{audio:wave(all,context.sampleRate),language:language==='বাংলা'?'bn':language==='Auto'?'auto':'en'},AbortSignal.any([c.signal,AbortSignal.timeout(95000)]));if(epoch===generation.current){if(r.text)onText(r.text);else setError('No speech detected. Try again.');}
    }catch(e){if(epoch===generation.current)setError((e as Error).message);}finally{if(epoch===generation.current)setProcessing(false);}
   }
   stop.current=finish;
  }catch(e){acquired?.getTracks().forEach(t=>t.stop());if(epoch===generation.current){setError((e as Error).message);setBlocked(['NotAllowedError','SecurityError'].includes((e as Error).name));setRecording(false);}deviceState('microphone',false);}finally{acquiring.current=false;if(epoch===generation.current)setStarting(false);}
 }
 const stop=useRef<()=>void>(()=>{});
 return {start,stop:()=>stop.current(),recording,processing,starting,error,blocked,dismissBlocked:()=>{setBlocked(false);setError('');}};
}

