// 分析商机数据
const opportunities = [
  { name: '的地方地方', amount: 11, isDeleted: false, isClosed: false },
  { name: '沙发是', amount: 920, isDeleted: false, isClosed: false },
  { name: '递四方速递', amount: 200, isDeleted: false, isClosed: false },
  { name: '雅江集团工装项目', amount: 1200, isDeleted: false, isClosed: true },
  { name: '防守打法', amount: 240, isDeleted: false, isClosed: false }
];

// 有效商机: 未删除且未关闭
const validOpps = opportunities.filter(o => !o.isDeleted && !o.isClosed);

console.log('=== 商机分析 ===\n');
console.log('所有商机:');
opportunities.forEach((o, i) => {
  const status = o.isClosed ? '[已关闭]' : o.isDeleted ? '[已删除]' : '[有效]';
  console.log(`  ${i+1}. ${o.name} ${status} - ${o.amount}万`);
});

console.log('\n有效商机 (未删除且未关闭):');
validOpps.forEach((o, i) => {
  console.log(`  ${i+1}. ${o.name} - ${o.amount}万`);
});

const totalCount = validOpps.length;
const totalAmount = validOpps.reduce((sum, o) => sum + o.amount, 0);

console.log(`\n统计结果:`);
console.log(`  总数: ${totalCount} 个`);
console.log(`  总金额: ${totalAmount} 万元`);
