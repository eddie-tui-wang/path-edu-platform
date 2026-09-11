import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
try{
 await p.goto('http://localhost:3002/');await login('teacher');await nav('题库与出题');
 await p.getByRole('button',{name:'新建／继续出题',exact:true}).click();await p.getByLabel('题干',{exact:true}).fill('导航保留草稿');
 p.once('dialog',d=>d.dismiss());await nav('考试管理');
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'导航保留草稿');
 await p.getByRole('button',{name:'保存草稿',exact:true}).click();await nav('考试管理');await nav('题库与出题');
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'导航保留草稿');
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('student');await nav('切片图书馆');
 await p.getByRole('button',{name:'查看病例',exact:true}).first().click();await p.getByRole('button',{name:'返回图书馆',exact:true}).waitFor();
 assert.match(p.url(),/libraryCase=/);
 await p.reload();await login('student');await p.getByRole('button',{name:'返回图书馆',exact:true}).waitFor();
 await p.getByRole('button',{name:'返回图书馆',exact:true}).click();await p.getByRole('heading',{name:'切片图书馆',exact:true}).waitFor();
 console.log('PASS: cancelled navigation retains editor; saved draft survives module switch; student library deep link restores after reload and returns to library.');
}finally{await browser.close();}
