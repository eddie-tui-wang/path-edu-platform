import test from 'node:test';
import assert from 'node:assert/strict';
import {gradingProgress} from '../lib/grading.mjs';
test('paper progress counts submitted attempts once, excludes drafts and other exams',()=>{
 const attempts=[{id:'a',examId:'e',status:'submitted'},{id:'b',examId:'e',status:'submitted'},{id:'c',examId:'e',status:'in_progress'},{id:'d',examId:'other',status:'submitted'}];
 const data={reviews:[{attemptId:'a',version:1},{attemptId:'a',version:2},{attemptId:'d'}],releases:[{examId:'e',results:[{attemptId:'a'}]}]};
 assert.deepEqual(gradingProgress(attempts,data,'e'),{submitted:2,reviewed:1,pending:1,published:1});
 assert.deepEqual(gradingProgress([],data,'e'),{submitted:0,reviewed:0,pending:0,published:0});
});
