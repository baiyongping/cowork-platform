import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { IssueType, IssueStatus, IssueResult, IssuePriority, IssueUrgency, IssueSolution, IssueAttachment } from '../types/issue';
import AttachmentUploader from './AttachmentUploader';

interface CreateIssueDto {
  name: string;
  type: IssueType;
  status: IssueStatus;
  result?: IssueResult;
  solution?: IssueSolution; // 🆕 解决方式
  level: string; // 🆕 问题级别
  priority: IssuePriority; // 🆕 重要程度
  urgency: IssueUrgency; // 🆕 紧急程度
  owner: string;
  solvers: string[];
  startDate: string;
  endDate: string;
  suggestions?: string; // 🆕 问题描述及建议
  attachments?: IssueAttachment[]; // 🆕 附件列表
  isPublic: boolean;
  progress: number; // 🆕 完成进度
}

interface CreateIssueModalProps {
  onClose: () => void;
  onSuccess: () => void;
  issueTypes: string[];
}

export default function CreateIssueModal({ 
  onClose, 
  onSuccess, 
  issueTypes 
}: CreateIssueModalProps) {
  const [formData, setFormData] = useState<CreateIssueDto>({
    name: '',
    type: (issueTypes[0] || '销售问题') as IssueType,
    status: '待接收',
    result: '未确定' as IssueResult,
    solution: undefined as IssueSolution | undefined,
    level: '个人级',
    priority: '一般重要',
    urgency: '近期解决',
    owner: '',
    solvers: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    suggestions: '',
    attachments: [],
    isPublic: true,
    progress: 0
  });

  const [publicType, setPublicType] = useState<'team' | 'all' | 'none'>('all');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // 获取当前用户
  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const result = await db.collection('users').doc(user.userId).get();
        
        if (result.data && result.data.length > 0) {
          const dbUser = result.data[0];
          setCurrentUser(dbUser);
          setFormData(prev => ({ 
            ...prev, 
            owner: dbUser._id 
          }));
        } else {
          const fallbackUser = {
            _id: user.userId,
            username: user.username,
            name: user.name,
            role: user.role
          };
          setCurrentUser(fallbackUser);
          setFormData(prev => ({ 
            ...prev, 
            owner: user.userId 
          }));
        }
      }
    } catch (error) {
      console.error('❌ [创建问题] 加载用户信息失败:', error);
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
      console.error('❌ [创建问题] 加载用户列表失败:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '问题标题不能为空';
    }
    if (!formData.type) {
      newErrors.type = '问题类型不能为空';
    }
    if (!formData.status) {
      newErrors.status = '问题状态不能为空';
    }
    if (!formData.priority) {
      newErrors.priority = '重要程度不能为空';
    }
    if (!formData.urgency) {
      newErrors.urgency = '紧急程度不能为空';
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
    if (!formData.suggestions?.trim()) {
      newErrors.suggestions = '问题描述及建议不能为空';
    }
    if (!formData.solvers || formData.solvers.length === 0) {
      newErrors.solvers = '问题解决人不能为空';
    }
    if (formData.solvers && formData.solvers.length > 1) {
      newErrors.solvers = '问题解决人只能选择一个';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      await db.collection('issues').add({
        ...formData,
        createdBy: currentUser._id,
        solvers: formData.solvers || [], // 🔧 确保 solvers 字段存在
        isDeleted: false, // 🔧 确保 isDeleted 字段存在
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ [创建问题] 提交失败:', error);
      alert('创建问题失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">创建问题</h2>
                <p className="text-sm text-gray-500">记录和跟踪项目问题</p>
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
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* 1. 问题标题 (必填) */}
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
                  placeholder="请输入问题标题"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* 2. 问题类型 + 问题状态 - 并排显示 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    问题类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, type: e.target.value as IssueType }));
                      if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {issueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    问题状态 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, status: e.target.value as IssueStatus }));
                      if (errors.status) setErrors(prev => ({ ...prev, status: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.status ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="待接收">待接收</option>
                    <option value="处理中">处理中</option>
                    <option value="已处理">已处理</option>
                    <option value="待确认">待确认</option>
                    <option value="已确认">已确认</option>
                  </select>
                  {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                </div>
              </div>

              {/* 3. 重要程度 + 紧急程度 - 并排显示 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重要程度 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, priority: e.target.value as IssuePriority }));
                      if (errors.priority) setErrors(prev => ({ ...prev, priority: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.priority ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="一般重要">一般重要</option>
                    <option value="非常重要">非常重要</option>
                  </select>
                  {errors.priority && <p className="mt-1 text-sm text-red-500">{errors.priority}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    紧急程度 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, urgency: e.target.value as IssueUrgency }));
                      if (errors.urgency) setErrors(prev => ({ ...prev, urgency: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.urgency ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="近期解决">近期解决</option>
                    <option value="及时解决">及时解决</option>
                  </select>
                  {errors.urgency && <p className="mt-1 text-sm text-red-500">{errors.urgency}</p>}
                </div>
              </div>

              {/* 4. 开始日期 + 截止日期 - 并排显示 */}
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
                </div>
              </div>

              {/* 5. 发起人 + 问题解决人 - 并排显示，单一选择 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发起人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.owner}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled
                  >
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">默认为当前操作者</p>
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.solvers ? 'border-red-500' : 'border-gray-300'
                    }`}
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

              {/* 6. 问题描述及建议 - 多行文本 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  问题描述及建议 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.suggestions}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, suggestions: e.target.value }));
                    if (errors.suggestions) setErrors(prev => ({ ...prev, suggestions: '' }));
                  }}
                  rows={4}
                  placeholder="请详细描述问题并提供建议..."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                    errors.suggestions ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.suggestions && <p className="mt-1 text-sm text-red-500">{errors.suggestions}</p>}
              </div>

              {/* 7. 附件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  附件
                </label>
                <AttachmentUploader
                  attachments={formData.attachments || []}
                  onChange={(attachments: IssueAttachment[]) => 
                    setFormData(prev => ({ ...prev, attachments }))
                  }
                />
              </div>

              {/* 8. 公开性 - 单选框（并排显示） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  公开性 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="publicType"
                      value="team"
                      checked={publicType === 'team'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">团队公开</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="publicType"
                      value="all"
                      checked={publicType === 'all'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">所有人公开</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="publicType"
                      value="none"
                      checked={publicType === 'none'}
                      onChange={(e) => setPublicType(e.target.value as 'team' | 'all' | 'none')}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">不公开</span>
                  </label>
                </div>
              </div>

              {/* 9. 解决方式 + 解决结果 - 并排显示（创建时禁用） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解决方式
                  </label>
                  <select
                    value={formData.solution || ''}
                    disabled={true}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  >
                    <option value="">创建后由解决人填写</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">此字段由问题解决人在处理问题时填写</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解决结果
                  </label>
                  <select
                    value={formData.result || '未确定'}
                    disabled={true}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  >
                    <option value="未确定">未确定</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">此字段由问题解决人在处理问题时填写</p>
                </div>
              </div>
            </div>
          </form>

          {/* 底部按钮 - 固定在底部 */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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
              {submitting ? '创建中...' : '创建问题'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
