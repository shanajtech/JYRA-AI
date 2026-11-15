import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {CompanionId} from './companionProfiles';
import {portrait} from './figma/assets';

// The original Figma portrait stays unchanged on disk. This is a subtle 2D
// performance driven by real audio amplitude, not a phoneme/3D facial rig.
export default function AnimatedAvatar({level,speaking}:{level:RefObject<number>;profile:CompanionId;speaking:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),active=useRef(speaking);
 useEffect(()=>{active.current=speaking;},[speaking]);
 useEffect(()=>{
  const target=canvas.current,ctx=target?.getContext('2d');if(!target||!ctx)return;
  const base=new Image();let frame=0,stopped=false,nextBlink=performance.now()+5500,blinkAt=-10000,last=0,open=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  base.onload=()=>{
   target.width=base.naturalWidth;target.height=base.naturalHeight;
   const w=target.width,h=target.height;
   function eyelid(x:number,y:number,ew:number,eh:number,closure:number){
    if(closure<=.01)return;
    const px=x*w,py=y*h,pw=ew*w,ph=eh*h;
    ctx!.save();ctx!.beginPath();ctx!.ellipse(px+pw/2,py+ph/2,pw/2,ph/2,0,0,Math.PI*2);ctx!.clip();
    // Pull nearby upper-lid pixels down; no separate identity/expression image.
    const cover=ph*closure;
    ctx!.drawImage(base,px,py-ph*.48,pw,ph*.48,px,py,pw,cover);
    if(closure>.7){ctx!.strokeStyle='rgba(72,49,46,.55)';ctx!.lineWidth=Math.max(1,w*.0012);ctx!.beginPath();ctx!.moveTo(px,py+cover);ctx!.quadraticCurveTo(px+pw*.5,py+cover+ph*.12,px+pw,py+cover);ctx!.stroke();}
    ctx!.restore();
   }
   function render(now:number){
    if(stopped)return;frame=requestAnimationFrame(render);if(now-last<33)return;last=now;
    const disable=reduced.matches||localStorage.getItem('zyra.reducedMotion')==='true';
    if(now>nextBlink){blinkAt=now;nextBlink=now+5000+Math.random()*4500;}
    const t=now-blinkAt,ease=(v:number)=>v*v*(3-2*v);
    const blink=disable?0:t<105?ease(Math.max(0,t)/105):t<155?1:t<330?1-ease((t-155)/175):0;
    const desired=!disable&&active.current?Math.min(1,Math.max(0,(level.current-.025)*2.4)):0;
    open+=(desired-open)*.22;
    ctx!.drawImage(base,0,0,w,h);
    eyelid(.365,.349,.095,.030,blink);eyelid(.550,.348,.085,.030,blink);
    if(open>.015){
     const x=.424*w,y=.516*h,mw=.157*w,mh=.023*h,shift=open*.007*h;
     ctx!.save();ctx!.beginPath();ctx!.ellipse(x+mw/2,y,mw*.47,Math.max(.3,shift*.65),-.018,0,Math.PI*2);ctx!.fillStyle='#35201f';ctx!.fill();ctx!.restore();
     // Move only the lower-lip strip, softly blending its edges.
     ctx!.save();ctx!.globalAlpha=Math.min(.9,open*1.8);ctx!.beginPath();ctx!.ellipse(x+mw/2,y+mh*.55,mw*.55,mh,0,0,Math.PI*2);ctx!.clip();ctx!.drawImage(base,x,y,mw,mh,x,y+shift,mw,mh);ctx!.restore();
    }
   }
   frame=requestAnimationFrame(render);
  };
  base.src=portrait;
  return()=>{stopped=true;cancelAnimationFrame(frame);};
 },[level]);
 return <canvas ref={canvas} className="animated-avatar" width={928} height={1152} role="img" aria-label="JYRA companion portrait"/>;
}

