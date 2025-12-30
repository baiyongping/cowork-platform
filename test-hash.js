const crypto = require('crypto');

const password = 'admin123';
const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

const hash = crypto.createHash('sha256');
hash.update(password + SECRET_KEY);
const hashedPassword = hash.digest('hex');

console.log('============================================');
console.log('密码哈希测试');
console.log('============================================');
console.log('原始密码:', password);
console.log('密钥:', SECRET_KEY);
console.log('');
console.log('SHA-256 哈希值:');
console.log(hashedPassword);
console.log('');
console.log('验证测试:');
const testHash = crypto.createHash('sha256');
testHash.update(password + SECRET_KEY);
const recomputedHash = testHash.digest('hex');
console.log('重新计算的哈希值:', recomputedHash);
console.log('两次哈希是否一致:', hashedPassword === recomputedHash);
console.log('============================================');
