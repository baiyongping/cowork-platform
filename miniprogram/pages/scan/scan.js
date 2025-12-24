// miniprogram/pages/scan/scan.js
Page({
  data: {},

  /**
   * 扫描二维码
   */
  handleScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        console.log('扫码成功:', res);
        this.handleScanResult(res.result);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 处理扫码结果
   */
  handleScanResult(result) {
    console.log('处理扫码结果:', result);
    
    try {
      // 解析二维码内容
      const url = new URL(result);
      const protocol = url.protocol.replace(':', '');
      const code = url.searchParams.get('code');

      if (!code) {
        wx.showToast({
          title: '二维码格式错误',
          icon: 'error'
        });
        return;
      }

      // 根据不同的协议跳转到不同的处理流程
      switch (protocol) {
        case 'jihuaoa':
          // 注册邀请二维码
          const path = url.pathname.replace('//', '');
          if (path === 'invite' || path === 'register') {
            this.handleRegisterQR(code);
          }
          break;
          
        case 'jihuaoa:':
          // 可能是协议格式 jihuaoa://scanlogin?code=xxx
          if (result.includes('scanlogin')) {
            this.handleLoginQR(code);
          } else if (result.includes('bind')) {
            this.handleBindQR(code);
          } else if (result.includes('invite') || result.includes('register')) {
            this.handleRegisterQR(code);
          }
          break;
          
        default:
          wx.showToast({
            title: '不支持的二维码类型',
            icon: 'error'
          });
      }
    } catch (error) {
      console.error('解析二维码失败:', error);
      wx.showToast({
        title: '二维码格式错误',
        icon: 'error'
      });
    }
  },

  /**
   * 处理注册二维码
   */
  handleRegisterQR(inviteCode) {
    wx.showModal({
      title: '确认注册',
      content: '确认使用此邀请码注册账号?',
      success: (res) => {
        if (res.confirm) {
          // 跳转到Web注册页面
          const registerUrl = `https://jihuadz.xin/register.html?code=${inviteCode}`;
          
          wx.showModal({
            title: '跳转提示',
            content: '即将跳转到浏览器完成注册',
            confirmText: '前往注册',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 复制链接到剪贴板
                wx.setClipboardData({
                  data: registerUrl,
                  success: () => {
                    wx.showToast({
                      title: '链接已复制，请在浏览器打开',
                      icon: 'success',
                      duration: 3000
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 处理登录二维码
   */
  handleLoginQR(loginCode) {
    wx.showModal({
      title: '确认登录',
      content: '确认登录到Web管理后台?',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '确认登录中...'
          });

          wx.cloud.callFunction({
            name: 'scanLogin',
            data: {
              action: 'confirm',
              loginCode: loginCode
            },
            success: (result) => {
              wx.hideLoading();
              
              if (result.result.code === 200) {
                wx.showToast({
                  title: '登录成功',
                  icon: 'success',
                  duration: 1500,
                  success: () => {
                    // 🔧 使用回调避免定时器泄漏
                    setTimeout(() => {
                      wx.navigateBack();
                    }, 1500);
                  }
                });
              } else {
                wx.showToast({
                  title: result.result.message || '登录失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('确认登录失败:', err);
              wx.showToast({
                title: '登录失败，请稍后重试',
                icon: 'error'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 处理绑定二维码
   */
  handleBindQR(bindCode) {
    wx.showModal({
      title: '确认绑定',
      content: '确认绑定微信到此账号?',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '绑定中...'
          });

          wx.cloud.callFunction({
            name: 'bindWxOpenId',
            data: {
              action: 'confirmBind',
              bindCode: bindCode
            },
            success: (result) => {
              wx.hideLoading();
              
              if (result.result.code === 200) {
                wx.showToast({
                  title: '绑定成功',
                  icon: 'success',
                  duration: 1500,
                  success: () => {
                    // 🔧 使用回调避免定时器泄漏
                    setTimeout(() => {
                      wx.navigateBack();
                    }, 1500);
                  }
                });
              } else {
                wx.showToast({
                  title: result.result.message || '绑定失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('绑定失败:', err);
              wx.showToast({
                title: '绑定失败，请稍后重试',
                icon: 'error'
              });
            }
          });
        }
      }
    });
  },

  onLoad() {
    console.log('扫码页面加载');
  }
});
