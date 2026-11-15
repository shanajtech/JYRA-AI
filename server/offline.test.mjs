import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeech} from './speech.mjs';
import {credential} from './gmail.mjs';
function pcm16k(wav){
 let at=12,rate=0,channels=0,bits=0,data;
 while(at+8<=wav.length){const name=wav.toString('ascii',at,at+4),size=wav.readUInt32LE(at+4);if(name==='fmt '){channels=wav.readUInt16LE(at+10);rate=wav.readUInt32LE(at+12);bits=wav.readUInt16LE(at+22);}if(name==='data')data=wav.subarray(at+8,at+8+size);at+=8+size+(size%2);}
 assert.equal(bits,16);assert.ok(rate&&data);const frames=data.length/(2*channels),count=Math.floor(frames*16000/rate),b=Buffer.alloc(44+count*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)b.writeInt16LE(data.readInt16LE(Math.floor(i*rate/16000)*channels*2),44+i*2);return b;
}
test('real offline Windows voice and Whisper transcription round trip',{skip:process.platform!=='win32',timeout:120000},async()=>{
 const speech=createSpeech();assert.equal(speech.status().recognition,true,'Run setup:speech before this check.');
 const result=await speech.synthesize({id:'offline-test'},{text:'Hello, this is a test of the local voice system.',profile:'male'});const wav=Buffer.from(result.audio.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.ok(wav.length>1000);
 const transcript=await speech.transcribe({id:'offline-test'},{audio:pcm16k(wav).toString('base64'),language:'en'});assert.match(transcript.text.toLowerCase(),/hello|local voice|test/);console.log('Offline speech transcript:',transcript.text);
});
test('Windows protects and unlocks a test-only credential',{skip:process.platform!=='win32'},async()=>{const text='test-only-not-a-real-password';const sealed=await credential('protect',text);assert.ok(!sealed.includes(text));assert.equal(await credential('unprotect',sealed),text);});
