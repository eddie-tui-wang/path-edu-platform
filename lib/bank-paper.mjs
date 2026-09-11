import {readQuestions,validateQuestion,releasedQuestions} from './question-bank.mjs';
import {readLibraryStore} from './library.mjs';
import {teachingKey} from './exam-drafts.mjs';
export function buildBankPaper(draft,bank,students,user,now=Date.now()){
 if(!user.roles.includes('teacher'))throw Error('仅教师可发放');
 if(!draft.title.trim())throw Error('请填写试卷名称');
 if(!Number.isInteger(draft.minutes)||draft.minutes<1||draft.minutes>240)throw Error('时限为1–240分钟');
 const start=Date.parse(draft.opensAt),end=Date.parse(draft.closesAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end<=now)throw Error('请设置有效开放与关闭时间，关闭时间必须在未来');
 if(!draft.students.length||new Set(draft.students).size!==draft.students.length||draft.students.some(id=>!students.some(s=>s.id===id&&s.active&&s.roles.includes('student'))))throw Error('请选择有效学生');
 if(!draft.selections.length||new Set(draft.selections.map(s=>s.id)).size!==draft.selections.length)throw Error('请选择题目，不可重复选同一题');
 const chosen=draft.selections.map(s=>{
  const q=releasedQuestions(bank).find(q=>q.id===s.id);
  if(!q||q.owner!==user.id||q.status!=='confirmed'||q.revision!==s.revision)throw Error('所选题目已更新、停用或不属于当前教师，请重新选择');
  validateQuestion(q);if(!Number.isInteger(s.points)||s.points<1||s.points>100)throw Error('每题分值须为1–100整数');
  return {...q,points:s.points};
 });
 const images=new Set(chosen.map(q=>q.imageId+'@'+q.caseSnapshot.version));if(images.size!==10)throw Error(`模拟考试需要10个切片记录，当前${images.size}个`);
 const types=new Set(chosen.map(q=>q.type));
 if(!['choice','short','mixed'].includes(draft.type)||(draft.type==='choice'&&(types.size!==1||!types.has('single')))||(draft.type==='short'&&(types.size!==1||!types.has('short')))||(draft.type==='mixed'&&types.size!==2))throw Error('试卷类型与所选题目不一致');
 // Reuse the existing frozen-exam preview shape; question-specific case keys preserve image and case versions.
 const cases=chosen.map(q=>({...q.caseSnapshot,id:q.id+':'+q.revision,images:[q.image]}));
 const questions=chosen.map(q=>({id:q.id,bankRevision:q.revision,caseId:q.id+':'+q.revision,type:q.type,prompt:q.prompt,points:q.points,options:q.options.map(o=>o.text).join('\n'),answer:q.type==='single'?String(q.options.findIndex(o=>o.id===q.correctId)+1):q.reference,explanation:q.explanation,rubric:q.rubric.map(r=>`${r.weight*q.points/100}:${r.text}`).join('\n'),bankSnapshot:q}));
 return structuredClone({...draft,id:draft.id,source:'question-bank',owner:user.id,version:1,publishedAt:new Date(now).toISOString(),cases,questions,imageCount:10,cancelled:false});
}
export function publishBankPaper(storage,draft,students,user){
 const data=readLibraryStore(storage),existing=data.exams.find(e=>e.id===draft.id);
 if(existing){if(existing.owner!==user.id)throw Error('试卷编号冲突');return existing;}
 const exam=buildBankPaper(draft,readQuestions(storage),students,user);
 storage.setItem(teachingKey,JSON.stringify({...data,exams:[...data.exams,exam]}));return exam;
}
