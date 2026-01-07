/**
 * 目标分解维度定义集合
 * 用于定义目标分解的维度结构（如季度、区域、业务等）
 */

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const collection = db.collection('goalDecompositionDimensions');

/**
 * 集合字段说明:
 * - dimensionName: 维度名称 (如"季度维度")
 * - level1Items: 一级维度项数组 (如 ["Q1", "Q2", "Q3", "Q4"])
 * - level1Order: 一级维度项排序顺序
 * - hasLevel2: 是否启用二级维度
 * - level2Items: 二级维度项数组 (如 ["1月", "2月", "3月"])
 * - level2Order: 二级维度项排序顺序
 * - status: 状态 (active/inactive)
 * - usageCount: 被使用次数（用于判断是否可删除）
 * - createdBy: 创建人
 * - createdAt: 创建时间
 * - updatedAt: 更新时间
 */

async function initCollection() {
  try {
    // 创建索引
    await collection.createIndex({
      keys: { status: 1, dimensionName: 1 }
    });

    await collection.createIndex({
      keys: { createdAt: -1 }
    });

    console.log('✅ goalDecompositionDimensions 集合索引创建成功');

    // 插入示例数据
    const sampleDimensions = [
      {
        dimensionName: '季度维度',
        level1Items: ['Q1', 'Q2', 'Q3', 'Q4'],
        level1Order: [0, 1, 2, 3],
        hasLevel2: false,
        level2Items: [],
        level2Order: [],
        status: 'active',
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dimensionName: '区域维度',
        level1Items: ['华北', '华东', '华南', '华中'],
        level1Order: [0, 1, 2, 3],
        hasLevel2: true,
        level2Items: ['北京', '天津', '河北', '山西'],
        level2Order: [0, 1, 2, 3],
        status: 'active',
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dimensionName: '业务维度',
        level1Items: ['业务A', '业务B', '业务C'],
        level1Order: [0, 1, 2],
        hasLevel2: false,
        level2Items: [],
        level2Order: [],
        status: 'active',
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const dimension of sampleDimensions) {
      await collection.add(dimension);
    }

    console.log('✅ goalDecompositionDimensions 示例数据创建成功');
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
