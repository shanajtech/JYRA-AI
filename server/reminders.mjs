import {HttpError} from './validation.mjs';
export function createReminders(storage,{clock=()=>Date.now(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}={}){
 const db=storage.db,format=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 db.exec('CREATE TABLE IF NOT EXISTS task_reminders(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,task_id TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,state TEXT NOT NULL,attempt INTEGER NOT NULL,next_at INTEGER NOT NULL,last_at INTEGER NOT NULL,PRIMARY KEY(user_id,task_id,date,time));');
 function context(user){const state=storage.all(user),p=state.preferences?.value||{},parts=Object.fromEntries(format.formatToParts(clock()).map(v=>[v.type,v.value])),date=`${parts.year}-${parts.month}-${parts.day}`,time=`${parts.hour}:${parts.minute}`,start=p.quietStart||'22:00',end=p.quietEnd||'07:00';const quiet=start===end?false:start<end?time>=start&&time<end:time>=start||time<end;return {p,tasks:state.tasks?.value||[],date,time,quiet};}
 function tick(){const now=clock();for(const row of db.prepare("SELECT user_id FROM documents WHERE collection='tasks'").all()){
  const {p,tasks,date,time,quiet}=context(row.user_id);
  for(const run of db.prepare("SELECT * FROM task_reminders WHERE user_id=? AND state IN ('active','snoozed')").all(row.user_id)){
   const task=tasks.find(t=>t.id===run.task_id&&!t.done&&t.date<=date&&t.time===run.time);if(!task||run.date!==date){db.prepare("UPDATE task_reminders SET state='closed' WHERE user_id=? AND task_id=? AND date=? AND time=?").run(row.user_id,run.task_id,run.date,run.time);continue;}
   if(p.proactive!==false&&!quiet&&run.next_at<=now)db.prepare('UPDATE task_reminders SET state=?,attempt=?,next_at=?,last_at=? WHERE user_id=? AND task_id=? AND date=? AND time=?').run(run.attempt>=3?'expired':'active',run.attempt+1,now+15*60000,now,row.user_id,run.task_id,run.date,run.time);
  }
  if(p.proactive===false||quiet)continue;let count=db.prepare("SELECT COUNT(*) AS count FROM task_reminders WHERE user_id=? AND state IN ('active','snoozed')").get(row.user_id).count;
  for(const task of tasks.filter(t=>!t.done&&t.date<=date&&t.time&&(t.date<date||t.time<=time))){if(count>=20)break;const r=db.prepare("INSERT OR IGNORE INTO task_reminders VALUES(?,?,?,?,'active',1,?,?)").run(row.user_id,task.id,date,task.time,now+15*60000,now);count+=r.changes;}
 }db.prepare('DELETE FROM task_reminders WHERE last_at<?').run(now-30*86400000);}
 function active(user){tick();const {p,quiet}=context(user);if(p.proactive===false||quiet)return {runs:[]};return {runs:db.prepare("SELECT task_id AS id,date,time,attempt,last_at AS lastAt FROM task_reminders WHERE user_id=? AND state='active' ORDER BY last_at DESC LIMIT 20").all(user)};}
 function action(user,body){if(typeof body?.id!=='string'||typeof body.date!=='string'||typeof body.time!=='string'||!['dismiss','snooze'].includes(body.action))throw new HttpError(400,'Choose a reminder to dismiss or snooze.');const r=db.prepare("UPDATE task_reminders SET state=?,next_at=? WHERE user_id=? AND task_id=? AND date=? AND time=? AND state IN ('active','snoozed')").run(body.action==='dismiss'?'closed':'snoozed',clock()+15*60000,user,body.id,body.date,body.time);if(!r.changes)throw new HttpError(404,'Reminder not found.');storage.audit(user,'reminder.'+body.action);return {ok:true};}
 return {tick,active,action};
}
