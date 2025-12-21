// pages/index/index.js
const app = getApp();

Page({
  data: {
    loading: true,
    statistics: {
      todayTasks: 0,
      pendingOpportunities: 0,
      ongoingProjects: 0
    },
    recentTasks: [],
    recentOpportunities: [],
    userInfo: null
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 获取OpenID
      const openId = await app.getUserOpenId();
      
      if (!openId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 调用云函数获取工作台数据
      const res = await wx.cloud.callFunction({
        name: 'getWorkbenchData',
        data: { openId }
      });

      if (res.result.success) {
        this.setData({
          statistics: res.result.statistics,
          recentTasks: res.result.recentTasks.slice(0, 3),
          recentOpportunities: res.result.recentOpportunities.slice(0, 3),
          loading: false
        });
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 导航到任务列表
  goToTasks() {
    wx.switchTab({ url: '/pages/tasks/tasks' });
  },

  // 导航到商机列表
  goToOpportunities() {
    wx.switchTab({ url: '/pages/opportunities/opportunities' });
  },

  // 导航到项目列表
  goToProjects() {
    wx.navigateTo({ url: '/pages/projects/projects' });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
