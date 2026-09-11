// Public, synthetic identities only. Never use this store for real authentication.
export const demoKey = 'path-edu-prototype-accounts-v1';
export function initialDemoAccounts() {
  return ['admin','teacher','student'].map(role=>({
    id:'demo-'+role,username:'demo_'+role,password:'Demo2026!'+role,
    displayName:({admin:'演示管理员',teacher:'演示教师',student:'演示学生'})[role] || role,
    institutionId:'demo',roles:[role],active:true,mustChangePassword:false
  }));
}
export function demoLogin(users,username,password) {
  const user=users.find(u=>u.username===username.trim().toLowerCase() && u.password===password);
  if(!user || !user.active) throw new Error('演示账号或密码错误，或账号已停用');
  return user;
}
export function validateDemoAccount(user,users) {
  if(!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(user.username)) throw new Error('账号需为 3–64 位字母、数字、点、下划线或横线');
  if(users.some(u=>u.username===user.username&&u.id!==user.id)) throw new Error('账号已存在');
  if(!user.displayName.trim() || user.displayName.length>60) throw new Error('请填写 1–60 字姓名');
  if(!['student','teacher','admin'].includes(user.roles[0]) || user.roles.length!==1) throw new Error('请选择有效角色');
  if(user.password.length<12 || user.password.length>128 || !/[a-z]/i.test(user.password) || !/[0-9]/.test(user.password)) throw new Error('演示密码需 12–128 位，包含字母和数字');
}
