Page({
  data: {
    drinkList: [], // 初始化为空数组，等待从云数据库加载
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
      .limit(12)
      .get()
      .then(res => {
        const rawDrinks = res.data
        const imageFileIDs = rawDrinks.map(item => item.image)
  
        wx.cloud.getTempFileURL({
          fileList: imageFileIDs,
          success: tempRes => {
            const drinkListWithURL = rawDrinks.map((item, index) => {
              return {
                ...item,
                image: tempRes.fileList[index].tempFileURL
              }
            })
  
            this.setData({
              drinkList: drinkListWithURL
            })
          },
          fail: err => {
            console.error('获取饮品图片失败：', err)
          }
        })
      })
      .catch(err => {
        console.error('获取饮品列表失败：', err)
      })
  },

  // 获取文章列表
  getArticleList: function () {
    const db = wx.cloud.database();
    db.collection('articles')
      .orderBy('createTime', 'desc')
      .limit(10)
      .get()
      .then(res => {
        const rawArticles = res.data;
  
        // 收集所有 cloud:// 开头的 image 路径
        const cloudImagePaths = rawArticles.map(item => item.image);
  
        // 调用 wx.cloud.getTempFileURL 获取 HTTPS 临时地址
        wx.cloud.getTempFileURL({
          fileList: cloudImagePaths,
          success: tempRes => {
            // 合并临时图片链接回文章数据
            const articleListWithURL = rawArticles.map((item, index) => {
              return {
                ...item,
                image: tempRes.fileList[index].tempFileURL // 替换原来的 image 字段
              };
            });
  
            this.setData({
              articleList: articleListWithURL
            });
          },
          fail: err => {
            console.error('获取文章图片失败：', err);
          }
        });
      })
      .catch(err => {
        console.error('获取文章列表失败：', err);
      });
  },
  
  // 显示饮品详情
  showDrinkDetail: function(e) {
    const id = e.currentTarget.dataset.id
    const drink = this.data.drinkList.find(item => item.id === id)
    
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
  navigateToArticle: function(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      console.error('navigateToArticle：ID为空！')
      return
    }
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    })
  }
  ,

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
      title: '咕咚咕咚 - 你的饮水健康助手',
      path: '/pages/knowledge/knowledge'
    }
  },

  showIconDetail(e) {
    const text = e.currentTarget.dataset.text;
    wx.showToast({
      title: `你点击了【${text}】配方`,
      icon: 'none'
    })
  }


});