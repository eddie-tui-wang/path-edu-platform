import test from 'node:test';
import assert from 'node:assert/strict';
import {publishExam,studentExams} from '../lib/exam-drafts.mjs';
test('publication validates, snapshots and assigns without leaking future draft edits',()=>{
 const cases=[{id:'c',owner:'t',images:['image'],source:'synthetic',authorized:true,reference:'reference',history:'original'}];
 const students=[{id:'s',active:true,roles:['student']}];
 const draft={title:'Exam',type:'choice',minutes:30,students:['s'],questions:[{caseId:'c',type:'single',prompt:'Q',points:10,options:'A\nB',answer:'1'}]};
 const published=publishExam(draft,cases,students,'t');
 cases[0].history='changed';draft.questions[0].prompt='changed';
 assert.equal(published.cases[0].history,'original');assert.equal(published.questions[0].prompt,'Q');
 assert.equal(studentExams([published],'s').length,1);assert.equal(studentExams([published],'other').length,0);
 assert.throws(()=>publishExam({...draft,type:'mixed'},cases,students,'t'),e=>e.field==='type');
 assert.throws(()=>publishExam({...draft,title:''},cases,students,'t'),e=>e.field==='title');
 assert.throws(()=>publishExam({...draft,questions:[{...draft.questions[0],prompt:''}]},cases,students,'t'),e=>e.field==='prompt'&&e.questionIndex===0);
 assert.throws(()=>publishExam({...draft,students:[]},cases,students,'t'));
 assert.throws(()=>publishExam(draft,cases,students,'other'));
 assert.throws(()=>publishExam({...draft,questions:[{...draft.questions[0],answer:'3'}]},cases,students,'t'));
});
