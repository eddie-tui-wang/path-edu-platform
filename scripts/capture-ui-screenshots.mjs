// Screenshot tool, NOT a regression gate.
//
// The verify-*-browser.mjs scripts are the gates: they assert. This one only captures what
// the interface looks like right now, so a human or an image-capable model can actually look
// at it. It exists because the interface was measured programmatically for a whole round
// without anyone ever seeing it.
//
//   pnpm dev                                         # terminal A
//   node scripts/capture-ui-screenshots.mjs [outDir]  # terminal B, default ./.ui-shots
//
// Writes one 1440x900 PNG per module (teacher 5, student 6, plus both case-reader details)
// and prints a JSON manifest with a scrollHeight per screen. Uses the system Chrome via
// channel:'chrome', like every other script in this directory.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const out = process.argv[2] || '.ui-shots';
const base = process.env.TEST_URL || 'http://localhost:3002';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({channel: 'chrome', headless: true});
const p = await browser.newPage();
p.setDefaultTimeout(60000);
await p.setViewportSize({width: 1440, height: 900});

const results = [];
async function login(role) {
  await p.goto(base + '/', {waitUntil: 'domcontentloaded', timeout: 120000});
  await p.locator('[name=username]').fill('demo_' + role);
  await p.locator('[name=password]').fill('Demo2026!' + role);
  await p.getByRole('button', {name: '进入演示'}).click();
  await p.waitForTimeout(900);
}
async function logout() {
  await p.getByRole('button', {name: '退出', exact: true}).click();
  await p.waitForTimeout(700);
}
const nav = name => p.locator('.edu-sidebar').getByRole('button', {name, exact: true}).click();

async function step(name, fn) {
  try {
    await fn();
    await p.waitForTimeout(700);
    const path = out + '/' + name + '.png';
    await p.screenshot({path, fullPage: false});
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    results.push({name, ok: true, scrollHeight: h, shot: path});
  } catch (e) {
    results.push({name, ok: false, error: String(e).slice(0, 240)});
  }
}

await login('teacher');
await step('T1-library-list', async () => { await nav('切片图书馆'); });
await step('T1b-library-reader', async () => { await p.getByRole('button', {name: '查看病例'}).first().click(); });
await step('T2-question-bank', async () => { await nav('题库与出题'); });
await step('T3-exam-manage', async () => { await nav('考试管理'); });
await step('T4-teaching-records', async () => { await nav('教学记录'); });
await step('T5-ability', async () => { await nav('能力分析'); });
await logout();

await login('student');
// 日常练习 已从学生导航移除；路由仍有效，深链进入。
await step('S1-practice-list', async () => { await p.evaluate(() => { location.hash = '#role=student&page=practice'; window.dispatchEvent(new PopStateEvent('popstate')); }); });
await step('S1b-practice-desk', async () => { await p.getByRole('button', {name: /开始|继续/}).first().click(); });
await step('S2-exam-center', async () => { await nav('考试中心'); });
await step('S3-library-list', async () => { await nav('切片图书馆'); });
await step('S3b-library-reader', async () => { await p.getByRole('button', {name: '查看病例'}).first().click(); });
await step('S4-learning-records', async () => { await nav('学习记录'); });
await step('S5-wrong-book', async () => { await nav('错题集'); });
await step('S6-ability', async () => { await nav('能力分析'); });

await browser.close();
console.log(JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.ok);
if (failed.length) console.error(failed.length + ' screen(s) could not be captured');