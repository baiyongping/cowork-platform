import React, { useState, useEffect } from 'react';
import { X, User, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { db, app, callFunction } from '../lib/cloudbase';

interface CreateEmployeeModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: string[];
  currentUser: any;
}

interface EmployeeForm {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  status: string;
}

export default function CreateEmployeeModal({
  show,
  onClose,
  onSuccess,
  departments,
  currentUser
}: CreateEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 用户名验证状态
  const [usernameValidation, setUsernameValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ''
  });

  const [form, setForm] = useState<EmployeeForm>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    status: '在职'
  });

  // 重置表单
  useEffect(() => {
    if (show) {
      setForm({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        status: '在职'
      });
      setError('');
      setUsernameValidation({ checking: false, available: null, message: '' });
    }
  }, [show]);

  // 检查用户名是否可用
  const checkUsernameAvailability = async (username: string) => {
    if (!username || !username.trim()) {
      setUsernameValidation({ checking: false, available: null, message: '' });
      return;
    }

    setUsernameValidation({ checking: true, available: null, message: '正在检查...' });

    try {
      const existingUser = await db.collection('users').where({ username: username.trim() }).get();
      
      if (existingUser.data && existingUser.data.length > 0) {
        setUsernameValidation({
          checking: false,
          available: false,
          message: '该用户名已被使用'
        });
      } else {
        setUsernameValidation({
          checking: false,
          available: true,
          message: '用户名可用'
        });
      }
    } catch (err: any) {
      console.error('检查用户名失败:', err);
      setUsernameValidation({
        checking: false,
        available: null,
        message: '检查失败,请稍后重试'
      });
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    // 验证用户名
    if (!form.username.trim()) {
      setError('请输入用户名');
      return false;
    }

    if (usernameValidation.available === false) {
      setError('用户名已被使用，请更换');
      return false;
    }

    // 验证姓名
    if (!form.name.trim()) {
      setError('请输入姓名');
      return false;
    }

    // 验证密码
    if (!form.password) {
      setError('请输入密码');
      return false;
    }

    if (form.password.length < 6) {
      setError('密码长度不能少于6位');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    // 验证手机号
    if (!form.phone.trim()) {
      setError('请输入手机号');
      return false;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    const cleanPhone = form.phone.trim().replace(/\s+/g, '').replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('请输入正确的手机号格式（11位，以13-19开头）');
      return false;
    }

    return true;
  };

  // 提交表单
  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    // 再次检查用户名
    try {
      const existingUser = await db.collection('users').where({ username: form.username.trim() }).get();
      if (existingUser.data && existingUser.data.length > 0) {
        setError('用户名已被使用，请更换其他用户名');
        return;
      }
    } catch (err: any) {
      console.error('检查用户名失败:', err);
      setError('检查用户名失败，请稍后重试');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = form.phone.trim().replace(/\s+/g, '').replace(/[^\d]/g, '');
      
      // 🔐 调用云函数创建用户（在云函数中处理密码加密）
      const cloudResult = await callFunction({
        name: 'auth',
        data: {
          action: 'createUser',
          username: form.username.trim(),
          password: form.password, // 明文密码，云函数会加密
          name: form.name.trim(),
          phone: cleanPhone,
          status: form.status,
          createdBy: currentUser?.username || 'system'
        }
      });

      // 🔍 调试日志
      console.log('📡 云函数返回结果:', cloudResult);
      console.log('📋 解析后的result:', cloudResult.result);

      const result = cloudResult.result; // 解析云函数返回结果

      // 🔧 修复：完善成功判断逻辑
      if (result && typeof result === 'object' && (result.code === 200 || result.code === 201)) {
        console.log('✅ 用户创建成功，开始记录日志');
        console.log('📊 创建的用户信息:', result.data);
        
        // 尝试记录操作日志（即使失败也不影响主流程）
        try {
          await db.collection('operation_logs').add({
            data: {
              userId: currentUser?._id || '',
              username: currentUser?.username || 'system',
              action: '新增员工',
              module: '员工管理',
              details: `新增员工: ${form.name} (${form.username})`,
              timestamp: new Date(),
              ipAddress: '',
              userAgent: navigator.userAgent
            }
          });
          console.log('✅ 操作日志记录成功');
        } catch (logError) {
          console.warn('⚠️ 操作日志记录失败（不影响主流程）:', logError);
        }

        // 用户创建成功，关闭弹窗
        console.log('✅ 关闭弹窗，刷新列表');
        onSuccess();
        onClose();
      } else {
        // ❌ 创建失败
        const errorMsg = result?.message || '创建员工失败，请稍后重试';
        console.error('❌ 用户创建失败:', {
          result: result,
          errorMsg: errorMsg,
          cloudResult: cloudResult
        });
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ 创建员工异常:', err);
      
      // 🔍 详细错误信息
      console.error('错误详情:', {
        message: err.message,
        code: err.code,
        errCode: err.errCode,
        stack: err.stack
      });
      
      setError(err.message || '创建员工失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">新增员工</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <span className="text-red-500">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              基本信息
            </h3>

            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => {
                  setForm({ ...form, username: e.target.value });
                  setUsernameValidation({ checking: false, available: null, message: '' });
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    checkUsernameAvailability(e.target.value);
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  usernameValidation.available === false
                    ? 'border-red-500 focus:ring-red-500'
                    : usernameValidation.available === true
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="请输入用户名"
                autoComplete="off"
                disabled={loading}
              />
              {usernameValidation.message && (
                <p className={`text-xs mt-1 ${
                  usernameValidation.available === false
                    ? 'text-red-600'
                    : usernameValidation.available === true
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}>
                  {usernameValidation.checking ? '正在检查...' : usernameValidation.message}
                </p>
              )}
            </div>

            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入姓名"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="至少6位密码"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              联系信息
            </h3>

            {/* 手机号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入11位手机号"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>

          {/* 状态 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="在职">在职</option>
                <option value="离职">离职</option>
                <option value="休假">休假</option>
              </select>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || usernameValidation.available === false}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>创建中...</span>
              </>
            ) : (
              '创建员工'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
