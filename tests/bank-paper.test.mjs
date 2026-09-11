import test from 'node:test';
import assert from 'node:assert/strict';
import {seedQuestions} from '../lib/practice.mjs';
import {buildBankPaper,publishBankPaper} from '../lib/bank-paper.mjs';
import {readLibraryStore} from '../lib/library.mjs';
const user={id:'demo-teacher',roles:['teacher']},students=[{id:'student',active:true,roles:['student']}];
function setup(){const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},bank=seedQuestions(storage);const draft={id:'paper1',title:'十片流程卷',type:'short',minutes:30,opensAt:new Date().toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),students:['student'],selections:bank.filter(q=>q.type==='short').map(q=>({id:q.id,revision:q.revision,points:10}))};return {storage,bank,draft};}
test('ten logical images sharing a file publish once and freeze bank snapshots',()=>{
 const {storage,bank,draft}=setup();const exam=publishBankPaper(storage,draft,students,user);assert.equal(exam.imageCount,10);assert.equal(exam.questions.length,10);assert.equal(exam.questions.reduce((n,q)=>n+q.points,0),100);
 bank[1].prompt='changed';assert.notEqual(exam.questions[0].prompt,'changed');publishBankPaper(storage,draft,students,user);assert.equal(readLibraryStore(storage).exams.length,1);
});
test('wrong count, stale revisions, draft questions, students and time are rejected',()=>{
 const {bank,draft}=setup();for(const change of [{selections:draft.selections.slice(1)},{students:[]},{minutes:0},{closesAt:'invalid'},{type:'choice'}])assert.throws(()=>buildBankPaper({...draft,...change},bank,students,user));
 assert.throws(()=>buildBankPaper(draft,[...bank,{...bank[1],revision:2}],students,user),/更新/);
 const withDraft=[...bank,{...bank[1],revision:2,status:'draft',prompt:'未确认的新题干'}];
 assert.equal(buildBankPaper(draft,withDraft,students,user).questions[0].bankRevision,1);
 assert.throws(()=>buildBankPaper(draft,bank.map(q=>({...q,status:'draft'})),students,user),/更新/);
 assert.throws(()=>buildBankPaper(draft,bank,students,{id:'student',roles:['student']}),/仅教师/);
});
test('duplicate image record cannot count twice; decimal rubric conversion preserves total',()=>{
 const {bank,draft}=setup();const b=structuredClone(bank);b[2].imageId=b[1].imageId;assert.throws(()=>buildBankPaper(draft,b,students,user),/当前9/);
 bank[1].rubric=[{text:'a',weight:33,dimension:'x'},{text:'b',weight:67,dimension:'x'}];const paper=buildBankPaper(draft,bank,students,user);assert.equal(paper.questions[0].rubric,'3.3:a\n6.7:b');
});
