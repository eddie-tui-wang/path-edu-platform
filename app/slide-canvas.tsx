// Shared slide canvas: pan, zoom, keyboard pan and click-to-mark, reused by the case browser and
// the exam. Extracted from the ported reader (D-50); marks stay in memory only, as before.
"use client";
import {useEffect,useRef,useState} from 'react';
import type {MouseEvent,ReactNode} from 'react';
import {Button} from './ui-button';

export type SlideMark={id:number;type:'rect'|'circle'|'point';x:number;y:number;name:string;magnification:number};
const TOOLS=['平移','缩放','矩形','圆形','点标注','自由笔'];
const DISABLED:Record<string,string>={自由笔:'自由笔尚未实现',缩放:'请使用下方加减按钮缩放'};

export type SeekRegion={id:string;x:number;y:number};

export function SlideCanvas({images,alt,onMarksChange,actions,focus,regions,activeRegion,visitedRegions}:{images:string[];alt?:string;onMarksChange?:(marks:SlideMark[])=>void;actions?:ReactNode;focus?:{x:number;y:number;zoom:number;token:number}|null;regions?:SeekRegion[];activeRegion?:string|null;visitedRegions?:string[]}) {
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(1),[offset,setOffset]=useState({x:0,y:0});
  const [tool,setTool]=useState('平移'),[marks,setMarks]=useState<SlideMark[]>([]),[notice,setNotice]=useState('');
  const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const stage=useRef<HTMLDivElement>(null);
  const transform=useRef<HTMLDivElement>(null);
  const publish=(next:SlideMark[])=>{setMarks(next);onMarksChange?.(next);};
  const reset=()=>{setZoom(1);setOffset({x:0,y:0});};
  // Guided review: bring an image point to the middle of the viewport at a given zoom. The
  // transform is applied about the element's own centre, so the offset that centres a point is
  // derived from the untransformed layout box rather than guessed from the current transform.
  useEffect(()=>{
    if(!focus)return;
    const el=transform.current,canvas=stage.current;
    if(!el||!canvas)return;
    const w=el.offsetWidth,h=el.offsetHeight;
    if(!w||!h)return;
    const cx=el.offsetLeft+w/2,cy=el.offsetTop+h/2;
    const px=el.offsetLeft+w*focus.x/100,py=el.offsetTop+h*focus.y/100;
    setZoom(focus.zoom);
    setOffset({x:canvas.clientWidth/2-cx-(px-cx)*focus.zoom,y:canvas.clientHeight/2-cy-(py-cy)*focus.zoom});
  },[focus]);

  function addMark(event:MouseEvent<HTMLDivElement>) {
    if(!['矩形','圆形','点标注'].includes(tool)||!stage.current)return;
    const rect=stage.current.getBoundingClientRect();
    publish([...marks,{id:Date.now(),type:tool==='矩形'?'rect':tool==='圆形'?'circle':'point',
      x:Math.max(5,Math.min(94,((event.clientX-rect.left)/rect.width)*100)),
      y:Math.max(6,Math.min(92,((event.clientY-rect.top)/rect.height)*100)),
      name:'关键视野 '+String(marks.length+1).padStart(2,'0'),magnification:Math.round(zoom*20)}]);
  }
  function pan(event:React.KeyboardEvent<HTMLDivElement>) {
    if(event.target!==event.currentTarget)return;
    const step=24,keys:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
    const move=keys[event.key];
    if(move){event.preventDefault();setOffset(o=>({x:o.x+move[0],y:o.y+move[1]}));}
    if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(z=>Math.min(4,z+0.25));}
    if(event.key==='-'){event.preventDefault();setZoom(z=>Math.max(0.5,z-0.25));}
  }
  if(!images.length)return <main className="case-viewer-stage"><p className="case-viewer-note">此病例未提供切片图片。</p></main>;
  return <main className="case-viewer-stage">
    {notice&&<p className="case-viewer-notice" role="status">{notice}</p>}
    <div className="case-viewer-float">
      <nav className="case-viewer-tools" aria-label="阅片工具">
        {TOOLS.map(name=><Button key={name} aria-pressed={tool===name} disabled={Boolean(DISABLED[name])} title={DISABLED[name]} onClick={()=>setTool(name)}>{name}</Button>)}
      </nav>
      <div className="case-viewer-meta"><span>{Math.round(zoom*100)}%</span><Button onClick={()=>{publish([]);setNotice('已清除本次标注');}} disabled={!marks.length}>清除标注</Button></div>
    </div>
    <div ref={stage} className={'case-viewer-canvas tool-'+tool} tabIndex={0} role="region" aria-label="切片画布，方向键平移，加减键缩放" onKeyDown={pan}
      onPointerDown={e=>{if(tool!=='平移')return;drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(!drag.current)return;setOffset({x:drag.current.ox+e.clientX-drag.current.x,y:drag.current.oy+e.clientY-drag.current.y});}}
      onPointerUp={()=>{drag.current=null;}}
      onClick={addMark}>
      <div ref={transform} className="case-viewer-transform" style={{transform:'translate('+offset.x+'px, '+offset.y+'px) scale('+zoom+')'}}>
        <img src={images[index]} alt={alt||'教学切片'} draggable={false}/>
        {regions?.map(region=><span key={region.id} className={'seek-mark'+(region.id===activeRegion?' active':'')+(visitedRegions?.includes(region.id)?' done':'')} style={{left:region.x+'%',top:region.y+'%'}}><b>{region.id}</b></span>)}
        {marks.map(mark=><button type="button" key={mark.id} className={'case-viewer-mark case-viewer-mark-'+mark.type} style={{left:mark.x+'%',top:mark.y+'%'}} title={mark.name+' · 约 '+mark.magnification+'×'} onClick={event=>event.stopPropagation()}/>)}
      </div>
    </div>
    <footer className="case-viewer-foot">
      {images.length>1&&<div className="case-viewer-thumbs">{images.map((src,i)=><button type="button" key={i} aria-pressed={i===index} aria-label={'切换到图片 '+(i+1)} style={{backgroundImage:'url('+src+')'}} onClick={()=>{setIndex(i);reset();}}/>)}</div>}
      <div className="case-viewer-zoom"><Button aria-label="缩小图片" disabled={zoom<=0.5} onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))}>−</Button><span>{Math.round(zoom*100)}%</span><Button aria-label="放大图片" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+0.25))}>＋</Button><Button onClick={reset}>复位视野</Button>{actions}</div>
    </footer>
  </main>;
}
