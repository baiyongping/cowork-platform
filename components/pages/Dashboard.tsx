import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, FolderKanban, CheckSquare, Users, DollarSign, X, Calendar, User as UserIcon, AlertCircle, Clock, Bell, LogOut, BarChart3, FileText, Star, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OpportunityFunnel } from '../OpportunityFunnel';
import { db } from '../../lib/cloudbase';
import { useNotificationStore } from '../../lib/notification-store';
import TaskDetailModal from '../TaskDetailModal';
import ProjectDetailModal from '../ProjectDetailModal';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LoadingSpinner, LoadingCard } from '../ui/loading';
import { EmptyState } from '../ui/empty-state';

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
    growth: string | number;  // 支持字符串或数字
  };
  
  ongoingProjects: {
    total: number;
    deliveredThisMonth: number;
    growth: string | number;  // 支持字符串或数字
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
    status: string;           // 任务状态
    description?: string;     // 任务描述（可选）
    level: string;            // 任务级别
    team?: string;            // 所属团队（可选）
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
  
  // 🔧 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  // 🔧 调试：监听状态变化
  useEffect(() => {
    console.log('🔧 selectedTask 变化:', selectedTask);
  }, [selectedTask]);
  
  useEffect(() => {
    console.log('🔧 selectedProject 变化:', selectedProject);
  }, [selectedProject]);

  // 加载工作台数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // ✅ 动态获取当前年份
      const currentYear = new Date().getFullYear();
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

      // 🚀 优化：分批加载数据，提高性能
      // 第一批：核心统计数据
      const [
        strategyResult,
        measuresResult,
        opportunitiesResult,
        projectsResult,
        usersResult
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
        
        // 跟进商机(当前处于三个阶段且未关闭的商机)
        db.collection('opportunities').where({
          stage: db.command.in(['跟进线索', '方案咨询', '商务谈判']),
          isClosed: db.command.neq(true)
        }).get(),
        
        // 进行中的项目(状态不是"已完成"、"暂停"、"已取消"的项目)
        db.collection('projects').where({
          status: db.command.nin(['已完成', '暂停', '已取消'])
        }).get(),
        
        // 用户信息（用于显示负责人姓名）
        db.collection('users').where({
          deleted: db.command.neq(true)
        }).get()
      ]);

      // 第二批：详细统计数据（并行但分阶段）
      const [
        allMeasuresResult,
        teamMonthlyTasksResult,
        monthlyTasksInProgressResult,  // 本月进行中任务
        monthlyTasksCompletedResult,   // 本月已完成任务
        lastMonthTasksInProgressResult,  // 上月进行中任务
        lastMonthTasksCompletedResult,   // 上月已完成任务
        deliveredProjectsResult,  // 本月交付项目
        salesGoalResult,
        opportunityGoalResult,
        yearlyTasksResult,
        teamTasksResult,
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
  
  // 🔧 处理重点关注项点击
  const handleFocusItemClick = async (item: FocusItem) => {
    console.log('🔧 点击重点关注项:', item);
    if (item.type === 'task') {
      console.log('🔧 查询任务详情:', item.id);
      try {
        const res = await db.collection('tasks').doc(item.id).get();
        if (res.data && res.data.length > 0) {
          console.log('🔧 找到任务数据:', res.data[0]);
          setSelectedTask(res.data[0]);
        } else {
          console.error('🔧 未找到任务:', item.id);
        }
      } catch (err) {
        console.error('🔧 查询任务失败:', err);
      }
    } else if (item.type === 'project') {
      console.log('🔧 查询项目详情:', item.id);
      try {
        const res = await db.collection('projects').doc(item.id).get();
        if (res.data && res.data.length > 0) {
          console.log('🔧 找到项目数据:', res.data[0]);
          setSelectedProject(res.data[0]);
        } else {
          console.error('🔧 未找到项目:', item.id);
        }
      } catch (err) {
        console.error('🔧 查询项目失败:', err);
      }
    }
  };
  
  // 🔧 关闭详情弹窗并刷新数据
  const handleCloseDetailModal = () => {
    setSelectedTask(null);
    setSelectedProject(null);
    loadDashboardData(); // 刷新工作台数据
  };

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
    <div className="p-6 pb-3 bg-gray-50 min-h-screen">
      {/* 工作台标题区 - 优化设计 */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">工作台</h1>
            <p className="text-gray-600">欢迎回来，{currentUser?.name || '管理员'}</p>
          </div>
        </div>
        
        {/* 右侧操作区 */}
        <div className="flex items-center gap-3">
          {/* 消息铃铛按钮 */}
          <button
            onClick={() => setShowNotification(true)}
            className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 group shadow-soft hover:shadow-medium hover:scale-[1.02]"
            title="消息中心"
          >
            <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
            {/* 未读消息徽章 */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* 退出登录按钮 */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium hover:scale-[1.02]"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">退出</span>
            </button>
          )}
        </div>
      </div>

      {/* 重点关注区域 */}
      {dashboardData.focusItems.length > 0 && (
        <Card className="mb-8 border-l-4 border-l-orange-500 shadow-card">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-gray-900">重点关注</CardTitle>
                <p className="text-sm text-gray-600">共 {dashboardData.focusItems.length} 项需要关注</p>
              </div>
              <Badge variant="warning" className="px-3 py-1">
                优先处理
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.focusItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleFocusItemClick(item)}
                  className={`group relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02] ${
                    item.alertType === 'overdue'
                      ? 'bg-red-50/50 border-red-200 hover:bg-red-50 hover:border-red-300'
                      : 'bg-yellow-50/50 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300'
                  }`}
                >
                  {/* 状态指示器 */}
                  <div className="absolute top-4 right-4">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      item.alertType === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                  </div>

                  {/* 图标和类型标签 */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-soft ${
                      item.alertType === 'overdue' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {item.alertType === 'overdue' ? (
                        <AlertCircle className="w-6 h-6" />
                      ) : (
                        <Clock className="w-6 h-6" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.type === 'task' ? 'info' : 'secondary'} size="sm">
                          {item.type === 'task' ? '任务' : '项目'}
                        </Badge>
                        {item.planType && (
                          <span className="text-xs text-gray-500">{item.planType}</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2 truncate" title={item.name}>
                        {item.name}
                      </h4>
                      
                      {/* 元信息 */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>{item.owner}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">进度</span>
                      <span className="font-medium text-gray-900">{item.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${item.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 提醒标签 */}
                  <div className="flex items-center justify-between">
                    <div></div>
                    {item.alertType === 'overdue' ? (
                      <Badge variant="destructive" className="px-3 py-1">
                        延期 {item.daysOverdue} 天
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="px-3 py-1">
                        {item.daysRemaining === 0 ? '今日到期' : `${item.daysRemaining} 天后到期`}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 年度策略和季度措施 - 优化设计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 年度策略 */}
        <Card className="border-l-4 border-l-blue-500 shadow-card hover:shadow-card-hover transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-gray-900">{new Date().getFullYear()}年度经营策略</CardTitle>
                <p className="text-sm text-gray-600">企业年度核心战略方向</p>
              </div>
              <Badge variant="info" className="px-3 py-1">
                战略规划
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {dashboardData.annualStrategies.length === 0 ? (
                <EmptyState 
                  title="暂无数据"
                  description="当前没有可显示的内容"
                />
              ) : (
                dashboardData.annualStrategies.map((strategy, index) => (
                  <div key={strategy._id} className="group p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" size="sm">策略 {index + 1}</Badge>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{strategy.content}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{strategy.weight}%</div>
                          <div className="text-xs text-gray-500">权重</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 季度措施 */}
        <Card className="border-l-4 border-l-purple-500 shadow-card hover:shadow-card-hover transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-gray-900">Q{Math.floor(new Date().getMonth() / 3) + 1}季度经营措施</CardTitle>
                <p className="text-sm text-gray-600">季度具体执行计划</p>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                执行计划
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {dashboardData.quarterlyMeasures.length === 0 ? (
                <EmptyState 
                  title="暂无数据"
                  description="当前没有可显示的内容"
                />
              ) : (
                dashboardData.quarterlyMeasures.map((measure, index) => (
                  <div key={measure._id} className="group p-4 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" size="sm">举措 {index + 1}</Badge>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{measure.content}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{measure.progress}%</div>
                          <div className="text-xs text-gray-500">进度</div>
                        </div>
                      </div>
                    </div>
                    {/* 进度条 */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${measure.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* 数据概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 本月任务 */}
        <Card className="group hover:shadow-card-hover transition-all duration-300 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                <CheckSquare className="w-6 h-6 text-blue-600" />
              </div>
              {parseFloat(dashboardData.monthlyTasks.growth) >= 0 ? (
                <div className="flex items-center gap-1 text-sm text-success-600 bg-success-50 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  <span>{dashboardData.monthlyTasks.growth}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                  <span>{Math.abs(parseFloat(dashboardData.monthlyTasks.growth) || 0)}</span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.monthlyTasks.total}</div>
            <div className="text-sm font-medium text-gray-600 mb-3">本月任务</div>
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>已完成: <span className="font-medium text-green-600">{dashboardData.monthlyTasks.completed}</span></span>
              <span>完成率: <span className="font-medium text-blue-600">{dashboardData.monthlyTasks.completionRate}%</span></span>
            </div>
          </CardContent>
        </Card>

        {/* 跟进商机 */}
        <Card className="group hover:shadow-card-hover transition-all duration-300 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              {parseFloat(String(dashboardData.followingOpportunities.growth)) >= 0 ? (
                <div className="flex items-center gap-1 text-sm text-success-600 bg-success-50 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  <span>{dashboardData.followingOpportunities.growth}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                  <span>{Math.abs(parseFloat(String(dashboardData.followingOpportunities.growth)) || 0)}</span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.followingOpportunities.total}</div>
            <div className="text-sm font-medium text-gray-600 mb-3">跟进商机</div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span>预计金额</span>
                <span className="font-semibold text-green-600">{(dashboardData.followingOpportunities.totalAmount / 100000000).toFixed(2)}亿</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 进行中项目 */}
        <Card className="group hover:shadow-card-hover transition-all duration-300 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                <FolderKanban className="w-6 h-6 text-purple-600" />
              </div>
              {parseFloat(String(dashboardData.ongoingProjects.growth)) >= 0 ? (
                <div className="flex items-center gap-1 text-sm text-success-600 bg-success-50 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  <span>{dashboardData.ongoingProjects.growth}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                  <span>{Math.abs(parseFloat(String(dashboardData.ongoingProjects.growth)) || 0)}</span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.ongoingProjects.total}</div>
            <div className="text-sm font-medium text-gray-600 mb-3">进行中项目</div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span>本月交付</span>
                <span className="font-semibold text-purple-600">{(dashboardData.ongoingProjects.deliveredThisMonth / 10000).toFixed(0)}万</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 订单承揽 */}
        <Card className="group hover:shadow-card-hover transition-all duration-300 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <Badge variant="secondary" className="px-2 py-1">
                年度目标
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {dashboardData.orderUndertaking.actual === '--' ? '--' : Number(dashboardData.orderUndertaking.actual).toFixed(0)}
            </div>
            <div className="text-sm font-medium text-gray-600 mb-3">订单承揽(万)</div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              {dashboardData.orderUndertaking.target === '--' 
                ? '暂无年度目标数据' 
                : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span>目标</span>
                      <span className="font-medium">{Number(dashboardData.orderUndertaking.target).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>完成率</span>
                      <span className="font-medium text-orange-600">
                        {typeof dashboardData.orderUndertaking.completionRate === 'number' ? dashboardData.orderUndertaking.completionRate + '%' : dashboardData.orderUndertaking.completionRate}
                      </span>
                    </div>
                  </div>
                )
              }
            </div>
          </CardContent>
        </Card>
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
      
      {/* 🔧 任务详情弹窗 */}
      {selectedTask && (
        <>
          {console.log('🔧 渲染任务详情弹窗, task:', selectedTask)}
          <TaskDetailModal
            task={selectedTask}
            onClose={handleCloseDetailModal}
            onEdit={() => {
              // TODO: 实现编辑功能
              console.log('编辑任务:', selectedTask);
            }}
            onDelete={() => {
              setSelectedTask(null);
              loadDashboardData();
            }}
          />
        </>
      )}
      
      {/* 🔧 项目详情弹窗 */}
      {selectedProject && (
        <>
          {console.log('🔧 渲染项目详情弹窗, project:', selectedProject)}
          <ProjectDetailModal
            project={selectedProject}
            onClose={handleCloseDetailModal}
            onSuccess={loadDashboardData}
          />
        </>
      )}
    </div>
  );
}