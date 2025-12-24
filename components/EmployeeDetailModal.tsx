import { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, User, UserCircle2, Briefcase, Shield, Calendar, Users, Building2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import app from '../lib/cloudbase';
import Drawer from './Drawer';

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
}

export default function EmployeeDetailModal({ 
  employee, 
  onClose, 
  onSave,
  onSuccess,
  allDepartments = [],
  allEmployees = [],
  rolePermissions = []
}: EmployeeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
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
      alert('请输入姓名');
      return;
    }

    if (editForm.status === '离职' && editForm.handoverTo && employee.status !== '离职') {
      setShowHandoverConfirm(true);
      return;
    }

    if (editForm.status === '离职' && !editForm.handoverTo) {
      alert('请选择交接对象');
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

      alert('保存成功');
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
      alert('保存失败,请重试');
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
              <button
                onClick={() => {
                  if (confirm('确定要将此员工放入回收站吗?')) {
                    // TODO: 实现放入回收站逻辑
                    alert('放入回收站功能待实现');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                放入回收站
              </button>
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
    </>
  );
}
