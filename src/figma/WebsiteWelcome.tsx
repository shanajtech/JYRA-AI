import {useEffect,useState} from 'react';
import {useWelcomeVoice} from '../useWelcomeVoice';
import './website-welcome.css';
export default function WebsiteWelcome(){
 const {speaking,play,stop,voiceError}=useWelcomeVoice();
 const [muted,setMuted]=useState(false);
 useEffect(()=>{void play('website','female',true);return stop;},[play,stop]);
 return <aside className="fg-website-welcome" aria-label="Welcome voice"><span aria-live="polite">{speaking?'JYRA is welcoming you':muted?'Welcome voice muted':'Welcome to JYRA'}</span><button className="fg-secondary" onClick={()=>{if(speaking){stop();setMuted(true);}else{setMuted(false);void play('website','female');}}}>{speaking?'Mute welcome':'Hear welcome'}</button>{voiceError&&<span role="status">Press Hear welcome to listen.</span>}</aside>;
}
