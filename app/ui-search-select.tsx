"use client";
import {useId,useRef,useState} from 'react';
import {Button} from './ui-button';

export function SearchSelect({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(value:string)=>void}){
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const choices=['',...options].filter(option=>!query||option.includes(query));
 function close(){setOpen(false);trigger.current?.focus();}
 function choose(option:string){onChange(option);close();}
 return <div className="search-select" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}}}>
  <span id={id+'-label'}>{label}</span>
  <button ref={trigger} type="button" className="ui-button select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-labelledby={id+'-label '+id+'-value'} title={value||'全部部位'} onClick={()=>{setOpen(!open);setQuery('');setActive(0);}}><span id={id+'-value'}>{value||'全部部位'}</span><span aria-hidden="true">▾</span></button>
  {open&&<div className="select-popover"><input autoFocus role="combobox" aria-label="搜索部位" aria-expanded="true" aria-controls={id} aria-autocomplete="list" aria-activedescendant={choices[active]!==undefined?id+'-'+active:undefined} value={query} placeholder="搜索部位" onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=Math.max(0,Math.min(choices.length-1,active+(e.key==='ArrowDown'?1:-1)));setActive(next);document.getElementById(id+'-'+next)?.scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&choices[active]!==undefined){e.preventDefault();choose(choices[active]);}}}/>
   <div id={id} role="listbox" aria-label={label}>{choices.map((option,i)=><div id={id+'-'+i} role="option" aria-selected={value===option} className={active===i?'focused':''} key={option} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(option)}>{option||'全部部位'}{value===option&&<span aria-hidden="true"> ✓</span>}</div>)}</div>
   {!choices.length&&<p role="status">没有匹配部位</p>}<Button onClick={close}>关闭</Button>
  </div>}
 </div>;
}
