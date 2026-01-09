const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = cloud.database();

(async () => {
  try {
    const res = await db.collection('modulesConfig')
      .orderBy('order', 'asc')
      .get();
    
    console.log('✅ 总模块数:', res.data.length);
    
    const level1 = res.data.filter(m => !m.parentId);
    const level2 = res.data.filter(m => m.parentId);
    
    console.log('📊 一级模块数:', level1.length);
    console.log('📊 二级模块数:', level2.length);
    
    console.log('\n=== 所有模块 ===');
    res.data.forEach(m => {
      const prefix = m.parentId ? '  ↳ ' : '📦 ';
      console.log(`${prefix}${m.name} (_id: ${m._id}, parentId: ${m.parentId || '无'}, order: ${m.order})`);
    });
    
    console.log('\n=== 二级模块分组 ===');
    const level2ByParent = {};
    level2.forEach(m => {
      if (!level2ByParent[m.parentId]) {
        level2ByParent[m.parentId] = [];
      }
      level2ByParent[m.parentId].push(m);
    });
    
    Object.keys(level2ByParent).forEach(parentId => {
      console.log(`\n父模块: ${parentId}`);
      level2ByParent[parentId].forEach(m => {
        console.log(`  - ${m.name} (${m._id})`);
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
})();
