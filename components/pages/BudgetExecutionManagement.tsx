import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/cloudbase';

// ✅ 隐藏 number input 的上下箭头
const inputNumberStyle = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

// 损益科目配置接口
interface BudgetAccount {
  _id: string;
  name: string;
  type: 'income' | 'summary' | 'expense' | 'percentage';
  order: number;
  totalUnit?: string;  // 一级科目单位
  formula?: Array<{    // 计算公式
    type: 'account' | 'operator' | 'number';
    value: string;
  }>;
  children?: Array<{
    _id: string;
    name: string;
    order: number;
    amountUnit?: string;  // 二级科目单位
  }>;
}

// 月度数据接口 - 使用对象格式
interface MonthlyActuals {
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
}

// 展示行接口（用于渲染）
interface DisplayRow {
  id: string;
  level: 'category' | 'item';  // 层级：一级科目 | 二级科目
  categoryId?: string;         // 所属一级科目ID
  categoryName?: string;       // 一级科目名称
  categoryType?: 'income' | 'summary' | 'expense' | 'percentage';  // 一级科目类型
  itemName?: string;           // 二级科目名称
  annualBudget?: number;       // 年度预算
  actualTotal?: number;        // 实际合计（用于科目小计）
  monthlyData?: MonthlyActuals; // 月度数据
  isExpanded?: boolean;        // 折叠状态
  order: number;               // 排序
}

// 预算执行项目接口（数据库存储）
interface BudgetExecutionItem {
  id: string;
  categoryId: string;        // 一级科目ID
  categoryName: string;      // 一级科目名称
  categoryType?: 'income' | 'summary' | 'expense' | 'percentage';  // 一级科目类型
  itemName: string;          // 二级科目名称
  unit?: string;             // 单位（万元/元/%）
  annualBudget: number;      // 年度预算
  actualTotal: number;       // 实际完成总计
  percentage: number;        // 完成率
  monthlyActuals: MonthlyActuals; // 月度实际
  order: number;             // 排序
}

interface BudgetExecutionManagementProps {
  selectedYear?: number;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveMethodReady?: (saveMethod: () => Promise<void>) => void;
}

export function BudgetExecutionManagement({
  selectedYear: propSelectedYear,
  isEditMode = false,
  onEditModeChange,
  onSavingChange,
  onSaveMethodReady
}: BudgetExecutionManagementProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(propSelectedYear || currentYear);
  
  // 监听外部年份变化
  useEffect(() => {
    if (propSelectedYear !== undefined && propSelectedYear !== selectedYear) {
      console.log('🔄 预算执行年份切换:', selectedYear, '→', propSelectedYear);
      setSelectedYear(propSelectedYear);
    }
  }, [propSelectedYear]);
  
  // 数据状态
  const [budgetAccounts, setBudgetAccounts] = useState<BudgetAccount[]>([]); // 损益科目配置
  const [budgetItems, setBudgetItems] = useState<BudgetExecutionItem[]>([]); // 预算执行数据
  const [originalBudgetItems, setOriginalBudgetItems] = useState<BudgetExecutionItem[]>([]); // 备份原始数据
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set()); // 折叠状态
  
  // ✅ 使用 ref 标记是否已加载数据，避免重复加载
  const hasLoadedDataRef = useRef<{ [year: number]: boolean }>({});

  // 🎨 单元格交互状态 - 使用更好的实现方式
  const [hoveredCell, setHoveredCell] = useState<{itemId: string, field: string} | null>(null);
  const [focusedCell, setFocusedCell] = useState<{itemId: string, field: string} | null>(null);

  // 获取当前月份
  const currentMonth = new Date().getMonth() + 1;

  // ✅ 获取当前用户ID
  const getCurrentUserId = (): string => {
    try {
      const currentUserStr = localStorage.getItem('current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser.userId || '';
      }
    } catch (error) {
      console.error('❌ 获取用户ID失败:', error);
    }
    return '';
  };

  // ✅ 加载损益科目配置（只加载 profit-loss 类型，按年份过滤）
  const loadBudgetAccounts = async (year: number) => {
    try {
      console.log('📋 正在加载损益科目配置...年份:', year);
      
      // ✅ 🐛 修复：切换年份时清除该年份的加载标记，确保科目配置变化后会重新加载数据
      hasLoadedDataRef.current[year] = false;
      
      const queryResult = await db.collection('budget_accounts')
        .where({ 
          type: db.command.in(['income', 'summary', 'expense', 'percentage']),
          year: year  // ✅ 按年份过滤
        })
        .orderBy('order', 'asc')
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        console.log(`✅ 找到${queryResult.data.length}个${year}年度损益科目:`, queryResult.data);
        setBudgetAccounts(queryResult.data as BudgetAccount[]);
        
        // 默认全部展开
        const allCategoryIds = new Set((queryResult.data as BudgetAccount[]).map(acc => acc._id));
        setExpandedCategories(allCategoryIds);
      } else {
        console.log(`⚠️ ${year}年度未设置薪酬核算参数，无预算数据项`);
        setBudgetAccounts([]);
        // ✅ 🐛 修复：如果该年度没有科目配置，清空预算数据项
        setBudgetItems([]);
        // ✅ 标记该年度已加载（避免重复触发）
        hasLoadedDataRef.current[year] = true;
      }
    } catch (error) {
      console.error('❌ 加载损益科目配置失败:', error);
      toast.error('加载损益科目配置失败');
      setBudgetAccounts([]);
      setBudgetItems([]);
    }
  };

  // ✅ 根据损益科目初始化预算执行项目
  const initializeBudgetItemsFromAccounts = (accounts: BudgetAccount[]): BudgetExecutionItem[] => {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    const items: BudgetExecutionItem[] = [];
    
    accounts.forEach((account) => {
      if (account.children && account.children.length > 0) {
        account.children.forEach((child) => {
          // 🐛 修复：使用 child.name 作为唯一标识，而不是可能不存在的 child._id
          const childId = child._id || child.name || `child_${child.order}`;
          items.push({
            id: `budget_execution_${account._id}_${childId}`,
            categoryId: account._id,
            categoryName: account.name,
            categoryType: account.type,  // ✅ 添加一级科目类型
            itemName: child.name,
            unit: child.amountUnit || '万元',  // ✅ 从科目配置获取单位
            annualBudget: 0,
            actualTotal: 0,
            percentage: 0,
            monthlyActuals: {
              m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
              m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
            },
            order: child.order
          });
        });
      }
    });
    
    return items;
  };

  // ✅ 合并科目配置和数据库数据（同时保留当前编辑的数据）
  const mergeBudgetItemsWithAccounts = (
    dbItems: BudgetExecutionItem[], 
    accounts: BudgetAccount[],
    currentItems?: BudgetExecutionItem[]  // ✅ 新增参数：当前表格中的数据
  ): BudgetExecutionItem[] => {
    // 创建三个 Map 来快速查找数据
    // 1. 数据库中的数据
    const dbItemMap = new Map<string, BudgetExecutionItem>();
    dbItems.forEach(item => {
      const key = `${item.categoryId}_${item.itemName}`;
      dbItemMap.set(key, item);
    });

    // 2. 当前表格中的数据（优先级最高）
    const currentItemMap = new Map<string, BudgetExecutionItem>();
    if (currentItems) {
      currentItems.forEach(item => {
        const key = `${item.categoryId}_${item.itemName}`;
        currentItemMap.set(key, item);
      });
    }

    const items: BudgetExecutionItem[] = [];
    
    accounts.forEach((account) => {
      if (account.children && account.children.length > 0) {
        account.children.forEach((child) => {
          const key = `${account._id}_${child.name}`;
          
          // ✅ 优先使用当前表格中的数据（避免刷新时清空已编辑的数据）
          const currentItem = currentItemMap.get(key);
          const existingItem = dbItemMap.get(key);
          
          if (currentItem) {
            // 如果当前表格中有数据，保留它（用户可能正在编辑）
            items.push({
              ...currentItem,
              categoryName: account.name,
              categoryType: account.type,  // ✅ 添加一级科目类型
              unit: child.amountUnit || currentItem.unit || '万元',
              order: child.order
            });
          } else if (existingItem) {
            // 如果数据库中存在该科目,保留数据,同时更新单位
            items.push({
              ...existingItem,
              categoryName: account.name,
              categoryType: account.type,  // ✅ 添加一级科目类型
              unit: child.amountUnit || existingItem.unit || '万元',
              order: child.order
            });
          } else {
            // 如果都不存在,创建新的空白项目
            const childId = child._id || child.name || `child_${child.order}`;
            items.push({
              id: `budget_execution_${account._id}_${childId}`,
              categoryId: account._id,
              categoryName: account.name,
              categoryType: account.type,  // ✅ 添加一级科目类型
              itemName: child.name,
              unit: child.amountUnit || '万元',
              annualBudget: 0,
              actualTotal: 0,
              percentage: 0,
              monthlyActuals: {
                m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
                m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
              },
              order: child.order
            });
          }
        });
      }
    });
    
    return items;
  };

  // ✅ 加载预算执行数据
  const loadBudgetData = async (year: number) => {
    try {
      console.log('📊 正在加载预算执行数据,年份:', year);
      
      const queryResult = await db.collection('budget_execution')
        .where({ year: year })
        .get();
      
      console.log('📊 查询结果:', queryResult);
      
      if (queryResult.data && queryResult.data.length > 0) {
        const data = queryResult.data[0];
        console.log(`✅ 找到${year}年度数据:`, data);
        
        if (data.items && Array.isArray(data.items)) {
          // ✅ 传入当前 budgetItems，避免刷新时清空已编辑的数据
          const mergedItems = mergeBudgetItemsWithAccounts(
            data.items, 
            budgetAccounts,
            budgetItems.length > 0 ? budgetItems : undefined  // 只在有当前数据时传入
          );
          console.log('🔄 合并后的预算执行项目:', mergedItems);
          setBudgetItems(mergedItems);
        } else {
          console.log('⚠️ 数据结构不完整,使用损益科目初始化数据');
          setBudgetItems(initializeBudgetItemsFromAccounts(budgetAccounts));
        }
      } else {
        console.log(`ℹ️ ${year}年度暂无数据,使用损益科目初始化数据`);
        setBudgetItems(initializeBudgetItemsFromAccounts(budgetAccounts));
      }
    } catch (error) {
      console.error('❌ 加载预算执行数据失败:', error);
      toast.error('加载预算执行数据失败');
      setBudgetItems(initializeBudgetItemsFromAccounts(budgetAccounts));
    }
  };

  // ✅ 组件初始化 - 先加载科目配置，再加载数据
  useEffect(() => {
    loadBudgetAccounts(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (budgetAccounts.length > 0 && !hasLoadedDataRef.current[selectedYear]) {
      // ✅ 只在未加载过该年份数据时才加载
      console.log(`📂 首次加载 ${selectedYear} 年度数据`);
      loadBudgetData(selectedYear);
      hasLoadedDataRef.current[selectedYear] = true;
    } else if (budgetAccounts.length > 0) {
      console.log(`✅ ${selectedYear} 年度数据已加载过，跳过重复加载`);
    }
  }, [budgetAccounts, selectedYear]);

  // 计算汇总数据
  const summary = useMemo(() => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + item.annualBudget, 0);
    const totalActual = budgetItems.reduce((sum, item) => sum + item.actualTotal, 0);
    
    const monthlyTotals: MonthlyActuals = {
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    };
    
    budgetItems.forEach(item => {
      for (let i = 1; i <= 12; i++) {
        const key = `m${i}` as keyof MonthlyActuals;
        monthlyTotals[key] += item.monthlyActuals[key];
      }
    });
    
    const totalPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    
    return {
      totalPercentage,
      totalBudget,
      totalActual,
      monthlyTotals
    };
  }, [budgetItems]);

  // ✅ 根据公式计算科目值
  const calculateFormulaValue = useCallback((
    formula: Array<{type: string, value: string}>,
    dataType: 'budget' | 'actual' | { month: number }
  ): number => {
    if (!formula || formula.length === 0) return 0;

    // 创建科目名称到值的映射
    const accountValueMap = new Map<string, number>();
    
    budgetAccounts.forEach(acc => {
      const items = budgetItems.filter(item => item.categoryId === acc._id);
      
      if (dataType === 'budget') {
        accountValueMap.set(acc.name, items.reduce((sum, item) => sum + item.annualBudget, 0));
      } else if (dataType === 'actual') {
        accountValueMap.set(acc.name, items.reduce((sum, item) => sum + item.actualTotal, 0));
      } else {
        // 月度数据
        const monthKey = `m${dataType.month}` as keyof MonthlyActuals;
        accountValueMap.set(acc.name, items.reduce((sum, item) => sum + (item.monthlyActuals[monthKey] || 0), 0));
      }
    });

    // 构建表达式字符串
    let expression = '';
    formula.forEach(item => {
      if (item.type === 'account') {
        const value = accountValueMap.get(item.value) || 0;
        expression += value.toString();
      } else if (item.type === 'operator') {
        // 转换运算符
        const op = item.value
          .replace('×', '*')
          .replace('÷', '/');
        expression += op;
      } else if (item.type === 'number') {
        expression += item.value;
      }
    });

    // 计算表达式
    try {
      // 使用 Function 安全计算表达式
      const result = new Function('return ' + expression)();
      return isNaN(result) || !isFinite(result) ? 0 : result;
    } catch (error) {
      console.error('公式计算错误:', expression, error);
      return 0;
    }
  }, [budgetAccounts, budgetItems]);

  // ✅ 将数据转换为显示行（一级科目 + 二级科目 + 科目小计）
  const displayRows = useMemo(() => {
    const rows: DisplayRow[] = [];
    
    budgetAccounts.forEach((account) => {
      // 计算该科目下所有项目的汇总数据
      const categoryItems = budgetItems.filter(item => item.categoryId === account._id);
      let categoryTotal = {
        annualBudget: categoryItems.reduce((sum, item) => sum + item.annualBudget, 0),
        actualTotal: categoryItems.reduce((sum, item) => sum + item.actualTotal, 0),
        monthlyActuals: {
          m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
          m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
        } as MonthlyActuals
      };
      
      // 计算月度汇总
      categoryItems.forEach(item => {
        for (let i = 1; i <= 12; i++) {
          const key = `m${i}` as keyof MonthlyActuals;
          categoryTotal.monthlyActuals[key] += item.monthlyActuals[key];
        }
      });
      
      // ✅ 如果一级科目有公式，根据公式计算
      if (account.formula && account.formula.length > 0) {
        console.log(`🧮 使用公式计算科目: ${account.name}`, account.formula);
        
        // 计算年度预算
        categoryTotal.annualBudget = calculateFormulaValue(account.formula, 'budget');
        
        // 计算实际完成
        categoryTotal.actualTotal = calculateFormulaValue(account.formula, 'actual');
        
        // 计算月度数据
        for (let month = 1; month <= 12; month++) {
          const monthKey = `m${month}` as keyof MonthlyActuals;
          categoryTotal.monthlyActuals[monthKey] = calculateFormulaValue(account.formula, { month });
        }
      }
      // ✅ 向后兼容：保留旧的硬编码规则（如果没有公式）
      else if (account.name === '毛利润') {
        const revenueAccount = budgetAccounts.find(acc => acc.name === '经营收入');
        const costAccount = budgetAccounts.find(acc => acc.name === '营业成本');
        
        if (revenueAccount && costAccount) {
          const revenueItems = budgetItems.filter(item => item.categoryId === revenueAccount._id);
          const costItems = budgetItems.filter(item => item.categoryId === costAccount._id);
          
          // 计算营业收入和营业成本的汇总
          const revenueTotal = revenueItems.reduce((sum, item) => sum + item.annualBudget, 0);
          const revenueTotalActual = revenueItems.reduce((sum, item) => sum + item.actualTotal, 0);
          const costTotal = costItems.reduce((sum, item) => sum + item.annualBudget, 0);
          const costTotalActual = costItems.reduce((sum, item) => sum + item.actualTotal, 0);
          
          // 计算月度营业收入和营业成本
          const revenueMonthly: MonthlyActuals = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
          const costMonthly: MonthlyActuals = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
          
          revenueItems.forEach(item => {
            for (let i = 1; i <= 12; i++) {
              const key = `m${i}` as keyof MonthlyActuals;
              revenueMonthly[key] += item.monthlyActuals[key];
            }
          });
          
          costItems.forEach(item => {
            for (let i = 1; i <= 12; i++) {
              const key = `m${i}` as keyof MonthlyActuals;
              costMonthly[key] += item.monthlyActuals[key];
            }
          });
          
          // 计算毛利润：经营收入 - 营业成本
          categoryTotal = {
            annualBudget: revenueTotal - costTotal,
            actualTotal: revenueTotalActual - costTotalActual,
            monthlyActuals: {
              m1: revenueMonthly.m1 - costMonthly.m1,
              m2: revenueMonthly.m2 - costMonthly.m2,
              m3: revenueMonthly.m3 - costMonthly.m3,
              m4: revenueMonthly.m4 - costMonthly.m4,
              m5: revenueMonthly.m5 - costMonthly.m5,
              m6: revenueMonthly.m6 - costMonthly.m6,
              m7: revenueMonthly.m7 - costMonthly.m7,
              m8: revenueMonthly.m8 - costMonthly.m8,
              m9: revenueMonthly.m9 - costMonthly.m9,
              m10: revenueMonthly.m10 - costMonthly.m10,
              m11: revenueMonthly.m11 - costMonthly.m11,
              m12: revenueMonthly.m12 - costMonthly.m12
            }
          };
        }
      }
      // ✅ 向后兼容：利润率 = (营业收入 - 营业成本) / 营业成本 × 100%
      else if (account.name === '利润率' && account.type === 'percentage') {
        const revenueAccount = budgetAccounts.find(acc => acc.name === '营业收入');
        const costAccount = budgetAccounts.find(acc => acc.name === '营业成本');
        
        if (revenueAccount && costAccount) {
          const revenueItems = budgetItems.filter(item => item.categoryId === revenueAccount._id);
          const costItems = budgetItems.filter(item => item.categoryId === costAccount._id);
          
          // 计算年度利润率
          const revenueTotal = revenueItems.reduce((sum, item) => sum + item.annualBudget, 0);
          const costTotal = costItems.reduce((sum, item) => sum + item.annualBudget, 0);
          const profitMargin = costTotal !== 0 ? ((revenueTotal - costTotal) / costTotal) * 100 : 0;
          
          // 计算实际利润率
          const revenueTotalActual = revenueItems.reduce((sum, item) => sum + item.actualTotal, 0);
          const costTotalActual = costItems.reduce((sum, item) => sum + item.actualTotal, 0);
          const actualProfitMargin = costTotalActual !== 0 ? ((revenueTotalActual - costTotalActual) / costTotalActual) * 100 : 0;
          
          // 计算月度利润率
          const revenueMonthly: MonthlyActuals = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
          const costMonthly: MonthlyActuals = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
          
          revenueItems.forEach(item => {
            for (let i = 1; i <= 12; i++) {
              const key = `m${i}` as keyof MonthlyActuals;
              revenueMonthly[key] += item.monthlyActuals[key];
            }
          });
          
          costItems.forEach(item => {
            for (let i = 1; i <= 12; i++) {
              const key = `m${i}` as keyof MonthlyActuals;
              costMonthly[key] += item.monthlyActuals[key];
            }
          });
          
          const monthlyProfitMargin: MonthlyActuals = {
            m1: costMonthly.m1 !== 0 ? ((revenueMonthly.m1 - costMonthly.m1) / costMonthly.m1) * 100 : 0,
            m2: costMonthly.m2 !== 0 ? ((revenueMonthly.m2 - costMonthly.m2) / costMonthly.m2) * 100 : 0,
            m3: costMonthly.m3 !== 0 ? ((revenueMonthly.m3 - costMonthly.m3) / costMonthly.m3) * 100 : 0,
            m4: costMonthly.m4 !== 0 ? ((revenueMonthly.m4 - costMonthly.m4) / costMonthly.m4) * 100 : 0,
            m5: costMonthly.m5 !== 0 ? ((revenueMonthly.m5 - costMonthly.m5) / costMonthly.m5) * 100 : 0,
            m6: costMonthly.m6 !== 0 ? ((revenueMonthly.m6 - costMonthly.m6) / costMonthly.m6) * 100 : 0,
            m7: costMonthly.m7 !== 0 ? ((revenueMonthly.m7 - costMonthly.m7) / costMonthly.m7) * 100 : 0,
            m8: costMonthly.m8 !== 0 ? ((revenueMonthly.m8 - costMonthly.m8) / costMonthly.m8) * 100 : 0,
            m9: costMonthly.m9 !== 0 ? ((revenueMonthly.m9 - costMonthly.m9) / costMonthly.m9) * 100 : 0,
            m10: costMonthly.m10 !== 0 ? ((revenueMonthly.m10 - costMonthly.m10) / costMonthly.m10) * 100 : 0,
            m11: costMonthly.m11 !== 0 ? ((revenueMonthly.m11 - costMonthly.m11) / costMonthly.m11) * 100 : 0,
            m12: costMonthly.m12 !== 0 ? ((revenueMonthly.m12 - costMonthly.m12) / costMonthly.m12) * 100 : 0
          };
          
          // 设置利润率数据
          categoryTotal = {
            annualBudget: profitMargin,
            actualTotal: actualProfitMargin,
            monthlyActuals: monthlyProfitMargin
          };
        }
      }
      
      // 添加一级科目行（显示汇总数据）
      rows.push({
        id: `category_${account._id}`,
        level: 'category',
        categoryId: account._id,
        categoryName: account.name,
        categoryType: account.type,
        isExpanded: expandedCategories.has(account._id),
        annualBudget: categoryTotal.annualBudget,
        actualTotal: categoryTotal.actualTotal,
        monthlyData: categoryTotal.monthlyActuals,
        order: account.order
      });
      
      // 如果展开,添加二级科目行
      if (expandedCategories.has(account._id)) {
        categoryItems.forEach((item) => {
          rows.push({
            id: item.id,
            level: 'item',
            categoryId: item.categoryId,
            itemName: item.itemName,
            annualBudget: item.annualBudget,
            actualTotal: item.actualTotal,
            monthlyData: item.monthlyActuals,
            order: item.order
          });
        });
      }
    });
    
    return rows;
  }, [budgetAccounts, budgetItems, expandedCategories, calculateFormulaValue]);

  // 切换一级科目的折叠状态
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // ✅ 使用 useCallback 创建保存方法,直接在回调内部处理保存逻辑
  const saveMethod = useCallback(async () => {
    try {
      onSavingChange?.(true);
      
      const userId = getCurrentUserId();
      
      console.log('💾 开始保存预算执行数据,年份:', selectedYear);
      console.log('💾 原始 budgetItems:', budgetItems);
      
      // ✅ 准备保存的数据 - 确保所有数值字段都是数字类型
      const saveData = {
        year: selectedYear,
        totalBudget: Number(summary.totalBudget) || 0,
        totalActual: Number(summary.totalActual) || 0,
        items: budgetItems.map(item => ({
          id: item.id,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          itemName: item.itemName,
          unit: item.unit,
          annualBudget: Number(item.annualBudget) || 0,
          actualTotal: Number(item.actualTotal) || 0,
          percentage: Number(item.percentage) || 0,
          monthlyActuals: {
            m1: Number(item.monthlyActuals.m1) || 0,
            m2: Number(item.monthlyActuals.m2) || 0,
            m3: Number(item.monthlyActuals.m3) || 0,
            m4: Number(item.monthlyActuals.m4) || 0,
            m5: Number(item.monthlyActuals.m5) || 0,
            m6: Number(item.monthlyActuals.m6) || 0,
            m7: Number(item.monthlyActuals.m7) || 0,
            m8: Number(item.monthlyActuals.m8) || 0,
            m9: Number(item.monthlyActuals.m9) || 0,
            m10: Number(item.monthlyActuals.m10) || 0,
            m11: Number(item.monthlyActuals.m11) || 0,
            m12: Number(item.monthlyActuals.m12) || 0
          },
          order: item.order
        })),
        monthlyTotals: summary.monthlyTotals,
        updatedAt: new Date(),
        updatedBy: userId || 'system'
      };
      
      console.log('💾 准备保存的数据:', saveData);
      
      // 查询是否已存在
      const queryResult = await db.collection('budget_execution')
        .where({ year: selectedYear })
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        // 更新现有记录
        const docId = queryResult.data[0]._id;
        console.log(`💾 更新${selectedYear}年度数据, docId:`, docId);
        await db.collection('budget_execution')
          .doc(docId)
          .update(saveData);
        console.log('✅ 更新成功');
      } else {
        // 创建新记录
        console.log(`💾 创建${selectedYear}年度新数据`);
        await db.collection('budget_execution').add({
          ...saveData,
          createdAt: new Date(),
          createdBy: userId || 'system'
        });
        console.log('✅ 创建成功');
      }
      
      onEditModeChange?.(false);
      setOriginalBudgetItems([]);
    } catch (error) {
      console.error('❌ 保存失败,保持编辑模式:', error);
      toast.error('保存失败');
      throw error;
    } finally {
      onSavingChange?.(false);
    }
  }, [selectedYear, summary, budgetItems, onSavingChange, onEditModeChange]);

  // ✅ 暴露保存方法给父组件
  useEffect(() => {
    onSaveMethodReady?.(saveMethod);
  }, [saveMethod, onSaveMethodReady]);

  // ✅ 当进入编辑模式时备份数据
  useEffect(() => {
    if (isEditMode && originalBudgetItems.length === 0 && budgetItems.length > 0) {
      setOriginalBudgetItems(JSON.parse(JSON.stringify(budgetItems)));
    }
  }, [isEditMode]);

  // 处理年度预算变更
  const handleBudgetChange = (itemId: string, value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseFloat(value) || 0;
    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const percentage = numValue > 0 ? (item.actualTotal / numValue) * 100 : 0;
        return { ...item, annualBudget: numValue, percentage };
      }
      return item;
    }));
  };

  // 处理年度预算失焦格式化
  const handleBudgetBlur = (itemId: string, e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !isNaN(parseFloat(value))) {
      const formattedValue = parseFloat(value).toFixed(2);
      handleBudgetChange(itemId, formattedValue);
    }
    
    const target = e.relatedTarget as HTMLElement;
    if (!target || target.tagName !== 'INPUT') {
      setFocusedCell(null);
    } else {
      setTimeout(() => setFocusedCell(null), 0);
    }
  };

  // 处理月度实际变更
  const handleActualChange = (itemId: string, month: number, value: string) => {
    if (!isEditMode) return;
    if (month > currentMonth) return;
    
    const numValue = parseFloat(value) || 0;
    const monthKey = `m${month}` as keyof MonthlyActuals;
    
    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newMonthlyActuals = { ...item.monthlyActuals, [monthKey]: numValue };
        const actualTotal = Object.values(newMonthlyActuals).reduce((sum, val) => sum + val, 0);
        const percentage = item.annualBudget > 0 ? (actualTotal / item.annualBudget) * 100 : 0;
        return { ...item, monthlyActuals: newMonthlyActuals, actualTotal, percentage };
      }
      return item;
    }));
  };

  // 处理月度实际失焦格式化
  const handleActualBlur = (itemId: string, month: number, e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !isNaN(parseFloat(value))) {
      const formattedValue = parseFloat(value).toFixed(2);
      handleActualChange(itemId, month, formattedValue);
    }
    
    const target = e.relatedTarget as HTMLElement;
    if (!target || target.tagName !== 'INPUT') {
      setFocusedCell(null);
    } else {
      setTimeout(() => setFocusedCell(null), 0);
    }
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercent = (num: number): string => {
    return Number(num).toFixed(2) + '%';
  };

  // ✅ 根据单位格式化显示值
  const formatValueWithUnit = (value: number, unit?: string, categoryType?: string) => {
    if (!value && value !== 0) return '-';
    // 如果一级科目类型是"百分率"(percentage),始终显示百分号
    if (categoryType === 'percentage' || unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    return formatNumber(value);
  };

  return (
    <>
      {/* ✅ 隐藏 number input 的上下箭头 */}
      <style dangerouslySetInnerHTML={{ __html: inputNumberStyle }} />
      
      {/* ========== 主容器 - 使用固定最大高度 ========== */}
      <div className="flex flex-col">
        
        {/* ========== 可滚动表格容器 - 固定最大高度 ========== */}
        <div className="overflow-auto border border-gray-200 rounded-lg shadow-sm max-h-[600px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-slate-100 text-gray-700 border-b-2 border-gray-300">
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-center font-semibold border-r border-gray-300" style={{width: '200px', minWidth: '200px', maxWidth: '200px'}}>
                费用科目
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-teal-50 border-r border-gray-300" style={{width: '100px', minWidth: '100px', maxWidth: '100px'}}>
                实际完成
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-blue-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>
                Q1
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-blue-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>
                Q2
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-blue-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>
                Q3
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-blue-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>
                Q4
              </th>
              {Array.from({length: 12}, (_, i) => (
                <th 
                  key={i+1} 
                  className="px-2 py-3 text-center font-semibold bg-slate-50 border-r border-gray-300"
                  style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
                >
                  {i+1}月
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* ========== 损益科目列表（一级 + 二级） ========== */}
            {displayRows.map((row) => {
              if (row.level === 'category') {
                // ========== 一级科目行（显示汇总数据，不可编辑） ==========
                // 计算季度数据
                const q1Total = (row.monthlyData?.m1 || 0) + (row.monthlyData?.m2 || 0) + (row.monthlyData?.m3 || 0);
                const q2Total = (row.monthlyData?.m4 || 0) + (row.monthlyData?.m5 || 0) + (row.monthlyData?.m6 || 0);
                const q3Total = (row.monthlyData?.m7 || 0) + (row.monthlyData?.m8 || 0) + (row.monthlyData?.m9 || 0);
                const q4Total = (row.monthlyData?.m10 || 0) + (row.monthlyData?.m11 || 0) + (row.monthlyData?.m12 || 0);
                
                return (
                  <tr key={row.id} className="bg-gray-100 border-b border-gray-300">
                    {/* 科目名称（带折叠图标） */}
                    <td 
                      className="sticky left-0 z-10 px-4 py-3 text-base font-bold text-gray-900 bg-gray-100 border-r border-gray-300 cursor-pointer hover:bg-gray-200"
                      onClick={() => toggleCategory(row.categoryId!)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {row.isExpanded ? '▼' : '▶'}
                        </span>
                        <span>{row.categoryName}</span>
                      </div>
                    </td>
                    
                    {/* 实际完成小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-purple-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.actualTotal || 0, undefined, row.categoryType)}
                    </td>
                    
                    {/* Q1季度小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(q1Total, undefined, row.categoryType)}
                    </td>
                    
                    {/* Q2季度小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(q2Total, undefined, row.categoryType)}
                    </td>
                    
                    {/* Q3季度小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(q3Total, undefined, row.categoryType)}
                    </td>
                    
                    {/* Q4季度小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(q4Total, undefined, row.categoryType)}
                    </td>
                    
                    {/* 月度小计 */}
                    {Array.from({length: 12}, (_, i) => {
                      const monthKey = `m${i+1}` as keyof MonthlyActuals;
                      const monthTotal = row.monthlyData?.[monthKey] || 0;
                      return (
                        <td key={i+1} className="px-2 py-3 text-right font-mono text-base font-bold text-gray-700 bg-gray-100 border-r border-gray-200">
                          {formatValueWithUnit(monthTotal, undefined, row.categoryType)}
                        </td>
                      );
                    })}
                  </tr>
                );
              } else {
                // ========== 二级科目行（可编辑） ==========
                const item = budgetItems.find(bi => bi.id === row.id);
                if (!item) return null;
                
                // 计算季度数据
                const q1 = item.monthlyActuals.m1 + item.monthlyActuals.m2 + item.monthlyActuals.m3;
                const q2 = item.monthlyActuals.m4 + item.monthlyActuals.m5 + item.monthlyActuals.m6;
                const q3 = item.monthlyActuals.m7 + item.monthlyActuals.m8 + item.monthlyActuals.m9;
                const q4 = item.monthlyActuals.m10 + item.monthlyActuals.m11 + item.monthlyActuals.m12;
                
                return (
                  <tr key={row.id} className="transition-colors hover:bg-green-50 bg-white">
                    {/* 费用科目 */}
                    <td className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                      <div className="leading-relaxed text-center">
                        {item.itemName}
                      </div>
                    </td>
                    
                    {/* 实际完成 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-purple-700 bg-purple-50 border-r border-gray-200">
                      {formatValueWithUnit(item.actualTotal, item.unit, item.categoryType)}
                    </td>
                    
                    {/* Q1季度 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-blue-700 bg-blue-50 border-r border-gray-200">
                      {formatValueWithUnit(q1, item.unit, item.categoryType)}
                    </td>
                    
                    {/* Q2季度 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-blue-700 bg-blue-50 border-r border-gray-200">
                      {formatValueWithUnit(q2, item.unit, item.categoryType)}
                    </td>
                    
                    {/* Q3季度 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-blue-700 bg-blue-50 border-r border-gray-200">
                      {formatValueWithUnit(q3, item.unit, item.categoryType)}
                    </td>
                    
                    {/* Q4季度 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-blue-700 bg-blue-50 border-r border-gray-200">
                      {formatValueWithUnit(q4, item.unit, item.categoryType)}
                    </td>
                    
                    {/* 月度实际支出 */}
                    {Array.from({length: 12}, (_, i) => {
                      const month = i + 1;
                      const monthKey = `m${month}` as keyof MonthlyActuals;
                      const value = item.monthlyActuals[monthKey];
                      const canEdit = isEditMode && month <= currentMonth;
                      
                      return (
            <td
              key={month}
              className={`px-2 py-2 border-r border-gray-200 transition-all duration-200 ${
                // 聚焦状态：最高优先级
                focusedCell?.itemId === item.id && focusedCell?.field === `month${month}`
                  ? 'ring-2 ring-inset ring-blue-500 bg-blue-50'
                  // 悬停状态：次优先级
                  : isEditMode && hoveredCell?.itemId === item.id && hoveredCell?.field === `month${month}`
                  ? 'ring-2 ring-inset ring-blue-400 bg-blue-100 shadow-inner'
                  // 默认状态
                  : month <= currentMonth 
                  ? 'bg-green-50' 
                  : 'bg-gray-100'
              }`}
              style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
              onMouseEnter={() => {
                if (canEdit && !focusedCell) {
                  setHoveredCell({itemId: item.id, field: `month${month}`});
                }
              }}
              onMouseLeave={() => canEdit && !focusedCell && setHoveredCell(null)}
            >
                          {canEdit ? (
                            <input
                              type="number"
                              step="0.01"
                              value={value || ''}
                              onChange={(e) => handleActualChange(item.id, month, e.target.value)}
                              onFocus={() => setFocusedCell({itemId: item.id, field: `month${month}`})}
                              onBlur={(e) => handleActualBlur(item.id, month, e)}
                              className="w-full text-right bg-transparent focus:outline-none font-mono text-base text-green-700"
                              placeholder={item.unit === '%' ? '0.00%' : '0.00'}
                            />
                          ) : (
                            <div className={`text-right font-mono text-base ${month <= currentMonth ? 'text-green-700' : 'text-gray-400'}`}>
                              {formatValueWithUnit(value, item.unit, item.categoryType)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }
            })}

          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
