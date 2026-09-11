import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
await p.setViewportSize({width:1440,height:900});
const desk=()=>p.evaluate(()=>{const w=s=>{const e=document.querySelector(s);return e&&getComputedStyle(e).display!=='none'?Math.round(e.getBoundingClientRect().width):0;};
 return {stage:w('.library-reader'),answer:w('.answer-rail-main'),left:w('.answer-rail-left')};});
try{
 await p.goto('http://localhost:3002/');
 await p.locator('[name=username]').fill('demo_student');await p.locator('[name=password]').fill('Demo2026!student');
 await p.getByRole('button',{name:'进入演示'}).click();await p.waitForTimeout(700);
 // 日常练习 已从学生导航移除（2026-09-11）；路由仍有效，深链进入。
 await p.evaluate(()=>{location.hash='#role=student&page=practice';window.dispatchEvent(new PopStateEvent('popstate'));});await p.waitForTimeout(700);
 await p.getByRole('button',{name:'开始练习',exact:true}).first().click();await p.waitForTimeout(700);

 // before submitting there is nothing to follow up on
 assert.equal(await p.getByRole('button',{name:'AI 追问',exact:true}).count(),0,'the copilot entry only exists once the question has been answered');
 assert.equal(await p.locator('.answer-copilot').count(),0);

 // the slide is the primary evidence and the rail can be pulled in
 const open=await desk();
 assert.ok(open.stage>open.answer,'the slide must be the widest column, got '+JSON.stringify(open));
 assert.ok(open.stage/open.answer>1.5,'the slide must clearly outweigh the answer rail, got '+(open.stage/open.answer).toFixed(2));
 await p.getByRole('button',{name:'隐藏临床资料',exact:true}).click();await p.waitForTimeout(250);
 const collapsed=await desk();
 assert.equal(collapsed.left,0,'the case rail collapses away');
 assert.ok(collapsed.stage>open.stage,'collapsing the rail must widen the slide, not move it');
 await p.getByRole('button',{name:'显示临床资料',exact:true}).click();await p.waitForTimeout(250);
 assert.equal((await desk()).left,open.left,'the rail returns to its original width');

 await p.getByRole('radio').first().check();
 await p.getByRole('button',{name:'提交本题',exact:true}).click();await p.waitForTimeout(600);

 // the copilot is a rail action: closed by default, opened and closed from the slide toolbar
 assert.equal(await p.locator('.answer-copilot').count(),0,'the copilot starts collapsed');
 const stageBefore=(await desk()).stage;
 await p.getByRole('button',{name:'AI 追问',exact:true}).click();await p.waitForTimeout(350);
 const copilot=p.getByRole('complementary',{name:'AI追问辅助'});
 await copilot.waitFor();
 assert.ok(await copilot.getByRole('textbox',{name:'AI追问',exact:true}).isDisabled(),'the AI input stays disabled while the service is not connected');
 assert.ok(await copilot.getByRole('button',{name:'发送',exact:true}).isDisabled(),'no fake send affordance');
 assert.equal((await desk()).stage,stageBefore,'opening the copilot must not move or resize the slide');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page-level horizontal overflow');
 await p.getByRole('button',{name:'隐藏 AI 追问',exact:true}).click();await p.waitForTimeout(300);
 assert.equal(await p.locator('.answer-copilot').count(),0,'the copilot collapses again');
 assert.equal(await p.getByRole('button',{name:'AI 追问',exact:true}).getAttribute('aria-pressed'),'false','the toggle reports its state');
 console.log('PASS: answering desk — slide dominant and fixed, case rail collapsible, copilot gated on submission and toggled from the slide toolbar.');
}finally{await browser.close();}
