// pages/bind/bind.js
Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onLoad(options) {
    // 检查是否已绑定
    this.checkBindStatus();
  },

  /**
   * 检查绑定状态
   */
  async checkBindStatus() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'bindWxOpenId',
        data: {
          action: 'checkBind'
        }
      });

      if (res.result.code === 200 && res.result.data.isBound) {
        // 已绑定,直接跳转到主页
        wx.showToast({
          title: '已绑定账号',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      }
    } catch (error) {
      console.error('检查绑定状态失败:', error);
    }
  },

  /**
   * 用户名输入
   */
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  /**
   * 密码输入
   */
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  /**
   * 绑定账号
   */
  async handleBind() {
    const { username, password } = this.data;

    // 验证输入
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'bindWxOpenId',
        data: {
          action: 'bind',
          username,
          password
        }
      });

      if (res.result.code === 200) {
        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        });

        // 保存用户信息到本地
        wx.setStorageSync('userInfo', res.result.data);

        // 跳转到主页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '绑定失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('绑定失败:', error);
      wx.showToast({
        title: '绑定失败,请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 跳转到注册页
   */
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  }
});
