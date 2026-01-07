import { CheckCircle2 } from 'lucide-react';

/**
 * 微信扫码绑定 - 成功页面
 * 
 * 功能：
 * 1. 显示绑定成功提示
 * 2. 提示用户可以关闭页面
 */
export function WechatBindSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* 成功图标 */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">绑定成功！</h2>
        <p className="text-gray-600 mb-8">
          您的微信已成功绑定到际华定制协同办公平台
        </p>

        {/* 提示信息 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-700 space-y-2">
            <p className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              现在可以使用微信扫码登录
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              您可以关闭此页面返回PC端
            </p>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={() => window.close()}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          关闭页面
        </button>

        {/* 二维码提示 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            下次登录时，请在PC端点击"微信扫码登录"
          </p>
        </div>
      </div>
    </div>
  );
}
