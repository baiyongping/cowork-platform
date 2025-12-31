const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';
const dbHash = '3798eee73d3dda0851e731edd250a51d691389eca398a1de76cb0471c8fec692';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

const passwords = [
  'password123',
  'admin123', 
  '123456',
  'Admin@2025',
  'admin',
  'Baiyongping@2025',
  'Admin123',
  'Admin123!',
  'admin2025'
];

console.log('=== 查找admin用户密码 ===');
console.log(`目标哈希: ${dbHash}\n`);

let found = false;
passwords.forEach(pwd => {
  const hash = hashPassword(pwd);
  const match = hash === dbHash;
  console.log(`${match ? '✅' : '❌'} "${pwd}": ${hash.substring(0, 8)}...`);
  if (match) {
    found = true;
    console.log(`\n🎉 找到了! admin 的密码是: ${pwd}`);
  }
});

if (!found) {
  console.log('\n❌ 未找到匹配密码,需要重置');
}
