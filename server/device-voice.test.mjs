import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDeviceVoice,spokenText} from '../src/services/device-voice.mjs';
const english={name:'Microsoft Zira',lang:'en-US',localService:true};
test('device speech excludes remote, wrong-language and unidentified voices',()=>{
 assert.equal(selectDeviceVoice([english],'Hello'),english);
 assert.equal(selectDeviceVoice([english],'আমি জায়রা'),null);
 assert.equal(selectDeviceVoice([{...english,localService:false}],'Hello'),null);
 assert.equal(selectDeviceVoice([{...english,name:'Microsoft David'}],'Hello'),null);
 assert.equal(selectDeviceVoice([english],'مرحبا'),null);
 const bengali={name:'Tanishaa',lang:'bn-IN',localService:true};
 assert.equal(selectDeviceVoice([english,bengali],'আমি জায়রা'),bengali);
});
test('spoken name expands pronunciation without changing displayed branding',()=>{
 assert.equal(spokenText('Hi, I am JYRA.'),'Hi, I am Jaira.');
 assert.equal(spokenText('আমি JYRA।'),'আমি জায়রা।');
 assert.equal(spokenText('x'.repeat(3000)).length,2000);
});
