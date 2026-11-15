import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HttpError} from './validation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const spokenText=text=>text.replace(/\b[ZJ][\s.-]*Y[\s.-]*R[\s.-]*A\b/gi,'Jyra');
function run(executable,args,{input,signal,timeout=90000}={}){return new Promise((resolve,reject)=>{
 const child=spawn(executable,args,{windowsHide:true,stdio:['pipe','ignore','pipe']});let error='';
 const timer=setTimeout(()=>child.kill(),timeout),abort=()=>child.kill();signal?.addEventListener('abort',abort,{once:true});
 child.stderr.on('data',b=>{if(error.length<2000)error+=b.toString();});child.stdin.on('error',()=>{});child.stdin.end(input||'');
 child.on('error',reject);child.on('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);code===0?resolve():reject(new Error('Speech process failed'));});
});}
export function validateWave(body){
 if(typeof body?.audio!=='string'||body.audio.length>900000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)||!['en','bn'].includes(body.language))throw new HttpError(400,'Record up to 20 seconds in English or Bangla.');
 const b=Buffer.from(body.audio,'base64');
 if(b.length<3244||b.length>640044||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.toString('ascii',12,16)!=='fmt '||b.readUInt32LE(16)!==16||b.readUInt16LE(20)!==1||b.readUInt16LE(22)!==1||b.readUInt32LE(24)!==16000||b.readUInt32LE(28)!==32000||b.readUInt16LE(32)!==2||b.readUInt16LE(34)!==16||b.toString('ascii',36,40)!=='data'||b.readUInt32LE(40)!==b.length-44||b.readUInt32LE(4)!==b.length-8||(b.length-44)%2)throw new HttpError(400,'Use a mono 16 kHz PCM recording from the microphone button.');
 return b;
}
export function createSpeech(){
 const busy=new Set();
 const binary=[join(root,'runtime/whisper/Release/whisper-cli.exe'),join(root,'runtime/whisper/whisper-cli.exe')].find(existsSync),model=join(process.env.ZYRA_MODELS_DIR||join(root,'data/models'),'ggml-base.bin');
 async function work(user,task){if(busy.has(user.id)||busy.size>=2)throw new HttpError(429,'Speech is busy. Please wait.');busy.add(user.id);let dir;try{dir=await mkdtemp(join(tmpdir(),'zyra-speech-'));return await task(dir);}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(503,'Local speech is unavailable. Check Windows voices and the offline speech setup.');}finally{busy.delete(user.id);if(dir)await rm(dir,{recursive:true,force:true});}}
 return {
  status:()=>({recognition:!!binary&&existsSync(model),speech:process.platform==='win32',local:true}),
  synthesize:(user,body,signal)=>work(user,async dir=>{
   if(typeof body?.text!=='string'||!body.text.trim()||body.text.length>2000||!['female','male','child'].includes(body.profile))throw new HttpError(400,'Enter up to 2000 characters and choose a companion.');
   if(process.platform!=='win32')throw new HttpError(503,'Windows speech voices are required.');
   if(body.online===true){
    const executable=join(root,'runtime/python/python.exe');if(!existsSync(executable))throw new HttpError(503,'Online voice runtime is not installed.');
    const output=join(dir,'reply.mp3');await run(executable,[join(root,'scripts/online-speech.py'),output],{input:JSON.stringify({text:body.text}),signal,timeout:35000});const audio=await readFile(output);if(audio.length>12000000)throw new Error('Audio too large');return {audio:'data:audio/mpeg;base64,'+audio.toString('base64'),voice:'Microsoft online female voice',local:false};
   }
   if(/[\u0980-\u09ff\u0900-\u097f\u0600-\u06ff]/.test(body.text))throw new HttpError(503,'Enable online multilingual voice in Personalization to hear this language.');
   const output=join(dir,'reply.wav');await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'scripts/speak.ps1'),'-OutputPath',output],{input:JSON.stringify({...body,text:spokenText(body.text),profile:'female'}),signal});
   const wav=await readFile(output);if(wav.length>12000000)throw new Error('Audio too large');return {audio:'data:audio/wav;base64,'+wav.toString('base64'),voice:'Installed Windows voice',local:true};
  }),
  transcribe:(user,body,signal)=>work(user,async dir=>{
   const audio=validateWave(body);if(!binary||!existsSync(model))throw new HttpError(503,'Offline speech model is missing. Run npm run setup:speech first.');
   const input=join(dir,'input.wav'),output=join(dir,'transcript');await writeFile(input,audio);
   await run(binary,['-m',model,'-f',input,'-l',body.language,'-otxt','-of',output,'-nt','-np','-t','4'],{signal});
   const text=(await readFile(output+'.txt','utf8')).trim().replace(/\[.*?\]/g,'').trim();return {text,local:true};
  }),
 };
}
