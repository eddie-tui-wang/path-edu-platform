import {initialLibraryCases} from './library.mjs';
import {questionKey,readQuestions,validateQuestion,releasedQuestions} from './question-bank.mjs';
export function seedQuestions(storage){
 const rows=readQuestions(storage),ids=new Set(rows.map(q=>q.id)),cases=initialLibraryCases();
 const common=(c,id)=>({id,revision:1,owner:'demo-teacher',caseSnapshot:c,image:c.images[0],imageId:c.imageIds[0],status:'confirmed',practiceOpen:false,confirmedBy:'预设流程示例',confirmedAt:'2026-09-09T00:00:00Z',simulated:true,options:[],correctId:'',reference:'',rubric:[],explanation:''});
 const single={...common(cases[0],'DEMO-PRACTICE-001'),type:'single',practiceOpen:true,prompt:'当前病史中哪项信息尚未提供？',options:[{id:'known',text:'已送检组织'},{id:'unknown',text:'免疫组化结果'}],correctId:'unknown',explanation:'病史明确说明送检组织供教学观察，免疫组化结果未提供，不能自行补全。'};
 const shorts=cases.slice(0,10).map((c,i)=>({...common(c,`DEMO-SHORT-${String(i+1).padStart(3,'0')}`),type:'short',prompt:'阅读图片和病史，描述主要观察、最可能诊断或不确定性、鉴别方向，以及必要的免疫组化与目的。',reference:'流程参考：区分已知与缺失信息，描述观察与不确定性，说明鉴别及辅助检查思路。本示例未提供医学标准答案。',rubric:[{text:'能区分已知、缺失信息并说明下一步思路（流程示例）',weight:100,dimension:'临床信息整合'}]}));
 const added=[single,...shorts].filter(q=>!ids.has(q.id));if(added.length)storage.setItem(questionKey,JSON.stringify([...rows,...added]));return [...rows,...added];
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
