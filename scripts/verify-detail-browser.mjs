import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const zoom=process.env.NATIVE_ZOOM==='200';
const profile=await mkdtemp(path.join(tmpdir(),'path-edu-layout-'));
if(zoom)await cp(new URL('./fixtures/chrome-200/',import.meta.url),profile,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:null,args:['--window-size=1440,1000']});
const p=context.pages()[0];p.setDefaultTimeout(12000);
const cdp=await context.newCDPSession(p);
const errors=[];p.on('pageerror',e=>errors.push(e.message));
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
async function fit(label){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');if(['trajectory','viewer','question editor'].includes(label)){const file=path.join(profile,label.replaceAll(' ','-')+'.png');if(zoom){const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false});await writeFile(file,Buffer.from(shot.data,'base64'));}else await p.screenshot({path:file,fullPage:true});console.log('Screenshot:',file);}}
async function nav(name){await p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();}
try{
 await p.goto('http://localhost:3002');
 const metrics=await p.evaluate(()=>({inner:innerWidth,outer:outerWidth,dpr:devicePixelRatio}));
 console.log('Native browser metrics:',metrics);
 if(zoom){assert.ok(metrics.dpr>=2&&metrics.outer/metrics.inner>1.9,'native browser zoom must change layout viewport and DPR');}
 await login('teacher');
 for(const name of ['考试管理','病例资料','教学记录','能力分析']){await nav(name);await fit('teacher '+name);}
 await p.getByRole('button',{name:/专业知识.*优势/}).click();await fit('dimension evidence');
 await p.getByRole('button',{name:'查看此记录的对应证据'}).click();
 await p.getByRole('heading',{name:'差异与原始证据'}).waitFor();await fit('diagnosis');
 await p.goBack();await p.getByRole('heading',{name:'专业知识 · 证据集合'}).waitFor();
 await p.goForward();await p.getByRole('heading',{name:'差异与原始证据'}).waitFor();
 await p.getByRole('button',{name:'← 返回维度证据',exact:true}).click();await p.getByRole('heading',{name:'专业知识 · 证据集合'}).waitFor();
 await p.getByRole('button',{name:'查看此记录的对应证据'}).click();
 await p.getByRole('button',{name:'讲解轨迹',exact:true}).click();await fit('trajectory');
 await p.getByRole('button',{name:/00:12:42/}).click();
 await p.reload();await login('teacher');await p.getByText('00:12:42 · 定位腺体融合区域',{exact:true}).waitFor();
 await p.getByRole('button',{name:'互动问答',exact:true}).click();await fit('qa');
 await nav('教学记录');await p.getByRole('button',{name:'查看分析'}).nth(1).click();await fit('missing evidence');
 await p.getByRole('button',{name:'返回上级页面',exact:true}).click();
 await p.getByRole('button',{name:'＋ 开展教学阅片'}).click();await fit('choose teaching case');await p.getByRole('button',{name:'使用此病例开始阅片'}).first().click();await fit('capture');
 await p.getByRole('button',{name:'开始演示',exact:true}).click();await fit('capture recording');
 await nav('病例资料');await p.getByRole('button',{name:'新建病例',exact:true}).click();await fit('case editor');
 await p.locator('[name=title]').fill('navigation draft');p.once('dialog',d=>d.accept());await p.goBack();
 await p.getByRole('heading',{name:'我的病例'}).waitFor();await p.goForward();
 await p.waitForFunction(()=>document.querySelector('[name=title]')?.value==='navigation draft');
 p.once('dialog',d=>d.accept());await nav('考试管理');
 await p.getByRole('button',{name:'新建试卷',exact:true}).click();await fit('exam editor');
 await p.getByRole('button',{name:'添加题目',exact:true}).click();await fit('question editor');
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'退出',exact:true}).click();
 await login('student');
 for(const name of ['考试中心','病例数据库','考试记录','错题集','能力分析']){await nav(name);await fit('student '+name);}
 await p.goto('http://localhost:3002/#role=student&page=records&exam=gastric-001&mode=case');await p.reload();await login('student');
 await p.locator('.teaching-viewer').waitFor();await fit('viewer');
 if(await p.locator('.viewer-panels').isVisible()){
  await p.getByRole('button',{name:'临床资料',exact:true}).click();await fit('clinical panel');
  await p.getByRole('button',{name:'切片图片',exact:true}).click();
 }
 await p.getByRole('region',{name:/切片画布/}).focus();await p.keyboard.press('ArrowRight');
 assert.match(await p.locator('.teaching-slide-transform').getAttribute('style'),/30px/);
 if(await p.locator('.viewer-panels').isVisible())await p.getByRole('button',{name:'答题',exact:true}).click();
 await p.getByRole('button',{name:'提交答案',exact:true}).click();
 await p.getByRole('dialog',{name:'还不能提交'}).waitFor();await fit('submission dialog');
 for(let i=0;i<12;i++){await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement===document.body||Boolean(document.activeElement?.closest('dialog'))),'dialog focus entered background page');}
 await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
 await p.waitForFunction(()=>document.activeElement?.textContent==='提交答案');
 await p.goto('http://localhost:3002/#role=student&page=records&exam=gastric-001&mode=result');await p.reload();await login('student');
 await p.getByRole('button',{name:/异型腺体区域.*定位并放大/}).click();await fit('image dialog');await p.keyboard.press('Escape');
 assert.equal(await p.locator('dialog[open]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: detail routes, history, draft recovery, responsive panels, keyboard dialogs'+(zoom?', native 200% zoom':''));
}finally{await context.close();}
