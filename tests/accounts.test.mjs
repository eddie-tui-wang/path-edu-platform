import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {hashPassword,login,currentUser,changePassword,adminWrite,adminRead,mayAccess,logout} from '../lib/accounts.mjs';
import {handleAccountRequest} from '../lib/account-http.mjs';

test('local PostgreSQL data survives close/reopen; production refuses local fallback',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'path-edu-db-test-'));
  try {
    const first=new PGlite(dir);await first.exec('CREATE TABLE persistence_test(value text)');
    await first.query('INSERT INTO persistence_test VALUES($1)',['saved']);await first.close();
    const second=new PGlite(dir);assert.equal((await second.query('SELECT value FROM persistence_test')).rows[0].value,'saved');await second.close();
    const env={mode:process.env.DATABASE_MODE,node:process.env.NODE_ENV};
    try {
      process.env.NODE_ENV='production';process.env.DATABASE_MODE='pglite';
      const {getDatabase}=await import('../lib/database.mjs');
      await assert.rejects(()=>getDatabase(),/disabled in production/);
    } finally {
      if(env.mode===undefined)delete process.env.DATABASE_MODE;else process.env.DATABASE_MODE=env.mode;
      if(env.node===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env.node;
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('real database account lifecycle, roles, isolation, invalidation and HTTP boundaries',async t=>{
  const db=new PGlite(); await db.waitReady;
  await db.exec(await readFile(new URL('../db/001_accounts.sql',import.meta.url),'utf8'));
  const database={query:db.query.bind(db),transaction:fn=>db.transaction(fn)};
  const initial='Initial-test-18273', next='Changed-test-92837';
  const hash=await hashPassword(initial);
  await db.query("INSERT INTO institutions VALUES('org-a','A'),('org-b','B')");
  for(const [id,org,roles] of [['admin','org-a',['admin']],['outsider','org-b',['admin']]]) {
    await db.query('INSERT INTO users(id,institution_id,username,display_name,password_hash,roles) VALUES($1,$2,$1,$1,$3,$4)',[id,org,hash,JSON.stringify(roles)]);
  }
  let adminToken,studentToken,teacherToken,studentId,teacherId;
  await t.test('first-login gate and mandatory password change invalidate all sessions',async()=>{
    const a=await login(database,{username:'admin',password:initial});
    assert.equal(a.user.mustChangePassword,true);
    await assert.rejects(()=>adminRead(database,a.token,'users'),{status:403});
    await assert.rejects(()=>changePassword(database,a.token,{currentPassword:'wrong',password:next}),{status:400});
    await changePassword(database,a.token,{currentPassword:initial,password:next});
    await assert.rejects(()=>currentUser(db,a.token),{status:401});
    adminToken=(await login(database,{username:'admin',password:next})).token;
  });
  await t.test('admin creates teacher/student, rejects duplicates and weak passwords',async()=>{
    for(const role of ['student','teacher']) {
      await adminWrite(database,adminToken,{action:'create',username:role,displayName:role,roles:[role],password:initial});
      const first=await login(database,{username:role,password:initial});
      await changePassword(database,first.token,{currentPassword:initial,password:next});
      const account=await login(database,{username:role,password:next});
      if(role==='student'){studentToken=account.token;studentId=account.user.id;}else{teacherToken=account.token;teacherId=account.user.id;}
    }
    const users=await adminRead(database,adminToken,'users');
    assert.equal(users.length,3);assert.ok(users.every(u=>!('password_hash' in u)));
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'create',username:'student',displayName:'duplicate',roles:['student'],password:initial}),{status:409});
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'create',username:'weak',displayName:'weak',roles:['student'],password:'123'}),{status:400});
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'create',username:'bad-role',displayName:'x',roles:['root'],password:initial}),{status:400});
  });
  await t.test('teacher/student cannot administer, cross-institution targets denied',async()=>{
    for(const token of [studentToken,teacherToken]) {
      await assert.rejects(()=>adminRead(database,token,'users'),{status:403});
      await assert.rejects(()=>adminWrite(database,token,{action:'create'}),{status:403});
    }
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'reset',userId:'outsider',password:initial}),{status:404});
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'update',userId:'admin',displayName:'x',roles:['student'],active:true}),{status:409});
  });
  await t.test('grants are explicit; admins have no implicit content rights; grant/revoke invalidate sessions',async()=>{
    const student=await currentUser(db,studentToken), teacher=await currentUser(db,teacherToken),admin=await currentUser(db,adminToken);
    const resource={institutionId:'org-a',type:'case',id:'case-1'};
    assert.equal(await mayAccess(db,admin,resource),false);
    assert.equal(await mayAccess(db,teacher,resource),false);
    assert.equal(await mayAccess(db,student,{institutionId:'org-a',type:'result',ownerId:studentId,published:false}),false);
    assert.equal(await mayAccess(db,student,{institutionId:'org-a',type:'result',ownerId:studentId,published:true}),true);
    assert.equal(await mayAccess(db,student,{institutionId:'org-b',type:'result',ownerId:studentId,published:true}),false);
    await adminWrite(database,adminToken,{action:'grant',userId:teacherId,resourceType:'case',resourceId:'case-1',permission:'manage',purpose:'测试教学'});
    await assert.rejects(()=>currentUser(db,teacherToken),{status:401});
    teacherToken=(await login(database,{username:'teacher',password:next})).token;
    assert.equal(await mayAccess(db,await currentUser(db,teacherToken),resource,'manage'),true);
    const [grant]=await adminRead(database,adminToken,'grants');
    await adminWrite(database,adminToken,{action:'revoke',userId:teacherId,grantId:grant.id});
    await assert.rejects(()=>currentUser(db,teacherToken),{status:401});
    assert.equal(await mayAccess(db,teacher,resource),false);
    await assert.rejects(()=>adminWrite(database,adminToken,{action:'grant',userId:studentId,resourceType:'case',resourceId:'x',permission:'manage',purpose:'x'}),{status:400});
  });
  await t.test('disabled/reset users lose every session and must change password again',async()=>{
    await adminWrite(database,adminToken,{action:'update',userId:studentId,displayName:'student',roles:['student'],active:false});
    await assert.rejects(()=>currentUser(db,studentToken),{status:401});
    assert.equal((await login(database,{username:'student',password:next})).status,401);
    await adminWrite(database,adminToken,{action:'update',userId:studentId,displayName:'student',roles:['student'],active:true});
    studentToken=(await login(database,{username:'student',password:next})).token;
    await adminWrite(database,adminToken,{action:'reset',userId:studentId,password:initial});
    await assert.rejects(()=>currentUser(db,studentToken),{status:401});
    assert.equal((await login(database,{username:'student',password:initial})).user.mustChangePassword,true);
  });
  await t.test('login failures persist and enforce a lockout without leaking passwords',async()=>{
    for(let i=0;i<5;i++) assert.equal((await login(database,{username:'nobody',password:'wrong'})).status,401);
    assert.equal((await login(database,{username:'nobody',password:initial})).status,429);
    const events=await adminRead(database,adminToken,'audit');
    assert.ok(events.some(e=>e.action==='password.reset'));
    assert.ok(!JSON.stringify(events).includes(initial));
    const {rows:[stored]}=await db.query('SELECT password_hash FROM users WHERE id=$1',['admin']);
    assert.ok(stored.password_hash.startsWith('scrypt$'));assert.ok(!stored.password_hash.includes(next));
  });
  await t.test('HTTP sets HttpOnly cookie, no-store; blocks CSRF, oversized bodies and unauthenticated access',async()=>{
    const request=(path,data,origin='http://localhost:3002',cookie='')=>new Request('http://localhost:3002/api/accounts/'+path,{method:data===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie},body:data===undefined?undefined:JSON.stringify(data)});
    assert.equal((await handleAccountRequest(request('users'),database)).status,401);
    assert.equal((await handleAccountRequest(request('login',{username:'admin',password:next},'https://evil.example'),database)).status,403);
    assert.equal((await handleAccountRequest(request('login',{username:'admin',password:'x'.repeat(17000)}),database)).status,413);
    const result=await handleAccountRequest(request('login',{username:'admin',password:next}),database);
    assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('cache-control'),/no-store/);
    assert.equal('token' in await result.json(),false);
    const cookie=result.headers.get('set-cookie').split(';')[0];
    assert.equal((await handleAccountRequest(request('users',undefined,undefined,cookie),database)).status,200);
    assert.equal((await handleAccountRequest(request('logout',{},undefined,cookie),database)).status,200);
    assert.equal((await handleAccountRequest(request('me',undefined,undefined,cookie),database)).status,401);
  });
  await logout(database,adminToken);await assert.rejects(()=>currentUser(db,adminToken),{status:401});
  await db.close();
});
