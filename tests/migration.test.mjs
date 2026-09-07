import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { previewNavigationTool } from "../app/preview-tools.mjs";

test("preview navigation validates inputs and changes the same selected view", () => {
  let current="student";
  const tool=previewNavigationTool(view=>{current=view;});
  assert.equal(tool.name,"navigate_teaching_preview");
  for (const view of ["teacher","help","student"]) {
    assert.deepEqual(tool.execute({view}),{view,mode:"migration-preview",authenticated:false});
    assert.equal(current,view);
  }
  for (const value of [null,[],{}, {view:"admin"},{view:"teacher",extra:true}]) assert.throws(()=>tool.execute(value));
  assert.equal(current,"student");
});

test("migration is independent and clearly identifies demo boundaries", () => {
  const wrapper=readFileSync(new URL("../app/teaching-platform.tsx",import.meta.url),"utf8");
  assert.match(wrapper,/演示数据／功能待接入/);
  assert.match(wrapper,/非真实登录/);
  assert.match(wrapper,/不会采集麦克风/);
  const teacher=readFileSync(new URL("../app/teacher-ability-module.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(teacher,/getUserMedia|MediaRecorder/);
  assert.match(teacher,/非真实录音同步回放/);
  const student=readFileSync(new URL("../app/teaching-module.tsx",import.meta.url),"utf8");
  assert.match(student,/path-edu-demo-v1-/);
  assert.doesNotMatch(student,/pathology-teaching-choice-v2-/);
  for(const name of ["chatgpt-auth.ts","pathology-platform.tsx"]) assert.equal(existsSync(new URL("../app/"+name,import.meta.url)),false);
});
