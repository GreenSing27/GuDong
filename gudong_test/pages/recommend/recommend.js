Page({
  data: {
    gender:'',
    GenderLevels: ['男', '女'],
    GenderIndex: 0,
    age:'',
    height:'',
    weight: '',
    activityLevels: ['轻度活动', '中度活动', '重度活动'],
    activityIndex: 0,
    activityText: '轻度活动',
    habit:'',
    disease:'',
    pregnant:'',
    PregnantLevels: ['没有', '经期','怀孕', '哺乳'],
    PregnantIndex: 0,
    phy:'',
    sleep:'',
    PhyLevels: ['轻松（0%-30%）', '略有压力（30%-60%）', '压力较大（60%以上）'],
    PhyIndex: 0,
    descrip: '无',
    showResult: false,
    recommendedWater: 0,
    scheduleList: [],
    advice: '',
    loading: false
  },
  
  async getWaterAdvice() {
    //数据准备
    const weight = this.data.weight;
    const gender = this.data.GenderLevels[this.data.GenderIndex];
    const age = this.data.age;
    const height = this.data.height;
    const activityText = this.data.activityLevels[this.data.activityIndex];
    const habit = this.data.habit;
    const disease = this.data.disease;
    const pregnant = this.data.PregnantLevels[this.data.PregnantIndex];
    const sleep = this.data.sleep;
    const phy = this.data.PhyLevels[this.data.PhyIndex];
    const descrip = this.data.descrip;
    this.setData({ gender: gender, advice: '' });
    this.setData({ activityText: activityText, advice: '' });
    this.setData({ pregant: pregnant, advice: '' });
    this.setData({ phy: phy, advice: '' });
    if (!age || isNaN(age) || age<=0) {
      wx.showToast({ title: '请输入有效的年龄', icon: 'none' });
      return;
    }
    if (!height || isNaN(height) || height<=0 || height>300) {
      wx.showToast({ title: '请输入有效的身高', icon: 'none' });
      return;
    }
    if (!weight || isNaN(weight)) {
      wx.showToast({ title: '请输入有效的体重', icon: 'none' });
      return;
    }
    console.log('最终提示词：', `基于以下信息提供每日饮水量建议：性别：${gender}，年龄：${age}，身高：${height}cm，体重：${weight}kg，活动水平：${activityText}，饮食习惯：${habit}，慢性病：${disease}，${pregnant}，睡眠情况${sleep}，心理压力水平${phy}，其他信息：${descrip}`);
    this.setData({ loading: true, advice: '' });
    
    //构建模型开始处理
    const model = wx.cloud.extend.AI.createModel("deepseek");
    //prompt
    const systemPrompt = "你是一个健康专家，请根据用户的信息给出日常饮水建议。包括饮水量等等。请注意，请用纯文本格式输出，不要使用任何 Markdown 符号（如 #、**、| 等），可以用emoji数字标题代替。你还可以适当配上一些emoji表情";
    const userInput = `基于以下信息提供每日饮水量建议：性别：${gender}，年龄：${age}，身高：${height}cm，体重：${weight}kg，活动水平：${activityText}，饮食习惯：${habit}，慢性病：${disease}，${pregnant}，睡眠情况${sleep}，心理压力水平${phy}，其他信息：${descrip}`;
    //接收返回
    const res = await model.streamText({
      data: {
        model: "deepseek-r1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
      },
    });
    let advice = '';
    let result = await res.textStream.next();
    while (!result.done) {  //流式输出所以要一直累加
      advice += result.value;
      console.log(result.value);
      result = await res.textStream.next();
    }
    this.setData({ loading: false });
    this.setData({ advice });
  },
  
  onGender(e) {
    this.setData({
      GenderIndex: e.detail.value,
    })
  },
  onAge(e) {
    this.setData({
      age: e.detail.value
    })
  },
  onHeight(e) {
    this.setData({
      height: e.detail.value
    })
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
  onHabit(e) {
    this.setData({
      habit: e.detail.value
    })
  },
  onDisease(e) {
    this.setData({
      disease: e.detail.value
    })
  },
  onPregnant(e) {
    this.setData({
      PregnantIndex: e.detail.value
    })
  },
  onSleep(e) {
    this.setData({
      sleep: e.detail.value
    })
  },
  onPhy(e) {
    this.setData({
      PhyIndex: e.detail.value
    })
  },
  onDescrip(e) {
    this.setData({
      descrip: e.detail.value
    })
  },

  // // 点击按钮获取建议：云函数版
  // getWaterAdvice1() {
  //   const weight = this.data.weight;
  //   const activityText = this.data.activityLevels[this.data.activityIndex];
  //   const descrip = this.data.descrip;
  //   this.setData({ activityText: activityText, advice: '' });
  //   if (!weight || isNaN(weight)) {
  //     wx.showToast({ title: '请输入有效的体重', icon: 'none' });
  //     return;
  //   }
  //   console.log('最终提示词：', `基于以下信息提供每日饮水量建议：体重${weight}kg，活动水平为${activityText}，其他信息：${descrip}`);
  //   this.setData({ loading: true, advice: '' });
    
  //   wx.cloud.callFunction({
  //     name: 'callDeepSeek',
  //     data: {
  //       userInput: `基于以下信息提供每日饮水量建议：体重${weight}kg，活动水平为${activityText}，其他信息：${descrip}`
  //     },
  //     success: (res) => {
  //       console.log('饮水建议:', res.result);
  //       this.setData({ advice: res.result });
  //     },
  //     fail: (err) => {
  //       console.error('调用失败:', err);
  //       wx.showToast({ title: '请求失败，请重试', icon: 'none' });
  //     },
  //     complete: () => {
  //       this.setData({ loading: false });
  //     }
  //   });
  // },
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