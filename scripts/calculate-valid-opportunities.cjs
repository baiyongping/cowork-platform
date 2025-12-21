// 计算有效商机 (未删除且未关闭)
const opportunities = [
  { name: '的地方地方', amount: 110000 },
  { name: '沙发是', amount: 9200000 },
  { name: '递四方速递', amount: 2000000 },
  { name: '雅江集团工装项目', amount: 12000000, isClosed: true },
  { name: '防守打法', amount: 2400000 }
];

// 过滤有效商机
const validOpportunities = opportunities.filter(opp => !opp.isClosed);

console.log('=== 有效商机 (未删除且未关闭) ===\n');
validOpportunities.forEach((opp, index) => {
  console.log(`${index + 1}. ${opp.name} - ${Math.round(opp.amount / 10000)} 万`);
});

const totalCount = validOpportunities.length;
const totalAmount = Math.round(validOpportunities.reduce((sum, opp) => sum + opp.amount, 0) / 10000);

console.log(`\n统计结果:`);
console.log(`总数: ${totalCount} 个`);
console.log(`总金额: ${totalAmount} 万元`);
