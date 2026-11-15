export async function createFaceEngine(){
 const {default:Human}=await import('@vladmandic/human');
 const human=new Human({backend:'webgl',modelBasePath:'/models/human/',cacheModels:false,async:false,debug:false,filter:{enabled:false},gesture:{enabled:false},face:{enabled:true,detector:{maxDetected:5,minConfidence:.65,rotation:true,skipFrames:0},mesh:{enabled:false},iris:{enabled:false},emotion:{enabled:false},description:{enabled:true,skipFrames:0},antispoof:{enabled:false},liveness:{enabled:false},gear:{enabled:false}},body:{enabled:false},hand:{enabled:false},object:{enabled:false},segmentation:{enabled:false}});
 try{await human.load();return human;}catch(e){human.models.reset();throw e;}
}
