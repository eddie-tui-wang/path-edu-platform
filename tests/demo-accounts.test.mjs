import test from 'node:test';
import assert from 'node:assert/strict';
import {initialDemoAccounts,demoLogin,validateDemoAccount} from '../lib/demo-accounts.mjs';
test('public demo identities: login, disabled, duplicate and password validation',()=>{
  const users=initialDemoAccounts();
  for(const u of users){validateDemoAccount(u,users);assert.equal(demoLogin(users,u.username,u.password).id,u.id);}
  assert.throws(()=>demoLogin(users,'demo_admin','wrong'));
  users[1].active=false;
  assert.throws(()=>demoLogin(users,users[1].username,users[1].password));
  assert.throws(()=>validateDemoAccount({...users[0],id:'duplicate'},users));
  assert.throws(()=>validateDemoAccount({...users[0],password:'short'},users));
  assert.throws(()=>validateDemoAccount({...users[0],roles:['unknown']},users));
  assert.equal(initialDemoAccounts()[1].active,true);
});
