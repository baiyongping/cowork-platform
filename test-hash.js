const crypto = require('crypto');

// 默认密钥
const DEFAULT_SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

function hashPassword(password, secretKey) {
  return crypto.createHash('sha256').update(password + secretKey).digest('hex');
}

// 当前数据库中admin用户的密码哈希值
const dbHash = '3798eee73d3dda0851e731edd250a51d691389eca398a1de76cb0471c8fec692';

// 测试多个密码
const passwords = ['password123', 'admin123', '123456', 'Admin@2025', 'admin', 'Baiyongping@2025', 'Admin123', 'Admin123!', 'admin2025'];

console.log('\n=== 查找匹配的密码 ===');
console.log(`数据库哈希: ${dbHash}\n`);

let found = false;
passwords.forEach((password) => {
  const hash = hashPassword(password, DEFAULT_SECRET_KEY);
  const match = hash === dbHash;
  
  console.log(`密码 "${password}": ${match ? '✅ 匹配' : '❌ 不匹配'}`);
  
  if (match) {
    found = true;
  }
});

if (!found) {
  console.log('\n❌ 未找到匹配的密码');
  console.log('\n🔧 生成新的admin123密码哈希:');
  console.log(hashPassword('admin123', DEFAULT_SECRET_KEY));
} else {
  console.log('\n✅ 找到匹配密码!');
}
