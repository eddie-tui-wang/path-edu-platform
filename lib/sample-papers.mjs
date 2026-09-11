import {seedQuestions} from './practice.mjs';
import {buildBankPaper} from './bank-paper.mjs';
import {readLibraryStore} from './library.mjs';
import {teachingKey} from './exam-drafts.mjs';

// Ready-made papers for demos. Fixed ids mean re-seeding never duplicates or overwrites a
// teacher's own papers; the papers themselves are built by buildBankPaper, so they pass the
// exact same ten-image and paper-type validation as anything a teacher creates by hand.
export const samplePaperIds=['sample-paper-choice-v1','sample-paper-short-v1','sample-paper-mixed-v1'];

const demoTeacher={id:'demo-teacher',displayName:'演示教师',roles:['teacher']};
const demoStudents=[{id:'demo-student',active:true,roles:['student']}];
const pad=n=>String(n).padStart(2,'0');
const localInput=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
const pick=ids=>ids.map(id=>({id,revision:1,points:10}));
const singleIds=count=>['DEMO-PRACTICE-001',...Array.from({length:9},(_,i)=>'DEMO-SINGLE-'+String(i+2).padStart(3,'0'))].slice(0,count);
const shortIds=(from,to)=>Array.from({length:to-from+1},(_,i)=>'DEMO-SHORT-'+String(from+i).padStart(3,'0'));

const specs=[
 {id:samplePaperIds[0],title:'示例卷 · 全单选十片',type:'choice',selections:pick(singleIds(10))},
 {id:samplePaperIds[1],title:'示例卷 · 全简答十片',type:'short',selections:pick(shortIds(1,10))},
 // Five singles plus five shorts over disjoint cases keeps the ten-distinct-image rule satisfied.
 {id:samplePaperIds[2],title:'示例卷 · 混合十片',type:'mixed',selections:[...pick(singleIds(5)),...pick(shortIds(6,10))]},
];

/** Adds the demo papers if they are missing. Never modifies existing exams. @returns {any[]} */
export function seedSamplePapers(storage) {
  const bank=seedQuestions(storage);
  const data=readLibraryStore(storage);
  const existing=new Set(data.exams.map(e=>e.id));
  const now=new Date();
  // ponytail: the window is fixed at first seed; ten years keeps the samples open for demos.
  const opensAt=localInput(now);
  const closesAt=localInput(new Date(now.getFullYear()+10,now.getMonth(),now.getDate(),now.getHours(),now.getMinutes()));
  const added=[];
  for(const spec of specs) {
    if(existing.has(spec.id))continue;
    try {
      added.push(buildBankPaper({id:spec.id,title:spec.title,type:spec.type,minutes:30,opensAt,closesAt,students:['demo-student'],selections:spec.selections},bank,demoStudents,demoTeacher,now.getTime()));
    } catch {
      // A teacher may have disabled or re-versioned a seeded question. A sample that can no
      // longer be built is skipped rather than breaking the page.
    }
  }
  if(added.length)storage.setItem(teachingKey,JSON.stringify({...data,exams:[...data.exams,...added]}));
  return added;
}
