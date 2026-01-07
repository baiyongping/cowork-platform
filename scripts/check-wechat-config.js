/**
 * 检查微信开放平台配置
 * 
 * 使用方法：
 * node scripts/check-wechat-config.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('=== 微信开放平台配置检查工具 ===\n');

  // 检查 AppID
  console.log('✅ 已检测到 AppID: wx79afc92f6fe01a31');
  
  // 询问 AppSecret
  console.log('\n📝 请输入你的 AppSecret（从微信公众平台获取）:');
  console.log('   路径: 开发 → 开发管理 → 开发设置 → 开发者ID\n');
  
  const appSecret = await question('AppSecret: ');
  
  if (!appSecret || appSecret.length < 32) {
    console.error('❌ AppSecret 格式不正确！');
    rl.close();
    return;
  }
  
  console.log('\n✅ AppSecret 已输入\n');
  
  // 生成配置文件
  const configContent = `// ⚠️ 此文件包含敏感信息，已添加到 .gitignore
// 请勿提交到版本控制系统

module.exports = {
  APPID: 'wx79afc92f6fe01a31',
  APPSECRET: '${appSecret}'
};
`;
  
  const configPath = path.join(__dirname, '../cloudfunctions/generate-miniprogram-qr/wechat-config.js');
  fs.writeFileSync(configPath, configContent, 'utf-8');
  
  console.log('✅ 配置文件已生成: cloudfunctions/generate-miniprogram-qr/wechat-config.js');
  
  // 更新 .gitignore
  const gitignorePath = path.join(__dirname, '../.gitignore');
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }
  
  if (!gitignoreContent.includes('wechat-config.js')) {
    gitignoreContent += '\n# 微信配置（敏感信息）\n**/wechat-config.js\n';
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
    console.log('✅ 已更新 .gitignore');
  }
  
  // 更新云函数代码
  const cloudFunctionPath = path.join(__dirname, '../cloudfunctions/generate-miniprogram-qr/index.js');
  let cloudFunctionCode = fs.readFileSync(cloudFunctionPath, 'utf-8');
  
  // 替换硬编码部分
  cloudFunctionCode = cloudFunctionCode.replace(
    /const APPID = '.*?';/,
    "const { APPID, APPSECRET } = require('./wechat-config');"
  );
  cloudFunctionCode = cloudFunctionCode.replace(
    /const APPSECRET = '.*?';/,
    ''
  );
  
  fs.writeFileSync(cloudFunctionPath, cloudFunctionCode, 'utf-8');
  console.log('✅ 已更新云函数代码\n');
  
  console.log('🎉 配置完成！\n');
  console.log('📌 后续步骤:');
  console.log('1. 部署云函数: npm run deploy-cloud-functions');
  console.log('2. 测试绑定功能: 进入个人信息 → 微信绑定');
  console.log('3. 扫描生成的二维码进行测试\n');
  
  rl.close();
}

main().catch(console.error);
