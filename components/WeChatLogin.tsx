import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { app } from '../lib/cloudbase';

interface WeChatLoginProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function WeChatLogin({ onSuccess, onError }: WeChatLoginProps) {
  const [loading, setLoading] = useState(false);

  const handleWeChatLogin = async () => {
    setLoading(true);
    
    try {
      const auth = app.auth();
      
      // 生成微信授权地址
      const { uri } = await auth.genProviderRedirectUri({
        provider_id: 'wx_open',
        // 授权回调地址（微信授权后会跳转到这个地址）
        provider_redirect_uri: `${window.location.origin}/wechat-callback`,
        // 自定义状态参数（可选，用于防止CSRF攻击）
        state: `wechat_login_${Date.now()}`,
      });

      console.log('微信授权地址:', uri);
      
      // 跳转到微信授权页面
      window.location.href = uri;
    } catch (error) {
      console.error('生成微信授权地址失败:', error);
      setLoading(false);
      onError?.(error as Error);
    }
  };

  return (
    <button
      onClick={handleWeChatLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <MessageCircle className="w-5 h-5" />
      <span>{loading ? '跳转中...' : '微信扫码登录'}</span>
    </button>
  );
}
