import { useState, useEffect } from 'react';
import { Target, TrendingUp, Briefcase, Plus, X, Edit2, Trash2, Save, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../../lib/cloudbase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { usePermissionContext } from '../../contexts/PermissionContext';

interface GoalManagementProps {
  userRole: 'admin' | 'employee';
  currentUser: any;
}

// 销售目标接口
interface SalesGoal {
  _id?: string;
  year: number;
  orderTarget: number;
  orderActual: number;
  revenueTarget: number;
  revenueActual: number;
  type: 'annual' | 'quarterly';
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 商机目标接口
interface OpportunityGoal {
  _id?: string;
  year: number;
  countTarget: number;
  countActual: number;
  amountTarget: number;
  amountActual: number;
  type: 'annual' | 'quarterly';
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 年度策略接口
interface AnnualStrategy {
  _id?: string;
  year: number;
  content: string;
  owner: string;
  ownerId: string;
  status: '未开始' | '进行中' | '已完成' | '暂停';
  weight: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 季度措施接口
interface QuarterlyMeasure {
  _id?: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  strategyId: string;
  content: string;
  owner: string;
  ownerId: string;
  status: '未开始' | '进行中' | '已完成' | '暂停';
  progress: number; // 完成度 0-100 (自动计算)
  taskCount?: number; // 关联的团队级月度任务数量
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function GoalManagement({ userRole, currentUser }: GoalManagementProps) {
  const [selectedTab, setSelectedTab] = useState<'sales' | 'opportunity' | 'strategy' | 'execution'>('sales');
  const [selectedYear, setSelectedYear] = useState(2025);
  
  // 使用新的权限上下文
  const { checkPermission, loading: permissionLoading } = usePermissionContext();
  
  // 🔧 自动选择第一个有权限的Tab
  useEffect(() => {
    if (!permissionLoading) {
      const tabs: Array<'sales' | 'opportunity' | 'strategy' | 'execution'> = ['sales', 'opportunity', 'strategy', 'execution'];
      const moduleMap = {
        sales: 'goal.salesGoal',
        opportunity: 'goal.opportunityGoal',
        strategy: 'goal.strategy',
        execution: 'goal.execution'
      };
      
      // 检查当前选中的Tab是否有权限
      const currentTabHasPermission = checkPermission(moduleMap[selectedTab], 'view');
      
      if (!currentTabHasPermission) {
        // 找到第一个有权限的Tab
        const firstAvailableTab = tabs.find(tab => checkPermission(moduleMap[tab], 'view'));
        if (firstAvailableTab) {
          setSelectedTab(firstAvailableTab);
        }
      }
    }
  }, [permissionLoading, checkPermission]);
  
  // 模态框状态
  const [showSalesGoalModal, setShowSalesGoalModal] = useState(false);
  const [showOpportunityGoalModal, setShowOpportunityGoalModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<'annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('annual');

  // 商机列表弹窗状态
  const [showOpportunityListModal, setShowOpportunityListModal] = useState(false);
  const [opportunityListData, setOpportunityListData] = useState<any[]>([]);
  const [opportunityListTitle, setOpportunityListTitle] = useState('');
  const [opportunityListTotal, setOpportunityListTotal] = useState(0); // 商机列表实际金额合计
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  // 项目列表弹窗状态
  const [showProjectListModal, setShowProjectListModal] = useState(false);
  const [projectListData, setProjectListData] = useState<any[]>([]);
  const [projectListTitle, setProjectListTitle] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  // 策略详情弹窗状态
  const [showStrategyDetailModal, setShowStrategyDetailModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<AnnualStrategy | null>(null);
  const [relatedMeasures, setRelatedMeasures] = useState<QuarterlyMeasure[]>([]);

  // 季度措施详情弹窗状态
  const [showMeasureDetailModal, setShowMeasureDetailModal] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<QuarterlyMeasure | null>(null);
  const [measureRelatedTasks, setMeasureRelatedTasks] = useState<any[]>([]);

  // 执行力地图状态
  const [executionTreeData, setExecutionTreeData] = useState<any>(null);
  const [executionStats, setExecutionStats] = useState({
    totalStrategies: 0,
    completedStrategies: 0,
    totalMeasures: 0,
    completedMeasures: 0,
    overallProgress: 0
  });
  // 折叠状态管理：key为节点id，value为是否展开(true=展开，false=折叠)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // 数据状态
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>([]);
  const [opportunityGoals, setOpportunityGoals] = useState<OpportunityGoal[]>([]);
  const [annualStrategies, setAnnualStrategies] = useState<AnnualStrategy[]>([]);
  const [quarterlyMeasures, setQuarterlyMeasures] = useState<QuarterlyMeasure[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 经营策略状态选项(从系统设置加载)
  const [strategyStatuses, setStrategyStatuses] = useState<string[]>([]);

  // 表单状态
  const [salesForm, setSalesForm] = useState({
    year: 2025,
    orderTarget: 0,
    revenueTarget: 0,
    type: 'annual' as 'annual' | 'quarterly',
    quarter: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4',
  });

  const [opportunityForm, setOpportunityForm] = useState({
    year: 2025,
    countTarget: 0,
    amountTarget: 0,
    type: 'annual' as 'annual' | 'quarterly',
    quarter: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4',
  });

  const [strategyForm, setStrategyForm] = useState({
    year: 2025,
    content: '',
    owner: '',
    ownerId: '',
    weight: 0,
    quarter: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    strategyId: '',
    progress: 0, // 新增:进度字段
  });

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await db.collection('users').get();
      setUsers(res.data);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };
  
  // 加载经营策略状态选项
  const loadStrategyStatuses = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'strategyStatus' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const settings = result.data[0];
        // 只获取已启用的状态选项
        const enabledStatuses = (settings.values || [])
          .filter((item: any) => item.enabled)
          .map((item: any) => item.value);
        setStrategyStatuses(enabledStatuses.length > 0 ? enabledStatuses : ['未开始', '进行中', '已完成', '暂停']);
      } else {
        // 如果数据库中没有配置，使用默认值
        setStrategyStatuses(['未开始', '进行中', '已完成', '暂停']);
      }
    } catch (error) {
      console.error('加载经营策略状态失败:', error);
      // 出错时使用默认值
      setStrategyStatuses(['未开始', '进行中', '已完成', '暂停']);
    }
  };

  // 加载销售目标
  const loadSalesGoals = async () => {
    try {
      setLoading(true);
      const res = await db.collection('sales_goals')
        .where({ year: selectedYear })
        .orderBy('type', 'asc')
        .orderBy('createdAt', 'desc') // 按创建时间倒序，确保获取最新记录
        .get();
      
      // 检查CloudBase SDK返回的错误码
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setSalesGoals([]);
        return;
      }
      
      // 正常情况下 res.data 是数组
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载销售目标数据:', data.length, '条');
      setSalesGoals(data);
      
      // 自动修正年度和各季度的订单承揽金额（确保排除已删除商机）
      console.log('🔧 自动修正订单承揽金额...');
      await fixOrderActualAmount(selectedYear); // 年度
      await fixOrderActualAmount(selectedYear, 'Q1'); // Q1
      await fixOrderActualAmount(selectedYear, 'Q2'); // Q2
      await fixOrderActualAmount(selectedYear, 'Q3'); // Q3
      await fixOrderActualAmount(selectedYear, 'Q4'); // Q4
      
      // 重新加载修正后的数据
      const refreshRes = await db.collection('sales_goals')
        .where({ year: selectedYear })
        .orderBy('type', 'asc')
        .orderBy('createdAt', 'desc')
        .get();
      
      if (!refreshRes.code) {
        const refreshedData = Array.isArray(refreshRes.data) ? refreshRes.data : [];
        setSalesGoals(refreshedData);
        console.log('✅ 订单承揽金额修正完成');
      }
    } catch (error) {
      console.error('❌ 加载销售目标失败:', error);
      setSalesGoals([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载商机目标
  const loadOpportunityGoals = async () => {
    try {
      setLoading(true);
      const res = await db.collection('opportunity_goals')
        .where({ year: selectedYear })
        .orderBy('type', 'asc')
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setOpportunityGoals([]);
        return;
      }
      
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载商机目标数据:', data.length, '条');
      
      // 实时计算每个目标的实际值
      const cmd = db.command;
      const enrichedData = await Promise.all(
        data.map(async (goal: any) => {
          let startDate: Date;
          let endDate: Date;
          
          if (goal.type === 'annual') {
            // 年度目标
            startDate = new Date(goal.year, 0, 1);
            endDate = new Date(goal.year, 11, 31, 23, 59, 59);
          } else {
            // 季度目标
            const quarterMap: any = {
              'Q1': { start: new Date(goal.year, 0, 1), end: new Date(goal.year, 2, 31, 23, 59, 59) },
              'Q2': { start: new Date(goal.year, 3, 1), end: new Date(goal.year, 5, 30, 23, 59, 59) },
              'Q3': { start: new Date(goal.year, 6, 1), end: new Date(goal.year, 8, 30, 23, 59, 59) },
              'Q4': { start: new Date(goal.year, 9, 1), end: new Date(goal.year, 11, 31, 23, 59, 59) },
            };
            const period = quarterMap[goal.quarter];
            startDate = period.start;
            endDate = period.end;
          }
          
          // 查询该时间范围内的所有商机（未删除）
          const oppRes = await db.collection('opportunities')
            .where({
              createdAt: cmd.gte(startDate).and(cmd.lte(endDate)),
              isDeleted: cmd.neq(true)
            })
            .get();
          
          const opportunities = Array.isArray(oppRes.data) ? oppRes.data : [];
          
          // 计算商机挖掘数量（所有商机）
          const countActual = opportunities.length;
          
          // 计算商机预期金额（只统计未取消、未失败的商机）
          const validOpportunities = opportunities.filter(
            (opp: any) => opp.stage !== '取消' && opp.stage !== '失败'
          );
          const amountActual = validOpportunities.reduce(
            (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
            0
          ) / 10000; // 转换为万元
          
          console.log(`📊 ${goal.type === 'annual' ? '年度' : goal.quarter} - 挖掘数: ${countActual}, 预期金额: ${amountActual.toFixed(2)}万`);
          
          return {
            ...goal,
            countActual,
            amountActual: parseFloat(amountActual.toFixed(2))
          };
        })
      );
      
      console.log('📦 商机目标详细数据（含实时统计）:', JSON.stringify(enrichedData, null, 2));
      setOpportunityGoals(enrichedData);
    } catch (error) {
      console.error('❌ 加载商机目标失败:', error);
      setOpportunityGoals([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载年度策略
  const loadAnnualStrategies = async () => {
    try {
      setLoading(true);
      const res = await db.collection('annual_strategies')
        .where({ year: selectedYear })
        .orderBy('createdAt', 'desc')
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setAnnualStrategies([]);
        return;
      }
      
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载年度策略数据:', data.length, '条');
      setAnnualStrategies(data);
    } catch (error) {
      console.error('❌ 加载年度策略失败:', error);
      setAnnualStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载季度措施(包含自动计算完成度)
  const loadQuarterlyMeasures = async () => {
    try {
      setLoading(true);
      const res = await db.collection('quarterly_measures')
        .where({ year: selectedYear })
        .orderBy('quarter', 'asc')
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setQuarterlyMeasures([]);
        return;
      }
      
      const measures = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载季度措施数据:', measures.length, '条');
      
      // 查询所有关联的团队级月度任务
      const tasksRes = await db.collection('tasks')
        .where({
          level: '团队级',
          planType: '本月计划',
          isDeleted: db.command.neq(true)
        })
        .get();
      
      const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      console.log('📦 查询到团队级月度任务:', tasks.length, '条');
      
      // 为每个措施计算完成度
      const enrichedMeasures = measures.map(measure => {
        // 筛选关联到该措施的任务
        const relatedTasks = tasks.filter(task => task.relatedMeasure === measure._id);
        const taskCount = relatedTasks.length;
        
        // 计算完成度: 所有关联任务的平均完成度
        let progress = 0;
        if (taskCount > 0) {
          const totalProgress = relatedTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
          progress = Math.round(totalProgress / taskCount);
        }
        
        console.log(`📊 措施 "${measure.content}" - 关联任务: ${taskCount}条, 完成度: ${progress}%`);
        
        return {
          ...measure,
          progress,
          taskCount // 新增: 关联任务数量
        };
      });
      
      setQuarterlyMeasures(enrichedMeasures);
    } catch (error) {
      console.error('❌ 加载季度措施失败:', error);
      setQuarterlyMeasures([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载执行力地图数据
  const loadExecutionMapData = async () => {
    try {
      setLoading(true);
      
      // 1. 加载年度策略
      const strategiesRes = await db.collection('annual_strategies')
        .where({ year: selectedYear })
        .get();
      const strategies = strategiesRes.data || [];
      
      // 2. 加载所有季度措施
      const measuresRes = await db.collection('quarterly_measures')
        .where({ year: selectedYear })
        .get();
      const measures = measuresRes.data || [];
      
      // 3. 加载所有关联的团队月度任务
      const teamTasksRes = await db.collection('tasks')
        .where({
          level: '团队级',
          type: '日常工作',
          planType: db.command.in(['本月计划', '下月计划']),
          isDeleted: db.command.neq(true)
        })
        .get();
      const teamTasks = teamTasksRes.data || [];
      
      // 4. 加载所有关联的个人周任务
      const personalTasksRes = await db.collection('tasks')
        .where({
          level: '个人级',
          type: '日常工作',
          planType: db.command.in(['本周计划', '下周计划']),
          isDeleted: db.command.neq(true)
        })
        .get();
      const personalTasks = personalTasksRes.data || [];
      
      // 5. 收集所有需要查询的用户ID（只收集任务的owner，因为策略和措施的owner是用户名）
      const allUserIds = new Set<string>();
      teamTasks.forEach(t => t.owner && allUserIds.add(t.owner));
      personalTasks.forEach(t => t.owner && allUserIds.add(t.owner));
      
      // 6. 批量查询用户信息（只查询任务的用户ID）
      const userMap = new Map<string, string>();
      const userIds = Array.from(allUserIds);
      
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const userResult = await db.collection('users').doc(userId).get();
            if (userResult.data && userResult.data.length > 0) {
              const user = userResult.data[0];
              userMap.set(userId, user.name || '未知用户');
            } else {
              userMap.set(userId, '未知用户');
            }
          } catch (error) {
            console.error('查询用户失败:', userId, error);
            userMap.set(userId, '未知用户');
          }
        })
      );
      
      // 辅助函数：获取负责人名称
      // 对于策略和措施：owner字段直接是用户名
      // 对于任务：owner字段是用户ID，需要通过userMap转换
      const getOwnerName = (ownerField: string, isTask: boolean = false) => {
        if (!ownerField) return '未指定';
        if (isTask) {
          // 任务：owner是ID，需要查询转换
          return userMap.get(ownerField) || '未知用户';
        } else {
          // 策略/措施：owner直接是用户名
          return ownerField;
        }
      };
      
      // 7. 构建执行力树结构
      const treeData = {
        name: `${selectedYear}年度执行力地图`,
        type: 'root',
        children: strategies.map(strategy => {
          // 获取该策略的季度措施
          const strategyMeasures = measures.filter(m => m.strategyId === strategy._id);
          
          return {
            name: strategy.content,
            type: 'strategy',
            id: strategy._id,
            status: strategy.status,
            weight: strategy.weight,
            owner: getOwnerName(strategy.owner, false), // 策略owner是用户名
            children: strategyMeasures.map(measure => {
              // 获取该措施的团队任务
              const measureTeamTasks = teamTasks.filter(t => t.relatedMeasure === measure._id);
              
              return {
                name: measure.content,
                type: 'measure',
                id: measure._id,
                quarter: measure.quarter,
                status: measure.status,
                progress: measure.progress || 0,
                owner: getOwnerName(measure.owner, false), // 措施owner是用户名
                taskCount: measureTeamTasks.length,
                children: measureTeamTasks.map(teamTask => {
                  // 获取该团队任务的个人任务
                  const teamPersonalTasks = personalTasks.filter(t => t.relatedTeamTask === teamTask._id);
                  
                  return {
                    name: teamTask.name,
                    type: 'teamTask',
                    id: teamTask._id,
                    status: teamTask.status,
                    progress: teamTask.progress || 0,
                    owner: getOwnerName(teamTask.owner, true), // 任务owner是ID
                    startDate: teamTask.startDate,
                    endDate: teamTask.endDate,
                    children: teamPersonalTasks.map(personalTask => ({
                      name: personalTask.name,
                      type: 'personalTask',
                      id: personalTask._id,
                      status: personalTask.status,
                      progress: personalTask.progress || 0,
                      owner: getOwnerName(personalTask.owner, true), // 任务owner是ID
                      startDate: personalTask.startDate,
                      endDate: personalTask.endDate
                    }))
                  };
                })
              };
            })
          };
        })
      };
      
      setExecutionTreeData(treeData);
      
      // 8. 计算统计数据
      const totalStrategies = strategies.length;
      const completedStrategies = strategies.filter(s => s.status === '已完成').length;
      const totalMeasures = measures.length;
      const completedMeasures = measures.filter(m => m.status === '已完成').length;
      
      // 计算整体进度（基于季度措施的进度加权平均）
      let overallProgress = 0;
      if (totalMeasures > 0) {
        const totalProgress = measures.reduce((sum, m) => sum + (m.progress || 0), 0);
        overallProgress = Math.round(totalProgress / totalMeasures);
      }
      
      setExecutionStats({
        totalStrategies,
        completedStrategies,
        totalMeasures,
        completedMeasures,
        overallProgress
      });
      
    } catch (error) {
      console.error('加载执行力地图数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查询指定时间范围的商机列表（订单承揽）
  const loadOpportunitiesByPeriod = async (year: number, quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    try {
      setLoadingOpportunities(true);
      
      let startDate: Date;
      let endDate: Date;
      let title: string;

      if (quarter) {
        // 季度查询
        const quarterMap = {
          'Q1': { start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59), name: 'Q1季度' },
          'Q2': { start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59), name: 'Q2季度' },
          'Q3': { start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59), name: 'Q3季度' },
          'Q4': { start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59), name: 'Q4季度' },
        };
        const period = quarterMap[quarter];
        startDate = period.start;
        endDate = period.end;
        title = `${year}年${period.name}订单承揽商机列表`;
      } else {
        // 年度查询
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        title = `${year}年度订单承揽商机列表`;
      }

      // 查询该时间范围内成交的商机（stage='成交'且closedAt在范围内）
      const cmd = db.command;
      const res = await db.collection('opportunities')
        .where({
          closedAt: cmd.gte(startDate).and(cmd.lte(endDate)),
          stage: '成交',
          isDeleted: cmd.neq(true)
        })
        .orderBy('closedAt', 'desc')
        .get();

      if (res.code) {
        console.error('❌ 查询商机失败:', res.code, res.message);
        setOpportunityListData([]);
        return;
      }

      const opportunities = Array.isArray(res.data) ? res.data : [];
      console.log(`📊 查询到 ${opportunities.length} 条订单承揽商机(成交)`);
      
      // 计算订单承揽金额（实际列表合计）
      const totalAmount = opportunities.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      ) / 10000; // 转换为万元
      
      console.log(`📊 订单承揽金额（列表实际合计）: ${totalAmount.toFixed(2)}万元`);
      
      setOpportunityListData(opportunities);
      setOpportunityListTitle(title);
      setOpportunityListTotal(totalAmount); // 保存实际合计金额
      setShowOpportunityListModal(true);
      
      // 自动修正数据库中的已完成金额
      await fixOrderActualAmount(year, quarter);
    } catch (error) {
      console.error('❌ 加载商机列表失败:', error);
      setOpportunityListData([]);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  // 修正订单承揽目标的已完成金额（从商机列表重新计算）
  const fixOrderActualAmount = async (year: number, quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    try {
      console.log(`🔧 开始修正${year}年${quarter || '年度'}订单承揽目标已完成金额...`);
      
      let startDate: Date;
      let endDate: Date;

      if (quarter) {
        // 季度范围
        const quarterMap = {
          'Q1': { start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59) },
          'Q2': { start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59) },
          'Q3': { start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59) },
          'Q4': { start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59) },
        };
        const period = quarterMap[quarter];
        startDate = period.start;
        endDate = period.end;
      } else {
        // 年度范围
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }

      // 查询该时间范围内成交的商机
      const cmd = db.command;
      const res = await db.collection('opportunities')
        .where({
          closedAt: cmd.gte(startDate).and(cmd.lte(endDate)),
          stage: '成交',
          isDeleted: cmd.neq(true)
        })
        .get();

      if (res.code) {
        console.error('❌ 查询商机失败:', res.code, res.message);
        return;
      }

      const opportunities = Array.isArray(res.data) ? res.data : [];
      
      // 计算实际金额合计
      const actualAmount = opportunities.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      ) / 10000; // 转换为万元
      
      console.log(`📊 查询到 ${opportunities.length} 条成交商机，实际金额合计: ${actualAmount.toFixed(2)}万元`);

      // 更新数据库
      const whereCondition: any = { 
        year,
        type: quarter ? 'quarterly' : 'annual'
      };
      if (quarter) {
        whereCondition.quarter = quarter;
      }

      const updateRes = await db.collection('sales_goals')
        .where(whereCondition)
        .update({
          orderActual: actualAmount
        });

      if (updateRes.code) {
        console.error('❌ 更新销售目标失败:', updateRes.code, updateRes.message);
        return;
      }

      console.log(`✅ 成功更新订单承揽目标已完成金额为: ${actualAmount.toFixed(2)}万元`);
      
    } catch (error) {
      console.error('❌ 修正订单承揽目标已完成金额失败:', error);
    }
  };

  // 查询指定时间范围的项目列表（销售收入）
  const loadProjectsByPeriod = async (year: number, quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    try {
      setLoadingProjects(true);
      
      let startDate: Date;
      let endDate: Date;
      let title: string;

      if (quarter) {
        // 季度查询
        const quarterMap = {
          'Q1': { start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59), name: 'Q1季度' },
          'Q2': { start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59), name: 'Q2季度' },
          'Q3': { start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59), name: 'Q3季度' },
          'Q4': { start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59), name: 'Q4季度' },
        };
        const period = quarterMap[quarter];
        startDate = period.start;
        endDate = period.end;
        title = `${year}年${period.name}销售收入项目列表`;
      } else {
        // 年度查询
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        title = `${year}年度销售收入项目列表`;
      }

      // 查询该时间范围内确认收入的项目（revenueRecorded=true且revenueRecordedAt在范围内）
      const cmd = db.command;
      const res = await db.collection('projects')
        .where({
          revenueRecordedAt: cmd.gte(startDate).and(cmd.lte(endDate)),
          revenueRecorded: true,
          isDeleted: cmd.neq(true)
        })
        .orderBy('revenueRecordedAt', 'desc')
        .get();

      if (res.code) {
        console.error('❌ 查询项目失败:', res.code, res.message);
        setProjectListData([]);
        return;
      }

      const projects = Array.isArray(res.data) ? res.data : [];
      console.log(`📊 查询到 ${projects.length} 条销售收入项目（已确认收入）`);
      
      // 解析每个项目的交付产品清单，计算项目总金额
      const projectsWithAmount = projects.map((proj: any) => {
        let totalAmount = 0;
        
        if (proj.deliverables) {
          try {
            const products = proj.deliverables.split('\n\n').filter((p: string) => p.trim());
            products.forEach((product: string) => {
              const lines = product.split('\n').filter((l: string) => l.trim());
              const totalPriceMatch = lines.find((l: string) => l.includes('总价'))?.match(/([\d.]+)\s*元/);
              if (totalPriceMatch) {
                totalAmount += parseFloat(totalPriceMatch[1] || '0');
              }
            });
          } catch (error) {
            console.error('解析项目交付产品失败:', error);
          }
        }
        
        return {
          ...proj,
          totalAmount
        };
      });
      
      // 计算销售收入金额
      const totalRevenue = projectsWithAmount.reduce(
        (sum: number, proj: any) => sum + (proj.totalAmount || 0),
        0
      ) / 10000; // 转换为万元
      
      console.log(`📊 销售收入金额: ${totalRevenue.toFixed(2)}万元`);
      
      setProjectListData(projectsWithAmount);
      setProjectListTitle(title);
      setShowProjectListModal(true);
    } catch (error) {
      console.error('❌ 加载项目列表失败:', error);
      setProjectListData([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadUsers();
    loadStrategyStatuses(); // 加载经营策略状态选项
  }, []);

  useEffect(() => {
    if (selectedTab === 'sales') {
      loadSalesGoals();
    } else if (selectedTab === 'opportunity') {
      loadOpportunityGoals();
    } else if (selectedTab === 'strategy') {
      loadAnnualStrategies();
      loadQuarterlyMeasures();
    } else if (selectedTab === 'execution') {
      loadExecutionMapData();
    }
  }, [selectedTab, selectedYear]);

  // 保存销售目标
  const handleSaveSalesGoal = async () => {
    try {
      setLoading(true);
      
      console.log('💾 保存销售目标 - 开始:', { editingItem, salesForm });
      
      if (editingItem) {
        // 更新
        const updateRes = await db.collection('sales_goals').doc(editingItem._id).update({
          orderTarget: salesForm.orderTarget,
          revenueTarget: salesForm.revenueTarget,
          updatedAt: new Date(),
        });
        
        if (updateRes.code) {
          console.error('❌ 更新失败:', updateRes.code, updateRes.message);
          alert('更新失败：' + updateRes.message);
          return;
        }
        console.log('✅ 更新成功:', editingItem._id);
      } else {
        // 新增
        const result = await db.collection('sales_goals').add({
          year: salesForm.year,
          orderTarget: salesForm.orderTarget,
          orderActual: 0,
          revenueTarget: salesForm.revenueTarget,
          revenueActual: 0,
          type: salesForm.type,
          quarter: salesForm.type === 'quarterly' ? salesForm.quarter : null,
          createdBy: currentUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        if (result.code) {
          console.error('❌ 新增失败:', result.code, result.message);
          alert('新增失败：' + result.message);
          return;
        }
        console.log('✅ 新增成功:', result.id);
      }

      console.log('🔄 重新加载数据...');
      // 关闭模态框前先加载数据，确保UI更新
      await loadSalesGoals();
      console.log('✅ 数据加载完成，当前数据:', salesGoals);
      
      // 🔧 使用setTimeout确保状态更新后再关闭模态框
      setTimeout(() => {
        setShowSalesGoalModal(false);
        setEditingItem(null);
        setSalesForm({ year: selectedYear, orderTarget: 0, revenueTarget: 0, type: 'annual', quarter: 'Q1' });
      }, 100);
    } catch (error) {
      console.error('❌ 保存销售目标失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 保存商机目标
  const handleSaveOpportunityGoal = async () => {
    try {
      setLoading(true);
      
      console.log('💾 保存商机目标 - 开始:', { editingItem, opportunityForm });
      
      if (editingItem) {
        // 更新
        const updateRes = await db.collection('opportunity_goals').doc(editingItem._id).update({
          countTarget: opportunityForm.countTarget,
          amountTarget: opportunityForm.amountTarget,
          updatedAt: new Date(),
        });
        
        if (updateRes.code) {
          console.error('❌ 更新失败:', updateRes.code, updateRes.message);
          alert('更新失败：' + updateRes.message);
          return;
        }
        console.log('✅ 更新成功:', editingItem._id);
      } else {
        // 新增
        const result = await db.collection('opportunity_goals').add({
          year: opportunityForm.year,
          countTarget: opportunityForm.countTarget,
          countActual: 0,
          amountTarget: opportunityForm.amountTarget,
          amountActual: 0,
          type: opportunityForm.type,
          quarter: opportunityForm.type === 'quarterly' ? opportunityForm.quarter : null,
          createdBy: currentUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        if (result.code) {
          console.error('❌ 新增失败:', result.code, result.message);
          alert('新增失败：' + result.message);
          return;
        }
        console.log('✅ 新增成功:', result.id);
      }

      console.log('🔄 重新加载数据...');
      // 关闭模态框前先加载数据，确保UI更新
      await loadOpportunityGoals();
      console.log('✅ 数据加载完成，当前数据:', opportunityGoals);
      
      // 🔧 使用setTimeout确保状态更新后再关闭模态框
      setTimeout(() => {
        setShowOpportunityGoalModal(false);
        setEditingItem(null);
        setOpportunityForm({ year: selectedYear, countTarget: 0, amountTarget: 0, type: 'annual', quarter: 'Q1' });
      }, 100);
    } catch (error) {
      console.error('❌ 保存商机目标失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 保存策略/措施
  const handleSaveStrategy = async () => {
    try {
      setLoading(true);
      
      if (selectedQuarter === 'annual') {
        // 年度策略 - 不需要责任人
        if (editingItem) {
          const updateRes = await db.collection('annual_strategies').doc(editingItem._id).update({
            content: strategyForm.content,
            weight: strategyForm.weight,
            updatedAt: new Date(),
          });
          
          if (updateRes.code) {
            console.error('❌ 更新年度策略失败:', updateRes.code, updateRes.message);
            alert('更新失败：' + updateRes.message);
            return;
          }
        } else {
          const result = await db.collection('annual_strategies').add({
            year: strategyForm.year,
            content: strategyForm.content,
            owner: '', // 年度策略不需要责任人
            ownerId: '',
            status: '未开始',
            weight: strategyForm.weight,
            createdBy: currentUser._id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          if (result.code) {
            console.error('❌ 新增年度策略失败:', result.code, result.message);
            alert('新增失败：' + result.message);
            return;
          }
        }
        // 关闭模态框前先加载数据，确保UI更新
        await loadAnnualStrategies();
      } else {
        // 季度措施
        if (editingItem) {
          const updateRes = await db.collection('quarterly_measures').doc(editingItem._id).update({
            content: strategyForm.content,
            owner: strategyForm.owner,
            ownerId: strategyForm.ownerId,
            strategyId: strategyForm.strategyId,
            updatedAt: new Date(),
          });
          
          if (updateRes.code) {
            console.error('❌ 更新季度措施失败:', updateRes.code, updateRes.message);
            alert('更新失败：' + updateRes.message);
            return;
          }
        } else {
          const result = await db.collection('quarterly_measures').add({
            year: strategyForm.year,
            quarter: strategyForm.quarter,
            strategyId: strategyForm.strategyId,
            content: strategyForm.content,
            owner: strategyForm.owner,
            ownerId: strategyForm.ownerId,
            status: '未开始',
            progress: 0, // 初始为0,后续由任务自动计算
            createdBy: currentUser._id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          if (result.code) {
            console.error('❌ 新增季度措施失败:', result.code, result.message);
            alert('新增失败：' + result.message);
            return;
          }
        }
        // 关闭模态框前先加载数据，确保UI更新
        await loadQuarterlyMeasures();
      }

      console.log('✅ 策略/措施保存完成，当前数据:', {
        strategies: annualStrategies,
        measures: quarterlyMeasures
      });

      // 🔧 使用setTimeout确保状态更新后再关闭模态框
      setTimeout(() => {
        setShowStrategyModal(false);
        setEditingItem(null);
        setStrategyForm({ year: selectedYear, content: '', owner: '', ownerId: '', weight: 0, quarter: 'Q1', strategyId: '', progress: 0 });
      }, 100);
    } catch (error) {
      console.error('保存策略失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 删除策略
  const handleDeleteStrategy = async (id: string, type: 'strategy' | 'measure') => {
    // ✅ 保留删除确认
    if (!confirm('确定要删除吗？')) return;

    try {
      setLoading(true);
      const collection = type === 'strategy' ? 'annual_strategies' : 'quarterly_measures';
      await db.collection(collection).doc(id).remove();
      
      if (type === 'strategy') {
        loadAnnualStrategies();
      } else {
        loadQuarterlyMeasures();
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 更新策略状态
  const handleUpdateStrategyStatus = async (id: string, status: string, type: 'strategy' | 'measure') => {
    try {
      setLoading(true);
      const collection = type === 'strategy' ? 'annual_strategies' : 'quarterly_measures';
      await db.collection(collection).doc(id).update({
        status,
        updatedAt: new Date(),
      });
      
      // 如果是措施状态更新，检查是否需要自动更新策略状态
      if (type === 'measure') {
        const measure = quarterlyMeasures.find(m => m._id === id);
        if (measure && measure.strategyId) {
          await checkAndUpdateStrategyStatus(measure.strategyId);
        }
      }
      
      if (type === 'strategy') {
        loadAnnualStrategies();
      } else {
        loadQuarterlyMeasures();
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 检查并自动更新策略状态
  const checkAndUpdateStrategyStatus = async (strategyId: string) => {
    try {
      // 获取该策略的所有措施
      const measuresRes = await db.collection('quarterly_measures')
        .where({ strategyId })
        .get();
      
      const measures = measuresRes.data as QuarterlyMeasure[];
      
      // 如果没有措施，不自动更新
      if (measures.length === 0) {
        return;
      }
      
      // 检查是否所有措施都已完成
      const allCompleted = measures.every(m => m.status === '已完成');
      
      if (allCompleted) {
        // 自动将策略状态更新为已完成
        await db.collection('annual_strategies').doc(strategyId).update({
          status: '已完成',
          updatedAt: new Date(),
        });
        
        // 重新加载策略列表
        loadAnnualStrategies();
      }
    } catch (error) {
      console.error('自动更新策略状态失败:', error);
    }
  };

  // 查看策略详情（关联措施）
  const handleViewStrategyDetail = async (strategy: AnnualStrategy) => {
    setSelectedStrategy(strategy);
    setShowStrategyDetailModal(true);
    
    try {
      // 加载该策略的所有关联措施
      const measuresRes = await db.collection('quarterly_measures')
        .where({ strategyId: strategy._id })
        .get();
      
      setRelatedMeasures(measuresRes.data as QuarterlyMeasure[]);
    } catch (error) {
      console.error('加载关联措施失败:', error);
      setRelatedMeasures([]);
    }
  };

  // 查看措施详情（关联任务）
  const handleViewMeasureDetail = async (measure: QuarterlyMeasure) => {
    setSelectedMeasure(measure);
    setShowMeasureDetailModal(true);
    
    try {
      // 加载该措施关联的所有团队级月度任务
      const tasksRes = await db.collection('tasks')
        .where({
          relatedMeasure: measure._id,
          level: '团队级',
          planType: '本月计划',
          isDeleted: db.command.neq(true)
        })
        .get();
      
      const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      
      // 获取所有任务负责人的唯一ID
      const ownerIds = [...new Set(tasks.map(task => task.owner).filter(Boolean))];
      
      // 查询所有相关用户信息
      let usersMap: { [key: string]: string } = {};
      if (ownerIds.length > 0) {
        const usersRes = await db.collection('users')
          .where({
            _id: db.command.in(ownerIds)
          })
          .get();
        
        if (usersRes.data && Array.isArray(usersRes.data)) {
          usersRes.data.forEach((user: any) => {
            usersMap[user._id] = user.name;
          });
        }
      }
      
      // 将用户ID替换为用户名
      const enrichedTasks = tasks.map(task => ({
        ...task,
        ownerName: usersMap[task.owner] || task.owner || '未知'
      }));
      
      console.log(`📊 措施 "${measure.content}" 关联任务:`, enrichedTasks);
      setMeasureRelatedTasks(enrichedTasks);
    } catch (error) {
      console.error('加载关联任务失败:', error);
      setMeasureRelatedTasks([]);
    }
  };

  // 打开编辑模态框
  const handleEditSalesGoal = (goal: SalesGoal | null, type: 'annual' | 'quarterly', quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    if (goal) {
      setSalesForm({
        year: goal.year,
        orderTarget: goal.orderTarget,
        revenueTarget: goal.revenueTarget,
        type: goal.type,
        quarter: goal.quarter || 'Q1',
      });
      setEditingItem(goal);
    } else {
      setSalesForm({
        year: selectedYear,
        orderTarget: 0,
        revenueTarget: 0,
        type,
        quarter: quarter || 'Q1',
      });
      setEditingItem(null);
    }
    setShowSalesGoalModal(true);
  };

  const handleEditOpportunityGoal = (goal: OpportunityGoal | null, type: 'annual' | 'quarterly', quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    if (goal) {
      setOpportunityForm({
        year: goal.year,
        countTarget: goal.countTarget,
        amountTarget: goal.amountTarget,
        type: goal.type,
        quarter: goal.quarter || 'Q1',
      });
      setEditingItem(goal);
    } else {
      setOpportunityForm({
        year: selectedYear,
        countTarget: 0,
        amountTarget: 0,
        type,
        quarter: quarter || 'Q1',
      });
      setEditingItem(null);
    }
    setShowOpportunityGoalModal(true);
  };

  const handleEditStrategy = (item: AnnualStrategy | QuarterlyMeasure | null, quarter: 'annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    setSelectedQuarter(quarter);
    
    if (item) {
      if ('weight' in item) {
        // 年度策略
        setStrategyForm({
          year: item.year,
          content: item.content,
          owner: item.owner,
          ownerId: item.ownerId,
          weight: item.weight,
          quarter: 'Q1',
          strategyId: '',
          progress: 0,
        });
      } else {
        // 季度措施
        setStrategyForm({
          year: item.year,
          content: item.content,
          owner: item.owner,
          ownerId: item.ownerId,
          weight: 0,
          quarter: item.quarter,
          strategyId: item.strategyId,
          progress: item.progress || 0,
        });
      }
      setEditingItem(item);
    } else {
      setStrategyForm({
        year: selectedYear,
        content: '',
        owner: '',
        ownerId: '',
        weight: 0,
        quarter: quarter === 'annual' ? 'Q1' : quarter,
        strategyId: '',
        progress: 0,
      });
      setEditingItem(null);
    }
    setShowStrategyModal(true);
  };

  // 获取年度销售目标数据
  const getAnnualSalesGoal = () => {
    console.log('📊 getAnnualSalesGoal - salesGoals:', salesGoals);
    if (!salesGoals || salesGoals.length === 0) {
      return {
        year: selectedYear,
        orderTarget: 0,
        orderActual: 0,
        revenueTarget: 0,
        revenueActual: 0,
      };
    }
    // 获取所有年度目标记录并按创建时间排序，取最新的
    const annualGoals = salesGoals.filter(g => g.type === 'annual');
    const annualGoal = annualGoals.length > 0 
      ? annualGoals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : {
          year: selectedYear,
          orderTarget: 0,
          orderActual: 0,
          revenueTarget: 0,
          revenueActual: 0,
        };
    console.log('📊 getAnnualSalesGoal - 返回:', annualGoal);
    return annualGoal;
  };

  // 获取季度销售目标数据
  const getQuarterlySalesGoals = () => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    if (!salesGoals || salesGoals.length === 0) {
      return quarters.map(quarter => ({
        quarter,
        orderTarget: 0,
        orderActual: 0,
        revenueTarget: 0,
        revenueActual: 0,
      }));
    }
    return quarters.map(quarter => {
      // 获取该季度的所有记录并按创建时间排序，取最新的
      const quarterGoals = salesGoals.filter(g => g.type === 'quarterly' && g.quarter === quarter);
      const goal = quarterGoals.length > 0
        ? quarterGoals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      return goal || {
        quarter,
        orderTarget: 0,
        orderActual: 0,
        revenueTarget: 0,
        revenueActual: 0,
      };
    });
  };

  // 获取年度商机目标数据
  const getAnnualOpportunityGoal = () => {
    console.log('🔍 获取年度商机目标 - opportunityGoals:', opportunityGoals);
    
    if (!opportunityGoals || opportunityGoals.length === 0) {
      console.log('⚠️ opportunityGoals为空，返回默认值');
      return {
        year: selectedYear,
        countTarget: 0,
        countActual: 0,
        amountTarget: 0,
        amountActual: 0,
      };
    }
    
    const annualGoal = opportunityGoals.find(g => g.type === 'annual');
    console.log('🔍 查找到的年度商机目标:', annualGoal);
    
    return annualGoal || {
      year: selectedYear,
      countTarget: 0,
      countActual: 0,
      amountTarget: 0,
      amountActual: 0,
    };
  };

  // 获取季度商机目标数据
  const getQuarterlyOpportunityGoals = () => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    console.log('🔍 获取季度商机目标 - opportunityGoals:', opportunityGoals);
    
    if (!opportunityGoals || opportunityGoals.length === 0) {
      console.log('⚠️ opportunityGoals为空，返回默认值');
      return quarters.map(quarter => ({
        quarter,
        countTarget: 0,
        countActual: 0,
        amountTarget: 0,
        amountActual: 0,
      }));
    }
    
    const result = quarters.map(quarter => {
      const goal = opportunityGoals.find(g => g.type === 'quarterly' && g.quarter === quarter);
      console.log(`🔍 查找季度 ${quarter}:`, goal);
      return goal || {
        quarter,
        countTarget: 0,
        countActual: 0,
        amountTarget: 0,
        amountActual: 0,
      };
    });
    
    console.log('✅ 最终返回的季度目标:', result);
    return result;
  };

  const renderSalesGoals = () => {
    const annualGoal = getAnnualSalesGoal();
    const quarterlyGoals = getQuarterlySalesGoals();

    return (
      <div className="space-y-6">
        {/* 年度目标概览 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{selectedYear}年度销售目标</h3>
            {checkPermission('goal.salesGoal', 'edit') && (
              <button
                onClick={() => handleEditSalesGoal(salesGoals?.find(g => g.type === 'annual') || null, 'annual')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
              <Edit2 className="w-4 h-4" />
              编辑目标
            </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">订单承揽目标</span>
                  <span className="text-sm text-gray-900">
                    {annualGoal.orderActual.toFixed(2)}/{annualGoal.orderTarget}万
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualGoal.orderTarget > 0 ? (annualGoal.orderActual / annualGoal.orderTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  完成率: {annualGoal.orderTarget > 0 ? ((annualGoal.orderActual / annualGoal.orderTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xs text-blue-600 mb-1">年度目标</div>
                  <div className="text-2xl font-bold text-blue-600">{annualGoal.orderTarget}</div>
                  <div className="text-xs text-gray-600 mt-1">万元</div>
                </div>
                <div 
                  className="bg-green-50 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:bg-green-100 transition-all"
                  onClick={() => loadOpportunitiesByPeriod(selectedYear)}
                >
                  <div className="text-xs text-green-600 mb-1">已完成</div>
                  <div className="text-2xl font-bold text-green-600">{annualGoal.orderActual.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">万元 (点击查看详情)</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">销售收入目标</span>
                  <span className="text-sm text-gray-900">
                    {annualGoal.revenueActual.toFixed(2)}/{annualGoal.revenueTarget}万
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualGoal.revenueTarget > 0 ? (annualGoal.revenueActual / annualGoal.revenueTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  完成率: {annualGoal.revenueTarget > 0 ? ((annualGoal.revenueActual / annualGoal.revenueTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-xs text-purple-600 mb-1">年度目标</div>
                  <div className="text-2xl font-bold text-purple-600">{annualGoal.revenueTarget}</div>
                  <div className="text-xs text-gray-600 mt-1">万元</div>
                </div>
                <div 
                  className="bg-orange-50 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:bg-orange-100 transition-all"
                  onClick={() => loadProjectsByPeriod(selectedYear)}
                >
                  <div className="text-xs text-orange-600 mb-1">已完成</div>
                  <div className="text-2xl font-bold text-orange-600">{annualGoal.revenueActual.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">万元 (点击查看详情)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 季度目标分解图表 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">季度目标完成情况</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quarterlyGoals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orderTarget" fill="#93c5fd" name="订单目标" />
              <Bar dataKey="orderActual" fill="#3b82f6" name="订单实际" />
              <Bar dataKey="revenueTarget" fill="#d8b4fe" name="收入目标" />
              <Bar dataKey="revenueActual" fill="#a855f7" name="收入实际" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 季度详细数据 */}
        <div className="grid grid-cols-4 gap-4">
          {quarterlyGoals.map((q: any) => (
            <div key={q.quarter} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-semibold text-gray-900">{q.quarter}</div>
                {checkPermission('goal.salesGoal', 'edit') && (
                  <button 
                    onClick={() => handleEditSalesGoal(salesGoals?.find(g => g.quarter === q.quarter) || null, 'quarterly', q.quarter)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    编辑
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div 
                  className="cursor-pointer hover:bg-blue-50 rounded-lg p-2 -mx-2 transition-colors"
                  onClick={() => loadOpportunitiesByPeriod(selectedYear, q.quarter)}
                >
                  <div className="text-xs text-gray-500 mb-1">订单承揽</div>
                  <div className="text-lg font-semibold text-gray-900">{q.orderActual.toFixed(2)}/{q.orderTarget}万</div>
                  <div className="text-xs text-blue-600">
                    {q.orderTarget > 0 ? `${((q.orderActual / q.orderTarget) * 100).toFixed(0)}%` : '-'} (点击查看)
                  </div>
                </div>
                <div 
                  className="cursor-pointer hover:bg-purple-50 rounded-lg p-2 -mx-2 transition-colors"
                  onClick={() => loadProjectsByPeriod(selectedYear, q.quarter)}
                >
                  <div className="text-xs text-gray-500 mb-1">销售收入</div>
                  <div className="text-lg font-semibold text-gray-900">{q.revenueActual.toFixed(2)}/{q.revenueTarget}万</div>
                  <div className="text-xs text-purple-600">
                    {q.revenueTarget > 0 ? `${((q.revenueActual / q.revenueTarget) * 100).toFixed(0)}%` : '-'} (点击查看)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOpportunityGoals = () => {
    const annualGoal = getAnnualOpportunityGoal();
    const quarterlyGoals = getQuarterlyOpportunityGoals();

    return (
      <div className="space-y-6">
        {/* 年度商机目标 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{selectedYear}年度商机挖掘目标</h3>
            {checkPermission('goal.opportunityGoal', 'edit') && (
              <button
                onClick={() => handleEditOpportunityGoal(opportunityGoals?.find(g => g.type === 'annual') || null, 'annual')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑目标
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8">
            {/* 商机挖掘数 */}
            <div 
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => loadOpportunitiesByPeriod(selectedYear)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-blue-800">商机挖掘数</div>
                <div className="text-xs text-blue-600 font-semibold">
                  {annualGoal.countTarget > 0 ? `${((annualGoal.countActual / annualGoal.countTarget) * 100).toFixed(1)}%` : '-'}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  <span className="text-blue-600">{annualGoal.countActual}</span>
                  <span className="text-gray-400 text-xl mx-2">/</span>
                  <span className="text-gray-700">{annualGoal.countTarget > 0 ? annualGoal.countTarget : '-'}</span>
                  <span className="text-lg text-gray-500 ml-2">个</span>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${annualGoal.countTarget > 0 ? (annualGoal.countActual / annualGoal.countTarget) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 商机预期金额 */}
            <div 
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => loadOpportunitiesByPeriod(selectedYear)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-green-800">商机预期金额</div>
                <div className="text-xs text-green-600 font-semibold">
                  {annualGoal.amountTarget > 0 ? `${((annualGoal.amountActual / annualGoal.amountTarget) * 100).toFixed(1)}%` : '-'}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  <span className="text-green-600">{annualGoal.amountActual}</span>
                  <span className="text-gray-400 text-xl mx-2">/</span>
                  <span className="text-gray-700">{annualGoal.amountTarget > 0 ? annualGoal.amountTarget : '-'}</span>
                  <span className="text-lg text-gray-500 ml-2">万</span>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${annualGoal.amountTarget > 0 ? (annualGoal.amountActual / annualGoal.amountTarget) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 季度目标 */}
        <div className="grid grid-cols-4 gap-4">
          {quarterlyGoals.map((q: any) => (
            <div 
              key={q.quarter} 
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
              onClick={() => loadOpportunitiesByPeriod(selectedYear, q.quarter)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-semibold text-gray-900">{q.quarter}</div>
                {checkPermission('goal.opportunityGoal', 'edit') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
                      handleEditOpportunityGoal(opportunityGoals?.find(g => g.quarter === q.quarter) || null, 'quarterly', q.quarter);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    编辑
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">商机挖掘数</div>
                    <div className="text-xs text-gray-400">
                      {q.countTarget > 0 ? `${((q.countActual / q.countTarget) * 100).toFixed(0)}%` : '-'}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    <span className="text-blue-600">{q.countActual}</span>
                    <span className="text-gray-400 text-base mx-1">/</span>
                    <span className="text-gray-600">{q.countTarget > 0 ? q.countTarget : '-'}</span>
                    <span className="text-sm text-gray-500 ml-1">个</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${q.countTarget > 0 ? (q.countActual / q.countTarget) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">商机预期金额</div>
                    <div className="text-xs text-gray-400">
                      {q.amountTarget > 0 ? `${((q.amountActual / q.amountTarget) * 100).toFixed(0)}%` : '-'}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    <span className="text-green-600">{q.amountActual}</span>
                    <span className="text-gray-400 text-base mx-1">/</span>
                    <span className="text-gray-600">{q.amountTarget > 0 ? q.amountTarget : '-'}</span>
                    <span className="text-sm text-gray-500 ml-1">万</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${q.amountTarget > 0 ? (q.amountActual / q.amountTarget) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStrategies = () => (
    <div className="space-y-6">
      {/* 年度经营策略 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{selectedYear}年度经营策略</h3>
          {checkPermission('goal.strategy', 'create') && (
            <button
              onClick={() => handleEditStrategy(null, 'annual')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增策略
            </button>
          )}
        </div>
        <div className="space-y-4">
          {annualStrategies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无年度策略，点击上方按钮新增</div>
          ) : (
            annualStrategies.map((strategy) => {
              // 计算该策略关联的季度举措数量和完成度
              const relatedMeasures = quarterlyMeasures.filter(m => m.strategyId === strategy._id);
              const measureCount = relatedMeasures.length;
              
              // 计算策略整体完成度
              let strategyCompletion = 0;
              if (measureCount > 0) {
                const totalProgress = relatedMeasures.reduce((sum, m) => sum + (m.progress || 0), 0);
                strategyCompletion = Math.round(totalProgress / measureCount);
              }
              
              const isCompleted = strategyCompletion === 100;
              
              return (
              <div 
                key={strategy._id} 
                className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all"
                onClick={() => handleViewStrategyDetail(strategy)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        {strategy.content}
                        {isCompleted && (
                          <span className="text-yellow-500" title="已完成">
                            ⭐
                          </span>
                        )}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        权重: {strategy.weight}%
                      </span>
                    </div>
                    {/* 新增：举措数量和完成度 */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">举措数量:</span>
                        <span className="text-sm font-semibold text-blue-600">{measureCount}条</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-600">完成度:</span>
                        <div className="flex-1 max-w-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  strategyCompletion === 100 ? 'bg-green-600' :
                                  strategyCompletion >= 60 ? 'bg-blue-600' :
                                  strategyCompletion >= 30 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${strategyCompletion}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold min-w-[45px] ${
                              strategyCompletion === 100 ? 'text-green-600' :
                              strategyCompletion >= 60 ? 'text-blue-600' :
                              strategyCompletion >= 30 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {strategyCompletion}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {checkPermission('goal.strategy', 'edit') && (
                      <button 
                        onClick={() => handleEditStrategy(strategy, 'annual')}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {checkPermission('goal.strategy', 'delete') && (
                      <button 
                        onClick={() => handleDeleteStrategy(strategy._id!, 'strategy')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})
          )}
        </div>
      </div>

      {/* 季度经营措施 */}
      {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => {
        const measures = quarterlyMeasures.filter(m => m.quarter === quarter);
        return (
          <div key={quarter} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{quarter}季度经营措施</h3>
              {checkPermission('goal.strategy', 'create') && (
                <button
                  onClick={() => handleEditStrategy(null, quarter)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增措施
                </button>
              )}
            </div>
            <div className="space-y-3">
              {measures.length === 0 ? (
                <div className="text-center py-6 text-gray-500">暂无{quarter}措施，点击上方按钮新增</div>
              ) : (
                measures.map((measure) => {
                  const relatedStrategy = annualStrategies?.find(s => s._id === measure.strategyId);
                  const measureProgress = measure.progress || 0;
                  const isCompleted = measureProgress === 100;
                  return (
                    <div 
                      key={measure._id} 
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-300 border border-transparent cursor-pointer transition-all"
                      onClick={() => handleViewMeasureDetail(measure)}
                    >
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          {measure.content}
                          {isCompleted && (
                            <span className="text-yellow-500" title="已完成">
                              ⭐
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          {relatedStrategy && (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-gray-600">关联年度策略:</span>
                              <span className="text-base font-bold text-indigo-700">{relatedStrategy.content}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">任务数量:</span>
                              <span className="font-semibold text-blue-600">{measure.taskCount || 0}条</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">责任人:</span>
                              <span className="font-medium text-gray-900">{measure.owner}</span>
                            </div>
                          </div>
                        </div>
                        {/* 进度条 */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                measureProgress === 100 ? 'bg-green-600' :
                                measureProgress >= 60 ? 'bg-blue-600' :
                                measureProgress >= 30 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${measureProgress}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold min-w-[45px] ${
                            measureProgress === 100 ? 'text-green-600' :
                            measureProgress >= 60 ? 'text-blue-600' :
                            measureProgress >= 30 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {measureProgress}%
                          </span>
                        </div>
                      </div>
                      {checkPermission('goal.strategy', 'edit') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStrategy(measure, quarter);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {checkPermission('goal.strategy', 'delete') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStrategy(measure._id!, 'measure');
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 导出执行力地图为PDF
  const exportExecutionMapToPDF = async () => {
    if (!executionTreeData || !executionTreeData.children || executionTreeData.children.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    try {
      // 使用iframe完全隔离样式环境，避免继承页面的Tailwind oklch颜色
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position: absolute; left: -9999px; width: 800px; height: 600px;';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('无法创建iframe文档');
      }
      
      // 构建完整的独立HTML文档（不继承任何外部CSS）
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, "Microsoft YaHei", sans-serif;
              background: #ffffff;
              color: #000000;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div style="padding: 20px; background: #ffffff;">
            <h1 style="text-align: center; color: #1e40af; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">${selectedYear}年度战略执行力地图</h1>
            
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>生成时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>年度策略:</strong> ${executionStats.totalStrategies}条 (已完成: ${executionStats.completedStrategies}条)</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>季度措施:</strong> ${executionStats.totalMeasures}条 (已完成: ${executionStats.completedMeasures}条)</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>整体进度:</strong> ${executionStats.overallProgress}%</p>
            </div>
            
            <div style="margin-top: 30px;">
      `;
      
      // 遍历树结构生成内容
      executionTreeData.children.forEach((strategy: any, strategyIndex: number) => {
        // 计算策略的平均进度
        let strategyProgress = 0;
        if (strategy.children && strategy.children.length > 0) {
          const totalProgress = strategy.children.reduce((sum: number, child: any) => sum + (child.progress || 0), 0);
          strategyProgress = Math.round(totalProgress / strategy.children.length);
        }
        
        htmlContent += `
          <div style="margin-bottom: 25px;">
            <div style="background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">${strategyIndex + 1}. ${strategy.name}</h2>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                权重: ${strategy.weight}% | 季度措施: ${strategy.children?.length || 0}条 | 完成进度: ${strategyProgress}%
              </p>
            </div>
        `;
        
        // 季度措施
        if (strategy.children && strategy.children.length > 0) {
          strategy.children.forEach((measure: any, measureIndex: number) => {
            htmlContent += `
              <div style="margin-left: 20px; margin-bottom: 15px;">
                <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
                  <h3 style="color: #0d9488; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${strategyIndex + 1}.${measureIndex + 1} ${measure.name}</h3>
                  <p style="color: #6b7280; font-size: 11px; margin: 0;">
                    ${measure.quarter} | 负责人: ${measure.owner} | 进度: ${measure.progress}% | 状态: ${measure.status}
                  </p>
                </div>
            `;
            
            // 团队任务
            if (measure.children && measure.children.length > 0) {
              measure.children.forEach((teamTask: any) => {
                htmlContent += `
                  <div style="margin-left: 20px; margin-bottom: 10px;">
                    <div style="background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 4px; padding: 10px; margin-bottom: 6px;">
                      <h4 style="color: #059669; margin: 0 0 6px 0; font-size: 13px; font-weight: bold;">👥 ${teamTask.name}</h4>
                      <p style="color: #6b7280; font-size: 10px; margin: 0;">
                        负责人: ${teamTask.owner} | 进度: ${teamTask.progress}% | 状态: ${teamTask.status}
                      </p>
                    </div>
                `;
                
                // 个人任务
                if (teamTask.children && teamTask.children.length > 0) {
                  teamTask.children.forEach((personalTask: any) => {
                    htmlContent += `
                      <div style="margin-left: 20px; margin-bottom: 6px;">
                        <div style="background: #f7fee7; border-left: 2px solid #84cc16; border-radius: 4px; padding: 8px;">
                          <p style="color: #65a30d; margin: 0 0 4px 0; font-size: 12px; font-weight: 600;">⭐ ${personalTask.name}</p>
                          <p style="color: #9ca3af; font-size: 9px; margin: 0;">
                            负责人: ${personalTask.owner} | 进度: ${personalTask.progress}% | 状态: ${personalTask.status}
                          </p>
                        </div>
                      </div>
                    `;
                  });
                }
                
                htmlContent += `</div>`;
              });
            }
            
            htmlContent += `</div>`;
          });
        }
        
        htmlContent += `</div>`;
      });
      
      htmlContent += `
            </div>
          </div>
        </body>
        </html>
      `;
      
      // 写入iframe文档
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      // 等待iframe内容渲染完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 获取iframe的body元素
      const iframeBody = iframeDoc.body;
      if (!iframeBody) {
        throw new Error('iframe内容加载失败');
      }
      
      // 使用html2canvas渲染iframe内容
      const canvas = await html2canvas(iframeBody, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        windowHeight: iframeBody.scrollHeight
      });
      
      // 移除iframe
      document.body.removeChild(iframe);
      
      // 创建PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth - 20; // 左右各留10mm边距
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // 顶部边距
      
      // 添加第一页
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
      
      // 如果内容超过一页，添加额外的页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }
      
      // 保存PDF
      const filename = `战略执行力地图_${selectedYear}年_${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      alert('PDF导出成功！');
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败，请重试: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 渲染执行力地图
  const renderExecutionMap = () => {
    // 切换节点折叠状态
    const toggleNode = (nodeId: string) => {
      setExpandedNodes(prev => ({
        ...prev,
        [nodeId]: !prev[nodeId]
      }));
    };

    // 递归渲染树节点
    const renderTreeNode = (node: any, level: number = 0) => {
      const indentClass = `ml-${level * 8}`;
      
      // 根节点样式
      if (node.type === 'root') {
        return (
          <div key="root" className="mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {node.name}
              </h2>
            </div>
            <div className="mt-6 space-y-4">
              {node.children?.map((child: any) => renderTreeNode(child, level + 1))}
            </div>
          </div>
        );
      }
      
      // 策略节点样式
      if (node.type === 'strategy') {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] !== false; // 默认展开
        
        // 计算策略的平均进度（基于季度措施的进度）
        let strategyProgress = 0;
        if (hasChildren && node.children.length > 0) {
          const totalProgress = node.children.reduce((sum: number, child: any) => sum + (child.progress || 0), 0);
          strategyProgress = Math.round(totalProgress / node.children.length);
        }
        
        return (
          <div key={node.id} className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg p-5 shadow-md relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">📋 {node.name}</h3>
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                      权重 {node.weight}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>季度措施: {node.children?.length || 0}条</span>
                    <div className="flex items-center gap-2">
                      <span>完成进度:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${strategyProgress}%` }}
                          />
                        </div>
                        <span className="text-blue-600 font-semibold">{strategyProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 折叠三角形 - 左下角 */}
              {hasChildren && (
                <button
                  onClick={() => toggleNode(node.id)}
                  className="absolute bottom-2 left-2 w-6 h-6 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-all"
                  title={isExpanded ? '点击折叠' : '点击展开'}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* 子节点 - 根据折叠状态显示/隐藏 */}
            {hasChildren && isExpanded && (
              <div className="ml-8 mt-4 space-y-3 border-l-2 border-gray-200 pl-6">
                {node.children.map((child: any) => renderTreeNode(child, level + 1))}
              </div>
            )}
          </div>
        );
      }
      
      // 季度措施节点样式
      if (node.type === 'measure') {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] !== false; // 默认展开
        
        return (
          <div key={node.id} className="mb-4">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-cyan-500 rounded-lg p-4 shadow relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-bold text-gray-900">🎯 {node.name}</h4>
                    <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded font-semibold">
                      {node.quarter}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${
                      node.status === '已完成' ? 'bg-green-100 text-green-800' :
                      node.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {node.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">负责人: {node.owner}</span>
                    <span className="text-gray-600">团队任务: {node.taskCount}个</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">进度:</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-cyan-600 h-2 rounded-full"
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                      <span className="font-bold text-cyan-600">{node.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 折叠三角形 - 左下角 */}
              {hasChildren && (
                <button
                  onClick={() => toggleNode(node.id)}
                  className="absolute bottom-2 left-2 w-6 h-6 flex items-center justify-center text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100 rounded transition-all"
                  title={isExpanded ? '点击折叠' : '点击展开'}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* 子节点 - 根据折叠状态显示/隐藏 */}
            {hasChildren && isExpanded && (
              <div className="ml-8 mt-3 space-y-2 border-l-2 border-gray-200 pl-6">
                {node.children.map((child: any) => renderTreeNode(child, level + 1))}
              </div>
            )}
          </div>
        );
      }
      
      // 团队任务节点样式
      if (node.type === 'teamTask') {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] !== false; // 默认展开
        
        return (
          <div key={node.id} className="mb-3">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500 rounded-lg p-3 shadow-sm relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-sm font-semibold text-gray-900">👥 {node.name}</h5>
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                      node.status === '已完成' ? 'bg-green-100 text-green-800' :
                      node.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {node.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>负责人: {node.owner}</span>
                    <span>个人任务: {node.children?.length || 0}个</span>
                    <div className="flex items-center gap-1">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-teal-600 h-1.5 rounded-full"
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                      <span className="font-bold text-teal-600">{node.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 折叠三角形 - 左下角 */}
              {hasChildren && (
                <button
                  onClick={() => toggleNode(node.id)}
                  className="absolute bottom-1 left-1 w-5 h-5 flex items-center justify-center text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded transition-all"
                  title={isExpanded ? '点击折叠' : '点击展开'}
                >
                  <svg 
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* 子节点 - 根据折叠状态显示/隐藏 */}
            {hasChildren && isExpanded && (
              <div className="ml-6 mt-2 space-y-1.5 border-l border-gray-200 pl-4">
                {node.children.map((child: any) => renderTreeNode(child, level + 1))}
              </div>
            )}
          </div>
        );
      }
      
      // 个人任务节点样式（叶子节点，无折叠三角形）
      if (node.type === 'personalTask') {
        return (
          <div key={node.id} className="mb-2">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-2 border-green-500 rounded p-2 shadow-sm">
              <div className="flex items-center gap-2">
                <h6 className="text-xs font-medium text-gray-900 flex-1">👤 {node.name}</h6>
                <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                  node.status === '已完成' ? 'bg-green-100 text-green-800' :
                  node.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {node.status}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-16 bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-green-600 h-1 rounded-full"
                      style={{ width: `${node.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-green-600">{node.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      return null;
    };

    return (
      <div className="space-y-6">
        {/* 总体执行进度 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {selectedYear}年度总体执行进度
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">年度策略</div>
              <div className="text-2xl font-bold text-blue-600">
                {executionStats.completedStrategies}/{executionStats.totalStrategies}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                完成率: {executionStats.totalStrategies > 0 
                  ? Math.round((executionStats.completedStrategies / executionStats.totalStrategies) * 100) 
                  : 0}%
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
              <div className="text-sm text-gray-600 mb-1">季度措施</div>
              <div className="text-2xl font-bold text-cyan-600">
                {executionStats.completedMeasures}/{executionStats.totalMeasures}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                完成率: {executionStats.totalMeasures > 0 
                  ? Math.round((executionStats.completedMeasures / executionStats.totalMeasures) * 100) 
                  : 0}%
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">整体进度</div>
              <div className="text-2xl font-bold text-purple-600">
                {executionStats.overallProgress}%
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                    style={{ width: `${executionStats.overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">执行状态</div>
              <div className="text-2xl font-bold text-green-600">
                {executionStats.overallProgress >= 80 ? '优秀' :
                 executionStats.overallProgress >= 60 ? '良好' :
                 executionStats.overallProgress >= 40 ? '一般' : '需改进'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                基于整体进度评估
              </div>
            </div>
          </div>
        </div>

        {/* 执行力树图 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              战略落地执行力树图
            </h3>
            
            {/* 全部展开/折叠按钮 */}
            {executionTreeData && executionTreeData.children?.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // 收集所有节点ID
                    const allNodeIds: string[] = [];
                    const collectIds = (node: any) => {
                      if (node.id) allNodeIds.push(node.id);
                      if (node.children) {
                        node.children.forEach((child: any) => collectIds(child));
                      }
                    };
                    executionTreeData.children.forEach((child: any) => collectIds(child));
                    
                    // 全部展开
                    const expanded: Record<string, boolean> = {};
                    allNodeIds.forEach(id => expanded[id] = true);
                    setExpandedNodes(expanded);
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  全部展开
                </button>
                <button
                  onClick={() => {
                    // 收集所有节点ID
                    const allNodeIds: string[] = [];
                    const collectIds = (node: any) => {
                      if (node.id) allNodeIds.push(node.id);
                      if (node.children) {
                        node.children.forEach((child: any) => collectIds(child));
                      }
                    };
                    executionTreeData.children.forEach((child: any) => collectIds(child));
                    
                    // 全部折叠
                    const collapsed: Record<string, boolean> = {};
                    allNodeIds.forEach(id => collapsed[id] = false);
                    setExpandedNodes(collapsed);
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  全部折叠
                </button>
                {checkPermission('goal.execution', 'export') && (
                  <button
                    onClick={exportExecutionMapToPDF}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                    title="导出为PDF文件"
                  >
                    <Download className="w-4 h-4" />
                    导出PDF
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              这棵执行力树清晰展示了年度策略如何通过季度措施、团队月度任务和个人周任务逐层落地执行。点击左下角三角形可展开/折叠子节点。
            </p>
          </div>
          
          {!executionTreeData ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              加载执行力地图数据中...
            </div>
          ) : executionTreeData.children?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              暂无年度策略数据，请先在"经营策略"标签页添加策略
            </div>
          ) : (
            <div className="space-y-4">
              {renderTreeNode(executionTreeData)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">目标策略管理</h1>
            <p className="text-gray-600">公司年度目标与经营策略</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 mr-2">选择年度：</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {checkPermission('goal.salesGoal', 'view') && (
          <button
            onClick={() => setSelectedTab('sales')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'sales' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-5 h-5" />
            销售目标
          </button>
        )}
        {checkPermission('goal.opportunityGoal', 'view') && (
          <button
            onClick={() => setSelectedTab('opportunity')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'opportunity' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            商机目标
          </button>
        )}
        {checkPermission('goal.strategy', 'view') && (
          <button
            onClick={() => setSelectedTab('strategy')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'strategy' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            经营策略
          </button>
        )}
        {checkPermission('goal.execution', 'view') && (
          <button
            onClick={() => setSelectedTab('execution')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'execution' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            执行力地图
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <>
          {selectedTab === 'sales' && renderSalesGoals()}
          {selectedTab === 'opportunity' && renderOpportunityGoals()}
          {selectedTab === 'strategy' && renderStrategies()}
          {selectedTab === 'execution' && renderExecutionMap()}
        </>
      )}

      {/* Sales Goal Modal */}
      {showSalesGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? '编辑销售目标' : '设置销售目标'}
              </h2>
              <button onClick={() => { setShowSalesGoalModal(false); setEditingItem(null); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年度</label>
                <select 
                  value={salesForm.year}
                  onChange={(e) => setSalesForm({ ...salesForm, year: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingItem}
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {salesForm.type === 'quarterly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">季度</label>
                  <select 
                    value={salesForm.quarter}
                    onChange={(e) => setSalesForm({ ...salesForm, quarter: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingItem}
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">订单承揽目标（万元）</label>
                <input
                  type="number"
                  value={salesForm.orderTarget === 0 ? '' : salesForm.orderTarget}
                  onChange={(e) => setSalesForm({ ...salesForm, orderTarget: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={(e) => { if (salesForm.orderTarget === 0) e.target.value = ''; }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="请输入订单承揽目标"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">销售收入目标（万元）</label>
                <input
                  type="number"
                  value={salesForm.revenueTarget === 0 ? '' : salesForm.revenueTarget}
                  onChange={(e) => setSalesForm({ ...salesForm, revenueTarget: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={(e) => { if (salesForm.revenueTarget === 0) e.target.value = ''; }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="请输入销售收入目标"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowSalesGoalModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSalesGoal}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Goal Modal */}
      {showOpportunityGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? '编辑商机目标' : '设置商机目标'}
              </h2>
              <button onClick={() => { setShowOpportunityGoalModal(false); setEditingItem(null); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年度</label>
                <select 
                  value={opportunityForm.year}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, year: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingItem}
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {opportunityForm.type === 'quarterly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">季度</label>
                  <select 
                    value={opportunityForm.quarter}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, quarter: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingItem}
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商机挖掘数量目标（个）</label>
                <input
                  type="number"
                  value={opportunityForm.countTarget === 0 ? '' : opportunityForm.countTarget}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, countTarget: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={(e) => { if (opportunityForm.countTarget === 0) e.target.value = ''; }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="请输入商机数量目标"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商机预期金额目标（万元）</label>
                <input
                  type="number"
                  value={opportunityForm.amountTarget === 0 ? '' : opportunityForm.amountTarget}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, amountTarget: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={(e) => { if (opportunityForm.amountTarget === 0) e.target.value = ''; }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="请输入商机金额目标"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowOpportunityGoalModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveOpportunityGoal}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Modal */}
      {showStrategyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem 
                  ? (selectedQuarter === 'annual' ? '编辑年度策略' : `编辑${selectedQuarter}措施`)
                  : (selectedQuarter === 'annual' ? '新增年度策略' : `新增${selectedQuarter}措施`)
                }
              </h2>
              <button onClick={() => { setShowStrategyModal(false); setEditingItem(null); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年度</label>
                <select 
                  value={strategyForm.year}
                  onChange={(e) => setStrategyForm({ ...strategyForm, year: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingItem}
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {selectedQuarter !== 'annual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联年度策略</label>
                  <select 
                    value={strategyForm.strategyId}
                    onChange={(e) => setStrategyForm({ ...strategyForm, strategyId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择策略</option>
                    {annualStrategies.map(strategy => (
                      <option key={strategy._id} value={strategy._id}>{strategy.content}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedQuarter === 'annual' ? '策略内容' : '举措内容'}
                </label>
                <textarea
                  value={strategyForm.content}
                  onChange={(e) => setStrategyForm({ ...strategyForm, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入内容"
                />
              </div>
              {selectedQuarter !== 'annual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">责任人</label>
                  <select 
                    value={strategyForm.ownerId}
                    onChange={(e) => {
                      const user = users.find(u => u._id === e.target.value);
                      setStrategyForm({ 
                        ...strategyForm, 
                        ownerId: e.target.value,
                        owner: user?.name || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择责任人</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedQuarter === 'annual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">权重（%）</label>
                  <input
                    type="number"
                    value={strategyForm.weight === 0 ? '' : strategyForm.weight}
                    onChange={(e) => setStrategyForm({ ...strategyForm, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                    onFocus={(e) => { if (strategyForm.weight === 0) e.target.value = ''; }}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入权重 (0-100)"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowStrategyModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveStrategy}
                disabled={loading || !strategyForm.content || (selectedQuarter !== 'annual' && !strategyForm.ownerId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商机列表弹窗 */}
      {showOpportunityListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{opportunityListTitle}</h2>
              <button onClick={() => setShowOpportunityListModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {loadingOpportunities ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : opportunityListData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无商机数据
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  共找到 <span className="font-semibold text-blue-600">{opportunityListData.length}</span> 条商机，
                  订单承揽金额合计 <span className="font-semibold text-green-600">
                    {opportunityListTotal.toFixed(2)}
                  </span> 万元
                </div>
                <div className="space-y-3">
                  {opportunityListData.map((opp) => (
                    <div key={opp._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-semibold text-gray-900">{opp.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${
                              opp.stage === '成交' ? 'bg-green-100 text-green-700' :
                              opp.stage === '商务谈判' ? 'bg-purple-100 text-purple-700' :
                              opp.stage === '方案咨询' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {opp.stage}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              opp.level === '重要' ? 'bg-red-100 text-red-700' :
                              opp.level === '一般' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {opp.level}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-500">客户：</span>
                              <span className="font-medium">{opp.customer}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">预期金额：</span>
                              <span className="font-semibold text-green-600">
                                {((opp.estimatedAmount || 0) / 10000).toFixed(2)} 万元
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">成功率：</span>
                              <span className="font-medium">{opp.probability || 0}%</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            创建时间：{new Date(opp.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowOpportunityListModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 项目列表弹窗 */}
      {showProjectListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{projectListTitle}</h2>
              <button onClick={() => setShowProjectListModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {loadingProjects ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : projectListData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无项目数据
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  共找到 <span className="font-semibold text-purple-600">{projectListData.length}</span> 个项目，
                  销售收入合计 <span className="font-semibold text-orange-600">
                    {(projectListData.reduce((sum, proj) => sum + (proj.totalAmount || 0), 0) / 10000).toFixed(2)}
                  </span> 万元
                </div>
                <div className="space-y-3">
                  {projectListData.map((proj) => (
                    <div key={proj._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-semibold text-gray-900">{proj.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${
                              proj.status === '已完成' ? 'bg-green-100 text-green-700' :
                              proj.status === '进行中' ? 'bg-blue-100 text-blue-700' :
                              proj.status === '计划中' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {proj.status}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              proj.level === '重点' ? 'bg-red-100 text-red-700' :
                              proj.level === '一般' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {proj.level}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-500">客户：</span>
                              <span className="font-medium">{proj.customer}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">销售收入：</span>
                              <span className="font-semibold text-orange-600">
                                {((proj.totalAmount || 0) / 10000).toFixed(2)} 万元
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mt-2">
                            <div>
                              收入确认时间：{proj.revenueRecordedAt ? new Date(proj.revenueRecordedAt).toLocaleString() : '-'}
                            </div>
                            <div>
                              项目周期：{new Date(proj.startDate).toLocaleDateString()} ~ {new Date(proj.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowProjectListModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Detail Modal - 策略详情弹窗 */}
      {showStrategyDetailModal && selectedStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedStrategy.content}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStrategy.year}年度 · 负责人: {selectedStrategy.owner} · 权重: {selectedStrategy.weight}%
                </p>
              </div>
              <button onClick={() => setShowStrategyDetailModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">关联季度经营措施</h3>
              {relatedMeasures.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  暂无关联的季度措施
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedMeasures.map((measure) => (
                    <div key={measure._id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                            {measure.quarter}
                          </span>
                          <div className="text-sm font-medium text-gray-900">{measure.content}</div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>负责人: {measure.owner}</span>
                          <span>·</span>
                          <span>{measure.year}年</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-xs font-medium ${
                        measure.status === '进行中' ? 'bg-blue-50 text-blue-700' :
                        measure.status === '已完成' ? 'bg-green-50 text-green-700' :
                        measure.status === '暂停' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {measure.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {relatedMeasures.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">完成进度:</span>
                    <span className="text-blue-700 font-semibold">
                      {relatedMeasures.filter(m => m.status === '已完成').length} / {relatedMeasures.length}
                    </span>
                    <span className="text-gray-600">个措施已完成</span>
                  </div>
                  {relatedMeasures.every(m => m.status === '已完成') && (
                    <div className="mt-2 text-xs text-green-700 font-medium">
                      ✓ 所有措施已完成，该策略将自动标记为"已完成"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowStrategyDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measure Detail Modal - 措施详情弹窗 */}
      {showMeasureDetailModal && selectedMeasure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedMeasure.content}</h2>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium mr-3">
                    {selectedMeasure.quarter}
                  </span>
                  <span className="text-gray-600">责任人: {selectedMeasure.owner}</span>
                  <span className="mx-2">·</span>
                  <span className="text-gray-600">完成度: </span>
                  <span className={`font-bold ${
                    selectedMeasure.progress === 100 ? 'text-green-600' :
                    selectedMeasure.progress >= 60 ? 'text-blue-600' :
                    selectedMeasure.progress >= 30 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedMeasure.progress}%
                  </span>
                  {selectedMeasure.progress === 100 && (
                    <span className="ml-2 text-yellow-500">⭐</span>
                  )}
                </p>
              </div>
              <button onClick={() => setShowMeasureDetailModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">关联团队月度工作计划</h3>
              {measureRelatedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  暂无关联的团队级月度任务
                </div>
              ) : (
                <>
                  <div className="mb-3 text-sm text-gray-600">
                    共 <span className="font-semibold text-blue-600">{measureRelatedTasks.length}</span> 条关联任务
                  </div>
                  <div className="space-y-3">
                    {measureRelatedTasks.map((task) => (
                      <div key={task._id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-medium text-gray-900">{task.name}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              task.status === '已完成' ? 'bg-green-100 text-green-700' :
                              task.status === '进行中' ? 'bg-blue-100 text-blue-700' :
                              task.status === '延期' ? 'bg-red-100 text-red-700' :
                              task.status === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="text-gray-500">负责人:</span>
                              <span className="ml-1 font-medium">{task.ownerName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">截止时间:</span>
                              <span className="ml-1">{new Date(task.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {/* 进度条 */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  task.progress === 100 ? 'bg-green-600' :
                                  task.progress >= 60 ? 'bg-blue-600' :
                                  task.progress >= 30 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold min-w-[45px] ${
                              task.progress === 100 ? 'text-green-600' :
                              task.progress >= 60 ? 'text-blue-600' :
                              task.progress >= 30 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {task.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {measureRelatedTasks.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">完成进度:</span>
                    <span className="text-blue-700 font-semibold">
                      {measureRelatedTasks.filter(t => t.progress === 100).length} / {measureRelatedTasks.length}
                    </span>
                    <span className="text-gray-600">个任务已完成</span>
                    <span className="mx-2">·</span>
                    <span className="font-medium text-gray-900">平均完成度:</span>
                    <span className="text-green-700 font-semibold">
                      {Math.round(measureRelatedTasks.reduce((sum, t) => sum + t.progress, 0) / measureRelatedTasks.length)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowMeasureDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
