import {publicPreview} from './deployment';
import RecoveryCode from './RecoveryCode';
import {useEffect,useRef,useState} from 'react';
import AnimatedAvatar from './AnimatedAvatar';
import {useWelcomeVoice} from './useWelcomeVoice';
import {companionOrder,companionProfiles,savedCompanion} from './companionProfiles';
import type {CompanionId} from './companionProfiles';
import type {FormEvent} from 'react';
import './App.css';
import './workspace/workspace.css';
import './workspace/reference.css';
import './workspace/controls.css';
import './workspace/themed-select.css';
import WelcomeSetup from './figma/FigmaWelcome';
import Dashboard from './figma/FigmaDashboard';
import {defaults,useLocalData} from './workspace/store';
import type {Preferences} from './workspace/store';
import {request,backendValue,currentBackend,initializeBackend,signIn,signUp,signOut,startDemo} from './backend';
import BackendStatus from './BackendStatus';
import StartPage from './figma/FigmaWebsite';
import './start-page.css';
import './figma-theme.css';
import './figma/design.css';
import './figma/foundations.css';
import './figma/features.css';
import './figma/trust.css';
import TaskProgressPreview from './figma/TaskProgress';
import './figma/task-progress.css';
import './figma/notifications.css';
import PermissionsSetup from './figma/PermissionsSetup';
import {ComputerAccessPreview} from './figma/ComputerAccessDialog';
import './figma/permissions.css';
import './figma/responsive-home.css';
import MobileCompanionPreview from './figma/MobileCompanionPreview';
import VoiceListeningPreview from './figma/VoiceListeningPreview';
import './figma/companion-states.css';
import {PlanDialogPreview} from './figma/PlanDialog';
import './figma/plan-dialog.css';
import MemoryRemovedPreview from './figma/MemoryRemovedPreview';
import './figma/confirmation-states.css';
import MobileWebsiteMenu from './figma/MobileWebsiteMenu';
import FamilyTaskCreatedPreview from './figma/FamilyTaskCreatedPreview';
import {ReminderSavedPreview} from './figma/ReminderSavedDialog';
import './figma/next-states.css';
import TaskStoppedPreview from './figma/TaskStopped';
import {SmartAlarmPreview} from './figma/SmartAlarmDialog';
import {MicrophoneBlockedPreview} from './figma/MicrophoneBlockedDialog';
import './figma/stopped-alarm-microphone.css';
import StartHere,{DeviceWebsitePreview} from './figma/StartHere';
import {EditMemoryPreview} from './figma/EditMemoryDialog';
import {PlanningBriefPreview} from './figma/PlanningBriefDialog';
import './figma/start-edit-brief.css';
type Mode='login'|'signup'|'reset'|'verify';
export default function App(){
 const [recoveryCode,setRecoveryCode]=useState('');
 const [extraPreview,setExtraPreview]=useState(location.hash);
 const [previewStatus,setPreviewStatus]=useState('');
 useEffect(()=>{const read=()=>{setExtraPreview(location.hash);setPreviewStatus('');};window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 const [progressPreview,setProgressPreview]=useState(location.hash==='#task-progress');
 const [notificationsPreview,setNotificationsPreview]=useState(location.hash==='#notifications');
 const [initialDashboardPage,setInitialDashboardPage]=useState('home');
 const [initialChatDraft,setInitialChatDraft]=useState('');
 useEffect(()=>{const read=()=>{setProgressPreview(location.hash==='#task-progress');setNotificationsPreview(location.hash==='#notifications');};window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 const [mode,setMode]=useState<Mode>('login'),[show,setShow]=useState(false),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false),[setupName,setSetupName]=useState('');
 useEffect(()=>{void initializeBackend().then(()=>{const active=currentBackend();if(active.user)setSetupName(active.user.name);});},[]);
 const [screen,setScreen]=useState<'start'|'auth'|'setup'|'dashboard'>('start');
 useEffect(()=>{const openPublic=()=>{if(['#start','#features','#trust','#design-system','#how','#download','#docs','#support','#support-confirmation'].includes(location.hash))setScreen('start');};openPublic();window.addEventListener('hashchange',openPublic);return()=>window.removeEventListener('hashchange',openPublic);},[]);
 const [preferences,savePreferences,preferencesError]=useLocalData<Preferences>('zyra.preferences',{...defaults,profile:savedCompanion()});
 const [passwordLength,setPasswordLength]=useState(0);
 const hintsHeard=useRef(new Set<string>());
 const [profile,setProfile]=useState<CompanionId>(savedCompanion);
 const {speaking,voiceError,level,play,stop}=useWelcomeVoice();
 function chooseProfile(id:CompanionId){stop();setProfile(id);try{localStorage.setItem('zyra.companion',id);}catch{/* Selection still works without storage. */}}
 useEffect(()=>{window.scrollTo(0,0);},[screen]);
 useEffect(()=>{if(screen==='dashboard'&&!extraPreview)return;const names:Record<string,string>={'#start-here':'Start here','#edit-memory':'Edit memory preview','#planning-brief':'Planning brief preview','#website-tablet':'Tablet website preview','#website-mobile':'Mobile website preview','#first-hello':'First hello preview','#permissions':'Permissions setup preview','#family-task':'Family task preview','#create-reminder':'Reminder preview','#computer-access':'Computer access preview','#memory-removed':'Memory removed preview','#mobile-companion':'Mobile companion preview','#voice-listening':'Voice listening preview','#task-progress':'Task progress preview','#task-paused':'Task paused preview','#task-completed':'Task completed preview','#task-stopped':'Task stopped preview','#family-task-created':'Family task created preview','#reminder-saved':'Reminder saved preview','#smart-alarm':'Smart alarm preview','#microphone-blocked':'Microphone blocked preview','#mobile-menu':'Website menu','#features':'Features','#trust':'Trust & privacy','#how':'How it works','#download':'Download','#docs':'Documentation','#support':'Support','#support-confirmation':'Support confirmation preview','#design-system':'Design system'};document.title='JYRA — '+(screen==='auth'?(mode==='signup'?'Create account':'Sign in'):screen==='setup'?'Welcome setup':names[extraPreview]||'Your personal companion');},[screen,mode,extraPreview]);
 function passwordHint(){void play('password',profile);}
 function passwordFocus(){if(mode!=='signup')return;const key=profile+mode;if(hintsHeard.current.has(key))return;hintsHeard.current.add(key);passwordHint();}
 function speak(){void play(mode,profile);}
 useEffect(()=>{
   if(screen==='auth'&&(mode==='login'||mode==='signup')) void play(mode,profile,true);
   return stop;
 },[mode,profile,play,stop,screen]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  const form=e.currentTarget,d=new FormData(form);
  if(mode==='reset'){setBusy(true);try{await request('/auth/recover','POST',{email:String(d.get('email')),code:String(d.get('code')).trim(),password:String(d.get('password'))});await signOut();form.reset();setMode('login');setNotice('Password reset. Sign in with your new password, then generate a new recovery code in Security Center.');}catch(error){setNotice((error as Error).message);}finally{setBusy(false);}return;}
  if(mode==='verify'){setNotice('This is a local account; online email verification is not configured.');return;}
  if(mode==='signup'&&d.get('password')!==d.get('confirm')){setNotice('Passwords do not match.');return;}
  setBusy(true);setNotice('');stop();
  try{
   const details={email:String(d.get('email')||''),password:String(d.get('password')||'')};
   const user=mode==='signup'?await signUp({...details,name:String(d.get('name')||'')}):await signIn({...details,remember:d.get('remember')==='on'});
   if('recoveryCode' in user&&typeof user.recoveryCode==='string')setRecoveryCode(user.recoveryCode);
   form.reset();setSetupName(user.name);
   const saved=backendValue<Preferences>('zyra.preferences',defaults);
   setScreen(saved.name?'dashboard':'setup');
  }catch(error){setNotice((error as Error).message||'Could not reach the local backend.');}finally{setBusy(false);}
 }
 async function enterDemo(){if(publicPreview){setScreen('dashboard');return;}if(busy)return;setBusy(true);stop();try{await startDemo();const saved=backendValue<Preferences>('zyra.preferences',defaults);setScreen(saved.name?'dashboard':'setup');}catch{setNotice('Start the local backend, then try again.');}finally{setBusy(false);}}
 async function exitAccount(){if(publicPreview){setScreen('start');return;}try{await signOut();setScreen('start');}catch{setNotice('Could not sign out. Please retry when the local backend is available.');}}
 function change(m:Mode){setMode(m);setPasswordLength(0);setNotice('');setShow(false);stop();}
 function openAuth(next:Mode){change(next);setScreen('auth');}
 function openStart(){stop();setNotice('');setScreen('start');}
 function continueSession(){const active=currentBackend();if(!active.user){void enterDemo();return;}setSetupName(active.user.name);const saved=backendValue<Preferences>('zyra.preferences',defaults);setScreen(saved.name?'dashboard':'setup');}
 function updatePreferences(next:Preferences){if(!savePreferences(next))return false;chooseProfile(next.profile);return true;}
 function openPreviewPage(page:string,draft=''){if(['website','design-system'].includes(page)){location.hash=page==='website'?'start':'design-system';return;}if(['start-here','edit-memory','planning-brief','first-hello','website-tablet','website-mobile','task-stopped','smart-alarm','microphone-blocked','family-task-created','reminder-saved','create-reminder','family-task','notifications','voice-listening','mobile-companion','task-progress','task-paused','task-completed'].includes(page)){location.hash=page;return;}setInitialDashboardPage(page);setInitialChatDraft(draft);setProgressPreview(false);setNotificationsPreview(false);setExtraPreview('');history.replaceState(null,'',location.pathname+location.search);continueSession();}
 if(recoveryCode)return <RecoveryCode code={recoveryCode} onDone={()=>setRecoveryCode('')}/>;
 if(extraPreview==='#start-here')return <StartHere onOpen={openPreviewPage}/>;
 if(extraPreview==='#edit-memory')return <EditMemoryPreview/>;
 if(extraPreview==='#planning-brief')return <PlanningBriefPreview/>;
 if(extraPreview==='#website-tablet'||extraPreview==='#website-mobile')return <DeviceWebsitePreview device={extraPreview==='#website-tablet'?'tablet':'mobile'}/>;
 if(extraPreview==='#first-hello')return <WelcomeSetup initial={{...defaults}} onBack={()=>{location.hash='start-here';}} onDone={()=>{location.hash='mobile-companion';}}/>;
 if(extraPreview==='#task-stopped')return <TaskStoppedPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#smart-alarm')return <SmartAlarmPreview/>;
 if(extraPreview==='#microphone-blocked')return <MicrophoneBlockedPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#mobile-menu')return <MobileWebsiteMenu onClose={()=>{location.hash='start';}} onNavigate={page=>{location.hash=page==='home'?'start':page;}}/>;
 if(extraPreview==='#family-task-created')return <FamilyTaskCreatedPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#reminder-saved')return <ReminderSavedPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#permissions')return previewStatus?<main className="figma-app fg-access-preview-page"><div className="fg-access-cancelled"><h1>Ready when you are.</h1><p role="status">{previewStatus}</p><button className="fg-secondary" onClick={()=>setPreviewStatus('')}>Back to permissions</button></div></main>:<PermissionsSetup onBack={()=>{location.hash='';}} onContinue={choices=>setPreviewStatus(Object.values(choices).some(Boolean)?'Preview choices selected. No device access was requested or saved.':'Text-only preview selected. No device access was requested or saved.')}/>;
 if(extraPreview==='#family-task'||extraPreview==='#create-reminder')return <PlanDialogPreview key={extraPreview} kind={extraPreview==='#family-task'?'family':'reminder'} onOpen={openPreviewPage}/>;
 if(extraPreview==='#computer-access')return <ComputerAccessPreview/>;
 if(extraPreview==='#memory-removed')return <MemoryRemovedPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#mobile-companion')return <MobileCompanionPreview onOpen={openPreviewPage}/>;
 if(extraPreview==='#voice-listening')return <VoiceListeningPreview onOpen={openPreviewPage}/>;
 if(progressPreview||notificationsPreview||extraPreview==='#task-completed'||extraPreview==='#task-paused')return <TaskProgressPreview key={extraPreview} notificationPreview={notificationsPreview} state={extraPreview==='#task-completed'?'completed':extraPreview==='#task-paused'?'paused':'running'} onOpen={openPreviewPage}/>;
 if(screen==='start')return <StartPage onLogin={()=>openAuth('login')} onRegister={()=>openAuth('signup')} onDemo={()=>void enterDemo()} onContinue={continueSession} busy={busy} error={notice}/>;
 if(screen==='setup')return <><WelcomeSetup initial={{...preferences,profile,name:preferences.name||setupName}} onBack={()=>setScreen('start')} onDone={next=>{if(updatePreferences(next))setScreen('dashboard');}}/>{preferencesError&&<div className="setup-storage-error" role="alert">{preferencesError}</div>}</>;
 if(screen==='dashboard')return <Dashboard initialChatDraft={initialChatDraft} initialPage={initialDashboardPage} preferences={preferences} onPreferences={updatePreferences} onSetup={()=>setScreen('setup')} onExit={()=>void exitAccount()} onStart={openStart}/>;
 const signup=mode==='signup';
 return <main className="scene"><button className="start-back-button" onClick={openStart}>← শুরু ও ব্যবহারবিধি</button><div className="ambient ambient-one"/><div className="ambient ambient-two"/><section className={'window '+(signup?'signup':'')}><header><a className="brand" href="#" onClick={e=>{e.preventDefault();openStart()}}><b>∞</b> JYRA AI</a><span className="window-actions" aria-hidden="true">—　□　×</span></header><div className="layout"><aside className={'companion '+(speaking?'speaking':'')}><div className="ring"/><AnimatedAvatar level={level} profile={profile} speaking={speaking}/><div className="voice-controls"><button onClick={speak} aria-label="Play English welcome">{speaking?'◉ Speaking…':'▷ Hear welcome'}</button><button onClick={()=>{stop();}} aria-label="Mute welcome voice">♪ Mute</button></div></aside><section className="form-side"><div className="form-wrap"><h1>{signup?'Meet your companion':'Welcome back'}</h1>{!signup&&<p className="subtitle">Sign in to your JYRA account</p>}<div className="accent-line"/><div className="companion-picker" role="group" aria-label="Choose your companion"><span className="picker-label">Choose your companion</span><div className="profile-options">{companionOrder.map(id=><button key={id} type="button" aria-pressed={profile===id} className={profile===id?'selected':''} onClick={()=>chooseProfile(id)}><img src={companionProfiles[id].image} alt=""/><span>{companionProfiles[id].name}<small>{companionProfiles[id].label}</small></span>{profile===id&&<i aria-hidden="true">✓</i>}</button>)}</div></div><form onSubmit={submit} key={signup?'signup':'login'}>{signup&&<label>Full name<div className="field"><span aria-hidden="true">♙</span><input name="name" autoComplete="name" placeholder="Enter your full name" required/></div></label>}<label>Email<div className="field"><span aria-hidden="true">✉</span><input type="email" name="email" autoComplete="email" placeholder="Enter your email" required/></div></label><label>Password<div className="field"><span aria-hidden="true">♙</span><input name="password" onFocus={passwordFocus} onChange={e=>setPasswordLength(e.currentTarget.value.length)} aria-describedby={signup?'password-guidance':undefined} type={show?'text':'password'} autoComplete={signup?'new-password':'current-password'} placeholder={signup?'Create a password':'Enter your password'} minLength={signup?12:1} required/><button className="eye" type="button" onClick={()=>setShow(!show)} aria-label={show?'Hide passwords':'Show passwords'}>{show?'◉':'◎'}</button></div>{signup&&<small>{passwordLength>=12?'✓ Length requirement met':'Use at least 12 characters'}</small>}</label>{signup&&<section className="password-guidance" id="password-guidance" aria-label="Password guidance"><div><strong>A little help from {companionProfiles[profile].name}</strong><button type="button" onClick={passwordHint}>▷ Hear tips</button></div><p>Try four unrelated words. Add a number or symbol if you like.</p><p className="example">Example only: River!Mango7Cloud!Lantern</p><small>Make your own version. Avoid your name, birthday and reused passwords. Never share your password with your companion.</small></section>}{signup&&<label>Confirm password<div className="field"><span aria-hidden="true">♙</span><input name="confirm" type={show?'text':'password'} autoComplete="new-password" placeholder="Confirm your password" minLength={12} required/><button className="eye" type="button" onClick={()=>setShow(!show)} aria-label="Toggle confirm password visibility">◎</button></div></label>}{!signup?<div className="options"><label className="check"><input type="checkbox" name="remember"/>Remember me</label><button className="text-link" type="button" onClick={()=>change('reset')}>Forgot password?</button></div>:<div className="agreement">Local account on this PC. Email verification and cloud access are not configured.</div>}<button className="primary" type="submit" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button>{(notice||voiceError)&&<p className="notice" role="status">{notice||voiceError}</p>}</form><p className="switch">{signup?'Already have an account?':'New to JYRA?'} <button onClick={()=>change(signup?'login':'signup')}>{signup?'Sign in':'Create account'}</button></p><button className="demo" onClick={()=>void enterDemo()} disabled={busy}>Explore demo <span>→</span></button></div></section></div></section><footer><BackendStatus/> <span>· Local accounts · 2D avatar preview</span></footer>{(mode==='reset'||mode==='verify')&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="close" onClick={()=>change('login')} aria-label="Close dialog">×</button><h2 id="dialog-title">{mode==='reset'?'Reset password':'Verify your email'}</h2><p>{mode==='reset'?"Use the recovery code you saved from signup or Security Center. This resets only your local JYRA account.":'Open the link sent to your email to continue.'}</p>{mode==='reset'?<form onSubmit={submit}><label>Email<div className="field"><span>✉</span><input type="email" name="email" placeholder="Enter your email" required/></div></label><label>Recovery code<input name="code" required minLength={64} maxLength={64} autoComplete="off"/></label><label>New password<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label><button className="primary" disabled={busy}>Reset local password</button></form>:<button className="primary" onClick={()=>setNotice('Preview only — email is not connected.')}>Resend email</button>}{(notice||voiceError)&&<p className="notice" role="status">{notice||voiceError}</p>}</section></div>}</main>
}





















