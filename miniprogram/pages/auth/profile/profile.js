Page({
  data: {
    userInfo: {},
    genderText: ''
  },

  onLoad(options) {
    if (options.data) {
      const userInfo = JSON.parse(decodeURIComponent(options.data));
      
      // 性别文本转换
      const genderMap = {
        0: '未知',
        1: '男',
        2: '女'
      };

      this.setData({
        userInfo,
        genderText: genderMap[userInfo.gender] || '未知'
      });

      console.log('用户信息:', userInfo);
    }
  },

  async onConfirm() {
    try {
      wx.showLoading({ title: '保存中...' });

      // 调用云函数保存用户信息
      const res = await wx.cloud.callFunction({
        name: 'wxLogin',
        data: {
          action: 'saveUser',
          userInfo: this.data.userInfo
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        // 跳转到成功页
        wx.redirectTo({
          url: '/pages/auth/success/success'
        });
      } else {
        wx.showToast({
          title: res.result.message || '保存失败',
          icon: 'none'
        });
      }

    } catch (err) {
      wx.hideLoading();
      console.error('保存失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
