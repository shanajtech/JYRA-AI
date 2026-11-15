import {HttpError} from './validation.mjs';

export function createAlarms(storage,{clock=()=>Date.now(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}={}){
 const db=storage.db;
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 db.exec(`CREATE TABLE IF NOT EXISTS alarm_runs(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,alarm_id TEXT NOT NULL,day TEXT NOT NULL,state TEXT NOT NULL,attempt INTEGER NOT NULL,next_at INTEGER NOT NULL,last_at INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,alarm_id,day));`);
 function tick(){
  const now=clock(),parts=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));
  const day=`${parts.year}-${parts.month}-${parts.day}`,time=`${parts.hour}:${parts.minute}`;
  for(const doc of db.prepare("SELECT user_id,payload FROM documents WHERE collection='alarms'").all()){
   const alarms=JSON.parse(doc.payload);
   for(const a of alarms){
    if(!a.enabled||a.startDate&&day<a.startDate||a.once&&day!==a.startDate)continue;
    const days=a.days||a.label.match(/Wake-up · ([A-Za-z, ]+) ·/)?.[1].split(', ')||['Mon','Tue','Wed','Thu','Fri'];
    if(a.time===time&&days.includes(parts.weekday))db.prepare('INSERT OR IGNORE INTO alarm_runs VALUES(?,?,?,?,?,?,?,?)').run(doc.user_id,a.id,day,'ringing',1,now+(a.interval||2)*60000,now,JSON.stringify(a));
   }
   for(const run of db.prepare("SELECT * FROM alarm_runs WHERE user_id=? AND state IN ('ringing','snoozed')").all(doc.user_id)){
    const a=alarms.find(a=>a.id===run.alarm_id&&a.enabled);
    if(!a){db.prepare("UPDATE alarm_runs SET state='stopped' WHERE user_id=? AND alarm_id=? AND day=?").run(doc.user_id,run.alarm_id,run.day);continue;}
    if(run.next_at<=now){
     const attempt=run.attempt+1;
     db.prepare('UPDATE alarm_runs SET state=?,attempt=?,next_at=?,last_at=? WHERE user_id=? AND alarm_id=? AND day=?').run(attempt>a.repeat?'expired':'ringing',attempt,now+(a.interval||2)*60000,now,doc.user_id,a.id,run.day);
    }
   }
  }
  db.prepare('DELETE FROM alarm_runs WHERE last_at<?').run(now-30*86400000);
 }
 function active(userId){tick();return {timeZone,runs:db.prepare("SELECT * FROM alarm_runs WHERE user_id=? AND state='ringing'").all(userId).map(r=>({id:r.alarm_id,day:r.day,attempt:r.attempt,lastAt:r.last_at,alarm:JSON.parse(r.payload)}))};}
 function action(userId,body){
  if(!body||typeof body.id!=='string'||typeof body.day!=='string'||!['stop','snooze'].includes(body.action))throw new HttpError(400,'Invalid alarm action.');
  const run=db.prepare("SELECT * FROM alarm_runs WHERE user_id=? AND alarm_id=? AND day=? AND state IN ('ringing','snoozed')").get(userId,body.id,body.day);
  if(!run)throw new HttpError(404,'Active alarm not found.');
  const a=JSON.parse(run.payload);
  db.prepare('UPDATE alarm_runs SET state=?,next_at=? WHERE user_id=? AND alarm_id=? AND day=?').run(body.action==='stop'?'stopped':'snoozed',clock()+(a.snooze||5)*60000,userId,body.id,body.day);
  storage.audit(userId,'alarm.'+body.action);
  return {ok:true};
 }
 return {tick,active,action};
}
