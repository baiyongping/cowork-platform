import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { app } from '../../lib/cloudbase';

/**
 * 微信扫码绑定 - 授权页面
 * 
 * 功能：
 * 1. 检测是否在微信浏览器中
 * 2. 获取微信授权 URL
 * 3. 自动跳转到微信授权页面
 */
export function WechatBind() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. 获取场景ID
        const sceneId = searchParams.get('scene');
        if (!sceneId) {
          setError('无效的绑定链接');
          setLoading(false);
          return;
        }

        // 2. 检查是否在微信浏览器中
        const ua = navigator.userAgent.toLowerCase();
        const isWeChat = ua.includes('micromessenger');
        
        if (!isWeChat) {
          setError('请在微信中打开此链接');
          setLoading(false);
          return;
        }

        // 3. 检查是否从微信回调返回（携带 code 参数）
        const code = searchParams.get('code');
        if (code) {
          // 已授权，跳转到确认绑定页面
          navigate(`/wechat-bind-confirm?scene=${sceneId}&code=${code}`);
          return;
        }

        // 4. 获取微信授权 URL
        const result = await app.callFunction({
          name: 'wechat-oauth',
          data: {
            action: 'getAuthUrl',
            redirectUri: `${window.location.origin}/wechat-bind?scene=${sceneId}`,
            scope: 'snsapi_login' // ✅ 修正：微信开放平台-网站应用使用 snsapi_login
          }
        });

        if (!result.result?.success) {
          throw new Error(result.result?.error || '获取授权链接失败');
        }

        // 5. 跳转到微信授权页面
        const authUrl = result.result.data.authUrl;
        console.log('🔗 跳转到微信授权页面:', authUrl);
        window.location.href = authUrl;

      } catch (err: any) {
        console.error('❌ 授权失败:', err);
        setError(err.message || '授权失败，请稍后重试');
        setLoading(false);
      }
    };

    initAuth();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">绑定失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">正在跳转微信授权</h2>
        <p className="text-gray-600">请稍候...</p>
      </div>
    </div>
  );
}
