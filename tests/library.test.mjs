import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLibraryCases,readLibraryStore,visibleLibraryCases,filterLibraryCases,libraryCategories,placeholderImage} from '../lib/library.mjs';
import {teachingKey} from '../lib/exam-drafts.mjs';

function storage(initial){const data=new Map(initial?[[teachingKey,JSON.stringify(initial)]]:[]);return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('library adds prioritized categories and shared placeholders without removing old categories',()=>{
 const cases=initialLibraryCases();assert.equal(cases.length,13);assert.equal(new Set(cases.map(c=>c.id)).size,13);
 assert.ok(cases.every(c=>c.images[0]===placeholderImage));assert.equal(libraryCategories[0],'骨与软组织肿瘤 / 肉瘤');assert.deepEqual(libraryCategories.slice(4),['胃','乳腺','结直肠']);
});
test('seed is idempotent and preserves user cases, drafts and frozen exams',()=>{
 const existing={id:'library-demo-01',title:'user modified',images:['custom.png']};
 const s=storage({cases:[existing],drafts:[{id:'draft'}],exams:[{id:'published',cases:[existing]}]});
 const first=readLibraryStore(s);assert.equal(first.cases[0].title,'user modified');assert.equal(first.cases.length,13);
 assert.deepEqual(first.drafts,[{id:'draft'}]);assert.equal(first.exams[0].cases[0].images[0],'custom.png');assert.deepEqual(readLibraryStore(s),first);
});
test('bad data and quota failure do not silently reset records',()=>{
 const s=storage({cases:'bad',drafts:[],exams:[]});const before=s.getItem(teachingKey);assert.throws(()=>readLibraryStore(s));assert.equal(s.getItem(teachingKey),before);
 assert.throws(()=>readLibraryStore({getItem:()=>null,setItem:()=>{throw Error('quota');}}),/quota/);
});
test('student projection excludes teacher reference and hidden legacy cases',()=>{
 const cases=[...initialLibraryCases(),{id:'private',owner:'t',authorized:true,reference:'secret'}];
 const student=visibleLibraryCases(cases,{id:'s',roles:['student']});assert.equal(student.length,13);assert.ok(student.every(c=>!('reference' in c)&&!('owner' in c)));
 assert.equal(visibleLibraryCases(cases,{id:'t',roles:['teacher']}).length,14);
 assert.equal(visibleLibraryCases(cases,{id:'other',roles:['teacher']}).length,13);
});
test('filters combine category, source, search and personal favorites',()=>{
 const cases=initialLibraryCases();const result=filterLibraryCases(cases,{category:libraryCategories[0],source:'标准库',query:'01',favorites:['library-demo-01']});assert.equal(result.length,1);assert.equal(result[0].id,'library-demo-01');
 assert.equal(filterLibraryCases(cases,{favorites:[]}).length,0);
});
