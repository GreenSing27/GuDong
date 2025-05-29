Page({
  data: {
    weight: '',
    activityLevels: ['轻度活动', '中度活动', '重度活动'],
    activityIndex: 0,
    showResult: false,
    recommendedWater: 0,
    scheduleList: []
  },

  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    })
  },

  onActivityChange(e) {
    this.setData({
      activityIndex: e.detail.value
    })
  },

  calculateRecommendation() {
    const weight = parseFloat(this.data.weight)
    const activityMultiplier = [30, 35, 40][this.data.activityIndex]
    
    // 计算推荐饮水量（ml）
    const recommendedWater = Math.round(weight * activityMultiplier)
    
    // 生成饮水时间表
    const scheduleList = this.generateSchedule(recommendedWater)
    
    this.setData({
      recommendedWater,
      scheduleList,
      showResult: true
    })
  },

  generateSchedule(totalWater) {
    const schedule = []
    const intervals = 8 // 每天8次饮水
    const baseAmount = Math.floor(totalWater / intervals)
    const remainder = totalWater % intervals
    
    // 生成时间点（从早上8点到晚上8点，每2小时一次）
    for (let i = 0; i < intervals; i++) {
      const hour = 8 + i * 2
      const amount = baseAmount + (i < remainder ? 1 : 0)
      schedule.push({
        time: `${hour}:00`,
        amount: amount
      })
    }
    
    return schedule
  },

  applyToHome() {
    const db = wx.cloud.database()
    
    // 更新用户的目标饮水量
    db.collection('users')
      .where({
        _openid: '{openid}'
      })
      .update({
        data: {
          waterGoal: this.data.recommendedWater,
          updateTime: db.serverDate()
        }
      })
      .then(() => {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        })
        
        // 返回首页
        wx.switchTab({
          url: '/pages/index/index'
        })
      })
  },

  shareResult() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShareAppMessage() {
    return {
      title: '我的每日饮水计划',
      path: '/pages/recommend/recommend',
      imageUrl: '/assets/images/share-cover.png'
    }
  }
}) 