"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type AnalysisTab = "trajectory" | "qa" | "diagnosis";
type ModuleView = "overview" | "records" | "capture" | "detail";

const records = [
  { id: "TA-20260828-01", teacherId: "teacher-wangziyue", organizationId: "org-sensetime-medical", title: "胃中分化腺癌教学阅片", slide: "LYND00600", disease: "胃癌", date: "2026-08-28 14:10", duration: "38 分钟", status: "分析完成" },
  { id: "TA-20260821-03", teacherId: "teacher-wangziyue", organizationId: "org-sensetime-medical", title: "结直肠浸润前沿判读", slide: "LYND00598", disease: "结直肠癌", date: "2026-08-21 09:30", duration: "45 分钟", status: "部分分析失败" },
  { id: "TA-20260812-02", teacherId: "teacher-wangziyue", organizationId: "org-sensetime-medical", title: "乳腺淋巴结转移灶识别", slide: "LYND00596", disease: "乳腺癌", date: "2026-08-12 15:20", duration: "32 分钟", status: "分析完成" },
] as const;

const dimensions = [
  { name: "专业知识", state: "优势", evidence: 18, trend: "+2 条有效证据", note: "形态识别与诊断证据链较完整" },
  { name: "教学技能", state: "待提升", evidence: 12, trend: "持续观察", note: "鉴别诊断的提问引导可更明确" },
  { name: "AI 应用", state: "优势", evidence: 9, trend: "+1 次有效核验", note: "能够核验并修订 AI 初步结论" },
  { name: "资源建设", state: "数据不足", evidence: 2, trend: "需继续积累", note: "当前记录不足以形成稳定结论" },
] as const;

const evidencePoints = [
  { time: "00:03:18", title: "低倍建立整体结构", text: "先观察黏膜整体结构与病变分布，再进入腺体密集区域。", zoom: 1, x: 0, y: 0 },
  { time: "00:12:42", title: "定位腺体融合区域", text: "此处可见腺体排列紊乱、局部融合，细胞核深染并失去极性。", zoom: 1.8, x: 110, y: 70 },
  { time: "00:26:05", title: "复核可疑浸润前沿", text: "不规则小腺体进入间质，并伴随促纤维反应，需要与高级别上皮内瘤变鉴别。", zoom: 2.25, x: -120, y: 35 },
] as const;

export function TeacherAbilityModule({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<ModuleView>("overview");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("trajectory");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const visibleRecords = records.filter((record) => record.teacherId === "teacher-wangziyue" && record.organizationId === "org-sensetime-medical" && (!query || `${record.title}${record.slide}${record.disease}`.includes(query)));

  if (view === "capture") {
    return <section className="teacher-capture">
      <header><button type="button" onClick={() => setView("records")}>← 返回教学记录</button><div><b>胃中分化腺癌教学阅片</b><small>LYND00600 · 教学分析记录 TA-20260831-01</small></div><span className={recording ? "live" : ""}>{recording ? `● 演示中 ${elapsed}` : "未开始"}</span></header>
      <div className="teacher-capture-body">
        <main><div className="teacher-slide-stage"><Image src="/synthetic-pathology-slide.png" alt="教学分析病理切片" width={1200} height={800} unoptimized /><i className="teacher-focus-box" /></div><div className="teacher-slide-controls"><button>−</button><span>100%</span><button>＋</button><button>复位</button></div></main>
        <aside>
          <div className="teacher-capture-title"><div><b>教学分析</b><small>演示数据／功能待接入，不会采集麦克风</small></div>{!recording ? <button type="button" onClick={() => { setSeconds(0); setRecording(true); }}>开始演示</button> : <button className="danger" type="button" onClick={() => { if (window.confirm("结束演示并查看预设分析界面？不会保存真实教学记录。")) { setRecording(false); setView("detail"); } }}>结束演示</button>}</div>
          <div className="teacher-live-metrics"><span><small>记录时长</small><b>{elapsed}</b></span><span><small>讲解转写</small><b>{recording ? "演示状态" : "待开始"}</b></span><span><small>互动问答</small><b>{recording ? "3 条" : "0 条"}</b></span><span><small>AI 调用</small><b>{recording ? "2 次" : "0 次"}</b></span></div>
          <article className="teacher-transcript"><header><b>教学记录示意</b><span>{recording ? "演示文本 · 非真实采集" : "开始后显示"}</span></header>{recording ? <>{evidencePoints.map((item) => <p key={item.time}><time>{item.time}</time><span>{item.text}</span></p>)}<p><time>00:31:16</time><span><em>互动问答</em> 学生询问如何区分腺癌与高级别上皮内瘤变，教师返回浸润前沿进行说明。</span></p><p><time>00:34:08</time><span><em>AI 核验</em> 教师查看 AI 建议后补充了间质反应证据，未直接采纳原结论。</span></p></> : <div className="teacher-empty">点击开始演示查看预设文本；录音、转写和同步回放后期接入。</div>}</article>
        </aside>
      </div>
    </section>;
  }

  if (view === "detail") {
    const evidence = evidencePoints[evidenceIndex];
    return <section className="teacher-analysis-detail">
      <header><button type="button" onClick={() => setView("records")}>← 返回教学记录</button><div><h2>胃中分化腺癌教学阅片</h2><p>TA-20260828-01 · 2026-08-28 14:10 · 38 分钟</p></div><span>分析完成</span></header>
      <div className="teacher-analysis-status">{[["讲解轨迹", "已完成"], ["互动问答", "已完成"], ["诊断一致性", "已完成"]].map(([name, state]) => <span key={name}><i>✓</i><b>{name}</b><small>{state}</small></span>)}</div>
      <nav>{[["trajectory", "讲解轨迹"], ["qa", "互动问答"], ["diagnosis", "诊断一致性"]].map(([id, label]) => <button type="button" className={analysisTab === id ? "active" : ""} onClick={() => setAnalysisTab(id as AnalysisTab)} key={id}>{label}</button>)}</nav>
      {analysisTab === "trajectory" ? <div className="teacher-evidence-layout"><aside><h3>讲解时间轴</h3><p>点击示例证据，查看预设图片视野；无真实音频。</p>{evidencePoints.map((item, index) => <button type="button" className={evidenceIndex === index ? "active" : ""} onClick={() => setEvidenceIndex(index)} key={item.time}><time>{item.time}</time><span><b>{item.title}</b><small>{item.text}</small></span></button>)}</aside><main><div className="teacher-evidence-slide"><div style={{ transform: `translate(${evidence.x}px, ${evidence.y}px) scale(${evidence.zoom})` }}><Image src="/synthetic-pathology-slide.png" alt="讲解证据对应切片区域" width={1200} height={800} unoptimized /><i /></div></div><footer><span>{evidence.zoom === 1 ? "100%" : `${Math.round(evidence.zoom * 100)}%`}</span><b>{evidence.time} · {evidence.title}</b><small>预设视野切换示意，非真实录音同步回放</small></footer></main></div> : null}
      {analysisTab === "qa" ? <div className="teacher-qa-list">{[
        ["00:18:26", "如何区分高级别上皮内瘤变和浸润性腺癌？", "教师回到浸润前沿，结合不规则小腺体与促纤维间质反应进行回答。", "回答准确且回到了切片证据；可以进一步要求学生先提出鉴别依据。"],
        ["00:27:40", "这一处坏死能直接说明恶性吗？", "教师说明坏死本身不能独立确定恶性，需要与腺体结构和细胞异型综合判断。", "回答完整，避免将单一征象等同于诊断结论。"],
      ].map(([time, question, answer, result]) => <article key={time}><header><time>{time}</time><span>知识点：诊断证据</span></header><h3>{question}</h3><div><b>教师回答</b><p>{answer}</p></div><footer><b>AI 分析</b><p>{result}</p><button type="button" onClick={() => { setAnalysisTab("trajectory"); setEvidenceIndex(2); }}>回看切片证据 →</button></footer></article>)}</div> : null}
      {analysisTab === "diagnosis" ? <div className="teacher-diagnosis"><div>{[["讲解中的诊断", "倾向胃腺癌，需确认浸润"], ["教师最终诊断", "胃中分化腺癌（活检）"], ["病例确认诊断", "胃中分化腺癌（活检）"], ["使用的 AI 结论", "倾向腺癌；教师补充浸润前沿证据后采纳"]].map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div><section><h3>差异与原始证据</h3><p><b>讲解前后变化：</b>教师最初保留浸润判断，在复核不规则小腺体与促纤维反应后形成最终诊断。</p><p><b>鉴别诊断：</b>覆盖高级别上皮内瘤变和胃腺瘤性病变，并说明了间质浸润这一关键差异。</p><p><b>免疫组化：</b>MMR 用于分子分型；HER2、PD-L1 根据治疗需求追加，与当前鉴别目标匹配。</p><button type="button" onClick={() => { setAnalysisTab("trajectory"); setEvidenceIndex(2); }}>定位到诊断变化证据 →</button></section></div> : null}
    </section>;
  }

  return <section className="teacher-ability">
    <header><div><button type="button" onClick={onBack}>← 切片图书馆</button><span>教师能力分析</span><h2>{view === "overview" ? "能力总览" : "教学记录"}</h2><p>以下为预设教学记录，不代表真实教师能力。</p></div><span className="teacher-rule">规则 v0.1 · 评分待确认</span></header>
    <nav><button type="button" className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>能力总览</button><button type="button" className={view === "records" ? "active" : ""} onClick={() => setView("records")}>教学记录</button></nav>
    {view === "overview" ? <>
      <div className="teacher-prerequisite"><b>能力结论以证据为先</b><span>当前仅展示原始证据、指标状态和变化趋势；评分权重确认前不生成确定性能力分数。</span></div>
      <div className="teacher-overview-grid"><article className="teacher-radar"><header><div><h3>四维能力画像</h3><p>最近 90 天 · 3 条有效教学记录</p></div><span>数据覆盖 76%</span></header><div className="radar-placeholder"><i /><i /><i /><i /><span>专业知识</span><span>教学技能</span><span>AI 应用</span><span>资源建设</span><b>证据<br />画像</b></div><footer>最近更新：2026-08-28 15:02 · 分析版本 A-0.1</footer></article><article className="teacher-summary"><h3>近期结论</h3><div className="teacher-highlight advantage"><b>优势</b><p>能够从整体结构进入高倍证据，并对 AI 初步结论进行核验后再采纳。</p><button type="button" onClick={() => setView("detail")}>查看 6 条证据 →</button></div><div className="teacher-highlight improve"><b>待提升</b><p>鉴别诊断讲解较完整，但引导学生主动提出判断依据的次数较少。</p><button type="button" onClick={() => setView("detail")}>查看 3 条证据 →</button></div></article></div>
      <div className="teacher-dimension-grid">{dimensions.map((item) => <button type="button" onClick={() => setView("detail")} key={item.name}><header><b>{item.name}</b><span className={`state-${item.state}`}>{item.state}</span></header><strong>{item.evidence}<small> 条有效证据</small></strong><p>{item.note}</p><footer>{item.trend}<i>查看指标与证据 →</i></footer></button>)}</div>
      <article className="teacher-suggestion"><header><div><span>高优先级</span><h3>在鉴别诊断讲解中增加启发式提问</h3></div><button type="button" onClick={() => setView("detail")}>回看依据</button></header><div><p><b>当前表现</b>近期 3 次教学均直接给出鉴别结论，学生主动组织证据的机会较少。</p><p><b>改进动作</b>给出诊断前，先让学生指出支持和排除两个候选诊断的切片证据。</p><p><b>应用场景</b>下一次胃癌或高级别上皮内瘤变教学阅片。</p><p><b>验证方式</b>后续记录中出现学生先陈述证据、教师再补充修正的问答链。</p></div><footer>证据来源：3 条教学记录 · 5 段互动问答</footer></article>
    </> : <>
      <div className="teacher-record-toolbar"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索切片、病例名称或病种" /></div><select aria-label="分析状态"><option>全部分析状态</option><option>分析完成</option><option>部分分析失败</option></select><select aria-label="能力维度"><option>全部能力维度</option><option>专业知识</option><option>教学技能</option><option>AI 应用</option><option>资源建设</option></select><button type="button" onClick={() => setView("capture")}>＋ 开展教学阅片</button></div>
      <div className="teacher-record-table"><div className="head"><span>教学记录</span><span>日期</span><span>时长</span><span>三类分析</span><span>状态</span><span>操作</span></div>{visibleRecords.map((record) => <div key={record.id}><span><b>{record.title}</b><small>{record.slide} · {record.disease} · {record.id}</small></span><span>{record.date}</span><span>{record.duration}</span><span><i className="done">讲解</i><i className="done">问答</i><i className={record.status === "部分分析失败" ? "failed" : "done"}>诊断</i></span><span className={record.status === "部分分析失败" ? "partial" : "complete"}>{record.status}</span><button type="button" onClick={() => setView("detail")}>查看分析</button></div>)}</div>
    </>}
  </section>;
}
