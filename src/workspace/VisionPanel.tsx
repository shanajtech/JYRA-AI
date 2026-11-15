import {portrait} from '../figma/assets';
import {useEffect,useRef,useState} from 'react';
import {request} from '../backend';
import {useWelcomeVoice} from '../useWelcomeVoice';
import {deviceState} from './devices';
import {confidentMatch} from './faceMatching';
import {createFaceEngine} from './faceEngine';
import type {Person,Preferences} from './store';
import FigmaIcon from '../figma/FigmaIcon';
import type Human from '@vladmandic/human';
export default function VisionPanel({people,p}:{people:Person[];p:Preferences}){
 const camera=useRef<HTMLVideoElement>(null),screen=useRef<HTMLVideoElement>(null),streams=useRef<{camera:MediaStream|null;screen:MediaStream|null}>({camera:null,screen:null});
 const [cameraOn,setCameraOn]=useState(false),[screenOn,setScreenOn]=useState(false),[matching,setMatching]=useState(false),[message,setMessage]=useState('Camera and screen are off.'),[error,setError]=useState(''),[events,setEvents]=useState<string[]>([]);
 const voice=useWelcomeVoice(),generation=useRef(0),alive=useRef(true),acquiring=useRef(new Set<string>());
 const [checking,setChecking]=useState(false);
 function off(kind:'camera'|'screen'){streams.current[kind]?.getTracks().forEach(t=>t.stop());streams.current[kind]=null;deviceState(kind,false);if(kind==='camera'){setCameraOn(false);setMatching(false);generation.current++;voice.stop();}else setScreenOn(false);const target=kind==='camera'?camera.current:screen.current;if(target)target.srcObject=null;}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;for(const kind of ['camera','screen'] as const){streams.current[kind]?.getTracks().forEach(t=>t.stop());deviceState(kind,false);}};},[]);
 useEffect(()=>{const stop=()=>{off('camera');off('screen');};window.addEventListener('zyra-stop-all',stop);return()=>window.removeEventListener('zyra-stop-all',stop);},[]);
 async function start(kind:'camera'|'screen'){
  if(acquiring.current.has(kind))return;acquiring.current.add(kind);
  setError('');try{
   if(p.capabilities?.[kind]===false)throw new Error('This capability is off. Enable it in Security & permissions first.');
   if(!navigator.mediaDevices)throw new Error('Use localhost or HTTPS in a browser with media support.');
   const stream=kind==='camera'?await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   if(!alive.current){stream.getTracks().forEach(t=>t.stop());return;}streams.current[kind]=stream;const target=kind==='camera'?camera.current:screen.current;if(target){target.srcObject=stream;await target.play();}
   stream.getVideoTracks()[0].onended=()=>off(kind);deviceState(kind,true);if(kind==='camera')setCameraOn(true);else setScreenOn(true);setMessage(kind==='camera'?'Camera preview is live on this device.':'Screen preview is live on this device.');setEvents(old=>[new Date().toLocaleTimeString()+' · '+kind+' session started',...old].slice(0,8));
  }catch(e){off(kind);setError((e as Error).message||'Access was not granted.');}finally{acquiring.current.delete(kind);}
 }
 async function recognize(){
  if(matching){generation.current++;setMatching(false);voice.stop();setMessage('Face matching stopped. Camera preview remains on.');return;}
  const run=++generation.current;setMatching(true);setError('');setMessage('Loading local face models and saved photo profiles…');
  let human:Human|undefined;
  try{
   human=await createFaceEngine();const references:{name:string;embedding:number[]}[]=[];
   for(const person of people.filter(person=>person.greet))for(const photo of person.photos){
    if(run!==generation.current)return;const img=new Image();img.src=photo;await img.decode();const result=await human.detect(img);
    if(result.face.length===1&&result.face[0].embedding?.length)references.push({name:person.name,embedding:result.face[0].embedding});
   }
   if(!references.length)throw new Error('No clear single-face photo found. Add a consented photo and enable that person’s greeting preference.');
   const streak=new Map<string,number>(),greeted=new Map<string,number>();setMessage('Local matching active. A possible match must repeat before a greeting.');
   while(run===generation.current&&alive.current&&streams.current.camera){
    const video=camera.current;if(!video||video.readyState<2){await new Promise(r=>setTimeout(r,1000));continue;}
    const result=await human.detect(video),present=new Set<string>();
    for(const face of result.face){if(!face.embedding?.length)continue;const match=confidentMatch(references.map(ref=>({name:ref.name,score:human!.match.similarity(face.embedding!,ref.embedding)})));if(match)present.add(match.name);}
    for(const name of streak.keys())if(!present.has(name))streak.delete(name);
    for(const name of present){const count=(streak.get(name)||0)+1;streak.set(name,count);if(count>=3&&Date.now()-(greeted.get(name)||0)>600000){
     greeted.set(name,Date.now());setMessage(`Possible match: ${name}. This is a greeting aid, not identity verification.`);setEvents(old=>[new Date().toLocaleTimeString()+' · possible match: '+name,...old].slice(0,8));
     const greeting=await request<{audio:string}>('/speech/synthesize','POST',{text:`Hi ${name}. It is nice to see you. How are you today?`,profile:p.profile},AbortSignal.timeout(45000));if(run===generation.current)await voice.play(greeting.audio,p.profile);
    }}
    if(!present.size)setMessage(result.face.length?'No confident familiar-person match.':'Looking for a familiar person…');
    await new Promise(r=>setTimeout(r,1800));
   }
  }catch(e){if(run===generation.current){setError((e as Error).message);setMatching(false);}}
  finally{human?.models.reset();}
 }
 async function testModels(){setChecking(true);setError('');let engine:Human|undefined;try{engine=await createFaceEngine();const image=new Image();image.src=portrait;await image.decode();const result=await engine.detect(image),embedding=result.face[0]?.embedding;if(!embedding?.length)throw new Error('Models loaded but no usable face was detected in the demo portrait.');setMessage(`Local model test passed: ${result.face.length} demo face detected, ${embedding.length} descriptor values. Camera was not used.`);}catch(e){setError((e as Error).message);}finally{engine?.models.reset();setChecking(false);}}
 return <><div className="fg-sharing-indicator"><FigmaIcon name="eye" screen="4:16"/><span>{screenOn?'Sharing: selected screen or window':cameraOn?'Camera preview is active':'Nothing is being shared'}</span><small>{screenOn||cameraOn?'Preview stays on this device':'Camera and screen are off'}</small></div><div className="fg-vision-grid"><div><section className="fg-card fg-window-preview"><div className="fg-card-title"><h3>{screenOn?'Your selected screen':cameraOn?'Your camera':'Your shared view'}</h3><small>Selected preview</small></div><div className="fg-video-stage"><video ref={screen} muted playsInline hidden={!screenOn}/><video ref={camera} muted playsInline hidden={!cameraOn||screenOn}/>{!screenOn&&!cameraOn&&<><FigmaIcon name="eye" screen="4:16"/><h2>Nothing shared yet.</h2><p>Choose a window or camera to begin.</p></>}</div></section><section className="fg-card fg-vision-question"><h3>Visible by choice.</h3><p role="status">{message}</p><small>Screen preview is not analyzed or uploaded.</small></section></div><aside className="fg-card fg-sharing-controls"><h2>Sharing controls</h2><small>SCREEN</small><p>{screenOn?'Your selected screen or window':'No screen shared'}</p><button className="fg-secondary" onClick={()=>screenOn?off('screen'):void start('screen')}>{screenOn?'Stop sharing':'Share a window'}</button><hr/><div className="fg-control-heading"><FigmaIcon name="camera" screen="4:16"/><h3>Camera is {cameraOn?'on':'off'}</h3></div><p>Built-in webcam<br/>{cameraOn?'Preview stays on this device.':'Your camera isn’t being accessed.'}</p><button className="fg-secondary" onClick={()=>cameraOn?off('camera'):void start('camera')}>{cameraOn?'Stop camera':'Review camera access'}</button><FigmaIcon name="shield" screen="4:16"/><h2>Visible by choice.</h2><p>Stop sharing at any time.<br/>JYRA cannot turn on your camera<br/>without your permission.</p><details className="fg-details"><summary>Consented photo matching</summary><p>Use only with the permission of the people in the camera view. Matching may be wrong; it is not sign-in verification.</p><button className="fg-secondary" disabled={!cameraOn||checking} onClick={()=>void recognize()}>{matching?'Stop face matching':'Enable photo matching'}</button><button className="fg-secondary" disabled={matching||checking} onClick={()=>void testModels()}>{checking?'Testing local models…':'Test local face models'}</button></details></aside></div>{error&&<div className="fg-feedback" role="alert">{error}</div>}<details className="fg-details"><summary>Session activity</summary>{events.length?events.map((e,i)=><p key={i}>{e}</p>):<p>No camera or screen sessions started.</p>}</details></>;
}
