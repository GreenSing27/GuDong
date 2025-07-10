const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取当前时间（格式化为两位数）
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const currentHM = `${hours}:${minutes}`
    
    console.log('定时触发执行，当前时间:', currentHM)

    // 查询所有开启了提醒的用户
    const usersRes = await db.collection('users')
      .where({
        reminderEnabled: true
      })
      .get()

    console.log(`找到 ${usersRes.data.length} 位开启了提醒的用户`)
    
    if (usersRes.data.length === 0) {
      console.log('⚠️ 当前没有需要提醒的用户')
      return { success: true, message: 'No users to remind' }
    }

    // 处理所有需要提醒的用户
    const tasks = usersRes.data.map(async user => {
      const openid = user._openid
      
      // 检查当前时间是否在用户的提醒时间列表中
      if (!user.reminderTimes || !user.reminderTimes.includes(currentHM)) {
        console.log(`用户 ${openid} 在 ${currentHM} 没有提醒设置`)
        return null
      }
      
      console.log(`>> 匹配成功，准备提醒 ${openid} | 设置时间: ${currentHM}`)

      // 获取今天饮水数据
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      try {
        const waterRes = await db.collection('water_records')
          .where({
            _openid: openid,
            createTime: db.command.gte(today)
          })
          .get()

        const total = waterRes.data.reduce((sum, item) => sum + (item.amount || 0), 0)
        console.log(`用户 ${openid} 今日饮水总量 ${total}ml`)

        // 确保值符合微信订阅消息的格式要求
        const valueForChar3 = total > 0 ? `${total}ml` : '0ml'

        // 发送订阅消息
        try {
          const res = await cloud.openapi.subscribeMessage.send({
            touser: openid,
            data: {
              thing1: { value: '喝水提醒' },
              character_string3: { value: valueForChar3 },  // 使用有效格式
              time6: { value: currentHM },  // 使用当前时间
            },
            templateId: '2g8c_YneDq3CvpFlg5Rp9S-v0p4ptYavgLlZWGwauO4',
            page: 'pages/index/index',
            miniprogramState: 'developer'
          })
          
          // 输出推送接口返回的详细信息
          console.log('推送结果:', res)

          if (res.errCode === 0) {
            console.log(`提醒成功，用户 ${openid} 收到提醒`)
            return { success: true, openid }
          } else {
            console.error(`提醒失败，错误码: ${res.errCode}, 错误信息: ${res.errMsg}`)
            return { success: false, openid, error: res.errMsg }
          }
        } catch (err) {
          console.error(`提醒用户 ${openid} 失败`, err)
          return { success: false, openid, error: err.message }
        }
      } catch (err) {
        console.error(`获取用户 ${openid} 的饮水数据失败`, err)
        return { success: false, openid, error: err.message }
      }
    })

    // 过滤掉null值（不匹配的用户）
    const validTasks = tasks.filter(task => task !== null)
    const results = await Promise.all(validTasks)
    const successCount = results.filter(r => r && r.success).length
    
    return { 
      success: true,
      totalUsers: validTasks.length,
      successCount,
      results
    }
  } catch (err) {
    console.error('处理过程中出错:', err)
    return { 
      success: false, 
      error: err.message,
      errorCode: 'PROCESSING_ERROR'
    }
  }
}