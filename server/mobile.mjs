import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {HttpError} from './validation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createMobile(storage,ai,{clock=()=>Date.now(),publicUrl=process.env.ZYRA_MOBILE_PUBLIC_URL||''}={}){
 let gatewayReady=false;const db=storage.db;
 db.exec(`CREATE TABLE IF NOT EXISTS mobile_codes(code_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,permissions TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS mobile_devices(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,permissions TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);`);
 const permissions=value=>Array.isArray(value)&&value.length>0&&value.length<=2&&new Set(value).size===value.length&&value.every(p=>['chat','readTasks'].includes(p));
 function status(user){return {ready:gatewayReady,url:gatewayReady?publicUrl:null,devices:db.prepare('SELECT id,name,permissions,expires_at FROM mobile_devices WHERE user_id=? AND expires_at>?').all(user.id,clock()).map(d=>({...d,permissions:JSON.parse(d.permissions)})),message:gatewayReady?'HTTPS mobile portal is running. Open its address on your phone.':'Mobile HTTPS portal needs a trusted certificate and address. See SETUP-SERVICES.md.'};}
 function code(user,body){if(!gatewayReady)throw new HttpError(503,'Configure and start the trusted HTTPS mobile portal first.');if(!permissions(body?.permissions))throw new HttpError(400,'Choose chat or read-only task access.');const code=randomBytes(5).toString('hex').toUpperCase(),expires=clock()+300000;
  db.prepare('DELETE FROM mobile_codes WHERE user_id=? OR expires_at<?').run(user.id,clock());db.prepare('INSERT INTO mobile_codes VALUES(?,?,?,?)').run(hash(code),user.id,expires,JSON.stringify(body.permissions));return {code,expiresAt:expires,url:publicUrl};}
 function pair(body){if(typeof body?.code!=='string'||!/^[A-F0-9]{10}$/i.test(body.code)||typeof body.name!=='string'||!body.name.trim()||body.name.length>60)throw new HttpError(400,'Enter the pairing code and a device name.');
  db.exec('BEGIN IMMEDIATE');try{const row=db.prepare('SELECT * FROM mobile_codes WHERE code_hash=? AND expires_at>?').get(hash(body.code.toUpperCase()),clock());if(!row)throw new HttpError(401,'Pairing code is invalid or expired.');
   const token=randomBytes(32).toString('hex'),id=randomUUID(),expires=clock()+30*86400000;db.prepare('INSERT INTO mobile_devices VALUES(?,?,?,?,?,?,?)').run(id,hash(token),row.user_id,body.name.trim(),row.permissions,expires,clock());db.prepare('DELETE FROM mobile_codes WHERE code_hash=?').run(row.code_hash);db.exec('COMMIT');storage.audit(row.user_id,'mobile.paired');return {token,device:{id,name:body.name.trim(),permissions:JSON.parse(row.permissions),expiresAt:expires}};
  }catch(e){db.exec('ROLLBACK');throw e;}}
 function identify(token,permission){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,'Pair this device first.');const row=db.prepare('SELECT * FROM mobile_devices WHERE token_hash=? AND expires_at>?').get(hash(token),clock());if(!row)throw new HttpError(401,'Device access expired or was revoked.');if(!JSON.parse(row.permissions).includes(permission))throw new HttpError(403,'This device does not have that permission.');return row;}
 return {status,code,pair,ready:()=>gatewayReady,setReady:value=>{gatewayReady=value;},setUrl:value=>{publicUrl=value;},
  tasks(token){const device=identify(token,'readTasks');return {tasks:(storage.all(device.user_id).tasks?.value||[]).map(({title,date,time,done,priority})=>({title,date,time,done,priority}))};},
  async chat(token,body){const device=identify(token,'chat');const user=db.prepare('SELECT id,name,email,demo FROM users WHERE id=?').get(device.user_id);return ai.chat(user,body,{...storage.all(user.id).preferences?.value,savedNotes:storage.all(user.id).notes?.value||[]});},
  revoke(user,body){if(typeof body?.id!=='string')throw new HttpError(400,'Choose a device.');db.prepare('DELETE FROM mobile_devices WHERE id=? AND user_id=?').run(body.id,user.id);db.prepare('DELETE FROM mobile_codes WHERE user_id=?').run(user.id);storage.audit(user.id,'mobile.revoked');return {ok:true};},
 };
}
