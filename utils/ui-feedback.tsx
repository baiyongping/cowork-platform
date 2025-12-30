import { toast } from 'react-hot-toast';

/**
 * 显示成功消息
 * @param message 消息内容
 * @param duration 显示时长(毫秒),默认3000ms
 */
export function showSuccess(message: string, duration: number = 3000): void {
  toast.success(message, {
    duration,
    position: 'top-center',
  });
}

/**
 * 显示错误消息
 * @param message 消息内容
 * @param duration 显示时长(毫秒),默认4000ms
 */
export function showError(message: string, duration: number = 4000): void {
  toast.error(message, {
    duration,
    position: 'top-center',
  });
}

/**
 * 显示警告消息
 * @param message 消息内容
 * @param duration 显示时长(毫秒),默认3000ms
 */
export function showWarning(message: string, duration: number = 3000): void {
  toast(message, {
    duration,
    position: 'top-center',
    icon: '⚠️',
  });
}

/**
 * 显示信息消息
 * @param message 消息内容
 * @param duration 显示时长(毫秒),默认3000ms
 */
export function showInfo(message: string, duration: number = 3000): void {
  toast(message, {
    duration,
    position: 'top-center',
    icon: 'ℹ️',
  });
}

/**
 * 显示加载状态
 * @param message 消息内容
 * @returns toast ID,用于后续更新或关闭
 */
export function showLoading(message: string = '加载中...'): string {
  return toast.loading(message, {
    position: 'top-center',
  });
}

/**
 * 关闭指定的 toast
 * @param toastId toast ID
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId);
}

/**
 * 关闭所有 toast
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * 显示确认对话框
 * @param message 确认消息
 * @returns Promise<boolean> 用户是否确认
 * 
 * @example
 * const confirmed = await showConfirm('确定要删除吗？');
 * if (confirmed) {
 *   // 执行删除操作
 * }
 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const toastId = toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              取消
            </button>
            <button
              className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              确定
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
        style: {
          minWidth: '300px',
        },
      }
    );
  });
}
