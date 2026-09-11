import { teachingKey } from './exam-drafts.mjs';

export const libraryCategories = ['骨与软组织肿瘤 / 肉瘤','甲状腺肿瘤 / 甲状腺癌','前列腺癌 / 泌尿系统肿瘤','妇科肿瘤','胃','乳腺','结直肠'];
export const placeholderImage = '/synthetic-pathology-slide.png';
export const librarySeedVersion = 1;

export function initialLibraryCases() {
  const groups=[0,0,0,1,1,1,2,2,3,3,4,5,6];
  return groups.map((group,index)=>({
    id:`library-demo-${String(index+1).padStart(2,'0')}`, owner:'demo-teacher',
    title:`${['骨与软组织','甲状腺','泌尿系统','妇科','胃','乳腺','结直肠'][group]}教学病例 ${String(index+1).padStart(2,'0')}`,
    organ:libraryCategories[group], library:index%2?'院方库':'标准库', difficulty:index%3?'基础':'进阶',
    history:'模拟病史：因局部病变就诊，送检组织供教学观察；既往治疗及免疫组化结果未提供。',
    clinical:{主诉:'局部病变待评估（模拟）',现病史:'发现病变后送检，具体病程未提供。',既往史:'未提供',检查结果:'未提供',送检信息:'教学组织图片，非真实患者资料'},
    source:'公开合成教学占位图片', authorized:true, studentVisible:true, simulated:true,
    reference:'流程参考：描述观察到的结构，区分已知信息与缺失信息，提出待确认的诊断及辅助检查思路。此为预设模拟内容，不是医学标准答案。',
    images:[placeholderImage], imageIds:[`demo-image-${String(index+1).padStart(2,'0')}`], version:1,
    updatedAt:'2026-09-09T00:00:00.000Z'
  }));
}

// ponytail: one browser store for the prototype; move persistence to the server only for cross-device use.
export function readLibraryStore(storage) {
  const raw=storage.getItem(teachingKey);
  const data=raw?JSON.parse(raw):{cases:[],drafts:[],exams:[]};
  if(!data || !['cases','drafts','exams'].every(key=>Array.isArray(data[key])))throw Error('教学数据格式不正确；原数据未覆盖');
  if(data.librarySeedVersion===librarySeedVersion)return data;
  const ids=new Set(data.cases.map(item=>item.id));
  const next={...data,cases:[...data.cases,...initialLibraryCases().filter(item=>!ids.has(item.id))],librarySeedVersion};
  storage.setItem(teachingKey,JSON.stringify(next));
  return next;
}

export function visibleLibraryCases(cases,user) {
  const teacher=user.roles.includes('teacher');
  return cases.filter(c=>teacher?(c.owner===user.id || (c.simulated&&c.authorized)):c.authorized&&c.studentVisible===true)
    .map(c=>teacher?c:({id:c.id,title:c.title,organ:c.organ,library:c.library,difficulty:c.difficulty,history:c.history,
      clinical:c.clinical,source:c.source,images:c.images,imageIds:c.imageIds,version:c.version,simulated:c.simulated,updatedAt:c.updatedAt}));
}

/** @param {any[]} cases @param {{query?:string,category?:string,source?:string,favorites?:string[]|null}} filters */
export function filterLibraryCases(cases,{query='',category='',source='',favorites=null}={}) {
  const text=query.trim().toLocaleLowerCase();
  return cases.filter(c=>(!category||c.organ===category)&&(!source||c.library===source)&&(!favorites||favorites.includes(c.id))&&
    (!text||`${c.id} ${c.title} ${c.organ||''}`.toLocaleLowerCase().includes(text)));
}
