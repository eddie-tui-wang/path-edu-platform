import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
await p.setViewportSize({width:1440,height:900});
const open=async role=>{
 await p.goto('http://localhost:3002/');
 await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);
 await p.getByRole('button',{name:'进入演示'}).click();await p.waitForTimeout(700);
 await p.locator('.edu-sidebar').getByRole('button',{name:'切片图书馆',exact:true}).click();await p.waitForTimeout(500);
 await p.getByRole('button',{name:'查看病例'}).first().click();await p.waitForTimeout(700);
};
const tx=async()=>{const s=await p.locator('.case-viewer-transform').getAttribute('style');return Number((s||'').match(/translate\((-?\d+)px/)?.[1]||0);};
try{
 await open('teacher');

 // tool palette ported from the retired reader, with the same two unavailable tools
 const tools=(await p.locator('.case-viewer-tools button').allTextContents()).map(s=>s.trim());
 assert.deepEqual(tools,['平移','缩放','矩形','圆形','点标注','自由笔']);
 assert.ok(await p.getByRole('button',{name:'缩放',exact:true}).isDisabled(),'the reader never had a zoom tool; zoom uses the +/− controls');
 assert.ok(await p.getByRole('button',{name:'自由笔',exact:true}).isDisabled(),'freehand stays unimplemented, as in the retired reader');
 assert.ok(await p.getByRole('button',{name:'平移',exact:true}).getAttribute('aria-pressed')==='true','pan is the default tool');

 // the case-info rail uses the ported accordion and keeps every current field
 const summaries=(await p.locator('.case-viewer-info summary').allTextContents()).map(s=>s.trim());
 for(const name of ['主诉','现病史','既往史','检查结果','送检信息','资料来源'])assert.ok(summaries.includes(name),name);
 assert.ok(summaries.some(s=>s.startsWith('本次标注')),'the mark list lives in the rail');

 // annotations: click-to-mark, per tool, and the drawn type is distinguishable
 const box=await p.locator('.case-viewer-canvas').boundingBox();
 assert.equal(await p.locator('.case-viewer-mark').count(),0,'a fresh view starts unmarked');
 // click at a different spot per tool: a mark stops propagation to select itself, so
 // clicking on top of one deliberately does not stack another.
 const shapes=[['矩形','rect',0.30],['圆形','circle',0.52],['点标注','point',0.74]];
 for(const [tool,cls,at] of shapes){
  await p.getByRole('button',{name:tool,exact:true}).click();
  await p.waitForFunction(name=>document.querySelector('.case-viewer-tools button[aria-pressed=true]')?.textContent.trim()===name,tool);
  await p.mouse.click(box.x+box.width*at,box.y+box.height*at);
  await p.waitForTimeout(200);
  assert.equal(await p.locator('.case-viewer-mark-'+cls).count(),1,tool+' must draw its own shape');
 }
 assert.equal(await p.locator('.case-viewer-mark').count(),3);
 // the mark list lives inside a closed <details>: open it the way a user would
 const markRail=p.locator('.case-viewer-info details').last();
 assert.equal(await markRail.getAttribute('open'),null,'the mark rail starts collapsed');
 await markRail.locator('summary').click();
 assert.match(await p.locator('.case-viewer-marks li').first().innerText(),/关键视野 01/,'marks are listed in the rail');
 assert.match(await p.locator('.case-viewer-marks li').first().innerText(),/20×/,'a mark records the magnification it was taken at');
 assert.match(await p.locator('.case-viewer-info').innerText(),/仅在本次浏览中保留/,'the rail must say marks are not persisted');
 const stacked=await p.locator('.case-viewer-mark').count();
 await p.locator('.case-viewer-mark').first().click();
 assert.equal(await p.locator('.case-viewer-mark').count(),stacked,'clicking an existing mark selects it instead of stacking a new one');

 // clearing is explicit and resets the count
 await p.getByRole('button',{name:'清除标注',exact:true}).click();
 await p.waitForTimeout(200);
 assert.equal(await p.locator('.case-viewer-mark').count(),0);

 // pan by keyboard and by drag, zoom by control, reset restores 100%
 await p.locator('.case-viewer-canvas').focus();
 const before=await tx();
 await p.keyboard.press('ArrowRight');
 assert.equal(await tx(),before+24,'ArrowRight pans the stage');
 await p.getByRole('button',{name:'放大图片',exact:true}).click();
 assert.ok(await p.getByText('125%',{exact:true}).count()>0,'zoom control changes the displayed scale');
 await p.getByRole('button',{name:'复位视野',exact:true}).click();
 assert.ok(await p.getByText('100%',{exact:true}).count()>0,'reset restores the default scale');
 assert.equal(await tx(),0,'reset also restores the pan offset');

 // the stage stays the focal point, and the desk layout must not overflow
 const ratio=await p.evaluate(()=>{const a=document.querySelector('.case-viewer-canvas').getBoundingClientRect(),b=document.querySelector('.case-viewer-info').getBoundingClientRect();return (a.width*a.height)/(b.width*b.height);});
 assert.ok(ratio>1.5,'the slide stage must dominate its information rail (was '+ratio.toFixed(2)+')');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page-level horizontal overflow at the desk width');

 // students get the same reader without the teacher-only actions
 await p.getByRole('button',{name:'退出',exact:true}).click();await p.waitForTimeout(600);
 await open('student');
 assert.equal(await p.locator('.case-viewer-tools button').count(),6,'students get the same reader');
 assert.equal(await p.getByRole('button',{name:'编辑病例与参考',exact:true}).count(),0,'students must not see the teacher edit action');
 console.log('PASS: ported case viewer — tool palette, annotated shapes, mark rail, keyboard pan, zoom/reset, stage dominance, desk width.');
}finally{await browser.close();}
