const fs = require('fs');

const filePath = 'd:/project/cowork12-21/components/IssueDetailModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 修复所有乱码的 console.log
const fixes = [
  [/console\.log\('🔍 \[闂.*?寮€濮嬫.*?鍔犵.*?\);/g, "console.log('🔍 [问题详情] 开始添加答复');"],
  [/console\.log\('⚠️ \[闂.*?绛.*?涓虹┖'\);/g, "console.log('⚠️ [问题详情] 答复内容为空');"],
  [/console\.error\('❌ \[闂.*?鐢ㄦ埛.*?鏈姞杞.*?\);/g, "console.error('❌ [问题详情] 用户信息未加载');"],
  [/alert\('鐢ㄦ埛.*?鏈姞杞.*?璇峰埛鏂.*?閲嶈.*?'\);/g, "alert('用户信息未加载,请刷新页面重试');"],
  [/console\.log\('🔍 \[闂.*?鍑.*?娣诲姞绛.*?鏁版嵁搴.*?'\);/g, "console.log('🔍 [问题详情] 准备添加答复到数据库');"],
  [/console\.log\('🔍 \[闂.*?绛.*?鏁版嵁:'/g, "console.log('🔍 [问题详情] 答复数据:'"],
  [/console\.log\('✅ \[闂.*?绛.*?娣诲姞.*?鎴愬姛:'/g, "console.log('✅ [问题详情] 答复添加成功:'"],
  [/console\.error\('❌ \[闂.*?娣诲姞绛.*?澶辫触:'/g, "console.error('❌ [问题详情] 添加答复失败:'"],
  [/console\.error\('❌ \[闂.*?閿欒.*?璇︽儏:'/g, "console.error('❌ [问题详情] 错误详情:'"],
  [/alert\(`娣诲姞绛.*?澶辫触.*?璇烽噸璇?`\);/g, "alert(`添加答复失败:${error.message || '请重试'}`)"],
  [/console\.error\('❌ \[闂.*?鍔犺.*?绛.*?澶辫触:'/g, "console.error('❌ [问题详情] 加载答复失败:'"]
];

fixes.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ 编码修复完成');
