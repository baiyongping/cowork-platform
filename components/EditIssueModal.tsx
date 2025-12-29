import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Issue, IssueType, IssueStatus, IssueResult, IssuePriority, IssueUrgency, IssueSolution } from '../types/issue';
import AttachmentUploader from './AttachmentUploader';
import { checkIssuePermission } from '../utils/permission';

interface EditIssueModalProps {
  issue: Issue;
  onClose: () => void;
  onSuccess: () => void;
  issueTypes: string[];
}

export default function EditIssueModal({ 
  issue, 
  onClose, 
  onSuccess, 
  issueTypes 
}: EditIssueModalProps) {
  // 固定的问题状态选项
  const issueStatuses = ['待接收', '处理中', '已处理', '已确认'];
  const [formData, setFormData] = useState({
    name: issue.name,
    type: issue.type,
    status: issue.status,
    result: issue.result,
    solution: issue.solution,
    priority: issue.priority || '一般重要',
    urgency: issue.urgency || '近期解决',
    owner: issue.owner?._id || '',
    solvers: issue.solvers?.filter(s => s && s._id).map(s => s._id) || [],
    startDate: issue.startDate ? new Date(issue.startDate).toISOString().split('T')[0] : '',
    endDate: issue.endDate ? new Date(issue.endDate).toISOString().split('T')[0] : '',
    suggestions: issue.suggestions || '',
    attachments: issue.attachments || [],
    isPublic: issue.isPublic !== undefined ? issue.isPublic : true
  });

  const [publicType, setPublicType] = useState<'team' | 'all' | 'none'>(() => {
    if (issue.isPublic === true) return 'all';
    if (issue.isPublic === false) return 'none';
    return 'team';
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // ✅ 支持 _id 和 userId 两种字段
        const userId = user._id || user.userId;
        if (userId) {
          const result = await db.collection('users').doc(userId).get();
          if (result.data && result.data.length > 0) {
            setCurrentUser(result.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('❌ [编辑问题] 加载用户信息失败:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await db.collection('users')
        .where({ 
          approvalStatus: 'approved', 
          isActive: true,
          deleted: db.command.neq(true)
        })
        .get();
      if (result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('❌ [编辑问题] 加载用户列表失败:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '问题标题不能为空';
    }
    if (!formData.owner) {
      newErrors.owner = '发起人不能为空';
    }
    if (!formData.solvers || formData.solvers.length === 0) {
      newErrors.solvers = '问题解决人不能为空';
    }
    if (!formData.startDate) {
      newErrors.startDate = '开始日期不能为空';
    }
    if (!formData.endDate) {
      newErrors.endDate = '截止日期不能为空';
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '截止日期不能早于开始日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // 根据 publicType 更新 isPublic 字段
      const isPublicValue = publicType === 'all' ? true : (publicType === 'none' ? false : undefined);
      
      await db.collection('issues').doc(issue._id).update({
        ...formData,
        isPublic: isPublicValue,
        updatedAt: new Date().toISOString()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ [编辑问题] 提交失败:', error);
      alert('更新问题失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 权限控制
  const permission = currentUser 
    ? checkIssuePermission(currentUser._id, issue)
    : { canEditDetails: false, canEditSolution: false };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Save className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">编辑问题</h2>
                <p className="text-sm text-gray-500">修改问题信息</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 表单内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              {/* 1. 问题标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  问题标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  disabled={!permission.canEditDetails}
                  placeholder="请输入问题标题"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* 2. 问题类型 + 问题状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as IssueType }))}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    {issueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">问题状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as IssueStatus }))}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    {issueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. 重要程度 + 紧急程度 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">重要程度</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as IssuePriority }))}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="一般重要">一般重要</option>
                    <option value="非常重要">非常重要</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">紧急程度</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as IssueUrgency }))}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="近期解决">近期解决</option>
                    <option value="及时解决">及时解决</option>
                  </select>
                </div>
              </div>

              {/* 4. 开始日期 + 截止日期 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开始日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, startDate: e.target.value }));
                      if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                    }}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    } ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    截止日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, endDate: e.target.value }));
                      if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                    }}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    } ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
                </div>
              </div>

              {/* 5. 发起人 + 问题解决人 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发起人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.owner}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, owner: e.target.value }));
                      if (errors.owner) setErrors(prev => ({ ...prev, owner: '' }));
                    }}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.owner ? 'border-red-500' : 'border-gray-300'
                    } ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">请选择发起人</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  {errors.owner && <p className="mt-1 text-sm text-red-500">{errors.owner}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    问题解决人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.solvers[0] || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, solvers: e.target.value ? [e.target.value] : [] }));
                      if (errors.solvers) setErrors(prev => ({ ...prev, solvers: '' }));
                    }}
                    disabled={!permission.canEditDetails}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.solvers ? 'border-red-500' : 'border-gray-300'
                    } ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">请选择解决人</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  {errors.solvers && <p className="mt-1 text-sm text-red-500">{errors.solvers}</p>}
                </div>
              </div>

              {/* 6. 问题描述及建议 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">问题描述及建议</label>
                <textarea
                  value={formData.suggestions || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, suggestions: e.target.value }))}
                  disabled={!permission.canEditDetails}
                  placeholder="请填写问题的详细描述和建议..."
                  rows={4}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${!permission.canEditDetails ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* 7. 附件上传 */}
              {permission.canEditDetails && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">附件</label>
                  <AttachmentUploader
                    attachments={formData.attachments || []}
                    onChange={(attachments) => setFormData(prev => ({ ...prev, attachments }))}
                    maxFiles={10}
                    maxSize={50}
                  />
                </div>
              )}

              {/* 8. 公开性 - 单选框（并排显示） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公开性</label>
                <div className="flex items-center gap-6">
                  <label className={`flex items-center ${!permission.canEditDetails ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="publicType"
                      value="team"
                      checked={publicType === 'team'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      disabled={!permission.canEditDetails}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">团队公开</span>
                  </label>
                  <label className={`flex items-center ${!permission.canEditDetails ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="publicType"
                      value="all"
                      checked={publicType === 'all'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      disabled={!permission.canEditDetails}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">所有人公开</span>
                  </label>
                  <label className={`flex items-center ${!permission.canEditDetails ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="publicType"
                      value="none"
                      checked={publicType === 'none'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      disabled={!permission.canEditDetails}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">不公开</span>
                  </label>
                </div>
              </div>

              {/* 9. 解决方式 + 解决结果 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">解决方式</label>
                  <select
                    value={formData.solution || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value as IssueSolution || undefined }))}
                    disabled={!permission.canEditSolution}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditSolution ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">请选择解决方式</option>
                    <option value="现在解决">现在解决</option>
                    <option value="会议研讨解决">会议研讨解决</option>
                    <option value="转交他人解决">转交他人解决</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">解决结果</label>
                  <select
                    value={formData.result || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value as IssueResult || undefined }))}
                    disabled={!permission.canEditSolution}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!permission.canEditSolution ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">请选择解决结果</option>
                    <option value="未确定">未确定</option>
                    <option value="已解决">已解决</option>
                    <option value="无法解决">无法解决</option>
                    <option value="暂缓解决">暂缓解决</option>
                    <option value="取消">取消</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
          </div>

          {/* 底部按钮 - 固定在底部 */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
