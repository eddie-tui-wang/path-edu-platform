import {readPractice} from './practice.mjs';
import {readAttempts} from './exam-attempts.mjs';
import {studentGrade} from './grading.mjs';
export function learningRecords(storage,user){
 if(!user.roles.includes('student'))return [];
 const practice=readPractice(storage,user).filter(r=>r.studentId===user.id).map(r=>{
  // 练习记录的记录级版本就是题目版本，逐题再显示一次会重复，故置空由记录标题统一表达。
  const q=r.question;return {id:r.id,source:'practice',title:q.prompt,time:r.submittedAt,state:'已提交',version:q.revision,versionLabel:'题目版本',total:null,reason:'',items:[{id:q.id,questionVersion:null,type:q.type,prompt:q.prompt,answer:q.type==='single'?(q.options.find(o=>o.id===r.answer)?.text||'未作答'):r.answer,reference:q.type==='single'?(q.options.find(o=>o.id===q.correctId)?.text||''):q.reference,explanation:q.explanation||'',comment:'',image:q.image,history:q.caseSnapshot.history,organ:q.caseSnapshot.organ||'未分类',wrong:q.type==='single'&&r.correct===false,score:null,maxScore:null}]};
 });
 const exams=readAttempts(storage).filter(a=>a.studentId===user.id).map(a=>{
  const grade=studentGrade(storage,a.id,user);
  return {id:a.id,source:'exam',title:a.exam.title,time:new Date(a.submittedAt||a.startedAt).toISOString(),state:grade?'已发布':a.status==='submitted'?'待发布':'进行中',version:grade?.releaseVersion||a.exam.version,versionLabel:grade?'成绩发布版本':'试卷版本',total:grade?.total??null,reason:grade?.reason||'',items:grade?grade.scores.map(s=>{const q=a.exam.questions.find(q=>q.id===s.questionId),c=a.exam.cases.find(c=>c.id===q?.caseId);return {id:s.questionId,questionVersion:q?.bankSnapshot?.revision??null,type:s.type,prompt:s.prompt,answer:s.type==='single'?(s.options.split('\n')[Number(s.answer)-1]||'未作答'):s.answer,reference:s.type==='single'?(s.options.split('\n')[Number(s.reference)-1]||''):s.reference,explanation:s.explanation,comment:s.comment,image:c?.images?.[0]||'',history:c?.history||'',organ:c?.organ||'未分类',wrong:s.type==='single'&&s.score<s.maxScore,score:s.score,maxScore:s.maxScore};}):[]};
 });return [...practice,...exams].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
}
/** @returns {any[]} */
export function wrongQuestions(records){return records.flatMap(r=>r.items.filter(q=>q.wrong).map(q=>({...q,key:r.id+':'+q.id,recordId:r.id,source:r.source,title:r.title,time:r.time,version:r.version,versionLabel:r.versionLabel,reason:r.reason})));}

export function abilityEvidence(records){
 const eligible=records.filter(r=>r.source==='practice'?r.state==='已提交':r.source==='exam'&&r.state==='已发布');
 return ['practice','exam'].map(source=>{
  const rows=eligible.filter(r=>r.source===source);
  return {source,records:rows,completed:rows.length,questions:rows.reduce((sum,r)=>sum+r.items.length,0),wrong:wrongQuestions(rows).length};
 });
}
