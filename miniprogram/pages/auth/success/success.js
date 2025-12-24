Page({
  data: {
    countdown: 3
  },

  timer: null,

  onLoad(options) {
    this.startCountdown();
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  startCountdown() {
    this.timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      
      if (countdown <= 0) {
        clearInterval(this.timer);
        this.onGotoIndex();
      } else {
        this.setData({ countdown });
      }
    }, 1000);
  },

  onGotoIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
