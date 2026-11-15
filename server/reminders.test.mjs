import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from './database.mjs';
import {createReminders} from './reminders.mjs';
test('proactive task reminders honor quiet hours, snooze, cap calls and isolate accounts',()=>{
 const s=openDatabase(':memory:');try{const a=s.createDemo(),b=s.createDemo();let now=Date.parse('2026-11-16T05:00:00+06:00');const task={id:'task',title:'Morning study',date:'2026-11-16',time:'05:00',done:false};s.write(a.id,'tasks',[task],0);s.write(a.id,'preferences',{proactive:true,quietStart:'22:00',quietEnd:'07:00'},0);const r=createReminders(s,{clock:()=>now,timeZone:'Asia/Dhaka'});
 assert.equal(r.active(a.id).runs.length,0);now+=2*3600000;const first=r.active(a.id).runs[0];assert.equal(first.attempt,1);assert.equal(r.active(b.id).runs.length,0);r.action(a.id,{...first,action:'snooze'});assert.equal(r.active(a.id).runs.length,0);now+=15*60000;assert.equal(r.active(a.id).runs[0].attempt,2);now+=15*60000;assert.equal(r.active(a.id).runs[0].attempt,3);now+=15*60000;assert.equal(r.active(a.id).runs.length,0);
 }finally{s.close();}
});
test('overdue tasks follow up on a new day; completing or disabling reminders stops them',()=>{
 const s=openDatabase(':memory:');try{const user=s.createDemo();let now=Date.parse('2026-11-17T09:00:00Z'),task={id:'t',title:'Overdue',date:'2026-11-16',time:'10:00',done:false};s.write(user.id,'tasks',[task],0);s.write(user.id,'preferences',{proactive:false},0);const r=createReminders(s,{clock:()=>now,timeZone:'UTC'});assert.equal(r.active(user.id).runs.length,0);s.write(user.id,'preferences',{proactive:true,quietStart:'00:00',quietEnd:'00:00'},1);assert.equal(r.active(user.id).runs.length,1);s.write(user.id,'tasks',[{...task,done:true}],1);assert.equal(r.active(user.id).runs.length,0);
 }finally{s.close();}
});
