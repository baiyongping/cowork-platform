import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, XCircle, Loader2, Smartphone } from 'lucide-react';

interface WechatBindingProps {
  userId: string;
  token: string;
  onBindSuccess?: () => void;
}

export default function WechatBinding({ userId, token, onBindSuccess }: WechatBindingProps) {
  const [sceneId, setSceneId] = useState<string>('');
  const [h5Url, setH5Url] = useState<string>(''); // ✅ 新增：H5 绑定页面 URL
  const [status, setStatus] = useState<'init' | 'pending' | 'scanned' | 'success' | 'expired' | 'error'>('init');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const hasInitialized = useRef(false);

  // 生成绑定Scene和 H5 URL
  const generateScene = async () => {
    try {
      setStatus('pending');
      setErrorMessage('');

      const { callFunction } = await import('../lib/cloudbase');
      
      // 1️⃣ 生成 sceneId（存入数据库）
      const sceneRes = await callFunction({
        name: 'wechat-bind',
        data: {
          action: 'generateScene',
          userId,
          token
        }
      });

      if (sceneRes.result.code !== 200) {
        setStatus('error');
        setErrorMessage(sceneRes.result.message || '生成Scene失败');
        return;
      }

      const { sceneId } = sceneRes.result.data;
      setSceneId(sceneId);

      // 2️⃣ 生成 H5 绑定页面 URL（不再调用小程序码生成）
      const h5BindUrl = `${window.location.origin}/wechat-bind?scene=${sceneId}`;
      setH5Url(h5BindUrl);
      
      console.log('✓ 生成 H5 绑定链接:', h5BindUrl);
      
      setIsPolling(true);
    } catch (error: any) {
      console.error('生成二维码失败:', error);
      setStatus('error');
      setErrorMessage(error.message || '生成二维码失败');
    }
  };

  // 轮询检查绑定状态
  useEffect(() => {
    if (!isPolling || !sceneId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { callFunction } = await import('../lib/cloudbase');
      const res = await callFunction({
          name: 'wechat-bind',
          data: {
            action: 'checkStatus',
            sceneId
          }
        });

        if (res.result.code === 200) {
          const { status: bindStatus } = res.result.data;

          if (bindStatus === 'completed') {
            setStatus('success');
            setIsPolling(false);
            clearInterval(pollInterval);
            
            // 延迟回调,让用户看到成功提示
            setTimeout(() => {
              onBindSuccess?.();
            }, 1500);
          } else if (bindStatus === 'scanned') {
            setStatus('scanned');
          }
        } else if (res.result.code === 410) {
          // 二维码过期
          setStatus('expired');
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('检查绑定状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isPolling, sceneId, onBindSuccess]);

  // 组件挂载时生成二维码（使用 useRef 防止重复执行）
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      generateScene();
    }
  }, []);

  // 重新生成二维码
  const handleRefresh = () => {
    setIsPolling(false);
    setSceneId('');
    setH5Url(''); // ✅ 清除 H5 URL
    setStatus('init');
    setErrorMessage('');
    hasInitialized.current = false; // 重置标记
    setTimeout(() => {
      hasInitialized.current = true;
      generateScene();
    }, 100);
  };

  return (
    <div className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-6">绑定微信</h3>

      {/* 二维码区域 */}
      <div className="relative mb-6">
        {status === 'pending' && h5Url && (
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
            {/* ✅ 使用 qrcode.react 生成普通 URL 二维码 */}
            <QRCodeSVG 
              value={h5Url}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        )}

        {status === 'scanned' && h5Url && (
          <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300 relative">
            <QRCodeSVG 
              value={h5Url}
              size={200}
              level="H"
              includeMargin={true}
              className="opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300 flex items-center justify-center h-[248px]">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <p className="text-green-700 font-medium">绑定成功!</p>
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-300 flex items-center justify-center h-[248px]">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-amber-600 mx-auto mb-3" />
              <p className="text-amber-700 font-medium mb-4">二维码已过期</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                刷新二维码
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300 flex items-center justify-center h-[248px]">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-2">生成失败</p>
              <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {status === 'init' && (
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 flex items-center justify-center h-[248px]">
            <Loader2 className="animate-spin h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* 说明文字 */}
      {(status === 'pending' || status === 'scanned') && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Smartphone className="h-5 w-5" />
            <span className="font-medium">
              {status === 'pending' ? '请使用微信扫描二维码' : '等待确认...'}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            打开微信扫一扫，在浏览器中确认绑定
          </p>
          <p className="text-xs text-gray-400">二维码5分钟内有效</p>
        </div>
      )}
    </div>
  );
}
