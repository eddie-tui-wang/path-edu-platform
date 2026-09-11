// Full-screen case browsing: the reader needs the height, and the 阅片助手 needs its own column.
// The shell mirrors the exam mode so both feel like the same product; marks stay in memory only
// (D-50) and the assistant is a labelled placeholder (see viewer-assistant.tsx).
"use client";
import {useState} from 'react';
import type {ReactNode} from 'react';
import {Button} from './ui-button';
import {SlideCanvas,type SlideMark} from './slide-canvas';
import {ViewerAssistant} from './viewer-assistant';

type CaseItem={id:string;title:string;version:number;images:string[];organ?:string;difficulty?:string;library?:string;source?:string;history?:string;clinical?:Record<string,string>;simulated?:boolean};

export function CaseViewer({item,onBack,favorited,onFavorite,canEdit,onEdit,children}:{item:CaseItem;onBack:()=>void;favorited?:boolean;onFavorite?:()=>void;canEdit?:boolean;onEdit?:()=>void;children?:ReactNode}) {
  const [marks,setMarks]=useState<SlideMark[]>([]);
  const [assistant,setAssistant]=useState(true);
  const clinical=Object.entries(item.clinical||{}).filter(([,text])=>text);
  return <section className="viewer-mode">
    <header className="viewer-mode-bar">
      <Button className="page-back" onClick={onBack}><span aria-hidden="true">←</span> 返回图书馆</Button>
      <div className="viewer-mode-title"><b>{item.title}</b><small>病例 {item.id} · v{item.version}{item.simulated?' · 模拟病例，共用占位图':''}</small></div>
      <div className="viewer-mode-actions"><span className="library-tag">{item.library} · v{item.version}</span>{item.simulated&&<span className="library-tag">模拟病例</span>}{onFavorite&&<Button onClick={onFavorite}>{favorited?'取消收藏':'收藏'}</Button>}{canEdit&&onEdit&&<Button onClick={onEdit}>编辑病例与参考</Button>}</div>
    </header>
    <div className="viewer-mode-body">
      <aside className="viewer-mode-left">
        <h2>临床资料</h2>
        <dl><dt>教学编号</dt><dd>{item.id}</dd><dt>分类</dt><dd>{item.organ||'未提供'}</dd><dt>难度</dt><dd>{item.difficulty||'未提供'}</dd></dl>
        {clinical.length?clinical.map(([name,text])=><details key={name} open={name==='主诉'}><summary>{name}</summary><p>{text}</p></details>):<details open><summary>病史</summary><p>{item.history||'未提供病史'}</p></details>}
        <details><summary>资料来源</summary><p>{item.source||'未提供'}</p></details>
        <details className="case-viewer-marks-panel"><summary>本次标注（{marks.length}）</summary>{marks.length?<ul className="case-viewer-marks">{marks.map(mark=><li key={mark.id}><span>{mark.name}</span><small>{mark.type==='rect'?'矩形':mark.type==='circle'?'圆形':'点'} · 约 {mark.magnification}×</small></li>)}</ul>:null}<p className="case-viewer-note">标注仅在本次浏览中保留，刷新或离开即清除，也不进入答卷。</p></details>
        {children}
      </aside>
      <div className="viewer-mode-center">
        <SlideCanvas images={item.images} alt={item.title} onMarksChange={setMarks}/>
        {!assistant&&<button className="viewer-assistant-fab" type="button" onClick={()=>setAssistant(true)}><span>AI</span>阅片助手</button>}
      </div>
      {assistant&&<ViewerAssistant onClose={()=>setAssistant(false)}/>}
    </div>
  </section>;
}
