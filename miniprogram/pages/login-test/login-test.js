const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    code: null,
    openid: null,
    sessionKey: null,
    loading: false,
    loginStep: 0, // 0: 未开始, 1: 获取code, 2: 登录成功, 3: 获取用户信息
    logs: []
  },

  onLoad() {
    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    // 添加日志
    this.addLog('页面加载完成')
  },

  // 添加日志
  addLog(message) {
    const time = new Date().toLocaleTimeString()
    this.setData({
      logs: [...this.data.logs, `[${time}] ${message}`]
    })
  },

  // 清除日志
  clearLogs() {
    this.setData({
      logs: []
    })
  },

  // 步骤1: 获取登录code
  async getLoginCode() {
    try {
      this.setData({ loading: true, loginStep: 1 })
      this.addLog('开始获取登录code...')

      wx.login({
        success: (res) => {
          if (res.code) {
            this.setData({ 
              code: res.code,
              loginStep: 1
            })
            this.addLog(`获取code成功: ${res.code}`)
            
            // 调用云函数获取openid
            this.getOpenid(res.code)
          } else {
            this.addLog(`获取code失败: ${res.errMsg}`)
            wx.showToast({
              title: '获取code失败',
              icon: 'error'
            })
          }
          this.setData({ loading: false })
        },
        fail: (err) => {
          this.addLog(`wx.login失败: ${JSON.stringify(err)}`)
          this.setData({ loading: false })
        }
      })
    } catch (error) {
      this.addLog(`获取登录code异常: ${error.message}`)
      this.setData({ loading: false })
    }
  },

  // 调用云函数获取openid
  async getOpenid(code) {
    try {
      this.addLog('调用云函数获取openid...')
      
      wx.cloud.callFunction({
        name: 'wxLogin',
        data: {},
        success: (res) => {
          this.addLog(`云函数调用成功: ${JSON.stringify(res.result)}`)
          
          if (res.result && res.result.success && res.result.openid) {
            this.setData({
              openid: res.result.openid,
              loginStep: 2
            })
            this.addLog(`获取openid成功: ${res.result.openid}`)
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
          } else {
            this.addLog('云函数返回数据异常')
            this.addLog(`返回数据: ${JSON.stringify(res.result)}`)
          }
        },
        fail: (err) => {
          this.addLog(`云函数调用失败: ${JSON.stringify(err)}`)
        }
      })
    } catch (error) {
      this.addLog(`获取openid异常: ${error.message}`)
    }
  },

  // 步骤2: 获取用户头像和昵称
  async getUserProfile() {
    if (!this.data.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      })
      return
    }

    try {
      this.setData({ loading: true })
      this.addLog('开始获取用户信息...')

      if (this.data.canIUseGetUserProfile) {
        // 使用getUserProfile (推荐方式)
        wx.getUserProfile({
          desc: '用于完善会员资料',
          success: (res) => {
            this.handleUserInfo(res.userInfo)
          },
          fail: (err) => {
            this.addLog(`getUserProfile失败: ${JSON.stringify(err)}`)
            this.setData({ loading: false })
          }
        })
      } else {
        // 兼容旧版本，使用getUserInfo
        wx.getUserInfo({
          success: (res) => {
            this.handleUserInfo(res.userInfo)
          },
          fail: (err) => {
            this.addLog(`getUserInfo失败: ${JSON.stringify(err)}`)
            this.setData({ loading: false })
          }
        })
      }
    } catch (error) {
      this.addLog(`获取用户信息异常: ${error.message}`)
      this.setData({ loading: false })
    }
  },

  // 处理用户信息
  handleUserInfo(userInfo) {
    this.addLog(`获取用户信息成功: ${JSON.stringify(userInfo)}`)
    
    this.setData({
      userInfo: userInfo,
      hasUserInfo: true,
      loginStep: 3,
      loading: false
    })

    // 保存用户信息到本地
    wx.setStorageSync('userInfo', userInfo)
    
    wx.showToast({
      title: '获取用户信息成功',
      icon: 'success'
    })

    // 可选：将用户信息上传到云数据库
    this.saveUserInfoToCloud(userInfo)
  },

  // 保存用户信息到云数据库
  async saveUserInfoToCloud(userInfo) {
    try {
      this.addLog('保存用户信息到云数据库...')
      
      wx.cloud.callFunction({
        name: 'wxLogin',
        data: {
          action: 'saveUser',
          userInfo: userInfo
        },
        success: (res) => {
          if (res.result && res.result.success) {
            this.addLog('用户信息保存成功')
          } else {
            this.addLog(`保存失败: ${res.result.message}`)
          }
        },
        fail: (err) => {
          this.addLog(`云函数调用失败: ${JSON.stringify(err)}`)
        }
      })
    } catch (error) {
      this.addLog(`保存用户信息异常: ${error.message}`)
    }
  },

  // 选择头像（微信7.0.20+）
  chooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.addLog(`选择头像: ${avatarUrl}`)
    
    if (this.data.userInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          avatarUrl: avatarUrl
        }
      })
    }
  },

  // 一键完整登录流程
  async quickLogin() {
    this.addLog('开始一键登录流程...')
    
    // 先获取code
    await this.getLoginCode()
    
    // 等待一下确保openid获取成功
    setTimeout(() => {
      if (this.data.openid) {
        // 再获取用户信息
        this.getUserProfile()
      } else {
        this.addLog('登录失败，请重试')
      }
    }, 1000)
  },

  // 重置所有数据
  reset() {
    this.setData({
      userInfo: null,
      hasUserInfo: false,
      code: null,
      openid: null,
      sessionKey: null,
      loading: false,
      loginStep: 0
    })
    this.clearLogs()
    this.addLog('数据已重置')
    wx.removeStorageSync('userInfo')
  },

  // 查看当前状态
  checkStatus() {
    const status = {
      code: this.data.code,
      openid: this.data.openid,
      sessionKey: this.data.sessionKey,
      hasUserInfo: this.data.hasUserInfo,
      userInfo: this.data.userInfo,
      loginStep: this.data.loginStep
    }
    this.addLog(`当前状态: ${JSON.stringify(status, null, 2)}`)
  }
})