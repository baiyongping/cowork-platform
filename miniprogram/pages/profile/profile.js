// pages/profile/profile.js
Page({
  data: {
    userInfo: null
  },

  onLoad() {
    // 获取用户信息
    this.getUserInfo();
  },

  async getUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo'
      });

      if (res.result.success) {
        this.setData({
          userInfo: res.result.userInfo
        });
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  }
});
