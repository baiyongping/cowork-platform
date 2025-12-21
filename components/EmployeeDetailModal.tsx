import { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, User } from 'lucide-react';
import { db } from '../lib/cloudbase';
import app from '../lib/cloudbase';

interface EmployeeDetailModalProps {
  employee: any;
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  rolePermissions: any[];
  allEmployees: any[];
}

export function EmployeeDetailModal({ 
  employee, 
  onClose, 
  onSuccess,
  departments,
  rolePermissions,
  allEmployees
}: EmployeeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false); // 🆕 交接确认弹窗
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    departments: [] as string[],
    roles: [] as string[],
    status: '在职',
    supervisorId: '',
    position: '', // 职务
    handoverTo: '' // 🆕 交接对象
  });

  useEffect(() => {
    if (employee) {
      // ✅ 清理roles数组：只保留有效的角色ID（排除MongoDB哈希值）
      const validRoleIds = ['admin', 'manager', 'employee', 'test']; // 已知的有效角色ID
      let cleanedRoles = employee.roles || (employee.role ? [employee.role] : []);
      
      // 过滤掉哈希值（长度>20的字符串通常是MongoDB的_id）
      cleanedRoles = cleanedRoles.filter((roleId: string) => {
        // 如果是已知的有效角色ID，保留
        if (validRoleIds.includes(roleId)) {
          return true;
        }
        // 如果长度>20，可能是哈希值，过滤掉
        if (roleId.length > 20) {
          console.warn('⚠️ 过滤掉疑似哈希值的角色ID:', roleId);
          return false;
        }
        // 其他情况保留（可能是自定义角色）
        return true;
      });
      
      setEditForm({
        name: employee.name || '',
        phone: employee.phone || '',
        departments: employee.departments || [],
        roles: cleanedRoles,
        status: employee.status || '在职',
        supervisorId: employee.supervisorId || '',
        position: employee.position || '', // 职务
        handoverTo: employee.handoverTo || '' // 🆕 交接对象
      });
    }
  }, [employee]);

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      alert('请输入姓名');
      return;
    }

    // 🆕 如果状态改为离职，且有交接对象，显示确认弹窗
    if (editForm.status === '离职' && editForm.handoverTo && employee.status !== '离职') {
      setShowHandoverConfirm(true);
      return;
    }

    // 🆕 如果状态改为离职，但没有选择交接对象，提示用户
    if (editForm.status === '离职' && !editForm.handoverTo) {
      alert('请选择交接对象');
      return;
    }

    // 执行保存
    await performSave();
  };

  // 🆕 实际保存函数
  const performSave = async () => {
    try {
      console.log('📝 [员工保存] 开始保存员工信息');
      console.log('  - 员工ID:', employee._id);
      console.log('  - 姓名:', editForm.name);
      console.log('  - 部门:', editForm.departments);
      console.log('  - 角色:', editForm.roles);
      console.log('  - 状态:', editForm.status);
      console.log('  - 上级:', editForm.supervisorId);
      console.log('  - 职务:', editForm.position);

      // ✅ 使用安全的数据库包装器
      const { safeDbOperation } = await import('../lib/db-safe');

      // ✅ 确保始终包含user角色
      const finalRoles = editForm.roles.includes('user') 
        ? editForm.roles 
        : ['user', ...editForm.roles];

      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
        departments: editForm.departments,
        roles: finalRoles,
        status: editForm.status,
        supervisorId: editForm.supervisorId,
        position: editForm.position,
        handoverTo: editForm.handoverTo || null, // 🆕 交接对象
        updatedAt: new Date()
      };

      console.log('🔄 [员工保存] 准备更新数据:', updateData);

      // 使用安全包装器执行更新
      await safeDbOperation(
        async (db) => {
          const result = await db.collection('users').doc(employee._id).update(updateData);
          console.log('✅ [员工保存] users 集合更新成功:', result);
          
          // 🔧 关键修复：同步更新 departments 集合的 memberIds
          console.log('🔄 [员工保存] 开始同步更新部门的 memberIds...');
          
          // 1. 获取所有部门
          const deptResult = await db.collection('departments').get();
          const allDepartments = deptResult.data;
          
          // 2. 计算需要移除该员工的部门（原有但新数据中没有的）
          const oldDepts = employee.departments || [];
          const newDepts = editForm.departments;
          const deptsToRemove = oldDepts.filter(d => !newDepts.includes(d));
          const deptsToAdd = newDepts.filter(d => !oldDepts.includes(d));
          
          console.log('  - 需要移除的部门:', deptsToRemove);
          console.log('  - 需要添加的部门:', deptsToAdd);
          
          // 3. 批量更新部门的 memberIds
          for (const dept of allDepartments) {
            const deptName = dept.name;
            let memberIds = dept.memberIds || [];
            let needUpdate = false;
            
            // 移除员工
            if (deptsToRemove.includes(deptName) && memberIds.includes(employee._id)) {
              memberIds = memberIds.filter(id => id !== employee._id);
              needUpdate = true;
              console.log(`  - 从部门 "${deptName}" 移除员工`);
            }
            
            // 添加员工
            if (deptsToAdd.includes(deptName) && !memberIds.includes(employee._id)) {
              memberIds = [...memberIds, employee._id];
              needUpdate = true;
              console.log(`  - 将员工添加到部门 "${deptName}"`);
            }
            
            // 执行更新
            if (needUpdate) {
              await db.collection('departments').doc(dept._id).update({
                memberIds: memberIds,
                updatedAt: new Date()
              });
            }
          }
          
          console.log('✅ [员工保存] 部门 memberIds 同步完成');
          return result;
        },
        '更新员工信息并同步部门'
      );

      // 验证更新
      console.log('🔍 [员工保存] 验证更新结果...');
      const verifyResult = await safeDbOperation(
        async (db) => {
          const result = await db.collection('users').doc(employee._id).get();
          return result.data?.[0];
        },
        '验证员工更新'
      );

      console.log('✅ [员工保存] 验证成功，更新后的数据:', verifyResult);
      console.log('📊 [部门对比]:', {
        原始部门: employee.departments,
        编辑表单部门: editForm.departments,
        数据库保存部门: verifyResult?.departments,
        是否一致: JSON.stringify(verifyResult?.departments) === JSON.stringify(editForm.departments),
        是否为空数组: editForm.departments.length === 0
      });

      // 记录操作日志
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

      // 🆕 如果是离职且有交接对象，调用云函数进行数据交接
      if (editForm.status === '离职' && editForm.handoverTo && employee.status !== '离职') {
        console.log('🔄 [数据交接] 调用云函数转移数据权限...');
        try {
          const handoverResult = await app.callFunction({
            name: 'handover-data',
            data: {
              fromUserId: employee._id,
              toUserId: editForm.handoverTo,
              leftAt: new Date()
            }
          });

          console.log('✅ [数据交接] 云函数执行结果:', handoverResult);
          
          if (handoverResult.result && handoverResult.result.success) {
            console.log('✅ [数据交接] 数据权限转移成功');
            
            // 🆕 自动将离职员工移入回收站
            console.log('🗑️ [回收站] 自动将离职员工移入回收站...');
            try {
              await db.collection('users').doc(employee._id).update({
                deleted: true,
                deletedAt: new Date()
              });

              // 记录操作日志
              await db.collection('operation_logs').add({
                userId: employee._id,
                module: '员工管理',
                action: '离职移入回收站',
                content: `员工 ${employee.name} 离职交接完成后自动移入回收站`,
                ipAddress: 'unknown',
                createdAt: new Date()
              });

              console.log('✅ [回收站] 离职员工已自动移入回收站');
              
              const handoverToName = allEmployees.find(e => e._id === editForm.handoverTo)?.name;
              alert(
                `离职交接完成！\n` +
                `✅ 数据权限已转移给 ${handoverToName}\n` +
                `✅ ${employee.name} 已自动移入回收站`
              );
            } catch (trashError) {
              console.error('❌ [回收站] 移入回收站失败:', trashError);
              const handoverToName = allEmployees.find(e => e._id === editForm.handoverTo)?.name;
              alert(
                `数据交接成功，但移入回收站失败\n` +
                `✅ 数据权限已转移给 ${handoverToName}\n` +
                `❌ 请手动将员工移入回收站`
              );
            }
          } else {
            console.error('❌ [数据交接] 云函数返回失败:', handoverResult.result);
            alert('数据交接失败: ' + (handoverResult.result?.message || '未知错误'));
          }
        } catch (handoverError) {
          console.error('❌ [数据交接] 调用云函数失败:', handoverError);
          alert('数据交接失败，但用户状态已更新。错误: ' + handoverError.message);
        }
      }

      console.log('✅ [员工保存] 保存流程完成');
      setIsEditing(false);
      setShowHandoverConfirm(false); // 🆕 关闭确认弹窗
      onSuccess();
    } catch (error) {
      console.error('❌ [员工保存] 保存失败:', error);
      console.error('❌ 错误详情:', JSON.stringify(error, null, 2));
      
      // 友好的错误提示
      const errorMsg = (error as any).message || String(error);
      alert(`保存失败: ${errorMsg}\n\n请查看控制台了解详细错误信息，或运行 window.checkDbHealth() 检查数据库状态。`);
    }
  };

  const handleMoveToTrash = async () => {
    try {
      await db.collection('users').doc(employee._id).update({
        deleted: true,
        deletedAt: new Date()
      });

      // 记录操作日志
      await db.collection('operation_logs').add({
        userId: employee._id,
        module: '员工管理',
        action: '放入回收站',
        content: `将员工 ${employee.name} 放入回收站`,
        ipAddress: 'unknown',
        createdAt: new Date()
      });

      alert('已放入回收站');
      setShowDeleteConfirm(false);
      onSuccess();
    } catch (error) {
      console.error('放入回收站失败:', error);
      alert('操作失败: ' + (error as any).message);
    }
  };

  const handleToggleDepartment = (deptName: string) => {
    setEditForm(prev => {
      const isCurrentlySelected = prev.departments.includes(deptName);
      const newDepartments = isCurrentlySelected
        ? prev.departments.filter(d => d !== deptName)
        : [...prev.departments, deptName];
      
      console.log('🔄 [部门切换]', {
        部门名称: deptName,
        当前是否选中: isCurrentlySelected,
        操作: isCurrentlySelected ? '取消选择' : '选择',
        原部门列表: prev.departments,
        新部门列表: newDepartments
      });
      
      return {
        ...prev,
        departments: newDepartments
      };
    });
  };

  const handleToggleRole = (roleId: string) => {
    console.log('🔄 切换角色:', roleId);
    console.log('📋 当前角色列表:', editForm.roles);
    console.log('✅ 是否已选中:', editForm.roles.includes(roleId));
    
    setEditForm(prev => {
      const isCurrentlySelected = prev.roles.includes(roleId);
      const newRoles = isCurrentlySelected
        ? prev.roles.filter(r => r !== roleId)  // 取消选中
        : [...prev.roles, roleId];               // 选中
      
      console.log('🆕 新角色列表:', newRoles);
      
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const supervisorName = allEmployees.find(e => e._id === editForm.supervisorId)?.name || '-';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">员工详情</h2>
              <p className="text-sm text-gray-500">{employee.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <p className="text-gray-900">{employee.name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入手机号"
                    />
                  ) : (
                    <p className="text-gray-900">{employee.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
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
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
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

                {/* 🆕 交接对象选择器（仅离职时显示） */}
                {isEditing && editForm.status === '离职' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          e._id !== employee._id && // 排除自己
                          e.status === '在职' // 只显示在职员工
                        )
                        .map(emp => (
                          <option key={emp._id} value={emp._id}>
                            {emp.name || emp.username} {emp.position ? `(${emp.position})` : ''}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ 离职后，该用户的任务、商机、项目数据将转移给交接对象
                    </p>
                  </div>
                )}


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上级</label>
                  {isEditing ? (
                    <select
                      value={editForm.supervisorId}
                      onChange={(e) => setEditForm({ ...editForm, supervisorId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">无上级</option>
                      {allEmployees
                        .filter(e => e._id !== employee._id) // 排除自己
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">职务</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.position}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入职务"
                    />
                  ) : (
                    <p className="text-gray-900">{employee.position || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 部门信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">所属部门</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {departments.map(dept => (
                    <label key={dept._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.departments.includes(dept.name)}
                        onChange={() => handleToggleDepartment(dept.name)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{dept.name}</span>
                    </label>
                  ))}
                  {departments.length === 0 && (
                    <p className="text-sm text-gray-500">暂无可选部门</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(employee.departments || []).length > 0 ? (
                    employee.departments.map((dept: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {dept}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">未分配部门</span>
                  )}
                </div>
              )}
            </div>

            {/* 角色信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">角色权限</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {rolePermissions.filter(role => role.role !== 'user').map(role => {
                    // ✅ 只使用 role.role 字段，不使用 _id
                    const roleId = role.role;
                    if (!roleId) {
                      console.error('❌ 角色缺少role字段:', role);
                      return null; // 跳过没有role字段的角色
                    }
                    
                    return (
                      <label key={roleId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.roles.includes(roleId)}
                          onChange={() => handleToggleRole(roleId)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                        {role.description && (
                          <span className="text-xs text-gray-500">({role.description})</span>
                        )}
                      </label>
                    );
                  })}
                  {rolePermissions.filter(role => role.role !== 'user').length === 0 && (
                    <p className="text-sm text-gray-500">暂无可选角色</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // 过滤掉user角色
                    const rolesArray = employee.roles?.length > 0 
                      ? employee.roles.filter((r: string) => r !== 'user')
                      : (employee.role && employee.role !== 'user' ? [employee.role] : []);
                    
                    if (rolesArray.length === 0) {
                      return <span className="text-gray-500">--</span>;
                    }
                    
                    return rolesArray.map((roleId: string, index: number) => {
                      const roleConfig = rolePermissions.find(r => r.role === roleId);
                      const roleName = roleConfig ? roleConfig.name : roleId;
                      return (
                        <span key={index} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                          {roleName}
                        </span>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* 账号信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">账号信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">用户名</label>
                  <p className="text-gray-900">{employee.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">审核状态</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                    employee.approvalStatus === 'approved' 
                      ? 'bg-green-100 text-green-700' 
                      : employee.approvalStatus === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {employee.approvalStatus === 'approved' ? '已审核' : 
                     employee.approvalStatus === 'rejected' ? '已拒绝' : '待审核'}
                  </span>
                </div>
                {employee.createdAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">注册时间</label>
                    <p className="text-gray-900">{new Date(employee.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            disabled={employee.role === 'admin'}
          >
            <Trash2 className="w-4 h-4" />
            放入回收站
          </button>
          
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认放入回收站</h3>
            <p className="text-gray-600 mb-6">
              确定要将员工 <span className="font-semibold">{employee.name}</span> 放入回收站吗？可以在回收站中恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleMoveToTrash}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 数据交接确认弹窗 */}
      {showHandoverConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ 确认数据交接</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                即将执行以下操作：
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>将 <span className="font-semibold text-gray-900">{employee.name}</span> 的状态设置为"离职"</li>
                <li>
                  转移数据权限给：
                  <span className="font-semibold text-blue-600 ml-1">
                    {allEmployees.find(e => e._id === editForm.handoverTo)?.name}
                  </span>
                </li>
                <li>包括：任务、商机、项目的负责人和协同人权限</li>
                <li>离职用户将无法再登录系统</li>
                <li>所有操作将被记录到操作日志</li>
              </ul>
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  💡 提示：此操作不可撤销，请仔细确认交接对象是否正确。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowHandoverConfirm(false);
                  setIsEditing(true); // 返回编辑模式
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={performSave}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认交接
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
