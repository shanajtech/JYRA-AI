import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createMail} from './mail.mjs';
import {HttpError} from './validation.mjs';
export function credential(mode,text){return new Promise((resolve,reject)=>{
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('../scripts/credential.ps1',import.meta.url)),'-Mode',mode],{stdio:['pipe','pipe','ignore'],windowsHide:true});let result='';const timer=setTimeout(()=>child.kill(),10000);child.stdout.on('data',b=>{result+=b.toString('utf8');});child.stdin.on('error',()=>{});child.stdin.end(text);child.on('error',()=>{clearTimeout(timer);reject(new Error('Windows credential protection unavailable.'));});child.on('close',code=>{clearTimeout(timer);code===0?resolve(result.replace(/^\uFEFF/,'')):reject(new Error('Windows credential protection unavailable.'));});
});}
export function createGmail(storage,{crypt=credential,mailFactory=createMail}={}){
 const db=storage.db,busy=new Set();db.exec('CREATE TABLE IF NOT EXISTS integrations(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,service TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,service));');
 const row=user=>db.prepare("SELECT payload FROM integrations WHERE user_id=? AND service='gmail'").get(user.id);
 const env=(user,email,password)=>({ZYRA_SMTP_HOST:'smtp.gmail.com',ZYRA_SMTP_PORT:'465',ZYRA_IMAP_HOST:'imap.gmail.com',ZYRA_IMAP_PORT:'993',ZYRA_MAIL_USER:email,ZYRA_MAIL_PASSWORD:password,ZYRA_MAIL_FROM:email,ZYRA_MAIL_OWNER_EMAIL:user.email});
 async function service(user){const saved=row(user);if(!saved)return mailFactory();try{const data=JSON.parse(await crypt('unprotect',saved.payload));return mailFactory({env:env(user,data.email,data.password)});}catch{throw new HttpError(503,'Gmail credentials could not be unlocked by this Windows account. Reconnect Gmail.');}}
 return {
  status(user){const connected=!user.demo&&!!row(user);return {configured:connected,inbox:connected,from:connected?user.email:null,message:connected?'Gmail credentials are saved for this local account. Refresh inbox to check the current connection.':'Connect Gmail below using an App Password. No email has been sent.'};},
  async connect(user,body){if(user.demo||!user.email)throw new HttpError(403,'Register or sign in to your own local account before connecting Gmail.');if(busy.has(user.id))throw new HttpError(429,'A Gmail connection is already being checked.');const password=typeof body?.password==='string'?body.password.replace(/ /g,''):'';if(typeof body?.email!=='string'||body.email.toLowerCase()!==user.email||!/^[a-z0-9]{16}$/i.test(password)||Object.keys(body).some(k=>!['email','password'].includes(k)))throw new HttpError(400,'Use the same address as this local account and a 16-character Gmail App Password.');
   busy.add(user.id);try{const mail=mailFactory({env:env(user,user.email,password)});await mail.verify(user);const sealed=await crypt('protect',JSON.stringify({email:user.email,password}));db.prepare("INSERT INTO integrations VALUES(?,'gmail',?) ON CONFLICT(user_id,service) DO UPDATE SET payload=excluded.payload").run(user.id,sealed);storage.audit(user.id,'gmail.connected');return {ok:true};}finally{busy.delete(user.id);}
  },
  disconnect(user){db.prepare("DELETE FROM integrations WHERE user_id=? AND service='gmail'").run(user.id);storage.audit(user.id,'gmail.disconnected');return {ok:true};},
  async inbox(user){return (await service(user)).inbox(user);},
  async send(user,body){return (await service(user)).send(user,body);},
 };
}
