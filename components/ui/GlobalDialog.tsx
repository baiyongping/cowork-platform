import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { setGlobalDialogInstance } from '../../lib/dialog-utils';

// ==================== 类型定义 ====================
export type DialogType = 'alert' | 'confirm' | 'toast';
export type DialogVariant = 'success' | 'error' | 'warning' | 'info';

interface DialogConfig {
  type: DialogType;
  variant?: DialogVariant;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  duration?: number; // Toast 自动关闭时间（毫秒）
}

interface DialogContextValue {
  showAlert: (message: string, variant?: DialogVariant, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showToast: (message: string, variant?: DialogVariant, duration?: number) => void;
}

// ==================== Context ====================
const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};

// ==================== 图标组件 ====================
const getIcon = (variant?: DialogVariant) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-6 h-6 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    case 'info':
    default:
      return <Info className="w-6 h-6 text-blue-500" />;
  }
};

// ==================== Alert/Confirm Dialog 组件 ====================
interface DialogProps {
  config: DialogConfig;
  onClose: () => void;
}

const Dialog: React.FC<DialogProps> = ({ config, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (config.onConfirm) {
      try {
        setLoading(true);
        await config.onConfirm();
      } finally {
        setLoading(false);
      }
    }
    onClose();
  };

  const handleCancel = () => {
    config.onCancel?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={config.type === 'alert' ? onClose : handleCancel}
      />
      
      {/* 对话框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={config.type === 'alert' ? onClose : handleCancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* 内容 */}
        <div className="p-6">
          {/* 图标和标题 */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 mt-1">
              {getIcon(config.variant)}
            </div>
            <div className="flex-1">
              {config.title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {config.title}
                </h3>
              )}
              <p className="text-gray-600 leading-relaxed">
                {config.message}
              </p>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 mt-6">
            {config.type === 'confirm' && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {config.cancelText || '取消'}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                config.variant === 'error'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : config.variant === 'warning'
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : config.variant === 'success'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {loading ? '处理中...' : (config.confirmText || '确定')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Toast 组件 ====================
interface ToastProps {
  config: DialogConfig;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ config, onClose }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top duration-300">
      <div className="bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[300px] max-w-md">
        {getIcon(config.variant)}
        <p className="text-gray-900 font-medium flex-1">{config.message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

// ==================== Provider ====================
export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogs, setDialogs] = useState<Array<{ id: number; config: DialogConfig }>>([]);
  const [toasts, setToasts] = useState<Array<{ id: number; config: DialogConfig }>>([]);

  const removeDialog = useCallback((id: number) => {
    setDialogs(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showAlert = useCallback((
    message: string, 
    variant: DialogVariant = 'info',
    title?: string
  ): Promise<void> => {
    return new Promise((resolve) => {
      const id = Date.now();
      setDialogs(prev => [...prev, {
        id,
        config: {
          type: 'alert',
          variant,
          title,
          message,
          onConfirm: () => {
            resolve();
            removeDialog(id);
          }
        }
      }]);
    });
  }, [removeDialog]);

  const showConfirm = useCallback((
    message: string,
    title?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now();
      setDialogs(prev => [...prev, {
        id,
        config: {
          type: 'confirm',
          variant: 'warning',
          title,
          message,
          onConfirm: () => {
            resolve(true);
            removeDialog(id);
          },
          onCancel: () => {
            resolve(false);
            removeDialog(id);
          }
        }
      }]);
    });
  }, [removeDialog]);

  const showToast = useCallback((
    message: string,
    variant: DialogVariant = 'success',
    duration = 3000
  ) => {
    const id = Date.now();
    setToasts(prev => [...prev, {
      id,
      config: { type: 'toast', variant, message, duration }
    }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  // 注入全局实例
  useEffect(() => {
    setGlobalDialogInstance({ showAlert, showConfirm, showToast });
  }, [showAlert, showConfirm, showToast]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      
      {/* 渲染 Dialogs */}
      {dialogs.map(({ id, config }) => (
        <Dialog
          key={id}
          config={config}
          onClose={() => {
            config.onCancel?.();
            removeDialog(id);
          }}
        />
      ))}

      {/* 渲染 Toasts */}
      {toasts.map(({ id, config }) => (
        <Toast
          key={id}
          config={config}
          onClose={() => removeToast(id)}
        />
      ))}
    </DialogContext.Provider>
  );
};
