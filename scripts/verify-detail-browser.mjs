import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');

// Detail-flow acceptance: library / ability / teaching-record / practice drill-downs,
// hash-route restore after reload, image-viewer controls, back navigation, narrow layout.
// Rewritten 2026-09-11 against the current UI (the previous version targeted the
// pre-2026-09-09 information architecture and could only time out).

const zoom=process.env.NATIVE_ZOOM==='200';
const profile=await mkdtemp(path.join(tmpdir(),'path-edu-detail-'));
if(zoom)await cp(new URL('./fixtures/chrome-200/',import.meta.url),profile,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:null,args:['--window-size=1440,1000']});
const p=context.pages()[0];p.setDefaultTimeout(12000);
const errors=[];p.on('pageerror',e=>errors.push(e.message));

const fit=async(label)=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': page-level horizontal overflow');
const nav=async name=>{await p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();await p.waitForTimeout(400);};
const login=async role=>{await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();await p.waitForTimeout(700);};
const hash=()=>p.evaluate(()=>location.hash);
const shot=async label=>{const file=path.join(profile,'detail-'+label.replaceAll(' ','-')+'.png');await p.screenshot({path:file,fullPage:true});return file;};

try{
 await p.goto('http://localhost:3002/');
 const metrics=await p.evaluate(()=>({inner:innerWidth,outer:outerWidth,dpr:devicePixelRatio}));
 console.log('Native browser metrics:',JSON.stringify(metrics));
 if(zoom)assert.ok(metrics.dpr>=2&&metrics.outer/metrics.inner>1.9,'native browser zoom must change layout viewport and DPR');

 await login('teacher');

 // --- every teacher module renders without page-level horizontal overflow
 for(const name of ['切片图书馆','题库与出题','考试管理','教学记录','能力分析']){await nav(name);await fit('teacher '+name);}

 // --- library detail: open, use the image viewer, go back, then restore by deep link
 await nav('切片图书馆');
 await p.getByRole('button',{name:'查看病例'}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'临床资料',exact:true}).waitFor();
 assert.match(await hash(),/libraryCase=library-demo-01/,'library detail must be addressable');
 assert.equal(await p.getByRole('button',{name:'返回图书馆',exact:true}).count(),1,'detail keeps a back action');
 assert.equal(await p.getByRole('button',{name:'编辑病例与参考',exact:true}).count(),1,'teacher sees the edit action');
 await fit('teacher library detail');
 await p.getByRole('button',{name:'放大图片',exact:true}).click();
 assert.ok(await p.getByText('125%',{exact:true}).count()>0,'the viewer zoom control must change the displayed scale');
 await p.getByRole('button',{name:'复位视野',exact:true}).click();
 assert.ok(await p.getByText('100%',{exact:true}).count()>0,'reset must restore the default scale');
 await p.getByRole('button',{name:'返回图书馆',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'切片图书馆',exact:true}).waitFor();
 assert.ok(!(await hash()).includes('libraryCase='),'going back must leave the detail route');
 console.log('Screenshot:',await shot(zoom?'teacher library detail 200':'teacher library detail'));

 await p.goto('http://localhost:3002/#role=teacher&page=cases&libraryCase=library-demo-01');
 await p.reload();await login('teacher');
 await p.getByRole('heading',{name:'临床资料',exact:true}).waitFor();
 assert.match(await hash(),/libraryCase=library-demo-01/,'reload must restore the library detail route');
 console.log('library detail restored after reload');
 // The library viewer is full-screen and covers the sidebar, so leave it before navigating away.
 await p.getByRole('button',{name:'返回图书馆',exact:true}).click();await p.waitForTimeout(600);

 // --- ability detail: evidence set -> record evidence -> back
 await nav('能力分析');
 await p.getByRole('button',{name:'查看对应证据 →'}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:/证据集合$/}).waitFor();
 await fit('teacher ability evidence');
 await p.getByRole('button',{name:'查看此记录的对应证据',exact:true}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'差异与原始证据',exact:true}).waitFor();
 await fit('teacher ability record detail');
 await p.getByRole('button',{name:'返回维度证据',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:/证据集合$/}).waitFor();
 await p.getByRole('button',{name:'返回能力总览',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'能力总览',exact:true}).waitFor();
 console.log('ability drill-down ok');

 // --- teaching record detail: tabs, history back/forward, restore after reload
 await nav('教学记录');
 await p.getByRole('button',{name:'查看分析'}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'讲解时间轴',exact:true}).waitFor();
 await fit('teacher record detail');
 for(const tab of ['互动问答','诊断一致性','讲解轨迹']){await p.getByRole('button',{name:tab,exact:true}).click();await p.waitForTimeout(250);await fit('teacher record '+tab);}
 assert.match(await hash(),/page=records/,'record detail must stay on the records route');
 const detailHash=await hash();
 await p.goBack();await p.waitForTimeout(600);
 assert.notEqual(await hash(),detailHash,'browser back must leave the detail');
 await p.goForward();await p.waitForTimeout(600);
 assert.equal(await hash(),detailHash,'browser forward must return to the detail');
 await p.reload();await login('teacher');
 await p.getByRole('heading',{name:'讲解时间轴',exact:true}).waitFor();
 console.log('teaching-record detail: tabs, back/forward, reload restore ok');

 // --- question editor is a distinct view reachable from the bank, and returns
 await nav('题库与出题');
 await p.getByRole('button',{name:'编辑新版本'}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'编辑题目',exact:true}).waitFor();
 await fit('teacher question editor');
 assert.equal(await p.getByRole('button',{name:'结束编辑',exact:true}).count(),0,'the removed "结束编辑" action must not come back');
 await p.getByRole('button',{name:'返回题库',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'题库与出题',exact:true}).waitFor();
 console.log('question editor round-trip ok');

 await p.getByRole('button',{name:'退出',exact:true}).click();await p.waitForTimeout(700);

 // --- student: every module, library detail, practice detail with panel switching
 await login('student');
 for(const name of ['考试中心','切片图书馆','学习记录','错题集']){await nav(name);await fit('student '+name);}

 await nav('切片图书馆');
 await p.getByRole('button',{name:'查看病例'}).first().click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'临床资料',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:'编辑病例与参考',exact:true}).count(),0,'students must not see the teacher edit action');
 await fit('student library detail');
 await p.getByRole('button',{name:'返回图书馆',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'切片图书馆',exact:true}).waitFor();

 // 日常练习 已从学生导航移除（2026-09-11）；路由仍有效，改用深链进入。
 await p.evaluate(()=>{location.hash='#role=student&page=practice';window.dispatchEvent(new PopStateEvent('popstate'));});await p.waitForTimeout(700);
 await p.getByRole('button',{name:/开始练习|查看本次作答/}).first().click();await p.waitForTimeout(700);
 await p.getByRole('heading',{name:/日常练习 · 作答/}).waitFor();
 await fit('student practice detail');
 // Answering desk: a fixed slide stage flanked by rails. The tab mechanism was dropped with D-49.
 assert.equal(await p.locator('.answer-layout > *').count(),3,'the desk keeps history, slide and answer as three columns');
 assert.equal(await p.getByRole('button',{name:'提交本题',exact:true}).count(),1,'the answer action stays reachable on the desk');
 const cols=await p.evaluate(()=>{const w=s=>Math.round(document.querySelector(s).getBoundingClientRect().width);return {left:w('.answer-rail-left'),stage:w('.library-reader'),answer:w('.answer-rail-main')};});
 assert.ok(cols.stage>cols.answer&&cols.stage>cols.left,'the slide must stay the widest column, got '+JSON.stringify(cols));
 await p.getByRole('button',{name:'隐藏临床资料',exact:true}).click();await p.waitForTimeout(250);
 assert.equal(await p.evaluate(()=>Math.round(document.querySelector('.answer-rail-left').getBoundingClientRect().width)),0,'the case rail collapses');
 await fit('student practice rail collapsed');
 await p.getByRole('button',{name:'显示临床资料',exact:true}).click();await p.waitForTimeout(250);
 assert.ok(await p.evaluate(()=>document.querySelector('.answer-rail-left').getBoundingClientRect().width)>0,'the case rail comes back');
 console.log('Screenshot:',await shot(zoom?'student practice 200':'student practice'));
 await p.getByRole('button',{name:'返回练习列表',exact:true}).click();await p.waitForTimeout(600);
 await p.getByRole('heading',{name:'日常练习',exact:true}).waitFor();

 assert.deepEqual(errors,[],'no uncaught page errors expected');
 console.log('PASS: teacher 5 + student 4 modules, library/ability/record/practice detail routes, hash restore after reload, browser back/forward, panel switching, no horizontal overflow'+(zoom?', native 200% zoom':''));
}finally{await context.close();}
