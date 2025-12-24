Page({
  data: {
    title: '待开发',
    subtitle: '功能开发中，敬请期待...'
  },
  
  onLoad(options) {
    if (options.title) {
      this.setData({
        title: options.title
      });
    }
  }
});
