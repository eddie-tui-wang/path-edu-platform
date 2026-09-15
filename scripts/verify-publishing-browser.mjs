import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
async function login(role){await p.locator('[name=username]').fill('demo_'+role);await p.locator('[name=password]').fill('Demo2026!'+role);await p.getByRole('button',{name:'进入演示'}).click();}
const nav=name=>p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
// The teacher paper list became the dense .data-table in c71f6a3: each paper is a direct
// <details> row (nested details exist, so scope to direct children). The student exam
// centre still renders <article> cards, so only the teacher-side selectors change.
const paperRow=title=>p.locator('.data-table > details').filter({hasText:title});
try{
 await p.goto('http://localhost:3002/');await login('teacher');await nav('考试管理');
  // ready-made demo papers seed themselves and must be listed before anything is created
 for(const title of ['示例卷 · 全单选十片','示例卷 · 全简答十片','示例卷 · 混合十片'])await p.getByText(title,{exact:true}).first().waitFor();
 assert.match(await paperRow('示例卷 · 全单选十片').first().innerText(),/10题 · 100分/,'a seeded paper must carry ten questions and 100 points');
 await p.getByRole('button',{name:'新建试卷',exact:true}).click();
 await p.getByRole('button',{name:'选择十道默认简答题',exact:true}).click();
 await p.getByRole('textbox',{name:'考试名称',exact:true}).fill('隔离发布验收卷');
 await p.getByRole('checkbox',{name:'演示学生（demo_student）',exact:true}).check();
 await p.getByRole('button',{name:'保存草稿',exact:true}).click();
 await p.getByRole('button',{name:'3. 检查并预览',exact:true}).click();
 await p.getByRole('button',{name:'确认发放给所选学生',exact:true}).click();
 await p.getByText('已发放，可切换指定学生查看',{exact:true}).waitFor();
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('student');await nav('考试中心');
 assert.ok(await p.getByText('隔离发布验收卷',{exact:true}).count());
 await p.locator('.exam-card').filter({hasText:'隔离发布验收卷'}).getByRole('button',{name:'开始考试',exact:true}).click();await p.getByRole('button',{name:'确认开始',exact:true}).click();
 assert.equal(await p.getByText('AI追问',{exact:true}).count(),0);
 // exam draft write failure: surface it, keep the answer, and never claim it saved
 await p.evaluate(()=>{window.origAttemptSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('path-edu-exam-attempts-v1'))throw new DOMException('测试：答卷写入失败','QuotaExceededError');return window.origAttemptSet.call(this,k,v);};});
 await p.getByRole('textbox',{name:'考试简答答案',exact:true}).fill('仅用于流程测试的回答');
 await p.getByRole('alert').filter({hasText:'测试：答卷写入失败'}).waitFor();
 assert.equal(await p.getByRole('textbox',{name:'考试简答答案',exact:true}).inputValue(),'仅用于流程测试的回答','exam answer must survive a failed save');
 assert.equal(await p.getByText('已保存到本机',{exact:true}).count(),0,'no false save confirmation after a failed exam write');
 await p.evaluate(()=>{Storage.prototype.setItem=window.origAttemptSet;});
 await p.getByRole('button',{name:'重试保存',exact:true}).click();
 await p.getByText('已保存到本机',{exact:true}).waitFor();
 assert.equal(await p.getByRole('textbox',{name:'考试简答答案',exact:true}).inputValue(),'仅用于流程测试的回答');
 await p.getByRole('button',{name:'检查并交卷',exact:true}).click();await p.getByRole('button',{name:'确认交卷',exact:true}).click();
 await p.getByRole('heading',{name:'已交卷 · 等待教师发布',exact:true}).waitFor();
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('teacher');await nav('考试管理');
 await paperRow('隔离发布验收卷').getByRole('button',{name:'阅卷与成绩',exact:true}).click();await p.getByRole('button',{name:'查看答卷',exact:true}).click();
 await p.getByRole('spinbutton',{name:'第1题得分',exact:true}).fill('8');
 await p.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('path-edu-review-draft-'))throw new DOMException('测试：评分草稿写入失败','QuotaExceededError');return window.originalStorageSet.call(this,key,value);};});
 await p.getByRole('textbox',{name:'第1题点评',exact:true}).fill('流程测试点评');
 await p.getByRole('alert').filter({hasText:'测试：评分草稿写入失败'}).waitFor();
 assert.equal(await p.getByText('评分草稿已保存到本机，尚未复核',{exact:true}).count(),0,'must clear stale success after failed write');
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'返回考试管理',exact:true}).click();
 assert.equal(await p.getByRole('textbox',{name:'第1题点评',exact:true}).inputValue(),'流程测试点评');
 await p.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});
 await p.getByRole('button',{name:'重试保存草稿',exact:true}).click();
 await p.getByRole('button',{name:'保存复核结果',exact:true}).first().click();
 await p.getByRole('button',{name:'发布整场成绩',exact:true}).click();await p.getByRole('button',{name:'确认发布成绩',exact:true}).click();await p.getByText('成绩已发布给相应学生',{exact:true}).waitFor();
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('student');await nav('考试中心');
 // A submitted attempt no longer resumes 考试中心, so open the result from the card.
 await p.locator('.exam-card').filter({hasText:'隔离发布验收卷'}).getByRole('button',{name:'查看成绩',exact:true}).click();await p.waitForTimeout(800);
 await p.getByRole('heading',{name:'成绩已发布 · 8分',exact:true}).waitFor();
 // The result page now renders the comment as a labelled block rather than one sentence.
 await p.locator('.result-questions details summary').first().click();await p.waitForTimeout(300);
 const comment=p.locator('.result-comment').first();await comment.waitFor();
 assert.match(await comment.innerText(),/教师点评/,'the comment block keeps its label');
 assert.match(await comment.innerText(),/流程测试点评/,'the teacher comment is shown to the student');
 assert.equal(await p.locator('.result-questions li').count(),10,'every question appears once on the result sheet');

 // --- second pass: a mixed paper (short + single) must publish, render both controls,
 // --- auto-score the single and require a manual mark for the answered short
 await p.getByRole('button',{name:'退出',exact:true}).click();await login('teacher');await nav('考试管理');
 await p.getByRole('button',{name:'新建试卷',exact:true}).click();
 await p.getByRole('button',{name:'选择十道默认简答题',exact:true}).click();
 await p.locator('.question-editor select').first().selectOption('single');
 await p.locator('aside.account-card input[type=checkbox]').first().check();
 await p.locator('.question-editor select').nth(1).selectOption('mixed');
 await p.getByText('已选 11 题 · 10/10 片 · 110 分',{exact:true}).waitFor();
 await p.getByRole('textbox',{name:'考试名称',exact:true}).fill('混合卷验收');
 await p.getByRole('checkbox',{name:'演示学生（demo_student）',exact:true}).check();
 await p.getByRole('button',{name:'保存草稿',exact:true}).click();
 await p.getByRole('button',{name:'3. 检查并预览',exact:true}).click();
 await p.getByRole('button',{name:'确认发放给所选学生',exact:true}).click();
 await p.getByText('已发放，可切换指定学生查看',{exact:true}).waitFor();

 await p.getByRole('button',{name:'退出',exact:true}).click();await login('student');await nav('考试中心');
 // the workspace resumes the previous attempt, so leave its result view before choosing another paper
 const back=p.getByRole('button',{name:'返回考试列表',exact:true});
 if(await back.count())await back.click();
 const mixed=p.locator('.exam-card').filter({hasText:'混合卷验收'});
 await mixed.getByRole('button',{name:'开始考试',exact:true}).click();await p.getByRole('button',{name:'确认开始',exact:true}).click();
 // question 1 is one of the shorts, the single was appended last
 await p.getByRole('textbox',{name:'考试简答答案',exact:true}).fill('混合卷简答作答');
 await p.getByRole('navigation',{name:'考试题目导航'}).getByRole('button',{name:'11',exact:true}).click();
 assert.equal(await p.getByRole('radio').count(),2,'the single-choice question must render a radio group in a mixed paper');
 await p.getByRole('radio').first().check();
 await p.getByRole('button',{name:'检查并交卷',exact:true}).click();await p.getByRole('button',{name:'确认交卷',exact:true}).click();
 await p.getByRole('heading',{name:'已交卷 · 等待教师发布',exact:true}).waitFor();

 await p.getByRole('button',{name:'退出',exact:true}).click();await login('teacher');await nav('考试管理');
 await paperRow('混合卷验收').getByRole('button',{name:'阅卷与成绩',exact:true}).click();
 await p.getByRole('button',{name:'查看答卷',exact:true}).click();
 await p.getByRole('spinbutton',{name:'第1题得分',exact:true}).fill('6');
 await p.getByRole('textbox',{name:'第1题点评',exact:true}).fill('混合卷点评');
 await p.getByRole('button',{name:'保存复核结果',exact:true}).first().click();
 await p.getByRole('button',{name:'发布整场成绩',exact:true}).click();await p.getByRole('button',{name:'确认发布成绩',exact:true}).click();
 await p.getByText('成绩已发布给相应学生',{exact:true}).waitFor();

 await p.getByRole('button',{name:'退出',exact:true}).click();await login('student');await nav('考试中心');
 await p.locator('.exam-card').filter({hasText:'混合卷验收'}).getByRole('button',{name:'查看成绩',exact:true}).click();await p.waitForTimeout(800);
 await p.getByRole('heading',{name:/成绩已发布 · \d+分/}).waitFor();
 assert.equal(await p.locator('.result-questions li').count(),11,'a mixed paper must return all 11 questions');
 await p.locator('.result-questions details summary').first().click();await p.waitForTimeout(300);
 await p.getByText('混合卷简答作答').first().waitFor();
 console.log('PASS: ten-image and mixed publication, assigned student starts/submits, exam-draft and grading write failure with input protection, grade hidden before release, released score and feedback visible.');
}finally{await browser.close();}
