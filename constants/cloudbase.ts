/**
 * CloudBase 配置常量
 * 
 * 集中管理所有CloudBase相关的配置，避免硬编码
 * 支持环境变量动态配置，优先使用环境变量，否则使用默认值
 */

/**
 * CloudBase 环境ID
 * 开发环境: jihua-oa-dev-3goht9irae4d949f
 * 生产环境: cowork-9gg9oocb516be5fb
 */
export const CLOUDBASE_ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'jihua-oa-dev-3goht9irae4d949f';

/**
 * 云存储配置
 * 根据环境ID自动判断使用开发环境还是生产环境的存储桶
 */
const isProduction = CLOUDBASE_ENV_ID === 'cowork-9gg9oocb516be5fb';

const STORAGE_CONFIG = {
  development: {
    DOMAIN: '6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la',
    BUCKET: '6a69-jihua-oa-dev-3goht9irae4d949f-1301818329',
  },
  production: {
    DOMAIN: '636f-cowork-9gg9oocb516be5fb-1301818329.tcb.qcloud.la',
    BUCKET: '636f-cowork-9gg9oocb516be5fb-1301818329',
  }
};

const currentStorage = isProduction ? STORAGE_CONFIG.production : STORAGE_CONFIG.development;

export const CLOUDBASE_STORAGE = {
  /**
   * 云存储域名（包含Bucket前缀）
   * 格式: {bucket}.tcb.qcloud.la
   */
  DOMAIN: import.meta.env.VITE_STORAGE_DOMAIN?.replace('https://', '') || currentStorage.DOMAIN,
  
  /**
   * Bucket名称
   */
  BUCKET: import.meta.env.VITE_STORAGE_BUCKET || currentStorage.BUCKET,
  
  /**
   * 云存储基础URL
   */
  BASE_URL: import.meta.env.VITE_STORAGE_DOMAIN || `https://${currentStorage.DOMAIN}`,
  
  /**
   * 云存储路径前缀
   */
  PATHS: {
    AVATARS: 'avatars',      // 用户头像
    ATTACHMENTS: 'attachments', // 任务附件
    LOGOS: 'logos',          // 公司Logo
    DOCUMENTS: 'documents',  // 文档资料
  }
} as const;

/**
 * CloudBase 控制台地址
 */
export const CLOUDBASE_CONSOLE = {
  /**
   * 主控制台
   */
  BASE: `https://tcb.cloud.tencent.com/dev?envId=${CLOUDBASE_ENV_ID}`,
  
  /**
   * 数据库控制台
   */
  DATABASE: `https://tcb.cloud.tencent.com/dev?envId=${CLOUDBASE_ENV_ID}#/db/doc`,
  
  /**
   * 云存储控制台
   */
  STORAGE: `https://tcb.cloud.tencent.com/dev?envId=${CLOUDBASE_ENV_ID}#/storage`,
  
  /**
   * 云函数控制台
   */
  FUNCTIONS: `https://tcb.cloud.tencent.com/dev?envId=${CLOUDBASE_ENV_ID}#/scf`,
  
  /**
   * 设置页面
   */
  SETTINGS: `https://tcb.cloud.tencent.com/dev?envId=${CLOUDBASE_ENV_ID}#/settings`,
} as const;

/**
 * 工具函数:构造云存储公共URL
 * @param fileID - 云存储文件ID（相对路径）
 * @returns 完整的公共URL
 * 
 * @example
 * getStoragePublicURL('avatars/user_123.jpg')
 * // => 'https://{storage-domain}.tcb.qcloud.la/avatars/user_123.jpg'
 */
export function getStoragePublicURL(fileID: string): string {
  // 移除开头的斜杠（如果有）
  const cleanFileID = fileID.startsWith('/') ? fileID.slice(1) : fileID;
  return `${CLOUDBASE_STORAGE.BASE_URL}/${cleanFileID}`;
}

/**
 * 工具函数：验证是否为有效的云存储URL
 * @param url - 待验证的URL
 * @returns 是否为有效的云存储URL
 */
export function isValidStorageURL(url: string): boolean {
  if (!url) return false;
  
  // 检查是否包含正确的云存储域名
  return url.includes(CLOUDBASE_STORAGE.DOMAIN);
}

/**
 * 工具函数：从完整URL提取FileID
 * @param url - 完整的云存储URL
 * @returns FileID（相对路径）
 * 
 * @example
 * extractFileID('https://{storage-domain}.tcb.qcloud.la/avatars/user_123.jpg')
 * // => 'avatars/user_123.jpg'
 */
export function extractFileID(url: string): string | null {
  if (!isValidStorageURL(url)) return null;
  
  const baseURL = CLOUDBASE_STORAGE.BASE_URL;
  if (url.startsWith(baseURL)) {
    return url.slice(baseURL.length + 1); // +1 移除斜杠
  }
  
  return null;
}

/**
 * 工具函数：获取云存储路径
 * @param category - 路径类别
 * @param filename - 文件名
 * @returns 完整的云存储路径
 * 
 * @example
 * getStoragePath('AVATARS', 'user_123.jpg')
 * // => 'avatars/user_123.jpg'
 */
export function getStoragePath(
  category: keyof typeof CLOUDBASE_STORAGE.PATHS,
  filename: string
): string {
  return `${CLOUDBASE_STORAGE.PATHS[category]}/${filename}`;
}
