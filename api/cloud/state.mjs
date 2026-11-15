import {HttpError} from '../../server/validation.mjs';
import {createCloudServices,send,originCheck,readJSON,safeError} from '../../server/cloud/services.mjs';
import {createVault} from '../../server/cloud/vault.mjs';
export function createStateHandler({env=process.env,services=createCloudServices({env}),vault=createVault(services,env)}={}){return async(req,res)=>{try{
 if(req.method==='GET'){let connected=false;try{services.session(req,res);connected=true;}catch{}return send(res,200,{configured:services.config.storage,connected,retentionDays:90});}
 if(req.method!=='POST')return send(res,405,{error:'Use GET or POST.'});originCheck(req);const body=await readJSON(req,1700000);if(!['connect','read','write','code','restore'].includes(body.action)||Object.keys(body).some(k=>!['action','consent','version','notes','conversations','code'].includes(k)))throw new HttpError(400,'Invalid cloud backup request.');if(!services.config.storage)throw new HttpError(503,'The owner is preparing encrypted cloud backup. Local memory remains available.');
 if(body.action==='connect'){if(body.consent!==true)throw new HttpError(400,'Choose whether to enable cloud backup first.');const user=services.session(req,res,true);await services.consume(req,user,'session');return send(res,200,{connected:true});}
 const user=services.session(req,res);await services.consume(req,user,'sync');
 if(body.action==='read')return send(res,200,await vault.read(user));
 if(body.action==='write'){if(body.consent!==true)throw new HttpError(400,'Cloud upload requires your explicit choice.');return send(res,200,await vault.write(user,body));}
 if(body.action==='code')return send(res,200,await vault.pairingCode(user));
 if(body.action==='restore'){if(body.consent!==true)throw new HttpError(400,'Choose to link this browser before continuing.');const target=await vault.restore(body.code);services.issueSession(res,target.id);return send(res,200,await vault.read(target));}
 }catch(error){safeError(res,error);}};}
export default createStateHandler();
