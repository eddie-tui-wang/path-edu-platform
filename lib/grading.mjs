import {readAttempts} from './exam-attempts.mjs';
import {readLibraryStore} from './library.mjs';
export const gradingKey='path-edu-grading-v1';
export function readGrading(storage){const d=JSON.parse(storage.getItem(gradingKey)||'{"reviews":[],"releases":[]}');if(!d||!Array.isArray(d.reviews)||!Array.isArray(d.releases))throw Error('评分数据损坏，未覆盖');return d;}
function ownExam(storage,id,user){const e=readLibraryStore(storage).exams.find(e=>e.id===id);if(!user.roles.includes('teacher')||!e||e.owner!==user.id)throw Error('无权阅卷');return e;}
export const reviewDraftKey=(user,attemptId)=>'path-edu-review-draft-'+user.id+'-'+attemptId;
export function readReviewDraft(storage,attemptId,user){
 const a=readAttempts(storage).find(a=>a.id===attemptId);
 if(!a||a.status!=='submitted')throw Error('只能批阅已提交答卷');
 ownExam(storage,a.examId,user);
 const raw=storage.getItem(reviewDraftKey(user,attemptId));if(!raw)return null;
 const d=JSON.parse(raw);if(!d||!d.marks||typeof d.marks!=='object'||typeof d.reason!=='string'||!Number.isInteger(d.baseVersion))throw Error('评分草稿损坏，未覆盖原数据');
 return d;
}
export function saveReviewDraft(storage,attemptId,user,marks,baseVersion,reason){
 readReviewDraft(storage,attemptId,user);
 const latest=readGrading(storage).reviews.filter(r=>r.attemptId===attemptId).at(-1);
 if((latest?.version||0)!==baseVersion)throw Error('评分版本已更新，草稿未覆盖，请重新打开答卷');
 const draft={marks,baseVersion,reason,savedAt:new Date().toISOString()};
 storage.setItem(reviewDraftKey(user,attemptId),JSON.stringify(draft));return draft;
}
export function reviewAttempt(storage,attemptId,user,marks,baseVersion=0,reason=''){
 const a=readAttempts(storage).find(a=>a.id===attemptId);if(!a||a.status!=='submitted')throw Error('只能批阅已提交答卷');
 const exam=ownExam(storage,a.examId,user),data=readGrading(storage),previous=data.reviews.filter(r=>r.attemptId===a.id).at(-1);
 if((previous?.version||0)!==baseVersion)throw Error('评分版本已更新，请重新打开');if(previous&&!reason.trim())throw Error('修改评分须填写原因');
 const scores=exam.questions.map(q=>{
  const answer=a.answers[q.id]||'',m=marks[q.id];
  let score=0,comment='未作答';
  if(q.type==='single'){score=answer===q.answer?q.points:0;comment=answer?'按冻结正确项计分':'未作答';}
  else if(answer.trim()){
   if(!m||typeof m.score!=='number'||!Number.isFinite(m.score)||m.score<0||m.score>q.points||!m.comment?.trim())throw Error('简答须填写范围内得分及点评');score=m.score;comment=m.comment.trim();
  }
  return {questionId:q.id,prompt:q.prompt,score,maxScore:q.points,comment,answer,reference:q.answer,explanation:q.explanation||'',options:q.options,type:q.type};
 });
 const result={attemptId:a.id,examId:a.examId,studentId:a.studentId,version:(previous?.version||0)+1,scores,total:Math.round(scores.reduce((n,s)=>n+s.score,0)*100)/100,reviewedBy:user.id,reviewedAt:new Date().toISOString(),reason};
 storage.setItem(gradingKey,JSON.stringify({...data,reviews:[...data.reviews,result]}));return result;
}
export function releaseGrades(storage,examId,user){
 ownExam(storage,examId,user);const data=readGrading(storage),attempts=readAttempts(storage).filter(a=>a.examId===examId&&a.status==='submitted');if(!attempts.length)throw Error('暂无已提交答卷');
 const results=attempts.map(a=>{const r=data.reviews.filter(r=>r.attemptId===a.id).at(-1);if(!r)throw Error('仍有已提交答卷未复核');return r;});
 const prior=data.releases.filter(r=>r.examId===examId).at(-1);if(prior&&JSON.stringify(prior.results)===JSON.stringify(results))return prior;
 const release={examId,version:(prior?.version||0)+1,publishedAt:new Date().toISOString(),publishedBy:user.id,results:structuredClone(results)};
 storage.setItem(gradingKey,JSON.stringify({...data,releases:[...data.releases,release]}));return release;
}
export function studentGrade(storage,attemptId,user){
 if(!user.roles.includes('student'))return null;const a=readAttempts(storage).find(a=>a.id===attemptId&&a.studentId===user.id);if(!a)return null;
 const release=readGrading(storage).releases.filter(r=>r.examId===a.examId).at(-1);const result=release?.results.find(r=>r.attemptId===a.id&&r.studentId===user.id);return result?{...result,releaseVersion:release.version,publishedAt:release.publishedAt}:null;
}
