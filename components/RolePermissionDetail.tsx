import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check, X, Edit, Trash2, Save, Shield } from 'lucide-react';
import { SYSTEM_MODULES, ModuleDefinition } from '../constants/modules';

interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

interface PermissionItem {
  id: string;
  name: string;
  permission?: Permission; // 使 permission 可选
  children?: PermissionItem[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: {
    [key: string]: PermissionItem;
  };
}

interface RolePermissionDetailProps {
  role: Role | null;
  onUpdatePermission: (roleId: string, moduleId: string, permissionKey: keyof Permission, value: boolean) => void;
  onEditRole: (roleId: string) => void;
  onDeleteRole: (roleId: string) => void;
  quickEditMode: boolean;
  onToggleQuickEdit: () => void;
}

const PermissionIcon: React.FC<{ value: boolean; onChange?: () => void; disabled?: boolean }> = ({ 
  value, 
  onChange, 
  disabled 
}) => {
  return (
    <button
      onClick={onChange}
      disabled={disabled || !onChange}
      className={`
        w-6 h-6 rounded flex items-center justify-center
        transition-all duration-150
        ${value 
          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }
        ${disabled || !onChange ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );
};

const PermissionRow: React.FC<{
  item: PermissionItem;
  roleId: string;
  level: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdatePermission: (moduleId: string, permissionKey: keyof Permission, value: boolean) => void;
  quickEditMode: boolean;
}> = ({ item, roleId, level, expanded, onToggle, onUpdatePermission, quickEditMode }) => {
  const hasChildren = item.children && item.children.length > 0;
  const [childrenExpanded, setChildrenExpanded] = useState<{ [key: string]: boolean }>({});

  const toggleChild = (childId: string) => {
    setChildrenExpanded(prev => ({ ...prev, [childId]: !prev[childId] }));
  };

  return (
    <>
      {/* 父模块行 */}
      <div 
        className={`
          grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3
          border-b border-gray-100
          ${level > 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}
          transition-colors duration-150
        `}
        style={{ paddingLeft: `${20 + level * 24}px` }}
      >
        {/* 模块名 */}
        <div className="flex items-center gap-2">
          {hasChildren && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          <span className={`text-sm ${level === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
            {item.name}
          </span>
        </div>

        {/* 权限图标 */}
        <PermissionIcon 
          value={item.permission?.view || false} 
          onChange={quickEditMode ? () => onUpdatePermission(item.id, 'view', !item.permission?.view) : undefined}
          disabled={!quickEditMode}
        />
        <PermissionIcon 
          value={item.permission?.create || false} 
          onChange={quickEditMode ? () => onUpdatePermission(item.id, 'create', !item.permission?.create) : undefined}
          disabled={!quickEditMode}
        />
        <PermissionIcon 
          value={item.permission?.edit || false} 
          onChange={quickEditMode ? () => onUpdatePermission(item.id, 'edit', !item.permission?.edit) : undefined}
          disabled={!quickEditMode}
        />
        <PermissionIcon 
          value={item.permission?.delete || false} 
          onChange={quickEditMode ? () => onUpdatePermission(item.id, 'delete', !item.permission?.delete) : undefined}
          disabled={!quickEditMode}
        />
        <PermissionIcon 
          value={item.permission?.export || false} 
          onChange={quickEditMode ? () => onUpdatePermission(item.id, 'export', !item.permission?.export) : undefined}
          disabled={!quickEditMode}
        />
      </div>

      {/* 子模块 */}
      {hasChildren && expanded && item.children!.map((child) => (
        <PermissionRow
          key={child.id}
          item={child}
          roleId={roleId}
          level={level + 1}
          expanded={childrenExpanded[child.id] || false}
          onToggle={() => toggleChild(child.id)}
          onUpdatePermission={onUpdatePermission}
          quickEditMode={quickEditMode}
        />
      ))}
    </>
  );
};

export const RolePermissionDetail: React.FC<RolePermissionDetailProps> = ({
  role,
  onUpdatePermission,
  onEditRole,
  onDeleteRole,
  quickEditMode,
  onToggleQuickEdit
}) => {
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});

  // ✅ 根据SYSTEM_MODULES动态生成权限项
  const permissionItems: PermissionItem[] = React.useMemo(() => {
    if (!role) return [];

    return SYSTEM_MODULES.map((module: ModuleDefinition) => {
      const baseItem: PermissionItem = {
        id: module.id,
        name: module.name
      };

      if (module.hasChildren && module.children) {
        // 有子模块
        baseItem.children = module.children.map((child: ModuleDefinition) => ({
          id: child.id,
          name: child.name,
          permission: role.permissions?.[module.id]?.[child.id] || {
            view: false,
            create: false,
            edit: false,
            delete: false,
            export: false
          }
        }));
        // 父模块没有独立权限,只显示名称
        baseItem.permission = undefined;
      } else {
        // 没有子模块
        baseItem.permission = role.permissions?.[module.id] || {
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false
        };
      }

      return baseItem;
    });
  }, [role]);

  if (!role) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">请选择一个角色查看权限详情</p>
        </div>
      </div>
    );
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleUpdatePermission = (moduleId: string, permissionKey: keyof Permission, value: boolean) => {
    onUpdatePermission(role.id, moduleId, permissionKey, value);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 角色信息头部 */}
      <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleQuickEdit}
              className={`
                px-3 py-1.5 flex items-center gap-2 text-sm font-medium rounded-lg
                transition-colors duration-150
                ${quickEditMode
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {quickEditMode ? (
                <>
                  <Save className="w-4 h-4" />
                  快速编辑中
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  快速编辑
                </>
              )}
            </button>
            <button
              onClick={() => onEditRole(role.id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑角色"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteRole(role.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除角色"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">{role.description}</p>
      </div>

      {/* 权限表格 - 扩展到卡片边缘 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* 表头 */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 flex-shrink-0">
          <div>功能模块</div>
          <div className="w-6 text-center">查看</div>
          <div className="w-6 text-center">新增</div>
          <div className="w-6 text-center">编辑</div>
          <div className="w-6 text-center">删除</div>
          <div className="w-6 text-center">导出</div>
        </div>

        {/* 权限列表 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {permissionItems.map((item) => (
            <PermissionRow
              key={item.id}
              item={item}
              roleId={role.id}
              level={0}
              expanded={expandedModules[item.id] || false}
              onToggle={() => toggleModule(item.id)}
              onUpdatePermission={handleUpdatePermission}
              quickEditMode={quickEditMode}
            />
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      {quickEditMode && (
        <div className="px-5 py-3 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-700">
            💡 点击权限图标可直接切换开启/关闭状态
          </p>
        </div>
      )}
    </div>
  );
};
