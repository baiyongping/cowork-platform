Page({
  data: {},
  
  onLoad() {
    this.checkAuth();
  },
  
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
  },
  
  checkAuth() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.reLaunch({
        url: '/pages/register/register'
      });
    }
  }
});
