import {useEffect,useState} from 'react';
import {request} from '../backend';
import ThemedSelect from './ThemedSelect';
export default function SessionSettings(){
 const [minutes,setMinutes]=useState(120),[expires,setExpires]=useState<number|null>(null),[message,setMessage]=useState('');
 useEffect(()=>{void request<{expiresAt:number}>('/security/session').then(r=>setExpires(r.expiresAt)).catch(e=>setMessage(e.message));},[]);
 return <section className="panel"><h3>Session expiry</h3><p>Current session ends: {expires?new Date(expires).toLocaleString():'Checking…'}</p><label>New duration<ThemedSelect value={minutes} onChange={e=>setMinutes(Number(e.target.value))}><option value={30}>30 minutes</option><option value={120}>2 hours</option><option value={720}>12 hours</option><option value={10080}>7 days</option></ThemedSelect></label><button className="secondary" onClick={async()=>{try{const r=await request<{expiresAt:number}>('/security/session','POST',{minutes});setExpires(r.expiresAt);setMessage('Session expiry updated.');}catch(e){setMessage((e as Error).message);}}}>Apply to this session</button>{message&&<p role="status">{message}</p>}</section>;
}
