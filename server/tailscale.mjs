import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import {HttpError} from './validation.mjs';
const execute=promisify(execFile),binary='C:/Program Files/Tailscale/tailscale.exe',port=8443;
async function call(args){try{return (await execute(binary,args,{windowsHide:true,timeout:30000,maxBuffer:1024*1024})).stdout;}catch{throw new HttpError(503,'Open Tailscale, sign in yourself, and enable HTTPS for your own account before retrying.');}}
export async function inspectTailscale(){
 if(!existsSync(binary))throw new HttpError(503,'Install official Tailscale on this PC and your phone, then sign in to the same private account.');
 const status=JSON.parse(await call(['status','--json'])),name=status.Self?.DNSName?.replace(/\.$/,'');if(status.BackendState!=='Running'||!name||!/^[a-z0-9.-]+\.ts\.net$/i.test(name))throw new HttpError(503,'Sign in to Tailscale and connect this PC first.');
 const config=JSON.parse(await call(['serve','status','--json']))||{},web=config.Web?.[`${name}:${port}`],tcp=config.TCP?.[String(port)];
 if((tcp||web)&&(!web||Object.keys(web.Handlers||{}).length!==1||web.Handlers?.['/']?.Proxy!=='http://127.0.0.1:4431'))throw new HttpError(409,'Another Tailscale service already uses port 8443. It was not changed.');
 return {ZYRA_MOBILE_PUBLIC_URL:`https://${name}:${port}`,ZYRA_MOBILE_BEHIND_TRUSTED_PROXY:'1',ZYRA_MOBILE_PORT:'4431'};
}
export async function activateTailscale(){await call(['serve','--bg',`--https=${port}`,'http://127.0.0.1:4431']);}
