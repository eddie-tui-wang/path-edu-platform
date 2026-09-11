import test from 'node:test';
import assert from 'node:assert/strict';
import {availablePractice,seedQuestions,readPractice,submitPractice} from '../lib/practice.mjs';
import {questionKey,readQuestions,setQuestionAvailability} from '../lib/question-bank.mjs';
const student={id:'student-a',roles:['student']},teacher={id:'demo-teacher',roles:['teacher']};
function store(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('default bank has one open single and ten closed short questions; no resets',()=>{
 const s=store(),seed=seedQuestions(s);assert.equal(seed.length,11);assert.equal(availablePractice(seed).length,1);
 setQuestionAvailability(s,seed[0],teacher,'disable');assert.equal(seedQuestions(s).length,11);assert.equal(availablePractice(readQuestions(s)).length,0);
});
test('practice listing has no reference answers and filters latest availability',()=>{
 const s=store(),seed=seedQuestions(s),[q]=availablePractice(seed);assert.equal(q.correctId,undefined);assert.equal(q.explanation,undefined);assert.equal(q.caseSnapshot,undefined);
 s.setItem(questionKey,JSON.stringify([...seed,{...seed[0],revision:2,status:'draft'}]));assert.equal(availablePractice(readQuestions(s)).length,1);
 assert.equal(submitPractice(s,student,q,'unknown').correct,true);
});
test('submission is idempotent, immutable and isolated per student; single scoring is deterministic',()=>{
 const s=store(),[q]=availablePractice(seedQuestions(s));assert.throws(()=>submitPractice(s,student,q,''));
 const r=submitPractice(s,student,q,'unknown');assert.equal(r.correct,true);assert.equal(submitPractice(s,student,q,'known').id,r.id);assert.equal(readPractice(s,student).length,1);assert.equal(readPractice(s,{id:'other'}).length,0);
 setQuestionAvailability(s,readQuestions(s)[0],teacher,'disable');assert.equal(readPractice(s,student)[0].question.explanation,r.question.explanation);
 assert.throws(()=>submitPractice(s,{id:'new',roles:['student']},q,'unknown'),/关闭/);assert.throws(()=>submitPractice(s,teacher,q,'unknown'),/仅学生/);
});
test('short answers have no invented AI score; failed writes do not report success',()=>{
 const s=store(),rows=seedQuestions(s);setQuestionAvailability(s,rows[1],teacher,'practice');const q=availablePractice(readQuestions(s)).find(q=>q.type==='short');
 assert.throws(()=>submitPractice({...s,setItem:()=>{throw Error('quota');}},student,q,'需要进一步鉴别'),/quota/);assert.equal(readPractice(s,student).length,0);
 const result=submitPractice(s,student,q,'需要进一步鉴别');assert.equal(result.correct,null);assert.equal(result.answer,'需要进一步鉴别');
});
