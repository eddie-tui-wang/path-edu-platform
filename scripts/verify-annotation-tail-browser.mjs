import assert from 'node:assert/strict';
import {mkdtemp,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const profile=await mkdtemp(path.join(tmpdir(),'path-edu-annotations-'));
if(process.env.NATIVE_ZOOM==='200')await cp(new URL('./fixtures/chrome-200/',import.meta.url),profile,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:null,args:['--window-size=1440,1000']});
const p=context.pages()[0];p.setDefaultTimeout(12000);
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
async function login(){await p.locator('[name=username]').fill('demo_teacher');await p.locator('[name=password]').fill('Demo2026!teacher');await p.getByRole('button',{name:'进入演示'}).click();}
try{
 await p.goto(process.env.TEST_URL||'http://localhost:3002/');await login();await nav('切片图书馆');
 if(process.env.NATIVE_ZOOM==='200')assert.ok(await p.evaluate(()=>devicePixelRatio>=2&&outerWidth/innerWidth>1.9));
 // Only this temporary profile receives synthetic category fixtures.
 await p.evaluate(()=>{const key='path-edu-publishing-v1',data=JSON.parse(localStorage.getItem(key));for(let i=0;i<24;i++)data.cases.push({...data.cases.find(c=>c.simulated),id:'test-category-'+i,organ:'测试部位'+String(i).padStart(2,'0'),title:'筛选验收'+i});localStorage.setItem(key,JSON.stringify(data));});
 await nav('题库与出题');await nav('切片图书馆');
 const trigger=p.locator('.select-trigger');await trigger.click();
 assert.ok(await p.getByRole('option').count()>24);
 assert.ok(await p.getByRole('listbox').evaluate(el=>el.scrollHeight>el.clientHeight));
 const search=p.getByRole('combobox',{name:'搜索部位'});
 await search.fill('不存在的部位');await p.getByText('没有匹配部位',{exact:true}).waitFor();
 await search.fill('测试部位23');await p.keyboard.press('Enter');assert.match(await trigger.innerText(),/测试部位23/);
 assert.ok(await trigger.evaluate(el=>el===document.activeElement));
 await trigger.click();await p.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 await p.getByRole('button',{name:'清空筛选',exact:true}).click();assert.match(await trigger.innerText(),/全部部位/);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await nav('题库与出题');await p.getByLabel('搜索题目',{exact:true}).fill('不匹配新题的条件');
 await p.getByRole('button',{name:'新建／继续出题'}).click();
 await p.getByLabel('病例',{exact:true}).selectOption('library-demo-01');
 await p.getByLabel('题干',{exact:true}).fill('入库定位验收');
 await p.getByRole('textbox',{name:'选项 1',exact:true}).fill('选项甲');await p.getByRole('textbox',{name:'选项 2',exact:true}).fill('选项乙');
 await p.getByRole('radio',{name:'正确项 1',exact:true}).check();
 await p.locator('label').filter({hasText:'答案解析'}).locator('textarea').fill('流程验收解析');
 await p.getByRole('button',{name:'保存草稿',exact:true}).click();assert.ok(await p.getByRole('button',{name:'保存草稿',exact:true}).isDisabled());
 await p.getByRole('button',{name:'确认入库',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'确认入库',exact:true}).click();
 const item=p.locator('article').filter({has:p.getByRole('heading',{name:'入库定位验收',exact:true})});await item.waitFor();
 await p.waitForFunction(()=>document.activeElement?.id.startsWith('question-'));assert.ok(await item.evaluate(el=>el===document.activeElement));assert.equal(await p.getByLabel('搜索题目',{exact:true}).inputValue(),'');
 assert.equal(await p.getByRole('button',{name:'结束编辑',exact:true}).count(),0);
 await nav('教学记录');assert.equal(await p.getByRole('button',{name:'← 返回病例资料',exact:true}).count(),0);
 assert.equal(await p.locator('.teacher-record-toolbar button').count(),0);
 await p.getByRole('button',{name:'查看分析',exact:true}).first().click();
 assert.equal(await p.locator('.teacher-analysis-status').count(),0);assert.equal(await p.locator('.teacher-analysis-detail>.ability-summary').count(),0);
 await nav('能力分析');assert.equal(await p.getByRole('button',{name:/录音分析/}).count(),0);
 assert.equal(await p.locator('.edu-teacher-notice').count(),0);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: 31 categories, empty/search/select/reset/keyboard; draft disabled; confirmation focus/filter reset; teacher single recording ownership, no duplicate cards/back/banner. Native zoom:',process.env.NATIVE_ZOOM||'100');
}finally{await context.close();}
