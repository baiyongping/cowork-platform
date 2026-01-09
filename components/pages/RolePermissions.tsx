import React, { useState, useEffect } from 'react';
import { Shield, Save, X, Check, CheckSquare, Square, Plus, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { app } from '../../lib/cloudbase';
import { showSuccess, showError, showConfirm } from '../../lib/dialog-utils';
import { getPermissionModules, type ModuleDefinition, type ModulePermission } from '../../constants/modules';

// ========== 类型定义 ==========
interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PermissionCell {
  moduleId: string;
  moduleName: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

// 分组数据结构
interface ModuleGroup {
  parentId: string;
  parentName: string;
  children: PermissionCell[];
}

const OPERATION_COLUMNS = ['查看', '创建', '编辑', '删除', '导出'] as const;
const OPERATION_KEYS: Record<typeof OPERATION_COLUMNS[number], keyof ModulePermission> = {
  '查看': 'view',
  '创建': 'create',
  '编辑': 'edit',
  '删除': 'delete',
  '导出': 'export'
};

export default function RolePermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionCell[]>([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]); // 分组数据
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set()); // 折叠状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 新增角色弹窗
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  
  // 编辑角色弹窗
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // ========== 加载角色列表 ==========
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const db = app.database();
      const result = await db.collection('role_permissions')
        .orderBy('createdAt', 'asc')
        .get();

      const roleList = result.data as Role[];
      setRoles(roleList);

      // 默认选中第一个角色
      if (roleList.length > 0 && !selectedRole) {
        selectRole(roleList[0]);
      }
    } catch (error) {
      console.error('加载角色失败:', error);
      showError('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  // ========== 选择角色 ==========
  const selectRole = (role: Role) => {
    setSelectedRole(role);
    buildPermissionMatrix(role);
  };

  // ========== 构建权限矩阵 ==========
  const buildPermissionMatrix = (role: Role) => {
    const modules = getPermissionModules();
    const matrix: PermissionCell[] = [];
    const groups: ModuleGroup[] = [];

    modules.forEach(module => {
      if (module.hasChildren && module.children) {
        // 有子模块的情况 - 构建分组
        const children: PermissionCell[] = [];
        
        module.children.forEach(child => {
          if (child.needsPermission !== false) {
            const childId = `${module.id}.${child.id}`;
            const perm = role.permissions?.[module.id]?.[child.id] || {
              view: false,
              create: false,
              edit: false,
              delete: false,
              export: false
            };

            const cell: PermissionCell = {
              moduleId: childId,
              moduleName: child.name, // 只用子模块名
              view: perm.view ?? false,
              create: perm.create ?? false,
              edit: perm.edit ?? false,
              delete: perm.delete ?? false,
              export: perm.export ?? false
            };

            matrix.push(cell);
            children.push(cell);
          }
        });

        if (children.length > 0) {
          groups.push({
            parentId: module.id,
            parentName: module.name,
            children
          });
        }
      } else {
        // 没有子模块的情况 - 作为独立分组
        const perm = role.permissions?.[module.id] || {
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false
        };

        const cell: PermissionCell = {
          moduleId: module.id,
          moduleName: module.name,
          view: perm.view ?? false,
          create: perm.create ?? false,
          edit: perm.edit ?? false,
          delete: perm.delete ?? false,
          export: perm.export ?? false
        };

        matrix.push(cell);
        
        groups.push({
          parentId: module.id,
          parentName: module.name,
          children: [cell]
        });
      }
    });

    setPermissionMatrix(matrix);
    setModuleGroups(groups);
    
    // 默认展开所有分组
    const allModuleIds = new Set(groups.map(g => g.parentId));
    setExpandedModules(allModuleIds);
  };

  // ========== 折叠/展开模块 ==========
  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // ========== 切换权限 ==========
  const togglePermission = (moduleId: string, operation: keyof ModulePermission) => {
    setPermissionMatrix(prev =>
      prev.map(cell =>
        cell.moduleId === moduleId
          ? { ...cell, [operation]: !cell[operation] }
          : cell
      )
    );
  };

  // ========== 全选/取消全选 ==========
  const toggleAllRow = (moduleId: string) => {
    setPermissionMatrix(prev => {
      const cell = prev.find(c => c.moduleId === moduleId);
      if (!cell) return prev;

      // 检查是否已全选
      const isAllSelected = cell.view && cell.create && cell.edit && cell.delete && cell.export;

      return prev.map(c =>
        c.moduleId === moduleId
          ? {
              ...c,
              view: !isAllSelected,
              create: !isAllSelected,
              edit: !isAllSelected,
              delete: !isAllSelected,
              export: !isAllSelected
            }
          : c
      );
    });
  };

  // ========== 父级模块批量设置 ==========
  const toggleParentModule = (parentId: string) => {
    const group = moduleGroups.find(g => g.parentId === parentId);
    if (!group) return;

    // 检查该父级下所有子模块是否已全选
    const allChildrenSelected = group.children.every(child => 
      child.view && child.create && child.edit && child.delete && child.export
    );

    setPermissionMatrix(prev =>
      prev.map(cell => {
        // 判断是否属于该父级
        const belongsToParent = group.children.some(c => c.moduleId === cell.moduleId);
        
        if (belongsToParent) {
          return {
            ...cell,
            view: !allChildrenSelected,
            create: !allChildrenSelected,
            edit: !allChildrenSelected,
            delete: !allChildrenSelected,
            export: !allChildrenSelected
          };
        }
        return cell;
      })
    );
  };

  const toggleAllColumn = (operation: keyof ModulePermission) => {
    const allSelected = permissionMatrix.every(cell => cell[operation]);
    
    setPermissionMatrix(prev =>
      prev.map(cell => ({
        ...cell,
        [operation]: !allSelected
      }))
    );
  };

  // ========== 保存权限 ==========
  const savePermissions = async () => {
    if (!selectedRole) {
      showError('请先选择一个角色');
      return;
    }

    const confirmed = await showConfirm(
      `确定要保存角色"${selectedRole.name}"的权限配置吗？`,
      '保存后将立即生效'
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      // 转换回权限对象格式
      const permissions: Record<string, any> = {};

      permissionMatrix.forEach(cell => {
        const [parentId, childId] = cell.moduleId.split('.');
        
        if (childId) {
          // 子模块
          if (!permissions[parentId]) {
            permissions[parentId] = {};
          }
          permissions[parentId][childId] = {
            view: cell.view,
            create: cell.create,
            edit: cell.edit,
            delete: cell.delete,
            export: cell.export
          };
        } else {
          // 一级模块
          permissions[cell.moduleId] = {
            view: cell.view,
            create: cell.create,
            edit: cell.edit,
            delete: cell.delete,
            export: cell.export
          };
        }
      });

      // 更新数据库
      const db = app.database();
      await db.collection('role_permissions')
        .doc(selectedRole._id)
        .update({
          permissions,
          updatedAt: new Date()
        });

      showSuccess('权限保存成功');
      loadRoles(); // 重新加载
    } catch (error) {
      console.error('保存权限失败:', error);
      showError('保存权限失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== 新增角色 ==========
  const handleCreateRole = () => {
    setNewRoleName('');
    setNewRoleDesc('');
    setShowCreateModal(true);
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      showError('请输入角色名称');
      return;
    }

    // 检查角色名是否已存在
    if (roles.some(r => r.name === newRoleName.trim())) {
      showError('角色名称已存在');
      return;
    }

    try {
      const db = app.database();
      
      // 创建新角色（默认无权限）
      const result = await db.collection('role_permissions').add({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permissions: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      showSuccess('角色创建成功');
      setShowCreateModal(false);
      
      // 重新加载角色列表
      await loadRoles();
      
      // 选中新创建的角色
      const newRole = roles.find(r => r._id === result.id);
      if (newRole) {
        selectRole(newRole);
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      showError('创建角色失败');
    }
  };

  // ========== 删除角色 ==========
  const handleDeleteRole = async (role: Role, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发选择

    // 防止删除admin和manager等核心角色
    const protectedRoles = ['admin', 'manager', '管理员', '经理'];
    if (role.name && protectedRoles.includes(role.name.toLowerCase())) {
      showError('该角色不能删除');
      return;
    }

    const confirmed = await showConfirm(
      `确定要删除角色"${role.name}"吗？`,
      '删除后无法恢复，该角色的所有权限配置将被清除'
    );

    if (!confirmed) return;

    try {
      const db = app.database();
      await db.collection('role_permissions')
        .doc(role._id)
        .remove();

      showSuccess('角色删除成功');
      
      // 如果删除的是当前选中的角色，清空选中状态
      if (selectedRole?._id === role._id) {
        setSelectedRole(null);
        setPermissionMatrix([]);
      }
      
      // 重新加载
      loadRoles();
    } catch (error) {
      console.error('删除角色失败:', error);
      showError('删除角色失败');
    }
  };

  // ========== 编辑角色 ==========
  const handleEditRole = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发选择
    
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setShowEditModal(true);
  };

  const updateRole = async () => {
    if (!editingRole) return;

    if (!editRoleName.trim()) {
      showError('请输入角色名称');
      return;
    }

    // 检查角色名是否已存在（排除当前角色）
    if (roles.some(r => r._id !== editingRole._id && r.name === editRoleName.trim())) {
      showError('角色名称已存在');
      return;
    }

    try {
      const db = app.database();
      
      await db.collection('role_permissions')
        .doc(editingRole._id)
        .update({
          name: editRoleName.trim(),
          description: editRoleDesc.trim() || undefined,
          updatedAt: new Date()
        });

      showSuccess('角色更新成功');
      setShowEditModal(false);
      
      // 重新加载角色列表
      await loadRoles();
      
      // 如果编辑的是当前选中的角色，更新选中状态
      if (selectedRole?._id === editingRole._id) {
        const updatedRole = roles.find(r => r._id === editingRole._id);
        if (updatedRole) {
          setSelectedRole(updatedRole);
        }
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      showError('更新角色失败');
    }
  };

  // ========== 渲染 ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">角色权限管理</h1>
            <p className="text-sm text-gray-500 mt-1">配置不同角色的功能模块访问权限</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={savePermissions}
            disabled={!selectedRole || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧角色列表 */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">角色列表</h2>
            <button
              onClick={handleCreateRole}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="新增角色"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {roles.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                暂无角色数据
              </div>
            ) : (
              <div className="p-2">
                {roles.map(role => (
                  <div
                    key={role._id}
                    className={`group relative rounded-lg mb-2 transition-colors ${
                      selectedRole?._id === role._id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => selectRole(role)}
                      className="w-full text-left px-4 py-3"
                    >
                      <div className="font-medium text-gray-900">{role.name}</div>
                      {role.description && (
                        <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                      )}
                    </button>
                    
                    {/* 编辑和删除按钮 - 鼠标悬停显示 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 编辑按钮 */}
                      <button
                        onClick={(e) => handleEditRole(role, e)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑角色"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* 删除按钮 - 仅非核心角色显示 */}
                      {role.name && !['admin', 'manager', '管理员', '经理'].includes(role.name.toLowerCase()) && (
                        <button
                          onClick={(e) => handleDeleteRole(role, e)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除角色"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧权限矩阵 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedRole ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              请从左侧选择一个角色
            </div>
          ) : (
            <>
              <div className="px-6 py-4 bg-white border-b">
                <h2 className="font-semibold text-gray-900">
                  {selectedRole.name} - 功能权限配置
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  点击 ▶/▼ 展开/折叠模块 • 点击 ✅/❌ 切换权限 • 支持批量操作
                </p>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-r w-80">
                        功能模块
                      </th>
                      {OPERATION_COLUMNS.map(op => (
                        <th
                          key={op}
                          className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleAllColumn(OPERATION_KEYS[op])}
                          title={`全选/取消全选 ${op}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>{op}</span>
                            <CheckSquare className="w-4 h-4 text-gray-400" />
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b w-24">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleGroups.map((group) => {
                      const isExpanded = expandedModules.has(group.parentId);
                      
                      // 统计已启用的子功能数（至少有1个权限被启用就算）
                      const enabledCount = group.children.filter(child => 
                        [child.view, child.create, child.edit, child.delete, child.export].some(Boolean)
                      ).length;
                      const totalCount = group.children.length;

                      return (
                        <React.Fragment key={group.parentId}>
                          {/* 父级行 - 深色背景 */}
                          <tr className="bg-gray-100 hover:bg-gray-150 transition-colors">
                            <td className="px-4 py-3 border-b border-r">
                              <button
                                onClick={() => toggleModuleExpand(group.parentId)}
                                className="flex items-center gap-2 w-full text-left font-semibold text-gray-900"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                                <span>{group.parentName}</span>
                                <span className="text-xs font-normal text-gray-500 ml-2">
                                  ({enabledCount}/{totalCount})
                                </span>
                              </button>
                            </td>
                            <td colSpan={5} className="px-4 py-3 text-center border-b">
                              <span className="text-sm text-gray-500">
                                {group.children.length} 个子功能
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center border-b">
                              <button
                                onClick={() => toggleParentModule(group.parentId)}
                                className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="全选/取消全选此模块"
                              >
                                批量
                              </button>
                            </td>
                          </tr>

                          {/* 子级行 - 折叠展示 */}
                          {isExpanded && group.children.map((cell) => (
                            <tr
                              key={cell.moduleId}
                              className="hover:bg-blue-50 transition-colors bg-white"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-r pl-12">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">└</span>
                                  <span>{cell.moduleName}</span>
                                </div>
                              </td>
                              {OPERATION_COLUMNS.map(op => {
                                const key = OPERATION_KEYS[op];
                                const isChecked = cell[key];

                                return (
                                  <td
                                    key={op}
                                    className="px-4 py-3 text-center border-b cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick={() => togglePermission(cell.moduleId, key)}
                                  >
                                    {isChecked ? (
                                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                                    ) : (
                                      <X className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center border-b">
                                <button
                                  onClick={() => toggleAllRow(cell.moduleId)}
                                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="全选/取消全选此行"
                                >
                                  全选
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {moduleGroups.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    暂无权限配置
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 新增角色弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新增角色</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="请输入角色名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色描述
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="请输入角色描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={createRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑角色弹窗 */}
      {showEditModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">编辑角色</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  placeholder="请输入角色名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色描述
                </label>
                <textarea
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  placeholder="请输入角色描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={updateRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
