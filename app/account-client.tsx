"use client";
import {useEffect,useState, type FormEvent} from 'react';
import TeachingPlatform from './teaching-platform';
export type Account = {id:string; username:string; displayName:string; institutionId:string; roles:string[]; active:boolean; mustChangePassword:boolean};
export const roleLabels:Record<string,string>={student:'学生',teacher:'教师',admin:'机构管理员'};
export async function accountApi(path:string, data?:unknown) {
  const result=await fetch(`/api/accounts/${path}`,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
    headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const value=await result.json();
  if(!result.ok) {
    if(result.status===401 && path!=='login') window.dispatchEvent(new Event('account-expired'));
    throw new Error(value.error || '请求未完成，请重试');
  }
  return value;
}
function clearDrafts() {
  for(const key of Object.keys(localStorage)) if(key.startsWith('path-edu-demo-v1-')) localStorage.removeItem(key);
}
export default function AccountApp() {
  const [user,setUser]=useState<Account|null>(null), [loading,setLoading]=useState(true), [message,setMessage]=useState(''), [changing,setChanging]=useState(false);
  useEffect(()=>{
    let alive=true;
    const refresh=async()=>{
      try {const data=await accountApi('me'); if(alive) {setUser(data.user);setMessage('');}}
      catch(error) {if(alive) {setUser(null);setMessage(error instanceof Error?error.message:'账号服务不可用');}}
      finally {if(alive)setLoading(false);}
    };
    const expire=()=>{clearDrafts();setUser(null);setChanging(false);setMessage('登录已失效，请重新登录');};
    void refresh();
    const timer=window.setInterval(()=>void refresh(),30000);
    window.addEventListener('focus',refresh);window.addEventListener('account-expired',expire);
    return ()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('account-expired',expire);};
  },[]);
  async function leave() {
    try {await accountApi('logout',{});clearDrafts();setUser(null);setChanging(false);setMessage('已退出登录');}
    catch(error) {setMessage((error as Error).message);}
  }
  if(loading) return <main className="account-login" role="status">正在验证账号…</main>;
  if(!user) return <Credentials title="登录病理教学平台" message={message} onSubmit={async data=>{
    const result=await accountApi('login',data);clearDrafts();setUser(result.user);setMessage('');
  }} />;
  if(user.mustChangePassword || changing) return <Credentials passwordChange title={user.mustChangePassword?'首次登录，请修改初始密码':'修改密码'} message="改密后所有设备上的旧登录将失效，请使用新密码重新登录。" onCancel={user.mustChangePassword?leave:()=>setChanging(false)} onSubmit={async data=>{
    await accountApi('password',data);clearDrafts();setUser(null);setChanging(false);setMessage('密码已更新，请使用新密码登录');
  }} />;
  return <><div aria-live="polite">{message && <p className="account-error">{message}</p>}</div><TeachingPlatform key={user.id} user={user} onLogout={leave} onPassword={()=>setChanging(true)} /></>;
}
function Credentials({title,message,passwordChange=false,onSubmit,onCancel}:{title:string;message:string;passwordChange?:boolean;onSubmit:(data:Record<string,string>)=>Promise<void>;onCancel?:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form)) as Record<string,string>;
    if(passwordChange && data.password!==data.confirm) {setError('两次输入的新密码不一致');return;}
    setBusy(true);setError('');try {await onSubmit(data);form.reset();}catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  return <main className="account-login"><form className="account-card" onSubmit={submit}><img className="hospital-logo" src="/上海市第六人民医院.webp" alt="上海市第六人民医院院徽" width={88} height={88}/><p className="account-eyebrow">上海市第六人民医院 · 病理教学</p><h1>{title}</h1><p>独立账号 · 由机构管理员创建，不开放自注册</p>{message && <p role="status">{message}</p>}
    {passwordChange?<label>当前／初始密码<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128}/></label>:<label>账号<input name="username" autoComplete="username" required minLength={3} maxLength={64}/></label>}
    <label>{passwordChange?'新密码':'密码'}<input type="password" name="password" autoComplete={passwordChange?'new-password':'current-password'} required minLength={passwordChange?12:1} maxLength={128}/></label>
    {passwordChange && <><small>至少 12 位，包含字母与数字。请勿使用其他网站的密码。</small><label>确认新密码<input type="password" name="confirm" autoComplete="new-password" required minLength={12} maxLength={128}/></label></>}
    {error && <p className="account-error" role="alert">{error}</p>}<button disabled={busy} className="account-primary">{busy?'正在处理…':passwordChange?'保存并重新登录':'登录'}</button>{onCancel && <button type="button" onClick={onCancel} disabled={busy}>返回／退出</button>}
    <small>忘记密码请联系机构管理员。当前教学内容仍为演示，勿上传患者资料。</small></form></main>;
}
