import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
// 1x1 PNG, decodes in the browser; the size limit is checked before decoding.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const file=(name,buf)=>({name,mimeType:'image/png',buffer:buf});
try{
 await p.goto('http://localhost:3002/');await login('teacher');await nav('切片图书馆');
 await p.getByRole('button',{name:'新增病例',exact:true}).click();
 await p.getByLabel('内部病例名称',{exact:true}).fill('图片导入验收病例');
 await p.getByLabel('素材来源',{exact:true}).fill('本地合成占位素材，无患者信息');
 await p.getByLabel('参考答案与评分依据（学生不可见）',{exact:true}).fill('仅用于图片导入流程验收，不是医学参考答案');
 await p.getByRole('checkbox',{name:/确认有权使用/}).check();
 const input=p.locator('input[type=file]');
 assert.equal(await p.getByRole('button',{name:/移除图片/}).count(),0,'a new case starts with no images');

 // oversized file is rejected before it is read
 await input.setInputFiles([file('too-big.png',Buffer.concat([png,Buffer.alloc(600*1024)])),file('ok.png',png)]);
 await p.getByText('本地演示仅接受 JPG/PNG，每张不超过 500 KB',{exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:/移除图片/}).count(),0,'a rejected import must not add any image');

 // a valid image is added
 await input.setInputFiles([file('ok.png',png)]);
 await p.getByRole('button',{name:'放大病例图片1',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:/移除图片/}).count(),1);

 // the six-image ceiling holds
 await input.setInputFiles(Array.from({length:6},(_,i)=>file('ok'+(i+2)+'.png',png)));
 await p.getByText('每病例最多 6 张图片',{exact:true}).waitFor();
 await input.setInputFiles(Array.from({length:5},(_,i)=>file('ok'+(i+2)+'.png',png)));
 await p.getByRole('button',{name:'放大病例图片6',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:/移除图片/}).count(),6,'the ceiling must allow exactly six images');

 // removing one drops it from the draft
 p.once('dialog',d=>d.accept());
 await p.getByRole('button',{name:'移除图片 6',exact:true}).click();
 assert.equal(await p.getByRole('button',{name:/移除图片/}).count(),5);

 // the case saves with its images and shows up in the library
 // saving returns to the library list, where the case must appear
 await p.getByRole('button',{name:'保存病例',exact:true}).click();
 await p.getByRole('heading',{name:'切片图书馆',exact:true}).waitFor();
 await p.getByLabel('搜索病例',{exact:true}).fill('图片导入验收病例');
 const saved=p.locator('main article.library-card').first();
 await saved.waitFor();
 assert.match(await saved.innerText(),/图片导入验收病例/,'the saved case must be listed in the library');
 const stored=await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('path-edu-publishing-v1')||'{}');const c=(d.cases||[]).find(c=>c.title==='图片导入验收病例');return c?{images:c.images.length,source:c.source,authorized:c.authorized,studentVisible:c.studentVisible}:null;});
 assert.ok(stored,'the case must be persisted');
 assert.equal(stored.images,5,'the saved case must keep exactly its five images');
 assert.equal(stored.authorized,true,'the usage confirmation must be stored');
 assert.equal(stored.studentVisible,false,'the case must not be published to students without an explicit opt-in');
 console.log('PASS: image import rejects oversized files without side effects, enforces the six-image ceiling, removes a draft image, and saves the case with its images.');
}finally{await browser.close();}
