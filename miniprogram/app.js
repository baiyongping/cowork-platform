// app.js
App({
  onLaunch: function() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'jihua-oa-dev-3goht9irae4d949f', // 强制使用开发环境ID
        traceUser: true,
      });
      // 打印环境ID验证
      console.log('云开发已初始化,环境ID:', 'jihua-oa-dev-3goht9irae4d949f');
    }
  },
  
  // 获取用户OpenID
  async getUserOpenId() {
    if (this.globalData.openId) {
      return this.globalData.openId;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpenId'
      });
      this.globalData.openId = res.result.openId;
      return this.globalData.openId;
    } catch (err) {
      console.error('获取OpenID失败:', err);
      return null;
    }
  },
  
  globalData: {
    userInfo: null,
    openId: null
  }
});
