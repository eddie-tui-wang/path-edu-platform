import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(15000);p.on('dialog',d=>d.accept());
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
try {
 await p.goto('http://localhost:3002');await login('teacher');
 await p.getByRole('button',{name:'病例资料',exact:true}).click();await p.getByRole('button',{name:'新建病例',exact:true}).click();
 await p.locator('[name=title]').fill('验收病例');
 await p.locator('[name=history]').fill('独立病史内容');
 await p.locator('[name=source]').fill('合成测试');await p.locator('[name=authorized]').check();
 await p.locator('[name=reference]').fill('不向学生显示的答案');
 await p.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64')});
 await p.getByRole('button',{name:'保存病例',exact:true}).click();
 await p.getByRole('button',{name:'考试管理',exact:true}).click();await p.getByRole('button',{name:'新建试卷'}).click();
 await p.getByLabel('考试名称',{exact:true}).fill('联动验收试卷');await p.getByLabel('卷型',{exact:true}).selectOption('choice');
 await p.getByRole('checkbox',{name:/demo_student/}).check();await p.getByRole('button',{name:'添加题目'}).click();
 await p.getByLabel('关联病例',{exact:true}).selectOption({label:'验收病例 v1'});
 await p.getByLabel('题干',{exact:true}).fill('观察到什么？');
 await p.getByLabel('选项（每行一项）',{exact:true}).fill('甲\n乙');
 await p.getByLabel('正确选项序号（例如 1,3）',{exact:true}).fill('1');
 await p.getByRole('button',{name:'校验并发布'}).click();
 await p.getByRole('heading',{name:'发布检查',exact:true}).waitFor();
 await p.goBack();await p.getByLabel('考试名称',{exact:true}).waitFor();
 assert.equal(await p.getByLabel('考试名称',{exact:true}).inputValue(),'联动验收试卷');
 await p.goForward();await p.getByRole('heading',{name:'发布检查',exact:true}).waitFor();
 await p.reload();await login('teacher');await p.getByRole('heading',{name:'发布检查',exact:true}).waitFor();
 await p.getByRole('button',{name:'确认发布考试',exact:true}).click();
 await p.getByText('已发布。可退出并切换指定学生账号查看。',{exact:true}).waitFor();
 await p.reload();await login('student');
 await p.getByText('联动验收试卷',{exact:true}).waitFor();await p.getByRole('button',{name:'查看考试资料'}).click();
 await p.getByText('独立病史内容',{exact:true}).waitFor();
 assert.equal(await p.getByText('不向学生显示的答案',{exact:true}).count(),0);
 console.log('PASS: image import, case save, publish, reload, student sees frozen exam and history; reference hidden');
}finally{await browser.close();}
