// pages/opportunities/opportunities.js
Page({
  data: {
    opportunities: [],
    loading: true
  },

  onLoad() {
    this.loadOpportunities();
  },

  async loadOpportunities() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpportunities'
      });

      if (res.result.success) {
        this.setData({
          opportunities: res.result.opportunities,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载商机失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadOpportunities().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
