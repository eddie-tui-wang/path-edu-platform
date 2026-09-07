import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require=createRequire(import.meta.url);
test("migrated teacher overview server-renders all four dimensions",()=>{
  const text=readFileSync(new URL("../app/teacher-ability-module.tsx",import.meta.url),"utf8");
  const {outputText}=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  const module={exports:{}};
  // Compile the actual migrated component; no browser or external services involved.
  new Function("require","module","exports",outputText)(require,module,module.exports);
  const html=renderToStaticMarkup(React.createElement(module.exports.TeacherAbilityModule,{onBack:()=>{}}));
  for(const label of ["专业知识","教学技能","AI 应用","资源建设","教学记录","预设教学记录"])assert.ok(html.includes(label),label);
});
