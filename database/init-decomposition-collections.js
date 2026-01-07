/**
 * 初始化目标分解相关集合的统一脚本
 */

const { initCollection: initDimensions } = require('./collections/goalDecompositionDimensions');
const { initCollection: initDecompositions } = require('./collections/goalDecompositions');
const { initCollection: initHistory } = require('./collections/goalDecompositionHistory');

async function initAllCollections() {
  console.log('🚀 开始初始化目标分解相关集合...\n');

  try {
    // 1. 初始化维度定义集合
    console.log('1️⃣ 初始化 goalDecompositionDimensions...');
    await initDimensions();
    console.log('');

    // 2. 初始化分解数据集合
    console.log('2️⃣ 初始化 goalDecompositions...');
    await initDecompositions();
    console.log('');

    // 3. 初始化历史版本集合
    console.log('3️⃣ 初始化 goalDecompositionHistory...');
    await initHistory();
    console.log('');

    console.log('✅ 所有集合初始化完成！');
    console.log('\n创建的集合:');
    console.log('  - goalDecompositionDimensions (维度定义)');
    console.log('  - goalDecompositions (分解数据)');
    console.log('  - goalDecompositionHistory (历史版本)');
    console.log('\n下一步:');
    console.log('  1. 部署云函数: dimension-management, decomposition-management');
    console.log('  2. 配置集合权限规则');
    console.log('  3. 开发前端界面');

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  }
}

// 运行初始化
if (require.main === module) {
  initAllCollections()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initAllCollections };
