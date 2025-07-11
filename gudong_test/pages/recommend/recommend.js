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
  
  // 主函数
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
  
  // 获取信息
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
  }
}) 