export const questionKey='path-edu-question-bank-v1';
export function readQuestions(storage){const data=JSON.parse(storage.getItem(questionKey)||'[]');if(!Array.isArray(data))throw Error('题库数据格式错误，未覆盖原数据');return data;}
// Drafts do not supersede released versions; disabled releases must not revive older ones.
export function releasedQuestions(rows){return [...new Map(rows.filter(q=>q.status!=='draft').map(q=>[q.id,q])).values()];}
export function validateQuestion(q){
  if(!q.prompt?.trim())throw Error('请填写题干');
  if(!q.caseSnapshot?.id||!q.image||!q.imageId||!q.caseSnapshot.authorized||!q.caseSnapshot.images?.includes(q.image))throw Error('请选择已授权病例和图片');
  if(!['single','short'].includes(q.type))throw Error('仅支持单选和简答');
  if(q.type==='single'){
    if(q.options.length<2||q.options.some(o=>!o.text.trim())||new Set(q.options.map(o=>o.text.trim())).size!==q.options.length)throw Error('至少填写两个不重复的选项');
    if(new Set(q.options.map(o=>o.id)).size!==q.options.length||!q.options.some(o=>o.id===q.correctId))throw Error('请选择唯一正确选项');
    if(!q.explanation.trim())throw Error('请填写答案解析');
  }else{
    if(!q.reference.trim())throw Error('请填写简答参考答案');
    if(!q.rubric.length||q.rubric.some(r=>!r.text.trim()||!Number.isFinite(r.weight)||r.weight<=0||!r.dimension)||q.rubric.reduce((n,r)=>n+r.weight,0)!==100)throw Error('评分点需有内容、能力维度，权重合计100%');
  }
}
// ponytail: local demo revisions, not cross-device authorization or transactional persistence.
export function saveQuestion(storage,q,user,confirm=false){
  if(!user.roles.includes('teacher'))throw Error('仅教师可维护题库');
  const rows=readQuestions(storage),latest=rows.filter(r=>r.id===q.id).at(-1);
  if(latest&&latest.owner!==user.id)throw Error('不能修改其他教师题目');
  if(latest&&latest.revision!==(q.revision||0))throw Error('题目已在其他页面更新，请返回题库重新打开');
  if(confirm)validateQuestion(q);
  const saved=structuredClone({...q,owner:user.id,revision:(latest?.revision||0)+1,status:confirm?'confirmed':'draft',practiceOpen:false,confirmedBy:confirm?user.displayName:null,confirmedAt:confirm?new Date().toISOString():null});
  storage.setItem(questionKey,JSON.stringify([...rows,saved]));return saved;
}
export function setQuestionAvailability(storage,q,user,action){
  const rows=readQuestions(storage),index=rows.findLastIndex(r=>r.id===q.id&&r.status!=='draft'),latest=rows[index];
  if(!user.roles.includes('teacher')||!latest||latest.owner!==user.id)throw Error('无权操作此题');
  if(latest.revision!==q.revision)throw Error('版本已更新，请重新打开题库');
  if(action==='practice'&&latest.status!=='confirmed')throw Error('仅已确认题可开放练习');
  if(!['practice','disable'].includes(action))throw Error('无效操作');
  rows[index]={...latest,...(action==='practice'?{practiceOpen:!latest.practiceOpen}:{status:'disabled',practiceOpen:false})};storage.setItem(questionKey,JSON.stringify(rows));return rows[index];
}
