import { X } from 'lucide-react';

interface VerificationCodeModalProps {
  phone: string;
  code: string;
  onClose: () => void;
}

export function VerificationCodeModal({ phone, code, onClose }: VerificationCodeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 relative animate-scale-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">验证码已生成</h3>
          <p className="text-sm text-gray-500">测试环境 - 无需真实短信</p>
        </div>

        {/* 验证码信息 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">手机号</label>
              <div className="text-lg text-gray-800 font-medium">{phone}</div>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 block mb-1">验证码</label>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-blue-600 tracking-wider font-mono">
                  {code}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    window.alert('验证码已复制到剪贴板');
                  }}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs rounded transition-colors"
                >
                  复制
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-blue-200">
              <span>⏱️ 有效期: 5分钟</span>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <span className="text-yellow-600 text-lg">💡</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">测试环境说明</p>
              <p className="text-xs text-yellow-700">
                当前为开发/测试环境，验证码直接展示在弹窗中。
                生产环境将通过短信真实发送。
              </p>
            </div>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
