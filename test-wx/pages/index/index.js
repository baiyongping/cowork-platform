Page({
  data: {
    result: '点击按钮测试云开发功能'
  },
  
  onLoad: function() {
    console.log('=== 首页加载 ===');
    console.log('云环境ID: jihua-oa-dev-3goht9irae4d949f');
  },
  
  testCloudFunction: function() {
    console.log('测试云函数...');
    this.setData({ result: '正在调用云函数...' });
    
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('✅ 云函数调用成功:', res);
        this.setData({ 
          result: `云函数调用成功！\n环境ID: ${res.result.envId || '已连接'}\nOpenID: ${res.result.openid || '未获取'}` 
        });
      },
      fail: err => {
        console.error('❌ 云函数调用失败:', err);
        this.setData({ 
          result: `云函数调用失败：${err.errMsg}` 
        });
      }
    });
  },
  
  testDatabase: function() {
    console.log('测试数据库...');
    this.setData({ result: '正在查询数据库...' });
    
    const db = wx.cloud.database();
    db.collection('tasks').limit(1).get({
      success: res => {
        console.log('✅ 数据库查询成功:', res);
        this.setData({ 
          result: `数据库查询成功！\n记录数: ${res.data.length}` 
        });
      },
      fail: err => {
        console.error('❌ 数据库查询失败:', err);
        this.setData({ 
          result: `数据库查询失败：${err.errMsg}` 
        });
      }
    });
  }
});
