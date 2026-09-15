import test from 'node:test';
import assert from 'node:assert/strict';
import {startAttempt,saveAttempt,submitAttempt,readAttempts,publicExam} from '../lib/exam-attempts.mjs';
import {teachingKey} from '../lib/exam-drafts.mjs';
const student={id:'s',roles:['student']},now=Date.now();
function setup(){const map=new Map(),s={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const exam={id:'e',version:1,title:'test',students:['s'],minutes:30,opensAt:new Date(now-1000).toISOString(),closesAt:new Date(now+60000).toISOString(),questions:[{id:'q',caseId:'c',type:'single',prompt:'题',options:'A\nB',answer:'2',rubric:'secret'}],cases:[{id:'c',title:'病例',images:['/a.png'],history:'史',reference:'secret'}]};s.setItem(teachingKey,JSON.stringify({cases:[],drafts:[],exams:[exam]}));return {s,exam};}
test('only assigned students start; one attempt and earlier deadline survive restart',()=>{
 const {s}=setup();assert.throws(()=>startAttempt(s,'e',{id:'x',roles:['student']},now));assert.throws(()=>startAttempt(s,'e',student,now-2000));
 const a=startAttempt(s,'e',student,now);assert.equal(a.deadline,now+60000);assert.equal(startAttempt(s,'e',student,now+10000).id,a.id);assert.equal(readAttempts(s).length,1);
});
test('public paper excludes references; save validates choices and stale versions',()=>{
 const {s,exam}=setup();assert.equal(publicExam(exam).questions[0].answer,undefined);assert.equal(publicExam(exam).cases[0].reference,undefined);
 const a=startAttempt(s,'e',student,now);assert.throws(()=>saveAttempt(s,a,student,{q:'3'},0,now+1));const b=saveAttempt(s,a,student,{q:'2'},0,now+2);assert.equal(b.answers.q,'2');assert.throws(()=>saveAttempt(s,a,student,{q:'1'},0,now+3),/更新/);
});
test('submission locks answers and is idempotent, without releasing reference',()=>{
 const {s}=setup();let a=startAttempt(s,'e',student,now);a=saveAttempt(s,a,student,{q:'2'},0,now+1);const done=submitAttempt(s,a,student,false,now+2);assert.equal(done.status,'submitted');assert.equal(submitAttempt(s,a,student,false,now+3).id,done.id);assert.throws(()=>saveAttempt(s,done,student,{q:'1'},0,now+4),/已提交/);assert.equal(done.exam.questions[0].answer,undefined);
});
test('timeout uses last saved answers; late writes and quota failures never succeed',()=>{
 const {s}=setup();let a=startAttempt(s,'e',student,now);a=saveAttempt(s,a,student,{q:'1'},0,now+1);assert.throws(()=>saveAttempt(s,a,student,{q:'2'},0,now+60000),/截止/);assert.throws(()=>submitAttempt(s,a,student,false,now+60000));
 assert.throws(()=>submitAttempt({...s,setItem:()=>{throw Error('quota');}},a,student,true,now+60001),/quota/);assert.equal(readAttempts(s)[0].status,'in_progress');const done=submitAttempt(s,a,student,true,now+60002);assert.equal(done.answers.q,'1');assert.equal(done.submitReason,'timeout');
test('retake replaces the previous attempt only when asked for',()=>{
 const {s}=setup();
 let a=startAttempt(s,'e',student,now);a=saveAttempt(s,a,student,{q:'2'},0,now+1);const done=submitAttempt(s,a,student,false,now+2);
 // default: a submitted attempt is still the attempt
 assert.equal(startAttempt(s,'e',student,now+3).id,done.id);
 assert.equal(readAttempts(s).length,1);
 // retake: a fresh attempt replaces it, and there is never a second record for the same exam
 const again=startAttempt(s,'e',student,now+4,{retake:true});
 assert.notEqual(again.id,done.id);assert.equal(again.status,'in_progress');assert.deepEqual(again.answers,{});
 assert.equal(readAttempts(s).length,1,'a retake must replace, not shadow');
 assert.equal(startAttempt(s,'e',student,now+5).id,again.id);
});
});
