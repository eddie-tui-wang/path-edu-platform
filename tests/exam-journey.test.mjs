import test from 'node:test';
import assert from 'node:assert/strict';
import {seedQuestions} from '../lib/practice.mjs';
import {questionKey} from '../lib/question-bank.mjs';
import {publishBankPaper} from '../lib/bank-paper.mjs';
import {startAttempt,saveAttempt,submitAttempt} from '../lib/exam-attempts.mjs';
import {reviewAttempt,releaseGrades,studentGrade} from '../lib/grading.mjs';
import {learningRecords,wrongQuestions,abilityEvidence} from '../lib/learning-records.mjs';

// Isolated in-memory storage: never reads or changes browser accounts or attempts.
for(const type of ['choice','short','mixed'])test(`${type}: published ten-image paper → submission → review → release → student evidence`,()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const teacher={id:'demo-teacher',roles:['teacher']},student={id:'journey-student',roles:['student'],active:true};
 const now=Date.now(),bank=seedQuestions(storage).filter(q=>q.type==='short').map((q,i)=>type==='short'||(type==='mixed'&&i>0)?q:{...q,type:'single',options:[{id:'a',text:'选项A'},{id:'b',text:'选项B'}],correctId:'b',explanation:'流程测试解析'});
 storage.setItem(questionKey,JSON.stringify(bank));
 const paper=publishBankPaper(storage,{id:`journey-${type}`,title:'独立流程验证',type,minutes:30,opensAt:new Date(now-1000).toISOString(),closesAt:new Date(now+3600000).toISOString(),students:[student.id],selections:bank.map(q=>({id:q.id,revision:q.revision,points:10}))},[student],teacher);
 assert.equal(paper.imageCount,10);
 let attempt=startAttempt(storage,paper.id,student,now);
 assert.equal(attempt.exam.questions[0].answer,undefined);
 const answers=Object.fromEntries(paper.questions.map((q,i)=>[q.id,q.type==='single'?(i===0?'1':'2'):'测试简答']));
 attempt=saveAttempt(storage,attempt,student,answers,9,now+1);
 assert.equal(startAttempt(storage,paper.id,student,now+2).currentQuestion,9);
 attempt=submitAttempt(storage,attempt,student,false,now+3);
 assert.throws(()=>saveAttempt(storage,attempt,student,{},0,now+4),/已提交/);
 assert.equal(learningRecords(storage,student)[0].items.length,0);
 const marks=Object.fromEntries(paper.questions.filter(q=>q.type==='short').map(q=>[q.id,{score:8,comment:'流程验证点评'}]));
 const review=reviewAttempt(storage,attempt.id,teacher,marks);
 assert.equal(studentGrade(storage,attempt.id,student),null);
 assert.equal(abilityEvidence(learningRecords(storage,student))[1].completed,0);
 const release=releaseGrades(storage,paper.id,teacher);
 assert.equal(releaseGrades(storage,paper.id,teacher).version,release.version);
 assert.equal(studentGrade(storage,attempt.id,student).total,review.total);
 const rows=learningRecords(storage,student);
 assert.equal(rows[0].items.length,10);
 assert.equal(rows[0].items[0].image,paper.cases[0].images[0]);
 assert.equal(wrongQuestions(rows).length,type==='short'?0:1);
 assert.equal(abilityEvidence(rows)[1].questions,10);
 assert.deepEqual(learningRecords(storage,{...student,id:'unassigned'}),[]);
 if(type!=='choice'){
  const id=paper.questions.find(q=>q.type==='short').id;
  reviewAttempt(storage,attempt.id,teacher,{...marks,[id]:{score:9,comment:'更正点评'}},1,'复核更正');
  assert.equal(studentGrade(storage,attempt.id,student).total,review.total);
  releaseGrades(storage,paper.id,teacher);
  assert.equal(studentGrade(storage,attempt.id,student).total,review.total+1);
  assert.equal(learningRecords(storage,student).length,1);
 }
});
