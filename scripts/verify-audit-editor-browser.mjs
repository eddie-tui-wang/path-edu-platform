import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
// Isolated temporary browser: never loads the user's profile or records.
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(10000);
try {
 await p.goto('http://localhost:3002/');
 await p.locator('[name=username]').fill('demo_teacher');
 await p.locator('[name=password]').fill('Demo2026!teacher');
 await p.getByRole('button',{name:'进入演示'}).click();
 const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
 await nav('切片图书馆');
 const trigger=p.locator('.select-trigger');await trigger.click();
 await p.getByRole('combobox',{name:'搜索部位'}).fill('甲状腺');
 await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');
 assert.match(await trigger.innerText(),/甲状腺/);
 assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
 await trigger.click();await p.keyboard.press('Escape');
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 await nav('题库与出题');await p.getByRole('button',{name:'新建／继续出题'}).click();
 await p.getByLabel('题干',{exact:true}).fill('交互验收草稿');
 await p.getByRole('button',{name:'学生预览',exact:true}).click();
 assert.equal(await p.locator('dialog[open]').count(),1);
 for(let i=0;i<6;i++){await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement===document.body||!!document.activeElement?.closest('dialog')),true);}
 await p.keyboard.press('Escape');
 assert.equal(await p.getByRole('button',{name:'学生预览',exact:true}).evaluate(el=>el===document.activeElement),true);
 p.once('dialog',d=>d.dismiss());await nav('考试管理');
 await p.getByRole('heading',{name:'编辑题目',exact:true}).waitFor();
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'交互验收草稿');
 for(const width of [1440,1280,768,390]){
  await p.setViewportSize({width,height:844});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'editor overflow '+width);
 }
 p.once('dialog',d=>d.accept());await p.reload();
 // Demo login deliberately does not persist its authenticated session.
 if(await p.locator('[name=username]').count()){
  await p.locator('[name=username]').fill('demo_teacher');await p.locator('[name=password]').fill('Demo2026!teacher');await p.getByRole('button',{name:'进入演示'}).click();
 }
 await nav('题库与出题');
 await p.getByRole('heading',{name:'编辑题目',exact:true}).waitFor();
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'交互验收草稿');
 console.log('PASS: filter keyboard/focus, preview focus trap/Escape, cancelled cross-module leave, editor four widths, refresh draft restoration.');
} catch(error) {console.error(await p.locator('main').innerText());throw error;} finally {await browser.close();}
