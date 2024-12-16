// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'env-4g1ntkl49ecb51e7'
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}