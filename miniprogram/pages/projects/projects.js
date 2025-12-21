// pages/projects/projects.js
Page({
  data: {
    projects: [],
    loading: true
  },

  onLoad() {
    this.loadProjects();
  },

  async loadProjects() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getProjects'
      });

      if (res.result.success) {
        this.setData({
          projects: res.result.projects,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载项目失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
