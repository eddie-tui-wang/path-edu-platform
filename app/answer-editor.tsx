"use client";
import {useRef,useState,type RefObject} from 'react';
import {Button} from './ui-button';
import {formatAnswer} from '../lib/answer-text.mjs';

export function AnswerEditor({value,onChange,label,disabled=false,inputRef,maxLength=20000}:{value:string;onChange:(value:string)=>void;label:string;disabled?:boolean;inputRef?:RefObject<HTMLTextAreaElement|null>;maxLength?:number}){
 const ownRef=useRef<HTMLTextAreaElement>(null),input=inputRef||ownRef;
 // ponytail: undo retains the last 100 in-page edits; persisted answers are independent of this history.
 const [past,setPast]=useState<string[]>([]),[future,setFuture]=useState<string[]>([]),[error,setError]=useState('');
 function edit(next:string){if(disabled)return;setPast(p=>[...p,value].slice(-100));setFuture([]);setError('');onChange(next);}
 function restore(back:boolean){if(disabled)return;const stack=back?past:future,next=stack.at(-1);if(next===undefined)return;if(back){setPast(past.slice(0,-1));setFuture([...future,value]);}else{setFuture(future.slice(0,-1));setPast([...past,value]);}setError('');onChange(next);input.current?.focus();}
 function format(kind:string){const el=input.current;if(!el||disabled)return;try{edit(formatAnswer(value,el.selectionStart,el.selectionEnd,kind,maxLength));requestAnimationFrame(()=>el.focus());}catch(e){setError((e as Error).message);}}
 return <div className="answer-editor">{!disabled&&<><div className="question-actions" aria-label="简答文本工具"><Button onClick={()=>format('bold')}>加粗标记</Button><Button onClick={()=>format('list')}>列表标记</Button><Button disabled={!past.length} onClick={()=>restore(true)}>撤销</Button><Button disabled={!future.length} onClick={()=>restore(false)}>重做</Button></div><small>纯文本；加粗和列表以文字标记保存。</small></>}
 <textarea ref={input} aria-label={label} maxLength={maxLength} readOnly={disabled} value={value} onChange={e=>edit(e.target.value)} onKeyDown={e=>{if(!disabled&&!e.nativeEvent.isComposing&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(!e.shiftKey);}}} placeholder="填写诊断、鉴别及辅助检查思路"/>
 {error&&<p role="alert" className="account-error">{error}</p>}</div>;
}
