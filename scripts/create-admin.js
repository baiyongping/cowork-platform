const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

// 默认管理员密码：admin123
const adminPassword = 'admin123';
const hashedPassword = hashPassword(adminPassword);

console.log('管理员账号信息：');
console.log('用户名: admin');
console.log('密码: admin123');
console.log('密码哈希: ' + hashedPassword);
console.log('\n请复制以下JSON用于数据库插入：');
console.log(JSON.stringify({
  username: 'admin',
  password: hashedPassword,
  email: 'admin@jihua.com',
  name: '系统管理员',
  department: '', // 管理员部门默认为空
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  lastLoginAt: null
}, null, 2));
