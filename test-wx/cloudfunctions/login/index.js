// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    envId: wxContext.ENV,
    message: '云环境配置正确！当前环境: jihua-oa-dev-3goht9irae4d949f'
  };
};
