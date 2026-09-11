import test from 'node:test';
import assert from 'node:assert/strict';
import {studentDimensions,pickEvidence,abilitySampleNotice} from '../lib/ability-sample.mjs';
const items=[{id:'a',type:'single',image:'/x'},{id:'b',type:'short',image:''},{id:'c',type:'short',image:'/y'}];
test('sample dimensions keep the agreed five names and only draw on evidence they declare',()=>{
 assert.equal(studentDimensions.length,5);
 assert.deepEqual(studentDimensions.map(d=>d.name),['临床信息理解','关键区域识别','形态学判断','诊断与鉴别','辅助检查决策']);
 assert.deepEqual(pickEvidence(studentDimensions[0],items).map(i=>i.id),['a'],'single choice backs clinical-information reading');
 assert.deepEqual(pickEvidence(studentDimensions[1],items).map(i=>i.id),['a','c'],'only items with an image back region identification');
 assert.deepEqual(pickEvidence(studentDimensions[2],items).map(i=>i.id),['b','c']);
 assert.equal(pickEvidence({pick:()=>false},items).length,0,'a dimension with no matching evidence must list none');
 assert.equal(pickEvidence({pick:()=>true},items,2).length,2,'the cap keeps a long evidence list readable');
});
test('the sample is labelled as a sample and says which part is real',()=>{
 assert.match(abilitySampleNotice,/示例数据/);
 assert.match(abilitySampleNotice,/不是真实评价/);
 assert.match(abilitySampleNotice,/真实作答记录/,'the evidence stays real even though the verdict is illustrative');
 assert.match(abilitySampleNotice,/D-F02/,'the notice names what is blocking a real assessment');
});
