import {Children,isValidElement,useEffect,useId,useRef,useState} from 'react';
import type {ReactNode,SelectHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,'onChange'|'multiple'> & {onChange?:(e:{target:{value:string};currentTarget:{value:string}})=>void};
type Choice={value:string;label:string;disabled:boolean};
function text(node:ReactNode):string{return Children.toArray(node).map(n=>typeof n==='string'||typeof n==='number'?String(n):isValidElement<{children?:ReactNode}>(n)?text(n.props.children):'').join('');}
function choices(node:ReactNode):Choice[]{return Children.toArray(node).flatMap(n=>{if(!isValidElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>(n))return [];if(n.type==='optgroup')return choices(n.props.children);return [{value:String(n.props.value??text(n.props.children)),label:text(n.props.children),disabled:!!n.props.disabled}];});}

export default function ThemedSelect({children,value,defaultValue,name,disabled,required,onChange,id,className,'aria-label':ariaLabel,...rest}:Props){
 const options=choices(children);
 const first=String(defaultValue??options[0]?.value??'');
 const [internal,setInternal]=useState(first),[open,setOpen]=useState(false),[active,setActive]=useState(0);
 const [position,setPosition]=useState({left:0,top:0,width:160,maxHeight:240,light:false});
 const button=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),typeahead=useRef(''),lastKey=useRef(0);
 const generated=useId(),menuId=generated+'-list';
 const current=String(value??internal),selected=options.findIndex(o=>o.value===current);
 const selectedOption=options[selected];
 useEffect(()=>{const form=button.current?.closest('form');const reset=()=>{if(value===undefined)setInternal(first);setOpen(false);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[first,value]);
 useEffect(()=>{
  if(!open)return;
  function layout(){const el=button.current;if(!el)return;const box=el.getBoundingClientRect();const height=Math.min(options.length*37+10,240);const below=window.innerHeight-box.bottom-10;const above=box.top-10;const up=below<height&&above>below;const maxHeight=Math.max(70,Math.min(240,up?above:below));const width=Math.min(Math.max(box.width,140),window.innerWidth-20);setPosition({left:Math.max(10,Math.min(box.left,window.innerWidth-width-10)),top:up?Math.max(8,box.top-Math.min(height,maxHeight)-5):box.bottom+5,width,maxHeight,light:!!el.closest('.light-theme,.fg-light')});}
  layout();
  function outside(e:PointerEvent){if(!button.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setOpen(false);}
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',layout);window.addEventListener('scroll',layout,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',layout);window.removeEventListener('scroll',layout,true);};
 },[open,options.length]);
 useEffect(()=>{if(open)menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active,open]);
 function choose(index:number){const option=options[index];if(!option||option.disabled)return;setInternal(option.value);onChange?.({target:{value:option.value},currentTarget:{value:option.value}});setOpen(false);button.current?.focus();}
 function start(){setActive(Math.max(0,selected));setOpen(true);}
 function move(direction:number){let index=active;for(let i=0;i<options.length;i++){index=(index+direction+options.length)%options.length;if(!options[index].disabled){setActive(index);return;}}}
 return <span className={'themed-select '+(className||'')}>
  {name&&<input type="hidden" name={name} value={current} disabled={disabled}/>}
  <button ref={button} id={id} className="themed-select-trigger" type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?menuId:undefined} aria-activedescendant={open?`${menuId}-${active}`:undefined} aria-required={required} disabled={disabled} title={rest.title} onClick={()=>open?setOpen(false):start()} onKeyDown={e=>{
   if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);return;}
   if(e.key==='Tab'){setOpen(false);return;}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open)start();else move(e.key==='ArrowDown'?1:-1);return;}
   if(e.key==='Home'||e.key==='End'){e.preventDefault();if(!open)start();setActive(e.key==='Home'?0:options.length-1);return;}
   if(e.key==='Enter'||e.key===' '){e.preventDefault();if(open)choose(active);else start();return;}
   if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();const now=Date.now();typeahead.current=now-lastKey.current<700?typeahead.current+e.key.toLowerCase():e.key.toLowerCase();lastKey.current=now;const index=options.findIndex(o=>!o.disabled&&o.label.toLowerCase().startsWith(typeahead.current));if(index>=0){setActive(index);setOpen(true);}}
  }}><span>{selectedOption?.label||'Choose an option'}</span><svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
  {open&&createPortal(<div ref={menu} id={menuId} role="listbox" aria-label={ariaLabel||'Options'} className={'themed-select-menu '+(position.light?'is-light':'')} style={{position:'fixed',left:position.left,top:position.top,width:position.width,maxHeight:position.maxHeight}}>{options.map((option,index)=><div key={option.value+'-'+index} id={`${menuId}-${index}`} data-index={index} role="option" aria-selected={option.value===current} aria-disabled={option.disabled} className={'themed-select-option '+(index===active?'highlighted ':'')+(option.value===current?'chosen':'')} onPointerMove={()=>{if(!option.disabled)setActive(index);}} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(index)}><span>{option.label}</span>{option.value===current&&<span aria-hidden="true">✓</span>}</div>)}</div>,document.body)}
 </span>;
}

