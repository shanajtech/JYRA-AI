export function chatMemory(notes,profile){
 if(profile.privateSession)return [];
 const name=String(profile.name||'').trim().slice(0,80),nickname=String(profile.nickname||'').trim().slice(0,40);
 const identity=name?[{id:'00000000-0000-4000-8000-000000000001',title:'Your saved profile',body:`My name is ${name}.${nickname?` My preferred nickname is ${nickname}.`:''}`}]:[];
 return [...identity,...notes.slice(0,20-identity.length).map(n=>({...n,body:n.body.slice(0,600)}))];
}
