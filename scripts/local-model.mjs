import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
export function selectModel(root,modelDir=resolve(root,'data/models')){
 const candidates=[['JYRA-offline-model.gguf','Offline model'],['Qwen_Qwen3-4B-Instruct-2507-Q4_K_M.gguf','Qwen3 4B · Multilingual'],['Qwen3-1.7B-Q8_0.gguf','Qwen3 1.7B'],['Qwen3-0.6B-Q8_0.gguf','Qwen3 0.6B']];
 for(const [filename,label]of candidates){const path=resolve(modelDir,filename);if(existsSync(path))return {path,filename,label};}return null;
}
