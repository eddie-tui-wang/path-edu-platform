"use client";

import { useMemo, useState } from "react";
import { teachingCases, type TeachingOpenMode } from "./teaching-module";

type TeachingSection = "database" | "exams" | "records" | "wrong" | "ability";
type ExamFilter = "全部" | "待参加" | "进行中" | "考试结果";
type CaseSource = "全部来源" | "标准数据库" | "院方数据库";
type ImportMode = "choose" | "local" | "pacs" | "platform";

const caseCatalog = [
  { id: "gastric-001", code: "STD-GI-018", title: "胃黏膜腺体异型增生", organ: "胃", disease: "胃腺癌", difficulty: "进阶", source: "标准数据库", space: "平台开放病例", version: "病例 v3.2" },
  { id: "breast-002", code: "HOS-BR-026", title: "乳腺浸润性导管癌", organ: "乳腺", disease: "乳腺癌", difficulty: "基础", source: "院方数据库", space: "空间三 · 病理教学与质控", version: "病例 v2.1" },
  { id: "colon-003", code: "STD-CRC-031", title: "结直肠腺癌鉴别诊断", organ: "结直肠", disease: "结直肠腺癌", difficulty: "挑战", source: "标准数据库", space: "平台开放病例", version: "病例 v4.0" },
] as const;

const examMeta = {
  "gastric-001": { code: "EX-202609-01", type: "混合试卷", cases: 2, questions: 12, window: "09-01 09:00 — 09-08 18:00", state: "进行中", action: "继续考试" },
  "breast-002": { code: "EX-202609-03", type: "选择题试卷", cases: 1, questions: 8, window: "09-03 09:00 — 09-10 18:00", state: "待参加", action: "查看考试" },
  "colon-003": { code: "EX-202608-12", type: "简答题试卷", cases: 2, questions: 10, window: "08-12 09:00 — 08-19 18:00", state: "考试结果", action: "查看结果" },
} as const;

const dimensions = [
  ["临床信息整合", 82, "稳定"],
  ["关键区域识别", 74, "待加强"],
  ["形态学判断", 86, "优势"],
  ["诊断与鉴别", 71, "待加强"],
  ["辅助检查规划", 78, "稳定"],
] as const;

export function StudentTeachingCenter({
  initialSection="database", embedded=false,
  onOpenExam,
  onOpenViewer,
}: {
  initialSection?:string; embedded?:boolean;
  onOpenExam: (caseId: string, mode: TeachingOpenMode) => void;
  onOpenViewer: (caseId: string) => void;
}) {
  const [section, setSection] = useState<TeachingSection>(initialSection as TeachingSection);
  const [source, setSource] = useState<CaseSource>("全部来源");
  const [examFilter, setExamFilter] = useState<ExamFilter>("全部");
  const [query, setQuery] = useState("");
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const visibleCases = useMemo(() => caseCatalog.filter((item) => (source === "全部来源" || item.source === source) && (!query || `${item.title}${item.organ}${item.disease}${item.code}`.toLowerCase().includes(query.toLowerCase()))), [source, query]);
  const visibleExams = teachingCases.filter((item) => examFilter === "全部" || examMeta[item.id].state === examFilter);

  const navigation: Array<[TeachingSection, string, string, number?]> = [
    ["exams", "考试中心", "▤", 2],
    ["database", "病例数据库", "▧", 3],
    ["records", "考试记录", "◷", 3],
    ["wrong", "错题集", "!", 4],
    ["ability", "能力分析", "◎"],
  ];

  return <section className={embedded?"teaching-center-shell panel embedded":"teaching-center-shell panel"}>
    {!embedded&&<aside className="teaching-center-nav">
      <nav>{navigation.map(([id, label, icon, count]) => <button type="button" className={section === id ? "active" : ""} onClick={() => setSection(id)} key={id}><i>{icon}</i><span>{label}</span>{count ? <em>{count}</em> : null}</button>)}</nav>
    </aside>}
    <main className="teaching-center-content"><span className="library-tag">示例数据</span>
      {section === "database" ? <CaseDatabase source={source} setSource={setSource} query={query} setQuery={setQuery} cases={visibleCases} onOpenViewer={onOpenViewer} onImport={() => setImportMode("choose")} /> : null}
      {section === "exams" ? <ExamCenter filter={examFilter} setFilter={setExamFilter} exams={visibleExams} onOpen={onOpenExam} /> : null}
      {section === "records" ? <ExamRecords onOpen={onOpenExam} /> : null}
      {section === "wrong" ? <WrongQuestions onOpen={onOpenExam} /> : null}
      {section === "ability" ? <AbilityProfile onOpen={onOpenExam} /> : null}
    </main>
    {importMode ? <TeachingDataImport mode={importMode} setMode={setImportMode} onClose={() => setImportMode(null)} /> : null}
  </section>;
}

function CaseDatabase({ source, setSource, query, setQuery, cases, onOpenViewer, onImport }: { source: CaseSource; setSource: (value: CaseSource) => void; query: string; setQuery: (value: string) => void; cases: readonly (typeof caseCatalog)[number][]; onOpenViewer: (caseId: string) => void; onImport: () => void }) {
  const [organ,setOrgan]=useState("全部部位"),[difficulty,setDifficulty]=useState("全部难度");
  const filtered=cases.filter(c=>(organ==="全部部位"||c.organ===organ)&&(difficulty==="全部难度"||c.difficulty===difficulty));
  return <div className="teaching-database">
    <header><div><h2>病例数据库</h2><p>浏览开放的教学示例病例。</p></div></header>
    <div className="teaching-filter"><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索病例编号、部位或病种" /></label><select aria-label="病例来源" value={source} onChange={(event) => setSource(event.target.value as CaseSource)}><option>全部来源</option><option>标准数据库</option><option>院方数据库</option></select><select aria-label="病例部位" value={organ} onChange={e=>setOrgan(e.target.value)}><option>全部部位</option><option>胃</option><option>乳腺</option><option>结直肠</option></select><select aria-label="病例难度" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>全部难度</option><option>基础</option><option>进阶</option><option>挑战</option></select></div>
    <div className="teaching-case-catalog">{filtered.map((item, index) => <article key={item.id}><button type="button" className="catalog-image" onClick={() => onOpenViewer(item.id)}><span style={{ backgroundImage: "url('/synthetic-pathology-slide.png')", backgroundPosition: `${28 + index * 24}% center` }} /></button><div className="catalog-body"><div><span>{item.organ}</span><span>{item.difficulty}</span><span>{item.version}</span></div><h3>{item.title}</h3><p>{item.code} · {item.disease}</p><small>{item.space}</small><button type="button" onClick={() => onOpenViewer(item.id)}>查看病例 →</button></div></article>)}</div>
    {!filtered.length ? <div className="teaching-empty"><b>未找到符合条件的病例</b><span>请调整关键词或筛选条件。</span></div> : null}
  </div>;
}

const pacsRows = [
  ["PACS-260901-001", "P20260004-1", "胃", "常规病理", "40×", "徕卡 GT450"],
  ["PACS-260901-002", "P20260004-6", "淋巴结", "常规病理", "40×", "徕卡 GT450"],
  ["PACS-260901-003", "A20260004-6", "乳腺", "免疫组化", "20×", "其他"],
  ["PACS-260901-004", "P20260007-3", "结直肠", "常规病理", "40×", "徕卡 GT450"],
] as const;

const platformRows = [
  ["CRC-教学病例集 v3", "结直肠", "128 例", "空间三 · 病理教学与质控", "已提交"],
  ["乳腺基础教学集 v2", "乳腺", "86 例", "多模态病理研究空间", "已提交"],
  ["胃黏膜病变示教集 v1", "胃", "52 例", "消化系统肿瘤研究空间", "已上传"],
] as const;

function TeachingDataImport({ mode, setMode, onClose }: { mode: ImportMode; setMode: (mode: ImportMode) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const rows = mode === "pacs" ? pacsRows : mode === "platform" ? platformRows : [];
  function choose(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }
  function changeMode(next: ImportMode) { setMode(next); setSelected([]); setImported(false); }

  return <div className="teaching-import-modal" role="dialog" aria-modal="true" aria-label="导入教学数据">
    <section>
      <header><div>{mode !== "choose" ? <button type="button" onClick={() => changeMode("choose")}>← 返回选择方式</button> : null}<h2>{mode === "choose" ? "导入数据" : mode === "local" ? "本地数据上传" : mode === "pacs" ? "从 PACS 导入" : "从生产平台导入"}</h2><p>{mode === "choose" ? "选择数据来源，导入后进入病例资料补充流程。" : "选择需要导入的切片数据，系统会检查格式与重复项。"}</p></div><button type="button" onClick={onClose} aria-label="关闭导入数据">×</button></header>
      {mode === "choose" ? <div className="import-methods">{[
        ["local", "↑", "本地数据上传", "上传本地切片、病例资料或压缩包", "支持 SVS、KFB、NDPI、TIFF"],
        ["pacs", "P", "从 PACS 导入", "检索院内 PACS 中的病理切片并批量导入", "按患者编号、切片号筛选"],
        ["platform", "▦", "从生产平台导入", "引用生产平台已有空间或项目数据集", "共享数据，不重复复制文件"],
      ].map(([id, icon, title, text, note]) => <button type="button" onClick={() => changeMode(id as ImportMode)} key={id}><i>{icon}</i><span><b>{title}</b><p>{text}</p><small>{note}</small></span><em>→</em></button>)}</div> : null}
      {mode === "local" ? <div className="local-import"><button type="button" className="import-dropzone" onClick={() => setSelected(["LOCAL-001", "LOCAL-002"])}><i>↑</i><b>拖拽文件到这里，或点击选择文件</b><span>支持单个切片、多个文件或 ZIP 压缩包</span></button>{selected.length ? <ImportQueue rows={[["胃窦活检_001.svs", "3.8 GB", "格式检查通过"], ["病例资料_001.xlsx", "28 KB", "字段检查通过"]]} imported={imported} /> : null}</div> : null}
      {mode === "pacs" || mode === "platform" ? <div className="source-import"><div className="import-filters"><label>⌕<input placeholder={mode === "pacs" ? "搜索患者编号、切片号" : "搜索空间、项目或数据集"} /></label>{mode === "pacs" ? <><select><option>全部切片类型</option><option>常规病理</option><option>免疫组化</option></select><select><option>全部上传时间</option><option>最近 7 天</option></select><select><option>扫描清晰</option></select></> : <><select><option>全部工作空间</option><option>空间三 · 病理教学与质控</option></select><select><option>全部数据状态</option><option>已提交</option></select></>}</div><div className={`import-source-table ${mode}`}><div className="head"><input type="checkbox" checked={selected.length === rows.length} onChange={() => setSelected(selected.length === rows.length ? [] : rows.map((row) => row[0]))} /><span>{mode === "pacs" ? "识别码" : "数据集"}</span><span>{mode === "pacs" ? "切片号" : "部位"}</span><span>{mode === "pacs" ? "切片部位" : "数据量"}</span><span>{mode === "pacs" ? "切片类型" : "来源空间"}</span><span>{mode === "pacs" ? "倍率" : "状态"}</span>{mode === "pacs" ? <span>设备</span> : null}</div>{rows.map((row) => <label key={row[0]}><input type="checkbox" checked={selected.includes(row[0])} onChange={() => choose(row[0])} />{row.map((cell) => <span key={cell}>{cell}</span>)}</label>)}</div>{selected.length ? <ImportQueue rows={selected.map((id) => [id, mode === "pacs" ? "病理切片" : "生产平台数据集", "等待导入"])} imported={imported} /> : null}</div> : null}
      {mode !== "choose" ? <footer><span>{imported ? `已完成 ${selected.length} 项导入` : `已选择 ${selected.length} 项`}</span><div><button type="button" onClick={onClose}>取消</button><button type="button" className="primary" disabled={!selected.length || imported} onClick={() => setImported(true)}>{imported ? "导入完成" : `导入${selected.length ? ` ${selected.length} 项` : ""}`}</button></div></footer> : null}
    </section>
  </div>;
}

function ImportQueue({ rows, imported }: { rows: readonly (readonly string[])[]; imported: boolean }) {
  return <section className="import-queue"><header><b>导入与计算状态</b><span>{imported ? "全部完成" : `${rows.length} 项等待导入`}</span></header>{rows.map((row) => <div key={row[0]}><span><b>{row[0]}</b><small>{row[1]}</small></span><em>{imported ? "✓ 完成" : row[2]}</em><i><b style={{ width: imported ? "100%" : "18%" }} /></i></div>)}</section>;
}

function ExamCenter({ filter, setFilter, exams, onOpen }: { filter: ExamFilter; setFilter: (value: ExamFilter) => void; exams: typeof teachingCases[number][]; onOpen: (caseId: string, mode: TeachingOpenMode) => void }) {
  return <div className="exam-center">
    <header><div><h2>考试中心</h2><p>仅显示分配给本人的考试；提交后答案与关键视野将被锁定。</p></div><b>3 场考试</b></header>
    <nav>{(["全部", "待参加", "进行中", "考试结果"] as ExamFilter[]).map((item) => <button type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}<em>{item === "全部" ? 3 : item === "考试结果" ? 1 : 1}</em></button>)}</nav>
    <div className="exam-list">{exams.map((item) => { const meta = examMeta[item.id]; return <article key={item.id}><div className={`exam-state state-${meta.state}`}><i>{meta.state === "进行中" ? "▶" : meta.state === "待参加" ? "◷" : "✓"}</i><span>{meta.state}</span></div><div className="exam-main"><header><div><span>{meta.type}</span><small>{meta.code}</small></div><em>{item.difficulty}</em></header><h3>{item.title.replace("病例", "考试")}</h3><p>{meta.window}</p><div><span><small>病例数量</small><b>{meta.cases}</b></span><span><small>题目数量</small><b>{meta.questions}</b></span><span><small>考试时长</small><b>{item.duration}</b></span></div></div><footer>{meta.state === "进行中" ? <span><small>当前进度</small><b>7 / {meta.questions} 题</b></span> : meta.state === "考试结果" ? <span><small>发布状态</small><b>结果已发布</b></span> : <span><small>开始前请阅读</small><b>考试说明与提交规则</b></span>}<button type="button" onClick={() => onOpen(item.id, meta.state === "考试结果" ? "result" : "case")}>{meta.action} →</button></footer></article>; })}</div>
  </div>;
}

function ExamRecords({ onOpen }: { onOpen: (caseId: string, mode: TeachingOpenMode) => void }) {
  const [filter,setFilter]=useState("全部状态");
  return <div className="learning-page"><header><div><h2>考试记录</h2><p>按考试时冻结的版本还原历史记录。</p></div><select aria-label="考试记录状态" value={filter} onChange={e=>setFilter(e.target.value)}><option>全部状态</option><option>结果已发布</option><option>等待发布</option></select></header><div className="learning-table"><div className="head"><span>考试名称</span><span>试卷类型</span><span>提交时间</span><span>结果状态</span><span>成绩</span><span>操作</span></div>{[["结直肠肿瘤鉴别诊断考试", "简答题试卷", "2026-08-19 16:42", "结果已发布", "82", "colon-003"], ["乳腺病理基础考试", "选择题试卷", "2026-08-04 10:18", "结果已发布", "91", "breast-002"], ["胃黏膜病变阶段测验", "混合试卷", "2026-07-26 14:31", "等待发布", "—", "gastric-001"]].filter(row=>filter==="全部状态"||row[3]===filter).map(([title, type, time, state, score, id]) => <div key={title}><span><b>{title}</b><small>冻结版本 · {id === "colon-003" ? "v4.0" : "v2.1"}</small></span><span>{type}</span><span>{time}</span><span><i className={state === "结果已发布" ? "published" : "waiting"} />{state}</span><strong>{score}</strong><button type="button" disabled={state !== "结果已发布"} onClick={() => onOpen(id, "result")}>{state === "结果已发布" ? "查看结果" : "等待发布"}</button></div>)}</div></div>;
}

function WrongQuestions({ onOpen }: { onOpen: (caseId: string, mode: TeachingOpenMode) => void }) {
  const [filter,setFilter]=useState("");
  const items = [["关键区域识别", "未完整标记可疑浸润前沿", "结直肠肿瘤鉴别诊断考试", "colon-003"], ["诊断与鉴别", "高级别上皮内瘤变与浸润性腺癌", "结直肠肿瘤鉴别诊断考试", "colon-003"], ["辅助检查规划", "HER2 与 MMR 的使用目的", "乳腺病理基础考试", "breast-002"], ["临床信息整合", "临床信息与镜下证据权重", "乳腺病理基础考试", "breast-002"]] as const;
  return <div className="learning-page"><header><div><h2>错题集</h2><p>回看答案、解析与切片证据，不提供重新作答。</p></div><b>4 道 · 2 场考试</b></header><div className="wrong-filter"><button className={!filter?"active":""} onClick={()=>setFilter("")}>全部类型</button>{["临床信息", "关键区域", "形态学", "诊断与鉴别", "辅助检查"].map((item) => <button key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="wrong-list">{!items.some(item=>!filter||item[0].includes(filter))&&<p role="status">没有此类型的错题，请调整筛选。</p>}{items.filter(item=>!filter||item[0].includes(filter)).map(([type, title, exam, id], index) => <article key={title}><i>{index + 1}</i><div><span>{type}</span><h3>{title}</h3><p>{exam} · 题目版本已冻结</p></div><strong>{index % 2 ? "多选题" : "关键视野题"}</strong><button type="button" onClick={() => onOpen(id, "result")}>查看解析与证据 →</button></article>)}</div></div>;
}

function AbilityProfile({ onOpen }: { onOpen: (caseId: string, mode: TeachingOpenMode) => void }) {
  return <div className="ability-profile"><header><div><h2>五维能力分析</h2><p>仅基于已发布考试和可追溯证据。</p></div><b>更新于 08-20</b></header><section className="ability-overview"><article><div className="ability-ring"><strong>78</strong><small>综合表现</small></div><div><h3>证据覆盖较完整</h3><p>基于最近 3 场已发布考试、26 道有效题目与 5 个关键视野。</p><span>分析版本 AP-0.3.1</span></div></article><article><b>本期建议</b><h3>优先加强诊断与鉴别的证据组织</h3><p>先指出支持诊断的形态证据，再对候选诊断逐项排除，避免只选择结论。</p><button type="button" onClick={() => onOpen("colon-003", "result")}>查看对应证据 →</button></article></section><div className="ability-dimensions">{dimensions.map(([name, score, state], index) => <button type="button" onClick={() => onOpen(index === 1 || index === 3 ? "colon-003" : "breast-002", "result")} key={name}><header><span>{name}</span><em>{state}</em></header><strong>{score}<small>/100</small></strong><i><b style={{ width: `${score}%` }} /></i><footer>{score < 76 ? "查看薄弱题目与切片证据" : "查看得分证据"}<span>→</span></footer></button>)}</div><section className="ability-evidence"><header><div><h3>能力变化证据</h3><p>每条结论均可回到考试、题目与关键视野。</p></div><select aria-label="能力分析时间范围" disabled title="固定样例未提供时间序列筛选"><option>最近 90 天</option><option>最近 30 天</option></select></header>{[["诊断与鉴别", "+6", "2 场考试 · 7 道题", "能够识别主要候选诊断，但排除依据仍不完整。"], ["关键区域识别", "+2", "3 场考试 · 5 个视野", "低倍定位稳定，高倍浸润前沿存在漏标。"], ["形态学判断", "+9", "3 场考试 · 6 道题", "腺体结构与细胞异型性判断持续稳定。"]].map(([name, change, source, text]) => <article key={name}><span>{name}<b>{change}</b></span><div><b>{source}</b><p>{text}</p></div><button type="button" onClick={() => onOpen("colon-003", "result")}>查看证据 →</button></article>)}</section></div>;
}
