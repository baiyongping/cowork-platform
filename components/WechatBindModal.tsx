import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import cloudbase from '../lib/cloudbase';

interface WechatBindModalProps {
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
}

export function WechatBindModal({ onClose, onSuccess }: WechatBindModalProps) {
  const [qrCodeData, setQrCodeData] = useState<{code: string; qrUrl: string; expireAt: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [showNoReminder, setShowNoReminder] = useState(false);

  // 生成绑定二维码
  const generateBindQRCode = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await cloudbase.callFunction({
        name: 'bindWxOpenId',
        data: {
          action: 'generateBindCode'
        }
      });

      if (result.result.code === 200) {
        const { bindCode, expireAt } = result.result.data;
        const qrContent = `jihuaoa://bind?code=${bindCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;
        
        setQrCodeData({
          code: bindCode,
          qrUrl: qrUrl,
          expireAt: expireAt
        });
        
        // 开始轮询
        startPolling(bindCode);
      } else {
        setError(result.result.message || '生成二维码失败');
      }
    } catch (err: any) {
      setError(err.message || '生成二维码失败');
    } finally {
      setLoading(false);
    }
  };

  // 轮询绑定状态
  const startPolling = (bindCode: string) => {
    setPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const result = await cloudbase.callFunction({
          name: 'bindWxOpenId',
          data: {
            action: 'checkBindStatus',
            bindCode: bindCode
          }
        });

        if (result.result.code === 200) {
          // 绑定成功
          clearInterval(pollInterval);
          setPolling(false);
          onSuccess(result.result.data.user);
        } else if (result.result.code === 410) {
          // 二维码已过期
          clearInterval(pollInterval);
          setPolling(false);
          setQrCodeData(null);
          setError('二维码已过期，请重新生成');
        }
      } catch (err: any) {
        console.error('轮询失败:', err);
      }
    }, 2000);

    // 5分钟后自动停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 5 * 60 * 1000);
  };

  // 暂不绑定
  const handleSkip = () => {
    if (showNoReminder) {
      // 保存"不再提示"标记
      localStorage.setItem('wechat_bind_no_reminder', 'true');
    }
    onClose();
  };

  // 初始化时生成二维码
  useEffect(() => {
    generateBindQRCode();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">绑定微信账号</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 内容 */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">正在生成二维码...</p>
              </div>
            ) : qrCodeData ? (
              <>
                {/* 二维码 */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={qrCodeData.qrUrl}
                      alt="绑定二维码"
                      className="w-48 h-48 border-4 border-blue-600 rounded-lg shadow-lg"
                    />
                    {polling && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-sm text-gray-600">等待扫码...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 text-center space-y-2">
                    <p className="text-lg font-medium text-gray-900">请使用微信小程序扫码绑定</p>
                    <p className="text-sm text-gray-600">打开"际华协同办公"小程序</p>
                    <p className="text-sm text-gray-600">点击"扫一扫"功能扫描二维码</p>
                  </div>
                </div>

                {/* 说明 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">绑定说明：</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>绑定后可使用微信扫码快速登录</li>
                    <li>仍可使用用户名密码登录</li>
                    <li>二维码有效期为5分钟</li>
                  </ul>
                </div>

                {/* 不再提示选项 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="no-reminder"
                    checked={showNoReminder}
                    onChange={(e) => setShowNoReminder(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="no-reminder" className="text-sm text-gray-700">
                    不再提示
                  </label>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">二维码生成失败</p>
                <button
                  onClick={generateBindQRCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新生成
                </button>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="mt-6 flex justify-between gap-4">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              暂不绑定
            </button>
            {qrCodeData && (
              <button
                onClick={() => {
                  setQrCodeData(null);
                  generateBindQRCode();
                }}
                className="flex-1 px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                刷新二维码
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
