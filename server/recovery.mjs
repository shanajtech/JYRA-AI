import {randomBytes,createHash,scrypt as callback} from 'node:crypto';
import {promisify} from 'node:util';
import {HttpError} from './validation.mjs';
const scrypt=promisify(callback),digest=code=>createHash('sha256').update(code).digest('hex');
export function createRecovery(storage){
 const db=storage.db;db.exec('CREATE TABLE IF NOT EXISTS recovery_codes(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL);');
 return {
  issue(user){if(user.demo)throw new HttpError(403,'Recovery codes are only for registered local accounts.');const code=randomBytes(32).toString('hex');db.prepare('INSERT INTO recovery_codes VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash').run(user.id,digest(code));storage.audit(user.id,'recovery.generated');return {code};},
  async reset(body){if(!body||typeof body.email!=='string'||body.email.length>254||typeof body.code!=='string'||!/^[a-f0-9]{64}$/.test(body.code)||typeof body.password!=='string'||body.password.length<12||body.password.length>256||Object.keys(body).some(k=>!['email','code','password'].includes(k)))throw new HttpError(400,'Enter your email, 64-character recovery code and a new password of at least 12 characters.');
   const row=db.prepare('SELECT u.id,r.code_hash FROM users u JOIN recovery_codes r ON r.user_id=u.id WHERE u.email=? AND u.demo=0 AND r.code_hash=?').get(body.email.trim().toLowerCase(),digest(body.code));if(!row)throw new HttpError(401,'Recovery details are invalid.');
   const salt=randomBytes(16).toString('hex'),hash=(await scrypt(body.password,salt,64)).toString('hex');db.exec('BEGIN IMMEDIATE');try{
    const removed=db.prepare('DELETE FROM recovery_codes WHERE user_id=? AND code_hash=?').run(row.id,row.code_hash);if(!removed.changes)throw new HttpError(401,'Recovery code has already been used.');
    db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,hash,row.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);db.prepare('DELETE FROM mobile_devices WHERE user_id=?').run(row.id);db.prepare('DELETE FROM mobile_codes WHERE user_id=?').run(row.id);storage.audit(row.id,'password.recovered');db.exec('COMMIT');return {ok:true};
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
 };
}
