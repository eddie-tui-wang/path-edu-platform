"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { previewNavigationTool } from "./preview-tools.mjs";
import { StudentTeachingCenter } from "./teaching-center";
import { TeacherAbilityModule } from "./teacher-ability-module";
import { TeachingModule, teachingCases, type TeachingOpenMode } from "./teaching-module";

type View = "student" | "teacher" | "help";

export default function TeachingPlatform() {
  const [view, setView] = useState<View>("student");
  const [exam, setExam] = useState<{ id: string; mode: TeachingOpenMode } | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  function navigate(next: View) { setView(next); setExam(null); setCaseId(null); }
  useEffect(() => {
    const context = (document as Document & {modelContext?: {registerTool: (tool: ReturnType<typeof previewNavigationTool>, options: {signal: AbortSignal}) => unknown}}).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool(previewNavigationTool((next: View) => flushSync(() => {setView(next);setExam(null);setCaseId(null);})), {signal:lifecycle.signal})).catch(() => { /* optional browser capability */ });
    } catch { /* Preview works without WebMCP. */ }
    return () => lifecycle.abort();
  }, []);
  return <div className="edu-app">
    <header className="edu-topbar"><a href="/" className="edu-brand"><span>✧</span><div><b>病理教学平台</b><small>PATHOLOGY EDUCATION</small></div></a><nav aria-label="演示视角">{([["student", "学生端"], ["teacher", "教师端"], ["help", "帮助中心"]] as const).map(([id,label]) => <button key={id} aria-pressed={view===id} onClick={() => navigate(id)}>{label}</button>)}</nav><span>独立项目 · 迁移预览</span></header>
    <div className="edu-notice" role="status"><b>演示环境</b><span>当前迁移原型页面，非真实登录；考试仅本机演示保存，后台、DeepSeek 与权限尚未接入。请勿上传患者资料。</span></div>
    {view === "teacher" && <div className="edu-teacher-notice"><b>教师分析：演示数据／功能待接入</b><span>录音、语音转写、问答分析和同步回放仅为前端示意；不会采集麦克风，也不产生真实能力评价。</span></div>}
    <main className={exam || caseId ? "edu-workspace full" : "edu-workspace"}>
      {exam ? <TeachingModule key={`${exam.id}:${exam.mode}`} caseId={exam.id} openMode={exam.mode} onExit={() => setExam(null)} /> : caseId ? <CasePreview key={caseId} caseId={caseId} onBack={() => setCaseId(null)} /> : view === "student" ? <StudentTeachingCenter onOpenExam={(id,mode) => setExam({id,mode})} onOpenViewer={(id) => setCaseId(id)} /> : view === "teacher" ? <TeacherAbilityModule onBack={() => navigate("student")} /> : <Help />}
    </main>
  </div>;
}

function CasePreview({caseId,onBack}:{caseId:string;onBack:()=>void}) {
  const [zoom,setZoom] = useState(1);
  const item = teachingCases.find(item => item.id===caseId);
  return <section className="edu-case"><header><button onClick={onBack}>← 返回病例数据库</button><h1>{item?.title ?? "教学病例"}</h1><p>模拟图片 · 普通 PNG，非 WSI · 此处仅用于迁移界面验证</p></header><div className="edu-image-scroll"><img src="/synthetic-pathology-slide.png" alt="合成病理教学示意图，不作为医学标准" style={{width:`${zoom*100}%`,maxWidth:"none"}} /></div><footer><button aria-label="缩小图片" onClick={()=>setZoom(Math.max(.5,zoom-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="放大图片" onClick={()=>setZoom(Math.min(3,zoom+.25))}>＋</button><button onClick={()=>setZoom(1)}>复位</button></footer></section>;
}

function Help() {
  return <article className="edu-help"><h1>迁移预览使用说明</h1><p>学生端可浏览病例、进入考试作答、查看示例考试记录、错题和五维看板；教师端可体验教学记录、三类分析及四维画像界面。</p><h2>本次迁移范围</h2><ul><li>复制现有教学页面及设计样式，旧科研平台不变。</li><li>演示视角切换不是身份认证，所有病例与报告为示例。</li><li>教学采集、转写与回放按演示 UI 保留，功能后期接入。</li><li>真实账号、持久化上传、考试后端和 DeepSeek 按后续阶段实施；当前不能用于真实考试。</li><li>普通图片只显示缩放百分比；WSI 和实际物理测量第二期接入。</li></ul><h2>接下来需要确认</h2><p>EdgeOne 新项目域名、Cloud Functions 与私有存储能力。无需改动现有项目，不在这里填写 API 密钥。</p></article>;
}
