import {HttpError} from './validation.mjs';
export function validateWave(body){
 if(typeof body?.audio!=='string'||body.audio.length>900000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)||!['en','bn','auto'].includes(body.language))throw new HttpError(400,'Record up to 20 seconds in English or Bangla.');
 const b=Buffer.from(body.audio,'base64');
 if(b.length<3244||b.length>640044||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.toString('ascii',12,16)!=='fmt '||b.readUInt32LE(16)!==16||b.readUInt16LE(20)!==1||b.readUInt16LE(22)!==1||b.readUInt32LE(24)!==16000||b.readUInt32LE(28)!==32000||b.readUInt16LE(32)!==2||b.readUInt16LE(34)!==16||b.toString('ascii',36,40)!=='data'||b.readUInt32LE(40)!==b.length-44||b.readUInt32LE(4)!==b.length-8||(b.length-44)%2)throw new HttpError(400,'Use a mono 16 kHz PCM recording from the microphone button.');
 return b;
}
