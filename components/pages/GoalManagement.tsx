import { useState, useEffect } from 'react';
import { Target, TrendingUp, Briefcase, ShoppingCart, Plus, X, Edit2, Trash2, Save, Download, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db, callFunction } from '../../lib/cloudbase';
import { OutcomeGoals } from '../OutcomeGoals';

// 导入 CloudBase command 用于数据库查询
const _ = db.command;
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { showAlert, showConfirm, showSuccess, showError, showWarning, toastSuccess } from '../../lib/dialog-utils';
import { SafeguardMeasure } from '../../types/safeguard';
import { SafeguardInlineForm } from '../SafeguardInlineForm';
import DecompositionDimensionSettingsWithTabs from '../DecompositionDimensionSettingsWithTabs';
import GoalDecompositionMultiTable from '../GoalDecompositionMultiTable';

// 中文数字转换函数
const toChineseNumber = (num: number): string => {
  const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (num <= 10) {
    return chineseNumbers[num];
  } else if (num < 20) {
    return '十' + chineseNumbers[num - 10];
  } else if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return chineseNumbers[tens] + '十' + (ones > 0 ? chineseNumbers[ones] : '');
  }
  return String(num);
};

interface GoalManagementProps {
  userRole: 'admin' | 'employee';
  currentUser: any;
  openGoalId?: string;  // 🔧 要打开的目标ID
  onGoalOpened?: () => void;  // 🔧 打开后的回调
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
  safeguardId: string; // 关联保障措施ID（原strategyId）
  safeguardTitle?: string; // 保障措施标题
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

// 产品目标数据接口
interface ProductOrderForecast {
  _id?: string;
  year: number;              // 年份
  categoryName: string;      // 产品类别名称
  
  // 产品目标
  forecast: {
    quantity: number;        // 数量
    unitPrice: number;       // 单价
    avgCost: number;         // 平均成本(元)
    avgGrossMargin: number;  // 平均毛利率(%)（自动计算）
    totalAmount: number;     // 预计订单额（自动计算）
  };
  
  // 实际订单部分
  actual: {
    completedAmount: number;    // 实际完成订单额
    completionRate: number;     // 实际完成率（%）
    totalQuantity: number;      // 累计订单数量
    totalCost: number;          // 总成本(元)
    avgUnitPrice: number;       // 平均单价
    avgCost: number;            // 平均成本(元)
    avgGrossMargin: number;     // 平均毛利率(%)
    q1Amount: number;           // Q1订单额
    q2Amount: number;           // Q2订单额
    q3Amount: number;           // Q3订单额
    q4Amount: number;           // Q4订单额
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}

export function GoalManagement({ userRole, currentUser, openGoalId, onGoalOpened }: GoalManagementProps) {
  const [selectedTab, setSelectedTab] = useState<'sales' | 'opportunity' | 'product' | 'strategy' | 'outcome' | 'decomposition' | 'execution' | 'dimensionSettings'>('sales');
  const currentYear = new Date().getFullYear(); // 当前年份（固定）
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // 使用新的权限上下文
  const { checkPermission, loading: permissionLoading } = usePermissionContext();
  
  // 🔧 自动选择第一个有权限的Tab
  useEffect(() => {
    if (!permissionLoading) {
      const tabs: Array<'sales' | 'opportunity' | 'product' | 'strategy' | 'decomposition' | 'execution' | 'dimensionSettings'> = ['sales', 'opportunity', 'product', 'strategy', 'decomposition', 'execution', 'dimensionSettings'];
      const moduleMap = {
        sales: 'goal.salesGoal',
        opportunity: 'goal.opportunityGoal',
        product: 'goal.productOrder',
        strategy: 'goal.strategy',
        decomposition: 'goal.decomposition',
        execution: 'goal.execution',
        dimensionSettings: 'goal.execution' // 维度设置使用与执行力地图相同的权限
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
  // 🔄 整合后的年度目标模态框
  const [showAnnualGoalModal, setShowAnnualGoalModal] = useState(false);
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

  // 内联编辑状态
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null);
  const [editingSafeguardId, setEditingSafeguardId] = useState<string | null>(null);
  const [isAddingSafeguard, setIsAddingSafeguard] = useState(false);
  const [editingQuarterlyId, setEditingQuarterlyId] = useState<string | null>(null);

  // 季度措施详情弹窗状态
  const [showMeasureDetailModal, setShowMeasureDetailModal] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<QuarterlyMeasure | null>(null);
  const [measureRelatedTasks, setMeasureRelatedTasks] = useState<any[]>([]);

  // 注意：保障措施管理已统一到 StrategyDetailModal 中
  
  // 年度策略展开状态（用于显示保障措施）
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});
  
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
  
  // 产品目标状态
  const [productForecasts, setProductForecasts] = useState<ProductOrderForecast[]>([]);
  const [isEditingForecast, setIsEditingForecast] = useState(false);
  const [isSavingForecast, setIsSavingForecast] = useState(false);
  const [hoveredForecastCell, setHoveredForecastCell] = useState<{productId: string, field: string} | null>(null);
  const [focusedForecastCell, setFocusedForecastCell] = useState<{productId: string, field: string} | null>(null);
  const [quarterlyMeasures, setQuarterlyMeasures] = useState<QuarterlyMeasure[]>([]);
  const [safeguardMeasures, setSafeguardMeasures] = useState<SafeguardMeasure[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 经营策略状态选项(从系统设置加载)
  const [strategyStatuses, setStrategyStatuses] = useState<string[]>([]);
  
  // 删除确认对话框状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string | null;
    type: 'strategy' | 'measure' | null;
  }>({ show: false, id: null, type: null });

  // 🔄 整合后的年度目标表单
  const [annualGoalForm, setAnnualGoalForm] = useState({
    year: 2025,
    // 销售目标
    orderTarget: 0,
    revenueTarget: 0,
    // 商机目标
    countTarget: 0,
    amountTarget: 0
  });

  const [strategyForm, setStrategyForm] = useState({
    year: 2025,
    content: '',
    owner: '',
    ownerId: '',
    weight: 0,
    quarter: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    safeguardId: '', // 改为关联保障措施ID
    progress: 0, // 新增:进度字段
  });

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await db.collection('users').get();
      // 🔧 过滤掉已删除的用户
      const activeUsers = res.data.filter((user: any) => user.deleted !== true);
      setUsers(activeUsers);
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


  // 保存保障措施
  // 注意：保障措施的增删改功能已统一到 StrategyDetailModal 中通过云函数实现

  // 注意：保障措施删除功能已统一到 StrategyDetailModal 中

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



  // 加载产品目标
  const loadProductForecasts = async () => {
    try {
      setLoading(true);
      const res = await db.collection('product_order_forecast')
        .where({ year: selectedYear })
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setProductForecasts([]);
        return;
      }
      
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载产品目标数据:', data.length, '条');
      
      // 如果没有数据，自动初始化
      if (data.length === 0) {
        console.log(`⚠️  ${selectedYear} 年暂无产品目标数据，开始自动初始化...`);
        await initializeProductForecasts(selectedYear);
      } else {
        // 按照正确的产品类别顺序排序
        const categoryOrder = ['职业装', '工作服', '制服', '防护服', '其他'];
        const sortedData = data.sort((a: any, b: any) => {
          const indexA = categoryOrder.indexOf(a.categoryName);
          const indexB = categoryOrder.indexOf(b.categoryName);
          // 如果类别不在列表中，放到最后
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setProductForecasts(sortedData);
      }
    } catch (error) {
      console.error('❌ 加载产品目标失败:', error);
      setProductForecasts([]);
    } finally {
      setLoading(false);
    }
  };


  
  // 初始化产品目标数据（首次访问时自动创建）
  const initializeProductForecasts = async (year: number) => {
    try {
      // 1. 从 type_settings 中读取产品类别列表
      const productTypesResult = await db.collection('type_settings')
        .where({ type: 'productType' })
        .get();
      
      if (!productTypesResult.data || productTypesResult.data.length === 0) {
        console.error('❌ 未找到产品类别设置！请先在"系统设置 → 类型设置 → 产品类别"中添加产品类别。');
        return;
      }
      
      const productTypes = productTypesResult.data[0].values || [];
      console.log(`✓ 找到 ${productTypes.length} 个产品类别:`, productTypes);
      
      // 2. 为每个产品类别创建空白记录
      const newForecasts: ProductOrderForecast[] = [];
      
      for (const category of productTypes) {
        const record = {
          year,
          categoryName: category.value,
          
          // 产品目标
          forecast: {
            quantity: 0,        // 数量
            unitPrice: 0,       // 单价
            avgCost: 0,         // 平均成本(元)
            avgGrossMargin: 0,  // 平均毛利率(%)
            totalAmount: 0      // 预计订单额（自动计算）
          },
          
          // 实际订单部分（从商机"形成项目"时统计）
          actual: {
            completedAmount: 0,    // 实际完成订单额
            completionRate: 0,     // 实际完成率（%）
            totalQuantity: 0,      // 累计订单数量
            totalCost: 0,          // 总成本(元)
            avgUnitPrice: 0,       // 平均单价
            avgCost: 0,            // 平均成本(元)
            avgGrossMargin: 0,     // 平均毛利率(%)
            q1Amount: 0,           // Q1订单额（1-3月）
            q2Amount: 0,           // Q2订单额（4-6月）
            q3Amount: 0,           // Q3订单额（7-9月）
            q4Amount: 0            // Q4订单额（10-12月）
          },
          
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 创建记录并获取返回的ID
        const addResult = await db.collection('product_order_forecast').add(record);
        
        // 云开发的add()返回格式: { id: string } 或 { _id: string }
        const recordId = addResult.id || addResult._id;
        console.log(`  ✓ 创建 [${category.value}] 的订单目标记录，ID: ${recordId}`);
        
        // 将带有_id的记录添加到数组
        newForecasts.push({
          ...record,
          _id: recordId
        } as ProductOrderForecast);
      }
      
      console.log(`✅ 初始化完成！为 ${year} 年创建了 ${newForecasts.length} 条记录`);
      setProductForecasts(newForecasts);
      
    } catch (error) {
      console.error('❌ 初始化产品目标失败:', error);
    }
  };

  // 保存产品目标
  const saveProductForecasts = async () => {
    try {
      setIsSavingForecast(true);
      
      const updatePromises = productForecasts.map(async (product) => {
        if (product._id) {
          await db.collection('product_order_forecast').doc(product._id).update({
            ...product,
            updatedAt: new Date()
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      // 静默保存，不弹窗提示
      // console.log('✅ 产品目标保存成功!'); // 已禁用保存成功提示
      setIsEditingForecast(false);
      await loadProductForecasts(); // 重新加载数据
    } catch (error) {
      console.error('❌ 保存产品目标失败:', error);
      alert('❌ 保存失败: ' + (error as Error).message);
    } finally {
      setIsSavingForecast(false);
    }
  };

  // 取消编辑产品目标
  const cancelEditForecast = () => {
    setIsEditingForecast(false);
    loadProductForecasts(); // 重新加载数据，恢复原始值
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


  // 加载保障措施
  const loadSafeguardMeasures = async () => {
    try {
      setLoading(true);
      const res = await db.collection('safeguardMeasures')
        .where({ 
          year: selectedYear,
          isDeleted: _.neq(true)  // 🔧 关键修复：过滤已删除的保障措施
        })
        .orderBy('createdAt', 'desc')
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setSafeguardMeasures([]);
        return;
      }
      
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载保障措施数据:', data.length, '条（已过滤删除项）');
      setSafeguardMeasures(data);
    } catch (error) {
      console.error('❌ 加载保障措施失败:', error);
      setSafeguardMeasures([]);
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



  // ========== 保障措施内联编辑处理函数 ==========
  
  // 添加保障措施
  const handleAddSafeguard = (strategyId: string) => {
    setExpandedStrategyId(strategyId);
    setIsAddingSafeguard(true);
    setEditingSafeguardId(null);
  };

  // 编辑保障措施
  const handleEditSafeguard = (safeguardId: string, strategyId: string) => {
    setExpandedStrategyId(strategyId);
    setEditingSafeguardId(safeguardId);
    setIsAddingSafeguard(false);
  };

  // 取消保障措施编辑
  const handleCancelSafeguardEdit = () => {
    setEditingSafeguardId(null);
    setIsAddingSafeguard(false);
  };

  // 保存保障措施
  const handleSaveSafeguard = async (data: any) => {
    try {
      const isEditing = editingSafeguardId !== null;
      const action = isEditing ? 'update' : 'create';
      const submitData = isEditing ? { ...data, _id: editingSafeguardId } : data;
      
      const res = await callFunction({
        name: 'safeguard-measures',
        data: { action, data: submitData }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '保存失败');
      }

      showSuccess(isEditing ? '更新成功' : '添加成功');
      handleCancelSafeguardEdit();
      loadSafeguardMeasures();
    } catch (error: any) {
      console.error('保存保障措施失败:', error);
      showError(error.message || '保存失败');
    }
  };

  // 删除保障措施
  const handleDeleteSafeguard = async (safeguardId: string) => {
    const confirmed = await showConfirm('确定要删除此保障措施吗？删除后关联的季度措施也会被删除。');
    if (!confirmed) return;

    try {
      const res = await callFunction({
        name: 'safeguard-measures',
        data: {
          action: 'delete',
          data: { _id: safeguardId }
        }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '删除失败');
      }

      showSuccess('删除成功');
      loadSafeguardMeasures();
      loadQuarterlyMeasures();
    } catch (error: any) {
      console.error('删除保障措施失败:', error);
      showError(error.message || '删除失败');
    }
  };


  // 加载目标分解数据
  const loadGoalDecomposition = async () => {
    try {
      setLoading(true);
      console.log('📊 加载目标分解数据...');
      
      // 这里可以加载目标分解相关的数据
      // TODO: 实现具体的数据加载逻辑
      
      console.log('✅ 目标分解数据加载完成');
    } catch (error) {
      console.error('❌ 加载目标分解数据失败:', error);
    } finally {
      setLoading(false);
    }
  };



  // 加载执行力地图数据
  const loadExecutionMapData = async () => {
    try {
      setLoading(true);
      
      // 1. 加载保障措施（过滤已删除）
      const safeguardMeasuresRes = await db.collection('safeguardMeasures')
        .where({ 
          year: selectedYear,
          isDeleted: _.neq(true)  // 🔧 关键修复：过滤已删除的保障措施
        })
        .get();
      const safeguardMeasures = safeguardMeasuresRes.data || [];
      
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
        children: safeguardMeasures.map(safeguard => {
          // 获取该保障措施的季度措施
          const safeguardQuarterlyMeasures = measures.filter(m => m.safeguardId === safeguard._id);
          
          return {
            name: safeguard.content,
            type: 'safeguard',
            id: safeguard._id,
            status: safeguard.status,
            owner: getOwnerName(safeguard.owner, false),
            children: safeguardQuarterlyMeasures.map(measure => {
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
      loadOpportunityGoals(); // 同时加载商机目标
    } else if (selectedTab === 'product') {
      loadProductForecasts();
    } else if (selectedTab === 'strategy') {
      loadAnnualStrategies();
      loadSafeguardMeasures();
      loadQuarterlyMeasures();
    } else if (selectedTab === 'decomposition') {
      // 目标分解数据加载
      loadGoalDecomposition();
    } else if (selectedTab === 'execution') {
      loadExecutionMapData();
    }
  }, [selectedTab, selectedYear]);

  // 🔧 自动打开指定的策略/措施详情
  useEffect(() => {
    console.log('🔧 [GoalManagement] 检查自动打开:', { 
      openGoalId, 
      strategiesCount: annualStrategies.length,
      measuresCount: quarterlyMeasures.length,
      executionTreeCount: executionTreeData?.children?.length || 0
    });
    
    if (openGoalId) {
      // 先检查是否是策略
      const strategyToOpen = annualStrategies.find(s => s._id === openGoalId);
      if (strategyToOpen) {
        console.log('🔧 [GoalManagement] 找到策略:', strategyToOpen);
        setSelectedTab('strategy');  // 切换到策略Tab
        setSelectedStrategy(strategyToOpen);
        setShowStrategyDetailModal(true);
        onGoalOpened?.();
        console.log('✅ [GoalManagement] 已打开策略详情');
        return;
      }

      // 检查是否是措施
      const measureToOpen = quarterlyMeasures.find(m => m._id === openGoalId);
      if (measureToOpen) {
        console.log('🔧 [GoalManagement] 找到措施:', measureToOpen);
        setSelectedTab('strategy');  // 切换到策略Tab
        setSelectedMeasure(measureToOpen);
        setShowMeasureDetailModal(true);
        onGoalOpened?.();
        console.log('✅ [GoalManagement] 已打开措施详情');
        return;
      }

      // 检查是否是执行力地图中的项目
      if (executionTreeData?.children?.length > 0) {
        for (const strategy of executionTreeData.children) {
          for (const measure of strategy.measures || []) {
            const goalToOpen = measure.goals?.find((g: any) => g._id === openGoalId);
            if (goalToOpen) {
              console.log('🔧 [GoalManagement] 找到执行力地图项目:', goalToOpen);
              setSelectedTab('execution');  // 切换到执行力地图Tab
              // 使用措施详情弹窗显示项目信息
              setSelectedMeasure(measure);
              setShowMeasureDetailModal(true);
              onGoalOpened?.();
              console.log('✅ [GoalManagement] 已打开执行力地图详情');
              return;
            }
          }
        }
      }
      
      console.warn('⚠️ [GoalManagement] 未找到目标:', openGoalId);
    }
  }, [openGoalId, annualStrategies, quarterlyMeasures, executionTreeData]);

  // 🔄 整合后的年度目标保存函数
  const handleSaveAnnualGoal = async () => {
    try {
      setLoading(true);
      console.log('💾 保存年度目标 - 开始:', annualGoalForm);

      // 1️⃣ 保存/更新销售目标（使用下划线命名）
      const salesResult = await db.collection('sales_goals')
        .where({
          year: annualGoalForm.year,
          type: 'annual'
        })
        .get();

      if (salesResult.data && salesResult.data.length > 0) {
        // 更新现有销售目标
        const salesGoal = salesResult.data[0];
        await db.collection('sales_goals').doc(salesGoal._id).update({
          orderTarget: annualGoalForm.orderTarget,
          revenueTarget: annualGoalForm.revenueTarget,
          updatedAt: new Date(),
        });
        console.log('✅ 销售目标更新成功');
      } else {
        // 创建新的销售目标
        await db.collection('sales_goals').add({
          year: annualGoalForm.year,
          orderTarget: annualGoalForm.orderTarget,
          orderActual: 0,
          revenueTarget: annualGoalForm.revenueTarget,
          revenueActual: 0,
          type: 'annual',
          quarter: null,
          createdBy: currentUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('✅ 销售目标创建成功');
      }

      // 2️⃣ 保存/更新商机目标（使用下划线命名）
      const opportunityResult = await db.collection('opportunity_goals')
        .where({
          year: annualGoalForm.year,
          type: 'annual'
        })
        .get();

      if (opportunityResult.data && opportunityResult.data.length > 0) {
        // 更新现有商机目标
        const opportunityGoal = opportunityResult.data[0];
        await db.collection('opportunity_goals').doc(opportunityGoal._id).update({
          countTarget: annualGoalForm.countTarget,
          amountTarget: annualGoalForm.amountTarget,
          updatedAt: new Date(),
        });
        console.log('✅ 商机目标更新成功');
      } else {
        // 创建新的商机目标
        await db.collection('opportunity_goals').add({
          year: annualGoalForm.year,
          countTarget: annualGoalForm.countTarget,
          countActual: 0,
          amountTarget: annualGoalForm.amountTarget,
          amountActual: 0,
          type: 'annual',
          quarter: null,
          createdBy: currentUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('✅ 商机目标创建成功');
      }

      // 3️⃣ 重新加载数据
      console.log('🔄 重新加载年度目标数据...');
      await Promise.all([
        loadSalesGoals(),
        loadOpportunityGoals()
      ]);
      console.log('✅ 年度目标数据加载完成');

      // 4️⃣ 关闭模态框
      setTimeout(() => {
        setShowAnnualGoalModal(false);
        setAnnualGoalForm({
          year: selectedYear,
          orderTarget: 0,
          revenueTarget: 0,
          countTarget: 0,
          amountTarget: 0
        });
        showSuccess('年度目标保存成功');
      }, 100);

    } catch (error) {
      console.error('❌ 保存年度目标失败:', error);
      showError('保存失败，请重试');
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
        await loadSafeguardMeasures();
      } else {
        // 季度措施
        if (editingItem) {
          const updateRes = await db.collection('quarterly_measures').doc(editingItem._id).update({
            content: strategyForm.content,
            owner: strategyForm.owner,
            ownerId: strategyForm.ownerId,
            safeguardId: strategyForm.safeguardId, // 改为保障措施ID
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
            safeguardId: strategyForm.safeguardId, // 改为保障措施ID
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
        setStrategyForm({ year: selectedYear, content: '', owner: '', ownerId: '', weight: 0, quarter: 'Q1', safeguardId: '', progress: 0 });
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
      
      // 如果是措施状态更新，检查是否需要自动更新保障措施状态
      if (type === 'measure') {
        const measure = quarterlyMeasures.find(m => m._id === id);
        if (measure && measure.safeguardId) {
          await checkAndUpdateSafeguardStatus(measure.safeguardId);
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



  // 检查并自动更新保障措施状态
  const checkAndUpdateSafeguardStatus = async (safeguardId: string) => {
    try {
      // 获取该保障措施的所有季度措施
      const measuresRes = await db.collection('quarterly_measures')
        .where({ safeguardId })
        .get();
      
      const measures = measuresRes.data as QuarterlyMeasure[];
      
      // 如果没有措施，不自动更新
      if (measures.length === 0) {
        return;
      }
      
      // 检查是否所有措施都已完成
      const allCompleted = measures.every(m => m.status === '已完成');
      
      if (allCompleted) {
        // 自动将保障措施状态更新为已完成
        await db.collection('safeguardMeasures').doc(safeguardId).update({
          status: '已完成',
          updatedAt: new Date(),
        });
        
        // 重新加载保障措施列表
        loadSafeguardMeasures();
      }
    } catch (error) {
      console.error('自动更新保障措施状态失败:', error);
    }
  };

  // 查看年度策略详情（包含保障措施）
  const handleViewStrategyDetail = async (strategy: AnnualStrategy) => {
    setSelectedStrategy(strategy);
    setShowStrategyDetailModal(true);
  };

  // 查看保障措施详情（关联季度措施）
  const handleViewSafeguardDetail = async (safeguard: any) => {
    // 注意：这个函数可能需要重新考虑，因为 StrategyDetailModal 期望的是 AnnualStrategy
    // 暂时禁用这个功能，避免类型错误
    console.warn('handleViewSafeguardDetail 功能需要重新设计');
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

  // 🔄 整合后的年度目标编辑函数
  const handleEditAnnualGoal = async () => {
    try {
      // 获取当前年度的销售目标（使用下划线命名）
      const salesResult = await db.collection('sales_goals')
        .where({
          year: selectedYear,
          type: 'annual'
        })
        .get();

      // 获取当前年度的商机目标（使用下划线命名）
      const opportunityResult = await db.collection('opportunity_goals')
        .where({
          year: selectedYear,
          type: 'annual'
        })
        .get();

      const salesGoal = (salesResult.data && salesResult.data[0]) as SalesGoal | undefined;
      const opportunityGoal = (opportunityResult.data && opportunityResult.data[0]) as OpportunityGoal | undefined;

      // 加载数据到表单
      setAnnualGoalForm({
        year: selectedYear,
        orderTarget: salesGoal?.orderTarget || 0,
        revenueTarget: salesGoal?.revenueTarget || 0,
        countTarget: opportunityGoal?.countTarget || 0,
        amountTarget: opportunityGoal?.amountTarget || 0
      });

      setShowAnnualGoalModal(true);
    } catch (error) {
      console.error('加载年度目标失败:', error);
      showError('加载年度目标失败,请稍后重试');
    }
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
          safeguardId: '', // 改为保障措施ID
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
          safeguardId: item.safeguardId, // 改为保障措施ID
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
        safeguardId: '', // 改为保障措施ID
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
    const annualSalesGoal = getAnnualSalesGoal();
    const annualOpportunityGoal = getAnnualOpportunityGoal();
    const quarterlySalesGoals = getQuarterlySalesGoals();
    const quarterlyOpportunityGoals = getQuarterlyOpportunityGoals();

    return (
      <div className="space-y-6">
        {/* 年度销售目标（合并销售+商机） */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{selectedYear}年度销售目标</h3>
            <div className="flex items-center gap-2">
              {/* 🔄 整合后的年度目标编辑按钮 */}
              {(checkPermission('goal.salesGoal', 'edit') || checkPermission('goal.opportunityGoal', 'edit')) && (
                <button
                  onClick={handleEditAnnualGoal}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑年度目标
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {/* 订单承揽 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium">订单承揽</div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{annualSalesGoal.orderActual.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">/ {annualSalesGoal.orderTarget} 万元</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualSalesGoal.orderTarget > 0 ? (annualSalesGoal.orderActual / annualSalesGoal.orderTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-blue-600 mt-1 font-semibold">
                  {annualSalesGoal.orderTarget > 0 ? ((annualSalesGoal.orderActual / annualSalesGoal.orderTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* 销售收入 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium">销售收入</div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{annualSalesGoal.revenueActual.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">/ {annualSalesGoal.revenueTarget} 万元</div>
                <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualSalesGoal.revenueTarget > 0 ? (annualSalesGoal.revenueActual / annualSalesGoal.revenueTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-purple-600 mt-1 font-semibold">
                  {annualSalesGoal.revenueTarget > 0 ? ((annualSalesGoal.revenueActual / annualSalesGoal.revenueTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* 商机挖掘数 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium">商机挖掘数</div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{annualOpportunityGoal.countActual}</div>
                <div className="text-xs text-gray-500 mt-1">/ {annualOpportunityGoal.countTarget} 个</div>
                <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualOpportunityGoal.countTarget > 0 ? (annualOpportunityGoal.countActual / annualOpportunityGoal.countTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-green-600 mt-1 font-semibold">
                  {annualOpportunityGoal.countTarget > 0 ? ((annualOpportunityGoal.countActual / annualOpportunityGoal.countTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* 商机预期金额 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium">商机预期金额</div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{annualOpportunityGoal.amountActual}</div>
                <div className="text-xs text-gray-500 mt-1">/ {annualOpportunityGoal.amountTarget} 万元</div>
                <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, annualOpportunityGoal.amountTarget > 0 ? (annualOpportunityGoal.amountActual / annualOpportunityGoal.amountTarget) * 100 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-orange-600 mt-1 font-semibold">
                  {annualOpportunityGoal.amountTarget > 0 ? ((annualOpportunityGoal.amountActual / annualOpportunityGoal.amountTarget) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 季度目标（合并销售+商机） */}
        <div className="grid grid-cols-4 gap-4">
          {quarterlySalesGoals.map((salesQ: any, index: number) => {
            const oppQ = quarterlyOpportunityGoals[index];
            return (
              <div key={salesQ.quarter} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold text-gray-900">{salesQ.quarter} 销售目标</div>
                  <div className="flex items-center gap-1">
                    {checkPermission('goal.salesGoal', 'edit') && (
                      <button 
                        onClick={() => handleEditSalesGoal(salesGoals?.find(g => g.quarter === salesQ.quarter) || null, 'quarterly', salesQ.quarter)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        title="编辑销售目标"
                      >
                        销售
                      </button>
                    )}
                    {checkPermission('goal.opportunityGoal', 'edit') && (
                      <button 
                        onClick={() => handleEditOpportunityGoal(opportunityGoals?.find(g => g.quarter === oppQ.quarter) || null, 'quarterly', oppQ.quarter)}
                        className="text-xs text-green-600 hover:text-green-700"
                        title="编辑商机目标"
                      >
                        / 商机
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* 订单承揽 */}
                  <div 
                    className="cursor-pointer hover:bg-blue-50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => loadOpportunitiesByPeriod(selectedYear, salesQ.quarter)}
                  >
                    <div className="text-xs text-gray-500 mb-1">订单承揽</div>
                    <div className="text-base font-semibold text-gray-900">
                      <span className="text-blue-600">{salesQ.orderActual.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm mx-1">/</span>
                      <span className="text-gray-600">{salesQ.orderTarget}</span>
                      <span className="text-xs text-gray-500 ml-1">万</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${salesQ.orderTarget > 0 ? (salesQ.orderActual / salesQ.orderTarget) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 销售收入 */}
                  <div 
                    className="cursor-pointer hover:bg-purple-50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => loadProjectsByPeriod(selectedYear, salesQ.quarter)}
                  >
                    <div className="text-xs text-gray-500 mb-1">销售收入</div>
                    <div className="text-base font-semibold text-gray-900">
                      <span className="text-purple-600">{salesQ.revenueActual.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm mx-1">/</span>
                      <span className="text-gray-600">{salesQ.revenueTarget}</span>
                      <span className="text-xs text-gray-500 ml-1">万</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${salesQ.revenueTarget > 0 ? (salesQ.revenueActual / salesQ.revenueTarget) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 商机挖掘数 */}
                  <div 
                    className="cursor-pointer hover:bg-green-50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => loadOpportunitiesByPeriod(selectedYear, oppQ.quarter)}
                  >
                    <div className="text-xs text-gray-500 mb-1">商机挖掘数</div>
                    <div className="text-base font-semibold text-gray-900">
                      <span className="text-green-600">{oppQ.countActual}</span>
                      <span className="text-gray-400 text-sm mx-1">/</span>
                      <span className="text-gray-600">{oppQ.countTarget}</span>
                      <span className="text-xs text-gray-500 ml-1">个</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-green-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${oppQ.countTarget > 0 ? (oppQ.countActual / oppQ.countTarget) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 商机预期金额 */}
                  <div 
                    className="cursor-pointer hover:bg-orange-50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => loadOpportunitiesByPeriod(selectedYear, oppQ.quarter)}
                  >
                    <div className="text-xs text-gray-500 mb-1">商机预期金额</div>
                    <div className="text-base font-semibold text-gray-900">
                      <span className="text-orange-600">{oppQ.amountActual}</span>
                      <span className="text-gray-400 text-sm mx-1">/</span>
                      <span className="text-gray-600">{oppQ.amountTarget}</span>
                      <span className="text-xs text-gray-500 ml-1">万</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-orange-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${oppQ.amountTarget > 0 ? (oppQ.amountActual / oppQ.amountTarget) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染产品目标表格
  const renderProductOrderForecast = () => {
    const formatNumber = (num: number) => Math.round(num).toLocaleString();
    const formatAmount = (num: number) => (num / 10000).toFixed(1);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 标题区 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📦 产品目标</h3>
            <p className="text-sm text-gray-600 mt-1">
              设定{selectedYear}年各产品类别的订单目标,自动跟踪实际完成情况
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditingForecast ? (
              checkPermission('goal.productOrder', 'edit') && (
                <button
                  onClick={() => setIsEditingForecast(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑目标
                </button>
              )
            ) : (
              <>
                <button
                  onClick={cancelEditForecast}
                  disabled={isSavingForecast}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={saveProductForecasts}
                  disabled={isSavingForecast}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingForecast ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 表格区 */}
        <div className="overflow-x-auto">
          {productForecasts.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-300">
                <tr>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700" rowSpan={2}>序号</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700" rowSpan={2}>产品类别</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 bg-blue-50" colSpan={5}>年度订单目标</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 bg-green-50" colSpan={9}>实际订单（系统自动填报）</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">数量</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">单价(元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">平均成本(元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">平均毛利率(%)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">预计订单额(万元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">实际完成额(万元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">完成率(%)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">累计数量</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">平均单价(元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">平均成本(元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">平均毛利率(%)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">Q1订单额(万元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">Q2订单额(万元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">Q3订单额(万元)</th>
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">Q4订单额(万元)</th>
                </tr>
              </thead>
              <tbody>
                {productForecasts.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-200 px-4 py-2 text-center text-gray-600">{index + 1}</td>
                    <td className="border border-gray-200 px-4 py-2 font-medium text-gray-900">{item.categoryName}</td>
                    
                    {/* 数量 - 可编辑 */}
                    <td className={`border border-gray-200 px-0 py-0 transition-all duration-200 ${
                      focusedForecastCell?.productId === item._id && focusedForecastCell?.field === 'quantity'
                        ? 'bg-amber-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]'
                        : hoveredForecastCell?.productId === item._id && hoveredForecastCell?.field === 'quantity'
                        ? 'bg-amber-100 shadow-[0_0_0_2px_rgba(217,119,6,0.3)]'
                        : isEditingForecast ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}
                    onMouseEnter={() => isEditingForecast && setHoveredForecastCell({productId: item._id!, field: 'quantity'})}
                    onMouseLeave={() => setHoveredForecastCell(null)}>
                      {isEditingForecast ? (
                        <input
                          type="number"
                          value={item.forecast.quantity}
                          onChange={(e) => {
                            const value = Math.max(0, parseFloat(e.target.value) || 0);
                            setProductForecasts(prev => prev.map(f => 
                              f._id === item._id ? {
                                ...f,
                                forecast: {
                                  ...f.forecast,
                                  quantity: value,
                                  totalAmount: value * f.forecast.unitPrice
                                }
                              } : f
                            ));
                          }}
                          onFocus={() => setFocusedForecastCell({productId: item._id!, field: 'quantity'})}
                          onBlur={() => setFocusedForecastCell(null)}
                          className="w-full h-full px-4 py-3 text-[15px] font-mono text-right focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div className="w-full h-full px-4 py-3 text-[15px] font-mono text-right">
                          {formatNumber(item.forecast.quantity)}
                        </div>
                      )}
                    </td>
                    
                    {/* 单价 - 可编辑 */}
                    <td className={`border border-gray-200 px-0 py-0 transition-all duration-200 ${
                      focusedForecastCell?.productId === item._id && focusedForecastCell?.field === 'unitPrice'
                        ? 'bg-amber-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]'
                        : hoveredForecastCell?.productId === item._id && hoveredForecastCell?.field === 'unitPrice'
                        ? 'bg-amber-100 shadow-[0_0_0_2px_rgba(217,119,6,0.3)]'
                        : isEditingForecast ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}
                    onMouseEnter={() => isEditingForecast && setHoveredForecastCell({productId: item._id!, field: 'unitPrice'})}
                    onMouseLeave={() => setHoveredForecastCell(null)}>
                      {isEditingForecast ? (
                        <input
                          type="number"
                          value={item.forecast.unitPrice}
                          onChange={(e) => {
                            const value = Math.max(0, parseFloat(e.target.value) || 0);
                            setProductForecasts(prev => prev.map(f => 
                              f._id === item._id ? {
                                ...f,
                                forecast: {
                                  ...f.forecast,
                                  unitPrice: value,
                                  totalAmount: f.forecast.quantity * value,
                                  avgGrossMargin: value > 0 ? ((value - (f.forecast.avgCost || 0)) / value * 100) : 0
                                }
                              } : f
                            ));
                          }}
                          onFocus={() => setFocusedForecastCell({productId: item._id!, field: 'unitPrice'})}
                          onBlur={() => setFocusedForecastCell(null)}
                          className="w-full h-full px-4 py-3 text-[15px] font-mono text-right focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div className="w-full h-full px-4 py-3 text-[15px] font-mono text-right">
                          {formatNumber(item.forecast.unitPrice)}
                        </div>
                      )}
                    </td>
                    
                    {/* 平均成本 - 可编辑 */}
                    <td className={`border border-gray-200 px-0 py-0 transition-all duration-200 ${
                      focusedForecastCell?.productId === item._id && focusedForecastCell?.field === 'avgCost'
                        ? 'bg-amber-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]'
                        : hoveredForecastCell?.productId === item._id && hoveredForecastCell?.field === 'avgCost'
                        ? 'bg-amber-100 shadow-[0_0_0_2px_rgba(217,119,6,0.3)]'
                        : isEditingForecast ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}
                    onMouseEnter={() => isEditingForecast && setHoveredForecastCell({productId: item._id!, field: 'avgCost'})}
                    onMouseLeave={() => setHoveredForecastCell(null)}>
                      {isEditingForecast ? (
                        <input
                          type="number"
                          value={item.forecast.avgCost}
                          onChange={(e) => {
                            const value = Math.max(0, parseFloat(e.target.value) || 0);
                            setProductForecasts(prev => prev.map(f => 
                              f._id === item._id ? {
                                ...f,
                                forecast: {
                                  ...f.forecast,
                                  avgCost: value,
                                  avgGrossMargin: (f.forecast.unitPrice || 0) > 0 
                                    ? (((f.forecast.unitPrice || 0) - value) / (f.forecast.unitPrice || 0) * 100) 
                                    : 0
                                }
                              } : f
                            ));
                          }}
                          onFocus={() => setFocusedForecastCell({productId: item._id!, field: 'avgCost'})}
                          onBlur={() => setFocusedForecastCell(null)}
                          className="w-full h-full px-4 py-3 text-[15px] font-mono text-right focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div className="w-full h-full px-4 py-3 text-[15px] font-mono text-right">
                          {formatNumber(item.forecast.avgCost)}
                        </div>
                      )}
                    </td>
                    
                    {/* 平均毛利率 - 自动计算 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] font-medium text-gray-700">
                      {item.forecast.unitPrice > 0 ? `${(item.forecast.avgGrossMargin || 0).toFixed(1)}%` : '--'}
                    </td>
                    
                    {/* 预计订单额 - 自动计算 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-blue-50 font-mono text-[15px] font-medium text-gray-700">
                      {formatAmount(item.forecast.totalAmount)}
                    </td>
                    
                    {/* 实际完成额 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatAmount(item.actual.completedAmount)}
                    </td>
                    
                    {/* 完成率 */}
                    <td className="border border-gray-200 px-3 py-2 text-center bg-gray-50">
                      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                        item.actual.completionRate >= 100 ? 'bg-green-100 text-green-700' :
                        item.actual.completionRate >= 80 ? 'bg-blue-100 text-blue-700' :
                        item.actual.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.forecast.totalAmount > 0 ? item.actual.completionRate.toFixed(1) : '-'}
                      </span>
                    </td>
                    
                    {/* 累计数量 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatNumber(item.actual.totalQuantity)}
                    </td>
                    
                    {/* 平均单价 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatNumber(item.actual.avgUnitPrice)}
                    </td>
                    
                    {/* 平均成本 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatNumber(item.actual.avgCost || 0)}
                    </td>
                    
                    {/* 平均毛利率 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50">
                      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                        (item.actual.avgGrossMargin || 0) >= 30 ? 'bg-green-100 text-green-700' :
                        (item.actual.avgGrossMargin || 0) >= 20 ? 'bg-blue-100 text-blue-700' :
                        (item.actual.avgGrossMargin || 0) >= 10 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.actual.avgUnitPrice > 0 ? `${(item.actual.avgGrossMargin || 0).toFixed(1)}%` : '--'}
                      </span>
                    </td>
                    
                    {/* Q1-Q4订单额 */}
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatAmount(item.actual.q1Amount)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatAmount(item.actual.q2Amount)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatAmount(item.actual.q3Amount)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right bg-gray-50 font-mono text-[15px] text-gray-600">
                      {formatAmount(item.actual.q4Amount)}
                    </td>
                  </tr>
                ))}
                
                {/* 合计行 */}
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-gray-200 px-4 py-2 text-center" colSpan={2}>合计</td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatNumber(productForecasts.reduce((sum, f) => sum + f.forecast.quantity, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.forecast.totalAmount, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.actual.completedAmount, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono text-base">
                    {(() => {
                      const totalForecast = productForecasts.reduce((sum, f) => sum + f.forecast.totalAmount, 0);
                      const totalActual = productForecasts.reduce((sum, f) => sum + f.actual.completedAmount, 0);
                      return totalForecast > 0 ? `${(totalActual / totalForecast * 100).toFixed(1)}%` : '-';
                    })()}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatNumber(productForecasts.reduce((sum, f) => sum + f.actual.totalQuantity, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.actual.q1Amount, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.actual.q2Amount, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.actual.q3Amount, 0))}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-mono text-base">
                    {formatAmount(productForecasts.reduce((sum, f) => sum + f.actual.q4Amount, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">正在初始化产品目标数据...</p>
              <p className="text-sm text-gray-400">
                首次访问将自动根据产品类别设置创建目标表
              </p>
            </div>
          )}
        </div>
        
        {/* 提示信息 */}
        {isEditingForecast && (
          <div className="px-6 pb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>提示:</strong> 
                <span className="ml-2">编辑模式已开启，修改目标数据后点击"保存"按钮</span>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                • 预计订单额 = 数量 × 单价（自动计算）
              </p>
              <p className="text-sm text-yellow-700">
                • 平均毛利率 = (单价 - 平均成本) ÷ 单价 × 100%（自动计算）
              </p>
              <p className="text-sm text-yellow-700">
                • 实际订单数据来源于商机"形成项目"时的需求统计
              </p>
              <p className="text-sm text-yellow-700">
                • 完成率 = 实际完成额 ÷ 预计订单额 × 100%
              </p>
            </div>
          </div>
        )}
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
            annualStrategies.map((strategy, strategyIndex) => {
              // 计算该策略关联的保障措施完成度
              const relatedSafeguards = safeguardMeasures.filter(s => s.strategyId === strategy._id);
              
              // 计算策略整体完成度 (基于保障措施的进度)
              let strategyCompletion = 0;
              if (relatedSafeguards.length > 0) {
                // 为每个保障措施计算其完成度 (基于关联的季度措施)
                const safeguardProgresses = relatedSafeguards.map(safeguard => {
                  const relatedQuarterly = quarterlyMeasures.filter(q => q.safeguardId === safeguard._id);
                  if (relatedQuarterly.length === 0) return 0;
                  
                  // 保障措施进度 = 关联季度措施的平均进度
                  const totalProgress = relatedQuarterly.reduce((sum, q) => sum + (q.progress || 0), 0);
                  return Math.round(totalProgress / relatedQuarterly.length);
                });
                
                // 策略完成度 = 所有保障措施的平均进度
                const totalSafeguardProgress = safeguardProgresses.reduce((sum, p) => sum + p, 0);
                strategyCompletion = Math.round(totalSafeguardProgress / relatedSafeguards.length);
              }
              
              const isCompleted = strategyCompletion === 100;
              
              const isExpanded = expandedStrategies[strategy._id!] || false;
              
              return (
              <div 
                key={strategy._id} 
                className="border border-gray-200 rounded-lg overflow-hidden transition-all"
              >
                {/* 策略头部 */}
                <div className="p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-blue-600">{toChineseNumber(strategyIndex + 1)}、</span>
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
                      {/* 完成度 */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600">完成度:</span>
                        <span className="text-sm font-bold text-red-600">{strategyCompletion}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 展开/收起按钮 */}
                      <button
                        onClick={() => setExpandedStrategies(prev => ({
                          ...prev,
                          [strategy._id!]: !prev[strategy._id!]
                        }))}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isExpanded ? '收起保障措施' : '展开保障措施'}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            展开 ({relatedSafeguards.length})
                          </>
                        )}
                      </button>
                      {checkPermission('goal.strategy', 'create') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSafeguard(strategy._id!);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="新增保障措施"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          保障措施
                        </button>
                      )}
                      {checkPermission('goal.strategy', 'edit') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStrategy(strategy, 'annual');
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {checkPermission('goal.strategy', 'delete') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ show: true, id: strategy._id!, type: 'strategy' });
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 保障措施展开区域 */}
                {isExpanded && relatedSafeguards.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <h5 className="text-sm font-semibold text-gray-900">
                        保障措施 ({relatedSafeguards.length}项)
                      </h5>
                    </div>
                    <div className="space-y-3">
                      {relatedSafeguards.map((safeguard, index) => {
                        // 查找关联的季度措施
                        const relatedQuarterlyMeasures = quarterlyMeasures.filter(
                          m => m.safeguardId === safeguard._id
                        );
                        
                        // 🔧 计算保障措施的实际进度 (基于关联季度措施的平均进度)
                        let safeguardProgress = 0;
                        if (relatedQuarterlyMeasures.length > 0) {
                          const totalProgress = relatedQuarterlyMeasures.reduce((sum, m) => sum + (m.progress || 0), 0);
                          safeguardProgress = Math.round(totalProgress / relatedQuarterlyMeasures.length);
                        }
                        
                        return (
                          <div 
                            key={safeguard._id}
                            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-2">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0">#{index + 1}</span>
                                    <span className="text-sm text-gray-700 flex-1">
                                      {safeguard.content || safeguard.description || '暂无内容描述'}
                                    </span>
                                    {safeguard.status !== '未开始' && safeguard.status !== '进行中' && (
                                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                                        safeguard.status === '已完成' ? 'bg-green-100 text-green-700' :
                                        safeguard.status === '暂停' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {safeguard.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 text-xs text-gray-600 pl-5">
                                  <div>
                                    <span className="text-gray-500">责任人：</span>
                                    <span className="font-medium">{safeguard.owner}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">完成度：</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full transition-all duration-500 ${
                                            safeguardProgress >= 80 ? 'bg-green-500' :
                                            safeguardProgress >= 50 ? 'bg-orange-500' :
                                            'bg-red-500'
                                          }`}
                                          style={{ width: `${safeguardProgress}%` }}
                                        />
                                      </div>
                                      <span className={`font-semibold flex-shrink-0 ${
                                        safeguardProgress >= 80 ? 'text-green-600' :
                                        safeguardProgress >= 50 ? 'text-orange-600' :
                                        'text-red-600'
                                      }`}>
                                        {safeguardProgress}%
                                      </span>
                                    </div>
                                  </div>
                                  {relatedQuarterlyMeasures.length > 0 && (
                                    <div>
                                      <span className="text-gray-500">关联季度措施：</span>
                                      <span className="font-medium">{relatedQuarterlyMeasures.length}项</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3">
                                {checkPermission('goal.safeguard', 'edit') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSafeguard(safeguard._id!, strategy._id!);
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="编辑"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                {checkPermission('goal.safeguard', 'delete') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSafeguard(safeguard._id!);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="删除"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 季度措施内联显示 - 添加动画效果 */}
                            {relatedQuarterlyMeasures.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100 pl-5 animate-slide-down">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-blue-600">📋 关联季度措施</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{relatedQuarterlyMeasures.length}</span>
                                </div>
                                <div className="space-y-2">
                                  {relatedQuarterlyMeasures.map((qMeasure) => (
                                    <div key={qMeasure._id} className="bg-gradient-to-r from-blue-50 to-blue-50/30 border border-blue-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-md text-xs font-medium flex-shrink-0 shadow-sm">
                                              {qMeasure.quarter}
                                            </span>
                                            <span className="text-sm text-gray-800 font-medium truncate">{qMeasure.content}</span>
                                          </div>
                                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                                            <span className="flex items-center gap-1">
                                              <span className="text-gray-500">👤</span>
                                              <span className="font-medium">{qMeasure.owner}</span>
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
                                                  <div
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                                      (qMeasure.progress || 0) >= 80 ? 'bg-green-500' :
                                                      (qMeasure.progress || 0) >= 50 ? 'bg-orange-500' :
                                                      'bg-red-500'
                                                    }`}
                                                    style={{ width: `${qMeasure.progress || 0}%` }}
                                                  />
                                                </div>
                                                <span className={`font-bold text-xs flex-shrink-0 ${
                                                  (qMeasure.progress || 0) >= 80 ? 'text-green-600' :
                                                  (qMeasure.progress || 0) >= 50 ? 'text-orange-600' :
                                                  'text-red-600'
                                                }`}>
                                                  {qMeasure.progress || 0}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 内联编辑表单 - 添加动画效果 */}
                    {expandedStrategyId === strategy._id && (isAddingSafeguard || editingSafeguardId) && (
                      <div className="mt-4 pt-4 border-t border-blue-200 bg-blue-50/30 rounded-lg p-4 animate-slide-down">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-blue-700">
                            ✏️ {editingSafeguardId ? '编辑保障措施' : '新增保障措施'}
                          </span>
                        </div>
                        <SafeguardInlineForm
                          strategyId={strategy._id!}
                          editing={editingSafeguardId ? relatedSafeguards.find(s => s._id === editingSafeguardId) : undefined}
                          year={currentYear}
                          users={users}
                          onSubmit={handleSaveSafeguard}
                          onCancel={handleCancelSafeguardEdit}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 无保障措施提示（且不在新增状态时才显示） */}
                {isExpanded && relatedSafeguards.length === 0 && !isAddingSafeguard && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500 text-center">暂无保障措施，点击上方"保障措施"按钮新增</p>
                  </div>
                )}
                
                {/* 新增状态的内联表单（在空列表时） - 添加动画效果 */}
                {isExpanded && relatedSafeguards.length === 0 && isAddingSafeguard && expandedStrategyId === strategy._id && (
                  <div className="border-t border-blue-200 bg-blue-50/30 p-4 rounded-b-lg animate-slide-down">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-blue-700">✏️ 新增保障措施</span>
                    </div>
                    <SafeguardInlineForm
                      strategyId={strategy._id!}
                      year={currentYear}
                      users={users}
                      onSubmit={handleSaveSafeguard}
                      onCancel={handleCancelSafeguardEdit}
                    />
                  </div>
                )}
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
                measures.map((measure, measureIndex) => {
                  const relatedSafeguard = safeguardMeasures?.find(s => s._id === measure.safeguardId);
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
                          <span className="text-blue-600">{measureIndex + 1}、</span>
                          {measure.content}
                          {isCompleted && (
                            <span className="text-yellow-500" title="已完成">
                              ⭐
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          {relatedSafeguard && (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-500">关联保障措施:</span>
                              <span className="text-xs font-semibold text-indigo-600">{relatedSafeguard.content}</span>
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
                            (measureProgress || 0) === 100 ? 'text-green-600' :
                            (measureProgress || 0) >= 60 ? 'text-blue-600' :
                            (measureProgress || 0) >= 30 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {measureProgress || 0}%
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
                            setDeleteConfirm({ show: true, id: measure._id!, type: 'measure' });
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

  // 渲染目标分解（基于"维度设置"中定义的表）
  const renderGoalDecomposition = () => {
    return (
      <GoalDecompositionMultiTable
        goalTypeId={selectedYear.toString()}
        goalTypeName={`${selectedYear}年度目标`}
        selectedYear={selectedYear}  // 🆕 传递年度参数
        onBack={() => {}}
        onConfigureClick={() => setSelectedTab('dimensionSettings')}
      />
    );
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

  // 渲染维度设置（使用原分解维度参数设置组件）
  const renderDimensionSettings = () => {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <DecompositionDimensionSettingsWithTabs />
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
        {checkPermission('goal.productOrder', 'view') && (
          <button
            onClick={() => setSelectedTab('product')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'product' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            产品目标
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
        {checkPermission('goal.strategy', 'view') && (
          <button
            onClick={() => setSelectedTab('outcome')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'outcome' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            成果目标
          </button>
        )}
        {checkPermission('goal.decomposition', 'view') && (
          <button
            onClick={() => setSelectedTab('decomposition')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'decomposition' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
            目标分解
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
        {checkPermission('goal.execution', 'view') && (
          <button
            onClick={() => setSelectedTab('dimensionSettings')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
              selectedTab === 'dimensionSettings' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            维度设置
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <>
          {selectedTab === 'sales' && renderSalesGoals()}
          {selectedTab === 'product' && renderProductOrderForecast()}
          {selectedTab === 'strategy' && renderStrategies()}
          {selectedTab === 'outcome' && (
            <OutcomeGoals
              selectedYear={selectedYear}
              currentUser={currentUser}
              users={users}
              checkPermission={checkPermission}
            />
          )}
          {selectedTab === 'decomposition' && renderGoalDecomposition()}
          {selectedTab === 'execution' && renderExecutionMap()}
          {selectedTab === 'dimensionSettings' && renderDimensionSettings()}
        </>
      )}

      {/* 🔄 整合后的年度目标模态框 */}
      {showAnnualGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">编辑年度目标</h2>
              <button onClick={() => setShowAnnualGoalModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* 年度选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">年度</label>
              <input
                type="text"
                value={annualGoalForm.year}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* 两栏布局 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 左侧：销售目标 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  销售目标
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    订单承揽目标（万元）
                  </label>
                  <input
                    type="number"
                    value={annualGoalForm.orderTarget === 0 ? '' : annualGoalForm.orderTarget}
                    onChange={(e) => setAnnualGoalForm({ 
                      ...annualGoalForm, 
                      orderTarget: e.target.value === '' ? 0 : Number(e.target.value) 
                    })}
                    onFocus={(e) => { if (annualGoalForm.orderTarget === 0) e.target.value = ''; }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    placeholder="请输入订单承揽目标"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    销售收入目标（万元）
                  </label>
                  <input
                    type="number"
                    value={annualGoalForm.revenueTarget === 0 ? '' : annualGoalForm.revenueTarget}
                    onChange={(e) => setAnnualGoalForm({ 
                      ...annualGoalForm, 
                      revenueTarget: e.target.value === '' ? 0 : Number(e.target.value) 
                    })}
                    onFocus={(e) => { if (annualGoalForm.revenueTarget === 0) e.target.value = ''; }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    placeholder="请输入销售收入目标"
                  />
                </div>
              </div>

              {/* 右侧：商机目标 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  商机目标
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商机挖掘数量目标（个）
                  </label>
                  <input
                    type="number"
                    value={annualGoalForm.countTarget === 0 ? '' : annualGoalForm.countTarget}
                    onChange={(e) => setAnnualGoalForm({ 
                      ...annualGoalForm, 
                      countTarget: e.target.value === '' ? 0 : Number(e.target.value) 
                    })}
                    onFocus={(e) => { if (annualGoalForm.countTarget === 0) e.target.value = ''; }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    placeholder="请输入商机数量目标"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商机预期金额目标（万元）
                  </label>
                  <input
                    type="number"
                    value={annualGoalForm.amountTarget === 0 ? '' : annualGoalForm.amountTarget}
                    onChange={(e) => setAnnualGoalForm({ 
                      ...annualGoalForm, 
                      amountTarget: e.target.value === '' ? 0 : Number(e.target.value) 
                    })}
                    onFocus={(e) => { if (annualGoalForm.amountTarget === 0) e.target.value = ''; }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    placeholder="请输入商机金额目标"
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={() => setShowAnnualGoalModal(false)}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAnnualGoal}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联保障措施</label>
                  <select 
                    value={strategyForm.safeguardId}
                    onChange={(e) => setStrategyForm({ ...strategyForm, safeguardId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择保障措施</option>
                    {safeguardMeasures.map(measure => (
                      <option key={measure._id} value={measure._id}>
                        {measure.content} ({measure.owner})
                      </option>
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
                              opp.level === 'A级' ? 'bg-red-100 text-red-700' :
                              opp.level === 'B级' ? 'bg-yellow-100 text-yellow-700' :
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

      {/* 保障措施模态框 */}
      {/* 保障措施管理已统一到 StrategyDetailModal 中 */}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={deleteConfirm.show}
        title="确认删除"
        message="确定要删除吗？"
        onConfirm={async () => {
          if (deleteConfirm.id && deleteConfirm.type) {
            await handleDeleteStrategy(deleteConfirm.id, deleteConfirm.type);
          }
          setDeleteConfirm({ show: false, id: null, type: null });
        }}
        onCancel={() => setDeleteConfirm({ show: false, id: null, type: null })}
      />
    </div>
  );
}
