// Full-screen case browsing: the reader needs the height, and the 阅片助手 needs its own column.
// The shell mirrors the exam mode so both feel like the same product; marks stay in memory only
// (D-50) and the assistant is a labelled placeholder (see viewer-assistant.tsx).
"use client";
import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {Button} from './ui-button';
import {SlideCanvas,type SlideMark} from './slide-canvas';
import {ViewerAssistant} from './viewer-assistant';

type CaseItem={id:string;title:string;version:number;images:string[];organ?:string;difficulty?:string;library?:string;source?:string;history?:string;clinical?:Record<string,string>;simulated?:boolean};
export type SeekRegion={id:string;round:number;title:string;detail:string;x:number;y:number;zoom:number};

// SlideSeek: a SCRIPTED guided tour, not an agent. The regions describe a reading routine —
// low power first, then high power — and never assert what the tissue shows. The research
// prototype this is ported from hard-coded findings ("腺体融合", "可疑浸润前沿"); those would be
// invented medical content here, so the guidance stays procedural (D-F02).
const SEEK_REGIONS:SeekRegion[]=[
  {id:'R1',round:1,title:'整体轮廓',detail:'先用低倍确认切片的边界与组织分布，建立整体印象，再决定放大哪一处。',x:50,y:50,zoom:1},
  {id:'R2',round:1,title:'组织分布',detail:'沿低倍视野扫过主要区域，比较不同区域的结构疏密，记下需要进一步观察的位置。',x:40,y:40,zoom:1.5},
  {id:'R3',round:1,title:'区域对比',detail:'把相邻区域放在同一放大倍率下比较，避免只凭单点印象下判断。',x:64,y:58,zoom:1.5},
  {id:'R4',round:2,title:'局部放大',detail:'对低倍筛出的位置做高倍确认，观察细胞与排列细节。',x:36,y:46,zoom:2.4},
  {id:'R5',round:2,title:'复查与记录',detail:'回到高倍视野复核关键细节，并用标注工具圈出结论要引用的区域。',x:60,y:56,zoom:2.4},
];

export function CaseViewer({item,onBack,favorited,onFavorite,canEdit,onEdit,children}:{item:CaseItem;onBack:()=>void;favorited?:boolean;onFavorite?:()=>void;canEdit?:boolean;onEdit?:()=>void;children?:ReactNode}) {
  const [marks,setMarks]=useState<SlideMark[]>([]);
  const [assistant,setAssistant]=useState(true);
  const [mode,setMode]=useState<'multimodal'|'slideseek'>('multimodal');
  const [step,setStep]=useState(0),[paused,setPaused]=useState(false);
  const [focus,setFocus]=useState<{x:number;y:number;zoom:number;token:number}|null>(null);
  const seeking=assistant&&mode==='slideseek';
  const current=SEEK_REGIONS[step];
  // Advance the tour while it is running; `token` makes each visit a fresh focus so re-visiting
  // the same region still re-centres the slide.
  // Focus on every step change, whether it came from the timer or from clicking a region. These
  // are two effects on purpose: pausing stops the timer, but it must not stop a manual jump from
  // moving the slide (it did, until this was split).
  useEffect(()=>{
    const region=SEEK_REGIONS[step];
    if(!seeking||!region)return;
    setFocus({x:region.x,y:region.y,zoom:region.zoom,token:Date.now()});
  },[seeking,step]);
  useEffect(()=>{
    if(!seeking||paused||step>=SEEK_REGIONS.length)return;
    const timer=window.setTimeout(()=>setStep(value=>value+1),2400);
    return ()=>window.clearTimeout(timer);
  },[seeking,paused,step]);
  function changeMode(next:'multimodal'|'slideseek'){setMode(next);setStep(0);setPaused(false);if(next==='slideseek')setAssistant(true);}
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
        <SlideCanvas images={item.images} alt={item.title} onMarksChange={setMarks} focus={focus} regions={seeking?SEEK_REGIONS:undefined} activeRegion={seeking?current?.id??null:null} visitedRegions={SEEK_REGIONS.slice(0,step).map(region=>region.id)}/>
        {!assistant&&<button className="viewer-assistant-fab" type="button" onClick={()=>setAssistant(true)}><span>AI</span>阅片助手</button>}
      </div>
      {assistant&&<ViewerAssistant onClose={()=>setAssistant(false)} mode={mode} onMode={changeMode} seeking={{regions:SEEK_REGIONS,step,paused,onStep:(index:number)=>{setStep(index);setPaused(true);},onTogglePause:()=>setPaused(value=>!value)}}/>}
    </div>
  </section>;
}
