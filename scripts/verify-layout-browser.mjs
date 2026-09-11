const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage();const failures=[];
try {
 for(const role of ['teacher','student']){
  await p.goto('http://localhost:3002/');
  await p.locator('[name=username]').fill('demo_'+role);
  await p.locator('[name=password]').fill('Demo2026!'+role);
  await p.getByRole('button',{name:'进入演示'}).click();
  for(const name of role==='teacher'?['切片图书馆','题库与出题','考试管理','教学记录','能力分析']:['考试中心','切片图书馆','学习记录','错题集']){
   await p.locator('.edu-sidebar').getByRole('button',{name,exact:true}).click();
   for(const width of [1440,1280,768,390]){
    await p.setViewportSize({width,height:844});
    if(!await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))failures.push(role+'/'+name+'/'+width);
   }
  }
  await p.getByRole('button',{name:'退出',exact:true}).click();
 }
 if(failures.length)throw Error('Page overflow: '+failures.join(', '));
 console.log('PASS: teacher 5 + student 4 modules at 1440/1280/768/390. Native 200% zoom not tested.');
}finally{await browser.close();}
