import React, { useState } from 'react';
import { Smartphone, CheckCircle, XCircle, Scan, Loader2 } from 'lucide-react';
import { app } from '../lib/cloudbase';

interface WechatScanSimulatorProps {
  onClose?: () => void;
}

export default function WechatScanSimulator({ onClose }: WechatScanSimulatorProps) {
  const [sceneId, setSceneId] = useState('');
  const [action, setAction] = useState<'bind' | 'login'>('bind');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'confirming' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [savedOpenid, setSavedOpenid] = useState<string>(() => {
    // 从 localStorage 读取已保存的 openid
    return localStorage.getItem('wechat_test_openid') || '';
  });

  // 模拟扫码
  const handleScan = async () => {
    if (!sceneId.trim()) {
      setMessage('请输入Scene ID');
      return;
    }

    setStatus('scanning');
    setMessage('扫码中...');

    try {
      // 模拟扫码延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('confirming');
      setMessage('请确认操作');
    } catch (error) {
      setStatus('error');
      setMessage('扫码失败');
    }
  };

  // 确认绑定/登录
  const handleConfirm = async () => {
    try {
      setStatus('confirming');
      setMessage('处理中...');

      const functionName = action === 'bind' ? 'wechat-bind' : 'wechat-login';
      const actionName = action === 'bind' ? 'confirmBind' : 'confirmLogin';

      // 获取 openid
      let openid = savedOpenid;
      
      if (action === 'bind' && !openid) {
        // 绑定操作：生成新的 openid
        openid = 'simulated_openid_' + Math.random().toString(36).substr(2, 16);
        console.log('🔧 生成新的模拟OpenID:', openid);
      } else if (action === 'login' && !openid) {
        // 登录操作但没有保存的 openid
        setStatus('error');
        setMessage('请先进行绑定操作！未找到已绑定的微信账号');
        return;
      }

      const res = await app.callFunction({
        name: functionName,
        data: {
          action: actionName,
          sceneId,
          openid
        }
      });

      if (res.result.code === 200) {
        setStatus('success');
        
        if (action === 'bind') {
          // 绑定成功：保存 openid 和返回的 wechatOpenId
          const wechatOpenId = res.result.data?.wechatOpenId || openid;
          localStorage.setItem('wechat_test_openid', wechatOpenId);
          setSavedOpenid(wechatOpenId);
          setMessage(`绑定成功! OpenID: ${wechatOpenId.substring(0, 20)}...`);
          console.log('✅ 绑定成功，已保存OpenID:', wechatOpenId);
        } else {
          // 登录成功
          setMessage('登录成功!');
          console.log('✅ 登录成功，使用OpenID:', openid);
        }
        
        // 3秒后关闭
        setTimeout(() => {
          handleReset();
          onClose?.();
        }, 3000);
      } else {
        setStatus('error');
        setMessage(res.result.message || '操作失败');
      }
    } catch (error: any) {
      console.error('确认失败:', error);
      setStatus('error');
      setMessage(error.message || '操作失败');
    }
  };

  // 重置
  const handleReset = () => {
    setSceneId('');
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 顶部 - 模拟手机状态栏 */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-white" />
              <span className="text-white font-semibold">微信扫码模拟器</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          {/* 操作类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择操作类型
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAction('bind')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  action === 'bind'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={status !== 'idle'}
              >
                绑定微信
              </button>
              <button
                onClick={() => setAction('login')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  action === 'login'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={status !== 'idle'}
              >
                微信登录
              </button>
            </div>
          </div>

          {/* Scene ID 输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scene ID
            </label>
            <input
              type="text"
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              placeholder="粘贴或输入Scene ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={status !== 'idle'}
            />
            <p className="mt-1 text-xs text-gray-500">
              从PC端二维码中获取的Scene ID (例如: bind_xxx 或 login_xxx)
            </p>
          </div>

          {/* 状态显示 */}
          {message && (
            <div className={`p-3 rounded-lg ${
              status === 'success' ? 'bg-green-50 text-green-700' :
              status === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                {status === 'scanning' && <Loader2 className="h-5 w-5 animate-spin" />}
                {status === 'confirming' && <Loader2 className="h-5 w-5 animate-spin" />}
                {status === 'success' && <CheckCircle className="h-5 w-5" />}
                {status === 'error' && <XCircle className="h-5 w-5" />}
                <span className="font-medium">{message}</span>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {status === 'idle' && (
              <button
                onClick={handleScan}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                disabled={!sceneId.trim()}
              >
                <Scan className="h-5 w-5" />
                <span>模拟扫码</span>
              </button>
            )}

            {status === 'confirming' && (
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CheckCircle className="h-5 w-5" />
                <span>确认{action === 'bind' ? '绑定' : '登录'}</span>
              </button>
            )}

            {(status === 'success' || status === 'error') && (
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                重新开始
              </button>
            )}
          </div>

          {/* 使用说明 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">📖 使用说明</p>
            
            {/* 显示已保存的 OpenID 状态 */}
            {savedOpenid && (
              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <p className="text-green-700 font-medium">✅ 已绑定微信账号</p>
                <p className="text-green-600 mt-1 break-all">
                  OpenID: {savedOpenid.substring(0, 30)}...
                </p>
              </div>
            )}
            
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li><strong>首次使用</strong>: 先执行"绑定微信"操作</li>
              <li>在PC端生成二维码，获取Scene ID</li>
              <li>将Scene ID粘贴到上方输入框</li>
              <li>选择操作类型（绑定或登录）</li>
              <li>点击"模拟扫码"按钮</li>
              <li>确认操作完成</li>
              <li><strong>后续测试</strong>: 可直接使用"微信登录"</li>
            </ol>
            
            {savedOpenid && (
              <button
                onClick={() => {
                  if (confirm('确定要清除已保存的测试账号吗？')) {
                    localStorage.removeItem('wechat_test_openid');
                    setSavedOpenid('');
                    setMessage('已清除测试账号');
                  }
                }}
                className="mt-3 w-full py-2 px-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
              >
                🗑️ 清除测试账号（重新测试绑定）
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
