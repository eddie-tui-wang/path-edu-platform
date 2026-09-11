import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
// Ordinary fault injection in this disposable context only; no application test hooks.
// Re-arming must reinstall the patch: restore() puts the original back, so guarding on
// "already saved" would silently no-op the second injection.
async function fail(prefix){await p.evaluate(prefix=>{
 if(!window.originalStorageSet)window.originalStorageSet=Storage.prototype.setItem;
 window.storageFailurePrefix=prefix;
 Storage.prototype.setItem=function(key,value){if(window.storageFailurePrefix&&key.startsWith(window.storageFailurePrefix))throw new DOMException('测试：存储写入失败','QuotaExceededError');return window.originalStorageSet.call(this,key,value);};
},prefix);}
async function failRemove(prefix){await p.evaluate(prefix=>{
 if(!window.originalStorageRemove)window.originalStorageRemove=Storage.prototype.removeItem;
 window.storageRemovePrefix=prefix;
 Storage.prototype.removeItem=function(key){if(window.storageRemovePrefix&&key.startsWith(window.storageRemovePrefix))throw new DOMException('测试：存储清理失败','QuotaExceededError');return window.originalStorageRemove.call(this,key);};
},prefix);}
async function restore(){await p.evaluate(()=>{if(window.originalStorageSet)Storage.prototype.setItem=window.originalStorageSet;if(window.originalStorageRemove)Storage.prototype.removeItem=window.originalStorageRemove;window.storageFailurePrefix='';window.storageRemovePrefix='';});}
try{
 // A short-answer practice must be open before the student side can exercise it.
 await p.goto('http://localhost:3002/');await login('teacher');await nav('题库与出题');
 // scope to a short question: the seeded bank also carries single-choice items
 await p.locator('article').filter({hasText:'简答'}).getByRole('button',{name:'开放练习',exact:true}).first().click();
 await p.getByRole('button',{name:'退出',exact:true}).click();

 // 1. practice, single choice
 await login('student');await nav('日常练习');
 await p.getByRole('button',{name:'开始练习',exact:true}).first().click();
 await fail('path-edu-practice-draft-');await p.getByRole('radio').first().check();
 await p.getByRole('alert').filter({hasText:'答案尚未保存'}).waitFor();
 assert.equal(await p.getByText('已保存到本机',{exact:true}).count(),0);
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'返回练习列表',exact:true}).click();
 assert.ok(await p.getByRole('radio').first().isChecked());
 p.once('dialog',d=>d.dismiss());await nav('考试中心');assert.ok(await p.getByRole('radio').first().isChecked());
 await restore();await p.getByRole('button',{name:'重试保存答案',exact:true}).click();await p.getByText('已保存到本机',{exact:true}).waitFor();
 await p.getByRole('button',{name:'返回练习列表',exact:true}).click();await p.getByRole('button',{name:'开始练习',exact:true}).first().click();assert.ok(await p.getByRole('radio').first().isChecked());

 // 2. practice, short answer: same shared draft key, different editor
 await p.getByRole('button',{name:'返回练习列表',exact:true}).click();
 await p.getByRole('combobox').selectOption('short');
 await p.getByRole('button',{name:'开始练习',exact:true}).first().click();
 const typed='简答存储故障保留文本';
 await fail('path-edu-practice-draft-');
 await p.getByRole('textbox',{name:'简答答案',exact:true}).fill(typed);
 await p.getByRole('alert').filter({hasText:'答案尚未保存'}).waitFor();
 assert.equal(await p.getByText('已保存到本机',{exact:true}).count(),0,'no false success on the short-answer path');
 assert.equal(await p.getByRole('textbox',{name:'简答答案',exact:true}).inputValue(),typed,'typed short answer must survive a failed write');
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'返回练习列表',exact:true}).click();
 assert.equal(await p.getByRole('textbox',{name:'简答答案',exact:true}).inputValue(),typed,'cancelled leave must keep the short answer');
 await restore();await p.getByRole('button',{name:'重试保存答案',exact:true}).click();await p.getByText('已保存到本机',{exact:true}).waitFor();
 assert.equal(await p.getByRole('textbox',{name:'简答答案',exact:true}).inputValue(),typed);
 await p.getByRole('button',{name:'返回练习列表',exact:true}).click();

 // 3. question bank write failure
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('teacher');await nav('题库与出题');
 await p.getByRole('button',{name:'新建／继续出题',exact:true}).click();await p.getByLabel('题干',{exact:true}).fill('存储失败测试草稿');
 await fail('path-edu-question-bank-v1');await p.getByRole('button',{name:'保存草稿',exact:true}).click();await p.getByRole('alert').filter({hasText:'测试：存储写入失败'}).waitFor();
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'存储失败测试草稿');assert.equal(await p.getByText(/草稿已保存 ·/).count(),0);
 await p.getByRole('button',{name:'返回题库',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'继续编辑',exact:true}).click();
 await restore();await p.getByRole('button',{name:'保存草稿',exact:true}).click();await p.getByText(/草稿已保存 ·/).waitFor();
 assert.ok(await p.getByRole('button',{name:'保存草稿',exact:true}).isDisabled());

 // 4. sessionStorage cleanup failure while discarding an edit
 await p.getByLabel('题干',{exact:true}).fill('清理失败测试草稿');
 await p.getByRole('button',{name:'返回题库',exact:true}).click();
 await p.getByRole('dialog').getByRole('heading',{name:'保留本次修改？',exact:true}).waitFor();
 await failRemove('path-edu-question-draft-');
 await p.getByRole('dialog').getByRole('button',{name:'放弃修改',exact:true}).click();
 await p.getByRole('dialog').getByRole('alert').filter({hasText:'无法清除暂存内容'}).waitFor();
 assert.equal(await p.getByLabel('题干',{exact:true}).inputValue(),'清理失败测试草稿','a failed cleanup must not close the editor or drop the edit');
 assert.equal(await p.getByRole('heading',{name:'题库与出题',exact:true}).count(),0,'must not navigate back after a failed cleanup');
 await restore();
 await p.getByRole('dialog').getByRole('button',{name:'放弃修改',exact:true}).click();
 await p.getByRole('heading',{name:'题库与出题',exact:true}).waitFor();
 console.log('PASS: practice single and short-answer write failure, question-bank write failure, sessionStorage cleanup failure; no false success, input retained, cancelled leave, retry. Grading and exam drafts covered elsewhere.');
}finally{await browser.close();}
