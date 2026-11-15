import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {HttpError} from './validation.mjs';
const scrypt=promisify(scryptCallback);
const digest=value=>createHash('sha256').update(value).digest('hex');
export function openDatabase(path){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT NOT NULL,salt TEXT,password_hash TEXT,demo INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS documents(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,collection TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,collection));
    CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,action TEXT NOT NULL,collection TEXT,created_at INTEGER NOT NULL);
    PRAGMA user_version=1;`);
  const publicUser=row=>row?{id:row.id,name:row.name,email:row.email,demo:!!row.demo}:null;
  function audit(userId,action,collection=null){
    db.prepare('INSERT INTO activity(user_id,action,collection,created_at) VALUES(?,?,?,?)').run(userId,action,collection,Date.now());
    db.prepare('DELETE FROM activity WHERE user_id=? AND id NOT IN (SELECT id FROM activity WHERE user_id=? ORDER BY id DESC LIMIT 1000)').run(userId,userId);
  }
  async function register({name,email,password}){
    const salt=randomBytes(16).toString('hex');
    const hash=(await scrypt(password,salt,64)).toString('hex');
    const user={id:randomUUID(),email,name,demo:false};
    try{db.prepare('INSERT INTO users(id,email,name,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)').run(user.id,email,name,salt,hash,Date.now());}
    catch(error){if((Number(error.errcode)&255)===19||String(error.code).startsWith('ERR_SQLITE_CONSTRAINT'))throw new HttpError(409,'Cannot create an account with those details.');throw error;}
    audit(user.id,'account.created');return user;
  }
  async function login({email,password}){
    const row=db.prepare('SELECT * FROM users WHERE email=? AND demo=0').get(email);
    const hash=await scrypt(password,row?.salt||'nonexistent-local-account',64);
    const expected=Buffer.from(row?.password_hash||'00'.repeat(64),'hex');
    if(!timingSafeEqual(hash,expected)||!row)throw new HttpError(401,'Email or password is incorrect.');
    audit(row.id,'account.login');return publicUser(row);
  }
  function createDemo(){const user={id:randomUUID(),email:null,name:'Demo',demo:true};db.prepare('INSERT INTO users(id,email,name,demo,created_at) VALUES(?,?,?,1,?)').run(user.id,null,user.name,Date.now());return user;}
  function session(user,remember=false){
    const token=randomBytes(32).toString('hex');
    const duration=remember?7*86400_000:12*3600_000;
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(token),user.id,Date.now()+duration);
    return {token,maxAge:remember?Math.floor(duration/1000):null};
  }
  function identify(token){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return publicUser(db.prepare('SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now()));}
  function logout(token){if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
  function expiry(token){return db.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').get(digest(token))?.expires_at||null;}
  function setExpiry(token,minutes){if(![30,120,720,10080].includes(minutes))throw new HttpError(400,'Choose 30 minutes, 2 hours, 12 hours or 7 days.');const expires=Date.now()+minutes*60000;db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(expires,digest(token));return expires;}
  function all(userId){return Object.fromEntries(db.prepare('SELECT collection,payload,version FROM documents WHERE user_id=?').all(userId).map(r=>[r.collection,{value:JSON.parse(r.payload),version:r.version}]));}
  function write(userId,key,value,expected){
    db.exec('BEGIN IMMEDIATE');
    try{
      const previous=db.prepare('SELECT version FROM documents WHERE user_id=? AND collection=?').get(userId,key);
      const current=previous?.version||0;
      if(current!==expected)throw new HttpError(409,'Data changed in another window. Reload before saving again.');
      const version=current+1;
      db.prepare('INSERT INTO documents(user_id,collection,payload,version,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,collection) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at').run(userId,key,JSON.stringify(value),version,Date.now());
      audit(userId,'data.saved',key);db.exec('COMMIT');return version;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return {db,register,login,createDemo,session,identify,logout,expiry,setExpiry,all,write,audit,activity:userId=>db.prepare('SELECT action,collection,created_at FROM activity WHERE user_id=? ORDER BY id DESC LIMIT 40').all(userId),close:()=>db.close()};
}
