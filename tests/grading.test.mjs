import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAttempt,releaseGrades,studentGrade,readGrading,saveReviewDraft,readReviewDraft} from '../lib/grading.mjs';
import {attemptsKey} from '../lib/exam-attempts.mjs';
import {teachingKey} from '../lib/exam-drafts.mjs';
const teacher={id:'t',roles:['teacher']},student={id:'s',roles:['student']};
test('partial review drafts restore without grading or publishing; stale and unauthorized writes fail',()=>{
 const s=setup(),marks={q2:{score:'7',comment:''}};
 saveReviewDraft(s,'a',teacher,marks,0,'');
 assert.deepEqual(readReviewDraft(s,'a',teacher).marks,marks);
 assert.equal(readGrading(s).reviews.length,0);
 assert.equal(studentGrade(s,'a',student),null);
 assert.throws(()=>readReviewDraft(s,'a',student),/无权/);
 assert.throws(()=>saveReviewDraft({...s,setItem:()=>{throw Error('quota');}},'a',teacher,{},0,''),/quota/);
 assert.deepEqual(readReviewDraft(s,'a',teacher).marks,marks);
 reviewAttempt(s,'a',teacher,{q2:{score:7,comment:'已核对'}});
 assert.throws(()=>saveReviewDraft(s,'a',teacher,{},0,''),/更新/);
 assert.equal(readReviewDraft(s,'a',teacher).baseVersion,0);
});
function setup(){const values=new Map(),s={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};s.setItem(teachingKey,JSON.stringify({cases:[],drafts:[],exams:[{id:'e',owner:'t',questions:[{id:'q1',type:'single',points:10,answer:'2',options:'A\nB',prompt:'题1'},{id:'q2',type:'short',points:10,answer:'参考',prompt:'题2'}]}]}));s.setItem(attemptsKey,JSON.stringify([{id:'a',examId:'e',studentId:'s',status:'submitted',answers:{q1:'2',q2:'原答'}}]));return s;}
test('review does not expose results before release; single scoring ignores supplied score',()=>{
 const s=setup();assert.equal(studentGrade(s,'a',student),null);const r=reviewAttempt(s,'a',teacher,{q1:{score:0},q2:{score:7,comment:'部分完整'}});assert.equal(r.total,17);assert.equal(studentGrade(s,'a',student),null);releaseGrades(s,'e',teacher);assert.equal(studentGrade(s,'a',student).total,17);assert.equal(studentGrade(s,'a',{id:'other',roles:['student']}),null);
});
test('grading requires valid scores, feedback, ownership, and all submitted reviews',()=>{
 const s=setup();assert.throws(()=>reviewAttempt(s,'a',teacher,{q2:{score:11,comment:'x'}}));assert.throws(()=>reviewAttempt(s,'a',teacher,{q2:{score:8,comment:''}}));assert.throws(()=>reviewAttempt(s,'a',{id:'admin',roles:['admin']},{}));assert.throws(()=>releaseGrades(s,'e',teacher),/未复核/);
});
test('correction preserves release until republished and requires version and reason',()=>{
 const s=setup();reviewAttempt(s,'a',teacher,{q2:{score:7,comment:'初评'}});releaseGrades(s,'e',teacher);assert.throws(()=>reviewAttempt(s,'a',teacher,{q2:{score:8,comment:'更正'}}),/更新/);assert.throws(()=>reviewAttempt(s,'a',teacher,{q2:{score:8,comment:'更正'}},1),/原因/);
 reviewAttempt(s,'a',teacher,{q2:{score:8,comment:'更正'}},1,'补充核对');assert.equal(studentGrade(s,'a',student).total,17);releaseGrades(s,'e',teacher);assert.equal(studentGrade(s,'a',student).total,18);assert.equal(readGrading(s).reviews.length,2);releaseGrades(s,'e',teacher);assert.equal(readGrading(s).releases.length,2);
});
test('unsubmitted students do not get zero result; failed release preserves data',()=>{
 const s=setup();const a=JSON.parse(s.getItem(attemptsKey));a.push({id:'b',examId:'e',studentId:'s2',status:'in_progress',answers:{}});s.setItem(attemptsKey,JSON.stringify(a));reviewAttempt(s,'a',teacher,{q2:{score:8,comment:'点评'}});assert.throws(()=>reviewAttempt(s,'b',teacher,{}),/已提交/);assert.throws(()=>releaseGrades({...s,setItem:()=>{throw Error('quota');}},'e',teacher),/quota/);assert.equal(studentGrade(s,'a',student),null);assert.equal(releaseGrades(s,'e',teacher).results.length,1);
});
