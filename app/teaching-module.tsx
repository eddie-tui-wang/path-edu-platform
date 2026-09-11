"use client";

/* eslint-disable @next/next/no-img-element -- native image geometry keeps viewer annotations aligned during pan and zoom */

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TeachingOpenMode = "case" | "result";

export const teachingCases = [
  { id: "gastric-001", title: "胃黏膜腺体异型增生病例", organ: "胃", difficulty: "进阶", duration: "25 分钟", status: "进行中" },
  { id: "breast-002", title: "乳腺浸润性导管癌病例", organ: "乳腺", difficulty: "基础", duration: "20 分钟", status: "待参加" },
  { id: "colon-003", title: "结直肠腺癌鉴别诊断病例", organ: "结直肠", difficulty: "挑战", duration: "30 分钟", status: "考试结果" },
] as const;

type TeachingStatus = "未开始" | "作答中" | "已提交" | "解析生成中" | "分析完成";
type TeachingStage = "intro" | "answer" | "analyzing" | "result";
type Mark = { id: number; type: "rect" | "circle" | "point"; x: number; y: number; name: string; magnification: number; description: string };
type Answer = {
  clinical: string;
  morphology: string[];
  diagnosis: string;
  diagnosisEvidence: string;
  marks: Mark[];
  differences: string[];
  ihc: string[];
};

const emptyAnswer: Answer = {
  clinical: "",
  morphology: [],
  diagnosis: "",
  diagnosisEvidence: "",
  marks: [],
  differences: [],
  ihc: [],
};

const demoAnswer: Answer = {
  clinical: "胃窦溃疡型病变，伴体重下降和胃壁局限性增厚",
  morphology: ["腺体排列紊乱并局部融合", "细胞核深染、极性紊乱", "可疑间质浸润及促纤维反应"],
  diagnosis: "胃中分化腺癌",
  diagnosisEvidence: "异型腺体排列紊乱并局部融合，可见不规则小腺体进入间质，周围伴促纤维反应。",
  marks: [
    { id: 1, type: "rect", x: 54, y: 34, name: "异型腺体区域", magnification: 20, description: "腺体排列紊乱并融合，细胞核深染、极性消失，核质比升高。" },
    { id: 2, type: "circle", x: 69, y: 52, name: "可疑浸润前沿", magnification: 40, description: "不规则小腺体散在间质中，周围可见促纤维反应，考虑浸润。" },
  ],
  differences: ["高级别上皮内瘤变", "胃腺瘤性病变"],
  ihc: ["MMR（MLH1/PMS2/MSH2/MSH6）", "HER2", "PD-L1"],
};

const morphologyOptions = ["腺体排列紊乱并局部融合", "细胞核深染、极性紊乱", "可疑间质浸润及促纤维反应", "弥漫性印戒细胞形态", "未见明确细胞异型"];
const clinicalOptions = ["胃窦溃疡型病变，伴体重下降和胃壁局限性增厚", "单纯慢性胃炎，无占位或消耗症状", "胃体息肉，实验室检查无异常", "食管下段狭窄，CEA 正常"];
const diagnosisOptions = ["胃中分化腺癌", "胃高级别上皮内瘤变", "胃低分化腺癌", "慢性萎缩性胃炎"];
const differenceOptions = ["高级别上皮内瘤变", "胃腺瘤性病变", "胃神经内分泌肿瘤", "胃间质瘤"];
const ihcOptions = ["MMR（MLH1/PMS2/MSH2/MSH6）", "HER2", "PD-L1", "CD117 / DOG1", "Syn / CgA"];
const viewOptions: Mark[] = [
  ...demoAnswer.marks,
  { id: 3, type: "rect", x: 35, y: 61, name: "慢性炎症区域", magnification: 20, description: "黏膜间质内慢性炎细胞浸润，未见明确浸润性腺体。" },
];

const caseInfo = [
  ["性别 / 年龄", "男，58 岁"],
  ["主诉", "反复上腹部不适 3 个月"],
  ["现病史", "进食后腹胀，近 1 个月体重下降约 4 kg。胃镜示胃窦溃疡型病变。"],
  ["既往史", "慢性萎缩性胃炎 6 年"],
  ["家族史", "未提供"],
  ["实验室检查", "血红蛋白 108 g/L；CEA 轻度升高"],
  ["影像学检查", "胃窦壁局限性增厚，周围脂肪间隙尚清"],
  ["送检信息", "胃窦活检，HE 教学示意，普通 PNG"],
] as const;

function isFilled(answer: Answer) {
  return {
    clinical: Boolean(answer.clinical),
    marks: answer.marks.length > 0,
    morphology: answer.morphology.length > 0,
    diagnosis: Boolean(answer.diagnosis && answer.diagnosisEvidence),
    differences: answer.differences.length > 0,
    ihc: answer.ihc.length > 0,
  };
}

export function TeachingModule({ caseId, openMode, onExit, accountId = 'preview' }: { caseId: string; openMode: TeachingOpenMode; onExit: () => void; accountId?: string }) {
  const currentCase = teachingCases.find((item) => item.id === caseId) ?? teachingCases[0];
  const isContinuing = openMode === "case" && currentCase.status === "进行中";
  const storageKey = `path-edu-demo-v1-${accountId}-${caseId}`;
  const [stage, setStage] = useState<TeachingStage>(openMode === "result" ? "result" : isContinuing ? "answer" : "intro");
  const [status, setStatus] = useState<TeachingStatus>(openMode === "result" ? "分析完成" : isContinuing ? "作答中" : "未开始");
  const [answer, setAnswer] = useState<Answer>(openMode === "result" ? demoAnswer : emptyAnswer);
  const [mobilePanel,setMobilePanel]=useState("slide");
  const [tool, setTool] = useState("平移");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState("clinical");
  const [selectedMarkId, setSelectedMarkId] = useState<number | null>(null);
  const [saveTime, setSaveTime] = useState("尚未保存");
  const [showCheck, setShowCheck] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const drag = useRef({ active: false, x: 0, y: 0, ox: 0, oy: 0 });
  const completion = useMemo(() => isFilled(answer), [answer]);
  const allComplete = Object.values(completion).every(Boolean);

  /* eslint-disable react-hooks/set-state-in-effect -- restore an unfinished local teaching attempt */
  useEffect(() => {
    if (openMode === "result") return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { status?: TeachingStatus; answer?: Answer; zoom?: number; offset?: { x: number; y: number }; saveTime?: string; secondsLeft?: number };
      if (parsed.answer) setAnswer({ ...emptyAnswer, ...parsed.answer });
      if (parsed.zoom) setZoom(parsed.zoom);
      if (parsed.offset) setOffset(parsed.offset);
      if (parsed.saveTime) setSaveTime(parsed.saveTime);
      if (typeof parsed.secondsLeft === "number") setSecondsLeft(parsed.secondsLeft);
      if (parsed.status === "作答中" || currentCase.status === "进行中") { setStatus("作答中"); setStage("answer"); }
      if (parsed.status === "分析完成" && currentCase.status === "考试结果") { setStatus("分析完成"); setStage("result"); }
    } catch { window.localStorage.removeItem(storageKey); }
  }, [currentCase.status, openMode, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (status !== "作答中") return;
    const timer = window.setTimeout(() => {
      const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      setSaveTime(time);
      window.localStorage.setItem(storageKey, JSON.stringify({ status, answer, zoom, offset, saveTime: time, secondsLeft }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [answer, offset, secondsLeft, status, storageKey, zoom]);

  useEffect(() => {
    if (status !== "作答中" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, status]);

  useEffect(() => {
    if (stage !== "analyzing") return;
    const timer = window.setInterval(() => setAnalysisStep((value) => {
      if (value >= 5) {
        window.clearInterval(timer);
        setStatus("分析完成");
        setStage("result");
        window.localStorage.setItem(storageKey, JSON.stringify({ status: "分析完成", answer, zoom, offset, saveTime }));
        return 6;
      }
      return value + 1;
    }), 550);
    return () => window.clearInterval(timer);
  }, [answer, offset, saveTime, stage, storageKey, zoom]);

  function begin(useDemo = false) {
    if (useDemo) setAnswer(demoAnswer);
    setStatus("作答中");
    setStage("answer");
  }

  function updateAnswer<K extends keyof Answer>(key: K, value: Answer[K]) {
    setAnswer((current) => ({ ...current, [key]: value }));
  }

  function addMark(event: ReactPointerEvent<HTMLDivElement>) {
    if (!["矩形", "圆形", "点标注"].includes(tool)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const mark: Mark = {
      id: Date.now(), type: tool === "矩形" ? "rect" : tool === "圆形" ? "circle" : "point",
      x: Math.max(5, Math.min(94, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(6, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100)),
      name: `关键视野 ${String(answer.marks.length + 1).padStart(2, "0")}`,
      magnification: Math.round(zoom * 20), description: "",
    };
    updateAnswer("marks", [...answer.marks, mark]);
    setSelectedMarkId(mark.id);
    setActiveSection("marks");
  }

  function locateMark(mark: Mark) {
    setSelectedMarkId(mark.id);
    setZoom(Math.max(1, mark.magnification / 20));
    setOffset({ x: (50 - mark.x) * 4, y: (50 - mark.y) * 3 });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool !== "平移") return;
    drag.current = { active: true, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y });
  }

  if(caseId!=="gastric-001")return <section className="account-card"><button onClick={onExit}>返回来源页面</button><h1>{currentCase.title}</h1><p>固定流程样例 · 当前记录尚无专属作答、参考答案和图片证据，不能用胃病例的解析替代。</p></section>;
  if (stage === "intro") return <TeachingIntro currentCase={currentCase} onExit={onExit} onBegin={begin} />;
  if (stage === "analyzing") return <AnalysisProgress currentCase={currentCase} step={analysisStep} />;
  if (stage === "result") return <TeachingResult currentCase={currentCase} answer={answer} onExit={onExit} />;

  const sections = [
    ["clinical", "临床信息判断", completion.clinical], ["marks", "关键视野与形态", completion.marks],
    ["morphology", "总体形态总结", completion.morphology], ["diagnosis", "最可能诊断", completion.diagnosis],
    ["differences", "鉴别诊断", completion.differences], ["ihc", "免疫组化方案", completion.ihc],
  ] as const;

  return (
    <div className="teaching-viewer" data-panel={mobilePanel}>
      <header className="teaching-topbar">
        <div><b>考试作答</b><small>{currentCase.title} · 冻结病例版本 v3.2</small></div>
        <nav>{["平移", "缩放", "矩形", "圆形", "点标注", "自由笔"].map((item) => <button type="button" className={tool === item ? "active" : ""} disabled={item==="自由笔"||item==="缩放"} title={item==="自由笔"?"自由笔尚未实现":item==="缩放"?"请使用画布下方加减按钮缩放":undefined} onClick={() => setTool(item)} key={item}><i>{item === "平移" ? "✥" : item === "缩放" ? "⌕" : item === "矩形" ? "□" : item === "圆形" ? "○" : item === "点标注" ? "•" : "⌁"}</i>{item}</button>)}</nav>
        <div className="teaching-top-actions"><span>仅本机演示保存 · {saveTime}</span><button type="button" onClick={onExit}>保存并退出</button></div>
      </header>
      <nav className="viewer-panels" aria-label="阅片工作区切换">{[["clinical","临床资料"],["slide","切片图片"],["answer","答题"]].map(([id,label])=><button key={id} aria-pressed={mobilePanel===id} onClick={()=>setMobilePanel(id)}>{label}</button>)}</nav>
      <aside className="teaching-case-info"><h2>病例信息</h2><p>作答期间可随时查看</p>{caseInfo.map(([label, value]) => <details open={label === "性别 / 年龄" || label === "主诉"} key={label}><summary>{label}</summary><div>{value}</div></details>)}</aside>
      <main className="teaching-slide"><div className={`teaching-stage tool-${tool}`} tabIndex={0} role="region" aria-label="切片画布，方向键平移，加减键缩放" onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();setOffset(v=>({x:v.x+(e.key==="ArrowLeft"?-30:e.key==="ArrowRight"?30:0),y:v.y+(e.key==="ArrowUp"?-30:e.key==="ArrowDown"?30:0)}));}if(e.key==="+"||e.key==="=")setZoom(v=>Math.min(4,v+.2));if(e.key==="-")setZoom(v=>Math.max(.6,v-.2));}} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { drag.current.active = false; }} onClick={addMark}><div className="teaching-slide-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}><img src="/synthetic-pathology-slide.png" alt="教学病例合成病理切片" draggable={false} />{answer.marks.map((mark, index) => <button type="button" key={mark.id} className={`teaching-mark teaching-mark-${mark.type}${selectedMarkId === mark.id ? " active" : ""}`} style={{ left: `${mark.x}%`, top: `${mark.y}%` }} onClick={(event) => { event.stopPropagation(); locateMark(mark); }}><b>视野 {index + 1}</b></button>)}</div></div><div className="teaching-zoom"><button type="button" onClick={() => setZoom((value) => Math.max(.6, value - .2))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(4, value + .2))}>＋</button><button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>复位</button></div><div className="teaching-navigator"><img src="/synthetic-pathology-slide.png" alt="切片导航图" /><i /></div></main>
      <aside className="teaching-answer-panel">
        <header><div><b>考试作答 · 病例 1 / 2</b><small>{Object.values(completion).filter(Boolean).length} / 6 部分已完成 · 已自动保存</small></div><span>{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</span></header>
        <nav>{sections.map(([id, label, done], index) => <button type="button" className={activeSection === id ? "active" : ""} onClick={() => setActiveSection(id)} key={id}><span>{done ? "✓" : index + 1}</span>{label}</button>)}</nav>
        <div className="teaching-answer-content">
          {activeSection === "clinical" ? <ChoiceQuestion title="哪组临床信息最具诊断价值？" hint="单选" options={clinicalOptions} selected={[answer.clinical]} onChange={(values) => updateAnswer("clinical", values[0] ?? "")} /> : null}
          {activeSection === "marks" ? <ViewChoiceQuestion selected={answer.marks} onChange={(marks) => updateAnswer("marks", marks)} onLocate={locateMark} /> : null}
          {activeSection === "morphology" ? <ChoiceQuestion title="请选择本例的关键形态表现" hint="多选" options={morphologyOptions} selected={answer.morphology} multiple onChange={(values) => updateAnswer("morphology", values)} /> : null}
          {activeSection === "diagnosis" ? <><ChoiceQuestion title="最可能的病理诊断是？" hint="单选 + 简答" options={diagnosisOptions} selected={[answer.diagnosis]} onChange={(values) => updateAnswer("diagnosis", values[0] ?? "")} /><ShortAnswer value={answer.diagnosisEvidence} onChange={(value) => updateAnswer("diagnosisEvidence", value)} /></> : null}
          {activeSection === "differences" ? <ChoiceQuestion title="需要重点排除哪些鉴别诊断？" hint="多选" options={differenceOptions} selected={answer.differences} multiple onChange={(values) => updateAnswer("differences", values)} /> : null}
          {activeSection === "ihc" ? <ChoiceQuestion title="请选择后续免疫组化 / 生物标志物方案" hint="多选" options={ihcOptions} selected={answer.ihc} multiple onChange={(values) => updateAnswer("ihc", values)} /> : null}
        </div>
        <footer><span>{allComplete ? "全部必答内容已完成" : "提交前将检查必答内容"}</span><button type="button" onClick={() => { setShowCheck(true); if (allComplete) setShowConfirm(true); }}>提交答案</button></footer>
      </aside>
      {showCheck && !allComplete ? <TeachingDialog title="还不能提交" onClose={()=>setShowCheck(false)}><section><h2>还不能提交</h2><p>请先完成以下必答内容：</p>{sections.filter(([, , done]) => !done).map(([id, label]) => <button type="button" key={id} onClick={() => { setActiveSection(id); setMobilePanel("answer");setShowCheck(false); }}>○ {label}<span>去完成 →</span></button>)}<footer><button type="button" onClick={() => setShowCheck(false)}>继续作答</button></footer></section></TeachingDialog> : null}
      {showConfirm ? <TeachingDialog title="确认提交答案" onClose={()=>setShowConfirm(false)}><section><h2>确认提交答案</h2><p>本次将提交 6 组选择答案，其中包含 {answer.marks.length} 个关键视野。提交后答案将锁定，不能继续修改。</p><div className="submit-summary"><span>必答题目<b>6 / 6</b></span><span>关键视野<b>{answer.marks.length}</b></span><span>自动保存<b>{saveTime}</b></span></div><footer><button type="button" onClick={() => setShowConfirm(false)}>返回检查</button><button className="primary" type="button" onClick={() => { setShowConfirm(false); setStatus("解析生成中"); setStage("analyzing"); }}>确认提交</button></footer></section></TeachingDialog> : null}
    </div>
  );
}

function TeachingDialog({children,title,onClose,image=false}:{children:ReactNode;title:string;onClose:()=>void;image?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;const trigger=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();requestAnimationFrame(()=>{if(trigger?.isConnected)trigger.focus();});};},[]);
  return <dialog ref={ref} aria-label={title} className={(image?"result-image-modal":"teaching-modal")+" native-dialog"} onCancel={onClose}>{children}</dialog>;
}

function TeachingIntro({ currentCase, onExit, onBegin }: { currentCase: (typeof teachingCases)[number]; onExit: () => void; onBegin: (demo?: boolean) => void }) {
  return <main className="teaching-intro"><header><button type="button" onClick={onExit}>← 返回考试中心</button><b>考试说明</b></header><section><span className="teaching-case-icon">考试</span><div><em>混合试卷 · {currentCase.difficulty} · 限时 {currentCase.duration}</em><h1>{currentCase.title.replace("病例", "考试")}</h1><p>本场考试包含选择题、关键视野题与简答题。开始后系统自动计时并保存作答，提交后所有答案与标注将被锁定。</p></div></section><article><h2>考试内容与规则</h2><div>{["临床信息判断", "关键视野定位", "关键形态选择", "最可能诊断", "鉴别诊断", "免疫组化方案"].map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}</div><p>考试期间仅展示病例资料与已授权切片，不展示标准答案。选择题确定性评分，简答题按评分点分析；最终结果需等待发布后查看。</p><footer><button type="button" onClick={onExit}>暂不参加</button><button className="primary" type="button" onClick={() => onBegin(false)}>确认并开始考试</button></footer></article></main>;
}

function ChoiceQuestion({ title, hint, options, selected, multiple = false, onChange }: { title: string; hint: string; options: readonly string[]; selected: string[]; multiple?: boolean; onChange: (values: string[]) => void }) {
  function choose(option: string) { onChange(multiple ? selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option] : [option]); }
  return <section className="teaching-choice-question"><header><div><h2>{title}</h2><p>请基于病例信息和当前切片完成判断。</p></div><span>{hint}</span></header><div>{options.map((option, index) => <button type="button" aria-pressed={selected.includes(option)} className={selected.includes(option) ? "selected" : ""} onClick={() => choose(option)} key={option}><i>{multiple ? selected.includes(option) ? "✓" : "□" : String.fromCharCode(65 + index)}</i><span>{option}</span></button>)}</div></section>;
}

function ShortAnswer({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <section className="teaching-short-answer"><header><b>诊断依据</b><span>简答题 · 按评分点分析</span></header><p>请结合具体位置、关键形态和浸润证据说明判断依据。</p><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="例如：在可疑浸润前沿可见……，因此支持……" /><footer><span>{value.length} 字</span><small>系统仅分析你的答案，不自动补写诊断。</small></footer></section>;
}

function ViewChoiceQuestion({ selected, onChange, onLocate }: { selected: Mark[]; onChange: (marks: Mark[]) => void; onLocate: (mark: Mark) => void }) {
  function toggle(mark: Mark) { const exists = selected.some((item) => item.id === mark.id); onChange(exists ? selected.filter((item) => item.id !== mark.id) : [...selected, mark]); onLocate(mark); }
  return <section className="teaching-choice-question teaching-view-choices"><header><div><h2>请选择具有诊断价值的关键视野</h2><p>多选 · 点击选项时左侧画布会定位到对应区域。</p></div><span>多选</span></header><div>{viewOptions.map((mark) => <button type="button" className={selected.some((item) => item.id === mark.id) ? "selected" : ""} onClick={() => toggle(mark)} key={mark.id}><span className="teaching-view-thumb" style={{ backgroundImage: "url('/synthetic-pathology-slide.png')", backgroundPosition: `${mark.x}% ${mark.y}%` }} /><span><b>{mark.name}</b><small>{Math.round(mark.magnification / 20 * 100)}% · {mark.description}</small></span></button>)}</div></section>;
}

function AnalysisProgress({ currentCase, step }: { currentCase: (typeof teachingCases)[number]; step: number }) {
  const items = ["临床信息", "关键视野", "形态判断", "最可能诊断", "鉴别诊断", "免疫组化方案"];
  return <main className="analysis-progress"><section><span>✓</span><h1>演示解析流程（未调用 AI）</h1><p>{currentCase.title}</p><div>{items.map((item, index) => <article className={index < step ? "done" : index === step ? "active" : ""} key={item}><i>{index < step ? "✓" : index + 1}</i><b>{item}</b><small>{index < step ? "解析完成" : index === step ? "正在对照标准病例资料…" : "等待解析"}</small></article>)}</div><footer>答案解析用于教学复盘，最终诊断以真实病理报告为准</footer></section></main>;
}

function TeachingResult({ currentCase, answer, onExit }: { currentCase: (typeof teachingCases)[number]; answer: Answer; onExit: () => void }) {
  const [tab, setTab] = useState<"answers" | "report">("answers");
  const [focusedMark, setFocusedMark] = useState<Mark>(answer.marks[0] ?? demoAnswer.marks[0]);
  const [previewMark, setPreviewMark] = useState<Mark | null>(null);
  function openMark(mark: Mark) { setFocusedMark(mark); setPreviewMark(mark); }
  function sameChoices(selected: string[], correct: string[]) { return selected.length === correct.length && correct.every((item) => selected.includes(item)); }
  const results = [
    { title: "临床信息判断", selected: answer.clinical, correct: demoAnswer.clinical, isCorrect: answer.clinical === demoAnswer.clinical, explanation: "病变位于胃窦，溃疡型改变、体重下降及胃壁增厚共同提高恶性肿瘤可能。" },
    { title: "关键视野定位", selected: answer.marks.map((item) => item.name).join("、"), correct: demoAnswer.marks.map((item) => item.name).join("、"), isCorrect: sameChoices(answer.marks.map((item) => item.name), demoAnswer.marks.map((item) => item.name)), explanation: "异型腺体区用于确认肿瘤性形态，浸润前沿用于判断是否突破黏膜内结构。" },
    { title: "关键形态", selected: answer.morphology.join("、"), correct: demoAnswer.morphology.join("、"), isCorrect: sameChoices(answer.morphology, demoAnswer.morphology), explanation: "腺体融合与细胞极性丧失提示高级别异型；促纤维反应伴不规则小腺体支持浸润。" },
    { title: "对应诊断", selected: answer.diagnosis, correct: demoAnswer.diagnosis, isCorrect: answer.diagnosis === demoAnswer.diagnosis, explanation: "本例形成腺体，分化程度中等，并存在可疑浸润，最符合胃中分化腺癌。" },
    { title: "鉴别诊断", selected: answer.differences.join("、"), correct: demoAnswer.differences.join("、"), isCorrect: sameChoices(answer.differences, demoAnswer.differences), explanation: "需与高级别上皮内瘤变及腺瘤性病变比较，核心差异是明确的间质浸润和促纤维反应。" },
    { title: "免疫组化方案", selected: answer.ihc.join("、"), correct: demoAnswer.ihc.join("、"), isCorrect: sameChoices(answer.ihc, demoAnswer.ihc), explanation: "MMR 用于评估错配修复状态；HER2 与 PD-L1 根据后续治疗决策追加，不替代形态诊断。" },
  ];
  const correctCount = results.filter((item) => item.isCorrect).length;
  return <div className="teaching-result"><header><div><button type="button" onClick={onExit}>← 返回考试记录</button><b>{currentCase.title}</b></div><span>结果已发布</span></header><main><aside><h2>学习结果</h2>{[["answers", "逐题答案解析"], ["report", "标准诊断报告"]].map(([id, label]) => <button type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id as typeof tab)} key={id}>{label}</button>)}<div><b>答题情况</b><strong>{correctCount} / 6 题一致</strong><small>以冻结评分版本为准</small></div></aside><section><article className="result-review-viewer"><div><img src="/synthetic-pathology-slide.png" alt="联动复习切片" /><span style={{ left: `${focusedMark.x}%`, top: `${focusedMark.y}%` }}><b>{focusedMark.name}</b></span></div><p><b>联动切片复习 · {Math.round(focusedMark.magnification / 20 * 100)}%</b><small>点击关键视野卡片，可回到对应切片区域复习。</small></p></article>{tab === "answers" ? <><article className="result-answer-summary"><div><span>本次完成</span><strong>6 题</strong></div><div><span>与标准答案一致</span><strong>{correctCount} 题</strong></div><p>重点复习“浸润前沿”与促纤维间质反应的对应关系。</p></article>{results.map((item, index) => <AnswerExplanation index={index + 1} {...item} key={item.title} />)}<article className="result-block"><h2>关键视野复习</h2><div className="result-view-grid">{demoAnswer.marks.map((mark) => <button type="button" key={mark.id} onClick={() => openMark(mark)}><span style={{ backgroundImage: "url('/synthetic-pathology-slide.png')", backgroundPosition: `${mark.x}% ${mark.y}%` }} /><b>{mark.name}</b><small>{mark.description}</small><em>定位并放大 →</em></button>)}</div></article><article className="result-learning-tip"><b>AI 学习建议</b><span>下次阅片先定位浸润前沿，再用高倍确认腺体与间质反应，可让诊断证据链更稳定。</span></article></> : <DiagnosticReport />}</section></main>{previewMark ? <TeachingDialog image title={`${previewMark.name}大图预览`} onClose={()=>setPreviewMark(null)}><section onClick={(event) => event.stopPropagation()}><header><div><b>{previewMark.name}</b><small>{Math.round(previewMark.magnification / 20 * 100)}% · 关键视野</small></div><button type="button" onClick={() => setPreviewMark(null)} aria-label="关闭大图">×</button></header><div><img src="/synthetic-pathology-slide.png" alt={`${previewMark.name}放大切片`} /><span style={{ left: `${previewMark.x}%`, top: `${previewMark.y}%` }}><b>{previewMark.name}</b></span></div><footer>{previewMark.description}</footer></section></TeachingDialog> : null}</div>;
}

function AnswerExplanation({ index, title, selected, correct, isCorrect, explanation }: { index: number; title: string; selected: string; correct: string; isCorrect: boolean; explanation: string }) {
  return <details className={`answer-explanation ${isCorrect ? "correct" : "review"}`} open={isCorrect}><summary><span>{index}</span><div><h2>{title}</h2><small>{isCorrect ? "回答正确" : "建议复习"}</small></div><i>⌄</i></summary><section><div><b>你的选择</b><p>{selected || "未作答"}</p></div><div className="correct-answer"><b>正确答案</b><p>{correct}</p></div><footer><b>答案解析</b><p>{explanation}</p></footer></section></details>;
}

function DiagnosticReport() {
  const rows = [
    ["具体位置", "胃窦黏膜活检组织"],
    ["关键视野与形态", "异型腺体区域可见腺体排列紊乱、局部融合，细胞核深染、极性消失；浸润前沿见不规则小腺体伴促纤维间质反应。"],
    ["对应诊断", "胃中分化腺癌（活检）"],
    ["鉴别诊断", "高级别上皮内瘤变、胃腺瘤性病变。间质浸润及促纤维反应支持腺癌；必要时结合更深层切片确认浸润范围。"],
    ["免疫组化方案", "建议检测 MMR（MLH1、PMS2、MSH2、MSH6）评估错配修复状态；HER2、PD-L1 根据临床治疗需求追加。"],
  ];
  return <><article className="diagnostic-report"><header><div><span>标准诊断报告</span><h1>胃中分化腺癌（活检）</h1></div><em>模拟教学素材 · 未经医学确认</em></header>{rows.map(([label, value]) => <section key={label}><b>{label}</b><p>{value}</p></section>)}</article><article className="result-sources"><h2>报告依据</h2><p>引用样式待接入：当前示例未关联可验证的原文，不作为医学依据。</p></article></>;
}
