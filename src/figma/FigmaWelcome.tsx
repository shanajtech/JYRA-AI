import BrandLogo from './BrandLogo';
import {useState} from 'react';
import type {Preferences} from '../workspace/store';
import {portrait} from './assets';
import PermissionsSetup from './PermissionsSetup';
export default function FigmaWelcome({initial,onDone,onBack}:{initial:Preferences;onDone:(p:Preferences)=>void;onBack:()=>void}){
 const [name,setName]=useState(initial.nickname||initial.name);
 const [next,setNext]=useState<Preferences|null>(null);
 if(next)return <PermissionsSetup initial={initial.capabilities} onBack={()=>setNext(null)} onContinue={capabilities=>onDone({...next,capabilities})}/>;
 return <main className="fg-welcome"><button className="fg-web-brand" onClick={onBack}><BrandLogo/></button><div className="fg-welcome-grid"><section><small>01 / A FAMILIAR FIRST HELLO</small><h1>Hello.<br/>I’m JYRA.</h1><p>Let’s make this feel like you.</p><form onSubmit={e=>{e.preventDefault();setNext({...initial,name:name.trim(),nickname:name.trim(),profile:'female',language:'English'});}}><label>What should I call you?<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} autoComplete="name" required placeholder="Your name"/></label><label>Preferred language<span className="fg-welcome-field">English (US)</span></label><label>Companion voice<span className="fg-welcome-field">Calm & clear</span></label><div className="fg-button-row"><button className="fg-primary">Continue</button><button type="button" className="fg-secondary" onClick={()=>onDone({...initial,name:name.trim()||'Friend',nickname:name.trim()||'Friend',profile:'female',language:'English'})}>Explore first</button></div></form><small className="fg-welcome-foot">You can change your name, language, and voice at any time.</small></section><aside><img src={portrait} alt="JYRA companion"/><h2>A little ahead. Always alongside.</h2></aside></div></main>;
}
