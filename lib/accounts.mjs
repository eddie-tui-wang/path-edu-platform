import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export class AccountError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new AccountError(status, message); };
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const roleNames = ['student','teacher','admin'];
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) fail(400,'密码须为 12–128 位，并包含字母和数字');
}
export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, {N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [,salt,hash] = stored.split('$');
  const key = await scrypt(password, salt, 64, {N:32768,r:8,p:1,maxmem:64*1024*1024});
  const expected = Buffer.from(hash,'hex');
  return expected.length === key.length && timingSafeEqual(expected,key);
}
const dummyHash = `scrypt$00000000000000000000000000000000$${'00'.repeat(64)}`;
function text(value, name, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400,`${name}格式不正确`);
  return value.trim();
}
function username(value) {
  const name = text(value,'账号',64).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.@-]{2,63}$/.test(name)) fail(400,'账号需为 3–64 位英文字母、数字或 _.@-');
  return name;
}
function roles(value) {
  if (!Array.isArray(value) || !value.length || value.some(r=>!roleNames.includes(r)) || new Set(value).size !== value.length) fail(400,'请选择有效角色');
  return value;
}
export function publicUser(user) {
  return {id:user.id, username:user.username, displayName:user.display_name, institutionId:user.institution_id,
    roles:user.roles, active:user.active, mustChangePassword:user.must_change_password};
}
async function audit(db, actor, action, target, detail = {}) {
  await db.query('INSERT INTO audit_events(id,institution_id,actor_id,target_id,action,detail) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(),actor.institution_id,actor.id,target,action,JSON.stringify(detail)]);
}
export async function currentUser(db, token, allowPasswordChange = false) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) fail(401,'请重新登录');
  const {rows} = await db.query(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND s.auth_version=u.auth_version AND u.active=true`,[tokenHash(token)]);
  if (!rows[0]) fail(401,'登录已失效，请重新登录');
  if (rows[0].must_change_password && !allowPasswordChange) fail(403,'请先修改初始密码');
  return rows[0];
}
export async function login(database, input) {
  const name = username(input.username);
  if (typeof input.password !== 'string' || input.password.length>128) fail(400,'密码格式不正确');
  return database.transaction(async db => {
    const key = tokenHash(name);
    await db.query('DELETE FROM login_limits WHERE window_start < now() - interval \'1 day\'');
    await db.query('INSERT INTO login_limits(key) VALUES($1) ON CONFLICT DO NOTHING',[key]);
    const {rows:[limit]} = await db.query('SELECT * FROM login_limits WHERE key=$1 FOR UPDATE',[key]);
    if (limit.blocked_until && new Date(limit.blocked_until).getTime()>Date.now()) return {error:'尝试次数过多，请 15 分钟后重试',status:429};
    const {rows:[user]} = await db.query('SELECT * FROM users WHERE username=$1 FOR UPDATE',[name]);
    const valid = await verifyPassword(input.password,user?.password_hash || dummyHash);
    if (!valid || !user?.active) {
      const failures = Date.now()-new Date(limit.window_start).getTime()>15*60*1000 ? 1 : limit.failures+1;
      await db.query(`UPDATE login_limits SET failures=$2, window_start=CASE WHEN $2=1 THEN now() ELSE window_start END,
        blocked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE key=$1`,[key,failures]);
      if(user) await audit(db,user,'login.failed',user.id);
      return {error:'账号或密码错误，或账号已停用',status:401};
    }
    await db.query('DELETE FROM login_limits WHERE key=$1',[key]);
    await db.query('DELETE FROM sessions WHERE expires_at<=now()');
    const token = randomBytes(32).toString('hex');
    await db.query(`INSERT INTO sessions(token_hash,user_id,auth_version,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')`,[tokenHash(token),user.id,user.auth_version]);
    await audit(db,user,'login.success',user.id);
    return {user:publicUser(user),token};
  });
}
export async function logout(database, token) {
  await database.transaction(async db => {
    try { const user = await currentUser(db,token,true); await audit(db,user,'logout',user.id); }
    catch(error) { if(!(error instanceof AccountError)) throw error; }
    if(token) await db.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);
  });
}
export async function changePassword(database, token, input) {
  validatePassword(input.password);
  return database.transaction(async db => {
    const user = await currentUser(db,token,true);
    await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
    // Re-read after acquiring the lock to avoid changing a just-reset account.
    const fresh = await currentUser(db,token,true);
    if(!await verifyPassword(input.currentPassword,fresh.password_hash)) fail(400,'当前密码不正确');
    if(await verifyPassword(input.password,fresh.password_hash)) fail(400,'新密码不能与原密码相同');
    await db.query('UPDATE users SET password_hash=$2,must_change_password=false,auth_version=auth_version+1 WHERE id=$1',[user.id,await hashPassword(input.password)]);
    await db.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);
    await audit(db,user,'password.changed',user.id);
    return {ok:true};
  });
}
export async function requireAdmin(db, token) {
  const user = await currentUser(db,token);
  if (!user.roles.includes('admin')) fail(403,'仅机构管理员可操作');
  return user;
}
export async function adminRead(database, token, section) {
  return database.transaction(async db => {
    const actor = await requireAdmin(db,token);
    if(section==='audit') return (await db.query('SELECT id,actor_id,target_id,action,detail,created_at FROM audit_events WHERE institution_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[actor.institution_id])).rows;
    if(section==='grants') return (await db.query('SELECT g.* FROM resource_grants g JOIN users u ON u.id=g.user_id WHERE u.institution_id=$1 ORDER BY g.created_at DESC',[actor.institution_id])).rows;
    return (await db.query('SELECT * FROM users WHERE institution_id=$1 ORDER BY created_at,id',[actor.institution_id])).rows.map(publicUser);
  });
}
export async function adminWrite(database, token, input) {
  return database.transaction(async db => {
    let actor = await requireAdmin(db,token);
    // Account changes serialize per institution, protecting the last active admin.
    await db.query('SELECT id FROM institutions WHERE id=$1 FOR UPDATE',[actor.institution_id]);
    actor = await requireAdmin(db,token);
    if(input.action==='create') {
      const name=username(input.username), displayName=text(input.displayName,'姓名',60), roleList=roles(input.roles);
      const hash=await hashPassword(input.password), id=randomUUID();
      if((await db.query('SELECT id FROM users WHERE username=$1',[name])).rows.length) fail(409,'账号已存在');
      await db.query('INSERT INTO users(id,institution_id,username,display_name,password_hash,roles) VALUES($1,$2,$3,$4,$5,$6)',[id,actor.institution_id,name,displayName,hash,JSON.stringify(roleList)]);
      await audit(db,actor,'account.created',id,{roles:roleList});
      return {ok:true};
    }
    const targetId=text(input.userId,'用户编号');
    const {rows:[target]}=await db.query('SELECT * FROM users WHERE id=$1 AND institution_id=$2 FOR UPDATE',[targetId,actor.institution_id]);
    if(!target) fail(404,'账号不存在或无权访问');
    if(input.action==='update') {
      const roleList=roles(input.roles);
      if(typeof input.active!=='boolean') fail(400,'账号状态不正确');
      if(target.id===actor.id && (!input.active || !roleList.includes('admin'))) fail(409,'不能停用自己或移除自己的管理员角色');
      if(target.active && target.roles.includes('admin') && (!input.active || !roleList.includes('admin'))) {
        const {rows}=await db.query(`SELECT id FROM users WHERE institution_id=$1 AND active=true AND roles @> '["admin"]'::jsonb`,[actor.institution_id]);
        if(rows.length<=1) fail(409,'必须保留至少一个有效管理员');
      }
      await db.query('UPDATE users SET display_name=$2,roles=$3,active=$4,auth_version=auth_version+1 WHERE id=$1',[target.id,text(input.displayName,'姓名',60),JSON.stringify(roleList),input.active]);
      await audit(db,actor,'account.updated',target.id,{roles:roleList,active:input.active});
    } else if(input.action==='reset') {
      await db.query('UPDATE users SET password_hash=$2,must_change_password=true,auth_version=auth_version+1 WHERE id=$1',[target.id,await hashPassword(input.password)]);
      await db.query('DELETE FROM login_limits WHERE key=$1',[tokenHash(target.username)]);
      await audit(db,actor,'password.reset',target.id);
    } else if(input.action==='grant') {
      const kind=text(input.resourceType,'资源类型'), resourceId=text(input.resourceId,'资源编号');
      if(!['case','exam','standard_library','teacher_profile','student_profile'].includes(kind) || !['read','manage'].includes(input.permission)) fail(400,'授权类型不正确');
      if(resourceId==='*') fail(400,'不允许通配符授权');
      if(['teacher_profile','student_profile'].includes(kind)) {
        const {rows:[owner]}=await db.query('SELECT roles FROM users WHERE id=$1 AND institution_id=$2',[resourceId,actor.institution_id]);
        if(!owner || !owner.roles.includes(kind==='teacher_profile'?'teacher':'student')) fail(400,'画像对象须为本机构对应角色账号');
      }
      if(target.roles.every(role=>role==='student') && (input.permission==='manage' || ['teacher_profile','student_profile'].includes(kind))) fail(400,'学生不能获得管理权限或他人画像授权');
      const purpose=text(input.purpose,'授权用途',200);
      await db.query('INSERT INTO resource_grants(id,user_id,resource_type,resource_id,permission,purpose) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [randomUUID(),target.id,kind,resourceId,input.permission,purpose]);
      await db.query('UPDATE users SET auth_version=auth_version+1 WHERE id=$1',[target.id]);
      await audit(db,actor,'grant.created',target.id,{resourceType:kind,resourceId,permission:input.permission,purpose});
    } else if(input.action==='revoke') {
      const {rows} = await db.query('DELETE FROM resource_grants WHERE id=$1 AND user_id=$2 RETURNING id',[text(input.grantId,'授权编号'),target.id]);
      if(!rows.length) fail(404,'授权不存在');
      await db.query('UPDATE users SET auth_version=auth_version+1 WHERE id=$1',[target.id]);
      await audit(db,actor,'grant.revoked',target.id,{grantId:input.grantId});
    } else fail(400,'不支持的账号操作');
    await db.query('DELETE FROM sessions WHERE user_id=$1',[target.id]);
    return {ok:true};
  });
}
// All future content endpoints must pass server-loaded resource metadata here.
// Never pass ownership, institution or publication flags received from a browser.
export async function mayAccess(db, user, resource, permission='read') {
  if(!user.active || user.must_change_password || user.institution_id!==resource.institutionId) return false;
  if(resource.type==='answer' || resource.type==='result') {
    if(permission!=='read') return false;
    if(resource.ownerId===user.id) return resource.type==='answer' || resource.published===true;
    if(!user.roles.includes('teacher')) return false;
    return (await db.query("SELECT id FROM resource_grants WHERE user_id=$1 AND resource_type='exam' AND resource_id=$2 AND permission='manage'",[user.id,resource.examId])).rows.length>0;
  }
  if(['teacher_profile','student_profile'].includes(resource.type)) {
    if(resource.ownerId===user.id && permission==='read') return true;
    if(!user.roles.some(role=>['teacher','admin'].includes(role))) return false;
  }
  if(permission==='manage' && !user.roles.some(role=>['teacher','admin'].includes(role))) return false;
  return (await db.query('SELECT id FROM resource_grants WHERE user_id=$1 AND resource_type=$2 AND resource_id=$3 AND (permission=$4 OR permission=\'manage\')',[user.id,resource.type,resource.id,permission])).rows.length>0;
}
