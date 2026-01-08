import React, { useState } from 'react';
import { Plus, Shield, Users, Briefcase, UserCheck, Edit2 } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface RoleListPanelProps {
  roles: Role[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  onCreateRole?: () => void;
  onEditRole?: (roleId: string) => void;
  canEdit?: boolean;
}

const getRoleIcon = (roleName: string) => {
  const iconClass = "w-5 h-5";
  switch (roleName) {
    case '管理员':
      return <Shield className={iconClass} />;
    case '销售':
      return <Users className={iconClass} />;
    case '财务':
      return <Briefcase className={iconClass} />;
    default:
      return <UserCheck className={iconClass} />;
  }
};

export const RoleListPanel: React.FC<RoleListPanelProps> = ({
  roles,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  onEditRole,
  canEdit = true
}) => {
  const handleEditClick = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止选中角色
    
    if (!canEdit) {
      alert('您没有权限编辑角色');
      return;
    }
    
    if (onEditRole) {
      onEditRole(roleId);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 max-w-sm">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">角色列表</h3>
      </div>

      {/* 角色列表 */}
      <div className="flex-1 overflow-y-auto">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`
              w-full px-4 py-3 flex items-center gap-3
              transition-colors duration-150
              border-l-4
              ${selectedRoleId === role.id
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'border-transparent hover:bg-gray-50 text-gray-700'
              }
            `}
          >
            <button
              onClick={() => onSelectRole(role.id)}
              className="flex-1 flex items-center gap-3 text-left min-w-0"
            >
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
                ${selectedRoleId === role.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
              `}>
                {getRoleIcon(role.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`
                  text-sm font-medium truncate
                  ${selectedRoleId === role.id ? 'text-blue-900' : 'text-gray-900'}
                `}>
                  {role.name}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {role.description}
                </div>
              </div>
            </button>
            
            {/* 编辑按钮 */}
            {canEdit && (
              <button
                onClick={(e) => handleEditClick(role.id, e)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="编辑角色"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 新增按钮 */}
      {onCreateRole && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onCreateRole}
            className="
              w-full px-4 py-2.5 flex items-center justify-center gap-2
              text-sm font-medium text-blue-600
              bg-blue-50 hover:bg-blue-100
              rounded-lg transition-colors duration-150
            "
          >
            <Plus className="w-4 h-4" />
            新增角色
          </button>
        </div>
      )}
    </div>
  );
};
