"use client";
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {Account} from './account-client';
import PublishingWorkspace from './publishing-workspace';
import {CaseViewer} from './case-viewer';
import {Button} from './ui-button';
import {SearchSelect} from './ui-search-select';
import {libraryCategories,readLibraryStore,visibleLibraryCases,filterLibraryCases} from '../lib/library.mjs';
import {teachingKey} from '../lib/exam-drafts.mjs';
import {readReaderState} from '../lib/reader-state.mjs';

type LibraryCase={id:string;owner?:string;title:string;organ?:string;library:string;difficulty?:string;history:string;clinical?:Record<string,string>;source:string;reference?:string;images:string[];version:number;simulated?:boolean;updatedAt?:string};
const pageSize=8;
export default function LibraryWorkspace({user,onCreateQuestion}:{user:Account;onCreateQuestion?:(id:string)=>void}) {
  const teacher=user.roles.includes('teacher');
  const prefsKey=`path-edu-library-view-${user.id}`;
  const favoritesKey=`path-edu-library-favorites-${user.id}`;
  const [cases,setCases]=useState<LibraryCase[]>([]),[error,setError]=useState(''),[ready,setReady]=useState(false);
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[source,setSource]=useState(''),[view,setView]=useState('grid'),[onlyFavorites,setOnlyFavorites]=useState(false),[page,setPage]=useState(1);
  const [favorites,setFavorites]=useState<string[]>([]),[selected,setSelected]=useState(''),[editing,setEditing]=useState<string|null>(null);
  const heading=useRef<HTMLHeadingElement>(null),scrollPosition=useRef(0);
  function refresh(){try{const store=readLibraryStore(localStorage);setCases(visibleLibraryCases(store.cases,user));setError('');setReady(true);}catch(e){setError((e as Error).message);}}
  useEffect(()=>{
    refresh();
    try{
      const f=JSON.parse(localStorage.getItem(favoritesKey)||'[]');if(!Array.isArray(f)||f.some(id=>typeof id!=='string'))throw Error('收藏格式不正确');setFavorites(f);
      const p=JSON.parse(sessionStorage.getItem(prefsKey)||'{}');setQuery(p.query||'');setCategory(p.category||'');setSource(p.source||'');setView(p.view==='list'?'list':'grid');setOnlyFavorites(Boolean(p.onlyFavorites));setPage(Math.max(1,Number(p.page)||1));
      const url=new URLSearchParams(location.hash.slice(1));setSelected(url.get('libraryCase')||'');
    }catch{setError('收藏或筛选读取失败，原数据未覆盖。');}
    const update=(e:StorageEvent)=>{if(e.key===teachingKey)refresh();if(e.key===favoritesKey){try{const f=JSON.parse(e.newValue||'[]');if(Array.isArray(f))setFavorites(f);}catch{setError('收藏读取失败');}}};
    const pop=()=>{setEditing(null);setSelected(new URLSearchParams(location.hash.slice(1)).get('libraryCase')||'');};
    window.addEventListener('storage',update);window.addEventListener('popstate',pop);
    return()=>{window.removeEventListener('storage',update);window.removeEventListener('popstate',pop);};
  },[user.id]);
  useEffect(()=>{if(ready)try{sessionStorage.setItem(prefsKey,JSON.stringify({query,category,source,view,onlyFavorites,page}));}catch{setError('筛选状态暂存失败，病例数据未改变。');}},[ready,query,category,source,view,onlyFavorites,page]);
  function show(id:string){const params=new URLSearchParams(location.hash.slice(1));params.delete('panel');if(id)params.set('libraryCase',id);else params.delete('libraryCase');history.pushState(null,'','#'+params.toString());window.dispatchEvent(new Event('edu-route-written'));setSelected(id);requestAnimationFrame(()=>{heading.current?.focus();if(!id)window.scrollTo(0,scrollPosition.current);});}
  function favorite(id:string){try{const current=JSON.parse(localStorage.getItem(favoritesKey)||'[]');if(!Array.isArray(current))throw Error('收藏数据损坏');const next=current.includes(id)?current.filter((v:string)=>v!==id):[...current,id];localStorage.setItem(favoritesKey,JSON.stringify(next));setFavorites(next);setError('');}catch{setError('收藏未保存，请检查浏览器存储。');}}
  const item=cases.find(c=>c.id===selected);
  const allCategories=[...libraryCategories,...new Set(cases.map(c=>c.organ).filter((c):c is string=>typeof c==='string'&&c.length>0&&!libraryCategories.includes(c)))];
  const results=filterLibraryCases(cases,{query,category,source,favorites:onlyFavorites?favorites:null}) as LibraryCase[];
  const pages=Math.max(1,Math.ceil(results.length/pageSize)),currentPage=Math.min(page,pages),shown=results.slice((currentPage-1)*pageSize,currentPage*pageSize);
  if(editing)return <PublishingWorkspace user={user} initialTab="cases" editCaseId={editing} onFinish={()=>{setEditing(null);refresh();}}/>;
  return <section className="library-workspace">
    <header className="library-header"><div><h1 ref={heading} tabIndex={-1}>{selected?(item?.title||'病例不可用'):'切片图书馆'}</h1><p>{selected?'临床资料与图片':'检索、收藏并查看开放的教学病例'}</p></div><div className="library-header-actions">{!selected&&<><nav className="library-tabs" aria-label="资料范围"><Button aria-pressed={!onlyFavorites} onClick={()=>{setOnlyFavorites(false);setPage(1);}}>全部切片</Button><Button aria-pressed={onlyFavorites} onClick={()=>{setOnlyFavorites(true);setPage(1);}}>我的收藏（{cases.filter(c=>favorites.includes(c.id)).length}）</Button></nav>{teacher&&<Button variant="primary" onClick={()=>setEditing('new')}>新增病例</Button>}</>}</div></header>
    {error&&<p role="alert" className="account-error">{error}</p>}
    {!ready&&!error&&<p role="status">正在加载资料…</p>}
    {selected?(item?<>
      <CaseViewer key={item.id+':'+item.version} item={item} onBack={()=>show('')} favorited={favorites.includes(item.id)} onFavorite={()=>favorite(item.id)} canEdit={teacher&&item.owner===user.id} onEdit={()=>setEditing(item.id)}>
        {teacher&&<details className="library-reference"><summary>教师参考资料</summary><p className="pre-wrap">{item.reference||'尚未填写参考资料'}</p>{onCreateQuestion&&<Button variant="primary" onClick={()=>onCreateQuestion(item.id)}>用于出题</Button>}</details>}
      </CaseViewer>
    </>:<div className="account-card"><p>此病例不存在或未向当前账号开放。</p><Button onClick={()=>show('')}>返回列表</Button></div>):<>
      <div className="library-toolbar"><label>搜索病例<input placeholder="病例名称、编号或部位" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><SearchSelect label="部位" value={category} options={allCategories} onChange={value=>{setCategory(value);setPage(1);}}/><label>数据库来源<select value={source} onChange={e=>{setSource(e.target.value);setPage(1);}}><option value="">全部来源</option><option>标准库</option><option>院方库</option></select></label><div className="library-toolbar-slot"><span aria-hidden="true">&nbsp;</span><Button onClick={()=>{setQuery('');setCategory('');setSource('');setPage(1);}}>清空筛选</Button></div></div>
      <div className="library-result-tools"><span role="status">{results.length} 个病例{category?` · ${category}`:''}</span><div className="library-view-toggle"><Button aria-pressed={view==='grid'} onClick={()=>setView('grid')}>卡片</Button><Button aria-pressed={view==='list'} onClick={()=>setView('list')}>列表</Button></div></div>
      <div className={view==='grid'?'library-grid':'library-list'}>{shown.map(c=><article className="library-card" key={c.id}><button className="library-cover" aria-label={'查看病例 '+c.title} onClick={()=>{scrollPosition.current=window.scrollY;show(c.id);}}><img src={c.images[0]} alt={c.title+'预览'}/>{c.simulated&&<span>模拟素材</span>}</button><div className="library-card-body"><div className="library-tags"><span>{c.library}</span><span>{c.difficulty||'未分级'}</span></div><h2>{c.title}</h2><p>{c.organ||'未分类'}</p><small>{c.id} · {c.images.length} 张图片 · v{c.version}</small><footer><Button onClick={()=>{scrollPosition.current=window.scrollY;show(c.id);}}>查看病例</Button><Button aria-label={(favorites.includes(c.id)?'取消收藏 ':'收藏 ')+c.title} aria-pressed={favorites.includes(c.id)} onClick={()=>favorite(c.id)}>{favorites.includes(c.id)?'★ 已收藏':'☆ 收藏'}</Button></footer></div></article>)}</div>
      {!results.length&&ready&&<div className="account-card"><h2>暂无匹配病例</h2><p>调整筛选条件，或查看全部切片。</p></div>}
      <footer className="library-pagination"><span>共 {results.length} 个病例 · 第 {currentPage} / {pages} 页</span><Button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一页</Button><Button disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>下一页</Button></footer>
    </>}
  </section>;
}

export function ImageReader({images,stateKey,toolbar}:{images:string[];stateKey?:string;toolbar?:ReactNode}) {
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(1),[offset,setOffset]=useState({x:0,y:0}),[failed,setFailed]=useState(false);
  const [loadedKey,setLoadedKey]=useState<string|undefined>(undefined),[viewError,setViewError]=useState('');
  const imageSignature=JSON.stringify(images);
  useEffect(()=>{if(!stateKey)return;try{const saved=readReaderState(sessionStorage,stateKey,images);setIndex(saved.index);setZoom(saved.zoom);setOffset(saved.offset);setViewError('');setLoadedKey(stateKey+imageSignature);}catch(e){setViewError((e as Error).message);setLoadedKey(undefined);}},[stateKey,imageSignature]);
  useEffect(()=>{if(!stateKey||loadedKey!==stateKey+imageSignature)return;try{sessionStorage.setItem(stateKey,JSON.stringify({images:imageSignature,index,zoom,offset}));setViewError('');}catch{setViewError('视野未保存，答卷内容不受影响');}},[stateKey,loadedKey,imageSignature,index,zoom,offset]);
  const dragging=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const reset=()=>{setZoom(1);setOffset({x:0,y:0});};
  return <section className="account-card library-reader">{viewError&&<p role="status">{viewError}</p>}<header><h2>图片阅览</h2><span>{index+1} / {images.length}</span>{toolbar&&<div className="library-reader-tools">{toolbar}</div>}</header><div className="library-thumbnails">{images.map((src,i)=><button aria-label={'查看图片 '+(i+1)} aria-pressed={index===i} key={i} onClick={()=>{setIndex(i);setFailed(false);reset();}}><img src={src} alt={'图片 '+(i+1)}/></button>)}</div>
    <div className="library-viewport" tabIndex={0} aria-label="图片阅览区域，可拖拽或方向键平移" onKeyDown={e=>{const delta:Record<string,[number,number]>={ArrowLeft:[30,0],ArrowRight:[-30,0],ArrowUp:[0,30],ArrowDown:[0,-30]};if(delta[e.key]){e.preventDefault();setOffset(v=>({x:v.x+delta[e.key][0],y:v.y+delta[e.key][1]}));}}} onPointerDown={e=>{dragging.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const d=dragging.current;if(d)setOffset({x:d.ox+e.clientX-d.x,y:d.oy+e.clientY-d.y});}} onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}}>
      {failed?<p role="alert">图片无法加载，请选择其他图片。</p>:<img src={images[index]} alt={'病例图片 '+(index+1)} draggable={false} style={{transform:`translate(${offset.x}px,${offset.y}px) scale(${zoom})`}} onError={()=>setFailed(true)}/>}
    </div><footer><Button aria-label="缩小图片" disabled={zoom<=.5} onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>−</Button><span>{Math.round(zoom*100)}%</span><Button aria-label="放大图片" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+.25))}>＋</Button><Button onClick={reset}>复位视野</Button></footer>
  </section>;
}
