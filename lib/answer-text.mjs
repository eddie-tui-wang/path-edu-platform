export function formatAnswer(value,start,end,kind,maxLength=20000){
 const selected=value.slice(start,end);
 const inserted=kind==='bold'?'**'+selected+'**':selected.split('\n').map(line=>'- '+line).join('\n');
 const next=value.slice(0,start)+inserted+value.slice(end);
 if(next.length>maxLength)throw Error('内容超过'+maxLength+'字，请缩短后再操作');
 return next;
}
