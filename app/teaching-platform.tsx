"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { type Account, roleLabels } from "./account-client";
import AdminPanel from "./admin-panel";
import LibraryWorkspace from "./library-workspace";
import QuestionBank from "./question-bank";
import PracticeWorkspace from "./practice-workspace";
import BankPaperWorkspace from "./bank-paper-workspace";
import ExamWorkspace from "./exam-workspace";
import LearningWorkspace from "./learning-workspace";
import PublishingWorkspace from "./publishing-workspace";
import { StudentTeachingCenter } from "./teaching-center";
import { TeacherAbilityModule } from "./teacher-ability-module";
import { TeachingModule, teachingCases, type TeachingOpenMode } from "./teaching-module";

type View = "student" | "teacher" | "admin" | "help";

export default function TeachingPlatform({user,onLogout,onPassword,demoAdmin}:{user:Account;onLogout:()=>void;onPassword:()=>void;demoAdmin?:ReactNode}) {
  const [view, setView] = useState<View>(user.roles.includes('admin')?'admin':user.roles.includes('teacher')?'teacher':'student');
  const [section,setSection]=useState("exams");
  const [exam, setExam] = useState<{ id: string; mode: TeachingOpenMode } | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const acceptedHash=useRef("");
  useEffect(()=>{
    const read=(event?:Event)=>{
      if(event&&!leave()){history.replaceState(null,"",location.pathname+location.search+acceptedHash.current);return;}
      const params=new URLSearchParams(location.hash.slice(1));
      const role=params.get("role"),page=params.get("page");
      const allowed=role==="teacher"?["cases","questions","exams","records","ability"]:role==="student"?["practice","exams","database","records","wrong","ability"]:["exams"];
      if(role&&(role==="help"||user.roles.includes(role))){
        setView(role as View);setSection(page&&allowed.includes(page)?page:"exams");
        const id=params.get("case"),examId=params.get("exam");
        setCaseId(role==="student"&&teachingCases.some(c=>c.id===id)?id:null);
        setExam(role==="student"&&teachingCases.some(c=>c.id===examId)?{id:examId!,mode:params.get("mode")==="result"?"result":"case"}:null);
      }
      if(!role||(role!=="help"&&!user.roles.includes(role)))route(user.roles.includes("admin")?"admin":user.roles.includes("teacher")?"teacher":"student","exams");
      acceptedHash.current=location.hash;
      if(event)window.dispatchEvent(new Event("edu-route-restored"));
    };
    read();const written=()=>{acceptedHash.current=location.hash;};window.addEventListener("edu-route-written",written);window.addEventListener("popstate",read);return()=>{window.removeEventListener("popstate",read);window.removeEventListener("edu-route-written",written);};
  },[user.id]);
  function route(role:string,page:string,detail:Record<string,string>={}){
    const hash="#"+new URLSearchParams({role,page,...detail}).toString();
    if(location.hash!==hash)history.pushState(null,"",hash);
    acceptedHash.current=hash;
  }
  function leave(){return window.dispatchEvent(new Event("edu-before-leave",{cancelable:true}));}
  function navigate(next: View) { if(next!=='help'&&!user.roles.includes(next))return;if(!leave())return;setView(next);setSection("exams");route(next,"exams"); setExam(null); setCaseId(null); }
  return <div className="edu-app">
    <header className="edu-topbar"><a href="/" className="edu-brand"><img className="hospital-logo" src="/上海市第六人民医院.webp" alt="上海市第六人民医院院徽" width={64} height={64}/><div><small>上海市第六人民医院</small><b>病理教学平台</b></div></a><div><span>{user.displayName} · {user.roles.map(r=>roleLabels[r]).join('／')}</span><button onClick={()=>{if(leave())onPassword();}}>修改密码</button><button onClick={()=>{if(leave())onLogout();}}>退出</button></div></header>
    <div className="edu-notice" role="status"><b>{demoAdmin?"本机演示":"账号服务 · 教学演示"}</b><span>仅使用模拟资料，请勿上传患者信息。</span></div>
    {view === "teacher" && ["records","ability"].includes(section) && <div className="edu-teacher-notice"><b>教师分析：演示数据／功能待接入</b><span>录音、语音转写、问答分析和同步回放仅为前端示意；不会采集麦克风，也不产生真实能力评价。</span></div>}
    <div className={"edu-layout"+(view==="admin"?" admin-layout":"")}><aside className="edu-sidebar" aria-label="模块导航">{(view==="teacher"?[["cases","切片图书馆"],["questions","题库与出题"],["exams","考试管理"],["records","教学记录"],["ability","能力分析"]]:view==="student"?[["practice","日常练习"],["exams","考试中心"],["database","切片图书馆"],["records","学习记录"],["wrong","错题集"],["ability","能力分析"]]:[]).map(([id,label])=><button key={id} aria-current={section===id?"page":undefined} onClick={()=>{if(!leave())return;setSection(id);route(view,id);setExam(null);setCaseId(null);}}>{label}</button>)}</aside><main className={exam || caseId ? "edu-workspace full" : "edu-workspace"}>
      {demoAdmin && view==='teacher' && section==='exams' && <BankPaperWorkspace user={user}/>}
      {demoAdmin && !exam && !caseId && view==='student' && section==='exams' && <ExamWorkspace user={user}/>}
      {demoAdmin && view==='teacher' && section==='questions' && <QuestionBank user={user} initialCaseId={new URLSearchParams(typeof location==='undefined'?'':location.hash.slice(1)).get('questionCase')||undefined}/>}
      {demoAdmin && view==='student' && section==='practice' && <PracticeWorkspace user={user}/>}
      {demoAdmin && view==='student' && ['records','wrong','ability'].includes(section) && <LearningWorkspace key={section} user={user} wrong={section==='wrong'} ability={section==='ability'}/>}
      {demoAdmin && ((view==="teacher"&&section==="cases")||(view==="student"&&section==="database")) && <LibraryWorkspace key={view} user={{...user,roles:[view]}} onCreateQuestion={view==='teacher'?(id)=>{setSection('questions');route('teacher','questions',{questionCase:id});}:undefined}/>}
      {view==="student"&&!(["practice","exams","database","records","wrong","ability"].includes(section)&&demoAdmin)&&<div hidden={Boolean(exam||caseId)}><StudentTeachingCenter initialSection={section} key={section} embedded onOpenExam={(id,mode) => {setExam({id,mode});route(view,section,{exam:id,mode});}} onOpenViewer={(id) => {setCaseId(id);route(view,section,{case:id});}} /></div>}
      {exam ? <TeachingModule key={`${exam.id}:${exam.mode}`} accountId={user.id} caseId={exam.id} openMode={exam.mode} onExit={() => {setExam(null);route(view,section);}} /> : caseId ? <CasePreview key={caseId} caseId={caseId} onBack={() => {setCaseId(null);route(view,section);}} /> : view === "student" ? null : view === "teacher" ? (["records","ability"].includes(section) ? <TeacherAbilityModule key={section} initialView={section==="records"?"records":"overview"} onBack={() => {setSection("cases");route(view,"cases");}} /> : null) : view === 'admin' ? (demoAdmin ?? <AdminPanel self={user}/>) : (demoAdmin ? <article className="edu-help"><h1>演示版使用说明</h1><p>三个角色使用独立演示身份。管理员修改的演示账号、密码和操作记录只在当前浏览器有效，不会修改真实账号。退出保留本地演示草稿，清理浏览器数据会删除它们。</p><p>考试、病例和画像包含固定示例；AI、录音和转写尚未接入。真实账号验证入口独立位于 /account，数据库故障不会自动进入演示模式。</p></article> : <Help />)}
    </main></div>
  </div>;
}

function CasePreview({caseId,onBack}:{caseId:string;onBack:()=>void}) {
  const [zoom,setZoom] = useState(1);
  const item = teachingCases.find(item => item.id===caseId);
  return <section className="edu-case"><header><button onClick={onBack}>← 返回病例数据库</button><h1>{item?.title ?? "教学病例"}</h1><p>模拟图片 · 普通 PNG，非 WSI · 此处仅用于迁移界面验证</p><dl><dt>部位／难度</dt><dd>{item?.organ}／{item?.difficulty}</dd><dt>临床资料</dt><dd>此目录样例未提供专属临床信息，不展示其他病例病史。</dd></dl></header><div className="edu-image-scroll"><img src="/synthetic-pathology-slide.png" alt="合成病理教学示意图，不作为医学标准" style={{width:`${zoom*100}%`,maxWidth:"none"}} /></div><footer><button aria-label="缩小图片" onClick={()=>setZoom(Math.max(.5,zoom-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="放大图片" onClick={()=>setZoom(Math.min(3,zoom+.25))}>＋</button><button onClick={()=>setZoom(1)}>复位</button></footer></section>;
}

function Help() {
  return <article className="edu-help"><h1>账号与教学使用说明</h1><p>管理员创建账号并安全交付初始密码；首次登录必须改密。导航只显示已分配角色。忘记密码请联系管理员。</p><h2>真实功能</h2><ul><li>独立登录、改密、退出与会话校验。</li><li>管理员创建账号、分配角色、停用、重置及单独资源授权；每次变更记录审计。</li><li>账号停用、重置、角色或资源授权变化后旧登录失效。页面最多 30 秒或重新聚焦时清除旧状态，接口即时校验。</li></ul><h2>演示边界</h2><p>病例、考试、错题和画像仍是公开合成示例。演示草稿按账号隔离，退出后清除；不作为正式答卷。录音、转写与同步回放不采集真实音频。真实上传、考试和 DeepSeek 后端将分步接入。</p></article>;
}
