// pages/tasks/tasks.js
Page({
  data: {
    tasks: [],
    loading: true
  },

  onLoad() {
    this.loadTasks();
  },

  async loadTasks() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getTasks'
      });

      if (res.result.success) {
        this.setData({
          tasks: res.result.tasks,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
