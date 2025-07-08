Page({
  data: {
    article: null,
    relatedArticles: []
  },

  onLoad: function (options) {
    if (options.id) {
      this.getArticleDetail(options.id)
    }
  },

  // 获取文章详情
  getArticleDetail: function (id) {
    const db = wx.cloud.database()
    db.collection('articles')
      .doc(id)
      .get()
      .then(res => {
        let article = res.data

        // 格式化时间
        if (article.createTime) {
          article.createTime = this.formatDate(new Date(article.createTime))
        }

        // 临时图处理
        if (article.image && article.image.startsWith('cloud://')) {
          wx.cloud.getTempFileURL({
            fileList: [article.image],
            success: tempRes => {
              article.image = tempRes.fileList[0]?.tempFileURL || '/images/default_article.png'
              this.setData({ article })
            },
            fail: err => {
              console.error('主图转换失败：', err)
              this.setData({ article })
            }
          })
        } else {
          this.setData({ article })
        }

        // 获取相关文章
        this.getRelatedArticles(article.category, article._id)
      })
      .catch(err => {
        console.error('获取文章详情失败：', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 获取相关文章
  getRelatedArticles: function (category, currentId) {
    const db = wx.cloud.database()
    db.collection('articles')
      .where({
        category,
        _id: db.command.neq(currentId)
      })
      .limit(3)
      .get()
      .then(res => {
        const articles = res.data
        const imageList = articles.map(item => item.image || '')

        wx.cloud.getTempFileURL({
          fileList: imageList,
          success: tempRes => {
            const related = articles.map((item, index) => ({
              ...item,
              image: tempRes.fileList[index]?.tempFileURL || '/images/default_article.png'
            }))
            this.setData({ relatedArticles: related })
          },
          fail: err => {
            console.error('相关推荐图片获取失败', err)
            this.setData({ relatedArticles: articles })
          }
        })
      })
      .catch(err => {
        console.error('相关推荐获取失败', err)
      })
  },

  // 日期格式化
  formatDate: function (date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 跳转文章
  navigateToArticle: function (e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.redirectTo({
        url: `/pages/article/article?id=${id}`
      })
    }
  },

  // 分享
  onShareAppMessage: function () {
    const article = this.data.article || {}
    return {
      title: article.title || '健康科普文章',
      path: `/pages/article/article?id=${article._id || ''}`,
      imageUrl: article.image || ''
    }
  }
})
