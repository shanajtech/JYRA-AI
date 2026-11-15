import {useEffect,useRef} from 'react';
export function useDialogFocus(open:boolean,onClose:()=>void){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const dialogs=document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
  const dialog=dialogs[dialogs.length-1];if(!dialog)return;
  const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  const frame=requestAnimationFrame(()=>{(focusable()[0]||dialog).focus();});
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){if(dialog?.querySelector('[role="combobox"][aria-expanded="true"]'))return;e.preventDefault();e.stopPropagation();close.current();return;}
   if(e.key!=='Tab')return;
   const items=focusable(),first=items[0],last=items[items.length-1];
   if(!first){e.preventDefault();dialog.focus();return;}
   if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',key,true);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus();};
 },[open]);
}
