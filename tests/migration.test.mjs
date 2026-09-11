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
  assert.match(wrapper,/仅使用模拟资料，请勿上传患者信息/);
  assert.doesNotMatch(wrapper,/className="edu-teacher-notice"/);
  const teacher=readFileSync(new URL('../app/teacher-ability-module.tsx',import.meta.url),'utf8');
  assert.match(teacher,/录音分析示例 · 预设结果/);
  assert.match(teacher,/无真实音频/);
  // The demo-boundary warning used to sit in a banner on every page. It was removed as visual
  // noise on 2026-09-11 and the guarantee moved to the demo help article, so this assertion now
  // guards that surface instead. The sentence still matters: image import is a real path.
  assert.match(wrapper,/数据库故障不会自动进入演示模式/);
  assert.match(wrapper,/LibraryWorkspace/);
  assert.doesNotMatch(wrapper,/<nav aria-label="账号授权导航"/);
  assert.match(wrapper,/不采集真实音频/);
  assert.doesNotMatch(teacher,/getUserMedia|MediaRecorder/);
  assert.match(teacher,/非真实录音同步回放/);
  const student=readFileSync(new URL("../app/teaching-module.tsx",import.meta.url),"utf8");
  assert.match(student,/path-edu-demo-v1-/);
  assert.doesNotMatch(student,/pathology-teaching-choice-v2-/);
  for(const name of ["chatgpt-auth.ts","pathology-platform.tsx"]) assert.equal(existsSync(new URL("../app/"+name,import.meta.url)),false);
});
