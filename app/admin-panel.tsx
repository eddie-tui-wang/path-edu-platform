"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {accountApi,roleLabels,type Account} from './account-client';
type Grant={id:string;user_id:string;resource_type:string;resource_id:string;permission:string;purpose:string};
type Audit={id:string;actor_id:string;target_id:string;action:string;created_at:string};
const resourceLabels:Record<string,string>={case:'病例',exam:'考试',standard_library:'标准库',teacher_profile:'教师画像',student_profile:'学生画像'};
export default function AdminPanel({self}:{self:Account}) {
  const [users,setUsers]=useState<Account[]>([]),[grants,setGrants]=useState<Grant[]>([]),[audit,setAudit]=useState<Audit[]>([]);
  const [selected,setSelected]=useState<Account|null>(null),[query,setQuery]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [tab,setTab]=useState('users');
  async function refresh() {
    const [u,g,a]=await Promise.all(['users','grants','audit'].map(path=>accountApi(path)));
    setUsers(u.items);setGrants(g.items);setAudit(a.items);setLoaded(true);
  }
  useEffect(()=>{void refresh().catch(error=>setError(error.message));},[]);
  async function mutate(data:Record<string,unknown>) {
    setBusy(true);setError('');setNotice('');
    try {await accountApi('users',data);setSelected(null);await refresh();setNotice('已保存。受影响账号的旧登录已失效（新建账号除外）。');return true;}
    catch(error){setError((error as Error).message);return false;}finally{setBusy(false);}
  }
  async function submit(event:FormEvent<HTMLFormElement>, action:string, userId?:string) {
    event.preventDefault(); const form=event.currentTarget, data=new FormData(form);
    const payload:Record<string,unknown>={...Object.fromEntries(data),action,...(userId?{userId}:{})};
    if(action==='create'||action==='update') payload.roles=data.getAll('roles');
    if(action==='update') payload.active=data.get('active')==='true';
    if(await mutate(payload)) form.reset();
  }
  const visible=users.filter(u=>`${u.username} ${u.displayName}`.toLowerCase().includes(query.toLowerCase()));
  const name=(id:string)=>users.find(u=>u.id===id)?.displayName || id || '系统';
  return <section className="account-admin"><header><h1>机构管理后台</h1><p>管理账号、资源授权与审计；管理员身份不自动获得病例正文、答卷或画像内容。</p></header>
    <nav className="account-tabs" aria-label="管理功能">{[['users','账号管理'],['grants','资源授权'],['audit','操作审计']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}<button onClick={()=>void refresh().catch(e=>setError(e.message))}>刷新</button></nav>
    {error && <p role="alert" className="account-error">{error}</p>}{notice && <p role="status">{notice}</p>}{!loaded && !error && <p>正在读取数据库…</p>}
    {tab==='users' && <div className="account-columns"><div className="account-card"><label>搜索账号／姓名<input value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="account-table"><table><thead><tr><th>账号／姓名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>{visible.map(u=><tr key={u.id}><td>{u.displayName}<small>{u.username}{u.id===self.id?' · 当前账号':''}</small></td><td>{u.roles.map(r=>roleLabels[r]).join('、')}</td><td>{u.active?'启用':'停用'}{u.mustChangePassword?' · 待改密':''}</td><td><button onClick={()=>setSelected(u)}>管理</button></td></tr>)}</tbody></table></div>{loaded&&!visible.length&&<p>没有匹配账号。</p>}</div>
    <div className="account-card">{selected?<><h2>管理：{selected.displayName}</h2><form key={selected.id} onSubmit={e=>submit(e,'update',selected.id)}><label>姓名<input name="displayName" defaultValue={selected.displayName} required maxLength={60}/></label><Roles initial={selected.roles}/><label>状态<select name="active" defaultValue={String(selected.active)}><option value="true">启用</option><option value="false">停用</option></select></label><p>保存角色或状态会使该账号所有设备的旧登录失效。</p><button disabled={busy}>保存账号</button><button type="button" onClick={()=>setSelected(null)}>取消</button></form><hr/><form onSubmit={e=>submit(e,'reset',selected.id)}><h3>重置密码</h3><label>新的临时密码<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><p>请通过安全渠道交给本人；首次登录必须再次改密。</p><button disabled={busy}>重置并撤销旧登录</button></form></>:<form onSubmit={e=>submit(e,'create')}><h2>新建账号</h2><label>账号<input name="username" required pattern="[a-zA-Z0-9][a-zA-Z0-9_.@\-]{2,63}" maxLength={64}/></label><label>姓名<input name="displayName" required maxLength={60}/></label><Roles initial={['student']}/><label>初始密码<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><small>12–128 位，须有字母和数字。账号机构由当前登录确定。</small><button className="account-primary" disabled={busy}>创建账号</button></form>}</div></div>}
    {tab==='grants' && <div className="account-columns"><form className="account-card" onSubmit={e=>submit(e,'grant')}><h2>按资源单独授权</h2><label>账号<select name="userId" required><option value="">请选择</option>{users.map(u=><option key={u.id} value={u.id}>{u.displayName}（{u.username}）</option>)}</select></label><label>资源类型<select name="resourceType">{Object.entries(resourceLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>资源编号<input name="resourceId" required maxLength={100}/></label><small>画像填写本机构对应用户 ID。病例／考试后端尚未接入，编号授权只保存权限记录，不代表已开放真实内容；不支持 *。</small><label>权限<select name="permission"><option value="read">查看</option><option value="manage">管理（含查看）</option></select></label><label>用途说明<input name="purpose" required maxLength={200}/></label><button disabled={busy}>保存授权并撤销旧登录</button><details><summary>账号 ID 对照</summary>{users.map(u=><p key={u.id}>{u.displayName}：<code>{u.id}</code></p>)}</details></form><div className="account-card"><h2>现有授权</h2>{grants.length?grants.map(g=><article className="account-grant" key={g.id}><b>{name(g.user_id)} · {resourceLabels[g.resource_type]} · {g.permission==='manage'?'管理':'查看'}</b><p>{g.resource_id}</p><p>{g.purpose}</p><button disabled={busy} onClick={()=>{if(window.confirm('确认撤销此授权？该账号旧登录会立即失效。')) void mutate({action:'revoke',userId:g.user_id,grantId:g.id});}}>撤销</button></article>):<p>暂无授权。新建账号不会自动获得教学资源权限。</p>}</div></div>}
    {tab==='audit' && <div className="account-card account-table"><h2>最近 100 条操作记录</h2><p>仅显示账号与授权元数据，不展示密码、登录凭证或教学正文。</p><table><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th></tr></thead><tbody>{audit.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString('zh-CN')}</td><td>{name(a.actor_id)}</td><td>{a.action}</td><td>{name(a.target_id)}</td></tr>)}</tbody></table></div>}
  </section>;
}
function Roles({initial}:{initial:string[]}) {return <fieldset><legend>角色（可组合）</legend>{Object.entries(roleLabels).map(([id,label])=><label className="account-check" key={id}><input type="checkbox" name="roles" value={id} defaultChecked={initial.includes(id)}/>{label}</label>)}</fieldset>;}
