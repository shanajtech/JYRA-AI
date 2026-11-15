import nodemailer from 'nodemailer';
import {ImapFlow} from 'imapflow';
import {simpleParser} from 'mailparser';
import {HttpError} from './validation.mjs';
const address=v=>typeof v==='string'&&v.length<=254&&/^[^\s@<>;,\r\n]+@[^\s@<>;,\r\n]+\.[^\s@<>;,\r\n]+$/.test(v);
export function createMail({env=process.env,transportFactory=nodemailer.createTransport,imapFactory=options=>new ImapFlow(options)}={}){
 const configured=!!(env.ZYRA_SMTP_HOST&&address(env.ZYRA_MAIL_FROM)&&env.ZYRA_MAIL_USER&&env.ZYRA_MAIL_PASSWORD&&address(env.ZYRA_MAIL_OWNER_EMAIL));
 const incoming=configured&&!!env.ZYRA_IMAP_HOST;
 const owned=user=>configured&&!user.demo&&user.email===env.ZYRA_MAIL_OWNER_EMAIL?.toLowerCase();
 const transport=()=>transportFactory({host:env.ZYRA_SMTP_HOST,port:Number(env.ZYRA_SMTP_PORT||465),secure:String(env.ZYRA_SMTP_PORT||465)==='465',requireTLS:true,auth:{user:env.ZYRA_MAIL_USER,pass:env.ZYRA_MAIL_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});
 function requireOwner(user){if(!owned(user))throw new HttpError(403,'Configure the mail service for this registered account first. Demo accounts cannot access email.');}
 return {
  async verify(user){requireOwner(user);const t=transport();try{await t.verify();return {ok:true};}catch{throw new HttpError(502,'Gmail did not accept the connection. Use a Gmail App Password and check 2-Step Verification.');}finally{t.close();}},
  status:user=>({configured:owned(user),inbox:owned(user)&&incoming,from:owned(user)?env.ZYRA_MAIL_FROM:null,message:owned(user)?'Email configuration present; use Refresh inbox or send a reviewed message to verify access.':'Email is not configured for this local account. See SETUP-SERVICES.md.'}),
  async send(user,body){requireOwner(user);if(!body||body.reviewed!==true||!address(body.to)||typeof body.subject!=='string'||!body.subject.trim()||body.subject.length>200||/[\r\n]/.test(body.subject)||typeof body.text!=='string'||!body.text.trim()||body.text.length>20000||Object.keys(body).some(k=>!['to','subject','text','reviewed'].includes(k)))throw new HttpError(400,'Review the recipient, subject and message before sending.');
   try{const t=transport();try{const r=await t.sendMail({from:env.ZYRA_MAIL_FROM,to:body.to,subject:body.subject,text:body.text,disableFileAccess:true,disableUrlAccess:true});if(!r.accepted?.length)throw new Error('Not accepted');return {accepted:true,messageId:r.messageId};}finally{t.close();}}catch{throw new HttpError(502,'Email server did not confirm acceptance. Check your sent mail before retrying.');}
  },
  async inbox(user){requireOwner(user);if(!incoming)throw new HttpError(503,'Incoming mail is not configured. Add ZYRA_IMAP_HOST first.');
   const client=imapFactory({host:env.ZYRA_IMAP_HOST,port:Number(env.ZYRA_IMAP_PORT||993),secure:true,auth:{user:env.ZYRA_MAIL_USER,pass:env.ZYRA_MAIL_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},logger:false,connectionTimeout:10000,socketTimeout:20000});
   try{await client.connect();const lock=await client.getMailboxLock('INBOX',{readOnly:true});try{const count=client.mailbox.exists;if(!count)return {messages:[]};const messages=[];
    for await(const message of client.fetch(`${Math.max(1,count-9)}:*`,{uid:true,envelope:true,source:{start:0,maxLength:128000}})){
     const parsed=await simpleParser(message.source,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true});messages.push({id:String(message.uid),subject:String(message.envelope?.subject||'(No subject)').slice(0,300),from:message.envelope?.from?.[0]?.address||'',date:message.envelope?.date||null,text:String(parsed.text||'No plain-text preview available. Open your mail app to view the original.').slice(0,12000)});
    }return {messages:messages.reverse()};
   }finally{lock.release();}}catch{throw new HttpError(502,'Could not load your inbox. Check the IMAP configuration.');}finally{await client.logout().catch(()=>{});}
  },
 };
}
