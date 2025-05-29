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
    intervalOptions: ['30分钟', '1小时', '2小时', '自定义'],
    intervalIndex: 1,
    reminderTypes: ['系统通知', '声音提醒'],
    reminderTypeIndex: 0
  },

  onLoad: function() {
    this.getUserInfoFromCloud(); //从云数据库读取
    //this.getUserInfo()  //从本地读取
    this.getWeather()
    this.getTodayWater()
    this.getReminderSettings()
  },
  
  //从云端读取
  async getUserInfoFromCloud() {
    // 获取当前用户的 openid
    const { result } = await wx.cloud.callFunction({
      name: 'getOpenId', // 假设你有一个名为 getOpenId 的云函数返回 openid
    });
    const openid = result.openid;
    if (!openid) {
      console.error('无法获取 openid');
      return;
    }
    // 使用 openid 查询用户信息
    const db = wx.cloud.database();
    try {
      const res = await db.collection('users')
        .where({
          _openid: openid // 根据 openid 进行查询
        })
        .limit(1)
        .get();
      if (res.data.length > 0) {
        const userInfo = res.data[0]; // 获取用户信息
        // 更新页面上的用户信息显示
        this.setData({
          userInfo: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
        });
        // 同步更新本地缓存
        wx.setStorageSync('userInfo', this.data.userInfo);
      } else {
        console.log("未找到对应的用户信息");
      }
    } catch (err) {
      console.error('从云端获取用户信息失败:', err);
    }
  },
  
  //从本地读取
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo'); // 从本地缓存读取用户信息
    if (userInfo) {
      this.setData({
        userInfo: userInfo // 更新页面上的用户信息
      });
    } else {
      console.log("未找到用户信息");
    }
  },

  // 获取天气信息
  getWeather: function() {
    // TODO: 调用天气API获取实时天气
    this.setData({
      weather: {
        temperature: '25',
        description: '晴朗'
      }
    })
  },

  // 获取今日饮水量
  getTodayWater: function() {
    const db = wx.cloud.database()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    db.collection('water_records')
      .where({
        _openid: '{openid}',
        createTime: db.command.gte(today)
      })
      .get()
      .then(res => {
        let total = 0
        res.data.forEach(record => {
          total += record.amount
        })
        this.setData({
          todayWater: total
        })
      })
  },

  // 获取提醒设置
  getReminderSettings: function() {
    const db = wx.cloud.database()
    db.collection('users')
      .where({
        _openid: '{openid}'
      })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const user = res.data[0]
          this.setData({
            reminderEnabled: user.reminderEnabled,
            waterGoal: user.waterGoal,
            intervalIndex: this.getIntervalIndex(user.reminderInterval),
            reminderTypeIndex: user.reminderType === 'notification' ? 0 : 1
          })
        }
      })
  },

  // 添加饮水量
  addWater: function(e) {
    const amount = parseInt(e.currentTarget.dataset.amount)
    const db = wx.cloud.database()
    
    db.collection('water_records').add({
      data: {
        amount: amount,
        type: 'water',
        createTime: db.serverDate()
      }
    }).then(() => {
      this.getTodayWater()
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })
    })
  },

  // 显示自定义输入
  showCustomInput: function() {
    wx.showModal({
      title: '自定义饮水量',
      editable: true,
      placeholderText: '请输入毫升数',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseInt(res.content)
          if (!isNaN(amount) && amount > 0) {
            this.addWater({ currentTarget: { dataset: { amount: amount } } })
          } else {
            wx.showToast({
              title: '请输入有效数字',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 显示其他饮品选择
  showOtherDrinks: function() {
    wx.showActionSheet({
      itemList: ['咖啡', '茶', '果汁', '其他'],
      success: (res) => {
        // TODO: 根据饮品类型计算等效水量
        const drinkTypes = ['coffee', 'tea', 'juice', 'other']
        const ratios = [0.8, 0.9, 0.7, 0.6] // 等效水量比例
        const amount = 250 // 默认250ml
        const equivalentWater = Math.round(amount * ratios[res.tapIndex])
        
        this.addWater({ currentTarget: { dataset: { amount: equivalentWater } } })
      }
    })
  },

  // 切换提醒开关
  toggleReminder: function(e) {
    const enabled = e.detail.value
    this.setData({
      reminderEnabled: enabled
    })
    this.updateReminderSettings()
  },

  // 更改提醒间隔
  changeInterval: function(e) {
    this.setData({
      intervalIndex: e.detail.value
    })
    this.updateReminderSettings()
  },

  // 更改提醒方式
  changeReminderType: function(e) {
    this.setData({
      reminderTypeIndex: e.detail.value
    })
    this.updateReminderSettings()
  },

  // 更新提醒设置
  updateReminderSettings: function() {
    const db = wx.cloud.database()
    const interval = this.getIntervalMinutes(this.data.intervalIndex)
    const reminderType = this.data.reminderTypeIndex === 0 ? 'notification' : 'sound'

    db.collection('users')
      .where({
        _openid: '{openid}'
      })
      .update({
        data: {
          reminderEnabled: this.data.reminderEnabled,
          reminderInterval: interval,
          reminderType: reminderType,
          updateTime: db.serverDate()
        }
      })
  },

  // 获取间隔索引
  getIntervalIndex: function(minutes) {
    const intervals = [30, 60, 120]
    return intervals.indexOf(minutes)
  },

  // 获取间隔分钟数
  getIntervalMinutes: function(index) {
    const intervals = [30, 60, 120]
    return intervals[index] || 60
  }
})
