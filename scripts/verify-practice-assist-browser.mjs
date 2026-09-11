import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const zoom=process.env.NATIVE_ZOOM==='200';
const profile=await mkdtemp(path.join(tmpdir(),'path-edu-assist-'));
if(zoom)await cp(new URL('./fixtures/chrome-200/',import.meta.url),profile,{recursive:true});
const browser=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:null,args:['--window-size=1440,1000']});
const p=browser.pages()[0];p.setDefaultTimeout(12000);
async function login(){await p.locator('[name=username]').fill('demo_student');await p.locator('[name=password]').fill('Demo2026!student');await p.getByRole('button',{name:'进入演示'}).click();}
try{
 await p.goto('http://localhost:3002/');await login();await p.getByRole('button',{name:'日常练习',exact:true}).click();await p.getByRole('button',{name:'开始练习',exact:true}).first().click();
 assert.equal(await p.getByRole('complementary',{name:'AI追问辅助'}).count(),0);
 if(await p.getByRole('button',{name:'作答与解析',exact:true}).isVisible())await p.getByRole('button',{name:'作答与解析',exact:true}).click();
 await p.getByRole('radio').first().check();await p.getByRole('button',{name:'提交本题',exact:true}).click();
 const assist=p.getByRole('complementary',{name:'AI追问辅助'});
 if(zoom)assert.ok(await p.evaluate(()=>devicePixelRatio>=2&&outerWidth/innerWidth>1.9));
 for(const width of zoom?[720]:[1440,1280,768,390]){
  if(!zoom)await p.setViewportSize({width,height:900});
  if(width<1400){await p.getByRole('button',{name:'AI追问',exact:true}).click();}
  await assist.waitFor();assert.ok(await assist.getByRole('textbox',{name:'AI追问',exact:true}).isDisabled());assert.ok(await assist.getByRole('button',{name:'发送',exact:true}).isDisabled());
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width<1400){await p.getByRole('button',{name:'关闭追问',exact:true}).click();assert.equal(await assist.isVisible(),false);await p.getByRole('heading',{name:'答案与解析',exact:true}).waitFor();}
 }
 await p.getByRole('button',{name:'AI追问',exact:true}).click();await p.reload();await login();
 await p.getByRole('heading',{name:'答案与解析',exact:true}).waitFor();assert.equal(await assist.isVisible(),false);
 console.log('PASS: submission gate; disabled AI; narrow open/close; reload fallback. Layout:',zoom?'native 200%':'four widths');
}finally{await browser.close();}
