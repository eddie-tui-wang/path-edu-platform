import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(10000);
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
try{
 await p.goto('http://localhost:3002');await login('teacher');
 await p.getByRole('button',{name:'病例资料',exact:true}).click();
 await p.getByRole('button',{name:'考试管理',exact:true}).click();
 await p.getByRole('button',{name:'新建试卷',exact:true}).click();
 await p.getByRole('button',{name:'校验并发布',exact:true}).click();
 await p.getByRole('button',{name:'定位错误字段',exact:true}).click();
 await p.waitForFunction(()=>document.activeElement?.getAttribute('data-field')==='title');
 await p.locator('[data-field=title]').fill('后退保留');
 p.once('dialog',d=>d.dismiss());
 await p.goBack();
 assert.equal(await p.locator('[data-field=title]').inputValue(),'后退保留');
 assert.match(p.url(),/page=exams/);
 p.once('dialog',d=>d.accept());
 await p.getByRole('button',{name:'退出',exact:true}).click();
 await login('student');
 await p.getByRole('button',{name:'病例数据库',exact:true}).click();
 await p.getByRole('button',{name:'查看病例 →',exact:true}).first().click();
 assert.match(p.url(),/case=gastric-001/);
 await p.reload();await login('student');
 await p.getByRole('button',{name:'← 返回病例数据库',exact:true}).waitFor();
 console.log('PASS exact field focus, cancelled Back preserves input/URL, student detail refresh');
}finally{await browser.close();}
