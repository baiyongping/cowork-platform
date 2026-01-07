import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SafeguardMeasure } from '../types/safeguard';

interface SafeguardMeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<SafeguardMeasure>) => void;
  editing?: SafeguardMeasure | null;
  strategyId: string;
  year: number;
  users: Array<{ _id: string; name: string }>;
}

export function SafeguardMeasureModal({
  isOpen,
  onClose,
  onSubmit,
  editing,
  strategyId,
  year,
  users
}: SafeguardMeasureModalProps) {
  console.log('🎭 SafeguardMeasureModal 渲染:', { isOpen, editing, strategyId, year });
  
  const [formData, setFormData] = useState<Partial<SafeguardMeasure>>({
    strategyId,
    year,
    content: '',
    owner: '',
    ownerId: '',
    deadline: '',
    status: '进行中'
  });

  useEffect(() => {
    if (editing) {
      setFormData({
        ...editing,
        deadline: editing.deadline ? new Date(editing.deadline).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        strategyId,
        year,
        content: '',
        owner: '',
        ownerId: '',
        deadline: '',
        status: '进行中'
      });
    }
  }, [editing, strategyId, year]);

  const handleOwnerChange = (ownerId: string) => {
    const selectedUser = users.find(u => u._id === ownerId);
    setFormData({
      ...formData,
      ownerId,
      owner: selectedUser?.name || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 提交表单:', formData);

    if (!formData.content?.trim()) {
      alert('请输入措施内容');
      return;
    }
    if (!formData.ownerId) {
      alert('请选择负责人');
      return;
    }
    if (!formData.deadline) {
      alert('请选择截止日期');
      return;
    }

    console.log('✅ 表单验证通过，调用 onSubmit');
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editing ? '编辑保障措施' : '添加保障措施'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 措施内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              措施内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入保障措施内容..."
            />
          </div>

          {/* 年度（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年度
            </label>
            <input
              type="number"
              value={formData.year || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* 负责人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              负责人 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.ownerId || ''}
              onChange={(e) => handleOwnerChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择负责人</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* 截止日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              截止日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.deadline || ''}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 状态（仅编辑时显示） */}
          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={formData.status || '进行中'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="未开始">未开始</option>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
                <option value="暂停">暂停</option>
              </select>
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>完成度自动计算：</strong>保障措施的完成度将根据关联的季度措施完成度自动计算。
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editing ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
