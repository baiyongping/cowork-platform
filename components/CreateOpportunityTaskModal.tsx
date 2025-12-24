import { useState, useEffect } from 'react';
import { X, AlertCircle, UserPlus } from 'lucide-react';
import { app, db } from '../lib/cloudbase';
import type { 
  CreateTaskDto, TaskLevel, TaskStatus, 
  OpportunityActionType 
} from '../types/task';
import type { Opportunity } from '../types/opportunity';
import CollaboratorSelector from './CollaboratorSelector';
import { UserAvatar } from './UserAvatar';

interface CreateOpportunityTaskModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}

// 商机跟进动作类型选项
const opportunityActionTypes: OpportunityActionType[] = [
  '拜访客户',
  '联络客户感情',
  '了解年度采购计划',
  '提交公司资质和案例',
  '样衣展示和试穿',
  '提交定制方案和报价',
  '提交投标文件',
  '价格谈判',
  '合同条款确认',
  '其它'
];

export default function CreateOpportunityTaskModal({ opportunity, onClose, onSuccess }: CreateOpportunityTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskDto>({
    name: '',
    level: '个人级',
    type: '商机跟进', // 固定为商机跟进
    status: '未开始',
    progress: 0,
    owner: '',
    collaborators: [],
    team: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    isPublic: true,
    opportunityActionType: undefined, // 需要用户选择
    relatedTo: opportunity._id // 关联当前商机
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showCollaboratorSelector, setShowCollaboratorSelector] = useState(false);

  // 获取当前用户
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      // 从 localStorage 读取当前登录用户信息
      const storedUser = localStorage.getItem('current_user');
      console.log('📝 [商机跟进任务] localStorage中的用户:', storedUser);
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('✅ [商机跟进任务] 用户信息加载成功:', user);
        
        // 从数据库查询完整的用户信息
        const result = await db.collection('users').doc(user.userId).get();
        console.log('📝 [商机跟进任务] 数据库查询结果:', result);
        
        if (result.data && result.data.length > 0) {
          const dbUser = result.data[0];
          console.log('✅ [商机跟进任务] 数据库用户信息:', dbUser);
          setCurrentUser(dbUser);
          // 设置负责人为当前用户
          setFormData(prev => ({ 
            ...prev, 
            owner: dbUser._id 
          }));
        } else {
          // 如果数据库查询失败,使用 localStorage 的数据
          console.warn('⚠️ [商机跟进任务] 数据库未找到用户,使用localStorage数据');
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
      } else {
        console.error('❌ [商机跟进任务] localStorage中没有用户信息');
      }
    } catch (error) {
      console.error('❌ [商机跟进任务] 加载用户信息失败:', error);
    }
  };

  // 加载用户列表（用于选择协同人）
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await db.collection('users')
        .where({ approvalStatus: 'approved', isActive: true })
        .get();
      if (result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  // 根据任务类型获取状态选项
  const getStatusOptions = (): string[] => {
    return ['未开始', '进行中', '已完成', '延期', '取消', '暂停'];
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '任务名称不能为空';
    }

    if (!formData.owner) {
      newErrors.owner = '请选择负责人';
    }

    if (!formData.startDate) {
      newErrors.startDate = '请选择开始日期';
    }

    if (!formData.endDate) {
      newErrors.endDate = '请选择截止日期';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = '截止日期不能早于开始日期';
      }
    }

    if (!formData.opportunityActionType) {
      newErrors.opportunityActionType = '请选择商机跟进动作类型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查当前用户是否已加载
    if (!currentUser || !currentUser._id) {
      alert('用户信息加载中，请稍后再试');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      console.log('📝 [商机跟进任务] 提交数据:', formData);

      const result = await db.collection('tasks').add({
        ...formData,
        createdBy: currentUser._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ [商机跟进任务] 任务创建成功');

      // 发送消息通知给负责人
      if (formData.owner && formData.owner !== currentUser._id) {
        try {
          await app.callFunction({
            name: 'task-message',
            data: {
              action: 'create',
              taskId: result.id,
              taskName: formData.name,
              taskLevel: formData.level,
              receiver: formData.owner
            }
          });
          console.log('✅ [商机跟进任务] 消息通知已发送');
        } catch (error) {
          console.error('❌ [商机跟进任务] 消息通知失败:', error);
        }
      }

      // 发送消息通知给协同人
      if (formData.collaborators && formData.collaborators.length > 0) {
        const collaboratorsToNotify = formData.collaborators.filter(
          c => c !== currentUser._id && c !== formData.owner
        );
        if (collaboratorsToNotify.length > 0) {
          try {
            await app.callFunction({
              name: 'task-message',
              data: {
                action: 'collaborator',
                taskId: result.id,
                taskName: formData.name,
                taskLevel: formData.level,
                receivers: collaboratorsToNotify
              }
            });
            console.log('✅ [商机跟进任务] 协同人通知已发送');
          } catch (error) {
            console.error('❌ [商机跟进任务] 协同人通知失败:', error);
          }
        }
      }

      // 直接关闭模态框并刷新列表，不显示确认弹窗
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ [商机跟进任务] 创建失败:', error);
      alert(`创建任务失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">新增商机跟进任务</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 关联商机信息提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">此任务将关联商机</p>
                <p className="text-sm text-blue-700 mt-1">
                  <span className="font-medium">商机名称：</span>{opportunity.name}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">客户名称：</span>{opportunity.customer}
                </p>
              </div>
            </div>
          </div>

          {/* 任务名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入任务名称"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.name}
              </p>
            )}
          </div>

          {/* 任务级别和类型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务级别 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as TaskLevel })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="个人级">个人级</option>
                <option value="团队级">团队级</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务类型
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
                商机跟进
              </div>
            </div>
          </div>

          {/* 商机跟进动作类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商机跟进动作类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.opportunityActionType || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                opportunityActionType: e.target.value as OpportunityActionType 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择</option>
              {opportunityActionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.opportunityActionType && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.opportunityActionType}
              </p>
            )}
          </div>

          {/* 任务状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务状态 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => {
                const newStatus = e.target.value as TaskStatus;
                setFormData({ 
                  ...formData, 
                  status: newStatus,
                  // 状态为"已完成"时，自动将进度设为100%
                  progress: newStatus === '已完成' ? 100 : formData.progress
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getStatusOptions().map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* 完成进度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              完成进度: {formData.progress}%
              {formData.status !== '进行中' && (
                <span className="text-xs text-gray-500 ml-2">
                  （仅在"进行中"状态时可编辑）
                </span>
              )}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              disabled={formData.status !== '进行中'}
              className={`w-full ${formData.status !== '进行中' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 负责人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              负责人 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择负责人</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.department || '未分配部门'})
                </option>
              ))}
            </select>
            {errors.owner && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.owner}
              </p>
            )}
          </div>

          {/* 协同人（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              协同人（可选）
            </label>
            <div className="space-y-2">
              {/* 添加协同人按钮 */}
              <button
                type="button"
                onClick={() => setShowCollaboratorSelector(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
              >
                <UserPlus className="w-5 h-5" />
                <span>选择协同人</span>
              </button>

              {/* 已选择的协同人列表 */}
              {formData.collaborators && formData.collaborators.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      已选择 {formData.collaborators.length} 位协同人
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, collaborators: [] })}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.collaborators.map(collaboratorId => {
                      const user = users.find(u => u._id === collaboratorId);
                      if (!user) return null;
                      return (
                        <div
                          key={user._id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm"
                        >
                          <UserAvatar user={user} size="xs" />
                          <span className="text-gray-900">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                collaborators: formData.collaborators?.filter(id => id !== user._id)
                              });
                            }}
                            className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 开始日期和截止日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                截止日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* 任务描述（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务描述（可选）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入任务描述..."
            />
          </div>

          {/* 可见性设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              可见性设置
            </label>
            <div className="space-y-3">
              {/* 团队可见 */}
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={formData.isPublic === true}
                  onChange={() => setFormData({ ...formData, isPublic: true })}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">团队可见</div>
                  <div className="text-xs text-gray-500 mt-1">
                    所有团队成员都可以查看此任务
                  </div>
                </div>
              </label>

              {/* 不公开 */}
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-orange-50 hover:border-orange-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.isPublic === false}
                  onChange={() => setFormData({ ...formData, isPublic: false })}
                  className="mt-0.5 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">不公开</div>
                  <div className="text-xs text-gray-500 mt-1">
                    仅任务负责人、协同人、部门负责人和管理员可见
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !currentUser}
            >
              {!currentUser ? '加载中...' : submitting ? '创建中...' : '创建任务'}
            </button>
          </div>
        </form>

        {/* 协同人选择器 */}
        {showCollaboratorSelector && (
          <CollaboratorSelector
            selectedIds={formData.collaborators || []}
            excludeIds={formData.owner ? [formData.owner] : []}
            onConfirm={(selectedIds) => {
              setFormData({ ...formData, collaborators: selectedIds });
            }}
            onClose={() => setShowCollaboratorSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
