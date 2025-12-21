/**
 * 短信服务模块
 * 用于发送各类短信通知
 */

/**
 * 短信类型
 */
export enum SmsType {
  VERIFICATION_CODE = 'verification_code',  // 验证码
  APPROVAL_SUCCESS = 'approval_success',    // 审核通过
  APPROVAL_REJECT = 'approval_reject',      // 审核拒绝
  PASSWORD_RESET = 'password_reset',        // 密码重置
}

/**
 * 短信模板
 */
const SMS_TEMPLATES = {
  [SmsType.VERIFICATION_CODE]: (code: string) => 
    `【际华协同办公】您的验证码是：${code}，5分钟内有效，请勿泄露给他人。`,
  
  [SmsType.APPROVAL_SUCCESS]: (name: string) => 
    `【际华协同办公】尊敬的${name}，您的注册申请已审核通过，现在可以登录系统了。如有疑问请联系管理员。`,
  
  [SmsType.APPROVAL_REJECT]: (name: string, reason: string) => 
    `【际华协同办公】尊敬的${name}，您的注册申请未通过审核。原因：${reason}。如有疑问请联系管理员。`,
  
  [SmsType.PASSWORD_RESET]: (newPassword: string) => 
    `【际华协同办公】您的密码已重置为：${newPassword}，请登录后及时修改。`,
};

/**
 * 短信发送结果
 */
export interface SmsResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * 发送短信（模拟）
 * 在开发环境下会在控制台输出，生产环境需要对接真实短信服务
 */
async function sendSmsSimulated(phone: string, content: string): Promise<SmsResult> {
  try {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 生成模拟的消息ID
    const messageId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      message: '短信发送成功',
      messageId
    };

  } catch (error: any) {
    console.error('短信发送失败:', error);
    return {
      success: false,
      message: error.message || '短信发送失败'
    };
  }
}

/**
 * 发送验证码短信
 */
export async function sendVerificationCodeSms(phone: string, code: string): Promise<SmsResult> {
  const content = SMS_TEMPLATES[SmsType.VERIFICATION_CODE](code);
  return sendSmsSimulated(phone, content);
}

/**
 * 发送审核通过通知
 */
export async function sendApprovalSuccessSms(phone: string, name: string): Promise<SmsResult> {
  const content = SMS_TEMPLATES[SmsType.APPROVAL_SUCCESS](name);
  return sendSmsSimulated(phone, content);
}

/**
 * 发送审核拒绝通知
 */
export async function sendApprovalRejectSms(phone: string, name: string, reason: string): Promise<SmsResult> {
  const content = SMS_TEMPLATES[SmsType.APPROVAL_REJECT](name, reason);
  return sendSmsSimulated(phone, content);
}

/**
 * 发送密码重置通知
 */
export async function sendPasswordResetSms(phone: string, newPassword: string): Promise<SmsResult> {
  const content = SMS_TEMPLATES[SmsType.PASSWORD_RESET](newPassword);
  return sendSmsSimulated(phone, content);
}

/**
 * 批量发送短信
 */
export async function sendBatchSms(
  phones: string[], 
  getContent: (phone: string) => string
): Promise<{ total: number; success: number; failed: number; results: SmsResult[] }> {
  const results: SmsResult[] = [];
  let success = 0;
  let failed = 0;

  for (const phone of phones) {
    const content = getContent(phone);
    const result = await sendSmsSimulated(phone, content);
    results.push(result);
    
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return {
    total: phones.length,
    success,
    failed,
    results
  };
}

/**
 * 集成真实短信服务的接口（腾讯云短信示例）
 * 生产环境需要配置腾讯云短信服务
 */
export async function sendSmsViaTencentCloud(
  phone: string, 
  templateId: string, 
  params: string[]
): Promise<SmsResult> {
  // TODO: 集成腾讯云短信SDK
  // 需要配置：
  // - secretId: 腾讯云 SecretId
  // - secretKey: 腾讯云 SecretKey
  // - appId: 短信应用ID
  // - sign: 短信签名
  // - templateId: 短信模板ID
  
  console.warn('腾讯云短信服务未配置，当前使用模拟发送');
  return sendSmsSimulated(phone, `模板ID:${templateId}, 参数:${params.join(',')}`);
}

/**
 * 获取短信发送历史记录
 */
export interface SmsRecord {
  id: string;
  phone: string;
  content: string;
  type: SmsType;
  status: 'pending' | 'success' | 'failed';
  messageId?: string;
  error?: string;
  createdAt: Date;
}

// 简单的内存存储（生产环境应该存储到数据库）
const smsRecords: SmsRecord[] = [];

/**
 * 记录短信发送历史
 */
export function recordSms(record: Omit<SmsRecord, 'id' | 'createdAt'>): void {
  smsRecords.push({
    ...record,
    id: `SMS_RECORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  });
  
  // 只保留最近1000条记录
  if (smsRecords.length > 1000) {
    smsRecords.shift();
  }
}

/**
 * 查询短信发送历史
 */
export function getSmsRecords(phone?: string, limit: number = 50): SmsRecord[] {
  let records = [...smsRecords].reverse();
  
  if (phone) {
    records = records.filter(r => r.phone === phone);
  }
  
  return records.slice(0, limit);
}
