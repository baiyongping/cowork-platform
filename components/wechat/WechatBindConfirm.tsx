import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, User, Briefcase } from 'lucide-react';
import { app } from '../../lib/cloudbase';

interface BindingInfo {
  userName: string;
  username: string;  // ✅ 添加登录用户名
  department: string;
  position: string;
  wechatNickname?: string;
  wechatAvatar?: string;
}

/**
 * 微信扫码绑定 - 确认页面
 * 
 * 功能：
 * 1. 用 code 换取 openid
 * 2. 查询场景信息（员工信息）
 * 3. 展示绑定信息，用户确认
 * 4. 确认后调用绑定接口
 */
export function WechatBindConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindingInfo, setBindingInfo] = useState<BindingInfo | null>(null);
  const [openid, setOpenid] = useState<string>('');

  useEffect(() => {
    const initBindingInfo = async () => {
      try {
        const sceneId = searchParams.get('scene');
        const code = searchParams.get('code');

        if (!sceneId || !code) {
          setError('无效的绑定链接');
          setLoading(false);
          return;
        }

        // 1. 用 code 换取 openid
        console.log('🔑 获取 OpenID...');
        const oauthResult = await app.callFunction({
          name: 'wechat-oauth',
          data: {
            action: 'getOpenId',
            code
          }
        });

        if (!oauthResult.result?.success) {
          throw new Error(oauthResult.result?.error || '获取微信信息失败');
        }

        const { openid: userOpenid, nickname, headimgurl } = oauthResult.result.data;
        setOpenid(userOpenid);
        console.log('✓ 获取 OpenID 成功:', userOpenid);

        // 2. 查询场景信息
        console.log('📄 查询绑定信息...');
        const sceneResult = await app.callFunction({
          name: 'wechat-bind',
          data: {
            action: 'getSceneInfo',
            sceneId
          }
        });

        if (!sceneResult.result?.success) {
          throw new Error(sceneResult.result?.error || '获取绑定信息失败');
        }

        const sceneData = sceneResult.result.data;
        setBindingInfo({
          userName: sceneData.userName,
          username: sceneData.username,  // ✅ 保存登录用户名
          department: sceneData.department,
          position: sceneData.position,
          wechatNickname: nickname,
          wechatAvatar: headimgurl
        });

        console.log('✓ 获取绑定信息成功:', sceneData);
        setLoading(false);

      } catch (err: any) {
        console.error('❌ 初始化失败:', err);
        setError(err.message || '初始化失败，请稍后重试');
        setLoading(false);
      }
    };

    initBindingInfo();
  }, [searchParams]);

  const handleConfirmBind = async () => {
    try {
      setBinding(true);
      const sceneId = searchParams.get('scene');

      console.log('🔗 确认绑定...', { sceneId, openid });

      const result = await app.callFunction({
        name: 'wechat-bind',
        data: {
          action: 'confirmBind',
          sceneId,
          openid
        }
      });

      if (!result.result?.success) {
        throw new Error(result.result?.error || '绑定失败');
      }

      console.log('✓ 绑定成功');
      
      // 跳转到成功页面
      navigate('/wechat-bind-success');

    } catch (err: any) {
      console.error('❌ 绑定失败:', err);
      setError(err.message || '绑定失败，请稍后重试');
      setBinding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">加载中</h2>
          <p className="text-gray-600">正在获取绑定信息...</p>
        </div>
      </div>
    );
  }

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
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">确认绑定</h2>
          <p className="text-gray-600">请确认以下信息是否正确</p>
        </div>

        {/* 微信信息 */}
        {bindingInfo?.wechatAvatar && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src={bindingInfo.wechatAvatar} 
                alt="微信头像"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="text-sm text-gray-500">微信昵称</div>
                <div className="font-medium text-gray-900">
                  {bindingInfo.wechatNickname || '微信用户'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 绑定箭头 */}
        <div className="flex justify-center mb-6">
          <div className="text-gray-400">↓</div>
        </div>

        {/* 员工信息 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600">姓名</div>
              <div className="font-medium text-gray-900">{bindingInfo?.userName}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                登录账号: {bindingInfo?.username}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">部门 / 职位</div>
              <div className="font-medium text-gray-900">
                {bindingInfo?.department} / {bindingInfo?.position}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => window.close()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={binding}
          >
            取消
          </button>
          <button
            onClick={handleConfirmBind}
            disabled={binding}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {binding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                绑定中...
              </>
            ) : (
              '确认绑定'
            )}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>绑定后可使用微信扫码登录</p>
        </div>
      </div>
    </div>
  );
}
