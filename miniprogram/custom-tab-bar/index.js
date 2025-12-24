Component({
  data: {
    selected: 2, // 默认选中任务
    list: [
      {
        pagePath: '/pages/opportunities/opportunities',
        text: '商机',
        icon: '💼'
      },
      {
        pagePath: '/pages/projects/projects',
        text: '项目',
        icon: '📋'
      },
      {
        pagePath: '/pages/tasks/tasks',
        text: '任务',
        icon: '✓',
        isCenter: true // 标记为中心项
      },
      {
        pagePath: '/pages/meetings/meetings',
        text: '会议',
        icon: '📅'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '👤'
      }
    ]
  },
  
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.list[index].pagePath;
      
      wx.switchTab({
        url: path
      });
      
      this.setData({
        selected: index
      });
    }
  }
});
