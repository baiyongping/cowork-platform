const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'jihua-4g3hg5bm1bddcc3c'
});

const db = app.database();
const cmd = db.command;

async function recalculateOpportunityGoals() {
  console.log('=== 开始重新统计商机目标 ===\n');

  // 1. 查询2025年所有商机
  const oppsRes = await db.collection('opportunities')
    .where({
      createdAt: cmd.gte(new Date('2025-01-01')).and(cmd.lte(new Date('2025-12-31 23:59:59')))
    })
    .get();
  
  const opportunities = oppsRes.data;
  console.log(`📊 2025年总商机数: ${opportunities.length}`);

  // 2. 统计年度数据
  const annualCount = opportunities.length;
  const annualAmount = Math.round(opportunities.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0) / 10000);
  console.log(`📈 年度统计: ${annualCount} 个, ${annualAmount} 万元\n`);

  // 3. 统计各季度数据
  const quarters = {
    Q1: { start: new Date('2025-01-01'), end: new Date('2025-03-31 23:59:59') },
    Q2: { start: new Date('2025-04-01'), end: new Date('2025-06-30 23:59:59') },
    Q3: { start: new Date('2025-07-01'), end: new Date('2025-09-30 23:59:59') },
    Q4: { start: new Date('2025-10-01'), end: new Date('2025-12-31 23:59:59') }
  };

  const quarterStats = {};
  for (const [q, range] of Object.entries(quarters)) {
    const qOpps = opportunities.filter(o => {
      const d = new Date(o.createdAt);
      return d >= range.start && d <= range.end;
    });
    const count = qOpps.length;
    const amount = Math.round(qOpps.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0) / 10000);
    quarterStats[q] = { count, amount };
    console.log(`📅 ${q}: ${count} 个, ${amount} 万元`);
  }

  // 4. 查询当前商机目标记录
  const goalsRes = await db.collection('opportunity_goals')
    .where({ year: 2025 })
    .get();
  
  console.log(`\n=== 开始更新数据库 ===`);
  console.log(`当前商机目标记录数: ${goalsRes.data.length}\n`);

  // 5. 更新年度目标
  const annualGoal = goalsRes.data.find(g => g.type === 'annual');
  if (annualGoal) {
    await db.collection('opportunity_goals').doc(annualGoal._id).update({
      countActual: annualCount,
      amountActual: annualAmount,
      updatedAt: new Date()
    });
    console.log(`✅ 已更新年度目标: ${annualCount} 个, ${annualAmount} 万元`);
  } else {
    console.log('⚠️  未找到年度商机目标记录');
  }

  // 6. 更新季度目标
  for (const [q, stats] of Object.entries(quarterStats)) {
    const quarterGoal = goalsRes.data.find(g => g.type === 'quarterly' && g.quarter === q);
    if (quarterGoal) {
      await db.collection('opportunity_goals').doc(quarterGoal._id).update({
        countActual: stats.count,
        amountActual: stats.amount,
        updatedAt: new Date()
      });
      console.log(`✅ 已更新${q}目标: ${stats.count} 个, ${stats.amount} 万元`);
    } else {
      console.log(`⚠️  未找到${q}商机目标记录`);
    }
  }

  console.log('\n=== 统计完成 ===');
  
  // 7. 验证更新结果
  const updatedGoalsRes = await db.collection('opportunity_goals')
    .where({ year: 2025 })
    .get();
  
  console.log('\n=== 更新后的数据 ===');
  updatedGoalsRes.data
    .sort((a, b) => {
      if (a.type === 'annual') return -1;
      if (b.type === 'annual') return 1;
      return a.quarter.localeCompare(b.quarter);
    })
    .forEach(g => {
      console.log(`${g.type === 'annual' ? '年度' : g.quarter}: 目标数 ${g.countTarget}, 实际数 ${g.countActual}, 目标额 ${g.amountTarget}万, 实际额 ${g.amountActual}万`);
    });
}

recalculateOpportunityGoals()
  .then(() => {
    console.log('\n✅ 全部完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
