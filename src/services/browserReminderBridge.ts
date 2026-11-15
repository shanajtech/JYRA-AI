import {createBrowserReminders} from './browser-reminders.mjs';
const paths=new Set(['/alarms/active','/alarms/action','/alarms/stop-all','/reminders','/reminders/action']);
let service:ReturnType<typeof createBrowserReminders>|undefined;
const owner=crypto.randomUUID();
export function browserReminderPath(path:string){return paths.has(path);}
export async function browserReminderRequest(path:string,method:string,body?:unknown){
 const execute=()=>{service??=createBrowserReminders(localStorage);const value=service.request(path,method,body);if(method==='GET'){const key='zyra.browser.reminder-leader.v1',now=Date.now();let lease:{owner:string;until:number}|null=null;try{lease=JSON.parse(localStorage.getItem(key)||'null');}catch{/* Replace invalid lease only. */}if(lease&&lease.owner!==owner&&lease.until>now)return {...value as object,runs:[]};localStorage.setItem(key,JSON.stringify({owner,until:now+16000}));}return value;};
 if(navigator.locks)return navigator.locks.request('jyra-browser-reminders',execute);return execute();
}
