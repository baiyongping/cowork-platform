const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 获取云存储文件的临时下载链接
 * 这些链接自带CORS配置,可以在前端直接使用
 */
exports.main = async (event) => {
  const { fileID, fileList } = event;

  try {
    // 支持单个文件或文件列表
    const files = fileList || (fileID ? [fileID] : []);
    
    if (files.length === 0) {
      return {
        success: false,
        message: '请提供fileID或fileList参数'
      };
    }

    // 获取临时下载链接
    const result = await cloud.getTempFileURL({
      fileList: files,
      maxAge: 7200 // 2小时有效期
    });

    return {
      success: true,
      fileList: result.fileList
    };
  } catch (error) {
    console.error('获取文件URL失败:', error);
    return {
      success: false,
      message: error.message || '获取文件URL失败'
    };
  }
};
