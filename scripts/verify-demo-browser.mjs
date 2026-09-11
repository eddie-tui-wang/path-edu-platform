import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(10000);
let api=0;
await page.route('**/api/accounts/**',r=>{api++;return r.abort();});
async function login(name,password) {
  await page.locator('input[name=username]').fill(name);
  await page.locator('input[name=password]').fill(password);
  await page.getByRole('button',{name:'进入演示'}).click();
}
try {
  await page.goto(process.env.DEMO_URL || 'http://localhost:3002/');
  for(const role of ['student','teacher','admin']) {
    await login('demo_'+role,'Demo2026!'+role);
    await page.getByRole('button',{name:'退出',exact:true}).waitFor();
    await page.getByRole('button',{name:'退出',exact:true}).click();
  }
  await login('demo_admin','Demo2026!admin');
  await page.getByRole('button',{name:'新增账号',exact:true}).click();
  const form=page.locator('dialog form');
  await form.locator('[name=username]').fill('demo_check');
  await form.locator('[name=displayName]').fill('浏览器验收');
  await form.locator('[name=role]').selectOption('student');
  await form.locator('[name=password]').fill('Testing2026!demo');
  await form.getByRole('button',{name:'创建演示账号'}).click();
  await page.getByText('demo_check',{exact:true}).waitFor();
  await page.reload();
  await login('demo_check','Testing2026!demo');
  await page.getByRole('button',{name:'退出',exact:true}).waitFor();
  await page.getByRole('button',{name:'退出',exact:true}).click();
  await login('demo_admin','Demo2026!admin');
  await page.getByRole('row').filter({hasText:'demo_check'}).getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('button',{name:'退出',exact:true}).click();
  await login('demo_check','Testing2026!demo');
  await page.getByText('演示账号或密码错误，或账号已停用',{exact:true}).waitFor();
  assert.equal(api,0);
  console.log('PASS: three roles, create, reload, login, disabled rejection, no account API');
} finally {await browser.close();}
