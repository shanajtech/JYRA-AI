export class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const bad=message=>{throw new HttpError(400,message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const string=(v,max,min=0)=>typeof v==='string'&&v.length>=min&&v.length<=max&&!v.includes('\0');
const boolean=v=>typeof v==='boolean';
const id=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'));
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const oneOf=values=>v=>values.includes(v);
const text=max=>v=>string(v,max);
function record(value,rules,required=Object.keys(rules)){
  if(!object(value))bad('Expected an object.');
  if(Object.keys(value).some(k=>!Object.hasOwn(rules,k)))bad('Unexpected field.');
  for(const key of required)if(!Object.hasOwn(value,key))bad(`Missing ${key}.`);
  for(const [key,v] of Object.entries(value))if(!rules[key](v))bad(`Invalid ${key}.`);
  return value;
}
const itemRules={
 conversations:{id,title:v=>string(v,80,1),updatedAt:v=>Number.isSafeInteger(v)&&v>0,messages:v=>Array.isArray(v)&&v.length<=24&&v.every(m=>{record(m,{role:oneOf(['user','assistant']),content:v=>string(v,4000,1)});return true;})},
 tasks:{id,title:v=>string(v,160,1),member:v=>string(v,60,1),date,time:v=>v===''||time(v),done:boolean,priority:oneOf(['Normal','High','Low'])},
 alarms:{startDate:v=>date(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,once:boolean,id,time,label:v=>string(v,500,1),enabled:boolean,repeat:v=>Number.isInteger(v)&&v>=1&&v<=10,days:v=>Array.isArray(v)&&v.length>=1&&v.length<=7&&new Set(v).size===v.length&&v.every(oneOf(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])),interval:oneOf([1,2,5,10]),snooze:oneOf([5,10,15]),language:oneOf(['English','বাংলা'])},
 notes:{id,title:v=>string(v,100,1),body:v=>string(v,2000,1)},
 people:{id,name:v=>string(v,60,1),greet:boolean,photos:v=>Array.isArray(v)&&v.length>=1&&v.length<=4&&v.every(p=>typeof p==='string'&&p.length<=450_000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))},
};
const preferences={name:text(80),nickname:text(40),language:oneOf(['English','বাংলা','Auto']),profile:oneOf(['female','male','child']),proactive:boolean,quietStart:time,quietEnd:time,quality:oneOf(['Lite','Balanced','Enhanced']),onlineVoice:boolean,privateSession:boolean,memoryRetention:text(80),sessionExpiry:text(80),theme:oneOf(['Dark','Light']),capabilities:v=>{record(v,{microphone:boolean,camera:boolean,screen:boolean,computer:boolean});return true;}};
export const collections=['preferences','tasks','alarms','members','notes','people','conversations'];
export function validateCollection(key,value){
  if(!collections.includes(key))throw new HttpError(404,'Unknown collection.');
  if(key==='preferences')return record(value,preferences,['name','nickname','language','profile','proactive','quietStart','quietEnd','quality']);
  if(!Array.isArray(value)||value.length>(['people','conversations'].includes(key)?50:500))bad('Invalid collection size.');
  if(key==='members'){
    if(!value.every(v=>string(v,60,1))||new Set(value.map(v=>v.toLowerCase())).size!==value.length)bad('Invalid member list.');
  }else{
    value.forEach(item=>{if(key==='alarms'&&item?.once===true&&!item.startDate)bad('A one-time reminder needs a start date.');return record(item,itemRules[key],key==='alarms'?['id','time','label','enabled','repeat']:Object.keys(itemRules[key]));});
    if(new Set(value.map(item=>item.id)).size!==value.length)bad('Duplicate item ID.');
  }
  return value;
}
export function credentials(body,signup=false){
  if(!object(body))bad('Invalid account details.');
  const allowed=signup?['name','email','password']:['email','password','remember'];
  if(Object.keys(body).some(k=>!allowed.includes(k)))bad('Unexpected account field.');
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(!string(email,254,3)||!/^\S+@[^@\s]+\.[^@\s]+$/.test(email))bad('Enter a valid email address.');
  if(!string(body.password,256,signup?12:1))bad('Use a password between 12 and 256 characters.');
  if(body.remember!==undefined&&!boolean(body.remember))bad('Invalid remember setting.');
  const name=typeof body.name==='string'?body.name.trim():'';
  if(signup&&!string(name,80,1))bad('Enter your name.');
  return {email,password:body.password,name,remember:!!body.remember};
}

