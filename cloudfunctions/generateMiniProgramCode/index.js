const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { action, path, scene } = event;

  try {
    switch (action) {
      case 'getUnlimited':
        // 生成不限次数的小程序码（推荐）
        const result = await cloud.openapi.wxacode.getUnlimited({
          scene: scene || 'register', // 场景值
          page: path || 'pages/register/register', // 页面路径
          width: 430, // 二维码宽度
          autoColor: false, // 不自动配置线条颜色
          lineColor: {
            r: 59,
            g: 130,
            b: 246
          }, // 蓝色线条
          isHyaline: false // 不透明背景
        });

        if (result.errCode === 0) {
          // 上传到云存储
          const uploadResult = await cloud.uploadFile({
            cloudPath: `miniprogram-codes/register-${Date.now()}.png`,
            fileContent: result.buffer
          });

          // 获取临时访问链接
          const tempFileURL = await cloud.getTempFileURL({
            fileList: [uploadResult.fileID]
          });

          return {
            success: true,
            fileID: uploadResult.fileID,
            tempFileURL: tempFileURL.fileList[0].tempFileURL
          };
        } else {
          throw new Error(`生成小程序码失败: ${result.errMsg}`);
        }

      default:
        throw new Error('未知操作类型');
    }
  } catch (error) {
    console.error('generateMiniProgramCode error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
