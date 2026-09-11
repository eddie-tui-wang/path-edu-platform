// Opt-in LOCAL smoke test. Creates two clearly named QA accounts and disables them afterwards.
// PLAYWRIGHT_MODULE may point to the desktop's bundled playwright/index.mjs.
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='http://localhost:3002';
const credentialPath='.local/首次管理员登录.txt';
const credential=await readFile(credentialPath,'utf8');
const username=credential.match(/账号：(.+)/)[1];
let password=credential.match(/(?:初始密码|当前密码)：(.+)/)[1];
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const created=[];
async function logIn(p,name,pass) {
  await p.goto(base+'/account');
  await p.locator('input[name="username"]').fill(name);
  await p.locator('input[name="password"]').fill(pass);
  await p.getByRole('button',{name:'登录',exact:true}).click();
}
async function post(data) {
  const result=await context.request.post(base+'/api/accounts/users',{headers:{Origin:base},data});
  assert.equal(result.status(),200,await result.text());
}
try {
  await logIn(page,username,password);
  await page.waitForFunction(()=>document.body.innerText.includes('首次登录，请修改初始密码')||document.body.innerText.includes('机构管理后台'));
  if(await page.getByRole('heading',{name:'首次登录，请修改初始密码'}).count()) {
    const next='A9-'+randomBytes(24).toString('base64url');
    await page.locator('[name="currentPassword"]').fill(password);
    await page.locator('[name="password"]').fill(next);
    await page.locator('[name="confirm"]').fill(next);
    await page.getByRole('button',{name:'保存并重新登录'}).click();
    await page.getByRole('heading',{name:'登录病理教学平台'}).waitFor();
    password=next;
    await writeFile(credentialPath,`仅供本地开发，勿转发或提交仓库。\n账号：${username}\n当前密码：${password}\n自动验收已验证首次改密，建议你登录后再次修改。\n`,{mode:0o600});
    await logIn(page,username,password);
  }
  await page.getByRole('heading',{name:'机构管理后台'}).waitFor();
  await page.reload();await page.getByRole('heading',{name:'机构管理后台'}).waitFor();
  for(const role of ['student','teacher']) {
    const name=`qa_${role}_${Date.now()}`, pass='T8-'+randomBytes(20).toString('hex');
    const form=page.locator('form').filter({has:page.getByRole('heading',{name:'新建账号'})});
    await form.locator('[name="username"]').fill(name);
    await form.locator('[name="displayName"]').fill(`验收测试-${role}`);
    for(const choice of ['student','teacher','admin']) await form.locator(`[name="roles"][value="${choice}"]`).setChecked(role===choice);
    await form.locator('[name="password"]').fill(pass);
    await form.getByRole('button',{name:'创建账号',exact:true}).click();
    await page.getByText(name,{exact:false}).first().waitFor();
    const list=await (await context.request.get(base+'/api/accounts/users')).json();
    const user=list.items.find(u=>u.username===name);assert.ok(user);created.push(user);
    const studentContext=await browser.newContext();const p=await studentContext.newPage();
    await logIn(p,name,pass);await p.getByRole('heading',{name:'首次登录，请修改初始密码'}).waitFor();
    const next='N7-'+randomBytes(20).toString('hex');
    await p.locator('[name="currentPassword"]').fill(pass);await p.locator('[name="password"]').fill(next);await p.locator('[name="confirm"]').fill(next);
    await p.getByRole('button',{name:'保存并重新登录'}).click();await p.getByRole('heading',{name:'登录病理教学平台'}).waitFor();
    await logIn(p,name,next);await p.getByRole('button',{name:role==='student'?'学生端':'教师端',exact:true}).waitFor();
    assert.equal(await p.getByRole('button',{name:'管理后台',exact:true}).count(),0);
    assert.equal((await studentContext.request.get(base+'/api/accounts/users')).status(),403);
    if(role==='student') {
      await page.getByRole('row').filter({hasText:name}).getByRole('button',{name:'管理',exact:true}).click();
      const reset=page.locator('form').filter({has:page.getByRole('heading',{name:'重置密码',exact:true})});
      const resetPassword='R6-'+randomBytes(20).toString('hex');
      await reset.locator('[name="password"]').fill(resetPassword);
      await reset.getByRole('button',{name:'重置并撤销旧登录'}).click();
      await page.getByRole('heading',{name:'新建账号',exact:true}).waitFor();
      assert.equal((await studentContext.request.get(base+'/api/accounts/me')).status(),401);
      await logIn(p,name,resetPassword);await p.getByRole('heading',{name:'首次登录，请修改初始密码'}).waitFor();
    } else {
      await page.getByRole('button',{name:'资源授权',exact:true}).click();
      const grant=page.locator('form').filter({has:page.getByRole('heading',{name:'按资源单独授权'})});
      await grant.locator('[name="userId"]').selectOption(user.id);
      await grant.locator('[name="resourceType"]').selectOption('case');
      await grant.locator('[name="resourceId"]').fill('qa-case-'+user.id);
      await grant.locator('[name="purpose"]').fill('浏览器自动验收，不开放真实内容');
      await grant.getByRole('button',{name:'保存授权并撤销旧登录'}).click();
      const card=page.locator('article.account-grant').filter({hasText:'qa-case-'+user.id});
      await card.waitFor();
      assert.equal((await studentContext.request.get(base+'/api/accounts/me')).status(),401);
      page.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'撤销',exact:true}).click();
      await card.waitFor({state:'detached'});
      await page.getByRole('button',{name:'账号管理',exact:true}).click();
    }
    await post({action:'update',userId:user.id,displayName:user.displayName,roles:user.roles,active:false});
    assert.equal((await studentContext.request.get(base+'/api/accounts/me')).status(),401);
    await p.reload();await p.getByRole('heading',{name:'登录病理教学平台'}).waitFor();
    await studentContext.close();
  }
  await page.getByRole('button',{name:'资源授权',exact:true}).click();await page.getByRole('heading',{name:'按资源单独授权'}).waitFor();
  await page.getByRole('button',{name:'操作审计',exact:true}).click();await page.getByRole('heading',{name:'最近 100 条操作记录'}).waitFor();
  await page.getByRole('button',{name:'账号管理',exact:true}).click();
  await page.getByRole('button',{name:'刷新',exact:true}).click();
  await page.getByRole('row').filter({hasText:created[created.length-1].username}).getByText('停用',{exact:true}).waitFor();
  await page.screenshot({path:'.local/账号后台验收.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
  await page.getByRole('button',{name:'退出',exact:true}).click();await page.getByRole('heading',{name:'登录病理教学平台'}).waitFor();
  await page.screenshot({path:'.local/登录页验收.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: first password change, admin create/reset, grant/revoke, teacher/student role isolation, 403, disable/401, refresh, audit, narrow layout, logout.');
} finally {
  // A failed run must not silently delete account/audit evidence.
  for(const user of created) {
    const result=await context.request.post(base+'/api/accounts/users',{headers:{Origin:base},data:{action:'update',userId:user.id,displayName:user.displayName,roles:user.roles,active:false}});
    if(![200,401].includes(result.status())) console.error('QA cleanup requires administrator attention');
  }
  await browser.close();
}
