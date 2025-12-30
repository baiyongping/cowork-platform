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
  formula?: Array<{type: string, value: string}>;  // 计算公式（可选）
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

// 季度预算接口
interface QuarterlyBudgets {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
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
  quarterlyBudgets?: QuarterlyBudgets; // 季度预算
  isExpanded?: boolean;        // 折叠状态
  unit?: string;               // 单位（万元/元/%）
  order: number;               // 排序
}

// 预算项目接口（数据库存储）
interface BudgetItem {
  id: string;
  categoryId: string;        // 一级科目ID
  categoryName: string;      // 一级科目名称
  categoryType?: 'income' | 'summary' | 'expense' | 'percentage';  // 一级科目类型
  itemName: string;          // 二级科目名称
  unit?: string;             // 单位（万元/元/%）
  annualBudget: number;      // 年度预算（自动计算，= q1 + q2 + q3 + q4）
  quarterlyBudgets: QuarterlyBudgets; // 季度预算（可输入）
  actualTotal: number;       // 年度实际完成总计
  percentage: number;        // 完成率
  monthlyActuals: MonthlyActuals; // 月度实际
  order: number;             // 排序
}

interface AnnualBudgetManagementProps {
  selectedYear?: number;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveMethodReady?: (saveMethod: () => Promise<void>) => void;
}

export function AnnualBudgetManagement({
  selectedYear: propSelectedYear,
  isEditMode = false,
  onEditModeChange,
  onSavingChange,
  onSaveMethodReady
}: AnnualBudgetManagementProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(propSelectedYear || currentYear);
  
  // 监听外部年份变化
  useEffect(() => {
    if (propSelectedYear !== undefined && propSelectedYear !== selectedYear) {
      console.log('🔄 年度预算年份切换:', selectedYear, '→', propSelectedYear);
      setSelectedYear(propSelectedYear);
    }
  }, [propSelectedYear]);
  
  // 数据状态
  const [budgetAccounts, setBudgetAccounts] = useState<BudgetAccount[]>([]); // 损益科目配置
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]); // 预算数据
  const [originalBudgetItems, setOriginalBudgetItems] = useState<BudgetItem[]>([]); // 备份原始数据
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
      
      const queryResult = await db.collection('budget_accounts')
        .where({ 
          type: db.command.in(['income', 'summary', 'expense', 'percentage']),
          year: year  // ✅ 按年份过滤
        })
        .orderBy('order', 'asc')
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        console.log(`✅ 找到${queryResult.data.length}个损益科目:`, queryResult.data);
        setBudgetAccounts(queryResult.data as BudgetAccount[]);
        
        // 默认全部展开
        const allCategoryIds = new Set((queryResult.data as BudgetAccount[]).map(acc => acc._id));
        setExpandedCategories(allCategoryIds);
      } else {
        console.log('⚠️ 未找到损益科目配置');
        setBudgetAccounts([]);
      }
    } catch (error) {
      console.error('❌ 加载损益科目配置失败:', error);
      toast.error('加载损益科目配置失败');
      setBudgetAccounts([]);
    }
  };

  // ✅ 根据损益科目初始化预算项目
  const initializeBudgetItemsFromAccounts = (accounts: BudgetAccount[]): BudgetItem[] => {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    const items: BudgetItem[] = [];
    
    accounts.forEach((account) => {
      if (account.children && account.children.length > 0) {
        account.children.forEach((child) => {
          // 🐛 修复：使用 child.name 作为唯一标识，而不是可能不存在的 child._id
          const childId = child._id || child.name || `child_${child.order}`;
          items.push({
            id: `budget_${account._id}_${childId}`,
            categoryId: account._id,
            categoryName: account.name,
            categoryType: account.type,  // ✅ 添加一级科目类型
            itemName: child.name,
            unit: child.amountUnit || '万元',  // ✅ 从科目配置获取单位
            annualBudget: 0,  // 自动计算
            quarterlyBudgets: { q1: 0, q2: 0, q3: 0, q4: 0 },  // 可输入
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
    dbItems: BudgetItem[], 
    accounts: BudgetAccount[],
    currentItems?: BudgetItem[]  // ✅ 新增参数：当前表格中的数据
  ): BudgetItem[] => {
    // 创建三个 Map 来快速查找数据
    // 1. 数据库中的数据
    const dbItemMap = new Map<string, BudgetItem>();
    dbItems.forEach(item => {
      const key = `${item.categoryId}_${item.itemName}`;
      dbItemMap.set(key, item);
    });

    // 2. 当前表格中的数据（优先级最高）
    const currentItemMap = new Map<string, BudgetItem>();
    if (currentItems) {
      currentItems.forEach(item => {
        const key = `${item.categoryId}_${item.itemName}`;
        currentItemMap.set(key, item);
      });
    }

    const items: BudgetItem[] = [];
    
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
              order: child.order,
              // 确保有季度预算字段
              quarterlyBudgets: currentItem.quarterlyBudgets || { q1: 0, q2: 0, q3: 0, q4: 0 },
              // 年度预算自动计算
              annualBudget: (currentItem.quarterlyBudgets?.q1 || 0) + 
                           (currentItem.quarterlyBudgets?.q2 || 0) + 
                           (currentItem.quarterlyBudgets?.q3 || 0) + 
                           (currentItem.quarterlyBudgets?.q4 || 0)
            });
          } else if (existingItem) {
            // 如果数据库中存在该科目,保留数据,同时更新单位
            items.push({
              ...existingItem,
              categoryName: account.name,
              categoryType: account.type,  // ✅ 添加一级科目类型
              unit: child.amountUnit || existingItem.unit || '万元',
              order: child.order,
              // 确保有季度预算字段
              quarterlyBudgets: existingItem.quarterlyBudgets || { q1: 0, q2: 0, q3: 0, q4: 0 },
              // 年度预算自动计算
              annualBudget: (existingItem.quarterlyBudgets?.q1 || 0) + 
                           (existingItem.quarterlyBudgets?.q2 || 0) + 
                           (existingItem.quarterlyBudgets?.q3 || 0) + 
                           (existingItem.quarterlyBudgets?.q4 || 0)
            });
          } else {
            // 如果都不存在,创建新的空白项目
            const childId = child._id || child.name || `child_${child.order}`;
            items.push({
              id: `budget_${account._id}_${childId}`,
              categoryId: account._id,
              categoryName: account.name,
              categoryType: account.type,  // ✅ 添加一级科目类型
              itemName: child.name,
              unit: child.amountUnit || '万元',
              annualBudget: 0,
              quarterlyBudgets: { q1: 0, q2: 0, q3: 0, q4: 0 },
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

  // ✅ 加载预算数据
  const loadBudgetData = async (year: number) => {
    try {
      console.log('📊 正在加载年度预算数据,年份:', year);
      
      // 同时查询年度预算和预算执行数据
      const [annualResult, executionResult] = await Promise.all([
        db.collection('annual_budgets').where({ year: year }).get(),
        db.collection('budget_execution').where({ year: year }).get()
      ]);
      
      console.log('📊 年度预算查询结果:', annualResult);
      console.log('📊 预算执行查询结果:', executionResult);
      
      // 创建预算执行数据映射(按科目ID和项目名称)
      const executionMap = new Map<string, MonthlyActuals>();
      if (executionResult.data && executionResult.data.length > 0) {
        const executionData = executionResult.data[0];
        if (executionData.items && Array.isArray(executionData.items)) {
          executionData.items.forEach((item: any) => {
            const key = `${item.categoryId}_${item.itemName}`;
            executionMap.set(key, item.monthlyActuals);
          });
        }
      }
      console.log('📊 预算执行数据映射:', executionMap.size, '条记录');
      
      if (annualResult.data && annualResult.data.length > 0) {
        const data = annualResult.data[0];
        console.log(`✅ 找到${year}年度数据:`, data);
        
        if (data.items && Array.isArray(data.items)) {
          // ✅ 传入当前 budgetItems，避免刷新时清空已编辑的数据
          let mergedItems = mergeBudgetItemsWithAccounts(
            data.items, 
            budgetAccounts,
            budgetItems.length > 0 ? budgetItems : undefined
          );
          
          // ✅ 从预算执行表中读取月度实际数据
          mergedItems = mergedItems.map(item => {
            const key = `${item.categoryId}_${item.itemName}`;
            const executionData = executionMap.get(key);
            
            if (executionData) {
              console.log(`🔄 从预算执行表读取月度数据: ${item.itemName}`, executionData);
              // 使用预算执行表的月度数据
              const monthlyActuals = executionData;
              // 重新计算实际完成总计
              const actualTotal = Object.values(monthlyActuals).reduce((sum, val) => sum + (val || 0), 0);
              // 重新计算完成率
              const percentage = item.annualBudget > 0 ? (actualTotal / item.annualBudget) * 100 : 0;
              
              return {
                ...item,
                monthlyActuals,
                actualTotal,
                percentage
              };
            }
            return item;
          });
          
          console.log('🔄 合并预算执行数据后的预算项目:', mergedItems);
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
      console.error('❌ 加载预算数据失败:', error);
      toast.error('加载预算数据失败');
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
    
    const quarterlyTotals: QuarterlyBudgets = {
      q1: 0, q2: 0, q3: 0, q4: 0
    };
    
    budgetItems.forEach(item => {
      for (let i = 1; i <= 12; i++) {
        const key = `m${i}` as keyof MonthlyActuals;
        monthlyTotals[key] += item.monthlyActuals[key];
      }
      
      // 季度汇总
      quarterlyTotals.q1 += item.quarterlyBudgets.q1;
      quarterlyTotals.q2 += item.quarterlyBudgets.q2;
      quarterlyTotals.q3 += item.quarterlyBudgets.q3;
      quarterlyTotals.q4 += item.quarterlyBudgets.q4;
    });
    
    const totalPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    
    return {
      totalPercentage,
      totalBudget,
      totalActual,
      monthlyTotals,
      quarterlyTotals
    };
  }, [budgetItems]);

  // ✅ 通用公式计算函数
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

    console.log('  🔍 科目值映射:', Object.fromEntries(accountValueMap));

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

    console.log('  🧮 计算表达式:', expression);

    // 计算表达式
    try {
      // 使用 Function 安全计算表达式
      const result = new Function('return ' + expression)();
      console.log('  ✅ 计算结果:', result);
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
        quarterlyBudgets: {
          q1: categoryItems.reduce((sum, item) => sum + item.quarterlyBudgets.q1, 0),
          q2: categoryItems.reduce((sum, item) => sum + item.quarterlyBudgets.q2, 0),
          q3: categoryItems.reduce((sum, item) => sum + item.quarterlyBudgets.q3, 0),
          q4: categoryItems.reduce((sum, item) => sum + item.quarterlyBudgets.q4, 0)
        } as QuarterlyBudgets,
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
        console.log(`  📊 年度预算: ${categoryTotal.annualBudget}`);
        
        // 计算实际完成
        categoryTotal.actualTotal = calculateFormulaValue(account.formula, 'actual');
        console.log(`  📊 实际完成: ${categoryTotal.actualTotal}`);
        
        // 计算月度数据
        for (let month = 1; month <= 12; month++) {
          const monthKey = `m${month}` as keyof MonthlyActuals;
          categoryTotal.monthlyActuals[monthKey] = calculateFormulaValue(account.formula, { month });
        }
        console.log(`  📊 月度数据:`, categoryTotal.monthlyActuals);
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
        quarterlyBudgets: categoryTotal.quarterlyBudgets,
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
            quarterlyBudgets: item.quarterlyBudgets,
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
      
      console.log('💾 开始保存年度预算数据,年份:', selectedYear);
      console.log('💾 原始 budgetItems:', budgetItems);
      console.log('💾 Summary 数据:', summary);
      
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
          quarterlyBudgets: {
            q1: Number(item.quarterlyBudgets.q1) || 0,
            q2: Number(item.quarterlyBudgets.q2) || 0,
            q3: Number(item.quarterlyBudgets.q3) || 0,
            q4: Number(item.quarterlyBudgets.q4) || 0
          },
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
      const queryResult = await db.collection('annual_budgets')
        .where({ year: selectedYear })
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        // 更新现有记录
        const docId = queryResult.data[0]._id;
        console.log(`💾 更新${selectedYear}年度数据, docId:`, docId);
        await db.collection('annual_budgets')
          .doc(docId)
          .update(saveData);
        console.log('✅ 更新成功');
      } else {
        // 创建新记录
        console.log(`💾 创建${selectedYear}年度新数据`);
        await db.collection('annual_budgets').add({
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
  }, [selectedYear, budgetItems, summary, onSavingChange, onEditModeChange]);

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

  // 处理季度预算变更
  const handleQuarterBudgetChange = (itemId: string, quarter: 'q1' | 'q2' | 'q3' | 'q4', value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseFloat(value) || 0;
    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuarterlyBudgets = { ...item.quarterlyBudgets, [quarter]: numValue };
        const newAnnualBudget = newQuarterlyBudgets.q1 + newQuarterlyBudgets.q2 + 
                               newQuarterlyBudgets.q3 + newQuarterlyBudgets.q4;
        const percentage = newAnnualBudget > 0 ? (item.actualTotal / newAnnualBudget) * 100 : 0;
        return { 
          ...item, 
          quarterlyBudgets: newQuarterlyBudgets,
          annualBudget: newAnnualBudget, 
          percentage 
        };
      }
      return item;
    }));
  };

  // 处理季度预算失焦格式化
  const handleQuarterBudgetBlur = (itemId: string, quarter: 'q1' | 'q2' | 'q3' | 'q4', e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseFloat(value))) {
      handleQuarterBudgetChange(itemId, quarter, '0');
    } else {
      // 格式化为两位小数
      const formattedValue = parseFloat(value).toFixed(2);
      e.target.value = formattedValue;
      handleQuarterBudgetChange(itemId, quarter, formattedValue);
    }
    // 清除焦点状态
    setFocusedCell(null);
  };

  // 处理年度预算变更（已废弃，保留用于兼容）
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

  // 处理年度预算失焦格式化（已废弃，保留用于兼容）
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
            {/* 第一行：主标题 */}
            <tr className="bg-slate-100 text-gray-700 border-b border-gray-300">
              <th 
                rowSpan={2} 
                className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-center font-semibold border-r border-gray-300" 
                style={{width: '200px', minWidth: '200px', maxWidth: '200px'}}
              >
                费用科目
              </th>
              <th 
                rowSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-amber-50 border-r border-gray-300" 
                style={{width: '100px', minWidth: '100px', maxWidth: '100px'}}
              >
                年度预算
              </th>
              <th 
                rowSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-teal-50 border-r border-gray-300" 
                style={{width: '100px', minWidth: '100px', maxWidth: '100px'}}
              >
                年度实际完成
              </th>
              <th 
                rowSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-teal-50 border-r border-gray-300" 
                style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}
              >
                完成率
              </th>
              <th 
                colSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-blue-100 border-r border-gray-300"
              >
                第一季度
              </th>
              <th 
                colSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-purple-100 border-r border-gray-300"
              >
                第二季度
              </th>
              <th 
                colSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-indigo-100 border-r border-gray-300"
              >
                第三季度
              </th>
              <th 
                colSpan={2} 
                className="px-3 py-3 text-center font-semibold bg-cyan-100 border-r border-gray-300"
              >
                第四季度
              </th>
            </tr>
            {/* 第二行：子标题 */}
            <tr className="bg-slate-50 text-gray-600 border-b-2 border-gray-300">
              {/* Q1 */}
              <th className="px-2 py-2 text-center font-medium bg-blue-50 border-r border-gray-200" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>预算</th>
              <th className="px-2 py-2 text-center font-medium bg-blue-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>完成</th>
              {/* Q2 */}
              <th className="px-2 py-2 text-center font-medium bg-purple-50 border-r border-gray-200" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>预算</th>
              <th className="px-2 py-2 text-center font-medium bg-purple-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>完成</th>
              {/* Q3 */}
              <th className="px-2 py-2 text-center font-medium bg-indigo-50 border-r border-gray-200" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>预算</th>
              <th className="px-2 py-2 text-center font-medium bg-indigo-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>完成</th>
              {/* Q4 */}
              <th className="px-2 py-2 text-center font-medium bg-cyan-50 border-r border-gray-200" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>预算</th>
              <th className="px-2 py-2 text-center font-medium bg-cyan-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>完成</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* ========== 损益科目列表（一级 + 二级） ========== */}
            {displayRows.map((row) => {
              if (row.level === 'category') {
                // ========== 一级科目行（显示汇总数据，不可编辑） ==========
                const categoryPercentage = row.annualBudget && row.annualBudget > 0 
                  ? (row.actualTotal! / row.annualBudget) * 100 
                  : 0;
                
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
                    
                    {/* 年度预算小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-green-700 bg-gray-100 border-r border-gray-200">
                      {(() => {
                        const result = formatValueWithUnit(row.annualBudget || 0, row.unit, row.categoryType);
                        console.log('🔍 一级科目年度预算-' + row.categoryName + ':', {
                          annualBudget: row.annualBudget,
                          unit: row.unit,
                          categoryType: row.categoryType,
                          result: result
                        });
                        return result;
                      })()}
                    </td>
                    
                    {/* 年度实际完成小计 */}
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-purple-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.actualTotal || 0, row.unit, row.categoryType)}
                    </td>
                    
                    {/* 完成率小计 */}
                    <td className={`px-3 py-3 text-center font-mono text-base font-bold bg-gray-100 border-r border-gray-200 ${
                      categoryPercentage > 100 ? 'text-red-700' : 
                      categoryPercentage >= 90 ? 'text-yellow-700' : 
                      categoryPercentage >= 70 ? 'text-blue-700' :
                      'text-green-700'
                    }`}>
                      {formatPercent(categoryPercentage)}
                    </td>
                    
                    {/* Q1季度：预算 + 完成 */}
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-blue-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.quarterlyBudgets?.q1 || 0, row.unit, row.categoryType)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-teal-700 bg-gray-100 border-r border-gray-300">
                      {(() => {
                        const q1Completed = (row.monthlyData?.m1 || 0) + (row.monthlyData?.m2 || 0) + (row.monthlyData?.m3 || 0);
                        return formatValueWithUnit(q1Completed, row.unit, row.categoryType);
                      })()}
                    </td>
                    
                    {/* Q2季度：预算 + 完成 */}
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-purple-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.quarterlyBudgets?.q2 || 0, row.unit, row.categoryType)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-teal-700 bg-gray-100 border-r border-gray-300">
                      {(() => {
                        const q2Completed = (row.monthlyData?.m4 || 0) + (row.monthlyData?.m5 || 0) + (row.monthlyData?.m6 || 0);
                        return formatValueWithUnit(q2Completed, row.unit, row.categoryType);
                      })()}
                    </td>
                    
                    {/* Q3季度：预算 + 完成 */}
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-indigo-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.quarterlyBudgets?.q3 || 0, row.unit, row.categoryType)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-teal-700 bg-gray-100 border-r border-gray-300">
                      {(() => {
                        const q3Completed = (row.monthlyData?.m7 || 0) + (row.monthlyData?.m8 || 0) + (row.monthlyData?.m9 || 0);
                        return formatValueWithUnit(q3Completed, row.unit, row.categoryType);
                      })()}
                    </td>
                    
                    {/* Q4季度：预算 + 完成 */}
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-cyan-700 bg-gray-100 border-r border-gray-200">
                      {formatValueWithUnit(row.quarterlyBudgets?.q4 || 0, row.unit, row.categoryType)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-base font-bold text-teal-700 bg-gray-100 border-r border-gray-300">
                      {(() => {
                        const q4Completed = (row.monthlyData?.m10 || 0) + (row.monthlyData?.m11 || 0) + (row.monthlyData?.m12 || 0);
                        return formatValueWithUnit(q4Completed, row.unit, row.categoryType);
                      })()}
                    </td>
                  </tr>
                );
              } else {
                // ========== 二级科目行（可编辑） ==========
                const item = budgetItems.find(bi => bi.id === row.id);
                if (!item) return null;
                
                return (
                  <tr key={row.id} className="transition-colors hover:bg-green-50 bg-white">
                    {/* 费用科目 */}
                    <td className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                      <div className="leading-relaxed text-center">
                        {item.itemName}
                      </div>
                    </td>
                    
                    {/* 年度预算（只读,自动计算 = Q1+Q2+Q3+Q4） */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-green-700 bg-green-50 border-r border-gray-200">
                      {(() => {
                        const result = formatValueWithUnit(item.annualBudget, item.unit, item.categoryType);
                        console.log('🔍 年度预算-' + item.itemName + ':', {
                          itemName: item.itemName,
                          annualBudget: item.annualBudget,
                          unit: item.unit,
                          categoryType: item.categoryType,
                          categoryName: item.categoryName,
                          result: result
                        });
                        return result;
                      })()}
                    </td>
                    
                    {/* 年度实际完成 */}
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold text-purple-700 bg-purple-50 border-r border-gray-200">
                      {formatValueWithUnit(item.actualTotal, item.unit, item.categoryType)}
                    </td>
                    
                    {/* 完成率 */}
                    <td className={`px-3 py-2 text-center font-mono text-base font-semibold border-r border-gray-200 ${
                      item.percentage > 100 ? 'text-red-700 bg-red-100' : 
                      item.percentage >= 90 ? 'text-yellow-700 bg-yellow-100' : 
                      item.percentage >= 70 ? 'text-blue-700 bg-blue-100' :
                      'text-green-700 bg-green-100'
                    }`}>
                      {formatPercent(item.percentage)}
                    </td>
                    
                    {/* Q1季度预算（可输入） */}
                    <td 
                      className={`px-2 py-2 bg-blue-50 border-r border-gray-200 transition-all duration-200 ${
                        isEditMode && hoveredCell?.itemId === item.id && hoveredCell?.field === 'q1'
                          ? 'ring-2 ring-inset ring-blue-400 bg-blue-100 shadow-inner'
                          : ''
                      } ${
                        focusedCell?.itemId === item.id && focusedCell?.field === 'q1'
                          ? 'ring-2 ring-inset ring-blue-500 bg-blue-50'
                          : ''
                      }`}
                      onMouseEnter={() => {
                        if (isEditMode && !focusedCell) {
                          setHoveredCell({itemId: item.id, field: 'q1'});
                        }
                      }}
                      onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                    >
                      {isEditMode ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.quarterlyBudgets.q1 || ''}
                          onChange={(e) => handleQuarterBudgetChange(item.id, 'q1', e.target.value)}
                          onFocus={() => setFocusedCell({itemId: item.id, field: 'q1'})}
                          onBlur={(e) => handleQuarterBudgetBlur(item.id, 'q1', e)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-base text-blue-700 font-semibold"
                          placeholder={item.unit === '%' ? '0.00%' : '0.00'}
                        />
                      ) : (
                        <div className="text-right font-mono text-base text-blue-700 font-semibold">{formatValueWithUnit(item.quarterlyBudgets.q1, item.unit, item.categoryType)}</div>
                      )}
                    </td>
                    
                    {/* Q1季度完成（只读，从月度数据聚合） */}
                    <td className="px-2 py-2 text-right font-mono text-base font-semibold text-teal-700 bg-blue-50 border-r border-gray-300">
                      {(() => {
                        const q1Completed = (item.monthlyActuals.m1 || 0) + (item.monthlyActuals.m2 || 0) + (item.monthlyActuals.m3 || 0);
                        return formatValueWithUnit(q1Completed, item.unit, item.categoryType);
                      })()}
                    </td>
                    
                    {/* Q2季度预算（可输入） */}
                    <td 
                      className={`px-2 py-2 bg-purple-50 border-r border-gray-200 transition-all duration-200 ${
                        isEditMode && hoveredCell?.itemId === item.id && hoveredCell?.field === 'q2'
                          ? 'ring-2 ring-inset ring-purple-400 bg-purple-100 shadow-inner'
                          : ''
                      } ${
                        focusedCell?.itemId === item.id && focusedCell?.field === 'q2'
                          ? 'ring-2 ring-inset ring-purple-500 bg-purple-50'
                          : ''
                      }`}
                      onMouseEnter={() => {
                        if (isEditMode && !focusedCell) {
                          setHoveredCell({itemId: item.id, field: 'q2'});
                        }
                      }}
                      onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                    >
                      {isEditMode ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.quarterlyBudgets.q2 || ''}
                          onChange={(e) => handleQuarterBudgetChange(item.id, 'q2', e.target.value)}
                          onFocus={() => setFocusedCell({itemId: item.id, field: 'q2'})}
                          onBlur={(e) => handleQuarterBudgetBlur(item.id, 'q2', e)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-base text-purple-700 font-semibold"
                          placeholder={item.unit === '%' ? '0.00%' : '0.00'}
                        />
                      ) : (
                        <div className="text-right font-mono text-base text-purple-700 font-semibold">{formatValueWithUnit(item.quarterlyBudgets.q2, item.unit, item.categoryType)}</div>
                      )}
                    </td>
                    
                    {/* Q2季度完成（只读） */}
                    <td className="px-2 py-2 text-right font-mono text-base font-semibold text-teal-700 bg-purple-50 border-r border-gray-300">
                      {(() => {
                        const q2Completed = (item.monthlyActuals.m4 || 0) + (item.monthlyActuals.m5 || 0) + (item.monthlyActuals.m6 || 0);
                        return formatValueWithUnit(q2Completed, item.unit, item.categoryType);
                      })()}
                    </td>
                    
                    {/* Q3季度预算（可输入） */}
                    <td 
                      className={`px-2 py-2 bg-indigo-50 border-r border-gray-200 transition-all duration-200 ${
                        isEditMode && hoveredCell?.itemId === item.id && hoveredCell?.field === 'q3'
                          ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-100 shadow-inner'
                          : ''
                      } ${
                        focusedCell?.itemId === item.id && focusedCell?.field === 'q3'
                          ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50'
                          : ''
                      }`}
                      onMouseEnter={() => {
                        if (isEditMode && !focusedCell) {
                          setHoveredCell({itemId: item.id, field: 'q3'});
                        }
                      }}
                      onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                    >
                      {isEditMode ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.quarterlyBudgets.q3 || ''}
                          onChange={(e) => handleQuarterBudgetChange(item.id, 'q3', e.target.value)}
                          onFocus={() => setFocusedCell({itemId: item.id, field: 'q3'})}
                          onBlur={(e) => handleQuarterBudgetBlur(item.id, 'q3', e)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-base text-indigo-700 font-semibold"
                          placeholder={item.unit === '%' ? '0.00%' : '0.00'}
                        />
                      ) : (
                        <div className="text-right font-mono text-base text-indigo-700 font-semibold">{formatValueWithUnit(item.quarterlyBudgets.q3, item.unit, item.categoryType)}</div>
                      )}
                    </td>
                    
                    {/* Q3季度完成（只读） */}
                    <td className="px-2 py-2 text-right font-mono text-base font-semibold text-teal-700 bg-indigo-50 border-r border-gray-300">
                      {(() => {
                        const q3Completed = (item.monthlyActuals.m7 || 0) + (item.monthlyActuals.m8 || 0) + (item.monthlyActuals.m9 || 0);
                        return formatValueWithUnit(q3Completed, item.unit, item.categoryType);
                      })()}
                    </td>
                    
                    {/* Q4季度预算（可输入） */}
                    <td 
                      className={`px-2 py-2 bg-cyan-50 border-r border-gray-200 transition-all duration-200 ${
                        isEditMode && hoveredCell?.itemId === item.id && hoveredCell?.field === 'q4'
                          ? 'ring-2 ring-inset ring-cyan-400 bg-cyan-100 shadow-inner'
                          : ''
                      } ${
                        focusedCell?.itemId === item.id && focusedCell?.field === 'q4'
                          ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-50'
                          : ''
                      }`}
                      onMouseEnter={() => {
                        if (isEditMode && !focusedCell) {
                          setHoveredCell({itemId: item.id, field: 'q4'});
                        }
                      }}
                      onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                    >
                      {isEditMode ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.quarterlyBudgets.q4 || ''}
                          onChange={(e) => handleQuarterBudgetChange(item.id, 'q4', e.target.value)}
                          onFocus={() => setFocusedCell({itemId: item.id, field: 'q4'})}
                          onBlur={(e) => handleQuarterBudgetBlur(item.id, 'q4', e)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-base text-cyan-700 font-semibold"
                          placeholder={item.unit === '%' ? '0.00%' : '0.00'}
                        />
                      ) : (
                        <div className="text-right font-mono text-base text-cyan-700 font-semibold">{formatValueWithUnit(item.quarterlyBudgets.q4, item.unit, item.categoryType)}</div>
                      )}
                    </td>
                    
                    {/* Q4季度完成（只读） */}
                    <td className="px-2 py-2 text-right font-mono text-base font-semibold text-teal-700 bg-cyan-50 border-r border-gray-300">
                      {(() => {
                        const q4Completed = (item.monthlyActuals.m10 || 0) + (item.monthlyActuals.m11 || 0) + (item.monthlyActuals.m12 || 0);
                        return formatValueWithUnit(q4Completed, item.unit, item.categoryType);
                      })()}
                    </td>
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
