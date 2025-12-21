const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password + SECRET_KEY);
  return hash.digest('hex');
}

console.log('测试密码哈希:');
console.log('密码: testpass123');
console.log('哈希:', hashPassword('testpass123'));
console.log('');
console.log('密码: admin123');
console.log('哈希:', hashPassword('admin123'));
