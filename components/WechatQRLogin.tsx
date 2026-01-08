import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, XCircle, Loader2, Smartphone, ArrowLeft } from 'lucide-react';
import { app } from '../lib/cloudbase';

interface WechatQRLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onSwitchToPassword?: () => void;
}

export default function WechatQRLogin({ onLoginSuccess, onSwitchToPassword }: WechatQRLoginProps) {
  const [sceneId, setSceneId] = useState<string>('');
  const [status, setStatus] = useState<'init' | 'pending' | 'success' | 'expired' | 'error'>('init');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const hasInitialized = useRef(false);

  // 生成登录Scene
  const generateLoginScene = async () => {
    try {
      setStatus('pending');
      setErrorMessage('');

      const res = await app.callFunction({
        name: 'wechat-login',
        data: {
          action: 'generateLoginScene'
        }
      });

      if (res.result.code === 200) {
        const { sceneId } = res.result.data;
        console.log('🎯 生成 Scene ID:', sceneId);
        console.log('📋 复制此 Scene ID 到模拟器:', sceneId);
        setSceneId(sceneId);
        setIsPolling(true);
      } else {
        setStatus('error');
        setErrorMessage(res.result.message || '生成二维码失败');
      }
    } catch (error: any) {
      console.error('生成登录二维码失败:', error);
      setStatus('error');
      setErrorMessage(error.message || '生成二维码失败');
    }
  };

  // 轮询检查登录状态
  useEffect(() => {
    if (!isPolling || !sceneId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await window.cloudbase.callFunction({
          name: 'wechat-login',
          data: {
            action: 'checkLoginStatus',
            sceneId
          }
        });

        if (res.result.code === 200 && res.result.data.status === 'completed') {
          // 登录成功
          const { token, user } = res.result.data;
          setStatus('success');
          setIsPolling(false);
          clearInterval(pollInterval);

          // 延迟一下让用户看到成功提示
          setTimeout(() => {
            onLoginSuccess(token, user);
          }, 1000);
        } else if (res.result.code === 410) {
          // 二维码过期
          setStatus('expired');
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isPolling, sceneId, onLoginSuccess]);

  // 组件挂载时生成二维码（使用 useRef 防止重复执行）
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      generateLoginScene();
    }
  }, []);

  // 刷新二维码
  const handleRefresh = () => {
    setIsPolling(false);
    setSceneId('');
    setStatus('init');
    setErrorMessage('');
    hasInitialized.current = false; // 重置标记
    setTimeout(() => {
      hasInitialized.current = true;
      generateLoginScene();
    }, 100);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* 顶部标题 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">微信扫码登录</h2>
          <p className="text-sm text-gray-500">使用绑定的微信快速登录</p>
        </div>

        {/* 二维码区域 */}
        <div className="flex justify-center mb-6">
          {status === 'pending' && sceneId && (
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200 transition-all hover:border-blue-300">
              <QRCodeSVG 
                value={sceneId}
                size={220}
                level="M"
                includeMargin={true}
              />
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 p-6 rounded-xl border-2 border-green-300 flex items-center justify-center w-[268px] h-[268px]">
              <div className="text-center">
                <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4 animate-bounce" />
                <p className="text-green-700 font-semibold text-lg">登录成功!</p>
                <p className="text-green-600 text-sm mt-2">正在跳转...</p>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="bg-amber-50 p-6 rounded-xl border-2 border-amber-300 flex items-center justify-center w-[268px] h-[268px]">
              <div className="text-center">
                <XCircle className="h-20 w-20 text-amber-600 mx-auto mb-4" />
                <p className="text-amber-700 font-semibold mb-4">二维码已过期</p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  刷新二维码
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 p-6 rounded-xl border-2 border-red-300 flex items-center justify-center w-[268px] h-[268px]">
              <div className="text-center">
                <XCircle className="h-20 w-20 text-red-600 mx-auto mb-4" />
                <p className="text-red-700 font-semibold mb-2">生成失败</p>
                <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {status === 'init' && (
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200 flex items-center justify-center w-[268px] h-[268px]">
              <Loader2 className="animate-spin h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* 说明文字 */}
        {status === 'pending' && (
          <div className="text-center space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Smartphone className="h-5 w-5" />
              <span className="font-medium">请使用微信扫描二维码</span>
            </div>
            <p className="text-sm text-gray-500">打开微信小程序并扫码登录</p>
            <p className="text-xs text-gray-400">二维码5分钟内有效</p>
          </div>
        )}

        {/* 切换到密码登录 */}
        {onSwitchToPassword && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onSwitchToPassword}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回密码登录</span>
            </button>
          </div>
        )}

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-1">💡 温馨提示</p>
          <p className="text-xs text-blue-700">
            首次使用微信登录需要先在个人信息页面绑定微信账号
          </p>
        </div>
      </div>
    </div>
  );
}
