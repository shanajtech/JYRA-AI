import {selectModel} from './local-model.mjs';
import {copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),model=selectModel(root);
if(!model)throw new Error('Prepare an offline model before packaging.');
const folder=resolve(root,'src-tauri/target/release/bundle/nsis');
await mkdir(folder,{recursive:true});
await copyFile(model.path,resolve(folder,'JYRA-offline-model.gguf'));
console.log('Offline model packaged alongside setup. Keep both files together.');
