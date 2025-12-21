import { useState, useEffect } from 'react';
import { X, AlertCircle, UserPlus, Link2 } from 'lucide-react';
import { db, auth } from '../lib/cloudbase';
import type { Project } from '../types/project';
import type { 
  CreateTaskDto, TaskLevel, TaskType, TaskStatus, 
  OpportunityActionType, ProjectPhase 
} from '../types/task';
import CollaboratorSelector from './CollaboratorSelector';

interface CreateProjectTaskModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectTaskModal({ project, onClose, onSuccess }: CreateProjectTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskDto>({
    name: '',
    level: '个人级',
    type: '项目任务', // 固定为项目任务
    status: '未开始',
    progress: 0,
    owner: '',
    collaborators: [],
    team: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    isPublic: true,
    projectPhase: project.phase || '', // 使用当前项目的阶段
    relatedTo: project._id // 关联当前项目
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showCollaboratorSelector, setShowCollaboratorSelector] = useState(false);
  
  // 项目任务环节选项（从系统设置加载）
  const [projectPhases, setProjectPhases] = useState<string[]>([]);

  // 获取当前用户
  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadProjectPhases();
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
      console.error('加载用户信息失败:', error);
    }
  };

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
  
  // 从系统设置加载项目阶段数据
  const loadProjectPhases = async () => {
    try {
      const result = await db.collection('type_settings').get();
      
      // 默认项目环节
      const defaultPhases = [
        '物料采购', '样衣生产', '量体数据采集',
        '缝制生产', '质量检验', '产品入库',
        '物流配送', '产品交付', '售后服务'
      ];
      
      let foundPhases = false;
      
      if (result.data && Array.isArray(result.data)) {
        // 合并准备期、生产期、交付期的环节
        const allPhases: string[] = [];
        
        result.data.forEach((item: any) => {
          if (item.values && Array.isArray(item.values)) {
            const enabledValues = item.values
              .filter((v: any) => v.enabled !== false)
              .map((v: any) => typeof v === 'string' ? v : v.value);
            
            if (['preparation', 'production', 'delivery'].includes(item.type)) {
              allPhases.push(...enabledValues);
              foundPhases = true;
            }
          }
        });
        
        if (foundPhases && allPhases.length > 0) {
          setProjectPhases(allPhases);
        } else {
          setProjectPhases(defaultPhases);
        }
      } else {
        setProjectPhases(defaultPhases);
      }
    } catch (error) {
      console.error('加载项目环节失败:', error);
      setProjectPhases([
        '物料采购', '样衣生产', '量体数据采集',
        '缝制生产', '质量检验', '产品入库',
        '物流配送', '产品交付', '售后服务'
      ]);
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

    if (!formData.projectPhase) {
      newErrors.projectPhase = '请选择项目任务环节';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !currentUser._id) {
      alert('用户信息加载中，请稍后再试');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      await db.collection('tasks').add({
        ...formData,
        createdBy: currentUser._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('创建项目任务失败:', error);
      alert(`创建任务失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">增加项目任务</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 项目信息提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">关联项目:</span> {project.name}
            </p>
            {project.phase && (
              <p className="text-sm text-blue-700 mt-1">
                <span className="font-medium">项目当前环节:</span> {project.phase}
              </p>
            )}
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

          {/* 任务级别 */}
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
              <option value="公司级">公司级</option>
            </select>
          </div>

          {/* 项目任务环节 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目任务环节 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.projectPhase || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                projectPhase: e.target.value as ProjectPhase 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择</option>
              {projectPhases.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
            {errors.projectPhase && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.projectPhase}
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
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {user.name.charAt(0)}
                          </div>
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
