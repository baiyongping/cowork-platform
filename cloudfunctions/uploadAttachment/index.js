const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileContent, fileName, fileType } = event;
  
  try {
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    // 生成文件路径
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const cloudPath = `issues/attachments/${timestamp}-${randomStr}-${fileName}`;
    
    // 上传文件
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer,
    });
    
    // 获取临时访问链接
    const tempFileURL = await cloud.getTempFileURL({
      fileList: [result.fileID],
    });
    
    return {
      success: true,
      data: {
        fileID: result.fileID,
        cloudPath: cloudPath,
        url: tempFileURL.fileList[0].tempFileURL,
        name: fileName,
        type: fileType,
        size: buffer.length
      }
    };
  } catch (error) {
    console.error('上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
