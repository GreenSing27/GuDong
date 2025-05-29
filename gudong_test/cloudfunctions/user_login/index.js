// // 云函数入口文件
// const cloud = require('wx-server-sdk')
 
// cloud.init({
//   env: cloud.DYNAMIC_CURRENT_ENV
// })
 
// 云函数入口函数
// exports.main = async (event, context) => {
//   try {
//     const wxContext = cloud.getWXContext()
    
//     return {
//       event,
//       openid: wxContext.OPENID,
//       appid: wxContext.APPID,
//       unionid: wxContext.UNIONID,
//     }
//   } catch (err) {
//     console.error(err)
//     return {
//       error: err.message
//     }
//   }
// }
// exports.main = async (event, context) => {
//   const wxContext = cloud.getWXContext()
//   const db = cloud.database()
//   const openid = wxContext.OPENID
//   const userInfo = event.userInfo || {}

//   try {
//     const userRes = await db.collection('users')
//       .where({ _openid: openid })
//       .limit(1)
//       .get()

//     if (userRes.data.length > 0) {
//       // 更新已有用户
//       await db.collection('users')
//         .where({ _openid: openid })
//         .update({
//           data: {
//             ...userInfo,
//             updateTime: db.serverDate()
//           }
//         })
//     } else {
//       // 添加新用户
//       await db.collection('users').add({
//         data: {
//           _openid: openid,
//           ...userInfo,
//           loginTime: db.serverDate()
//         }
//       })
//     }

//     return {
//       openid,
//       //userInfo,
//       message: '登录成功'
//     }
//   } catch (err) {
//     return {
//       error: err.message
//     }
//   }
// }
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const openid = wxContext.OPENID
  const userInfo = event.userInfo || {}

  try {
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (userRes.data.length > 0) {
      //更新已有用户
      await db.collection('users')
        .where({ _openid: openid })
        .update({
          data: {
            ...userInfo,
            updateTime: db.serverDate()
          }
        })
    } else {
      // 添加新用户
      await db.collection('users').add({
        data: {
          _openid: openid,
          ...userInfo,
          loginTime: db.serverDate()
        }
      })
    }

    // 再次获取最新用户信息
    const latest = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    return {
      openid,
      userData: latest.data[0], // 传给前端展示
      message: '登录成功'
    }

  } catch (err) {
    return { error: err.message }
  }
}
