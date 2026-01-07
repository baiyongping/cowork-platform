import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { SafeguardMeasure } from '../types/safeguard';

interface SafeguardInlineFormProps {
  editing?: SafeguardMeasure | null;
  onSubmit: (data: Partial<SafeguardMeasure>) => void;
  onCancel: () => void;
  strategyId: string;
  year: number;
  users: Array<{ _id: string; name: string }>;
}

export function SafeguardInlineForm({
  editing,
  onSubmit,
  onCancel,
  strategyId,
  year,
  users
}: SafeguardInlineFormProps) {
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
    }
  }, [editing]);

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

    onSubmit(formData);
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-gray-900">
          {editing ? '编辑保障措施' : '添加保障措施'}
        </h4>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="取消"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 措施内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            措施内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入保障措施内容..."
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 负责人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              截止日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.deadline || ''}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 状态（仅编辑时显示） */}
        {editing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {editing ? '保存' : '添加'}
          </button>
        </div>
      </form>
    </div>
  );
}
