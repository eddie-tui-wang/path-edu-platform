import test from 'node:test';
import assert from 'node:assert/strict';
import {readQuestions,saveQuestion,setQuestionAvailability,validateQuestion,releasedQuestions} from '../lib/question-bank.mjs';
const teacher={id:'t1',roles:['teacher'],displayName:'测试教师'};
const make=()=>({id:'q1',revision:0,type:'single',prompt:'哪项已知？',caseSnapshot:{id:'c1',authorized:true,images:['/demo.png']},image:'/demo.png',imageId:'image1',options:[{id:'a',text:'未知'},{id:'b',text:'已知'}],correctId:'b',explanation:'材料明确给出',reference:'',rubric:[]});
function storage(){let value=null;return {getItem:()=>value,setItem:(k,v)=>{value=v;}};}
test('single answer follows stable ID through reordering; deleting correct option blocks confirmation',()=>{
 const q=make();q.options.reverse();validateQuestion(q);assert.equal(q.options.find(o=>o.id===q.correctId).text,'已知');q.options=[{id:'a',text:'未知'},{id:'c',text:'另一项'}];assert.throws(()=>validateQuestion(q),/正确/);
});
test('draft, confirmation, practice and disable are distinct; revisions preserve old answer',()=>{
 const s=storage();let q=saveQuestion(s,make(),teacher);assert.throws(()=>setQuestionAvailability(s,q,teacher,'practice'),/无权|已确认/);
 q=saveQuestion(s,q,teacher,true);assert.equal(q.practiceOpen,false);q=setQuestionAvailability(s,q,teacher,'practice');assert.equal(q.practiceOpen,true);
 const next=saveQuestion(s,{...q,correctId:'a'},teacher,true);assert.equal(next.practiceOpen,false);assert.equal(readQuestions(s)[1].correctId,'b');assert.equal(next.revision,3);
 assert.equal(setQuestionAvailability(s,next,teacher,'disable').status,'disabled');
});
test('ownership, stale version and failed persistence do not silently overwrite',()=>{
 const s=storage(),q=saveQuestion(s,make(),teacher,true);assert.throws(()=>saveQuestion(s,q,{...teacher,id:'other'}),/其他教师/);assert.throws(()=>saveQuestion(s,make(),teacher),/其他页面/);
 assert.throws(()=>saveQuestion(s,q,{...teacher,roles:['student']}),/仅教师/);
 assert.throws(()=>saveQuestion({getItem:s.getItem,setItem:()=>{throw Error('quota');}},q,teacher),/quota/);assert.equal(readQuestions(s).length,1);
 assert.throws(()=>readQuestions({getItem:()=>'{bad'}));
});
test('short rubric requires reference, positive weights summing to 100 and dimensions',()=>{
 const q={...make(),type:'short',reference:'参考',rubric:[{text:'鉴别依据',weight:60,dimension:'诊断与鉴别'},{text:'检查目的',weight:40,dimension:'辅助检查规划'}]};validateQuestion(q);q.rubric[0].weight=50;assert.throws(()=>validateQuestion(q),/100/);
});

test('working drafts preserve released practice and disabled releases never revive older versions',()=>{
 const s=storage();let q=saveQuestion(s,make(),teacher,true);
 q=setQuestionAvailability(s,q,teacher,'practice');
 const draft=saveQuestion(s,{...q,prompt:'草稿新题干'},teacher);
 assert.equal(releasedQuestions(readQuestions(s))[0].revision,q.revision);
 assert.equal(releasedQuestions(readQuestions(s))[0].practiceOpen,true);
 setQuestionAvailability(s,q,teacher,'disable');
 assert.equal(releasedQuestions(readQuestions(s))[0].status,'disabled');
 const next=saveQuestion(s,draft,teacher,true);
 assert.equal(releasedQuestions(readQuestions(s))[0].revision,next.revision);
 assert.equal(releasedQuestions(readQuestions(s))[0].practiceOpen,false);
 assert.throws(()=>setQuestionAvailability(s,q,teacher,'practice'),/版本/);
});
