import { useState, useEffect } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import { app, db } from '../lib/cloudbase';
import CollaboratorSelector from './CollaboratorSelector';
import type { ProjectStatus, ProjectType, ProjectPriority, ProjectPhase } from '../types/project';
import { UserAvatar } from './UserAvatar';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: '项目未开始' as ProjectStatus, // 固定为"项目未开始"
    phase: '需求分析' as ProjectPhase,
    customer: '',
    startDate: '',
    progress: 0,
    description: '',
    owner: '',
    members: [] as string[],
    opportunityId: '', // 关联商机
  });

  const [users, setUsers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadOpportunities();
  }, []);

  const loadCurrentUser = async () => {
    try {
      // 🔧 修复:使用正确的 localStorage key
      const storedUser = localStorage.getItem('current_user');
      
      if (!storedUser) {
        console.error('❌ [项目创建] 未找到登录用户信息');
        alert('未找到登录信息，请重新登录');
        return;
      }
      
      const loginUser = JSON.parse(storedUser);
      
      // 🔧 验证必要字段
      const userId = loginUser.userId || loginUser._id;
      if (!userId) {
        console.error('❌ [项目创建] 用户数据缺少ID字段:', loginUser);
        alert('用户数据异常，请重新登录');
        return;
      }
      
      console.log('✅ [项目创建] 加载当前用户:', {
        userId,
        username: loginUser.username,
        name: loginUser.name
      });
      
      setCurrentUser(loginUser);
      
      // 设置默认值:项目经理为操作者,立项日期为当前日期
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ 
        ...prev, 
        owner: userId, // 使用验证后的 userId
        startDate: today
      }));
    } catch (error) {
      console.error('❌ [项目创建] 加载当前用户失败:', error);
      alert('加载用户信息失败，请重新登录');
    }
  };

  const loadUsers = async () => {
    try {
      const result = await db.collection('users').get();
      setUsers(result.data || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const loadOpportunities = async () => {
    try {
      const cmd = db.command;
      const result = await db.collection('opportunities')
        .where({
          isDeleted: cmd.neq(true),
          isClosed: cmd.neq(true),
        })
        .orderBy('createdAt', 'desc')
        .get();
      setOpportunities(result.data || []);
    } catch (error) {
      console.error('加载商机列表失败:', error);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // 必填项验证
    if (!formData.name.trim()) newErrors.name = '项目名称不能为空';
    if (!formData.customer.trim()) newErrors.customer = '客户名称不能为空';
    if (!formData.startDate) newErrors.startDate = '项目立项日期不能为空';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    // 🔧 提交前再次验证用户信息
    if (!currentUser) {
      alert('未找到登录信息，请重新登录');
      return;
    }
    
    const userId = currentUser.userId || currentUser._id;
    if (!userId) {
      console.error('❌ [项目创建] 用户数据缺少ID字段:', currentUser);
      alert('用户数据异常，请重新登录');
      return;
    }

    try {
      setSubmitting(true);
      
      const projectData = {
        ...formData,
        type: '定制项目', // 默认类型
        priority: '中', // 默认优先级
        contactPerson: '', // 默认空
        contactPhone: '', // 默认空
        endDate: '', // 默认空
        budget: 0, // 默认0
        actualCost: 0, // 默认0
        isPublic: true, // 默认公开
        owner: userId, // 🔧 使用验证后的 userId
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId, // 🔧 使用验证后的 userId
      };
      
      console.log('📤 [项目创建] 准备创建项目:', {
        项目名称: projectData.name,
        负责人ID: projectData.owner,
        负责人姓名: currentUser.name,
        创建人ID: projectData.createdBy
      });
      
      const result = await db.collection('projects').add(projectData);
      
      console.log('✅ [项目创建] 项目创建成功:', {
        项目ID: result.id,
        项目名称: formData.name,
        负责人ID: userId,
        负责人姓名: currentUser.name
      });

      // 发送消息通知给负责人
      if (projectData.owner && projectData.owner !== currentUser._id) {
        try {
          await app.callFunction({
            name: 'project-message',
            data: {
              action: 'create',
              projectId: result.id,
              projectName: formData.name,
              receiver: projectData.owner
            }
          });
          console.log('✅ [项目创建] 消息通知已发送');
        } catch (error) {
          console.error('❌ [项目创建] 消息通知失败:', error);
        }
      }

      alert('项目创建成功！');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ [项目创建] 创建项目失败:', error);
      alert('创建项目失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">新建项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 项目基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="输入项目名称"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目编号
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="如: PRJ-2025-001 (可选)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">项目状态</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                项目未开始
              </div>
              <p className="mt-1 text-xs text-gray-500">新建项目时状态固定为"项目未开始"，编辑时可修改</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">项目经理</label>
              <select
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} {user.role === 'admin' ? '(管理员)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">默认：当前操作者</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目立项日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-3 py-2 border ${errors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
              <p className="mt-1 text-xs text-gray-500">默认：当前日期</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">项目关联商机</label>
              <select
                value={formData.opportunityId}
                onChange={(e) => {
                  const selectedOpp = opportunities.find(o => o._id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    opportunityId: e.target.value,
                    // 自动填充客户名称
                    customer: selectedOpp?.customerName || formData.customer
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">未知</option>
                {opportunities.map(opp => (
                  <option key={opp._id} value={opp._id}>
                    {opp.name} - {opp.customerName} ({opp.expectedAmount}万元)
                  </option>
                ))}
              </select>
              {formData.opportunityId && (
                <p className="mt-1 text-xs text-blue-600">
                  提示：已自动填充客户名称
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                客户名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className={`w-full px-3 py-2 border ${errors.customer ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
                placeholder="输入客户名称"
              />
              {errors.customer && <p className="mt-1 text-sm text-red-500">{errors.customer}</p>}
            </div>
          </div>

          {/* 协同人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">协同人</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMemberSelector(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
              >
                <UserPlus className="w-5 h-5" />
                <span>选择协同人</span>
              </button>

              {formData.members.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      已选择 {formData.members.length} 位协同人
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, members: [] })}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.members.map(memberId => {
                      const user = users.find(u => u._id === memberId);
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
                                members: formData.members.filter(id => id !== user._id)
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

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="输入项目详细描述..."
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? '创建中...' : '创建项目'}</span>
            </button>
          </div>
        </form>

        {/* 成员选择器 */}
        {showMemberSelector && (
          <CollaboratorSelector
            selectedIds={formData.members}
            excludeIds={formData.owner ? [formData.owner] : []}
            onConfirm={(selectedIds) => {
              setFormData({ ...formData, members: selectedIds });
            }}
            onClose={() => setShowMemberSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
