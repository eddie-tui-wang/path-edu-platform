import test from 'node:test';
import assert from 'node:assert/strict';
import {seedSamplePapers,samplePaperIds} from '../lib/sample-papers.mjs';
import {teachingKey} from '../lib/exam-drafts.mjs';
import {questionKey} from '../lib/question-bank.mjs';
function store(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
const types=e=>[...new Set(e.questions.map(q=>q.type))].sort();
test('sample papers satisfy the ten-image rule and the paper-type rule',()=>{
 const s=store(),added=seedSamplePapers(s);
 assert.equal(added.length,3,'three ready-made papers');
 assert.deepEqual(added.map(e=>e.id),samplePaperIds);
 for(const e of added){
  assert.equal(e.questions.length,10,e.title);
  assert.equal(e.imageCount,10,e.title);
  assert.equal(new Set(e.questions.map(q=>q.caseId)).size,10,e.title+' needs ten distinct image records');
  assert.equal(e.cancelled,false);
  assert.deepEqual(e.students,['demo-student']);
 }
 const byId=id=>added.find(e=>e.id===id);
 assert.deepEqual(types(byId(samplePaperIds[0])),['single']);
 assert.deepEqual(types(byId(samplePaperIds[1])),['short']);
 assert.deepEqual(types(byId(samplePaperIds[2])),['short','single'],'a mixed paper needs both types');
});
test('re-seeding is idempotent and never touches a teacher-created paper',()=>{
 const s=store();seedSamplePapers(s);
 const data=JSON.parse(s.getItem(teachingKey));
 s.setItem(teachingKey,JSON.stringify({...data,exams:[...data.exams,{id:'mine',owner:'demo-teacher',title:'教师自制卷'}]}));
 assert.equal(seedSamplePapers(s).length,0,'a second pass adds nothing');
 const after=JSON.parse(s.getItem(teachingKey)).exams;
 assert.equal(after.length,4);
 assert.ok(after.some(e=>e.id==='mine'),'the teacher paper must survive');
});
test('a sample that can no longer be built is skipped, not thrown',()=>{
 const s=store();seedSamplePapers(s);
 const questions=JSON.parse(s.getItem(questionKey)).map(q=>q.type==='single'?{...q,status:'disabled'}:q);
 s.setItem(questionKey,JSON.stringify(questions));
 const data=JSON.parse(s.getItem(teachingKey));
 s.setItem(teachingKey,JSON.stringify({...data,exams:data.exams.filter(e=>e.id!==samplePaperIds[0]&&e.id!==samplePaperIds[1])}));
 const added=seedSamplePaperSafe(s);
 assert.equal(added.some(e=>e.id===samplePaperIds[0]),false,'the choice sample must be skipped');
 assert.ok(added.some(e=>e.id===samplePaperIds[1]),'the short sample must still build');
});
function seedSamplePaperSafe(storage){try{return seedSamplePapers(storage);}catch(error){assert.fail('seeding must not throw: '+error.message);}}
