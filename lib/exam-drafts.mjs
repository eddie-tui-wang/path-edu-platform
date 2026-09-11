function invalid(message,field){throw Object.assign(new Error(message),{field});}
export const teachingKey='path-edu-publishing-v1';
export function publishExam(draft,cases,students,owner) {
  if(!draft.title.trim()) invalid('请填写考试名称','title');
  if(!Number.isInteger(draft.minutes)||draft.minutes<1||draft.minutes>240)invalid('时限需为1–240分钟','minutes');
  if(!draft.students.length || draft.students.some(id=>!students.some(u=>u.id===id&&u.active&&u.roles.includes('student')))) invalid('请选择有效学生','students');
  if(!draft.questions.length) invalid('至少添加一道题','questions');
  const types=new Set(draft.questions.map(q=>q.type));
  if(!['choice','short','mixed'].includes(draft.type) || (draft.type==='choice'&&types.has('short')) || (draft.type==='short'&&types.size!==1) || (draft.type==='short'&&!types.has('short')) || (draft.type==='mixed'&&(!types.has('short')||types.size<2))) invalid('题型与卷型不匹配：混合卷须同时包含选择和简答','type');
  for(const [index,q] of draft.questions.entries()) {
    try {
    const c=cases.find(c=>c.id===q.caseId&&c.owner===owner);
    if(!c||!c.images.length||!c.source.trim()||!c.authorized||!c.reference.trim()) invalid('病例需有图片、来源、使用确认及参考答案','caseId');
    if(!q.prompt.trim())invalid('请填写题干','prompt');
    if(!Number.isInteger(q.points)||q.points<1||q.points>100)invalid('分值需为1–100整数','points');
    if(!['single','multiple','short'].includes(q.type))invalid('请选择有效题型','type');
    if(q.type==='short') {
      if(!q.answer.trim())invalid('请填写参考答案','answer');
      if(!q.rubric.trim())invalid('请填写评分要点','rubric');
      const points=q.rubric.trim().split('\n').map(line=>line.match(/^\s*(\d+)\s*[:：]\s*(\S.*)$/));
      if(points.some(p=>!p||Number(p[1])<1)||points.reduce((n,p)=>n+Number(p?.[1]||0),0)!==q.points)invalid('评分要点需完整且分值合计等于题目分值','rubric');
    }
    else {
      const options=q.options.split('\n').map(s=>s.trim()).filter(Boolean),answers=q.answer.split(',').map(s=>Number(s.trim()));
      if(options.length<2||new Set(options).size!==options.length)invalid('至少两个不重复选项','options');
      if(!q.answer.trim()||new Set(answers).size!==answers.length||answers.some(n=>!Number.isInteger(n)||n<1||n>options.length)||(q.type==='single'&&answers.length!==1))invalid('答案填写有效选项序号（多选用英文逗号分隔）','answer');
    }
    } catch(error) {error.questionIndex=index;throw error;}
  }
  return structuredClone({...draft,id:crypto.randomUUID(),owner,publishedAt:new Date().toISOString(),cases:cases.filter(c=>draft.questions.some(q=>q.caseId===c.id)),version:1});
}
export function studentExams(exams,userId) {return exams.filter(e=>e.students.includes(userId));}
