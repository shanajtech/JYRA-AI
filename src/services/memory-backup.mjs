export function parseMemoryBackup(text){
 if(typeof text!=='string'||text.length>1500000)throw new Error('Choose a memory backup smaller than 1.5 MB.');let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('This file is not valid JSON.');}
 if(data?.format!=='jyra-memory'||data.version!==1||!Array.isArray(data.notes)||data.notes.length>500)throw new Error('Choose a JYRA memory backup (version 1, at most 500 memories).');
 return data.notes.map(n=>{if(!n||typeof n.title!=='string'||!n.title.trim()||n.title.length>100||typeof n.body!=='string'||!n.body.trim()||n.body.length>2000||/\0/.test(n.title+n.body))throw new Error('This backup contains an invalid memory. Nothing was imported.');return {title:n.title.trim(),body:n.body.trim()};});
}
export function mergeMemories(existing,incoming,makeId){const result=existing.map(n=>({...n})),bodies=new Set(existing.map(n=>n.body.trim()));for(const note of incoming){if(bodies.has(note.body.trim()))continue;if(result.length>=500)throw new Error('This import would exceed 500 memories. Nothing was imported.');result.push({id:makeId(),title:note.title,body:note.body});bodies.add(note.body.trim());}return result;}

