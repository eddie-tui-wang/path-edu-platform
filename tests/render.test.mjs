import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require=createRequire(import.meta.url);
test('exam confirmations stay in-page and choice results use real newline separators',()=>{
 const source=readFileSync(new URL('../app/exam-workspace.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('role="alertdialog"'));
 assert.ok(!source.includes('window.confirm'));
 assert.ok(!source.includes("split('\\\\n')"));
 assert.ok(source.includes("split('\\n')"));
});
test("migrated teacher overview server-renders all four dimensions",()=>{
  const text=readFileSync(new URL("../app/teacher-ability-module.tsx",import.meta.url),"utf8");
  const {outputText}=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  const module={exports:{}};
  // Compile the actual migrated component; no browser or external services involved.
  const localRequire=(id)=>{
    if(!["./use-panel-history","./ui-button"].includes(id))return require(id);
    const hook=ts.transpileModule(readFileSync(new URL(id==="./ui-button"?"../app/ui-button.tsx":"../app/use-panel-history.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    const compiled={exports:{}};
    new Function("require","module","exports",hook.outputText)(require,compiled,compiled.exports);
    return compiled.exports;
  };
  new Function("require","module","exports",outputText)(localRequire,module,module.exports);
  const html=renderToStaticMarkup(React.createElement(module.exports.TeacherAbilityModule,{onBack:()=>{}}));
  for(const label of ["专业知识","教学技能","AI 应用","资源建设","教学记录"])assert.ok(html.includes(label),label);
  assert.ok(!html.includes('录音分析（示例）'));
  assert.ok(!html.includes('返回病例资料'));
  assert.ok(!html.includes('76%'));
  const recordsHtml=renderToStaticMarkup(React.createElement(module.exports.TeacherAbilityModule,{onBack:()=>{},initialView:'records'}));
  assert.equal(recordsHtml.split('录音分析（示例）').length-1,1);
  assert.ok(recordsHtml.includes('开展教学阅片'));
  assert.ok(!recordsHtml.includes('返回病例资料'));
  assert.ok(!/getUserMedia|MediaRecorder|fetch\(/.test(text));
});
