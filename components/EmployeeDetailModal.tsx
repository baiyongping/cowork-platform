import { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, User, UserCircle2, Briefcase, Shield, Calendar, Users, Building2, AlertTriangle, Key, Copy } from 'lucide-react';
import { db } from '../lib/cloudbase';
import app from '../lib/cloudbase';
import Drawer from './Drawer';
import { showAlert, showConfirm, showSuccess, showError, toastSuccess, toastError } from '../lib/dialog-utils';

interface Department {
  _id: string;
  name: string;
  memberIds: string[];
}

interface Employee {
  _id: string;
  name: string;
  username: string;
  phone: string;
  avatar?: string;
  departments: string[];
  role: string;
  roles: string[];
  status: string;
  supervisorId: string;
  position: string;
  handoverTo?: string;
  approvalStatus: string;
  createdAt: Date;
}

interface EmployeeDetailModalProps {
  employee: Employee;
  onClose: () => void;
  onSave?: (employee: Employee) => void;
  onSuccess?: () => void;
  allDepartments?: Department[];
  allEmployees?: Employee[];
  rolePermissions?: any[]; // 角色权限列表
  currentUserRole?: string; // 🆕 当前用户角色
}

export default function EmployeeDetailModal({ 
  employee, 
  onClose, 
  onSave,
  onSuccess,
  allDepartments = [],
  allEmployees = [],
  rolePermissions = [],
  currentUserRole = '' // 🆕 当前用户角色
}: EmployeeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 🆕 删除确认对话框
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false); // 🆕 重置密码弹窗
  const [newPassword, setNewPassword] = useState(''); // 🆕 新密码
  const [isResettingPassword, setIsResettingPassword] = useState(false); // 🆕 密码重置中
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    departments: [] as string[],
    roles: [] as string[],
    status: '在职',
    supervisorId: '',
    position: '',
    handoverTo: '',
    approvalStatus: 'pending'
  });

  useEffect(() => {
    if (employee) {
      const cleanedRoles = (employee.roles || [employee.role]).filter(r => r && r.trim() !== '');
      
      setEditForm({
        name: employee.name || '',
        phone: employee.phone || '',
        departments: employee.departments || [],
        roles: cleanedRoles,
        status: employee.status || '在职',
        supervisorId: employee.supervisorId || '',
        position: employee.position || '',
        handoverTo: employee.handoverTo || '',
        approvalStatus: employee.approvalStatus || 'pending'
      });
    }
  }, [employee]);

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      showError('请输入姓名');
      return;
    }

    if (editForm.status === '离职' && editForm.handoverTo && employee.status !== '离职') {
      setShowHandoverConfirm(true);
      return;
    }

    if (editForm.status === '离职' && !editForm.handoverTo) {
      showError('请选择交接对象');
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    try {
      console.log('📝 [员工保存] 开始保存员工信息');
      
      const { safeDbOperation } = await import('../lib/db-safe');
      const finalRoles = editForm.roles.includes('user') 
        ? editForm.roles 
        : ['user', ...editForm.roles];
      
      const primaryRole = finalRoles.find(r => r !== 'user') || '';

      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
        departments: editForm.departments,
        role: primaryRole,
        roles: finalRoles,
        status: editForm.status,
        supervisorId: editForm.supervisorId,
        position: editForm.position,
        handoverTo: editForm.handoverTo || null,
        approvalStatus: editForm.approvalStatus,
        updatedAt: new Date()
      };

      await safeDbOperation(
        async (db) => {
          const result = await db.collection('users').doc(employee._id).update(updateData);
          
          const deptResult = await db.collection('departments').get();
          const allDepartments = deptResult.data;
          
          const oldDepts = employee.departments || [];
          const newDepts = editForm.departments;
          const deptsToRemove = oldDepts.filter(d => !newDepts.includes(d));
          const deptsToAdd = newDepts.filter(d => !oldDepts.includes(d));
          
          for (const dept of allDepartments) {
            const deptName = dept.name;
            let memberIds = dept.memberIds || [];
            let needUpdate = false;
            
            if (deptsToRemove.includes(deptName) && memberIds.includes(employee._id)) {
              memberIds = memberIds.filter(id => id !== employee._id);
              needUpdate = true;
            }
            
            if (deptsToAdd.includes(deptName) && !memberIds.includes(employee._id)) {
              memberIds = [...memberIds, employee._id];
              needUpdate = true;
            }
            
            if (needUpdate) {
              await db.collection('departments').doc(dept._id).update({
                memberIds: memberIds,
                updatedAt: new Date()
              });
            }
          }
          
          return result;
        },
        '更新员工信息并同步部门'
      );

      await safeDbOperation(
        async (db) => {
          await db.collection('operation_logs').add({
            userId: employee._id,
            module: '员工管理',
            action: '编辑员工',
            content: `编辑了员工 ${editForm.name} 的信息`,
            ipAddress: 'unknown',
            createdAt: new Date()
          });
        },
        '记录操作日志'
      );

      if (editForm.status === '离职' && editForm.handoverTo && employee.status !== '离职') {
        const handoverResult = await app.callFunction({
          name: 'handover-data',
          data: {
            fromUserId: employee._id,
            toUserId: editForm.handoverTo,
            leftAt: new Date()
          }
        });

        if (handoverResult.result && handoverResult.result.success) {
          await db.collection('users').doc(employee._id).update({
            deleted: true,
            deletedAt: new Date()
          });

          await db.collection('operation_logs').add({
            userId: employee._id,
            module: '员工管理',
            action: '离职移入回收站',
            content: `员工 ${employee.name} 离职交接完成后自动移入回收站`,
            ipAddress: 'unknown',
            createdAt: new Date()
          });
        }
      }

      // alert('保存成功'); // 已禁用保存成功提示
      setIsEditing(false);
      setShowHandoverConfirm(false);
      // 优先使用 onSuccess,如果没有则使用 onSave
      if (onSuccess) {
        onSuccess();
      } else if (onSave) {
        onSave({ ...employee, ...updateData });
      }
      onClose();
    } catch (error) {
      console.error('❌ [员工保存] 保存失败:', error);
      showError('保存失败,请重试');
    }
  };

  const handleToggleDepartment = (deptName: string) => {
    setEditForm(prev => ({
      ...prev,
      departments: prev.departments.includes(deptName)
        ? prev.departments.filter(d => d !== deptName)
        : [...prev.departments, deptName]
    }));
  };

  const handleToggleRole = (roleId: string) => {
    setEditForm(prev => {
      const newRoles = prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId];
      
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const supervisorName = allEmployees.find(e => e._id === editForm.supervisorId)?.name || '-';

  // 🆕 放入回收站处理函数
  const handleMoveToTrash = async () => {
    try {
      console.log('🗑️ [删除员工] 开始删除:', employee._id, employee.name);
      
      // ✅ 调用云函数执行软删除
      const result = await app.callFunction({
        name: 'user-management',
        data: {
          action: 'softDelete',
          userId: employee._id
        }
      });

      console.log('✅ [删除员工] 云函数执行结果:', result);

      if (result.result.success) {
        // 提示成功
        showSuccess('已成功放入回收站');
        
        // 关闭删除确认对话框
        setShowDeleteConfirm(false);
        
        console.log('🔄 [删除员工] 准备刷新列表...');
        
        // 🔧 关键修复：等待 onSuccess 执行完成后再关闭对话框
        if (onSuccess) {
          await onSuccess(); // 等待异步刷新完成
          console.log('✅ [删除员工] onSuccess 执行完成');
        }
        
        // 延迟关闭对话框，确保状态更新
        setTimeout(() => {
          onClose();
          console.log('✅ [删除员工] 对话框已关闭');
        }, 100);
      } else {
        showError(result.result.message || '放入回收站失败');
      }
    } catch (error) {
      console.error('❌ [删除员工] 失败:', error);
      showError('放入回收站失败: ' + (error as any).message);
    }
  };

  // 🆕 生成6位随机密码
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // 🆕 打开重置密码弹窗
  const handleOpenResetPassword = () => {
    const password = generatePassword();
    setNewPassword(password);
    setShowResetPasswordModal(true);
  };

  // 🆕 复制密码到剪贴板
  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      showSuccess('密码已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      showError('复制失败，请手动复制');
    }
  };

  // 🆕 执行密码重置
  const handleResetPassword = async () => {
    if (!newPassword) {
      showError('密码不能为空');
      return;
    }

    setIsResettingPassword(true);
    try {
      // 调用云函数重置密码
      const result = await app.callFunction({
        name: 'user-management',
        data: {
          action: 'resetPassword',
          userId: employee._id,
          newPassword: newPassword
        }
      });

      if (result.result && result.result.success) {
        // 记录操作日志
        await db.collection('operation_logs').add({
          userId: employee._id,
          module: '员工管理',
          action: '重置密码',
          content: `管理员重置了员工 ${employee.name}(${employee.username}) 的密码`,
          ipAddress: 'unknown',
          createdAt: new Date()
        });

        showSuccess('密码重置成功！请将新密码告知员工。');
        setShowResetPasswordModal(false);
        setNewPassword('');
      } else {
        throw new Error(result.result?.message || '密码重置失败');
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      showError('密码重置失败: ' + (error as any).message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      {/* 侧边抽屉式详情 */}
      <Drawer
        isOpen={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-4">
            {employee.avatar ? (
              <img 
                src={employee.avatar} 
                alt={employee.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                {employee.name ? employee.name.charAt(0) : <User className="w-8 h-8" />}
              </div>
            )}
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
              <p className="text-sm text-gray-500">{employee.departments?.join(' · ') || '未分配部门'} · {employee.position || '未设置岗位'}</p>
            </div>
          </div>
        }
        actions={
          !isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              {currentUserRole === 'admin' && (
                <button
                  onClick={handleOpenResetPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <Key className="w-4 h-4" />
                  重置密码
                </button>
              )}
              {/* 🔧 删除按钮 - 防止 admin 账号被删除 */}
              {!(employee.username === 'admin' || employee.role === 'admin') && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  放入回收站
                </button>
              )}
            </div>
          ) : null
        }
      >
        <div className="space-y-6">
          {/* 📋 基本信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-white rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入姓名"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{employee.name || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="在职">在职</option>
                    <option value="离职">离职</option>
                    <option value="休假">休假</option>
                  </select>
                ) : (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    employee.status === '在职' 
                      ? 'bg-green-100 text-green-700' 
                      : employee.status === '离职'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {employee.status || '在职'}
                  </span>
                )}
              </div>

              {isEditing && editForm.status === '离职' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    交接对象 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.handoverTo}
                    onChange={(e) => setEditForm({ ...editForm, handoverTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择交接对象</option>
                    {allEmployees
                      .filter(e => 
                        e._id !== employee._id && 
                        e.status === '在职'
                      )
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name || emp.username} {emp.position ? `(${emp.position})` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-orange-600 mt-2 flex items-start gap-1">
                    <span>⚠️</span>
                    <span>离职后,该用户的任务、商机、项目数据将转移给交接对象</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">上级</label>
                {isEditing ? (
                  <select
                    value={editForm.supervisorId}
                    onChange={(e) => setEditForm({ ...editForm, supervisorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">无上级</option>
                    {allEmployees
                      .filter(e => e._id !== employee._id)
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name || emp.username}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{supervisorName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">岗位</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入岗位"
                  />
                ) : (
                  <p className="text-gray-900">{employee.position || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* 🏢 组织架构 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-100">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">组织架构</h3>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">所属部门</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {allDepartments.map(dept => (
                    <button
                      key={dept._id}
                      onClick={() => handleToggleDepartment(dept.name)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        editForm.departments.includes(dept.name)
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {employee.departments && employee.departments.length > 0 ? (
                    employee.departments.map(dept => (
                      <span key={dept} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {dept}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">未分配部门</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 🛡️ 角色权限 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">角色权限</h3>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">系统角色</label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  {rolePermissions.map(role => (
                    <button
                      key={role.role}
                      onClick={() => handleToggleRole(role.role)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        editForm.roles.includes(role.role)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(employee.roles || []).map(roleId => {
                    // 从 rolePermissions 中查找对应的角色名称
                    const roleInfo = rolePermissions.find(r => r.role === roleId);
                    return (
                      <span key={roleId} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {roleInfo ? roleInfo.name : roleId}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 🔐 账号信息 */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-gray-900">账号信息</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-white rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <p className="text-gray-900">{employee.username}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">注册时间</label>
                <p className="text-gray-900">
                  {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 底部操作按钮 */}
          {isEditing && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 -mx-6 -mb-6">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    name: employee.name || '',
                    phone: employee.phone || '',
                    departments: employee.departments || [],
                    roles: employee.roles || [],
                    status: employee.status || '在职',
                    supervisorId: employee.supervisorId || '',
                    position: employee.position || '',
                    handoverTo: employee.handoverTo || '',
                    approvalStatus: employee.approvalStatus || 'pending'
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </Drawer>

      {/* 离职交接确认弹窗 */}
      {showHandoverConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认离职交接</h3>
            <p className="text-gray-600 mb-2">
              将 <span className="font-semibold text-gray-900">{employee.name}</span> 的以下数据转移给 
              <span className="font-semibold text-blue-600">{allEmployees.find(e => e._id === editForm.handoverTo)?.name}</span>：
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
              <li>负责的任务</li>
              <li>跟进的商机</li>
              <li>负责的项目</li>
            </ul>
            <p className="text-orange-600 text-sm mb-6">⚠️ 交接完成后,该员工将自动移入回收站</p>
            <div className="flex items-center gap-3">
              <button
                onClick={performSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认交接
              </button>
              <button
                onClick={() => setShowHandoverConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 放入回收站确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">确认放入回收站</h3>
            </div>
            
            <div className="mb-6 space-y-3">
              <p className="text-gray-600">
                确定要将员工 <span className="font-semibold text-gray-900">{employee.name}</span> 放入回收站吗?
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-orange-800 font-medium">⚠️ 注意事项:</p>
                <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                  <li>该员工将被标记为已删除状态</li>
                  <li>在回收站中可以恢复该员工</li>
                  <li>如需彻底删除,请在回收站中操作</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleMoveToTrash}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                确认放入回收站
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 重置密码弹窗 */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">重置密码</h3>
            </div>
            
            <div className="mb-6 space-y-4">
              <p className="text-gray-600">
                为员工 <span className="font-semibold text-gray-900">{employee.name}</span> 生成新密码
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-lg"
                  />
                  <button
                    onClick={handleCopyPassword}
                    className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="复制密码"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  点击复制图标将密码复制到剪贴板
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">💡 提示:</p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 mt-2">
                  <li>密码已自动生成（6位字符）</li>
                  <li>请在确认前复制密码并妥善保管</li>
                  <li>重置后请及时通知员工修改密码</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? '重置中...' : '确认重置'}
              </button>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setNewPassword('');
                }}
                disabled={isResettingPassword}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
