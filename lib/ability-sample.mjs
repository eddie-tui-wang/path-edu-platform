// Sample five-dimension assessments for the demo.
//
// IMPORTANT: these verdicts are illustrative only. The rules that would turn evidence into a
// dimension judgement depend on expert-confirmed criteria (D-F02) and are NOT decided. The
// evidence each dimension lists, by contrast, is the learner's real record data — the point of
// this module is to show the entry point and the evidence trail, not to score anyone.
//
// Following the recording-analysis precedent, every surface that shows this must carry a 示例
// marker and say what is and is not real.
export const abilitySampleNotice='示例数据：临床信息理解、关键区域识别、形态学判断、诊断与鉴别、辅助检查决策五个维度的判定规则待专家确认（D-F02），以下结论为演示用示例，不是真实评价。每个维度下列出的证据是本人真实作答记录。';

/** @param {any[]} item a learning-record item */
export const studentDimensions=[
 {name:'临床信息理解',verdict:'示例：能区分病史中的已知与缺失信息',basis:'单选题作答',pick:(item)=>item.type==='single'},
 {name:'关键区域识别',verdict:'示例：已能定位主要病变区域',basis:'带有切片图片的作答',pick:(item)=>Boolean(item.image)},
 {name:'形态学判断',verdict:'示例：以描述观察为主，定性结论偏少',basis:'简答作答',pick:(item)=>item.type==='short'},
 {name:'诊断与鉴别',verdict:'示例：已给出鉴别方向，依据可更具体',basis:'简答作答（与形态学判断共用同一批证据，拆分规则待专家确认）',pick:(item)=>item.type==='short'},
 {name:'辅助检查决策',verdict:'示例：能说明免疫组化的目的',basis:'简答作答（同样待与上两项拆分）',pick:(item)=>item.type==='short'},
];

/** Items that the sample rule would draw on, newest first, capped for readability. */
export function pickEvidence(dimension,items,limit=8){
 return items.filter(dimension.pick).slice(0,limit);
}
