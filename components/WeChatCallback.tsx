import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { app } from '../lib/cloudbase';

export default function WeChatCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在处理微信登录...');

  useEffect(() => {
    handleWeChatCallback();
  }, []);

  const handleWeChatCallback = async () => {
    try {
      // 1. 从 URL 获取微信返回的 code 参数
      const urlParams = new URLSearchParams(window.location.search);
      const provider_code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!provider_code) {
        throw new Error('未获取到微信授权码');
      }

      console.log('微信授权码:', provider_code);
      console.log('状态参数:', state);

      const auth = app.auth();

      // 2. 用 code 换取 provider_token
      setMessage('正在获取微信账号信息...');
      const { provider_token } = await auth.grantProviderToken({
        provider_id: 'wx_open',
        provider_redirect_uri: window.location.href, // 当前完整URL
        provider_code,
      });

      console.log('获取到 provider_token');

      // 3. 使用 provider_token 登录 CloudBase
      setMessage('正在登录系统...');
      await auth.signInWithProvider({ provider_token });

      console.log('微信登录成功');

      // 4. 获取当前用户信息
      const user = await auth.getCurrentUser();
      console.log('当前用户:', user);

      setStatus('success');
      setMessage('登录成功，正在跳转...');

      // 5. 延迟跳转到主页
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (error) {
      console.error('微信登录失败:', error);
      setStatus('error');
      setMessage(
        error instanceof Error 
          ? `登录失败: ${error.message}` 
          : '登录失败，请重试'
      );

      // 3秒后跳转回登录页
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* 状态图标 */}
        <div className="mb-6">
          {status === 'loading' && (
            <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          )}
        </div>

        {/* 状态标题 */}
        <h2 className="text-2xl font-bold mb-4">
          {status === 'loading' && '微信登录中'}
          {status === 'success' && '登录成功'}
          {status === 'error' && '登录失败'}
        </h2>

        {/* 状态消息 */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* 错误情况下显示返回按钮 */}
        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回登录页
          </button>
        )}
      </div>
    </div>
  );
}
