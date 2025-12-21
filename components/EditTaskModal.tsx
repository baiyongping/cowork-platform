import { useState, useEffect } from 'react';
import { X, AlertCircle, UserPlus, Save, Link2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { 
  Task, TaskLevel, TaskType, TaskStatus, 
  OpportunityActionType, ProjectPhase 
} from '../types/task';
import CollaboratorSelector from './CollaboratorSelector';
import OpportunitySelector from './OpportunitySelector';
import ProjectSelector from './ProjectSelector';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  taskStatuses: string[];
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

// 项目任务环节选项
const projectPhases: ProjectPhase[] = [
  '物料采购',
  '样衣生产',
  '量体数据采集',
  '缝制生产',
  '质量检验',
  '产品入库',
  '物流配送',
  '产品交付',
  '售后服务'
];

export default function EditTaskModal({ task, onClose, onSuccess, taskStatuses }: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    name: task.name,
    level: task.level,
    type: task.type,
    status: task.status,
    progress: task.progress,
    owner: task.owner._id,
    collaborators: task.collaborators?.map(c => c._id) || [],
    team: task.team || '',
    startDate: new Date(task.startDate).toISOString().split('T')[0],
    endDate: new Date(task.endDate).toISOString().split('T')[0],
    description: task.description || '',
    isPublic: task.isPublic !== undefined ? task.isPublic : true,
    opportunityActionType: task.opportunityActionType || '',
    projectPhase: task.projectPhase || '',
    relatedTo: task.relatedTo || '',
    relatedMeasure: task.relatedMeasure || '',
    relatedTeamTask: task.relatedTeamTask || ''
  });

  const [planType, setPlanType] = useState(task.planType || '本周计划');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showCollaboratorSelector, setShowCollaboratorSelector] = useState(false);
  
  // 商机和项目选择器状态
  const [showOpportunitySelector, setShowOpportunitySelector] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<{ id: string; name: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null);
  
  // 季度举措选择器状态
  const [quarterlyMeasures, setQuarterlyMeasures] = useState<any[]>([]);
  const [selectedMeasure, setSelectedMeasure] = useState<{ id: string; content: string } | null>(null);
  
  // 团队月度任务选择器状态
  const [teamMonthlyTasks, setTeamMonthlyTasks] = useState<any[]>([]);
  const [selectedTeamTask, setSelectedTeamTask] = useState<{ id: string; name: string } | null>(null);

  // 加载用户列表
  useEffect(() => {
    loadUsers();
    loadRelatedData();
    loadQuarterlyMeasures();
    loadTeamMonthlyTasks();
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

  // 获取日期所在的季度
  const getQuarter = (date: Date): { year: number; quarter: string; display: string } => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return {
      year,
      quarter: `Q${quarter}`,
      display: `${year}Q${quarter}`
    };
  };

  // 加载季度举措列表(只加载任务所在季度的举措)
  const loadQuarterlyMeasures = async () => {
    try {
      // 根据任务的开始日期确定所在季度
      const taskDate = new Date(task.startDate);
      const { year, quarter } = getQuarter(taskDate);
      
      const result = await db.collection('quarterly_measures')
        .where({ 
          year: year,
          quarter: quarter,
          status: db.command.neq('已完成') 
        })
        .get();
      if (result.data) {
        setQuarterlyMeasures(result.data);
        
        // 如果任务已关联季度举措,设置选中状态
        if (task.relatedMeasure) {
          const measure = result.data.find((m: any) => m._id === task.relatedMeasure);
          if (measure) {
            setSelectedMeasure({ id: measure._id, content: measure.content });
          }
        }
      }
    } catch (error) {
      console.error('加载季度举措列表失败:', error);
    }
  };

  // 加载团队月度任务列表
  const loadTeamMonthlyTasks = async () => {
    try {
      const result = await db.collection('tasks')
        .where({
          level: '团队级',
          type: '日常工作',
          planType: db.command.in(['本月计划', '下月计划']),
          isDeleted: db.command.neq(true)
        })
        .get();
      
      console.log('📋 编辑任务-查询到的团队月度任务:', result.data);
      
      if (result.data) {
        setTeamMonthlyTasks(result.data);
        
        // 如果任务已关联团队月度任务,设置选中状态
        if (task.relatedTeamTask) {
          const teamTask = result.data.find((t: any) => t._id === task.relatedTeamTask);
          if (teamTask) {
            setSelectedTeamTask({ id: teamTask._id, name: teamTask.name });
          }
        }
      } else {
        console.warn('⚠️ 编辑任务-没有找到符合条件的团队月度任务');
        setTeamMonthlyTasks([]);
      }
    } catch (error) {
      console.error('加载团队月度任务列表失败:', error);
      setTeamMonthlyTasks([]);
    }
  };

  // 加载关联的商机或项目数据
  const loadRelatedData = async () => {
    try {
      if (task.relatedTo) {
        if (task.type === '商机跟进') {
          const result = await db.collection('opportunities').doc(task.relatedTo).get();
          if (result.data && result.data.length > 0) {
            const opportunity = result.data[0];
            setSelectedOpportunity({ id: opportunity._id, name: opportunity.name });
          }
        } else if (task.type === '项目任务') {
          const result = await db.collection('projects').doc(task.relatedTo).get();
          if (result.data && result.data.length > 0) {
            const project = result.data[0];
            setSelectedProject({ id: project._id, name: project.name });
          }
        }
      }
    } catch (error) {
      console.error('加载关联数据失败:', error);
    }
  };

  // 根据任务类型获取状态选项
  const getStatusOptions = (): string[] => {
    if (formData.type === '项目任务') {
      return ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停'];
    } else {
      return ['未开始', '进行中', '已完成', '延期', '取消', '暂停'];
    }
  };

  // 根据计划类型计算日期范围
  const calculateDateRangeByPlan = (planType: string) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
    let startDate = new Date();
    let endDate = new Date();

    switch (planType) {
      case '本周计划':
        // 本周一到周日
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + mondayOffset);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      
      case '下周计划':
        // 下周一到周日
        const nextMondayOffset = currentDay === 0 ? 1 : 8 - currentDay;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + nextMondayOffset);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      
      case '本月计划':
        // 本月1号到最后一天
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      
      case '下月计划':
        // 下月1号到最后一天
        startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // 处理计划类型变更
  const handlePlanTypeChange = (newPlanType: string) => {
    setPlanType(newPlanType);
    const dateRange = calculateDateRangeByPlan(newPlanType);
    setFormData({
      ...formData,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
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

    if (formData.type === '商机跟进' && !formData.opportunityActionType) {
      newErrors.opportunityActionType = '请选择商机跟进动作类型';
    }

    if (formData.type === '项目任务' && !formData.projectPhase) {
      newErrors.projectPhase = '请选择项目任务环节';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      await db.collection('tasks').doc(task._id).update({
        name: formData.name.trim(),
        level: formData.level,
        type: formData.type,
        status: formData.status,
        progress: formData.progress,
        owner: formData.owner,
        collaborators: formData.collaborators,
        team: formData.team.trim(),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        description: formData.description.trim(),
        isPublic: formData.isPublic,
        planType: planType,
        opportunityActionType: formData.type === '商机跟进' ? formData.opportunityActionType : undefined,
        projectPhase: formData.type === '项目任务' ? formData.projectPhase : undefined,
        relatedTo: formData.relatedTo || undefined,
        relatedMeasure: formData.relatedMeasure || undefined,
        relatedTeamTask: formData.relatedTeamTask || undefined,
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('更新任务失败:', error);
      alert(`更新任务失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">编辑任务</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                任务类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as TaskType;
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    status: '未开始',
                    opportunityActionType: '',
                    projectPhase: '',
                    relatedTo: ''
                  });
                  // 清除已选择的商机/项目
                  setSelectedOpportunity(null);
                  setSelectedProject(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="日常工作">日常工作</option>
                <option value="商机跟进">商机跟进</option>
                <option value="项目任务">项目任务</option>
              </select>
            </div>
          </div>

          {/* 计划类型（仅当类型为"日常工作"时显示） */}
          {formData.type === '日常工作' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                计划类型
              </label>
              <select
                value={planType}
                onChange={(e) => handlePlanTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="本周计划">本周计划</option>
                <option value="下周计划">下周计划</option>
                <option value="本月计划">本月计划</option>
                <option value="下月计划">下月计划</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                选择计划类型后，任务时间将自动调整
              </p>
            </div>
          )}

          {/* 关联季度举措（仅当级别为团队级且计划类型为月度时显示） */}
          {formData.type === '日常工作' && 
           formData.level === '团队级' && 
           (planType === '本月计划' || planType === '下月计划') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关联季度举措
              </label>
              <select
                value={selectedMeasure?.id || ''}
                onChange={(e) => {
                  const measureId = e.target.value;
                  if (measureId) {
                    const measure = quarterlyMeasures.find(m => m._id === measureId);
                    if (measure) {
                      setSelectedMeasure({ id: measure._id, content: measure.content });
                      setFormData({ ...formData, relatedMeasure: measureId });
                    }
                  } else {
                    setSelectedMeasure(null);
                    setFormData({ ...formData, relatedMeasure: undefined });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择季度举措（可选）</option>
                {quarterlyMeasures.map(measure => (
                  <option key={measure._id} value={measure._id}>
                    {measure.content}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                选择本任务关联的季度举措（任务所在季度: {getQuarter(new Date(task.startDate)).display}）
              </p>
            </div>
          )}

          {/* 关联团队月度任务（仅当级别为个人级且计划类型为周时显示） */}
          {formData.type === '日常工作' && 
           formData.level === '个人级' && 
           (planType === '本周计划' || planType === '下周计划') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关联团队月度工作任务
              </label>
              <select
                value={selectedTeamTask?.id || ''}
                onChange={(e) => {
                  const taskId = e.target.value;
                  if (taskId) {
                    const teamTask = teamMonthlyTasks.find(t => t._id === taskId);
                    if (teamTask) {
                      setSelectedTeamTask({ id: teamTask._id, name: teamTask.name });
                      setFormData({ ...formData, relatedTeamTask: taskId });
                    }
                  } else {
                    setSelectedTeamTask(null);
                    setFormData({ ...formData, relatedTeamTask: undefined });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择团队月度任务（可选）</option>
                {teamMonthlyTasks.map(task => (
                  <option key={task._id} value={task._id}>
                    {task.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                选择本任务关联的团队月度工作任务
              </p>
            </div>
          )}

          {/* 商机跟进动作类型(仅当类型为"商机跟进"时显示) */}
          {formData.type === '商机跟进' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关联商机
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOpportunitySelector(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    {selectedOpportunity ? selectedOpportunity.name : '选择商机'}
                  </button>
                  {selectedOpportunity && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOpportunity(null);
                        setFormData({ ...formData, relatedTo: '' });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  选择本任务关联的商机(可选)
                </p>
              </div>
              
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
            </>
          )}

          {/* 项目任务环节(仅当类型为"项目任务"时显示) */}
          {formData.type === '项目任务' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关联项目
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProjectSelector(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    {selectedProject ? selectedProject.name : '选择项目'}
                  </button>
                  {selectedProject && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(null);
                        setFormData({ ...formData, relatedTo: '' });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  选择本任务关联的项目(可选)
                </p>
              </div>
              
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
            </>
          )}

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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={submitting}
            >
              <Save className="w-4 h-4" />
              {submitting ? '保存中...' : '保存修改'}
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

        {/* 商机选择器 */}
        {showOpportunitySelector && (
          <OpportunitySelector
            selectedId={selectedOpportunity?.id}
            onSelect={(id, name) => {
              setSelectedOpportunity({ id, name });
              setFormData({ ...formData, relatedTo: id });
            }}
            onClose={() => setShowOpportunitySelector(false)}
          />
        )}

        {/* 项目选择器 */}
        {showProjectSelector && (
          <ProjectSelector
            selectedId={selectedProject?.id}
            onSelect={(id, name) => {
              setSelectedProject({ id, name });
              setFormData({ ...formData, relatedTo: id });
            }}
            onClose={() => setShowProjectSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
