import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
// Ordinary fault injection in this disposable context only; no application test hooks.
async function fail(prefix){await p.evaluate(prefix=>{window.storageFailurePrefix=prefix;if(!window.originalStorageSet){window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(window.storageFailurePrefix&&key.startsWith(window.storageFailurePrefix))throw new DOMException('测试：存储写入失败','QuotaExceededError');return window.originalStorageSet.call(this,key,value);};}},prefix);}
try{
 await p.goto('http://localhost:3002/');await login('student');await nav('日常练习');
 await p.getByRole('button',{name:'开始练习',exact:true}).first().click();
 await fail('path-edu-practice-draft-');await p.getByRole('radio').first().check();
 await p.getByRole('alert').filter({hasText:'答案尚未保存'}).waitFor();
 assert.equal(await p.getByText('已保存到本机',{exact:true}).count(),0);
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'返回练习列表',exact:true}).click();
 assert.ok(await p.getByRole('radio').first().isChecked());
 p.once('dialog',d=>d.dismiss());await nav('考试中心');assert.ok(await p.getByRole('radio').first().isChecked());
 await fail('');await p.getByRole('button',{name:'重试保存答案',exact:true}).click();await p.getByText('已保存到本机',{exact:true}).waitFor();
 await p.getByRole('button',{name:'返回练习列表',exact:true}).click();await p.getByRole('button',{name:'开始练习',exact:true}).first().click();assert.ok(await p.getByRole('radio').first().isChecked());
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('teacher');await nav('题库与出题');
 await p.getByRole('button',{name:'新建／继续出题',exact:true}).click();await p.getByLabel('题干',{exact:true}).fill('存储失败测试草稿');
 await fail('path-edu-question-bank-v1');await p.getByRole('button',{name:'保存草稿',exact:true}).click();await p.getByRole('alert').filter({hasText:'测试：存储写入失败'}).waitFor();
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'存储失败测试草稿');assert.equal(await p.getByText(/草稿已保存 ·/).count(),0);
 await p.getByRole('button',{name:'返回题库',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'继续编辑',exact:true}).click();
 await fail('');await p.getByRole('button',{name:'保存草稿',exact:true}).click();await p.getByText(/草稿已保存 ·/).waitFor();
 assert.ok(await p.getByRole('button',{name:'保存草稿',exact:true}).isDisabled());
 console.log('PASS: practice and question-bank write failure, no false success, input retained, cancelled leave, retry and practice reopen. Grading not covered.');
}finally{await browser.close();}
