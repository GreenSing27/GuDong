// profile.js
const app = getApp();

Page({
  data: {
    openid: '',
    userInfo: null,
    totalDays: 0,
    totalWater: 0,
    achievementCount: 0,
    waterGoal: app.globalData.waterGoal, // 使用全局水目标
    reminderEnabled: false,
    reminderTimes: []
  },

  onLoad() {
    // 注册水目标变化回调
    app.registerWaterGoalCallback((newGoal) => {
      this.setData({ waterGoal: newGoal });
    });
    
    this.loadUserAndStats();
  },

  onShow() {
    // 每次显示页面时更新水目标
    this.setData({ waterGoal: app.globalData.waterGoal });
    this.loadUserAndStats();
  },

  async loadUserAndStats() {
    try {
      // 优先使用全局用户信息
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo,
          waterGoal: app.globalData.waterGoal
        });
      }

      const res = await wx.cloud.callFunction({
        name: 'user_login'
      });

      const { openid, userData } = res.result;

      if (!openid || !userData) {
        wx.showToast({ title: '请登录', icon: 'none' });
        return;
      }

      this.setData({
        openid,
        userInfo: userData || app.globalData.userInfo,
        waterGoal: userData.waterGoal || app.globalData.waterGoal,
        reminderEnabled: userData.reminderEnabled || false,
        reminderTimes: userData.reminderTimes || []
      });

      // 更新全局用户信息
      if (userData) {
        app.globalData.userInfo = userData;
      }
      
      if (userData.waterGoal) {
        app.globalData.waterGoal = userData.waterGoal;
      }

      this.loadStats();

    } catch (err) {
      console.error('云函数调用失败:', err);
    }
  },

  async loadStats() {
    const db = wx.cloud.database();
    const openid = this.data.openid;

    // 累计天数
    db.collection('water_records').where({ _openid: openid }).count()
      .then(res => {
        this.setData({ totalDays: res.total });
      });

    // 累计饮水量
    db.collection('water_records').where({ _openid: openid }).get()
      .then(res => {
        let total = 0;
        res.data.forEach(record => {
          total += record.amount || 0;
        });
        this.setData({ totalWater: (total / 1000).toFixed(1) });
      });

    // 成就数量
    db.collection('achievements').where({
      _openid: openid,
      unlocked: true
    }).count()
      .then(res => {
        this.setData({ achievementCount: res.total });
      });
  },

  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        wx.cloud.uploadFile({
          cloudPath: `avatars/${this.data.openid}.jpg`,
          filePath: tempFilePath,
          success: uploadRes => {
            const db = wx.cloud.database();
            db.collection('users')
              .where({ _openid: this.data.openid })
              .update({
                data: {
                  avatarUrl: uploadRes.fileID,
                  updateTime: db.serverDate()
                }
              })
              .then(() => {
                this.loadUserAndStats();
                wx.showToast({ title: '更新成功', icon: 'success' });
              });
          }
        });
      }
    });
  },

  toggleReminder(e) {
    const enabled = e.detail.value;
    const db = wx.cloud.database();

    db.collection('users')
      .where({ _openid: this.data.openid })
      .update({
        data: {
          reminderEnabled: enabled,
          updateTime: db.serverDate()
        }
      })
      .then(() => {
        this.setData({ reminderEnabled: enabled });
      });
  },

// 添加 setWaterGoal 方法定义
  setWaterGoal: function() {
    const that = this;
    wx.showModal({
      title: '设置目标饮水量',
      content: '',
      editable: true,
      placeholderText: '例如：2000',
      success: res => {
        if (res.confirm && res.content) {
          const goal = parseInt(res.content);
          if (!isNaN(goal)) {
            that.updateWaterGoal(goal);
          } else {
            wx.showToast({ title: '请输入有效数字', icon: 'none' });
          }
        }
      }
    });
  },
  
  // 添加 updateWaterGoal 方法定义
  updateWaterGoal: function(goal) {
    const db = wx.cloud.database();
    const openid = this.data.openid;
    
    // 更新本地数据
    this.setData({ waterGoal: goal });
    
    // 更新全局数据
    app.updateWaterGoal(goal);
    
    // 更新数据库
    try {
      db.collection('users').where({ _openid: openid }).update({
        data: {
          waterGoal: goal,
          updateTime: db.serverDate()
        }
      }).then(() => {
        wx.showToast({ title: '设置成功', icon: 'success' });
      });
    } catch (err) {
      console.error('更新目标饮水量失败:', err);
      wx.showToast({ title: '设置失败', icon: 'none' });
    }
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (url === '/pages/settings/water-goal') {
      // 调用设置水目标方法
      this.setWaterGoal();
    } else {
      wx.navigateTo({ url });
    }
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('openid');
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});
