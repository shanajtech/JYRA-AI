import CloudConnection from './CloudConnection';
import {useCloudConnection} from '../cloud';
import './cloud-connection.css';
import {companionPhase} from './companionState';
import {developerAnswer} from '../identity';
import {publicPreview} from '../deployment';
import {useEffect,useRef,useState} from 'react';
import {currentBackend,flushSaves,request,streamChat} from '../backend';

import AnimatedAvatar from '../AnimatedAvatar';
import {useWelcomeVoice} from '../useWelcomeVoice';
import {useRecorder} from './useRecorder';
import {uid,useLocalData} from './store';
import type {Preferences,Note} from './store';

import FigmaIcon from '../figma/FigmaIcon';
import FigmaRecovery from '../figma/FigmaRecovery';
import MicrophoneBlockedDialog from '../figma/MicrophoneBlockedDialog';
import './conversation-layout.css';
type Message={role:'user'|'assistant';content:string};
type Conversation={id:string;title:string;updatedAt:number;messages:Message[]};
export default function ChatPanel({p,initialDraft='',onReviewPermissions}:{p:Preferences;initialDraft?:string;onReviewPermissions?:()=>void}){
 const [notes,saveNotes,noteSaveError]=useLocalData<Note[]>('zyra.notes',[]);
 const [memoryStatus,setMemoryStatus]=useState('');
 const [history,saveHistory,saveError]=useLocalData<Conversation[]>('zyra.conversations',[]);
 const [messages,setMessages]=useState<Message[]>([]),[active,setActive]=useState<string|null>(null),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('Checking local AI…'),[spoken,setSpoken]=useState(true);
 const controller=useRef<AbortController|null>(null),log=useRef<HTMLDivElement>(null),voice=useWelcomeVoice(),voiceRun=useRef(0);
 const recorder=useRecorder(text=>setDraft(old=>(old?old+' ':'')+text),p.language);
 const [recovery,setRecovery]=useState(false),[cloudOpen,setCloudOpen]=useState(false);const cloudConnected=useCloudConnection();
 useEffect(()=>{companionPhase(recorder.recording?'Listening':recorder.processing?'Transcribing':busy?'Thinking':voice.speaking?'Speaking':'Ready');},[recorder.recording,recorder.processing,busy,voice.speaking]);
 useEffect(()=>{const pause=()=>{voiceRun.current++;voice.stop();controller.current?.abort();};window.addEventListener('zyra-stop-all',pause);return()=>{window.removeEventListener('zyra-stop-all',pause);companionPhase('Ready');};},[]);

 useEffect(()=>{if(initialDraft)setDraft(initialDraft);},[initialDraft]);
 useEffect(()=>{if(publicPreview){setStatus('Online AI uses Groq after you connect. History and Memory are stored in this browser.');return;}let alive=true;void request<{ready:boolean;message:string}>('/ai/status').then(r=>{if(alive)setStatus(r.message);}).catch(()=>{if(alive)setStatus('Local backend unavailable');});return()=>{alive=false;voiceRun.current++;controller.current?.abort();};},[]);
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'smooth'});},[messages,busy]);
 useEffect(()=>{setActive(null);setMessages([]);},[p.privateSession]);
 function mute(){voiceRun.current++;voice.stop();}
 async function read(text:string){mute();setError('');if(developerAnswer(text,p.language)){await voice.play(/[\u0980-\u09ff]/.test(text)?'developer-bn':'developer-en',p.profile);return;}const run=voiceRun.current;try{const r=await request<{audio:string}>('/speech/synthesize','POST',{text:text.slice(0,2000),profile:p.profile,online:!!p.onlineVoice},AbortSignal.timeout(45000));if(run===voiceRun.current)await voice.play(r.audio,p.profile);}catch(e){if(run===voiceRun.current)setError((e as Error).message);}}
 async function send(){
  if(busy||recorder.recording||!draft.trim())return;if(publicPreview&&!cloudConnected&&!developerAnswer(draft,p.language)){setCloudOpen(true);return;}mute();
  const next:Message[]=[...messages,{role:'user',content:draft.trim()}];setMessages(next);setDraft('');setError('');setBusy(true);
  const c=new AbortController();controller.current=c;
  try{await flushSaves();const identity=developerAnswer(next[next.length-1].content,p.language);const r=identity?{answer:identity}:await streamChat({messages:next.slice(-12)},AbortSignal.any([c.signal,AbortSignal.timeout(125000)]),text=>setMessages([...next,{role:'assistant',content:text}]),{language:p.language,privateSession:!!p.privateSession,savedNotes:p.privateSession?[]:notes});const complete:Message[]=[...next,{role:'assistant',content:r.answer.slice(0,4000)}];setMessages(complete);setStatus(publicPreview?'Groq online AI · History and Memory stay in this browser':'Local AI · replies stay on this computer');
   if(!p.privateSession){const id=active||uid();setActive(id);saveHistory([{id,title:complete[0].content.slice(0,80),updatedAt:Date.now(),messages:complete.slice(-24)},...history.filter(h=>h.id!==id)].slice(0,50));}
   if(spoken){if(identity)void voice.play(/[\u0980-\u09ff]/.test(r.answer)?'developer-bn':'developer-en',p.profile);else if(!publicPreview)void read(r.answer);}
  }catch(e){if(!c.signal.aborted)setError((e as Error).message);}
  finally{setBusy(false);controller.current=null;}
 }
 if(recovery)return <FigmaRecovery onReturn={()=>{setRecovery(false);setError('');}} onRetry={()=>{setRecovery(false);setError('');void request<{ready:boolean;message:string}>('/ai/status').then(r=>setStatus(r.message)).catch(()=>setError('Local backend unavailable. Start the local service and try again.'));}}/>;
 return <div className="fg-conversation">{recorder.blocked&&<MicrophoneBlockedDialog onClose={recorder.dismissBlocked} onReview={()=>{recorder.dismissBlocked();onReviewPermissions?.();}} onText={()=>{recorder.dismissBlocked();requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('[aria-label="Message companion"]')?.focus());}}/>}
  {publicPreview&&<CloudConnection open={cloudOpen} onOpen={()=>setCloudOpen(true)} onClose={()=>setCloudOpen(false)}/>}<h1>Let’s make tomorrow lighter.</h1><small className="fg-conversation-date">TODAY / PERSONAL CONVERSATION</small>
  <div className="fg-conversation-grid"><section className="fg-conversation-stream" ref={log} aria-live="polite">
   {!messages.length&&<div className="fg-assistant-message"><small>JYRA</small><p>{p.language==='বাংলা'?'হাই, আমি জায়রা। আজ কীভাবে তোমাকে সাহায্য করতে পারি?':'Hi, I’m JYRA. What would make today feel easier?'}</p></div>}
   {messages.map((m,i)=><article key={i} className={'fg-message '+(m.role==='user'?'fg-user-message':'fg-assistant-message')}>{m.role==='assistant'&&<small>JYRA</small>}<p>{m.content}</p>{m.role==='user'&&!p.privateSession&&<button className="fg-text" disabled={busy} onClick={async()=>{setMemoryStatus('');if(notes.some(n=>n.body===m.content)){setMemoryStatus('Already in Memory.');return;}if(saveNotes([{id:uid(),title:m.content.slice(0,80),body:m.content.slice(0,2000)},...notes])){await flushSaves();setMemoryStatus(currentBackend().error||(publicPreview?'Memory saved in this browser. Available in new conversations; not synced to other devices.':'Memory saved. Available in new conversations.'));}}}>Remember this</button>}{m.role==='assistant'&&<button className="fg-text" disabled={publicPreview&&!developerAnswer(m.content,p.language)} title={publicPreview?'Online voice is not connected; developer introduction audio remains available':undefined} onClick={()=>void read(m.content)} aria-label={`Read reply ${i+1}`}>▷ Listen</button>}</article>)}
   {memoryStatus&&<p role="status">{memoryStatus}</p>}{busy&&<p role="status">JYRA is thinking…</p>}{recorder.starting&&<p role="status">Waiting for microphone permission…</p>}{recorder.recording&&<p role="status">Listening · press Stop when you’re ready.</p>}{recorder.processing&&<p role="status">Transcribing on this computer…</p>}{(error||saveError||noteSaveError||voice.voiceError||recorder.error)&&<p className="fg-feedback" role="alert">{error||saveError||voice.voiceError||recorder.error}<button type='button' className='fg-text' onClick={()=>setRecovery(true)}>Connection help</button></p>}
   <details className="fg-chat-history"><summary>Conversation history</summary><p>{status}</p>{!p.privateSession&&history.map(h=><button className="fg-secondary" key={h.id} disabled={busy||recorder.recording} onClick={()=>{mute();setActive(h.id);setMessages(h.messages);setError('');}}>{h.title}</button>)}<button className="fg-secondary" disabled={busy||recorder.recording} onClick={()=>{mute();setActive(null);setMessages([]);setDraft('');setMemoryStatus('');setError('');}}>New conversation</button><label><input type="checkbox" checked={spoken} onChange={e=>{setSpoken(e.target.checked);if(!e.target.checked)mute();}}/> Read replies aloud</label></details>
  </section><aside className="fg-card fg-voice-panel"><div className="fg-voice-portrait"><AnimatedAvatar profile="female" level={voice.level} speaking={voice.speaking}/></div><h2>{recorder.recording?'I’m listening.':'A familiar voice.'}</h2><p>{publicPreview?'Online text chat is available after connecting Groq. Voice is not connected here.':voice.speaking?'JYRA is speaking.':recorder.recording?'Listening. Take your time.':'Voice is paused. Text stays available.'}</p><button className="fg-secondary" disabled={publicPreview||busy||recorder.processing||recorder.starting} onClick={()=>{if(recorder.recording)recorder.stop();else if(voice.speaking)mute();else void read(p.language==='বাংলা'?'হাই, আমি জায়রা। তুমি কী নিয়ে কথা বলতে চাও?':'Hi, I am JYRA. What would you like to talk about?');}}>{recorder.recording?'Mute microphone':voice.speaking?'Pause voice':'Start voice'}</button></aside></div>
  <form className="fg-home-composer" onSubmit={e=>{e.preventDefault();void send();}}><button type="button" aria-label="New conversation" disabled={busy||recorder.recording} onClick={()=>{mute();setActive(null);setMessages([]);setDraft('');setMemoryStatus('');}}><FigmaIcon name="plus" screen="4:11"/></button><label><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Tell JYRA what you’d like to do next…" aria-label="Message companion" maxLength={2000} disabled={busy||recorder.recording||recorder.processing}/><small>Personal conversation · Nothing shared with family</small></label><button type="button" className="fg-round" aria-label={recorder.recording?'Stop recording':'Record a voice message'} disabled={publicPreview||busy||recorder.processing||recorder.starting} onClick={()=>{mute();if(recorder.recording)recorder.stop();else void recorder.start();}}><FigmaIcon name="mic" screen="4:11"/></button>{busy?<button type="button" className="fg-send" onClick={()=>controller.current?.abort()}>Stop</button>:<button className="fg-send" aria-label="Send message" disabled={!draft.trim()||recorder.recording||recorder.processing}><FigmaIcon name="arrow" screen="4:11"/></button>}</form>
 </div>;
}
