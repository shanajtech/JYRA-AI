import {selectModel} from './local-model.mjs';
import {cp,mkdir,statfs,access,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {bundleServer} from './bundle-server.mjs';
const root=process.cwd(),out=resolve(root,'src-tauri/resources');
const selection=selectModel(root);if(!selection)throw new Error('Prepare the offline chat model first.');
const disk=await statfs(root);if(disk.bavail*disk.bsize<12*1024**3)throw new Error('Free at least 12 GB before staging the offline desktop resources; 20 GB is recommended before installing build tools.');
for(const item of ['dist/index.html','runtime/llama/llama-server.exe','runtime/whisper/Release/whisper-cli.exe','data/models/ggml-base.bin'])await access(resolve(root,item));
await mkdir(resolve(out,'server'),{recursive:true});await mkdir(resolve(out,'scripts'),{recursive:true});await mkdir(resolve(out,'models'),{recursive:true});
await bundleServer(resolve(out,'server/server.mjs'));
for(const folder of ['dist','runtime/llama','runtime/whisper'])await cp(resolve(root,folder),resolve(out,folder),{recursive:true});
await cp(process.execPath,resolve(out,'node.exe'));
for(const file of ['desktop.mjs','local-model.mjs','speak.ps1','credential.ps1','online-speech.py'])await cp(resolve(root,'scripts',file),resolve(out,'scripts',file));
// Optional prepared Python speech runtime: no credentials or user data.
for(const folder of ['python','voice-deps']){try{await access(resolve(root,'runtime',folder));}catch{continue;}await cp(resolve(root,'runtime',folder),resolve(out,'runtime',folder),{recursive:true});}
for(const file of [selection.filename,'ggml-base.bin'])await cp(resolve(root,'data/models',file),resolve(out,'models',file));
await writeFile(resolve(out,'PACKAGING-NOTE.txt'),'Explicitly copied runtime/model assets only. No database, sessions, Gmail credentials, .env or browser cache are included.\n');
console.log('Offline desktop resources prepared. Native Rust compilation is still required.');
