/**
 * 目标分解数据集合
 * 存储基于维度的目标分解数据
 */

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const collection = db.collection('goalDecompositions');

/**
 * 集合字段说明:
 * - goalId: 关联的目标ID
 * - dimensionIds: 使用的维度ID数组 (1-3个)
 * - decompositionData: 分解数据数组
 *   [{
 *     dimension1Value: string,      // 维度1的值
 *     dimension1Level2Value?: string, // 维度1的二级值
 *     dimension2Value?: string,     // 维度2的值
 *     dimension2Level2Value?: string,
 *     dimension3Value?: string,     // 维度3的值
 *     dimension3Level2Value?: string,
 *     targetValue: number,          // 分解后的目标值
 *     actualValue?: number,         // 实际完成值
 *     completionRate?: number       // 完成率
 *   }]
 * - totalTarget: 总目标值
 * - totalActual: 总实际值
 * - overallCompletionRate: 总完成率
 * - version: 版本号
 * - status: 状态 (draft/active/archived)
 * - createdBy: 创建人
 * - createdAt: 创建时间
 * - updatedAt: 更新时间
 */

async function initCollection() {
  try {
    // 创建索引
    await collection.createIndex({
      keys: { goalId: 1, version: -1 }
    });

    await collection.createIndex({
      keys: { status: 1, createdAt: -1 }
    });

    await collection.createIndex({
      keys: { dimensionIds: 1 }
    });

    console.log('✅ goalDecompositions 集合索引创建成功');

    // 插入示例数据（供测试用）
    const sampleDecomposition = {
      goalId: 'sample-goal-001',
      dimensionIds: ['dimension-001'], // 单维度分解
      decompositionData: [
        {
          dimension1Value: 'Q1',
          targetValue: 1000000,
          actualValue: 850000,
          completionRate: 85
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
      totalActual: 850000,
      overallCompletionRate: 17,
      version: 1,
      status: 'active',
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collection.add(sampleDecomposition);

    console.log('✅ goalDecompositions 示例数据创建成功');
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
