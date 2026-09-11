import {initialLibraryCases} from './library.mjs';
import {questionKey,readQuestions,validateQuestion,releasedQuestions} from './question-bank.mjs';
// Process-example single-choice items, one per case, so a ten-image choice paper can exist.
// They ask the reader to check the synthetic record; they assert no medical conclusion.
const singleSpecs=[
 {prompt:'本例「既往史」字段的状态是？',a:'未提供',b:'已完整提供',correct:'a',why:'临床资料的既往史一项明确为「未提供」，不能自行补全。'},
 {prompt:'本例的送检信息说明了什么？',a:'教学组织图片，非真实患者资料',b:'已核验的真实患者资料',correct:'a',why:'送检信息写明为教学组织图片，且非真实患者资料。'},
 {prompt:'关于免疫组化结果，本例的正确描述是？',a:'病史中已给出结果',b:'未提供',correct:'b',why:'病史注明免疫组化结果未提供，属缺失信息。'},
 {prompt:'本例素材的来源是？',a:'公开合成教学占位图片',b:'院内真实病理扫描',correct:'a',why:'病例来源字段为公开合成教学占位图片。'},
 {prompt:'本例现病史提供了什么？',a:'发现病变后送检，但未提供具体病程',b:'完整的病程与治疗经过',correct:'a',why:'现病史只说明送检，具体病程标注未提供。'},
 {prompt:'仅依据本例现有资料，最合适的下一步是？',a:'说明信息缺失并列出待补充项',b:'直接给出确定诊断',correct:'a',why:'资料存在明确缺失项，应先说明缺失，而不是给出确定结论。'},
 {prompt:'病史说明送检组织的用途是？',a:'供教学观察',b:'供临床诊断',correct:'a',why:'病史写明送检组织供教学观察。'},
 {prompt:'本例主诉的描述是？',a:'局部病变待评估（模拟）',b:'明确的病理诊断',correct:'a',why:'主诉字段为「局部病变待评估（模拟）」。'},
 {prompt:'本例资料能否直接作为临床诊断依据？',a:'不能，为预设模拟内容',b:'能，等同正式病理报告',correct:'a',why:'病例参考明确标注为预设模拟内容，不是医学标准答案。'},
];
export function seedQuestions(storage){
 const rows=readQuestions(storage),ids=new Set(rows.map(q=>q.id)),cases=initialLibraryCases();
 const common=(c,id)=>({id,revision:1,owner:'demo-teacher',caseSnapshot:c,image:c.images[0],imageId:c.imageIds[0],status:'confirmed',practiceOpen:false,confirmedBy:'预设流程示例',confirmedAt:'2026-09-09T00:00:00Z',simulated:true,options:[],correctId:'',reference:'',rubric:[],explanation:''});
 const single={...common(cases[0],'DEMO-PRACTICE-001'),type:'single',practiceOpen:true,prompt:'当前病史中哪项信息尚未提供？',options:[{id:'known',text:'已送检组织'},{id:'unknown',text:'免疫组化结果'}],correctId:'unknown',explanation:'病史明确说明送检组织供教学观察，免疫组化结果未提供，不能自行补全。'};
 const shorts=cases.slice(0,10).map((c,i)=>({...common(c,`DEMO-SHORT-${String(i+1).padStart(3,'0')}`),type:'short',prompt:'阅读图片和病史，描述主要观察、最可能诊断或不确定性、鉴别方向，以及必要的免疫组化与目的。',reference:'流程参考：区分已知与缺失信息，描述观察与不确定性，说明鉴别及辅助检查思路。本示例未提供医学标准答案。',rubric:[{text:'能区分已知、缺失信息并说明下一步思路（流程示例）',weight:100,dimension:'临床信息整合'}]}));
 // One confirmed single per case (cases[1..9]); cases[0] already has DEMO-PRACTICE-001.
 const extraSingles=cases.slice(1,10).map((c,i)=>{const s=singleSpecs[i];return {...common(c,'DEMO-SINGLE-'+String(i+2).padStart(3,'0')),type:'single',prompt:s.prompt,options:[{id:'a',text:s.a},{id:'b',text:s.b}],correctId:s.correct,explanation:s.why};});
 const added=[single,...extraSingles,...shorts].filter(q=>!ids.has(q.id));if(added.length)storage.setItem(questionKey,JSON.stringify([...rows,...added]));return [...rows,...added];
}
export function availablePractice(rows){return releasedQuestions(rows).filter(q=>q.status==='confirmed'&&q.practiceOpen).map(q=>({id:q.id,revision:q.revision,type:q.type,prompt:q.prompt,options:q.options,caseId:q.caseSnapshot.id,caseTitle:q.caseSnapshot.title,organ:q.caseSnapshot.organ,history:q.caseSnapshot.history,image:q.image,imageId:q.imageId,simulated:q.simulated}));}
export const practiceKey=id=>'path-edu-practice-'+id;
export function readPractice(storage,user){const rows=JSON.parse(storage.getItem(practiceKey(user.id))||'[]');if(!Array.isArray(rows))throw Error('练习记录损坏，原数据未覆盖');return rows;}
export function submitPractice(storage,user,question,answer){
 if(!user.roles.includes('student'))throw Error('仅学生可提交练习');
 const records=readPractice(storage,user),old=records.find(r=>r.questionId===question.id&&r.revision===question.revision);if(old)return old;
 const q=releasedQuestions(readQuestions(storage)).find(q=>q.id===question.id);
 if(!q||q.revision!==question.revision||q.status!=='confirmed'||!q.practiceOpen)throw Error('题目已更新或关闭，请返回列表；当前输入仍保留');
 validateQuestion(q);
 if(typeof answer!=='string'||!answer.trim()||(q.type==='single'&&!q.options.some(o=>o.id===answer)))throw Error('请填写有效答案后提交');
 const record=structuredClone({id:crypto.randomUUID(),questionId:q.id,revision:q.revision,studentId:user.id,submittedAt:new Date().toISOString(),answer,question:q,correct:q.type==='single'?answer===q.correctId:null,source:'practice'});
 storage.setItem(practiceKey(user.id),JSON.stringify([...records,record]));return record;
}
