// pages/register/register.js
Page({
  data: {
    openid: null,      // OpenID
    unionid: null,     // ⭐ UnionID（系统唯一标识）
    avatarUrl: '',     // 头像URL
    nickName: '',      // 昵称
    name: '',          // 真实姓名
    phoneCode: '',     // 手机号code（可选）
    submitting: false
  },

  async onLoad(options) {
    console.log('📱 注册页面加载:', options);
    
    // ⭐ 核心：页面加载时立即执行微信登录
    await this.wxLogin();
  },
  
  /**
   * 页面显示时的处理
   */
  onShow() {
    console.log('📱 注册页面显示');
    
    // 清除可能的缓存
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    
    const app = getApp();
    if (app.globalData) {
      app.globalData.userInfo = null;
      app.globalData.isLoggedIn = false;
    }
  },

  /**
   * ⭐ 核心：微信登录流程（OpenID方案 - 个人开发者版）
   */
  async wxLogin() {
    wx.showLoading({ title: '登录中...', mask: true });
    
    try {
      // 1️⃣ 调用云函数获取 OpenID（云函数内部自动获取）
      const cloudRes = await wx.cloud.callFunction({
        name: 'getUserIdentity'
      });

      console.log('✅ getUserIdentity 返回:', cloudRes.result);

      if (!cloudRes.result.success) {
        throw new Error(cloudRes.result.message || '获取用户身份失败');
      }

      const { openid } = cloudRes.result;
      
      console.log('✅ 获取 OpenID 成功:', openid);

      // 保存到页面数据
      this.setData({ openid });

      // 2️⃣ 检查用户是否已注册
      const checkRes = await wx.cloud.callFunction({
        name: 'checkUserExists'
      });

      console.log('✅ checkUserExists 返回:', checkRes.result);

      if (checkRes.result.exists) {
        const user = checkRes.result.user;
        console.log('📊 用户已注册，状态:', user.status);
        
        // 用户已注册，根据状态跳转
        if (user.status === 'pending') {
          wx.reLaunch({
            url: '/pages/pending/pending?title=注册审核中&subtitle=请等待管理员审核通过后使用'
          });
        } else if (user.status === 'rejected') {
          wx.reLaunch({
            url: '/pages/pending/pending?title=审核未通过&subtitle=' + encodeURIComponent(user.rejectReason || '请联系管理员')
          });
        } else if (user.isActive === false) {
          wx.showModal({
            title: '账号已禁用',
            content: '您的账号已被禁用，请联系管理员',
            showCancel: false
          });
        } else {
          wx.reLaunch({
            url: '/pages/tasks/tasks'
          });
        }
        return;
      }
      
      // 用户未注册，继续显示注册表单
      console.log('⚠️ 用户未注册，显示注册表单');

    } catch (error) {
      console.error('❌ 登录失败:', error);
      wx.showModal({
        title: '登录失败',
        content: error.message || '请检查网络后重试',
        showCancel: false,
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            this.wxLogin();
          }
        }
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 🎨 选择头像（新版微信API）
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('✅ 头像选择成功:', avatarUrl);
    
    this.setData({ avatarUrl });

    wx.showToast({
      title: '头像已选择',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 🆕 昵称输入（新版type="nickname"）
   */
  onNicknameChange(e) {
    const nickName = e.detail.value.trim();
    console.log('✅ 昵称已输入:', nickName);
    
    this.setData({ nickName });
  },

  /**
   * 姓名输入
   */
  onNameInput(e) {
    this.setData({
      name: e.detail.value.trim()
    });
  },

  /**
   * 📱 获取手机号（可选）
   */
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const phoneCode = e.detail.code;
      this.setData({ phoneCode });
      
      wx.showToast({ 
        title: '手机号验证成功', 
        icon: 'success' 
      });
      
      console.log('📞 获取手机号 code 成功:', phoneCode);
    } else {
      console.log('❌ 用户取消手机号授权');
    }
  },

  /**
   * ⭐ 提交注册（OpenID方案）
   */
  async handleSubmit() {
    const { openid, name, nickName, avatarUrl, phoneCode } = this.data;

    // 验证必填项
    if (!openid) {
      wx.showToast({
        title: '请先完成微信登录',
        icon: 'error'
      });
      return;
    }

    if (!name) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      });
      return;
    }

    if (!avatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      });
      return;
    }

    if (!nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    // ⭐ 建议绑定手机号提示
    if (!phoneCode) {
      const confirmRes = await new Promise(resolve => {
        wx.showModal({
          title: '建议绑定手机号',
          content: '绑定手机号后可通过手机号找回账号，是否继续注册？',
          confirmText: '继续',
          cancelText: '返回',
          success: res => resolve(res.confirm)
        });
      });
      
      if (!confirmRes) {
        return;
      }
    }

    this.setData({ submitting: true });

    try {
      // 调用云函数注册
      const result = await wx.cloud.callFunction({
        name: 'registerEmployee',
        data: {
          name,
          nickName,
          avatarUrl,
          phoneCode     // 📱 手机号code（如果有）
        }
      });

      console.log('📝 注册结果:', result);

      if (result.result.code === 200) {
        const { hasUnionId, hasPhoneNumber } = result.result.data;
        
        let successMsg = '注册申请已提交';
        if (hasUnionId) successMsg += '\n✅ 已绑定 UnionID';
        if (hasPhoneNumber) successMsg += '\n✅ 已验证手机号';
        
        wx.showToast({
          title: successMsg,
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/pending/pending?title=注册申请已提交&subtitle=请等待管理员审核通过后使用'
              });
            }, 2000);
          }
        });

        // 清除临时数据
        wx.removeStorageSync('openid');
      } else {
        wx.showToast({
          title: result.result.message || '注册失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('❌ 注册失败:', error);
      wx.showToast({
        title: '注册失败: ' + error.message,
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
