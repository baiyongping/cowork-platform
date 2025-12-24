Page({
  data: {
    userInfo: null
  },

  onLoad() {
    this.checkAuth();
  },
  
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4
      });
    }
    this.getUserInfo();
  },

  checkAuth() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.reLaunch({
        url: '/pages/register/register'
      });
    }
  },

  async getUserInfo() {
    try {
      // 🔧 修复：调用正确的云函数获取用户信息
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: {}
      });

      if (res.result.success) {
        // 处理部门显示（支持多部门）
        let departmentText = '未设置部门';
        if (res.result.userInfo.departments && res.result.userInfo.departments.length > 0) {
          departmentText = res.result.userInfo.departments.join('、');
        } else if (res.result.userInfo.department) {
          departmentText = res.result.userInfo.department;
        }
        
        this.setData({
          userInfo: {
            ...res.result.userInfo,
            department: departmentText
          }
        });
      } else {
        wx.showToast({
          title: res.result.message || '获取信息失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  },
  
  // 跳转到我的业绩
  goToAchievement() {
    wx.navigateTo({
      url: '/pages/pending/pending?title=我的业绩'
    });
  },
  
  // 跳转到我的绩效
  goToPerformance() {
    wx.navigateTo({
      url: '/pages/pending/pending?title=我的绩效'
    });
  },
  
  // 跳转到我的团队
  goToTeam() {
    wx.navigateTo({
      url: '/pages/pending/pending?title=我的团队'
    });
  },
  
  // 跳转到登录测试页面
  goToLoginTest() {
    wx.navigateTo({
      url: '/pages/login-test/login-test'
    });
  }
});
