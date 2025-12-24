// app.js
App({
  globalData: {
    userInfo: null,
    openId: null,
    isLoggedIn: false
  },

  onLaunch: function() {
    console.log('=== 小程序启动 ===');
    
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    wx.cloud.init({
      env: 'jihua-oa-dev-3goht9irae4d949f',
      traceUser: true,
    });
    
    console.log('✅ 云开发已初始化,环境ID:', 'jihua-oa-dev-3goht9irae4d949f');
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  /**
   * 检查登录状态（OpenID自动登录）
   */
  checkLoginStatus: async function() {
    console.log('=== 检查登录状态 ===');
    
    try {
      // 获取OpenID
      const openIdRes = await wx.cloud.callFunction({
        name: 'getOpenId'
      });
      
      console.log('📱 OpenID获取结果:', openIdRes);
      
      if (!openIdRes.result || !openIdRes.result.openid) {
        console.error('❌ 获取OpenID失败');
        wx.reLaunch({
          url: '/pages/register/register'
        });
        return;
      }
      
      const openid = openIdRes.result.openid;
      this.globalData.openId = openid;
      
      // 查询用户状态
      const db = wx.cloud.database();
      const userRes = await db.collection('users')
        .where({ openid: openid })
        .get();
      
      console.log('👤 用户查询结果:', userRes);
      
      if (userRes.data.length === 0) {
        // 用户未注册，跳转到注册页面
        console.log('⚠️ 用户未注册，跳转到注册页面');
        wx.reLaunch({
          url: '/pages/register/register'
        });
        return;
      }
      
      const user = userRes.data[0];
      console.log('📊 用户状态:', {
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        status: user.status
      });
      
      // 检查审核状态
      if (user.approvalStatus === 'pending') {
        console.log('⏳ 用户待审核，跳转到待审核页面');
        wx.reLaunch({
          url: '/pages/pending/pending?title=注册审核中&subtitle=请等待管理员审核通过后使用'
        });
        return;
      }
      
      if (user.approvalStatus === 'rejected') {
        console.log('❌ 用户审核被拒绝');
        wx.showModal({
          title: '审核未通过',
          content: user.rejectReason || '您的注册申请未通过审核，请联系管理员',
          showCancel: false,
          complete: () => {
            wx.reLaunch({
              url: '/pages/pending/pending?title=审核未通过&subtitle=' + encodeURIComponent(user.rejectReason || '请联系管理员')
            });
          }
        });
        return;
      }
      
      // 检查账号是否被禁用（只有明确为false时才视为禁用）
      if (user.isActive === false) {
        console.log('🚫 账号已被禁用');
        wx.showModal({
          title: '账号已禁用',
          content: '您的账号已被禁用，请联系管理员',
          showCancel: false
        });
        return;
      }
      
      // 审核通过，登录成功
      console.log('✅ 自动登录成功:', user.name);
      this.globalData.userInfo = user;
      this.globalData.isLoggedIn = true;
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', user);
      wx.setStorageSync('openid', openid);
      
      // 更新最后登录时间
      await db.collection('users').doc(user._id).update({
        data: {
          lastLoginAt: new Date()
        }
      });
      
    } catch (err) {
      console.error('❌ 检查登录状态失败:', err);
      wx.reLaunch({
        url: '/pages/register/register'
      });
    }
  },

  /**
   * 获取用户OpenID
   */
  async getUserOpenId() {
    if (this.globalData.openId) {
      return this.globalData.openId;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpenId'
      });
      this.globalData.openId = res.result.openId;
      return this.globalData.openId;
    } catch (err) {
      console.error('获取OpenID失败:', err);
      return null;
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo');
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn: function() {
    return this.globalData.isLoggedIn || !!wx.getStorageSync('token');
  },

  /**
   * 退出登录
   */
  logout: function() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    
    wx.reLaunch({
      url: '/pages/bind/bind'
    });
  }
});
