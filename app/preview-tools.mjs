// Preview navigation only. This does not authenticate or change persisted data.
export function previewNavigationTool(navigate) {
  return {
    name: "navigate_teaching_preview",
    title: "切换教学演示视角",
    description: "打开学生端、教师端或帮助页面；只是迁移演示导航，不授予账号权限，也不保存答案。",
    inputSchema: {type:"object",properties:{view:{type:"string",enum:["student","teacher","help"]}},required:["view"],additionalProperties:false},
    annotations: {readOnlyHint:false,untrustedContentHint:false},
    execute(input) {
      if (!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).length!==1 || !["student","teacher","help"].includes(input.view)) throw new Error("仅支持 student、teacher、help 演示视角");
      navigate(input.view);
      return {view:input.view,mode:"migration-preview",authenticated:false};
    },
  };
}
