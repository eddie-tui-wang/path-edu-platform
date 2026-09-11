import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {getDatabase} from '../lib/database.mjs';
import {hashPassword} from '../lib/accounts.mjs';
const command=process.argv[2];
if(!['migrate','bootstrap'].includes(command)) throw new Error('Use migrate or bootstrap');
const db=await getDatabase();
try {
  if(command==='migrate') {
    const sql=await readFile(new URL('../db/001_accounts.sql',import.meta.url),'utf8');
    await db.transaction(async tx => {
      await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())');
      await tx.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE');
      if(!(await tx.query('SELECT version FROM schema_migrations WHERE version=$1',['001_accounts'])).rows.length) {
        // The driver executes the trusted, version-controlled SQL migration only.
        if(tx.exec) await tx.exec(sql); else await tx.query(sql);
        await tx.query('INSERT INTO schema_migrations(version) VALUES($1)',['001_accounts']);
      }
    });
    console.log('Account schema is up to date.');
  } else {
    const generated=process.argv.includes('--generate-local');
    if(generated && (process.env.DATABASE_MODE!=='pglite' || process.env.NODE_ENV==='production')) throw new Error('Generated credentials are local-only');
    const name=process.env.BOOTSTRAP_USERNAME || 'admin';
    if(!/^[a-z0-9][a-z0-9_.@-]{2,63}$/.test(name)) throw new Error('Invalid bootstrap username');
    const password=generated ? `A9-${randomBytes(20).toString('base64url')}` : process.env.BOOTSTRAP_PASSWORD;
    const hash=await hashPassword(password);
    await db.transaction(async tx => {
      await tx.query('LOCK TABLE users IN EXCLUSIVE MODE');
      if((await tx.query('SELECT id FROM users LIMIT 1')).rows.length) throw new Error('Bootstrap refused: an account already exists');
      const institutionId=randomUUID(), id=randomUUID();
      await tx.query('INSERT INTO institutions(id,name) VALUES($1,$2)',[institutionId,process.env.INSTITUTION_NAME || '六院教学试用']);
      await tx.query('INSERT INTO users(id,institution_id,username,display_name,password_hash,roles) VALUES($1,$2,$3,$4,$5,$6)',[id,institutionId,name,'初始管理员',hash,'["admin"]']);
      await tx.query('INSERT INTO audit_events(id,institution_id,actor_id,target_id,action,detail) VALUES($1,$2,$3,$3,$4,$5)',[randomUUID(),institutionId,id,'account.bootstrap','{}']);
      if(generated) {
        await mkdir('.local',{recursive:true,mode:0o700});
        await writeFile('.local/首次管理员登录.txt',`仅用于本地开发，勿转发或提交仓库。\n账号：${name}\n初始密码：${password}\n首次登录必须改密。改密后请删除此文件。\n`,{mode:0o600,flag:'wx'});
      }
    });
    console.log(generated?'Local admin created. Credentials: .local/首次管理员登录.txt (not printed).':'Admin created. Remove BOOTSTRAP_PASSWORD from your environment.');
  }
} finally {await db.close();}
