import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import {HttpError} from './validation.mjs';
const address=v=>typeof v==='string'&&v.length<=254&&/^[^\s@<>;,\r\n]+@[^\s@<>;,\r\n]+\.[^\s@<>;,\r\n]+$/.test(v);
export function createSupport(storage,{env=process.env,transportFactory=nodemailer.createTransport}={}){
 const db=storage.db;
 db.exec('CREATE TABLE IF NOT EXISTS support_requests(id TEXT PRIMARY KEY,email TEXT NOT NULL,topic TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS support_deliveries(request_id TEXT PRIMARY KEY REFERENCES support_requests(id),delivered_at INTEGER NOT NULL)');
 const configured=!!(address(env.ZYRA_SUPPORT_TO)&&address(env.ZYRA_SUPPORT_FROM)&&env.ZYRA_SUPPORT_SMTP_HOST&&env.ZYRA_SUPPORT_SMTP_USER&&env.ZYRA_SUPPORT_SMTP_PASSWORD);
 return {async submit(body){
  if(!body||Object.keys(body).some(k=>!['email','topic','message'].includes(k))||!address(body.email)||!['Connection or setup','Voice','Design'].includes(body.topic)||typeof body.message!=='string'||body.message.trim().length<10||body.message.length>5000)throw new HttpError(400,'Enter a valid email, topic, and a message between 10 and 5000 characters.');
  const id=randomUUID();db.prepare('INSERT INTO support_requests VALUES(?,?,?,?,?)').run(id,body.email.trim(),body.topic,body.message.trim(),Date.now());
  let emailDelivery=false;
  if(configured){const port=Number(env.ZYRA_SUPPORT_SMTP_PORT||465),transport=transportFactory({host:env.ZYRA_SUPPORT_SMTP_HOST,port,secure:port===465,requireTLS:true,tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},auth:{user:env.ZYRA_SUPPORT_SMTP_USER,pass:env.ZYRA_SUPPORT_SMTP_PASSWORD},connectionTimeout:4000,socketTimeout:7000,disableFileAccess:true,disableUrlAccess:true});
   try{const result=await transport.sendMail({from:env.ZYRA_SUPPORT_FROM,to:env.ZYRA_SUPPORT_TO,replyTo:body.email,subject:'ZYRA support: '+body.topic,text:`Request: ${id}\nFrom: ${body.email}\nTopic: ${body.topic}\n\n${body.message.trim()}`,disableFileAccess:true,disableUrlAccess:true});emailDelivery=result.accepted?.some(value=>String(value).toLowerCase()===env.ZYRA_SUPPORT_TO.toLowerCase())||false;if(emailDelivery)db.prepare('INSERT INTO support_deliveries VALUES(?,?)').run(id,Date.now());}catch{/* The local request remains available when delivery fails. */}finally{transport.close();}}
  return {id,status:emailDelivery?'accepted-by-mail-server':'saved-locally',emailDelivery};
 }};
}
