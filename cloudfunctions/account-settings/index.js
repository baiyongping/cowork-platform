// 账号设置云函数 - 专门处理个人账号信息更新
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { userId, field, value } = event;
  
  try {
    // 验证参数
    if (!userId || !field || value === undefined) {
      return {
        success: false,
        message: '缺少必要参数'
      };
    }

    // 允许修改的字段白名单
    const allowedFields = ['name', 'phone', 'email', 'department', 'position', 'nickname', 'signature'];
    if (!allowedFields.includes(field)) {
      return {
        success: false,
        message: '不允许修改此字段'
      };
    }

    // 构建更新数据
    const updateData = {
      [field]: value,
      updatedAt: new Date()
    };

    // 更新数据库
    await db.collection('users').doc(userId).update({
      data: updateData
    });

    console.log(`账号设置更新成功 - 用户: ${userId}, 字段: ${field}`);
    
    return {
      success: true,
      message: '保存成功'
    };
  } catch (error) {
    console.error('账号设置更新失败:', error);
    return {
      success: false,
      message: error.message || '保存失败，请稍后重试'
    };
  }
};
