import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { QuarterlyMeasure } from '../types/safeguard';

interface QuarterlyInlineFormProps {
  editing?: QuarterlyMeasure | null;
  onSubmit: (data: Partial<QuarterlyMeasure>) => void;
  onCancel: () => void;
  safeguardMeasureId: string;
  year: number;
  users: Array<{ _id: string; name: string }>;
}

export function QuarterlyInlineForm({
  editing,
  onSubmit,
  onCancel,
  safeguardMeasureId,
  year,
  users
}: QuarterlyInlineFormProps) {
  const [formData, setFormData] = useState<Partial<QuarterlyMeasure>>({
    safeguardMeasureId,
    year,
    quarter: 1,
    content: '',
    owner: '',
    ownerId: '',
    deadline: '',
    status: '进行中',
    completionRate: 0
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
    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-3 ml-6">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-gray-900">
          {editing ? '编辑季度措施' : '添加季度措施'}
        </h5>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="取消"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 季度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            季度 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.quarter || 1}
            onChange={(e) => setFormData({ ...formData, quarter: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value={1}>第一季度</option>
            <option value={2}>第二季度</option>
            <option value={3}>第三季度</option>
            <option value={4}>第四季度</option>
          </select>
        </div>

        {/* 措施内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            措施内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="请输入季度措施内容..."
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 负责人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              负责人 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.ownerId || ''}
              onChange={(e) => handleOwnerChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
        </div>

        {/* 状态和完成度（仅编辑时显示） */}
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status || '进行中'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="未开始">未开始</option>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
                <option value="暂停">暂停</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                完成度 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.completionRate || 0}
                onChange={(e) => setFormData({ ...formData, completionRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {editing ? '保存' : '添加'}
          </button>
        </div>
      </form>
    </div>
  );
}
