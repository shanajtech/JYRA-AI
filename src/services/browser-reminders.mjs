// Browser-only reminder execution. No background-worker or closed-browser guarantee.
export function createBrowserReminders(storage,{clock=Date.now,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}={}){
 const key='zyra.browser.reminder-runs.v1';
 const format=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const read=(k,fallback)=>{const raw=storage.getItem(k);if(!raw)return fallback;return JSON.parse(raw);};
 const load=()=>{const state=read(key,{alarms:[],tasks:[]});if(!Array.isArray(state.alarms)||!Array.isArray(state.tasks))throw new Error('Reminder history is unreadable. Export your browser data before resetting it.');return state;};
 const save=state=>storage.setItem(key,JSON.stringify(state));
 function context(){const now=clock(),parts=Object.fromEntries(format.formatToParts(now).map(p=>[p.type,p.value]));const date=`${parts.year}-${parts.month}-${parts.day}`,time=`${parts.hour}:${parts.minute}`,p=read('zyra.preferences',{}),start=p.quietStart||'22:00',end=p.quietEnd||'07:00';return {now,date,time,weekday:parts.weekday,p,quiet:start===end?false:start<end?time>=start&&time<end:time>=start||time<end};}
 function tick(){const c=context(),state=load(),alarms=read('zyra.alarms',[]),tasks=read('zyra.tasks',[]);if(!Array.isArray(alarms)||!Array.isArray(tasks))throw new Error('Saved reminder data is unreadable.');
  for(const a of alarms.slice(0,500)){const days=a.days||['Mon','Tue','Wed','Thu','Fri'];if(a.enabled&&a.time===c.time&&(!a.startDate||c.date>=a.startDate)&&(!a.once||c.date===a.startDate)&&days.includes(c.weekday)&&!state.alarms.some(r=>r.id===a.id&&r.day===c.date))state.alarms.push({id:a.id,day:c.date,state:'ringing',attempt:1,nextAt:c.now+(a.interval||2)*60000,lastAt:c.now,alarm:a});}
  for(const r of state.alarms){if(!['ringing','snoozed'].includes(r.state))continue;const a=alarms.find(a=>a.id===r.id&&a.enabled);if(!a||r.day!==c.date){r.state='stopped';continue;}if(r.nextAt<=c.now){r.attempt++;r.state=r.attempt>a.repeat?'expired':'ringing';r.nextAt=c.now+(a.interval||2)*60000;r.lastAt=c.now;}}
  for(const r of state.tasks){if(!['active','snoozed'].includes(r.state))continue;const task=tasks.find(t=>t.id===r.id&&!t.done&&t.time===r.time&&t.date<=c.date);if(!task||r.date!==c.date){r.state='closed';continue;}if(c.p.proactive!==false&&!c.quiet&&r.nextAt<=c.now){r.state=r.attempt>=3?'expired':'active';r.attempt++;r.nextAt=c.now+15*60000;r.lastAt=c.now;}}
  if(c.p.proactive!==false&&!c.quiet){let count=state.tasks.filter(r=>['active','snoozed'].includes(r.state)).length;for(const t of tasks.filter(t=>!t.done&&t.date<=c.date&&t.time&&(t.date<c.date||t.time<=c.time))){if(count>=20)break;if(!state.tasks.some(r=>r.id===t.id&&r.date===c.date&&r.time===t.time)){state.tasks.push({id:t.id,date:c.date,time:t.time,state:'active',attempt:1,nextAt:c.now+15*60000,lastAt:c.now});count++;}}}
  state.alarms=state.alarms.filter(r=>r.lastAt>c.now-30*86400000);state.tasks=state.tasks.filter(r=>r.lastAt>c.now-30*86400000);save(state);return {state,c};
 }
 function request(path,method='GET',body){if(path==='/alarms/active'&&method==='GET'){const {state}=tick();return {timeZone,runs:state.alarms.filter(r=>r.state==='ringing')};}
  if(path==='/reminders'&&method==='GET'){const {state,c}=tick();return {runs:c.quiet||c.p.proactive===false?[]:state.tasks.filter(r=>r.state==='active')};}
  const state=load();if(path==='/alarms/stop-all'&&method==='POST'){state.alarms.forEach(r=>{if(['ringing','snoozed'].includes(r.state))r.state='stopped';});save(state);return {ok:true};}
  if(path==='/alarms/action'&&method==='POST'){if(!['stop','snooze'].includes(body?.action))throw new Error('Invalid alarm action.');const r=state.alarms.find(r=>r.id===body.id&&r.day===body.day&&['ringing','snoozed'].includes(r.state));if(!r)throw new Error('This alarm is no longer active.');r.state=body.action==='stop'?'stopped':'snoozed';r.nextAt=clock()+(r.alarm.snooze||5)*60000;save(state);return {ok:true};}
  if(path==='/reminders/action'&&method==='POST'){if(!['dismiss','snooze'].includes(body?.action))throw new Error('Invalid reminder action.');const r=state.tasks.find(r=>r.id===body.id&&r.date===body.date&&r.time===body.time&&['active','snoozed'].includes(r.state));if(!r)throw new Error('This reminder is no longer active.');r.state=body.action==='dismiss'?'closed':'snoozed';r.nextAt=clock()+15*60000;save(state);return {ok:true};}
  throw new Error('This service is not available in the browser.');
 }
 return {request};
}
