import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Role {
  _id: string;
  name: string;
  description?: string;
}

interface RoleEditModalProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleId: string, name: string, description: string) => void;
  onDelete: (roleId: string) => void;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({
  role,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && role) {
      setName(role.name);
      setDescription(role.description || '');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入角色名称');
      return;
    }
    onSave(role._id, name.trim(), description.trim());
    onClose();
  };

  const handleDelete = () => {
    onDelete(role._id);
    onClose();
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">编辑角色</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="px-6 py-4 space-y-4">
            {/* 角色名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入角色名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            {/* 角色说明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色说明
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入角色说明"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
            </div>
          </div>

          {/* 删除确认提示 */}
          {showDeleteConfirm && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">
                    确认删除角色?
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    删除后该角色的所有权限配置将被清空,且无法恢复
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {/* 删除按钮(左侧) */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                删除
              </button>
            ) : (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                确认删除
              </button>
            )}

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoleEditModal;
