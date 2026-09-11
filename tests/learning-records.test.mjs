import test from 'node:test';
import assert from 'node:assert/strict';
import {learningRecords,wrongQuestions,abilityEvidence} from '../lib/learning-records.mjs';
import {seedQuestions,availablePractice,submitPractice} from '../lib/practice.mjs';
import {attemptsKey} from '../lib/exam-attempts.mjs';
import {gradingKey} from '../lib/grading.mjs';
const user={id:'s',roles:['student']};
test('ability evidence separates sources and excludes unpublished exams without inventing scores',()=>{
 const groups=abilityEvidence([{source:'practice',state:'已提交',items:[{wrong:true}]},{source:'exam',state:'待发布',items:[{wrong:true}]},{source:'exam',state:'进行中',items:[]},{source:'exam',state:'已发布',items:[{wrong:false}]}]);
 assert.deepEqual(groups.map(({source,completed,questions,wrong})=>({source,completed,questions,wrong})),[{source:'practice',completed:1,questions:1,wrong:1},{source:'exam',completed:1,questions:1,wrong:0}]);
 assert.equal('score' in groups[0],false);assert.equal(abilityEvidence([])[0].completed,0);
});
function store(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('empty records stay empty; submitted practice uses frozen reference after closure and states its version once',()=>{
 const s=store();assert.deepEqual(learningRecords(s,user),[]);const [q]=availablePractice(seedQuestions(s));submitPractice(s,user,q,'known');const records=learningRecords(s,user);assert.equal(records.length,1);assert.equal(wrongQuestions(records).length,1);assert.equal(records[0].items[0].answer,'已送检组织');assert.equal(records[0].versionLabel,'题目版本');assert.equal(records[0].items[0].questionVersion,null);assert.equal(wrongQuestions(records)[0].questionVersion,null);assert.deepEqual(learningRecords(s,{id:'other',roles:['student']}),[]);
});
test('unreleased exams expose no score or reference; correction updates wrong list without duplicates',()=>{
 const s=store();s.setItem(attemptsKey,JSON.stringify([{id:'a',examId:'e',studentId:'s',status:'submitted',submittedAt:1000,exam:{title:'exam',version:1,questions:[{id:'q',caseId:'c'}],cases:[{id:'c',history:'旧病史',images:['/old.png']}]}}]));
 let rows=learningRecords(s,user);assert.equal(rows[0].items.length,0);assert.equal(rows[0].total,null);assert.equal(wrongQuestions(rows).length,0);assert.equal(rows[0].versionLabel,'试卷版本');
 const result={attemptId:'a',studentId:'s',total:0,scores:[{questionId:'q',prompt:'题',type:'single',options:'A\nB',answer:'1',reference:'2',score:0,maxScore:10,comment:'',explanation:''}]};
 const releases=[{examId:'e',version:1,results:[result]}];s.setItem(gradingKey,JSON.stringify({reviews:[],releases}));rows=learningRecords(s,user);assert.equal(wrongQuestions(rows).length,1);assert.equal(rows[0].items[0].image,'/old.png');assert.equal(rows[0].versionLabel,'成绩发布版本');assert.equal(rows[0].items[0].questionVersion,null);assert.equal(wrongQuestions(rows)[0].versionLabel,'成绩发布版本');
 releases.push({examId:'e',version:2,results:[{...result,total:10,scores:[{...result.scores[0],score:10}]}]});s.setItem(gradingKey,JSON.stringify({reviews:[],releases}));assert.equal(wrongQuestions(learningRecords(s,user)).length,0);assert.equal(learningRecords(s,user)[0].version,2);
});
