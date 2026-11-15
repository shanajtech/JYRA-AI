import TaskReminders from './TaskReminders';
import {backendValue} from '../backend';
import {useDevices} from './devices';
import AlarmCenter from './AlarmCenter';
import ThemedSelect from './ThemedSelect';
import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import AnimatedAvatar from '../AnimatedAvatar';
import {companionProfiles} from '../companionProfiles';
import {useWelcomeVoice} from '../useWelcomeVoice';
import Icon from './Icon';
import ReferencePages from './ReferencePages';
import BackendStatus from '../BackendStatus';
import {localDate,uid,useLocalData} from './store';
import type {Alarm,Note,Person,Preferences,Task} from './store';

const pages=[['home','⌂','Home'],['chat','◇','AI Conversation'],['tasks','▣','Computer-Use Center'],['family','♧','Family Manager'],['planner','▦','Daily Planner'],['alarm','◷','Smart Alarm'],['people','♙','Familiar people'],['vision','◉','Vision Center'],['messages','✉','Messages Center'],['mobile','▯','Mobile Connection'],['memory','▤','Memory Center'],['security','⬡','Security Center'],['appearance','✦','Appearance Settings'],['help','?','Help Center']] as const;
type Page=typeof pages[number][0];
const titles=Object.fromEntries(pages.map(([id,,label])=>[id,label]));
export default function Dashboard({preferences:p,onPreferences,onSetup,onExit,onStart}:{preferences:Preferences;onPreferences:(p:Preferences)=>void;onSetup:()=>void;onExit:()=>void;onStart:()=>void}){
 const [page,setPage]=useState<Page>('home'),[status,setStatus]=useState(''),[soundReady,setSoundReady]=useState(false);
 const devices=useDevices();
 const [tasks,saveTasks,taskError]=useLocalData<Task[]>('zyra.tasks',[]);
 const [alarms,saveAlarms,alarmError]=useLocalData<Alarm[]>('zyra.alarms',[]);
 const [members,saveMembers,memberError]=useLocalData<string[]>('zyra.members',[]);
 const [notes,saveNotes,noteError]=useLocalData<Note[]>('zyra.notes',[]);
 const [people,savePeople,peopleError]=useLocalData<Person[]>('zyra.people',[]);

 const [consent,setConsent]=useState(false),[photos,setPhotos]=useState<string[]>([]),[uploading,setUploading]=useState(false);
 const [undo,setUndo]=useState<null|(()=>void)>(null);
 const files=useRef<HTMLInputElement>(null);
 const voice=useWelcomeVoice();
 useEffect(()=>{window.scrollTo(0,0);},[page]);
 const pending=tasks.filter(t=>!t.done);
 const nextTask=pending.filter(t=>t.date===localDate()).sort((a,b)=>a.time.localeCompare(b.time))[0];
 const greeting=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
 function navigate(next:Page){voice.stop();setStatus('');setUndo(null);setPage(next);}
 function notify(text:string){setStatus(text);}
 function formData(e:FormEvent<HTMLFormElement>){e.preventDefault();return new FormData(e.currentTarget);}
 function addTask(e:FormEvent<HTMLFormElement>){const d=formData(e);const title=String(d.get('title')||'').trim();if(!title)return;if(!saveTasks([...tasks,{id:uid(),title,member:String(d.get('member')||'Me'),date:String(d.get('date')||localDate()),time:String(d.get('time')||''),priority:String(d.get('priority')||'Normal'),done:false}]))return;e.currentTarget.reset();notify('Task saved locally; database sync status is shown above.');}
 function deleteTask(id:string){const previous=tasks;saveTasks(tasks.filter(t=>t.id!==id));setUndo(()=>()=>saveTasks(previous));notify('Task removed. You can undo this change.');}
 const taskList=(list:Task[])=><div className="task-list">{list.length?list.map(t=><div className={'task-row '+(t.done?'done':'')} key={t.id}><input aria-label={`Complete ${t.title}`} type="checkbox" checked={t.done} onChange={()=>saveTasks(tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><div><strong>{t.title}</strong><small>{t.member} · {t.date} {t.time} · {t.priority}</small></div><button className="icon-button" onClick={()=>deleteTask(t.id)} aria-label={`Remove ${t.title}`}>×</button></div>):<div className="empty">Nothing here yet. Add a task to begin.</div>}</div>;
 const taskForm=<form className="panel task-form" onSubmit={addTask}><h3>Add a task</h3><label>Task<input name="title" required maxLength={160} placeholder="What needs doing?"/></label><div className="two-columns"><label>Date<input type="date" name="date" defaultValue={localDate()} required/></label><label>Time<input type="time" name="time"/></label><label>For<ThemedSelect name="member"><option>Me</option>{members.map(m=><option key={m}>{m}</option>)}</ThemedSelect></label><label>Priority<ThemedSelect name="priority"><option>Normal</option><option>High</option><option>Low</option></ThemedSelect></label></div><button className="action">Save task</button></form>;
 async function loadPhotos(list:FileList|null){
   if(!list)return;setUploading(true);setPhotos([]);
   try{const selected=Array.from(list).slice(0,4);if(selected.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3_000_000))throw new Error('Choose JPG, PNG or WebP photos smaller than 3 MB each.');
    const result=await Promise.all(selected.map(file=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Invalid image.'));img.onload=()=>{const c=document.createElement('canvas');const ratio=Math.min(1,320/Math.max(img.width,img.height));c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.8));};img.src=String(reader.result);};reader.readAsDataURL(file);})));setPhotos(result);
   }catch(error){notify((error as Error).message);if(files.current)files.current.value='';}finally{setUploading(false);}
 }
 function exportData(){const blob=new Blob([JSON.stringify({preferences:p,tasks,alarms,members,notes,people,conversations:backendValue('zyra.conversations',[])},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='zyra-local-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <main className={'workspace reference-shell '+(p.theme==='Light'?'light-theme':'')} onSubmitCapture={()=>setUndo(null)}><aside className="sidebar"><a className="work-brand" href="#" onClick={e=>{e.preventDefault();navigate('home');}}><strong>JYRA</strong></a><small className="nav-label">Personal &amp; Family Companion</small><button className="start-nav-link" onClick={()=>{voice.stop();onStart();}} title="শুরু ও ব্যবহারবিধি" aria-label="শুরু ও ব্যবহারবিধি"><Icon name="book" size={18}/><span>শুরু ও ব্যবহারবিধি</span></button><nav>{pages.map(([id,,label])=><button key={id} aria-label={label} title={label} className={page===id?'active':''} onClick={()=>navigate(id)}><Icon name={id}/><span className="nav-text">{label}</span></button>)}</nav><div className="sidebar-bottom"><img src={companionProfiles[p.profile].image} alt="Your companion"/><span className="local-badge">Local profile</span><strong>{p.nickname||p.name||'Welcome'}</strong><button onClick={()=>{voice.stop();onExit();}}>Sign out</button></div></aside><section className="work-main"><div className="work-topbar"><button className="start-top-link" onClick={()=>{voice.stop();onStart();}}>শুরু ও ব্যবহারবিধি</button><BackendStatus/><div><span className="privacy-chip"><Icon name="vision" size={15}/> Camera {devices.camera?'on':'off'}</span><span className="privacy-chip"><Icon name="mic" size={15}/> Mic {devices.microphone?'on':'off'}</span>{devices.screen&&<span className="privacy-chip">Screen shared</span>}<button className="icon-button" aria-label="Toggle theme" onClick={()=>onPreferences({...p,theme:p.theme==='Light'?'Dark':'Light'})}><Icon name="moon" size={17}/></button><button className="icon-button" onClick={()=>navigate('appearance')} aria-label="Open settings">⚙</button></div></div><div className="work-content"><AlarmCenter p={p} onEnabled={setSoundReady}/><TaskReminders p={p} tasks={tasks} saveTasks={saveTasks} sound={soundReady}/><div className="page-heading"><div><small>YOUR EVERYDAY, A LITTLE EASIER</small><h1><Icon name={page} size={28}/>{page==='home'?`${greeting}, ${p.nickname||p.name||'friend'}.`:titles[page]}</h1></div><span className="demo-pill">Local AI · text chat</span></div>{(taskError||alarmError||memberError||noteError||peopleError||voice.voiceError||status)&&<div className="feedback" role="status">{taskError||alarmError||memberError||noteError||peopleError||voice.voiceError||status}{undo&&<button onClick={()=>{undo();setUndo(null);notify('Change undone.');}}>Undo</button>}</div>}
 {page==='home'&&<>
 <div className="home-grid">
  <section className="avatar-card panel">
   <div className="companion-card-head"><span>YOUR COMPANION</span><span>{companionProfiles[p.profile].name}</span></div>
   <div className="dashboard-avatar">{p.quality==='Lite'?<img src={companionProfiles[p.profile].image} alt={companionProfiles[p.profile].name}/>:<AnimatedAvatar level={voice.level} profile={p.profile} speaking={voice.speaking}/>}</div>
   <div className="hello-card"><h2>What would make today feel easier?</h2><p>A moment to think. A place to begin.</p><button className="secondary" onClick={()=>void voice.play('login',p.profile)}>▷ Hear {companionProfiles[p.profile].name}</button></div>
   <div className="avatar-dock"><button onClick={()=>navigate('planner')}>＋ New task</button><button className="talk-button" onClick={()=>navigate('chat')} aria-label="Open conversation"><Icon name="chat" size={19}/></button><button onClick={()=>navigate('alarm')}>◷ Set alarm</button></div>
  </section>
  <aside className="home-context">
   <section className="panel ahead-card"><small>A LITTLE AHEAD</small><h3>{nextTask?nextTask.title:'A little room for your day.'}</h3><p>{nextTask?`${nextTask.time||'Today'} · ${nextTask.member}`:'Keep your plans close, and take one thing at a time.'}</p><button className="action" onClick={()=>navigate('planner')}>{nextTask?'Review my plan':'Plan my day'}</button></section>
   <section className="panel"><div className="panel-title"><h3>Today, at a glance</h3><button onClick={()=>navigate('planner')}>View all →</button></div>{taskList(tasks.filter(t=>t.date===localDate()).slice(0,4))}</section>
   <section className="panel"><div className="panel-title"><h3>Next saved alarm</h3><Icon name="alarm" size={18}/></div><div className="big-time">{alarms.filter(a=>a.enabled).sort((a,b)=>a.time.localeCompare(b.time))[0]?.time||'— : —'}</div><p className="muted">Keep JYRA open and your PC awake. Enable alarm sound above.</p><button className="secondary" onClick={()=>navigate('alarm')}>Manage alarms →</button></section>
   <section className="panel"><h3>A little progress</h3><p>{tasks.filter(t=>t.done).length} completed · {pending.length} remaining</p><progress max={Math.max(1,tasks.length)} value={tasks.filter(t=>t.done).length}/></section>
  </aside>
 </div>
 <div className="quick-grid">{[['people','♙','Familiar people','Names and photo profiles'],['family','♧','Family space','Routines, study and shared plans'],['tasks','▣','Computer tasks','Prepare an organized file copy']].map(([id,icon,title,desc])=><button className="panel quick-card" key={id} onClick={()=>navigate(id as Page)}><span>{icon}</span><div><strong>{title}</strong><small>{desc}</small></div><b>→</b></button>)}</div>
 </>}
 {page!=='home'&&page!=='people'&&<ReferencePages people={people} key={page} page={page} p={p} update={onPreferences} tasks={tasks} saveTasks={saveTasks} taskList={taskList} taskForm={taskForm} members={members} saveMembers={saveMembers} alarms={alarms} saveAlarms={saveAlarms} notes={notes} saveNotes={saveNotes} notify={notify} exportData={exportData} onSetup={onSetup} navigate={next=>navigate(next as Page)} stop={voice.stop}/>}
 {page==='people'&&<div className="content-grid"><section className="panel"><h3>People your companion knows</h3><p className="muted">Photo profiles are stored on this device, without app encryption. Optional local matching is available in Vision Center with consent; results may be wrong.</p><div className="people-grid">{people.map(person=><article className="person-card" key={person.id}><img src={person.photos[0]} alt={person.name}/><h3>{person.name}</h3><small>{person.photos.length} photos · {person.greet?'Greeting preference on':'Greeting preference off'}</small><button className="secondary" onClick={()=>savePeople(people.map(x=>x.id===person.id?{...x,greet:!x.greet}:x))}>Toggle greeting preference</button><button className="text-button" onClick={()=>{const old=people;savePeople(people.filter(x=>x.id!==person.id));setUndo(()=>()=>savePeople(old));notify('Photo profile removed.');}}>Delete profile</button></article>)}</div>{!people.length&&<p className="empty">Add a familiar person with their consent.</p>}</section><form className="panel" onSubmit={e=>{const d=formData(e);if(!consent||!photos.length||uploading)return;if(!savePeople([...people,{id:uid(),name:String(d.get('name')).trim(),photos,greet:true}]))return;setPhotos([]);setConsent(false);e.currentTarget.reset();notify('Photo profile saved locally. Recognition is not active.');}}><h3>Add a person</h3><label>Name<input name="name" required maxLength={60}/></label><label className="toggle-row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>This person agrees to their photos being saved.</label><label>Photos (up to 4)<input ref={files} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!consent} onChange={e=>void loadPhotos(e.target.files)}/></label><div className="photo-preview">{photos.map((src,i)=><img src={src} key={i} alt={`Selected photo ${i+1}`}/>)}</div><button className="action" disabled={!consent||!photos.length||uploading}>{uploading?'Preparing photos…':'Save person'}</button><p className="muted">No camera access or external photo upload occurs here.</p></form></div>}
 </div></section></main>;
}








