App({
  globalData: {
    userInfo: null,
    isLoggedIn: false
  },

  onLaunch: function() {
    console.log('=== 小程序启动 ===');
    
    if (!wx.cloud) {
      console.error('❌ 请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    // 初始化云开发环境
    wx.cloud.init({
      env: 'jihua-oa-dev-3goht9irae4d949f',
      traceUser: true
    });
    
    console.log('✅ 云开发环境已初始化');
    console.log('环境ID: jihua-oa-dev-3goht9irae4d949f');
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  /**
   * 检查登录状态
   */
  checkLoginStatus: function() {
    console.log('=== 检查登录状态 ===');
    
    wx.cloud.callFunction({
      name: 'bindWxOpenId',
      data: {
        action: 'autoLogin'
      },
      success: res => {
        if (res.result.code === 200) {
          // 自动登录成功
          console.log('✅ 自动登录成功:', res.result.data.user);
          this.globalData.userInfo = res.result.data.user;
          this.globalData.isLoggedIn = true;
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', res.result.data.user);
          wx.setStorageSync('token', res.result.data.token);
        } else if (res.result.data && res.result.data.needBind) {
          // 需要绑定账号
          console.log('⚠️ 用户未绑定,跳转到绑定页面');
          wx.reLaunch({
            url: '/pages/bind/bind'
          });
        }
      },
      fail: err => {
        console.error('❌ 自动登录失败:', err);
      }
    });
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo');
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn: function() {
    return this.globalData.isLoggedIn || !!wx.getStorageSync('token');
  },

  /**
   * 退出登录
   */
  logout: function() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    
    wx.reLaunch({
      url: '/pages/bind/bind'
    });
  }
});
