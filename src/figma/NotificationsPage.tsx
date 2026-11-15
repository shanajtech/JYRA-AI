import FigmaIcon from './FigmaIcon';
import type {Task} from '../workspace/store';
const Icon=({name}:{name:string})=><FigmaIcon name={name} screen="foundations"/>;
type Props={preview?:boolean;tasks?:Task[];quietStart?:string;quietEnd?:string;onNavigate:(page:string)=>void};
export default function NotificationsPage({preview=false,tasks=[],quietStart='22:00',quietEnd='07:00',onNavigate}:Props){
 const rows=preview?[
 {id:'approval',icon:'lock',title:'Computer access needs your approval',detail:'Prepare planning briefing · Just now',action:'Review request',destination:'tasks',primary:true},
 {id:'family',icon:'family',title:'A family task is coming up',detail:'Pick up groceries · 11:30 today',action:'Open family space',destination:'family',primary:false},
 {id:'reminder',icon:'bell',title:'A reminder from you',detail:'Call Mum · 18:00 today',action:'View reminder',destination:'alarm',primary:false}
 ]:tasks.filter(t=>!t.done).map(t=>({id:t.id,icon:t.member&&t.member!=='Me'?'family':'bell',title:t.title,detail:`${t.member||'Me'} · ${t.time||t.date}`,action:t.member&&t.member!=='Me'?'Open family space':'View reminder',destination:t.member&&t.member!=='Me'?'family':'alarm',primary:false}));
 return <div className="fg-notifications-grid" aria-label={preview?'Notifications design preview — sample data':'Your notifications'}><section className="fg-card fg-notifications-list"><small>{preview?'TODAY':'UPCOMING'}</small>{rows.length?<div>{rows.map(row=><article key={row.id}><Icon name={row.icon}/><div><h2>{row.title}</h2><p>{row.detail}</p><button className={row.primary?'fg-primary':'fg-secondary'} onClick={()=>onNavigate(row.destination)}>{row.action}</button></div></article>)}</div>:<div className="fg-notifications-empty"><Icon name="check"/><h2>You’re all caught up.</h2><p>Your saved tasks and reminders will appear here.</p></div>}</section><aside className="fg-notifications-aside"><section className="fg-card fg-raised fg-notifications-attention"><Icon name="bell"/><h2>Your attention matters.</h2><p className="fg-purple">{preview?'Quiet hours are on':'Quiet hours'}<br/>{quietStart} — {quietEnd}</p><p>Urgent alarms can still reach you.<br/>Everything else can wait.</p><button className="fg-secondary" onClick={()=>onNavigate('appearance')}>Manage preferences</button></section><section className="fg-card fg-notifications-history"><Icon name="check"/><h2>You’re all caught up.</h2><p>No earlier notifications.<br/>New updates will appear here.</p></section></aside></div>;
}

