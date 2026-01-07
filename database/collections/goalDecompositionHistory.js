/**
 * 目标分解历史版本集合
 * 记录目标分解的历史版本，支持版本对比和回滚
 */

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const collection = db.collection('goalDecompositionHistory');

/**
 * 集合字段说明:
 * - goalId: 关联的目标ID
 * - decompositionId: 关联的分解记录ID
 * - version: 版本号
 * - snapshotData: 完整快照数据（存储完整的分解数据）
 * - changeType: 变更类型 (created/updated/deleted)
 * - changeDescription: 变更描述
 * - changedFields: 变更的字段列表
 * - changedBy: 修改人
 * - changedAt: 修改时间
 */

async function initCollection() {
  try {
    // 创建索引
    await collection.createIndex({
      keys: { goalId: 1, version: -1 }
    });

    await collection.createIndex({
      keys: { decompositionId: 1, changedAt: -1 }
    });

    await collection.createIndex({
      keys: { changedAt: -1 }
    });

    console.log('✅ goalDecompositionHistory 集合索引创建成功');

    // 插入示例历史记录
    const sampleHistory = {
      goalId: 'sample-goal-001',
      decompositionId: 'decomp-001',
      version: 1,
      snapshotData: {
        goalId: 'sample-goal-001',
        dimensionIds: ['dimension-001'],
        decompositionData: [
          {
            dimension1Value: 'Q1',
            targetValue: 1000000,
            actualValue: 0,
            completionRate: 0
          },
          {
            dimension1Value: 'Q2',
            targetValue: 1200000,
            actualValue: 0,
            completionRate: 0
          },
          {
            dimension1Value: 'Q3',
            targetValue: 1300000,
            actualValue: 0,
            completionRate: 0
          },
          {
            dimension1Value: 'Q4',
            targetValue: 1500000,
            actualValue: 0,
            completionRate: 0
          }
        ],
        totalTarget: 5000000,
        totalActual: 0,
        overallCompletionRate: 0,
        version: 1,
        status: 'active'
      },
      changeType: 'created',
      changeDescription: '初始创建目标分解',
      changedFields: [],
      changedBy: 'system',
      changedAt: new Date()
    };

    await collection.add(sampleHistory);

    console.log('✅ goalDecompositionHistory 示例数据创建成功');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本，执行初始化
if (require.main === module) {
  initCollection()
    .then(() => {
      console.log('初始化完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initCollection };
