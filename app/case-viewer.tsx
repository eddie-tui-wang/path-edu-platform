"use client";
import {useRef,useState} from 'react';
import type {MouseEvent} from 'react';
import {Button} from './ui-button';

// Ported from the retired teaching-module viewer: same three-panel skeleton, same tool palette
// and the same click-to-mark behaviour. Recoloured to the current design system and simplified —
// marks live in memory only and are never persisted (D-50).
type Mark={id:number;type:'rect'|'circle'|'point';x:number;y:number;name:string;magnification:number};
type CaseItem={id:string;title:string;version:number;images:string[];organ?:string;difficulty?:string;library?:string;source?:string;history?:string;clinical?:Record<string,string>;simulated?:boolean};
const TOOLS=['平移','缩放','矩形','圆形','点标注','自由笔'];
const DISABLED:Record<string,string>={自由笔:'自由笔尚未实现',缩放:'请使用下方加减按钮缩放'};

export function CaseViewer({item}:{item:CaseItem}) {
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(1),[offset,setOffset]=useState({x:0,y:0});
  const [tool,setTool]=useState('平移'),[marks,setMarks]=useState<Mark[]>([]),[selected,setSelected]=useState<number|null>(null);
  const [notice,setNotice]=useState('');
  const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const stage=useRef<HTMLDivElement>(null);
  const clinical=Object.entries(item.clinical||{}).filter(([,text])=>text);
  const reset=()=>{setZoom(1);setOffset({x:0,y:0});};
  function addMark(event:MouseEvent<HTMLDivElement>) {
    if(!['矩形','圆形','点标注'].includes(tool)||!stage.current)return;
    const rect=stage.current.getBoundingClientRect();
    setMarks(list=>[...list,{id:Date.now(),type:tool==='矩形'?'rect':tool==='圆形'?'circle':'point',
      x:Math.max(5,Math.min(94,((event.clientX-rect.left)/rect.width)*100)),
      y:Math.max(6,Math.min(92,((event.clientY-rect.top)/rect.height)*100)),
      name:'关键视野 '+String(list.length+1).padStart(2,'0'),magnification:Math.round(zoom*20)}]);
  }
  function pan(event:React.KeyboardEvent<HTMLDivElement>) {
    if(event.target!==event.currentTarget)return;
    const step=24,keys:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
    const move=keys[event.key];
    if(move){event.preventDefault();setOffset(o=>({x:o.x+move[0],y:o.y+move[1]}));}
    if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(z=>Math.min(4,z+0.25));}
    if(event.key==='-'){event.preventDefault();setZoom(z=>Math.max(0.5,z-0.25));}
  }
  return <section className="case-viewer">
    <header className="case-viewer-bar">
      <div className="case-viewer-title"><b>{item.title}</b><small>病例 {item.id} · v{item.version}{item.simulated?' · 模拟病例，共用占位图':''}</small></div>
      <nav className="case-viewer-tools" aria-label="阅片工具">
        {TOOLS.map(name=><Button key={name} aria-pressed={tool===name} disabled={Boolean(DISABLED[name])} title={DISABLED[name]} onClick={()=>setTool(name)}>{name}</Button>)}
      </nav>
      <div className="case-viewer-meta"><span>{Math.round(zoom*100)}%</span><Button onClick={()=>{setMarks([]);setSelected(null);setNotice('已清除本次标注');}} disabled={!marks.length}>清除标注</Button></div>
    </header>
    <div className="case-viewer-body">
      <aside className="case-viewer-info">
        <h2>临床资料</h2>
        <dl><dt>教学编号</dt><dd>{item.id}</dd><dt>分类</dt><dd>{item.organ||'未提供'}</dd><dt>难度</dt><dd>{item.difficulty||'未提供'}</dd></dl>
        {clinical.length?clinical.map(([name,text])=><details key={name} open={name==='主诉'}><summary>{name}</summary><p>{text}</p></details>):<details open><summary>病史</summary><p>{item.history||'未提供病史'}</p></details>}
        <details><summary>资料来源</summary><p>{item.source||'未提供'}</p></details>
        <details><summary>本次标注（{marks.length}）</summary>
          {marks.length?<ul className="case-viewer-marks">{marks.map(m=><li key={m.id}><button type="button" onClick={()=>setSelected(m.id)}>{m.name}</button><small>{m.type==='rect'?'矩形':m.type==='circle'?'圆形':'点'} · 约 {m.magnification}×</small></li>)}</ul>:<p>尚未标注。选择矩形／圆形／点标注后在图片上点击。</p>}
          <p className="case-viewer-note">标注仅在本次浏览中保留，刷新或离开即清除，也不进入答卷。</p>
        </details>
      </aside>
      <main className="case-viewer-stage">
        {notice&&<p className="case-viewer-notice" role="status">{notice}</p>}
        <div ref={stage} className={'case-viewer-canvas tool-'+tool} tabIndex={0} role="region" aria-label="切片画布，方向键平移，加减键缩放" onKeyDown={pan}
          onPointerDown={e=>{if(tool!=='平移')return;drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(!drag.current)return;setOffset({x:drag.current.ox+e.clientX-drag.current.x,y:drag.current.oy+e.clientY-drag.current.y});}}
          onPointerUp={()=>{drag.current=null;}}
          onClick={addMark}>
          <div className="case-viewer-transform" style={{transform:'translate('+offset.x+'px, '+offset.y+'px) scale('+zoom+')'}}>
            <img src={item.images[index]} alt={item.title+'切片'} draggable={false}/>
            {marks.map((mark,i)=><button type="button" key={mark.id} className={'case-viewer-mark case-viewer-mark-'+mark.type+(selected===mark.id?' active':'')} style={{left:mark.x+'%',top:mark.y+'%'}} onClick={event=>{event.stopPropagation();setSelected(mark.id);}}><b>视野 {i+1}</b></button>)}
          </div>
        </div>
        <footer className="case-viewer-foot">
          {item.images.length>1&&<div className="case-viewer-thumbs">{item.images.map((src,i)=><button type="button" key={i} aria-pressed={i===index} aria-label={'切换到图片 '+(i+1)} style={{backgroundImage:'url('+src+')'}} onClick={()=>{setIndex(i);setOffset({x:0,y:0});}}/>)}</div>}
          <div className="case-viewer-zoom"><Button aria-label="缩小图片" disabled={zoom<=0.5} onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))}>−</Button><span>{Math.round(zoom*100)}%</span><Button aria-label="放大图片" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+0.25))}>＋</Button><Button onClick={reset}>复位视野</Button></div>
        </footer>
      </main>
    </div>
  </section>;
}
