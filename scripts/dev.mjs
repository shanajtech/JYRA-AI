import {selectModel} from './local-model.mjs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
process.env.ZYRA_LOCAL_AI_KEY=randomBytes(32).toString('hex');
const selection=selectModel(root);process.env.ZYRA_MODEL_LABEL=selection?.label||'Local Qwen3';
const children=[spawn(process.execPath,['server/server.mjs'],{cwd:root,stdio:'inherit',windowsHide:true}),spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','1430','--strictPort'],{cwd:root,stdio:'inherit',windowsHide:true})];
const executable=resolve(root,'runtime/llama/llama-server.exe');
if(existsSync(executable)&&selection)children.push(spawn(executable,['-m',selection.path,'--host','127.0.0.1','--port','11434','-c','4096','-t','4','-np','1','--log-disable','--cors-origins','localhost'],{cwd:root,env:{...process.env,LLAMA_API_KEY:process.env.ZYRA_LOCAL_AI_KEY},stdio:'inherit',windowsHide:true}));
else console.log('Local AI files missing. Follow README to prepare the model; the rest of ZYRA can run.');
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;children.forEach(child=>child.kill());setTimeout(()=>process.exit(code),300).unref();}
children.forEach(child=>{child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>stop(code||0));});
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
