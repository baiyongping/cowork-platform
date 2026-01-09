/**
 * 数据库初始化脚本：初始化缺失的模块配置
 * 用途：确保所有 constants/modules.ts 中的模块在 module_config 集合中都有对应配置
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 需要初始化的模块配置
const MODULES_TO_INIT = [
  // 目标管理二级功能
  {
    _id: 'goal.productOrder',
    name: '产品目标',
    code: 'goal.productOrder',
    parentId: 'goal',
    level: 2,
    path: '/goal/product-order',
    order: 2,
    enabled: true
  }
  // 可以添加其他缺失的模块
];

async function initMissingModules() {
  console.log('=== 开始初始化缺失的模块配置 ===\n');

  try {
    for (const moduleConfig of MODULES_TO_INIT) {
      console.log(`检查模块: ${moduleConfig.name} (${moduleConfig._id})`);

      // 检查模块是否已存在
      const existingModule = await db.collection('module_config')
        .where({ _id: moduleConfig._id })
        .get();

      if (existingModule.data.length > 0) {
        console.log(`✓ 模块 ${moduleConfig.name} 已存在，跳过\n`);
        continue;
      }

      // 创建模块配置
      await db.collection('module_config').add({
        data: {
          ...moduleConfig,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✓ 模块 ${moduleConfig.name} 创建成功\n`);
    }

    console.log('=== 缺失模块初始化完成 ===');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initMissingModules()
  .then(() => {
    console.log('\n✅ 所有操作完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  });
