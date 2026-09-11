// 阅片助手 — interaction skeleton ported from the research prototype
// (02_病理科研平台/pathology-research-prototype, mode === "library"), including the SlideSeek
// guided-review panel.
//
// What was NOT ported, deliberately: the prototype replies with hard-coded pathology conclusions
// ("倾向中分化腺癌" etc.) and its SlideSeek regions are named after findings ("腺体融合", "可疑
// 浸润前沿"). No model is connected here and the platform must not present invented findings as
// AI output (D-F02), so replies are procedural and the tour is a reading routine — low power
// first, then high power — that never says what the tissue shows.
"use client";
import {useState} from 'react';
import {Button} from './ui-button';
import type {SeekRegion} from './case-viewer';

type Message={role:'user'|'assistant';text:string};
type Seeking={regions:SeekRegion[];step:number;paused:boolean;onStep:(index:number)=>void;onTogglePause:()=>void};
const SUGGESTIONS=['这份切片建议的观察顺序','简答题怎么组织证据','如何引用我做的标注'];
const SCRIPT=[{match:/观察顺序|怎么看|顺序/,text:'（流程示例）一般先低倍看整体结构与病变分布，再进高倍确认细胞形态。本机未接入模型，此条是界面示例，不构成判读意见。'},
{match:/证据|简答|组织/,text:'（流程示例）可以先写观察到的事实，再写据此支持的判断，最后写还需要什么证据。用左侧工具栏圈出对应区域，作答时按标注名引用。'},
{match:/标注|引用/,text:'（流程示例）标注只保留在本次浏览中：点「矩形／圆形／点标注」后在切片上单击即可，右侧列表会给出「关键视野 01」这样的名字。'}];
function answerFor(question:string){
  const hit=SCRIPT.find(item=>item.match.test(question));
  return hit?hit.text:'（流程示例）这是阅片助手的界面演示。AI 服务尚未接入，本机不会分析切片内容，也不会给出诊断方向。';
}

export function ViewerAssistant({onClose,mode,onMode,seeking}:{onClose:()=>void;mode:'multimodal'|'slideseek';onMode:(mode:'multimodal'|'slideseek')=>void;seeking:Seeking}) {
  const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false);
  const [view,setView]=useState<'chat'|'report'>('chat');
  const [knowledge,setKnowledge]=useState(false),[model,setModel]=useState('大医多模态900');
  const {regions,step,paused,onStep,onTogglePause}=seeking;
  const current=regions[step];
  function send(text:string){
    const question=text.trim();
    if(!question||busy)return;
    setMessages(list=>[...list,{role:'user',text:question}]);
    setInput('');setBusy(true);
    window.setTimeout(()=>{setMessages(list=>[...list,{role:'assistant',text:answerFor(question)}]);setBusy(false);},600);
  }
  return <aside className="viewer-assistant" aria-label="阅片助手">
    <header><span>AI</span><div><b>阅片助手</b><small>{mode==='multimodal'?'多模态阅片 · 服务未接入':'SlideSeek 导航阅片 · 预设路线'}</small></div><Button onClick={onClose} aria-label="关闭阅片助手">×</Button></header>
    <label className="viewer-assistant-mode"><span>阅片模式</span><select value={mode} onChange={event=>onMode(event.target.value as 'multimodal'|'slideseek')}><option value="multimodal">多模态阅片</option><option value="slideseek">SlideSeek 导航阅片</option></select></label>
    <p className="viewer-assistant-note">本机未接入模型：以下均为流程示例，不会判读切片，也不构成诊断意见。</p>
    {mode==='slideseek'?<div className="seek-panel">
      <div className="seek-head"><div><h3>SlideSeek 导航阅片</h3><p>{step>=regions.length?'两轮重点区域已看完':`第 ${current?.round??2} 轮 · ${step+1} / ${regions.length}`}</p></div><Button onClick={onTogglePause}>{paused?'继续导航':'暂停导航'}</Button></div>
      <p className="seek-intro">按预设顺序带看：低倍先建立整体印象，再进入高倍复核。这是固定的阅读流程演示，不是 AI 判断。</p>
      {[1,2].map(round=><section className="seek-round" key={round}><header><b>第 {round} 轮</b><span>{round===1?'低倍筛查':'高倍复核'}</span></header><div>{regions.map((region,index)=>region.round===round?<button type="button" key={region.id} className={step===index?'active':step>index?'done':''} onClick={()=>onStep(index)}><i>{region.id}</i><span>{step>index?'已查看':step===index?'正在查看':'待查看'}</span></button>:null)}</div></section>)}
      {current?<article className="seek-current"><header><span>{current.id}</span><div><b>{current.title}</b><small>{Math.round(current.zoom*10)}× 视野</small></div></header><p>{current.detail}</p><div><i aria-hidden="true" />正在带您查看此区域</div></article>
        :<div className="seek-summary"><b>路线完成</b><p>五个区域已按预设路线看完。可以切回「多模态阅片」提问，或用标注工具圈出你要引用的区域。</p></div>}
    </div>
      :view==='report'?<div className="viewer-chat"><div className="viewer-report-head"><b>AI 报告草稿</b><Button onClick={()=>setView('chat')}>返回对话</Button></div><dl className="viewer-report"><dt>检查部位</dt><dd>待接入</dd><dt>病理形态</dt><dd className="viewer-muted">未生成：模型未接入</dd><dt>病理诊断</dt><dd className="viewer-muted">未生成：模型未接入</dd><dt>备注</dt><dd>本报告不会由本机生成，仅演示字段布局。</dd></dl></div>
      :<div className="viewer-chat">{!messages.length?<div className="viewer-chat-welcome">你好，这里是阅片助手的界面演示。<div>{SUGGESTIONS.map(item=><button type="button" key={item} onClick={()=>send(item)}>{item}<i aria-hidden="true">→</i></button>)}</div></div>:null}{messages.map((message,index)=><div className={`viewer-chat-message ${message.role}`} key={index}><p>{message.text}</p></div>)}{busy?<div className="viewer-chat-message assistant"><p>处理中…</p></div>:null}</div>}
    <div className="viewer-assistant-input">
      <div className="viewer-chat-quick"><Button disabled title="服务未接入">发送当前视野</Button><Button onClick={()=>setView(view==='report'?'chat':'report')}>{view==='report'?'返回对话':'AI 报告'}</Button></div>
      <textarea aria-label="向阅片助手提问" value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send(input);}}} placeholder="询问界面用法；本机不判读切片"/>
      <footer className="viewer-assistant-foot"><select aria-label="模型" value={model} onChange={event=>setModel(event.target.value)}><option>大医多模态900</option><option>大医多模态v1</option><option>大医深思考v1</option></select><Button aria-pressed={knowledge} onClick={()=>setKnowledge(value=>!value)}>▤ 知识库</Button><Button variant="primary" disabled={!input.trim()||busy} onClick={()=>send(input)}>发送</Button></footer>
    </div>
  </aside>;
}
