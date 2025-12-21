import { useState, useEffect } from 'react';
import { X, Save, Calendar, FileText, TrendingUp } from 'lucide-react';
import { db, auth } from '../lib/cloudbase';

interface CreateOpportunityFollowUpModalProps {
  opportunityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOpportunityFollowUpModal({
  opportunityId,
  onClose,
  onSuccess
}: CreateOpportunityFollowUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState({
    actionType: '',
    content: '',
    nextPlan: '',
    nextDate: ''
  });

  // 加载跟进动作类型
  useEffect(() => {
    loadActionTypes();
  }, []);

  const loadActionTypes = async () => {
    try {
      const res = await db.collection('system_settings').doc('types').get();
      if (res.data && res.data.opportunityActionTypes) {
        setActionTypes(res.data.opportunityActionTypes);
        // 设置默认值为第一个选项
        if (res.data.opportunityActionTypes.length > 0) {
          setFormData(prev => ({
            ...prev,
            actionType: res.data.opportunityActionTypes[0]
          }));
        }
      } else {
        // 如果没有设置，使用默认值
        const defaultTypes = ['电话沟通', '现场拜访', '邮件联系', '方案演示', '合同谈判', '其他'];
        setActionTypes(defaultTypes);
        setFormData(prev => ({ ...prev, actionType: defaultTypes[0] }));
      }
    } catch (error) {
      console.error('加载跟进动作类型失败:', error);
      // 使用默认值
      const defaultTypes = ['电话沟通', '现场拜访', '邮件联系', '方案演示', '合同谈判', '其他'];
      setActionTypes(defaultTypes);
      setFormData(prev => ({ ...prev, actionType: defaultTypes[0] }));
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填项
    if (!formData.content.trim()) {
      alert('请填写跟进内容');
      return;
    }

    try {
      setLoading(true);

      const loginState = await auth.getLoginState();
      if (!loginState) {
        alert('请先登录');
        return;
      }

      // 创建跟进记录
      await db.collection('opportunity_followups').add({
        opportunityId,
        userId: loginState.user.uid,
        actionType: formData.actionType,
        content: formData.content,
        nextPlan: formData.nextPlan || null,
        nextDate: formData.nextDate ? new Date(formData.nextDate) : null,
        attachments: [],
        createdAt: new Date()
      });

      onSuccess();
    } catch (error) {
      console.error('创建跟进记录失败:', error);
      alert('创建失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">增加商机跟进记录</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* 跟进动作类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                跟进动作类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 跟进内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                跟进内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请详细描述本次跟进的内容..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                记录本次跟进的详细情况，包括沟通内容、客户反馈等
              </div>
            </div>

            {/* 下次跟进计划 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                下次跟进计划
              </label>
              <textarea
                value={formData.nextPlan}
                onChange={(e) => setFormData({ ...formData, nextPlan: e.target.value })}
                placeholder="计划下次跟进时要做什么..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* 下次跟进时间 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                下次跟进时间
              </label>
              <input
                type="date"
                value={formData.nextDate}
                onChange={(e) => setFormData({ ...formData, nextDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">📝 跟进记录说明</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>详细记录每次跟进的内容，便于后续查看和分析</li>
                <li>填写下次跟进计划，有助于合理安排工作</li>
                <li>跟进记录将按时间倒序显示在商机详情中</li>
              </ul>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !formData.content.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存跟进记录
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
