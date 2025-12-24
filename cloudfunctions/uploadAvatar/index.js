const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  try {
    // 在函数内部初始化,确保环境变量已加载
    const app = cloudbase.init({
      env: cloudbase.parseContext(context).TCB_ENV
    });
    
    const { fileContent, fileName, userId } = event;
    
    console.log('📤 [uploadAvatar] 开始上传头像, userId:', userId, ', fileName:', fileName);
    
    if (!fileContent || !fileName) {
      return {
        success: false,
        message: '缺少文件内容或文件名'
      };
    }
    
    // 生成唯一的文件名(用户ID + 时间戳 + 原文件名)
    const timestamp = Date.now();
    const cloudPath = `avatars/${userId}_${timestamp}_${fileName}`;
    
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    console.log('📁 cloudPath:', cloudPath, ', buffer size:', buffer.length);
    
    // 使用 app.uploadFile() 直接上传
    const result = await app.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    });
    
    console.log('✅ 头像上传成功:', result);
    
    // 获取临时访问链接
    const tempURLResult = await app.getTempFileURL({
      fileList: [result.fileID]
    });
    
    const tempFileURL = tempURLResult.fileList[0]?.tempFileURL || '';
    
    return {
      success: true,
      fileID: result.fileID,
      tempFileURL: tempFileURL,
      message: '上传成功'
    };
  } catch (error) {
    console.error('❌ 上传头像失败:', error);
    return {
      success: false,
      message: error.message || '上传失败'
    };
  }
};
