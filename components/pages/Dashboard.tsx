import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, FolderKanban, CheckSquare, Users, DollarSign, X, Calendar, User as UserIcon, AlertCircle, Clock, Bell, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OpportunityFunnel } from '../OpportunityFunnel';
import { db } from '../../lib/cloudbase';
import { useNotificationStore } from '../../lib/notification-store';

interface DashboardProps {
  userRole: 'admin' | 'employee';
  currentUser: any;
  onLogout?: () => void;  // 🔧 退出登录回调
}

// 重点关注项
interface FocusItem {
  id: string;
  type: 'task' | 'project';
  name: string;
  endDate: string;
  status: string;
  planType?: string; // 任务的计划类型
  alertType: 'approaching' | 'overdue'; // 快到期 | 已延期
  daysRemaining?: number; // 剩余天数（快到期时）
  daysOverdue?: number; // 延期天数（已延期时）
  owner?: string;
  progress?: number;
}

interface DashboardData {
  // 年度策略和季度措施
  annualStrategies: Array<{
    _id: string;
    content: string;
    weight: number;
    status: string;
  }>;
  quarterlyMeasures: Array<{
    _id: string;
    content: string;
    status: string;
    progress: number;
  }>;
  
  // 数据概览卡片
  monthlyTasks: {
    total: number;
    completed: number;
    completionRate: number;
    growth: string;
  };
  
  followingOpportunities: {
    total: number;
    totalAmount: number;
    growth: string;
  };
  
  ongoingProjects: {
    total: number;
    deliveredThisMonth: number;
    growth: string;
  };
  
  orderUndertaking: {
    target: number | string;
    actual: number | string;
    completionRate: number | string;
  };
  
  // 商机漏斗
  opportunityFunnel: {
    targetCount: number;
    actualCount: number;
    stages: Array<{ stage: string; count: number; amount: number; color: string }>;
    successRate: number;
    wonCount: number;
    lostCount: number;
  };
  
  // 年度任务图表
  yearlyTaskChart: Array<{ month: string; completed: number; total: number }>;
  
  // 团队任务列表
  teamTasks: Array<{
    _id: string;
    name: string;
    type: string;
    endDate: string;
    progress: number;
    owner: { name: string };
  }>;
  
  // 重点关注列表
  focusItems: FocusItem[];
}

export function Dashboard({ userRole, currentUser, onLogout }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  const [showAllStrategies, setShowAllStrategies] = useState(false);
  const [showAllMeasures, setShowAllMeasures] = useState(false);
  
  // 🔔 使用消息通知 store
  const { unreadCount, setShowNotification } = useNotificationStore();

  // 加载工作台数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // ⚠️ 硬编码2025年，因为数据库中任务都是2025年的
      const currentYear = 2025;
      const currentMonth = new Date().getMonth(); // 0-11，12月是11
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
      
      // 字符串格式的日期范围（用于匹配数据库字符串格式）
      const startOfYearStr = `${currentYear}-01-01`;
      const endOfYearStr = `${currentYear}-12-31`;
      const startOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`;
      const startOfLastMonthStr = currentMonth === 0 
        ? `${currentYear - 1}-12-01` 
        : `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfLastMonthStr = currentMonth === 0 
        ? `${currentYear - 1}-12-31` 
        : `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

      // 获取当前季度
      const currentQuarter = `Q${Math.floor(currentMonth / 3) + 1}`;

      // 并行加载所有数据
      const [
        strategyResult,
        measuresResult,
        allMeasuresResult,
        teamMonthlyTasksResult,
        monthlyTasksInProgressResult,  // 本月进行中任务
        monthlyTasksCompletedResult,   // 本月已完成任务
        lastMonthTasksInProgressResult,  // 上月进行中任务
        lastMonthTasksCompletedResult,   // 上月已完成任务
        opportunitiesResult,
        projectsResult,
        deliveredProjectsResult,  // 本月交付项目
        salesGoalResult,
        opportunityGoalResult,
        yearlyTasksResult,
        teamTasksResult,
        usersResult,
        allMyTasksResult,  // 我的所有未完成任务（用于重点关注）
        allMyProjectsResult  // 我的所有未完成项目（用于重点关注）
      ] = await Promise.all([
        // 年度策略 - 查询本年度，按创建时间降序
        db.collection('annual_strategies').where({
          year: currentYear
        }).orderBy('createdAt', 'desc').get(),
        
        // 当前季度措施
        db.collection('quarterly_measures').where({
          quarter: currentQuarter,
          year: currentYear
        }).get(),
        
        // 所有季度措施（用于计算策略完成度）
        db.collection('quarterly_measures').where({
          year: currentYear
        }).get(),
        
        // 团队级月度任务（用于计算季度措施完成度）
        db.collection('tasks').where({
          level: '团队级',
          planType: '本月计划',
          isDeleted: db.command.neq(true)
        }).get(),
        
        // 本月任务 - 进行中(截止时间在本月)
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          endDate: db.command.gte(startOfMonthStr).and(db.command.lte(endOfMonthStr)),
          status: db.command.in(['进行中', '未开始', '暂停', '延期']) // 非已完成状态
        }).get(),
        
        // 本月已完成任务(截止时间在本月 + 状态为已完成)
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          endDate: db.command.gte(startOfMonthStr).and(db.command.lte(endOfMonthStr)),
          status: '已完成'
        }).get(),
        
        // 上月任务 - 进行中(截止时间在上月)
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          endDate: db.command.gte(startOfLastMonthStr).and(db.command.lte(endOfLastMonthStr)),
          status: db.command.in(['进行中', '未开始', '暂停', '延期'])
        }).get(),
        
        // 上月已完成任务(截止时间在上月 + 状态为已完成)
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          endDate: db.command.gte(startOfLastMonthStr).and(db.command.lte(endOfLastMonthStr)),
          status: '已完成'
        }).get(),
        
        // 跟进商机(当前处于三个阶段且未关闭的商机)
        db.collection('opportunities').where({
          stage: db.command.in(['跟进线索', '方案咨询', '商务谈判']),
          isClosed: db.command.neq(true)
        }).get(),
        
        // 进行中的项目(状态不是"已完成"、"暂停"、"已取消"的项目)
        db.collection('projects').where({
          status: db.command.nin(['已完成', '暂停', '已取消'])
        }).get(),
        
        // 本月交付的项目(状态为"已完成"且截止日期在本月)
        db.collection('projects').where({
          status: '已完成',
          endDate: db.command.gte(startOfMonthStr).and(db.command.lte(endOfMonthStr))
        }).get(),
        
        // 订单承揽目标
        db.collection('sales_goals').where({
          type: 'annual',
          year: currentYear
        }).get(),
        
        // 商机挖掘目标
        db.collection('opportunity_goals').where({
          type: 'annual',
          year: currentYear
        }).get(),
        
        // 本年度所有任务（用于年度图表）
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          startDate: db.command.gte(startOfYearStr).and(db.command.lte(endOfYearStr))
        }).get(),
        
        // 团队任务列表（本月截止 + 团队级 + 公开，最多10条）
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          level: '团队级',
          isPublic: true,
          endDate: db.command.gte(startOfMonthStr).and(db.command.lte(endOfMonthStr))
        }).orderBy('endDate', 'asc').limit(10).get(),
        
        // 用户信息（用于显示负责人姓名）
        db.collection('users').where({
          deleted: db.command.neq(true)
        }).get(),
        
        // 我的所有未完成任务（用于重点关注计算）
        db.collection('tasks').where({
          isDeleted: db.command.neq(true),
          owner: currentUser._id,
          status: db.command.nin(['已完成', '取消'])
        }).get(),
        
        // 我的所有未完成项目（用于重点关注计算）
        db.collection('projects').where({
          owner: currentUser._id,
          status: db.command.nin(['已完成', '已取消'])
        }).get()
      ]);

      // 处理团队级月度任务
      const teamMonthlyTasks = teamMonthlyTasksResult.data || [];
      
      // 处理所有季度措施 - 计算完成度（基于关联的团队级月度任务）
      const allMeasures = allMeasuresResult.data.map((measure: any) => {
        // 筛选关联到该措施的任务
        const relatedTasks = teamMonthlyTasks.filter((task: any) => task.relatedMeasure === measure._id);
        const taskCount = relatedTasks.length;
        
        // 计算完成度: 所有关联任务的平均完成度
        let progress = 0;
        if (taskCount > 0) {
          const totalProgress = relatedTasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
          progress = Math.round(totalProgress / taskCount);
        }
        
        return {
          ...measure,
          progress
        };
      });
      
      // 处理年度策略 - 基于关联的季度措施计算完成度
      const annualStrategies = strategyResult.data.map((item: any) => {
        // 查找该策略关联的季度措施（已计算过 progress）
        const relatedMeasures = allMeasures.filter((m: any) => m.strategyId === item._id);
        const measureCount = relatedMeasures.length;
        
        // 计算策略整体完成度: 所有关联措施的平均完成度
        let strategyCompletion = 0;
        if (measureCount > 0) {
          const totalProgress = relatedMeasures.reduce((sum: number, m: any) => sum + (m.progress || 0), 0);
          strategyCompletion = Math.round(totalProgress / measureCount);
        }
        
        return {
          _id: item._id,
          content: item.content,
          weight: strategyCompletion,
          status: item.status || '未开始'
        };
      });
      
      // 处理当前季度措施 - 计算完成度
      const quarterlyMeasures = measuresResult.data.map((measure: any) => {
        // 筛选关联到该措施的任务
        const relatedTasks = teamMonthlyTasks.filter((task: any) => task.relatedMeasure === measure._id);
        const taskCount = relatedTasks.length;
        
        // 计算完成度: 所有关联任务的平均完成度
        let progress = 0;
        if (taskCount > 0) {
          const totalProgress = relatedTasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
          progress = Math.round(totalProgress / taskCount);
        }
        
        return {
          _id: measure._id,
          content: measure.content,
          status: measure.status || '未开始',
          progress
        };
      });

      // 处理本月任务
      const monthlyTasksInProgress = monthlyTasksInProgressResult.data || [];  // 进行中任务
      const monthlyTasksCompleted = monthlyTasksCompletedResult.data || [];    // 本月完成任务
      const lastMonthTasksInProgress = lastMonthTasksInProgressResult.data || [];
      const lastMonthTasksCompleted = lastMonthTasksCompletedResult.data || [];
      
      // 计算本月任务总数和完成率
      const monthlyTotal = monthlyTasksInProgress.length + monthlyTasksCompleted.length;
      const monthlyCompleted = monthlyTasksCompleted.length;
      const lastMonthTotal = lastMonthTasksInProgress.length + lastMonthTasksCompleted.length;
      
      const monthlyTasksData = {
        total: monthlyTotal,
        completed: monthlyCompleted,
        completionRate: monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0,
        growth: calculateGrowth(monthlyTotal, lastMonthTotal)
      };

      // 处理跟进商机(不显示环比)
      const opportunities = opportunitiesResult.data || [];
      const followingOpportunitiesData = {
        total: opportunities.length,
        totalAmount: opportunities.reduce((sum: number, o: any) => sum + (o.estimatedAmount || 0), 0),
        growth: 0  // 商机不按时间范围,无环比
      };

      // 处理进行中项目(不显示环比)
      const projects = projectsResult.data || [];
      const deliveredProjects = deliveredProjectsResult.data || [];
      
      // 计算本月交付项目的总金额（从deliverables解析）
      let deliveredAmount = 0;
      deliveredProjects.forEach((proj: any) => {
        if (proj.deliverables) {
          try {
            const products = proj.deliverables.split('\n\n').filter((p: string) => p.trim());
            products.forEach((product: string) => {
              const lines = product.split('\n').filter((l: string) => l.trim());
              const totalPriceMatch = lines.find((l: string) => l.includes('总价'))?.match(/([\d.]+)\s*元/);
              if (totalPriceMatch) {
                deliveredAmount += parseFloat(totalPriceMatch[1] || '0');
              }
            });
          } catch (error) {
            console.error('解析本月交付项目金额失败:', error);
          }
        }
      });
      
      const ongoingProjectsData = {
        total: projects.length,
        deliveredThisMonth: deliveredAmount,  // 改为金额
        growth: 0  // 项目不按时间范围,无环比
      };

      // 处理订单承揽
      const salesGoal = salesGoalResult.data[0];
      const orderUndertakingData = salesGoal ? {
        target: salesGoal.orderTarget || 0,
        actual: salesGoal.orderActual || 0,
        completionRate: salesGoal.orderTarget > 0 
          ? Math.round(((salesGoal.orderActual || 0) / salesGoal.orderTarget) * 100) 
          : 0
      } : {
        target: '--',
        actual: '--',
        completionRate: '--'
      };

      // 处理商机漏斗
      const opportunityGoal = opportunityGoalResult.data[0];
      const allYearOpportunities = await db.collection('opportunities').where({
        createdAt: db.command.gte(startOfYear).and(db.command.lte(endOfYear))
      }).get();
      
      const funnelStages = [
        {
          stage: '跟进线索',
          count: opportunities.filter((o: any) => o.stage === '跟进线索').length,
          amount: opportunities.filter((o: any) => o.stage === '跟进线索')
            .reduce((sum: number, o: any) => sum + (o.expectedAmount || 0), 0),
          color: '#60a5fa'
        },
        {
          stage: '方案咨询',
          count: opportunities.filter((o: any) => o.stage === '方案咨询').length,
          amount: opportunities.filter((o: any) => o.stage === '方案咨询')
            .reduce((sum: number, o: any) => sum + (o.expectedAmount || 0), 0),
          color: '#3b82f6'
        },
        {
          stage: '商务谈判',
          count: opportunities.filter((o: any) => o.stage === '商务谈判').length,
          amount: opportunities.filter((o: any) => o.stage === '商务谈判')
            .reduce((sum: number, o: any) => sum + (o.expectedAmount || 0), 0),
          color: '#2563eb'
        }
      ];

      const wonCount = allYearOpportunities.data.filter((o: any) => o.stage === '成交').length;
      const lostCount = allYearOpportunities.data.filter((o: any) => o.stage === '失败').length;
      const successRate = (wonCount + lostCount) > 0 
        ? Math.round((wonCount / (wonCount + lostCount)) * 100) 
        : 0;

      const opportunityFunnelData = {
        targetCount: opportunityGoal?.countTarget || 0,
        actualCount: allYearOpportunities.data.length,
        stages: funnelStages,
        successRate,
        wonCount,
        lostCount
      };

      // 处理年度任务图表（按月统计）
      const yearlyTasks = yearlyTasksResult.data;
      const yearlyTaskChartData = [];
      for (let month = 0; month < 12; month++) {
        // 生成月份范围字符串（用于字符串比较）
        const monthStartStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEndDay = new Date(currentYear, month + 1, 0).getDate(); // 获取该月最后一天
        const monthEndStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;
        
        const monthTasks = yearlyTasks.filter((t: any) => {
          // 数据库中 startDate 是字符串格式，直接比较字符串
          return t.startDate >= monthStartStr && t.startDate <= monthEndStr;
        });
        const monthCompleted = monthTasks.filter((t: any) => t.status === '已完成');
        
        yearlyTaskChartData.push({
          month: `${month + 1}月`,
          completed: monthCompleted.length,
          total: monthTasks.length
        });
      }

      // 处理团队任务列表
      const users = usersResult.data;
      const teamTasksData = teamTasksResult.data.map((task: any) => {
        const owner = users.find((u: any) => u._id === task.owner);
        return {
          ...task,
          owner: { name: owner?.name || '未知' }
        };
      });

      // ======= 计算重点关注列表 =======
      const focusItems: FocusItem[] = [];
      const now = new Date();
      const todayDayOfWeek = now.getDay(); // 0=周日, 5=周五
      const myTasks = allMyTasksResult.data || [];
      const myProjects = allMyProjectsResult.data || [];

      // 处理任务
      myTasks.forEach((task: any) => {
        const endDate = new Date(task.endDate);
        const startDate = new Date(task.startDate);
        const timeDiff = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        let shouldAlert = false;
        let alertType: 'approaching' | 'overdue' = 'approaching';
        
        // 已延期检查（优先级最高）
        if (daysRemaining < 0) {
          shouldAlert = true;
          alertType = 'overdue';
        } else {
          // 快到期检查
          if (task.planType === '本月计划' || task.planType === '下月计划') {
            // 月度计划：提前7天提醒
            if (daysRemaining <= 7 && daysRemaining >= 0) {
              shouldAlert = true;
            }
          } else if (task.planType === '本周计划' || task.planType === '下周计划') {
            // 周计划：周五提醒
            if (todayDayOfWeek === 5 && daysRemaining >= 0) {
              shouldAlert = true;
            }
          }
        }
        
        if (shouldAlert) {
          focusItems.push({
            id: task._id,
            type: 'task',
            name: task.name,
            endDate: task.endDate,
            status: task.status,
            planType: task.planType,
            alertType,
            daysRemaining: alertType === 'approaching' ? daysRemaining : undefined,
            daysOverdue: alertType === 'overdue' ? Math.abs(daysRemaining) : undefined,
            owner: task.ownerName || '未知',
            progress: task.progress || 0
          });
        }
      });

      // 处理项目
      myProjects.forEach((project: any) => {
        const endDate = new Date(project.endDate);
        const startDate = new Date(project.startDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const progressRatio = totalDuration > 0 ? elapsed / totalDuration : 0;
        
        const timeDiff = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        let shouldAlert = false;
        let alertType: 'approaching' | 'overdue' = 'approaching';
        
        // 已延期检查
        if (daysRemaining < 0 && project.status !== '交付期') {
          shouldAlert = true;
          alertType = 'overdue';
        } else if (progressRatio >= 0.8 && daysRemaining >= 0 && project.status !== '交付期') {
          // 项目进度达到80%后提醒
          shouldAlert = true;
          alertType = 'approaching';
        }
        
        if (shouldAlert) {
          focusItems.push({
            id: project._id,
            type: 'project',
            name: project.name,
            endDate: project.endDate,
            status: project.status,
            alertType,
            daysRemaining: alertType === 'approaching' ? daysRemaining : undefined,
            daysOverdue: alertType === 'overdue' ? Math.abs(daysRemaining) : undefined,
            owner: project.ownerName || '未知',
            progress: project.progress || 0
          });
        }
      });

      // 按优先级排序：延期在前，快到期在后
      focusItems.sort((a, b) => {
        if (a.alertType === 'overdue' && b.alertType === 'approaching') return -1;
        if (a.alertType === 'approaching' && b.alertType === 'overdue') return 1;
        
        // 同类型按剩余/延期天数排序
        if (a.alertType === 'overdue') {
          return (b.daysOverdue || 0) - (a.daysOverdue || 0);
        } else {
          return (a.daysRemaining || 0) - (b.daysRemaining || 0);
        }
      });

      setDashboardData({
        annualStrategies,
        quarterlyMeasures,
        monthlyTasks: monthlyTasksData,
        followingOpportunities: followingOpportunitiesData,
        ongoingProjects: ongoingProjectsData,
        orderUndertaking: orderUndertakingData,
        opportunityFunnel: opportunityFunnelData,
        yearlyTaskChart: yearlyTaskChartData,
        teamTasks: teamTasksData,
        focusItems
      });

    } catch (err: any) {
      console.error('加载工作台数据失败:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 计算环比增长
  function calculateGrowth(current: number, last: number): string {
    if (last === 0) return '未-%';
    const growth = ((current - last) / last * 100).toFixed(1);
    return growth;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">加载失败: {error}</p>
          <button 
            onClick={loadDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="p-6 pb-3">
      {/* 工作台标题区 - 添加消息铃铛和退出登录 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">工作台</h1>
          <p className="text-gray-600">欢迎回来，{currentUser?.name || '管理员'}</p>
        </div>
        
        {/* 右侧操作区 - 消息和退出登录 */}
        <div className="flex items-center gap-2">
          {/* 🔔 消息铃铛按钮 */}
          <button
            onClick={() => setShowNotification(true)}
            className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
            title="消息中心"
          >
            <Bell className="h-6 w-6 group-hover:scale-110 transition-transform" />
            {/* 未读消息徽章 */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* 🚪 退出登录按钮 */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="退出登录"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">退出</span>
            </button>
          )}
        </div>
      </div>

      {/* 重点关注区域 */}
      {dashboardData.focusItems.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border-2 border-orange-300 shadow-md">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-gray-900 font-semibold">重点关注</h3>
            <span className="ml-auto text-sm text-gray-600">
              共 {dashboardData.focusItems.length} 项需要关注
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.focusItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                    item.alertType === 'overdue'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* 图标和状态 */}
                    <div className="flex-shrink-0">
                      {item.alertType === 'overdue' ? (
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.type === 'task' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'task' ? '任务' : '项目'}
                        </span>
                        {item.planType && (
                          <span className="text-xs text-gray-500">{item.planType}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>截止: {new Date(item.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>{item.owner}</span>
                        </div>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${item.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-10 text-right">{item.progress || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 提醒标签 */}
                  <div className="flex-shrink-0 ml-4">
                    {item.alertType === 'overdue' ? (
                      <div className="text-right">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                          已延期 {item.daysOverdue} 天
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                          {item.daysRemaining === 0 ? '今日到期' : `还剩 ${item.daysRemaining} 天`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 年度策略和季度措施 - 并列显示，高度增加到44vh */}
      <style>{`
        .strategy-scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .strategy-scroll-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .strategy-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .strategy-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .strategy-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 年度策略 - 显示所有策略 */}
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white" 
          style={{ height: '44vh', display: 'flex', flexDirection: 'column' }}
        >
          <h3 className="text-white mb-4">{new Date().getFullYear()}年度经营策略</h3>
          <div className="strategy-scroll-container flex-1 overflow-y-auto space-y-3 pr-2" style={{ 
            WebkitOverflowScrolling: 'touch'
          }}>
            {dashboardData.annualStrategies.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-3 text-center text-white/70">
                暂无年度策略数据
              </div>
            ) : (
              dashboardData.annualStrategies.map((strategy, index) => (
                <div key={strategy._id} className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-medium">策略{index + 1}、</span>
                      <span className="whitespace-pre-wrap">{strategy.content}</span>
                    </div>
                    <div className="flex-shrink-0 text-xs bg-white/20 px-2 py-1 rounded whitespace-nowrap">
                      {strategy.weight}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 季度措施 - 显示所有措施 */}
        <div 
          className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white" 
          style={{ height: '44vh', display: 'flex', flexDirection: 'column' }}
        >
          <h3 className="text-white mb-4">Q{Math.floor(new Date().getMonth() / 3) + 1}季度经营措施</h3>
          <div className="strategy-scroll-container flex-1 overflow-y-auto space-y-3 pr-2" style={{ 
            WebkitOverflowScrolling: 'touch'
          }}>
            {dashboardData.quarterlyMeasures.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-3 text-center text-white/70">
                暂无季度措施数据
              </div>
            ) : (
              dashboardData.quarterlyMeasures.map((measure, index) => (
                <div key={measure._id} className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-medium">举措{index + 1}、</span>
                      <span className="whitespace-pre-wrap">{measure.content}</span>
                    </div>
                    <div className="flex-shrink-0 text-xs bg-white/20 px-2 py-1 rounded whitespace-nowrap">
                      {measure.progress}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 数据概览卡片 - 不可点击 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* 本月任务 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-blue-600" />
            </div>
            {parseFloat(dashboardData.monthlyTasks.growth) >= 0 ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{dashboardData.monthlyTasks.growth}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>{Math.abs(parseFloat(dashboardData.monthlyTasks.growth) || 0)}</span>
              </div>
            )}
          </div>
          <div className="text-2xl text-gray-900 mb-1">{dashboardData.monthlyTasks.total}</div>
          <div className="text-sm text-gray-600">本月任务</div>
          <div className="text-xs text-gray-500 mt-2">
            已完成: {dashboardData.monthlyTasks.completed} | 完成率: {dashboardData.monthlyTasks.completionRate}%
          </div>
        </div>

        {/* 跟进商机 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            {parseFloat(dashboardData.followingOpportunities.growth) >= 0 ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{dashboardData.followingOpportunities.growth}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>{Math.abs(parseFloat(dashboardData.followingOpportunities.growth) || 0)}</span>
              </div>
            )}
          </div>
          <div className="text-2xl text-gray-900 mb-1">{dashboardData.followingOpportunities.total}</div>
          <div className="text-sm text-gray-600">跟进商机</div>
          <div className="text-xs text-gray-500 mt-2">
            预计金额: {(dashboardData.followingOpportunities.totalAmount / 100000000).toFixed(2)}亿
          </div>
        </div>

        {/* 进行中项目 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-purple-600" />
            </div>
            {parseFloat(dashboardData.ongoingProjects.growth) >= 0 ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{dashboardData.ongoingProjects.growth}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>{Math.abs(parseFloat(dashboardData.ongoingProjects.growth) || 0)}</span>
              </div>
            )}
          </div>
          <div className="text-2xl text-gray-900 mb-1">{dashboardData.ongoingProjects.total}</div>
          <div className="text-sm text-gray-600">进行中项目</div>
          <div className="text-xs text-gray-500 mt-2">
            本月交付: {(dashboardData.ongoingProjects.deliveredThisMonth / 10000).toFixed(0)}万
          </div>
        </div>

        {/* 订单承揽 - 显示完成率，不显示环比增长 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl text-gray-900 mb-1">
            {dashboardData.orderUndertaking.actual === '--' ? '--' : Number(dashboardData.orderUndertaking.actual).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">订单承揽(万)</div>
          <div className="text-xs text-gray-500 mt-2">
            {dashboardData.orderUndertaking.target === '--' 
              ? '暂无年度目标数据' 
              : `目标: ${Number(dashboardData.orderUndertaking.target).toFixed(0)}万 (${typeof dashboardData.orderUndertaking.completionRate === 'number' ? dashboardData.orderUndertaking.completionRate + '%' : dashboardData.orderUndertaking.completionRate})`
            }
          </div>
        </div>
      </div>

      {/* 任务数据区域 - 整合为一个大面板 */}
      <div className="bg-white rounded-lg border border-gray-200 mb-4">
        {/* 商机漏斗和年度任务 - 上半部分 */}
        <div className="grid grid-cols-2 gap-6 p-6 border-b border-gray-200">
          {/* 商机漏斗分析 - 不可点击 */}
          <div className="pointer-events-none">
            <h3 className="text-gray-900 mb-4">商机漏斗分析</h3>
            <OpportunityFunnel
              data={dashboardData.opportunityFunnel.stages}
              totalTarget={dashboardData.opportunityFunnel.targetCount}
              totalActual={dashboardData.opportunityFunnel.actualCount}
              newThisQuarter={dashboardData.opportunityFunnel.actualCount}
              closedCount={dashboardData.opportunityFunnel.wonCount}
              failedCount={dashboardData.opportunityFunnel.lostCount}
              onStageClick={() => {}} // 禁用点击
            />
          </div>

          {/* 年度任务完成情况 */}
          <div>
            <h3 className="text-gray-900 mb-4">年度任务完成情况</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dashboardData.yearlyTaskChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#3b82f6" name="已完成" />
                <Bar dataKey="total" fill="#e5e7eb" name="总任务" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 团队任务列表 - 下半部分 */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '30vh' }}>
          <div className="px-6 py-3 bg-gray-50">
            <h3 className="text-gray-900">{new Date().getFullYear()}年{new Date().getMonth() + 1}月团队任务列表</h3>
          </div>
          {dashboardData.teamTasks.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>本月暂无团队任务</p>
            </div>
          ) : (
            <div className="team-task-scroll-container flex-1 overflow-y-auto" style={{ 
              WebkitOverflowScrolling: 'touch'
            }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      任务名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      级别
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      负责人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      截止日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      进度
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.teamTasks.map((task) => {
                    const isCompleted = task.status === '已完成';
                    const isCancelled = task.status === '取消';
                    
                    return (
                      <tr 
                        key={task._id} 
                        className={`transition-colors ${
                          isCompleted 
                            ? 'bg-green-50 hover:bg-green-100 opacity-75' 
                            : isCancelled
                            ? 'bg-red-50 hover:bg-red-100 opacity-75'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900" title={task.name}>
                            {task.name && task.name.length > 20 ? `${task.name.substring(0, 20)}...` : (task.name || '未命名')}
                          </div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {task.level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{task.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{task.owner?.name || '未知'}</div>
                          {task.team && (
                            <div className="text-xs text-gray-500">{task.team}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${
                            new Date(task.endDate) < new Date() && task.status !== '已完成'
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }`}>
                            {new Date(task.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === '已完成' ? 'bg-green-100 text-green-800' :
                            task.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                            task.status === '未开始' ? 'bg-gray-100 text-gray-800' :
                            task.status === '延期' ? 'bg-red-100 text-red-800' :
                            task.status === '暂停' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  task.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                                }`}
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">{task.progress || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}