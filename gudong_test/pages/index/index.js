// index.js
const app = getApp()
const db = wx.cloud.database();

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    avatarUrl: defaultAvatarUrl,
    theme: wx.getSystemInfoSync().theme,
    userInfo: null,
    todayWater: 0,
    waterGoal: app.globalData.waterGoal,
    reminderEnabled: false,
    reminderTimes: [],
    goalReached: false,
    showAchievementPopup: false
  },

  async onLoad() {
    wx.onThemeChange((result) => {
      this.setData({
        theme: result.theme
      })
    })
    
    // 注册水目标变化回调
    app.registerWaterGoalCallback((newGoal) => {
      this.setData({ waterGoal: newGoal });
    });

    await this.getUserInfoFromCloud();
    this.getTodayWater();
    this.getReminderSettings();
  },
  
  onShow() {
    // 每次显示页面时更新水目标
    this.setData({ waterGoal: app.globalData.waterGoal });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail 
    this.setData({
      avatarUrl,
    });
    this.saveUserAvatar(avatarUrl);
  },
   
  // 保存用户头像到数据库
  async saveUserAvatar(avatarUrl) {
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;
    if (!openid) return;
    
    try {
      await db.collection('users').where({ _openid: openid }).update({
        data: {
          avatarUrl: avatarUrl,
          updateTime: db.serverDate()
        }
      });
      
      // 更新全局用户信息
      if (app.globalData.userInfo) {
        app.globalData.userInfo.avatarUrl = avatarUrl;
      }
      
      // 更新页面数据
      this.setData({
        'userInfo.avatarUrl': avatarUrl
      });
    } catch (err) {
      console.error('保存头像失败:', err);
    }
  },
  
  // 昵称输入
  onNickNameInput(e) {
    const nickName = e.detail.value;
    this.saveUserNickName(nickName);
  },
  
  // 保存用户昵称到数据库
  async saveUserNickName(nickName) {
    const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
    const openid = result.openid;
    if (!openid) return;
    
    try {
      await db.collection('users').where({ _openid: openid }).update({
        data: {
          nickName: nickName,
          updateTime: db.serverDate()
        }
      });
      
      // 更新全局用户信息
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickName = nickName;
      }
      
      // 更新页面数据
      this.setData({
        'userInfo.nickName': nickName
      });
    } catch (err) {
      console.error('保存昵称失败:', err);
    }
  },

  async getUserInfoFromCloud() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;

      const res = await db.collection('users').where({ _openid: openid }).limit(1).get();
      if (res.data.length > 0) {
        const userData = res.data[0];
        const userInfo = {
          nickName: userData.nickName || '微信用户',
          avatarUrl: userData.avatarUrl || defaultAvatarUrl
        };
        
        this.setData({
          userInfo: userInfo,
          avatarUrl: userData.avatarUrl || defaultAvatarUrl
        });
        
        // 更新全局用户信息
        app.globalData.userInfo = userInfo;
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  },

  async getTodayWater() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;

      const res = await db.collection('water_records')
        .where({
          _openid: openid,
          createTime: db.command.gte(today)
        })
        .get();
      
      let total = res.data.reduce((sum, record) => sum + (record.amount || 0), 0);
      const goalReached = total >= this.data.waterGoal;
      
      // 如果达到目标且之前未达到，则触发成就
      if (goalReached && !this.data.goalReached) {
        await this.unlockAchievement();
      }
      
      this.setData({ 
        todayWater: total,
        goalReached: goalReached
      });
    } catch (err) {
      console.error('获取今日饮水量失败:', err);
    }
  },
  
  // 解锁成就
  async unlockAchievement() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;
      
      // 检查今天是否已经解锁过成就
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const checkRes = await db.collection('achievements')
        .where({
          _openid: openid,
          type: 'daily_goal',
          date: db.command.gte(today)
        })
        .count();
      
      // 如果今天还没有解锁过
      if (checkRes.total === 0) {
        // 添加成就记录
        await db.collection('achievements').add({
          data: {
            _openid: openid,
            type: 'daily_goal',
            title: '每日达标',
            description: '完成每日饮水目标',
            date: db.serverDate(),
            unlocked: true
          }
        });
        
        // 显示成就弹窗
        this.setData({ showAchievementPopup: true });
        
        // 更新全局成就计数
        if (app.addAchievement) {
          app.addAchievement();
        }
        
        // 更新成就统计
        this.updateAchievementCount();
      }
    } catch (err) {
      console.error('解锁成就失败:', err);
    }
  },
  
  // 更新成就统计
  async updateAchievementCount() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;
      
      const res = await db.collection('achievements')
        .where({
          _openid: openid,
          unlocked: true
        })
        .count();
      
      // 更新全局成就计数
      app.globalData.achievementCount = res.total;
      if (app.setAchievementCount) {
        app.setAchievementCount(res.total);
      }
    } catch (err) {
      console.error('更新成就计数失败:', err);
    }
  },

  async getReminderSettings() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;
      
      const res = await db.collection('users').where({ _openid: openid }).get();

      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          reminderEnabled: user.reminderEnabled,
          waterGoal: user.waterGoal || 2000,
          reminderTimes: user.reminderTimes || []
        });
        if (user.waterGoal) {
          app.globalData.waterGoal = user.waterGoal;
        }
      }
    } catch (err) {
      console.error('获取提醒设置失败:', err);
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
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;

      await db.collection('users').where({ _openid: openid }).update({
        data: {
          reminderEnabled: this.data.reminderEnabled,
          reminderTimes: this.data.reminderTimes,
          updateTime: db.serverDate()
        }
      });
    } catch (err) {
      console.error('更新提醒设置失败:', err);
    }
  },

  subscribeReminder() {
    var that = this
    const templateId = '2g8c_YneDq3CvpFlg5Rp9S-v0p4ptYavgLlZWGwauO4'
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
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
    try {
      const selectedTime = e.detail.value;
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;

      // 添加新提醒时间到数组中
      const updated = [...new Set([...this.data.reminderTimes, selectedTime])];
      updated.sort();

      this.setData({ 
        reminderTimes: updated,
        reminderEnabled: true
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
    } catch (err) {
      console.error('添加提醒时间失败:', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },
  
  async removeReminderTime(e) {
    try {
      const timeToRemove = e.currentTarget.dataset.time;
      const newTimes = this.data.reminderTimes.filter(t => t !== timeToRemove);
    
      const { result } = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openid = result.openid;
      if (!openid) return;
    
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
    } catch (err) {
      console.error('删除提醒时间失败:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },
  
  // 关闭成就弹窗
  closeAchievementPopup() {
    this.setData({ showAchievementPopup: false });
  }
});