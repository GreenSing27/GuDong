// index.js
const app = getApp()
const db = wx.cloud.database();

Page({
  data: {
    userInfo: null,
    weather: {
      temperature: '--',
      description: '获取中...'
    },
    todayWater: 0,
    waterGoal: 2000,
    reminderEnabled: false,
    reminderTimes: [] // 多个提醒时间
  },

  async onLoad() {
    await this.getUserInfoFromCloud();
    this.getWeather();
    this.getTodayWater();
    this.getReminderSettings();
  },

  async getUserInfoFromCloud() {
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;
    if (!openid) return;

    try {
      const res = await db.collection('users').where({ _openid: openid }).limit(1).get();
      if (res.data.length > 0) {
        const userInfo = res.data[0];
        this.setData({
          userInfo: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
        });
        wx.setStorageSync('userInfo', this.data.userInfo);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  },

  getWeather() {
    this.setData({
      weather: {
        temperature: '25',
        description: '晴朗'
      }
    });
  },

  async getTodayWater() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;

    db.collection('water_records')
      .where({
        _openid: openid,
        createTime: db.command.gte(today)
      })
      .get()
      .then(res => {
        let total = res.data.reduce((sum, record) => sum + record.amount, 0);
        this.setData({ todayWater: total });
      });
  },

  async getReminderSettings() {
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;
    const res = await db.collection('users').where({ _openid: openid }).get();

    if (res.data.length > 0) {
      const user = res.data[0];
      this.setData({
        reminderEnabled: user.reminderEnabled,
        waterGoal: user.waterGoal || 2000,
        reminderTimes: user.reminderTimes || []
      });
    }
  },

  addWater(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    db.collection('water_records').add({
      data: {
        amount,
        type: 'water',
        createTime: db.serverDate()
      }
    }).then(() => {
      this.getTodayWater();
      wx.showToast({ title: '添加成功', icon: 'success' });
    });
  },

  showCustomInput() {
    wx.showModal({
      title: '自定义饮水量',
      editable: true,
      placeholderText: '请输入毫升数',
      success: res => {
        if (res.confirm && res.content) {
          const amount = parseInt(res.content);
          if (!isNaN(amount) && amount > 0) {
            this.addWater({ currentTarget: { dataset: { amount } } });
          } else {
            wx.showToast({ title: '请输入有效数字', icon: 'none' });
          }
        }
      }
    });
  },

  showOtherDrinks() {
    const drinkTypes = ['coffee', 'tea', 'juice', 'other'];
    const ratios = [0.8, 0.9, 0.7, 0.6];
    wx.showActionSheet({
      itemList: ['咖啡', '茶', '果汁', '其他'],
      success: res => {
        const amount = 250;
        const equivalent = Math.round(amount * ratios[res.tapIndex]);
        this.addWater({ currentTarget: { dataset: { amount: equivalent } } });
      }
    });
  },

  toggleReminder(e) {
    const enabled = e.detail.value;
    this.setData({ reminderEnabled: enabled });
    
    // 如果关闭提醒，清除所有提醒时间
    if (!enabled) {
      this.setData({ reminderTimes: [] });
    }
    
    this.updateReminderSettings();
  },

  async updateReminderSettings() {
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;

    db.collection('users').where({ _openid: openid }).update({
      data: {
        reminderEnabled: this.data.reminderEnabled,
        reminderTimes: this.data.reminderTimes,
        updateTime: db.serverDate()
      }
    }).then(() => {
      console.log('提醒设置更新成功');
    });
  },

  subscribeReminder() {
    var that = this
    const templateId = '2g8c_YneDq3CvpFlg5Rp9S-v0p4ptYavgLlZWGwauO4'
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        console.log('订阅结果：', res);
        if (res['2g8c_YneDq3CvpFlg5Rp9S-v0p4ptYavgLlZWGwauO4'] === 'accept') {
          wx.showToast({ title: '订阅成功', icon: 'success' });
          
          // 订阅成功后自动开启提醒
          this.setData({ reminderEnabled: true });
          this.updateReminderSettings();
        } else {
          wx.showToast({ title: '订阅失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err);
        wx.showToast({ title: '订阅失败', icon: 'none' });
      }
    });
  },

  async saveReminderTime(e) {
    const selectedTime = e.detail.value;
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;

    // 添加新提醒时间到数组中
    const updated = [...new Set([...this.data.reminderTimes, selectedTime])];
    updated.sort(); // 按时间排序

    this.setData({ 
      reminderTimes: updated,
      reminderEnabled: true // 自动开启提醒
    });

    // 更新数据库
    await db.collection('users').where({ _openid: openid }).update({
      data: {
        reminderTimes: updated,
        reminderEnabled: true,
        updateTime: db.serverDate()
      }
    });
    
    wx.showToast({ title: '提醒时间添加成功' });
  },
  
  async removeReminderTime(e) {
    const timeToRemove = e.currentTarget.dataset.time;
    const newTimes = this.data.reminderTimes.filter(t => t !== timeToRemove);
  
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;
  
    this.setData({ reminderTimes: newTimes });
  
    await db.collection('users').where({ _openid: openid }).update({
      data: {
        reminderTimes: newTimes,
        updateTime: db.serverDate()
      }
    });
    
    wx.showToast({ title: '提醒时间已删除' });
    
    // 如果删除了所有提醒时间，自动关闭提醒
    if (newTimes.length === 0) {
      this.setData({ reminderEnabled: false });
      this.updateReminderSettings();
    }
  },
  
  // 格式化时间显示（HH:mm）
  formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
});