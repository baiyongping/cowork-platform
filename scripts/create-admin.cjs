const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

// 默认管理员密码：admin123
const adminPassword = 'admin123';
const hashedPassword = hashPassword(adminPassword);

console.log('==========================================');
console.log('管理员账号信息：');
console.log('用户名: admin');
console.log('密码: admin123');
console.log('==========================================');
console.log('\n密码哈希: ' + hashedPassword);
