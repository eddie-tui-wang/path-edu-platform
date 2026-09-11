import {getDatabase} from './database.mjs';
import {AccountError,login,logout,currentUser,publicUser,changePassword,adminRead,adminWrite} from './accounts.mjs';
export function cookieName() { return process.env.NODE_ENV==='production'?'__Host-path_edu_session':'path_edu_session'; }
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
function response(data, status=200, cookie) { return new Response(JSON.stringify(data),{status,headers:{...headers,...(cookie?{'Set-Cookie':cookie}:{})}}); }
function sessionCookie(token, age) { return `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.NODE_ENV==='production'?'; Secure':''}`; }
async function body(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new AccountError(415,'请求必须使用 JSON');
  const reader=request.body?.getReader();
  let size=0, value=''; const decoder=new TextDecoder();
  if(reader) while(true) {
    const {done,value:chunk}=await reader.read(); if(done) break;
    size+=chunk.length;
    if(size>16384) {await reader.cancel(); throw new AccountError(413,'请求过大');}
    value+=decoder.decode(chunk,{stream:true});
  }
  try {const data=JSON.parse(value+decoder.decode()); if(!data || typeof data!=='object' || Array.isArray(data)) throw 0; return data;}
  catch {throw new AccountError(400,'请求内容不正确');}
}
export async function handleAccountRequest(request, providedDatabase) {
  const action=new URL(request.url).pathname.replace(/^\/api\/accounts\//,'');
  const token=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName()+'='))?.slice(cookieName().length+1);
  try {
    if(!['GET','POST'].includes(request.method)) throw new AccountError(405,'不支持的请求方式');
    if(request.method==='POST') {
      if(process.env.NODE_ENV==='production' && !process.env.APP_ORIGIN) throw new Error('APP_ORIGIN missing');
      const expected=process.env.APP_ORIGIN || new URL(request.url).origin;
      if(request.headers.get('origin')!==expected) throw new AccountError(403,'请求来源不匹配，请从本站重新操作');
    }
    const input=request.method==='POST'?await body(request):null;
    const db=providedDatabase || await getDatabase();
    if(action==='login' && input) {
      const result=await login(db,input);
      if(result.error) return response({error:result.error},result.status);
      return response({user:result.user},200,sessionCookie(result.token,8*60*60));
    }
    if(action==='logout' && input) {await logout(db,token); return response({ok:true},200,sessionCookie('',0));}
    if(action==='me' && request.method==='GET') {
      const user=await currentUser(db,token,true);
      const grants=user.must_change_password?[]:(await db.query('SELECT resource_type,resource_id,permission,purpose FROM resource_grants WHERE user_id=$1',[user.id])).rows;
      return response({user:publicUser(user),grants});
    }
    if(action==='password' && input) return response(await changePassword(db,token,input),200,sessionCookie('',0));
    if(['users','grants','audit'].includes(action) && request.method==='GET') return response({items:await adminRead(db,token,action)});
    if(action==='users' && input) return response(await adminWrite(db,token,input));
    throw new AccountError(404,'接口不存在');
  } catch(error) {
    if(error instanceof AccountError) return response({error:error.message},error.status,error.status===401?sessionCookie('',0):undefined);
    if(error?.code==='23505') return response({error:'账号或授权已存在'},409);
    // Do not expose SQL, connection strings, cookies or passwords in logs/responses.
    console.error('Account service unavailable');
    return response({error:'账号服务暂不可用，请联系管理员检查数据库连接与初始化状态'},503);
  }
}
