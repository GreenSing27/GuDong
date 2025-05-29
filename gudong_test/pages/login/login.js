Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    isAgree: false,
    loading: false
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true });
    }
    this.checkLoginStatus();
  },

  // 检查本地登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const loginExpire = wx.getStorageSync('loginExpire');

    if (userInfo && loginExpire > Date.now()) {
      this.setData({
        userInfo,
        hasUserInfo: true
      });
      this.navigateToHome();
    }
  },

  // 切换是否同意协议
  toggleAgreement() {
    this.setData({ isAgree: !this.data.isAgree });
  },

  // 新版API：获取用户信息
  getUserProfile() {
    if (!this.data.isAgree) {
      return wx.showToast({
        title: '请先阅读并同意协议',
        icon: 'none'
      });
    }

    wx.getUserProfile({
      desc: '用于完善会员资料',
      lang: 'zh_CN',
      success: async (res) => {
        this.handleLoginSuccess(res.userInfo);
      },
      fail: (err) => {
        this.handleLoginError(err);
      }
    });
  },

  // 登录成功处理逻辑
  async handleLoginSuccess(userInfo) {
    this.setData({ loading: true });

    try {
      const { code } = await wx.login(); // 这个 code 可以忽略用不上

      const cloudRes = await wx.cloud.callFunction({
        name: 'user_login',
        data: {
          userInfo
        }
      });
      console.log('云函数返回：', cloudRes.result)
      // const { openid, message } = cloudRes.result;

      // if (!openid) {
      //   throw new Error(message || '未获取到 openid');
      // }

      // // 缓存登录状态
      // wx.setStorageSync('userInfo', userInfo);
      // wx.setStorageSync('loginExpire', Date.now() + 7 * 24 * 60 * 60 * 1000); // 缓存 7 天

      // // 更新页面数据
      // this.setData({
      //   userInfo,
      //   hasUserInfo: true,
      //   loading: false
      // });

      // // 跳转首页
      // this.navigateToHome();
      const { openid, userData } = cloudRes.result

      if (!openid || !userData) {
        throw new Error('登录失败，未获取用户信息')
      }

      // 存储 openid 和用户信息（可选）
      wx.setStorageSync('openid', openid)
      wx.setStorageSync('userInfo', userData)
      wx.setStorageSync('loginExpire', Date.now() + 7 * 24 * 60 * 60 * 1000)

      // 更新 UI
      this.setData({
        userInfo: userData,
        hasUserInfo: true,
        loading: false
      })

      // 跳转首页
      this.navigateToHome()

    } catch (err) {
      this.handleLoginError(err);
    }
  },

  // 登录失败处理
  handleLoginError(err) {
    console.error('登录失败:', err);
    this.setData({ loading: false });

    let msg = '登录失败';
    if (err.errMsg?.includes('deny')) {
      msg = '您拒绝了授权';
    } else if (err.errMsg?.includes('fail')) {
      msg = '网络请求失败';
    } else if (err.message?.includes('openid')) {
      msg = '服务器异常，请重试';
    }

    wx.showToast({
      title: msg,
      icon: 'none',
      duration: 2000
    });
  },

  // 跳转首页
  navigateToHome() {
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('loginExpire');
          this.setData({
            userInfo: null,
            hasUserInfo: false
          });
          // 可以加一个回到登录页逻辑
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  // 跳转用户协议
  navigateToAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  }
});
