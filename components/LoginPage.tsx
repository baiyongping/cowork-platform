import { useState, useEffect } from 'react';
import { Lock, User, Users, Phone, ArrowLeft } from 'lucide-react';
import { login, register, sendVerificationCode, resetPassword } from '../lib/auth-service';
import { initWechatLogin, handleWechatCallback } from '../lib/wechat-login-service';
import { APP_VERSION } from '../lib/version';

interface LoginPageProps {
  onLogin: (user: any, token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginMode, setLoginMode] = useState<'account' | 'qrcode'>('account'); // 登录方式
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wechatChecking, setWechatChecking] = useState(true);
  const [systemName, setSystemName] = useState('际华定制协同办公管理平台');
  const [companyLogo, setCompanyLogo] = useState<string>('/logo.png'); // 默认Logo
  
  // 扫码登录状态
  const [qrCodeData, setQrCodeData] = useState<{code: string; qrUrl: string; expireAt: number} | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  
  // 登录表单
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  // 注册表单
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    verificationCode: ''
  });
  
  // 忘记密码表单
  const [forgotForm, setForgotForm] = useState({
    phone: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [smsState, setSmsState] = useState({
    countdown: 0,
    sending: false
  });

  // 加载系统名称和Logo
  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        const cloudbase = (await import('../lib/cloudbase')).default;
        
        // 确保 CloudBase 已初始化
        if (!cloudbase) {
          console.warn('CloudBase 未初始化，使用默认系统名称');
          return;
        }
        
        const db = cloudbase.database();
        
        // 加载系统名称
        try {
          const nameResult = await db.collection('type_settings')
            .where({ type: 'systemName' })
            .get();
          
          if (nameResult.data && nameResult.data.length > 0 && nameResult.data[0].values && nameResult.data[0].values.length > 0) {
            const nameValue = nameResult.data[0].values[0];
            // 支持新旧格式
            if (typeof nameValue === 'string') {
              setSystemName(nameValue);
            } else if (nameValue && typeof nameValue === 'object' && nameValue.value) {
              setSystemName(nameValue.value);
            }
          }
        } catch (nameError) {
          console.warn('加载系统名称失败，使用默认值:', nameError);
        }
        
        // 加载公司Logo
        try {
          const logoResult = await db.collection('type_settings')
            .where({ type: 'companyLogo' })
            .get();
          
          if (logoResult.data && logoResult.data.length > 0) {
            const logoData = logoResult.data[0].values?.[0];
            if (logoData) {
              // 支持多种格式：Base64编码 或 云存储URL
              if (logoData.base64) {
                setCompanyLogo(logoData.base64);
              } else if (logoData.tempFileURL) {
                // 过滤掉微信小程序的本地文件路径 (wxfile://)
                const url = logoData.tempFileURL;
                if (url && !url.startsWith('wxfile://')) {
                  setCompanyLogo(url);
                }
              } else if (logoData.fileID) {
                // 如果只有 fileID，直接使用 CloudBase 公共 URL 格式（无需登录）
                // 格式：https://{envId}.tcb.qcloud.la/{fileID}
                const envId = 'jihua-oa-dev-3goht9irae4d949f';
                const publicURL = `https://${envId}.tcb.qcloud.la/${logoData.fileID}`;
                setCompanyLogo(publicURL);
                console.log('🔍 [LoginPage] 使用公共URL加载Logo:', publicURL);
              }
            }
          }
        } catch (logoError) {
          console.warn('加载公司Logo失败，使用默认值:', logoError);
        }
      } catch (error) {
        console.error('加载系统设置失败:', error);
        // 不影响注册流程，继续使用默认值
      }
    };

    loadSystemSettings();
  }, []);

  // 检查是否是微信登录回调
  useEffect(() => {
    const checkWechatCallback = async () => {
      try {
        // ✅ 关键修复：只在页面首次加载时检查微信回调
        // 避免在用户输入密码登录时重复检查
        const hasCheckedWechat = sessionStorage.getItem('wechat-callback-checked');
        if (hasCheckedWechat) {
          console.log('ℹ️ 已检查过微信回调，跳过');
          return;
        }
        
        setWechatChecking(true);
        const result = await handleWechatCallback();
        
        // 标记已检查
        sessionStorage.setItem('wechat-callback-checked', 'true');
        
        if (result.success && result.user && result.token) {
          // 微信登录成功(已审核通过)
          onLogin(result.user, result.token);
        } else if (result.message && result.message !== '未登录' && result.message !== '无用户信息') {
          // 显示错误或提示信息（忽略常规的"未登录"消息）
          setError(result.message);
        }
      } catch (err: any) {
        console.error('微信回调处理失败:', err);
      } finally {
        setWechatChecking(false);
      }
    };
    
    checkWechatCallback();
  }, [onLogin]);

  // 生成扫码登录二维码
  const generateQRCode = async () => {
    try {
      setError('');
      const cloudbase = (await import('../lib/cloudbase')).default;
      
      const result = await cloudbase.callFunction({
        name: 'scanLogin',
        data: {
          action: 'create'
        }
      });

      if (result.result.code === 200) {
        const { loginCode, expireAt } = result.result.data;
        const qrContent = `jihuaoa://scanlogin?code=${loginCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;
        
        setQrCodeData({
          code: loginCode,
          qrUrl: qrUrl,
          expireAt: expireAt
        });
        
        // 开始轮询
        startQRPolling(loginCode);
      } else {
        setError('生成二维码失败');
      }
    } catch (err: any) {
      setError(err.message || '生成二维码失败');
    }
  };

  // 轮询检查扫码登录状态
  const startQRPolling = (loginCode: string) => {
    setQrPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const cloudbase = (await import('../lib/cloudbase')).default;
        
        const result = await cloudbase.callFunction({
          name: 'scanLogin',
          data: {
            action: 'checkStatus',
            loginCode: loginCode
          }
        });

        if (result.result.code === 200) {
          // 登录成功
          clearInterval(pollInterval);
          setQrPolling(false);
          const { user, token } = result.result.data;
          onLogin(user, token);
        } else if (result.result.code === 410) {
          // 二维码已过期
          clearInterval(pollInterval);
          setQrPolling(false);
          setQrCodeData(null);
          setError('二维码已过期，请重新生成');
        }
      } catch (err: any) {
        console.error('轮询失败:', err);
      }
    }, 2000); // 每2秒轮询一次

    // 5分钟后自动停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      setQrPolling(false);
    }, 5 * 60 * 1000);
  };

  // 切换到扫码登录时自动生成二维码
  useEffect(() => {
    if (loginMode === 'qrcode' && !qrCodeData) {
      generateQRCode();
    }
  }, [loginMode]);

  // 微信扫码登录
  const handleWechatLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await initWechatLogin();
      // 跳转到微信扫码页面后,不会返回到这里
    } catch (err: any) {
      setError(err.message || '微信登录失败');
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(loginForm.username, loginForm.password);
      
      if (result.success && result.user && result.token) {
        onLogin(result.user, result.token);
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (type: 'register' | 'forgot' = 'register') => {
    // 获取原始手机号
    const rawPhone = type === 'register' ? registerForm.phone : forgotForm.phone;
    
    // 先检查是否输入了手机号
    if (!rawPhone || rawPhone.trim() === '') {
      setError('请先输入手机号');
      return;
    }
    
    // 验证手机号 (去除所有空格和特殊字符)
    const cleanPhone = rawPhone.trim().replace(/\s+/g, '').replace(/[^\d]/g, ''); // 只保留数字
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('请输入正确的手机号格式（11位，以13-19开头）');
      return;
    }

    setSmsState({ ...smsState, sending: true });
    setError('');

    try {
      const result = await sendVerificationCode(cleanPhone);
      if (result.success) {
        // 开始倒计时
        setSmsState({ sending: false, countdown: 60 });
        const timer = setInterval(() => {
          setSmsState(prev => {
            if (prev.countdown <= 1) {
              clearInterval(timer);
              return { sending: false, countdown: 0 };
            }
            return { ...prev, countdown: prev.countdown - 1 };
          });
        }, 1000);
      } else {
        setError(result.message || '发送验证码失败');
        setSmsState({ sending: false, countdown: 0 });
      }
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
      setSmsState({ sending: false, countdown: 0 });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 先检查是否输入了手机号
    if (!registerForm.phone || !registerForm.phone.trim()) {
      setError('请输入手机号');
      return;
    }

    // 验证手机号 (去除所有空格和特殊字符)
    const cleanPhone = registerForm.phone.trim().replace(/\s+/g, '').replace(/[^\d]/g, ''); // 只保留数字
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('请输入正确的手机号格式（11位，以13-19开头）');
      return;
    }

    // 验证验证码
    if (!registerForm.verificationCode) {
      setError('请输入验证码');
      return;
    }

    // 验证密码
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        username: registerForm.username,
        password: registerForm.password,
        name: registerForm.name || registerForm.username,
        phone: cleanPhone,
        verificationCode: registerForm.verificationCode,
        role: 'user'
      });

      if (result.success) {
        // 注册成功，提示等待审核
        setError('');
        alert('注册成功！您的账号正在等待管理员审核，审核通过后即可登录。');
        setCurrentView('login'); // 切换到登录页面
        setRegisterForm({
          username: '',
          password: '',
          confirmPassword: '',
          name: '',
          phone: '',
          verificationCode: ''
        });
      } else {
        setError(result.message || '注册失败');
      }
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 先检查是否输入了手机号
    if (!forgotForm.phone || !forgotForm.phone.trim()) {
      setError('请输入手机号');
      return;
    }

    // 验证手机号 (去除所有空格和特殊字符)
    const cleanPhone = forgotForm.phone.trim().replace(/\s+/g, '').replace(/[^\d]/g, ''); // 只保留数字
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('请输入正确的手机号格式（11位，以13-19开头）');
      return;
    }

    // 验证验证码
    if (!forgotForm.verificationCode) {
      setError('请输入验证码');
      return;
    }

    // 验证密码
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (forgotForm.newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(
        cleanPhone,
        forgotForm.verificationCode,
        forgotForm.newPassword
      );

      if (result.success) {
        setError('');
        alert('密码重置成功！请使用新密码登录。');
        setCurrentView('login'); // 切换到登录页面
        setForgotForm({
          phone: '',
          verificationCode: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(result.message || '密码重置失败');
      }
    } catch (err: any) {
      setError(err.message || '密码重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果正在检查微信回调,显示加载状态
  if (wechatChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8 relative pb-4">
          <div className="mb-4 flex justify-center">
            <img 
              src={companyLogo} 
              alt="公司Logo" 
              className="h-24 object-contain"
              onError={(e) => {
                // 如果图片加载失败，隐藏图片元素
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-blue-600 mb-2 font-bold" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
            {systemName}
          </h1>
          <p className="text-center text-red-700">高效 · 协同 · 共赢</p>
          <div className="absolute bottom-0 right-0 text-xs text-gray-400">
            v{APP_VERSION}
          </div>
        </div>

        {currentView === 'login' ? (
          // 登录表单
          <div className="space-y-6">
            {/* 登录方式切换 */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => setLoginMode('account')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  loginMode === 'account'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                账号登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('qrcode')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  loginMode === 'qrcode'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                扫码登录
              </button>
            </div>

            {loginMode === 'account' ? (
              // 账号密码登录
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">用户名</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入用户名"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">密码</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入密码"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('register');
                      setError('');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    注册账号
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('forgot');
                      setError('');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    忘记密码？
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>
            ) : (
              // 扫码登录
              <div className="flex flex-col items-center space-y-6 py-8">
                {qrCodeData ? (
                  <>
                    <div className="relative">
                      <img
                        src={qrCodeData.qrUrl}
                        alt="登录二维码"
                        className="w-64 h-64 border-4 border-blue-600 rounded-lg shadow-lg"
                      />
                      {qrPolling && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600">等待扫码...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-gray-900">请使用微信小程序扫码登录</p>
                      <p className="text-sm text-gray-600">打开"际华协同办公"小程序</p>
                      <p className="text-sm text-gray-600">点击"扫一扫"功能扫描二维码</p>
                    </div>

                    <button
                      onClick={() => {
                        setQrCodeData(null);
                        generateQRCode();
                      }}
                      className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      刷新二维码
                    </button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在生成二维码...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : currentView === 'register' ? (
          // 注册表单
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">用户名 *</label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入用户名"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">姓名</label>
              <div className="relative">
                <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入真实姓名（可选）"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">手机号 *</label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => {
                    setRegisterForm({ ...registerForm, phone: e.target.value });
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入手机号"
                  required
                  disabled={loading}
                  maxLength={11}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">验证码 *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registerForm.verificationCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, verificationCode: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入验证码"
                    required
                    disabled={loading}
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSendCode('register');
                  }}
                  disabled={loading || smsState.sending || smsState.countdown > 0}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {smsState.countdown > 0 ? `${smsState.countdown}秒后重试` : smsState.sending ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">密码 *</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入密码(至少6位)"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">确认密码 *</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请再次输入密码"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        ) : (
          // 忘记密码表单
          <div>
            <button
              type="button"
              onClick={() => {
                setCurrentView('login');
                setError('');
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">手机号 *</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={forgotForm.phone}
                    onChange={(e) => {
                      setForgotForm({ ...forgotForm, phone: e.target.value });
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入注册时使用的手机号"
                    required
                    disabled={loading}
                    maxLength={11}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">请输入您注册时使用的手机号</p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">验证码 *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={forgotForm.verificationCode}
                      onChange={(e) => setForgotForm({ ...forgotForm, verificationCode: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入验证码"
                      required
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSendCode('forgot');
                    }}
                    disabled={loading || smsState.sending || smsState.countdown > 0}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {smsState.countdown > 0 ? `${smsState.countdown}秒后重试` : smsState.sending ? '发送中...' : '发送验证码'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">新密码 *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入新密码(至少6位)"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">确认新密码 *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={forgotForm.confirmPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请再次输入新密码"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '重置中...' : '重置密码'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}