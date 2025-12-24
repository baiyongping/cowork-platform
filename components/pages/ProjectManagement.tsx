import { useState, useEffect } from 'react';
import { Plus, Search, FolderKanban, Users, Calendar, DollarSign, TrendingUp, Eye, Edit, Trash2, AlertCircle, Archive } from 'lucide-react';
import { app, db, auth } from '../../lib/cloudbase';
import CreateProjectModal from '../CreateProjectModal';
import ProjectDetailModal from '../ProjectDetailModal';
import { buildQueryConditions } from '../../utils/permission';
import { usePermissionContext } from '../../contexts/PermissionContext';
import type {
  Project,
  ProjectStatus,
  ProjectStatistics,
} from '../../types/project';
import { getProjectStatusColor, getProjectPhaseColor } from '../../types/project';

interface ProjectManagementProps {
  userRole: 'admin' | 'user';
  currentUserId: string;
  openProjectId?: string;  // 🔧 要打开的项目ID
  onProjectOpened?: () => void;  // 🔧 打开后的回调
}

export function ProjectManagement({ userRole, currentUserId, openProjectId, onProjectOpened }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<ProjectStatistics>({
    total: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    paused: 0,
    overdue: 0,
    totalBudget: 0,
    totalActualCost: 0,
  });
  
  // 使用新权限系统
  const { checkPermission, userPermissions } = usePermissionContext();

  // 筛选条件
  const [filters, setFilters] = useState({
    phase: 'all' as string,  // 改为 phase
    keyword: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<string[]>([]); // 项目阶段选项,从系统设置加载
  
  // 加载系统设置中的项目阶段
  useEffect(() => {
    loadProjectStatuses();
  }, []);

  const loadProjectStatuses = async () => {
    try {
      // 使用 where 查询而不是 doc
      const result = await db.collection('type_settings')
        .where({ type: 'projectStatus' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const values = result.data[0].values || [];
        
        // 兼容新旧两种数据格式
        let enabledPhases: string[];
        if (values.length > 0 && typeof values[0] === 'object') {
          // 新格式：对象数组 [{value: "未开始", enabled: true}, ...]
          enabledPhases = values
            .filter((item: any) => item.enabled !== false)
            .map((item: any) => item.value);
        } else {
          // 旧格式：字符串数组 ["未开始", "准备期", ...]
          enabledPhases = values;
        }
        
        setProjectStatuses(enabledPhases);
      } else {
        // 如果没有配置，使用默认值
        setProjectStatuses(['未开始', '准备期', '制造期', '交付期', '已完成', '暂停']);
      }
    } catch (error) {
      console.error('加载项目阶段失败:', error);
      // 使用默认值
      setProjectStatuses(['未开始', '准备期', '制造期', '交付期', '已完成', '暂停']);
    }
  };

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true);
    try {
      // 获取当前用户信息
      const currentUserStr = localStorage.getItem('current_user');
      let currentUserId = '';
      let currentUserRole = '';
      
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        currentUserId = currentUser.userId;
        // 🔧 关键修复：优先使用roles数组，兼容旧的role字段
        // 如果用户有admin角色，则role应该是'admin'
        if (currentUser.roles && Array.isArray(currentUser.roles)) {
          currentUserRole = currentUser.roles.includes('admin') ? 'admin' : (currentUser.roles[0] || currentUser.role || '');
        } else {
          currentUserRole = currentUser.role || '';
        }
      }
      
      // 使用权限工具构建查询条件
      const queryConditions = await buildQueryConditions(currentUserId, currentUserRole, db);

      console.log('🔍 [项目列表] 查询条件:', {
        用户ID: currentUserId,
        用户角色: currentUserRole,
        查询条件: queryConditions
      });

      // 应用筛选条件
      const where: any = {
        ...queryConditions
      };
      
      if (filters.phase !== 'all') {
        where.status = filters.phase;  // 数据库字段仍是 status
      }

      const { data } = await db.collection('projects')
        .where(where)
        .orderBy('updatedAt', 'desc')
        .get();
      
      console.log('✅ [项目列表] 查询结果:', {
        数量: data.length,
        项目: data.map((p: any) => ({
          _id: p._id,
          name: p.name,
          owner: p.owner,
          collaborators: p.collaborators
        }))
      });

      // 关联查询负责人和成员信息
      const enrichedData = await Promise.all(
        data.map(async (proj: any) => {
          // 修复：使用 where 查询而不是 doc
          let ownerName = '未知';
          if (proj.owner) {
            const ownerRes = await db.collection('users').where({ _id: proj.owner }).get();
            if (ownerRes.data && ownerRes.data.length > 0) {
              ownerName = ownerRes.data[0].name;
            }
          }

          // 查询项目经理名称
          let managerName = '';
          if (proj.owner) {
            const managerRes = await db.collection('users').where({ _id: proj.owner }).get();
            if (managerRes.data && managerRes.data.length > 0) {
              managerName = managerRes.data[0].name;
            }
          }

          // 查询成员信息
          let memberNames: string[] = [];
          if (proj.members && proj.members.length > 0) {
            const memberRes = await db
              .collection('users')
              .where({
                _id: db.command.in(proj.members),
              })
              .get();
            memberNames = memberRes.data.map((u: any) => u.name);
          }

          // 解析项目交付产品，计算总金额和总成本
          let totalAmount = 0;
          let totalCost = 0;
          if (proj.deliverables) {
            try {
              const products = proj.deliverables.split('\n\n').filter((p: string) => p.trim());
              products.forEach((product: string) => {
                const lines = product.split('\n').filter((l: string) => l.trim());
                // 总价
                const totalPriceMatch = lines.find((l: string) => l.includes('总价'))?.match(/([\d.]+)\s*元/);
                if (totalPriceMatch) {
                  totalAmount += parseFloat(totalPriceMatch[1] || '0');
                }
                
                // 采购成本单价和数量
                const quantityMatch = lines.find((l: string) => l.includes('产品数量') || l.includes('需求数量'))?.match(/(\d+)\s*件/);
                const costUnitMatch = lines.find((l: string) => l.includes('采购成本单价'))?.match(/([\d.]+)\s*元/)
                  || lines.find((l: string) => l.includes('采购成本') && !l.includes('单价'))?.match(/([\d.]+)\s*元/)
                  || lines.find((l: string) => l.includes('预估成本'))?.match(/([\d.]+)\s*元/);
                
                if (quantityMatch && costUnitMatch) {
                  const quantity = parseInt(quantityMatch[1] || '0');
                  const costUnit = parseFloat(costUnitMatch[1] || '0');
                  totalCost += quantity * costUnit;
                }
              });
            } catch (error) {
              console.error('解析项目交付产品失败:', error);
            }
          }

          return {
            ...proj,
            ownerName,
            managerName, // 项目经理名称
            memberNames,
            totalAmount, // 项目总金额
            totalCost, // 项目总成本
            profit: totalAmount - totalCost, // 项目利润
          };
        })
      );

      // 关键词搜索
      let filteredData = enrichedData;
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        filteredData = enrichedData.filter((proj) =>
          proj.name.toLowerCase().includes(keyword) ||
          proj.code.toLowerCase().includes(keyword) ||
          proj.customer.toLowerCase().includes(keyword) ||
          proj.ownerName.toLowerCase().includes(keyword) ||
          (proj.memberNames && proj.memberNames.some(name => name.toLowerCase().includes(keyword)))
        );
      }

      setProjects(filteredData);

      // 计算统计数据
      calculateStatistics(filteredData);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStatistics = (data: Project[]) => {
    const now = new Date();
    
    // 排除回收站项目
    const activeProjects = data.filter(p => !p.isDeleted);
    
    // 1. 项目总数 = 未交付的项目（status !== '已交付'）
    const undeliveredProjects = activeProjects.filter(p => p.status !== '已交付');
    
    // 2. 进行中数量 = 准备期、制造期、交付期的项目
    const inProgressProjects = activeProjects.filter(p => 
      ['准备期', '制造期', '交付期'].includes(p.status)
    );
    
    // 3. 延期数量 = endDate < 今天 && status !== '已交付'
    const overdueProjects = undeliveredProjects.filter(p => {
      return p.endDate && new Date(p.endDate) < now;
    });
    
    // 4. 项目总金额 = 进行中的项目金额累计（从 deliverables 解析出的总金额）
    const totalAmount = inProgressProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    // 保留原有的其他统计
    const notStartedCount = activeProjects.filter((p) => p.status === '未启动').length;
    const completedCount = activeProjects.filter((p) => p.status === '完成').length;
    const cancelledCount = activeProjects.filter((p) => p.status === '已取消').length;
    const pausedCount = activeProjects.filter((p) => p.status === '暂停').length;
    
    const stats: ProjectStatistics = {
      total: undeliveredProjects.length,  // 修改：未交付的项目总数
      notStarted: notStartedCount,
      inProgress: inProgressProjects.length,  // 修改：准备期、制造期、交付期
      completed: completedCount,
      cancelled: cancelledCount,
      paused: pausedCount,
      overdue: overdueProjects.length,  // 修改：延期项目数
      totalBudget: totalAmount,  // 修改：进行中项目的金额累计
      totalActualCost: activeProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0),
    };
    setStatistics(stats);
  };

  useEffect(() => {
    loadProjects();
  }, [filters]);

  // 🔧 自动打开指定的项目详情
  useEffect(() => {
    console.log('🔧 [ProjectManagement] 检查自动打开:', { openProjectId, projectsCount: projects.length });
    if (openProjectId && projects.length > 0) {
      const projectToOpen = projects.find(p => p._id === openProjectId);
      console.log('🔧 [ProjectManagement] 找到项目:', projectToOpen);
      if (projectToOpen) {
        setSelectedProject(projectToOpen);
        setShowDetailModal(true);
        onProjectOpened?.();  // 通知父组件已打开
        console.log('✅ [ProjectManagement] 已打开项目详情');
      } else {
        console.warn('⚠️ [ProjectManagement] 未找到项目:', openProjectId);
      }
    }
  }, [openProjectId, projects]);

  // 格式化金额
  const formatAmount = (amount?: number): string => {
    // 修复：处理 undefined 或 null 的情况
    if (!amount || isNaN(amount)) {
      return '0.00';
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  // 判断项目是否延期
  const isProjectOverdue = (project: Project): boolean => {
    if (project.status === '已完成' || project.status === '已取消') {
      return false;
    }
    const endDate = new Date(project.endDate);
    const now = new Date();
    return endDate < now;
  };

  // 直接更新项目状态
  const handleUpdateProjectStatus = async (projId: string, newStatus: ProjectStatus) => {
    try {
      // 查找当前项目
      const currentProject = projects.find(p => p._id === projId);
      
      // 检查：如果项目当前状态是"完成"，禁止修改
      if (currentProject?.status === '完成') {
        alert('⚠️ 项目阶段已完成，不可再变更');
        return;
      }
      
      setLoading(true);
      
      // 构建更新数据
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      // 如果状态改为"完成"，自动将进度设为100%
      if (newStatus === '完成') {
        updateData.progress = 100;
      }
      
      await db.collection('projects').doc(projId).update(updateData);

      // 发送状态变更通知
      const project = projects.find(p => p._id === projId);
      if (project && project.owner !== currentUserId) {
        try {
          await app.callFunction({
            name: 'project-message',
            data: {
              action: 'statusChange',
              projectId: project._id,
              projectName: project.name,
              newStatus,
              receiver: project.owner
            }
          });
        } catch (error) {
          console.error('消息通知失败:', error);
        }
      }
      
      // 重新加载项目列表
      await loadProjects();
    } catch (error) {
      console.error('更新项目状态失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开项目详情
  const handleOpenProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和跟踪项目进度</p>
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ 回收站权限控制：需要delete权限 */}
          {checkPermission('projects', 'delete') && (
            <button
              onClick={() => window.location.href = '#/project-recycle-bin'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Archive className="w-5 h-5" />
              <span>回收站</span>
            </button>
          )}
          {/* ✅ 创建按钮权限控制 */}
          {checkPermission('projects', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>新建项目</span>
            </button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">项目总数</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{statistics.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">进行中</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{statistics.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">延期</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{statistics.overdue}</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">项目总金额</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{formatAmount(statistics.totalBudget)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 关键词搜索 */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索项目名称、编号、客户、项目经理、成员..."
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <div>
            <select
              value={filters.phase}
              onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部阶段</option>
              {projectStatuses?.filter(Boolean).map((phase, index) => (
                <option key={`phase-${phase}-${index}`} value={phase}>{phase}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无项目</h3>
            <p className="mt-1 text-sm text-gray-500">点击上方"新建项目"按钮开始创建</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.map((proj) => (
              <div
                key={proj._id}
                onClick={() => handleOpenProjectDetail(proj)}
                className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${
                  proj.status === '已完成' 
                    ? 'bg-green-50 hover:bg-green-100 border-green-500 hover:border-green-600'
                    : proj.status === '暂停'
                    ? 'bg-red-50 hover:bg-red-100 border-red-500 hover:border-red-600'
                    : 'hover:bg-blue-50 border-transparent hover:border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* 左侧：项目信息 */}
                  <div className="flex-1 space-y-2">
                    {/* 第一行：项目名称和标签 */}
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {proj.name}
                      </h3>
                      {/* 项目编码 */}
                      {proj.code && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {proj.code}
                        </span>
                      )}
                      {/* 项目阶段选择器 */}
                      <select
                        value={proj.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateProjectStatus(proj._id, e.target.value as ProjectStatus);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={proj.status === '完成'}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 transition-colors ${
                          proj.status === '完成' 
                            ? 'cursor-not-allowed opacity-75' 
                            : 'cursor-pointer hover:opacity-80'
                        } ${getProjectStatusColor(proj.status)}`}
                        title={proj.status === '完成' ? '项目阶段已完成，不可再变更' : '点击修改项目阶段'}
                      >
                        {projectStatuses?.filter(Boolean).map((phase, index) => (
                          <option key={`${proj._id}-phase-${phase}-${index}`} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                      {proj.phase && ['准备期', '制造期', '交付期'].includes(proj.status) && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getProjectPhaseColor(proj.phase)}`}>
                          {proj.phase}
                        </span>
                      )}
                      {isProjectOverdue(proj) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          延期
                        </span>
                      )}
                    </div>

                    {/* 第二行：客户、进度、利润、时间 */}
                    <div className="grid gap-4 text-sm" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr' }}>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-600">客户:</span>
                        <span className="text-gray-900 font-medium truncate">{proj.customer}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">进度:</span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                            />
                          </div>
                          <span className="font-bold text-green-600">{proj.progress || 0}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">利润:</span>
                        <span className="font-bold text-green-700">{formatAmount(proj.profit || 0)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-gray-600">交付:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(proj.endDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    {/* 第三行：项目经理和成员 */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600">项目经理:</span>
                        <span className="font-medium text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                          {proj.managerName || '未知'}
                        </span>
                      </div>
                      {proj.memberNames && proj.memberNames.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-600">成员:</span>
                          <div className="flex items-center gap-1">
                            {proj.memberNames.slice(0, 3).map((name, idx) => (
                              <span key={idx} className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {name}
                              </span>
                            ))}
                            {proj.memberNames.length > 3 && (
                              <span className="text-gray-500 text-xs">
                                +{proj.memberNames.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧：项目金额 */}
                  <div className="flex items-center justify-end min-w-[120px]">
                    <div className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-600 font-medium mb-0.5">项目金额</div>
                      <div className="text-xl font-bold text-blue-700 min-w-[80px]">{formatAmount(proj.totalAmount || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建项目模态框 */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}

      {/* 项目详情模态框 */}
      {showDetailModal && selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            setShowDetailModal(false);
            setSelectedProject(null);
            loadProjects();
          }}
          userPermissions={userPermissions}
        />
      )}
    </div>
  );
}
