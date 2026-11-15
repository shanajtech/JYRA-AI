import {useEffect,useRef,useState} from 'react';
import {request} from '../backend';
import {useWelcomeVoice} from '../useWelcomeVoice';
import type {Preferences,Task} from './store';
type Reminder={id:string;date:string;time:string;attempt:number;lastAt:number};
export default function TaskReminders({p,tasks,saveTasks,sound}:{p:Preferences;tasks:Task[];saveTasks:(tasks:Task[])=>boolean;sound:boolean}){
 const [runs,setRuns]=useState<Reminder[]>([]),[error,setError]=useState(''),seen=useRef(new Set<string>()),voice=useWelcomeVoice(),sequence=useRef(0);
 useEffect(()=>{let active=true;const poll=async()=>{try{const r=await request<{runs:Reminder[]}>('/reminders');if(active)setRuns(r.runs);}catch{/* The main backend status already displays connection errors. */}};void poll();const t=setInterval(()=>void poll(),10000);return()=>{active=false;sequence.current++;clearInterval(t);};},[]);
 useEffect(()=>{const stop=()=>{sequence.current++;voice.stop();};window.addEventListener('zyra-stop-all',stop);return()=>window.removeEventListener('zyra-stop-all',stop);},[voice.stop]);
 async function speak(run:Reminder){const task=tasks.find(t=>t.id===run.id);if(!task)return;const seq=++sequence.current;try{const r=await request<{audio:string}>('/speech/synthesize','POST',{text:`Hi ${p.nickname||p.name||'friend'}. This is a reminder for ${task.title}. Would you like to work on it now, or snooze for fifteen minutes?`,profile:p.profile},AbortSignal.timeout(45000));if(seq===sequence.current)await voice.play(r.audio,p.profile);}catch{setError('Voice reminder could not play. The written reminder is still available.');}}
 useEffect(()=>{if(!sound)return;const run=runs.find(r=>!seen.current.has(r.id+r.lastAt));if(run){for(const r of runs)seen.current.add(r.id+r.lastAt);void speak(run);}},[runs,sound]);
 async function action(run:Reminder,action:'dismiss'|'snooze',done=false){if(done&&!saveTasks(tasks.map(t=>t.id===run.id?{...t,done:true}:t)))return;sequence.current++;voice.stop();try{await request('/reminders/action','POST',{...run,action});setRuns(old=>old.filter(r=>r.id!==run.id||r.time!==run.time));}catch(e){setError((e as Error).message);}}
 if(!runs.length||!p.proactive)return null;
 return <aside className="task-reminders panel" role="region" aria-label="Due task reminders"><h3>Time for your task</h3>{runs.slice(0,3).map(run=><div key={run.id+run.time}><p>{tasks.find(t=>t.id===run.id)?.title||'Saved task'} · {run.time}</p><button className="secondary" onClick={()=>void action(run,'dismiss',true)}>Mark done</button><button className="secondary" onClick={()=>void action(run,'snooze')}>Snooze 15 min</button><button className="text-button" onClick={()=>void action(run,'dismiss')}>Dismiss</button><button className="text-button" onClick={()=>void speak(run)}>Listen</button></div>)}{runs.length>3&&<small>And {runs.length-3} more due tasks.</small>}{error&&<p role="status">{error}</p>}</aside>;
}
