export function readReaderState(storage,key,images){
 const fallback={index:0,zoom:1,offset:{x:0,y:0}};
 const raw=storage.getItem(key);if(!raw)return fallback;
 const d=JSON.parse(raw);
 if(!d||d.images!==JSON.stringify(images))return fallback;
 if(!Number.isInteger(d.index)||d.index<0||d.index>=images.length||!Number.isFinite(d.zoom)||d.zoom<.5||d.zoom>4||!Number.isFinite(d.offset?.x)||!Number.isFinite(d.offset?.y))throw Error('视野记录无效，已恢复默认视野');
 return {index:d.index,zoom:d.zoom,offset:d.offset};
}
