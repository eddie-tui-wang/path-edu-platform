"use client";
import {useEffect,useState,useRef,type FormEvent} from 'react';
import {Button} from './ui-button';
import TeachingPlatform from './teaching-platform';
import {type Account,roleLabels} from './account-client';
import {demoKey,initialDemoAccounts,demoLogin,validateDemoAccount} from '../lib/demo-accounts.mjs';

type DemoAccount=Account & {password:string};
type Store={users:DemoAccount[];log:string[]};
export default function DemoApp() {
  const createDialog=useRef<HTMLDialogElement>(null);
  const [query,setQuery]=useState(''),[roleFilter,setRoleFilter]=useState('');
  const [store,setStore]=useState<Store>({users:initialDemoAccounts(),log:[]});
  const [user,setUser]=useState<DemoAccount|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[changing,setChanging]=useState(false);
  useEffect(()=>{
    try {
      const raw=localStorage.getItem(demoKey);
      if(raw) {
        const saved=JSON.parse(raw);
        if(!Array.isArray(saved.users)||!Array.isArray(saved.log)) throw new Error();
        saved.users.forEach((u:DemoAccount)=>validateDemoAccount(u,saved.users));
        setStore(saved);
      }
    } catch {setError('本地演示数据无法读取。请检查浏览器存储权限；如数据损坏，可使用“恢复初始演示账号”。不会覆盖原数据。');}
    setReady(true);
  },[]);
  function save(users:DemoAccount[],action:string) {
    const next={users,log:[new Date().toLocaleString('zh-CN')+' '+action,...store.log].slice(0,100)};
    try {localStorage.setItem(demoKey,JSON.stringify(next));setStore(next);setError('');return true;}
    catch {setError('浏览器存储失败，修改未保存。请检查存储权限或剩余空间。');return false;}
  }
  function login(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data=new FormData(e.currentTarget);
    try {setUser(demoLogin(store.users,String(data.get('username')),String(data.get('password'))));setError('');}
    catch(e){setError((e as Error).message);}
  }
  const reset=<Button variant="danger" onClick={()=>{if(confirm('仅恢复本浏览器的演示账号与操作记录。新增演示账号和修改将被清除，真实账号和考试草稿不受影响。')){if(save(initialDemoAccounts(),'恢复初始演示账号')){setUser(null);setChanging(false);}}}}>恢复初始演示账号</Button>;
  if(!ready)return <main className="account-login">正在加载本地演示…</main>;
  if(!user)return <main className="account-login"><form className="account-card" onSubmit={login}>
    <img className="hospital-logo" src="/上海市第六人民医院.webp" alt="上海市第六人民医院院徽" width={88} height={88}/>
    <h1>病理教学 · 演示登录</h1><p>无需数据库。以下为公开演示身份，不是真实安全账号。请勿使用个人密码或患者资料。</p>
    <label>演示账号<input name="username" required autoComplete="off"/></label><label>演示密码<input name="password" type="password" required autoComplete="off"/></label>
    {error&&<p role="alert">{error}</p>}<button className="account-primary">进入演示</button>
    <details open><summary>初始演示账号（修改后以本浏览器保存为准）</summary>{initialDemoAccounts().map(u=><p key={u.id}>{u.displayName}：<code>{u.username}</code><br/>密码：<code>{u.password}</code></p>)}</details>
    {reset}<a href="/account">真实账号验证入口（需要后端数据库）</a>
  </form></main>;
  if(changing)return <main className="account-login"><form className="account-card" onSubmit={e=>{
    e.preventDefault();const d=new FormData(e.currentTarget);
    try {
      if(d.get('current')!==user.password)throw new Error('当前演示密码不正确');
      if(d.get('password')!==d.get('confirm'))throw new Error('两次新密码不一致');
      const next={...user,password:String(d.get('password'))};validateDemoAccount(next,store.users);
      if(save(store.users.map(u=>u.id===user.id?next:u),'修改演示密码：'+user.username)){setUser(null);setChanging(false);}
    }catch(e){setError((e as Error).message);}
  }}><h1>修改本地演示密码</h1><p>密码以演示数据形式保存在浏览器中，不能用于保护真实信息。</p><label>当前演示密码<input name="current" type="password" required/></label><label>新演示密码<input name="password" type="password" required minLength={12}/></label><label>确认新密码<input name="confirm" type="password" required/></label>{error&&<p role="alert">{error}</p>}<button>保存并重新登录</button><button type="button" onClick={()=>{setChanging(false);setError('');}}>返回</button></form></main>;
  const admin=<section className="account-admin"><header className="demo-admin-heading"><div><h1>账号管理</h1><span className="library-tag">演示账号</span></div><Button variant="primary" onClick={()=>{setError('');createDialog.current?.showModal();}}>新增账号</Button></header><div className="demo-admin-tools"><input aria-label="搜索账号或姓名" placeholder="搜索账号或姓名" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="筛选角色" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">全部角色</option>{Object.entries(roleLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>{error&&<p role="alert">{error}</p>}
    <div className="account-card account-table"><table><thead><tr><th>姓名／账号</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>{store.users.filter(u=>(!query||`${u.username} ${u.displayName}`.includes(query))&&(!roleFilter||u.roles.includes(roleFilter))).map(u=><tr key={u.id}><td>{u.displayName}<small>{u.username}{u.id===user.id?' · 当前账号':''}</small></td><td><select aria-label={u.username+'角色'} value={u.roles[0]} disabled={u.id===user.id} onChange={e=>save(store.users.map(v=>v.id===u.id?{...v,roles:[e.target.value]}:v),'调整角色：'+u.username)}>{Object.entries(roleLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></td><td>{u.active?'启用':'停用'}</td><td><button disabled={u.id===user.id} onClick={()=>save(store.users.map(v=>v.id===u.id?{...v,active:!v.active}:v),'切换状态：'+u.username)}>{u.active?'停用':'启用'}</button><button onClick={()=>{const password=prompt('设置新的公开演示密码（至少 12 位，含字母与数字；勿用真实密码）');if(password===null)return;try{const next={...u,password};validateDemoAccount(next,store.users);if(save(store.users.map(v=>v.id===u.id?next:v),'重置演示密码：'+u.username)&&u.id===user.id)setUser(null);}catch(e){setError((e as Error).message);}}}>重置密码</button></td></tr>)}</tbody></table></div>
    <dialog className="demo-admin-dialog" ref={createDialog}><form className="account-card" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,d=new FormData(form);const next:DemoAccount={id:crypto.randomUUID(),username:String(d.get('username')).trim().toLowerCase(),displayName:String(d.get('displayName')).trim(),password:String(d.get('password')),roles:[String(d.get('role'))],active:true,mustChangePassword:false,institutionId:'demo'};try{validateDemoAccount(next,store.users);if(save([...store.users,next],'创建演示账号：'+next.username)){form.reset();createDialog.current?.close();}}catch(e){setError((e as Error).message);}}}>
      <h2>新增账号</h2>{error&&<p role="alert" className="account-error">{error}</p>}<label>账号<input name="username" required maxLength={64}/></label><label>姓名<input name="displayName" required maxLength={60}/></label><label>角色<select name="role">{Object.entries(roleLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>演示密码<input name="password" type="password" required minLength={12} maxLength={128}/></label><Button type="submit" variant="primary">创建演示账号</Button><Button onClick={()=>createDialog.current?.close()}>取消</Button>
    </form></dialog><details className="account-card"><summary>本地演示操作记录（可修改，不是安全审计）</summary>{store.log.length?store.log.map((l,i)=><p key={i}>{l}</p>):<p>暂无操作</p>}</details><details className="account-card demo-admin-settings"><summary>演示设置</summary><p>恢复仅影响演示账号，不清理病例、试卷或作答。</p>{reset}</details></section>;
  return <TeachingPlatform key={user.id} user={user} onLogout={()=>{setUser(null);setError('');}} onPassword={()=>{setChanging(true);setError('');}} demoAdmin={admin}/>;
}
