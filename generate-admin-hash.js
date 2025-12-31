const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

const password = 'admin123';
const hash = hashPassword(password);

console.log('='.repeat(60));
console.log('密码哈希生成器');
console.log('='.repeat(60));
console.log('原始密码:', password);
console.log('密码哈希:', hash);
console.log('='.repeat(60));
console.log('\n请复制上面的密码哈希值,然后在CloudBase控制台中更新admin用户的password字段');
console.log('控制台地址: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/users');
