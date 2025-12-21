const crypto = require('crypto');

const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

// 更新后的纯 JS SHA-256 实现（使用 UTF-8 编码）
function sha256JS(message) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;
  
  // 预处理 - 使用 UTF-8 编码
  const msgBytes = [];
  for (let i = 0; i < message.length; i++) {
    const charCode = message.charCodeAt(i);
    
    // UTF-8 编码规则
    if (charCode < 0x80) {
      msgBytes.push(charCode);
    } else if (charCode < 0x800) {
      msgBytes.push(0xC0 | (charCode >> 6));
      msgBytes.push(0x80 | (charCode & 0x3F));
    } else if (charCode < 0x10000) {
      msgBytes.push(0xE0 | (charCode >> 12));
      msgBytes.push(0x80 | ((charCode >> 6) & 0x3F));
      msgBytes.push(0x80 | (charCode & 0x3F));
    } else {
      msgBytes.push(0xF0 | (charCode >> 18));
      msgBytes.push(0x80 | ((charCode >> 12) & 0x3F));
      msgBytes.push(0x80 | ((charCode >> 6) & 0x3F));
      msgBytes.push(0x80 | (charCode & 0x3F));
    }
  }
  
  const msgLen = msgBytes.length * 8;
  msgBytes.push(0x80);
  
  while ((msgBytes.length % 64) !== 56) {
    msgBytes.push(0x00);
  }
  
  for (let i = 7; i >= 0; i--) {
    msgBytes.push((msgLen >>> (i * 8)) & 0xff);
  }
  
  // 处理消息块
  for (let chunk = 0; chunk < msgBytes.length; chunk += 64) {
    const W = new Array(64);
    
    for (let i = 0; i < 16; i++) {
      W[i] = (msgBytes[chunk + i * 4] << 24) |
             (msgBytes[chunk + i * 4 + 1] << 16) |
             (msgBytes[chunk + i * 4 + 2] << 8) |
             msgBytes[chunk + i * 4 + 3];
    }
    
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    
    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;
    
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }
  
  return [H0, H1, H2, H3, H4, H5, H6, H7].map(h => {
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }).join('');
}

// 测试密码 admin123
const password = 'admin123';
const input = password + SECRET_KEY;

// Node.js crypto 实现
const nodeHash = crypto.createHash('sha256').update(input).digest('hex');

// 纯 JS 实现（更新后）
const jsHash = sha256JS(input);

console.log('测试输入:', input);
console.log('Node.js crypto:', nodeHash);
console.log('纯 JS 实现:    ', jsHash);
console.log('是否匹配:', nodeHash === jsHash ? '✅ 匹配' : '❌ 不匹配');
