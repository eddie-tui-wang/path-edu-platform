import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAnswer} from '../lib/answer-text.mjs';
import {readReaderState} from '../lib/reader-state.mjs';
import {examStatus} from '../lib/exam-attempts.mjs';

test('text tools preserve surrounding answer, multiline lists and length limits',()=>{
 assert.equal(formatAnswer('前诊断后',1,3,'bold'),'前**诊断**后');
 assert.equal(formatAnswer('一\n二',0,3,'list'),'- 一\n- 二');
 assert.throws(()=>formatAnswer('123',0,3,'bold',6),/超过/);
});
test('view restoration is isolated by key and image identity with validated coordinates',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null};
 values.set('student-a/question-1',JSON.stringify({images:JSON.stringify(['image']),index:0,zoom:2,offset:{x:30,y:-20}}));
 assert.equal(readReaderState(storage,'student-a/question-1',['image']).zoom,2);
 assert.equal(readReaderState(storage,'student-a/question-2',['image']).zoom,1);
 assert.equal(readReaderState(storage,'student-b/question-1',['image']).zoom,1);
 assert.equal(readReaderState(storage,'student-a/question-1',['new-image']).zoom,1);
 values.set('bad',JSON.stringify({images:'["image"]',index:0,zoom:99,offset:{x:0,y:0}}));
 assert.throws(()=>readReaderState(storage,'bad',['image']),/无效/);
});
test('exam labels distinguish opening, active, timeout and published result states',()=>{
 const e={opensAt:'2026-09-11T00:00:00Z',closesAt:'2026-09-12T00:00:00Z'},now=Date.parse(e.opensAt);
 assert.equal(examStatus(e,null,false,now-1),'未开放');
 assert.equal(examStatus(e,null,false,now),'可开始');
 assert.equal(examStatus(e,null,false,Date.parse(e.closesAt)),'已截止');
 assert.equal(examStatus(e,{status:'in_progress',deadline:now+100},false,now),'进行中');
 assert.equal(examStatus(e,{status:'in_progress',deadline:now},false,now),'已截止，待确认提交');
 assert.equal(examStatus(e,{status:'submitted'},false,now),'待发布成绩');
 assert.equal(examStatus(e,{status:'submitted'},true,now),'成绩已发布');
});
