Page({
  data: {
    openid: '',
    userInfo: null,
    totalDays: 0,
    totalWater: 0,
    achievementCount: 0,
    waterGoal: 2000,
    reminderEnabled: false
  },

  onLoad() {
    this.loadUserAndStats();
  },

  onShow() {
    this.loadUserAndStats();
  },

  async loadUserAndStats() {
    try {
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
        userInfo: {
          nickName: userData.nickName,
          avatarUrl: userData.avatarUrl
        },
        reminderEnabled: userData.reminderEnabled || false
      });

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

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url });
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
