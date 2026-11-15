import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCollection} from './validation.mjs';
import {openDatabase} from './database.mjs';
const preferences={name:'Test',nickname:'Test',language:'English',profile:'female',proactive:false,quietStart:'22:00',quietEnd:'07:00',quality:'Balanced'};
test('capability choices persist per account without enabling unselected capabilities',()=>{
 const storage=openDatabase(':memory:');try{const user=storage.createDemo(),other=storage.createDemo();const value={...preferences,capabilities:{microphone:false,camera:true,screen:false,computer:false}};validateCollection('preferences',value);storage.write(user.id,'preferences',value,0);assert.deepEqual(storage.all(user.id).preferences.value.capabilities,value.capabilities);assert.equal(storage.all(other.id).preferences,undefined);}finally{storage.close();}
});
test('capability choices reject malformed or broader permission fields and support older preferences',()=>{
 assert.doesNotThrow(()=>validateCollection('preferences',preferences));
 for(const capabilities of [{microphone:'yes',camera:false,screen:false,computer:false},{microphone:false},{microphone:false,camera:false,screen:false,computer:false,passwords:true}])assert.throws(()=>validateCollection('preferences',{...preferences,capabilities}));
});
