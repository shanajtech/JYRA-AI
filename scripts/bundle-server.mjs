import {build} from 'esbuild';
import {resolve} from 'node:path';
export async function bundleServer(output){await build({entryPoints:['server/server.mjs'],outfile:resolve(output),platform:'node',target:'node24',format:'esm',bundle:true,sourcemap:false,banner:{js:"import {createRequire as zyraCreateRequire} from 'node:module'; const require=zyraCreateRequire(import.meta.url);"},logLevel:'warning'});}
if(process.argv[2])await bundleServer(process.argv[2]);
