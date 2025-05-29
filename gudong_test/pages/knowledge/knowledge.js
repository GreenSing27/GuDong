Page({
  data: {
    drinkList: [],
    articleList: [],
    showDrinkDetail: false,
    currentDrink: null
  },

  onLoad: function() {
    this.getDrinkList()
    this.getArticleList()
  },

  // 获取饮品列表
  getDrinkList: function() {
    const db = wx.cloud.database()
    db.collection('drink_recipes')
      .limit(10)
      .get()
      .then(res => {
        this.setData({
          drinkList: res.data
        })
      })
  },

  // 获取文章列表
  getArticleList: function() {
    const db = wx.cloud.database()
    db.collection('articles')
      .orderBy('createTime', 'desc')
      .limit(10)
      .get()
      .then(res => {
        this.setData({
          articleList: res.data
        })
      })
  },

  // 显示饮品详情
  showDrinkDetail: function(e) {
    const id = e.currentTarget.dataset.id
    const drink = this.data.drinkList.find(item => item._id === id)
    
    if (drink) {
      this.setData({
        showDrinkDetail: true,
        currentDrink: drink
      })
    }
  },

  // 隐藏饮品详情
  hideDrinkDetail: function() {
    this.setData({
      showDrinkDetail: false,
      currentDrink: null
    })
  },

  // 显示文章详情
  showArticleDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    })
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    Promise.all([
      this.getDrinkList(),
      this.getArticleList()
    ]).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '健康饮水知识库',
      path: '/pages/knowledge/knowledge'
    }
  }
}) 