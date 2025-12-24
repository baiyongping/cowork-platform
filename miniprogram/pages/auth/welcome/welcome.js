Page({
  data: {},

  onLoad(options) {
    console.log('欢迎页加载', options);
  },

  async onAuthorize() {
    try {
      // 1. 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善会员资料'
      });

      console.log('获取用户信息成功:', userInfo);

      // 2. 调用云函数获取 OpenID
      wx.showLoading({ title: '登录中...' });
      
      const res = await wx.cloud.callFunction({
        name: 'wxLogin',
        data: { userInfo }
      });

      wx.hideLoading();

      if (res.result.success) {
        // 3. 跳转到信息展示页
        wx.navigateTo({
          url: '/pages/auth/profile/profile?data=' + encodeURIComponent(JSON.stringify({
            ...userInfo,
            openid: res.result.openid
          }))
        });
      } else {
        wx.showToast({
          title: res.result.message || '登录失败',
          icon: 'none'
        });
      }

    } catch (err) {
      console.error('授权失败:', err);
      wx.showToast({
        title: err.errMsg || '授权失败',
        icon: 'none'
      });
    }
  }
});
