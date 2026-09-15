import {readLibraryStore} from './library.mjs';
export const attemptsKey='path-edu-exam-attempts-v1';
export function examStatus(exam,attempt,published=false,now=Date.now()){
 if(attempt?.status==='submitted')return published?'成绩已发布':'待发布成绩';
 if(attempt)return now>=attempt.deadline?'已截止，待确认提交':'进行中';
 const start=Date.parse(exam.opensAt),end=Date.parse(exam.closesAt);
 if(!Number.isFinite(start)||!Number.isFinite(end))return '待教师配置';
 return now<start?'未开放':now>=end?'已截止':'可开始';
}
export function readAttempts(storage){const rows=JSON.parse(storage.getItem(attemptsKey)||'[]');if(!Array.isArray(rows))throw Error('答卷存储格式错误，未重置');return rows;}
export function publicExam(exam){return {id:exam.id,title:exam.title,version:exam.version,minutes:exam.minutes,opensAt:exam.opensAt,closesAt:exam.closesAt,questions:exam.questions.map(q=>({id:q.id,type:q.type,prompt:q.prompt,points:q.points,options:q.options,caseId:q.caseId})),cases:exam.cases.map(c=>({id:c.id,title:c.title,history:c.history,images:c.images}))};}
function paper(storage,id,user){if(!user.roles.includes('student'))throw Error('仅学生可作答');const exam=readLibraryStore(storage).exams.find(e=>e.id===id&&e.students.includes(user.id));if(!exam||exam.cancelled)throw Error('考试未分配或已取消');return exam;}
// One attempt per exam per student is the rule for real papers: an existing attempt is returned,
// submitted or not. Sample papers may be retaken for demos (`retake`), and a retake REPLACES the
// previous attempt instead of adding a second one — every reader looks up attempts with
// find(examId && studentId), so a second record would shadow the new one. The old result is
// discarded deliberately; that is what retaking a demo paper means.
export function startAttempt(storage,examId,user,now=Date.now(),{retake=false}={}){
 const exam=paper(storage,examId,user),rows=readAttempts(storage),existing=rows.find(a=>a.examId===examId&&a.studentId===user.id);if(existing&&!retake)return existing;
  const kept=retake?rows.filter(a=>!(a.examId===examId&&a.studentId===user.id)):rows;
 const open=Date.parse(exam.opensAt),close=Date.parse(exam.closesAt);
 if(!Number.isFinite(open)||!Number.isFinite(close)||exam.questions.some(q=>!['single','short'].includes(q.type)))throw Error('此历史试卷需重新配置后发放');
 if(now<open||now>=close)throw Error('不在考试开放时间内');
 const attempt={id:crypto.randomUUID(),examId,studentId:user.id,revision:1,exam:publicExam(exam),startedAt:now,deadline:Math.min(close,now+exam.minutes*60000),lastSavedAt:now,currentQuestion:0,answers:{},status:'in_progress'};
 storage.setItem(attemptsKey,JSON.stringify([...kept,attempt]));return attempt;
}
export function saveAttempt(storage,attempt,user,answers,currentQuestion,now=Date.now()){
 paper(storage,attempt.examId,user);const rows=readAttempts(storage),i=rows.findIndex(a=>a.id===attempt.id&&a.studentId===user.id),old=rows[i];
 if(!old)throw Error('答卷不存在');if(old.status!=='in_progress')throw Error('答卷已提交');
 if(old.revision!==attempt.revision)throw Error('答卷已在其他页面更新，请重新打开，当前输入未覆盖');
 if(Math.max(now,old.lastSavedAt)>=old.deadline)throw Error('考试已截止，新增内容未被接受');
 if(!Number.isInteger(currentQuestion)||currentQuestion<0||currentQuestion>=old.exam.questions.length)throw Error('题号无效');
 for(const [id,value] of Object.entries(answers)){
  const q=old.exam.questions.find(q=>q.id===id);if(!q||typeof value!=='string'||value.length>20000)throw Error('答案格式无效或超过20000字');
  if(q.type==='single'&&value!==''&&(!/^\d+$/.test(value)||Number(value)<1||Number(value)>q.options.split('\n').length))throw Error('单选答案无效');
 }
 const next={...old,answers:structuredClone(answers),currentQuestion,revision:old.revision+1,lastSavedAt:Math.max(now,old.lastSavedAt)};rows[i]=next;storage.setItem(attemptsKey,JSON.stringify(rows));return next;
}
export function submitAttempt(storage,attempt,user,automatic=false,now=Date.now()){
 paper(storage,attempt.examId,user);const rows=readAttempts(storage),i=rows.findIndex(a=>a.id===attempt.id&&a.studentId===user.id),old=rows[i];if(!old)throw Error('答卷不存在');if(old.status==='submitted')return old;
 const expired=Math.max(now,old.lastSavedAt)>=old.deadline;
 if(automatic&&!expired)throw Error('考试尚未截止');if(!automatic&&expired)throw Error('已截止，只能提交截止前保存的答案');
 if(!automatic&&old.revision!==attempt.revision)throw Error('答卷版本已更新，请重新打开');
 const next={...old,status:'submitted',submittedAt:now,submitReason:automatic?'timeout':'manual',revision:old.revision+1};rows[i]=next;storage.setItem(attemptsKey,JSON.stringify(rows));return next;
}
