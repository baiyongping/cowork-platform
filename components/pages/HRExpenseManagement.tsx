import { useState, useMemo, useEffect, useCallback } from 'react';
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

// 人力费用类型定义 (已废弃,改为动态加载)
type HRExpenseType = string;

// 费用科目配置接口
interface PayrollAccount {
  _id: string;
  name: string;
  count: number;
  totalUnit?: string;  // 单位
  order: number;
}

// 月度数据接口 - 使用对象格式
interface MonthlyActuals {
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
}

// 编制数数据接口
interface StaffingData {
  _id?: string;
  year: number;
  annualTarget: number; // 年度预算编制数
  monthlyData: MonthlyActuals; // 每月编制数
  averageActual?: number; // 截止上月的平均编制数（只读，不保存）
}

// 费用项目接口
interface HRExpenseItem {
  id: string;
  type: HRExpenseType;
  name: string;
  unit?: string;         // 单位（万元/元/%）
  annualBudget: number;
  actualTotal: number;
  percentage: number;
  monthlyActuals: MonthlyActuals;
  order: number;
}

interface HRExpenseManagementProps {
  selectedYear?: number;
  currentUser?: any;
  userRole?: string;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
  onHasUnsavedChanges?: (hasChanges: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveMethodReady?: (saveMethod: () => void) => void;
  onYearChange?: (year: number) => void;
  onCancelEdit?: () => void;
}

export function HRExpenseManagement({
  selectedYear: propSelectedYear,
  isEditMode = false,
  onEditModeChange,
  onSavingChange,
  onSaveMethodReady
}: HRExpenseManagementProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(propSelectedYear || currentYear);
  
  // 监听外部年份变化
  useEffect(() => {
    if (propSelectedYear !== undefined && propSelectedYear !== selectedYear) {
      console.log('🔄 年份切换:', selectedYear, '→', propSelectedYear);
      setSelectedYear(propSelectedYear);
    }
  }, [propSelectedYear]);
  
  // 使用父组件传递的isEditMode,不再在子组件内部管理
  // const setIsEditMode = (mode: boolean) => {
  //   onEditModeChange?.(mode);
  // };
  
  // ✅ 动态数据状态
  const [payrollAccounts, setPayrollAccounts] = useState<PayrollAccount[]>([]); // 费用科目配置
  const [expenses, setExpenses] = useState<HRExpenseItem[]>([]);
  const [originalExpenses, setOriginalExpenses] = useState<HRExpenseItem[]>([]); // 备份原始数据
  const [staffingData, setStaffingData] = useState<StaffingData>({
    year: selectedYear,
    annualTarget: 0,
    monthlyData: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 },
    averageActual: 0
  }); // 编制数数据
  const [originalStaffingData, setOriginalStaffingData] = useState<StaffingData>({
    year: selectedYear,
    annualTarget: 0,
    monthlyData: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 },
    averageActual: 0
  }); // 备份原始编制数数据
  // 不再使用内部的 isEditMode 状态,完全使用父组件传递的 prop

  // 🎨 单元格交互状态 - 使用更好的实现方式
  const [hoveredCell, setHoveredCell] = useState<{itemId: string, field: string} | null>(null);
  const [focusedCell, setFocusedCell] = useState<{itemId: string, field: string} | null>(null);

  // 获取当前月份
  const currentMonth = new Date().getMonth() + 1;

  // ✅ 计算编制数的平均实际完成值（截止到上月的平均数）
  const calculateStaffingAverage = (data: StaffingData): number => {
    if (currentMonth <= 1) return 0; // 1月没有上月数据
    
    let sum = 0;
    for (let i = 1; i < currentMonth; i++) {
      const key = `m${i}` as keyof MonthlyActuals;
      sum += data.monthlyData[key];
    }
    
    return sum / (currentMonth - 1);
  };

  // ✅ 根据费用科目初始化费用项目
  const initializeExpensesFromAccounts = (accounts: PayrollAccount[]): HRExpenseItem[] => {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    return accounts.map((account) => {
      // 如果 count 存在且大于 0,显示人数;否则只显示科目名称
      const displayName = account.count && account.count > 0
        ? `${account.name}（${account.count}人）`
        : account.name;
      
      return {
        id: `expense_${account._id}`,
        type: account.name,
        name: displayName,
        unit: account.totalUnit || '万元',  // ✅ 从科目配置获取单位
        annualBudget: 0,
        actualTotal: 0,
        percentage: 0,
        monthlyActuals: {
          m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
          m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
        },
        order: account.order
      };
    });
  };

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

  // ✅ 加载费用科目配置
  const loadPayrollAccounts = async () => {
    try {
      console.log('📋 正在加载费用科目配置...');
      
      const queryResult = await db.collection('payroll_accounts')
        .orderBy('order', 'asc')
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        console.log(`✅ 找到${queryResult.data.length}个费用科目:`, queryResult.data);
        setPayrollAccounts(queryResult.data as PayrollAccount[]);
      } else {
        console.log('⚠️ 未找到费用科目配置');
        setPayrollAccounts([]);
      }
    } catch (error) {
      console.error('❌ 加载费用科目配置失败:', error);
      toast.error('加载费用科目配置失败');
      setPayrollAccounts([]);
    }
  };

  // ✅ 加载编制数数据
  const loadStaffingData = async (year: number) => {
    try {
      console.log('👥 正在加载编制数数据,年份:', year);
      
      const queryResult = await db.collection('hr_staffing')
        .where({ year })
        .get();
      
      console.log('👥 编制数查询结果:', {
        dataLength: queryResult.data?.length,
        data: queryResult.data,
        requestId: queryResult.requestId
      });
      
      if (queryResult.data && queryResult.data.length > 0) {
        const data = queryResult.data[0] as StaffingData;
        console.log('✅ 找到编制数数据:', data);
        
        // 计算平均实际完成
        const avgActual = calculateStaffingAverage(data);
        const dataWithAvg = { ...data, averageActual: avgActual };
        
        setStaffingData(dataWithAvg);
        setOriginalStaffingData(dataWithAvg);
      } else {
        console.log('⚠️ 未找到编制数数据,使用默认值');
        const defaultData: StaffingData = {
          year,
          annualTarget: 0,
          monthlyData: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 },
          averageActual: 0
        };
        setStaffingData(defaultData);
        setOriginalStaffingData(defaultData);
      }
    } catch (error) {
      console.error('❌ 加载编制数数据失败:', error);
      toast.error('加载编制数数据失败');
    }
  };

  // ✅ 组件初始化 - 先加载费用科目,再加载数据
  useEffect(() => {
    loadPayrollAccounts();
  }, []); // 只在组件挂载时加载一次

  useEffect(() => {
    if (payrollAccounts.length > 0) {
      loadExpenses(selectedYear);
      loadStaffingData(selectedYear); // 加载编制数数据
    }
  }, [selectedYear, payrollAccounts]); // 当年份或科目变化时重新加载

  // 计算汇总数据
  const summary = useMemo(() => {
    const totalBudget = expenses.reduce((sum, item) => sum + item.annualBudget, 0);
    const totalActual = expenses.reduce((sum, item) => sum + item.actualTotal, 0);
    
    const monthlyTotals: MonthlyActuals = {
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    };
    
    expenses.forEach(item => {
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
  }, [expenses]);

  // ✅ 合并费用科目和数据库数据
  const mergeExpensesWithAccounts = (
    dbItems: HRExpenseItem[], 
    accounts: PayrollAccount[]
  ): HRExpenseItem[] => {
    // 创建一个 Map 来快速查找数据库中的数据
    const dbItemMap = new Map<string, HRExpenseItem>();
    dbItems.forEach(item => {
      dbItemMap.set(item.type, item);
    });

    // 根据最新的科目列表创建费用项目,保留已有的数据
    return accounts.map((account) => {
      const existingItem = dbItemMap.get(account.name);
      
      // 如果 count 存在且大于 0,显示人数;否则只显示科目名称
      const displayName = account.count && account.count > 0
        ? `${account.name}（${account.count}人）`
        : account.name;
      
      if (existingItem) {
        // 如果数据库中存在该科目,更新人数信息和单位
        return {
          ...existingItem,
          name: displayName,
          unit: account.totalUnit || existingItem.unit || '万元',  // ✅ 更新单位
          order: account.order
        };
      } else {
        // 如果数据库中不存在该科目,创建新的空白项目
        return {
          id: `expense_${account._id}`,
          type: account.name,
          name: displayName,
          unit: account.totalUnit || '万元',  // ✅ 从科目配置获取单位
          annualBudget: 0,
          actualTotal: 0,
          percentage: 0,
          monthlyActuals: {
            m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
            m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
          },
          order: account.order
        };
      }
    });
  };

  // ✅ 加载数据（全局共享，只按年份查询）
  const loadExpenses = async (year: number) => {
    try {
      console.log('📊 正在加载人力费用数据,年份:', year);
      
      const queryResult = await db.collection('hrExpenses')
        .where({ year: year })
        .get();
      
      console.log('📊 查询结果:', queryResult);
      
      if (queryResult.data && queryResult.data.length > 0) {
        const data = queryResult.data[0];
        console.log(`✅ 找到${year}年度数据:`, data);
        
        // 确保数据结构完整
        if (data.items && Array.isArray(data.items)) {
          // ✅ 关键修复：将数据库数据与最新的费用科目列表合并
          const mergedItems = mergeExpensesWithAccounts(data.items, payrollAccounts);
          console.log('🔄 合并后的费用项目:', mergedItems);
          setExpenses(mergedItems);
        } else {
          console.log('⚠️ 数据结构不完整,使用费用科目初始化数据');
          setExpenses(initializeExpensesFromAccounts(payrollAccounts));
        }
      } else {
        console.log(`ℹ️ ${year}年度暂无数据,使用费用科目初始化数据`);
        setExpenses(initializeExpensesFromAccounts(payrollAccounts));
      }
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      toast.error('加载数据失败');
      setExpenses(initializeExpensesFromAccounts(payrollAccounts));
    }
  };

  // ✅ 保存数据到数据库（全局共享，只按年份更新）
  // ✅ 使用 useCallback 创建保存方法,直接内联保存逻辑避免无限循环
  const saveMethod = useCallback(async () => {
    try {
      onSavingChange?.(true);
      const userId = getCurrentUserId();
      
      // 并行保存费用数据和编制数数据
      await Promise.all([
        // 保存费用数据
        (async () => {
          console.log('💾 开始保存人力费用数据,年份:', selectedYear);
          
          const saveData = {
            year: selectedYear,
            totalBudget: summary.totalBudget,
            totalActual: summary.totalActual,
            items: expenses,
            monthlyTotals: summary.monthlyTotals,
            updatedAt: new Date(),
            updatedBy: userId || 'system'
          };
          
          console.log('💾 保存数据:', saveData);
          
          const queryResult = await db.collection('hrExpenses')
            .where({ year: selectedYear })
            .get();
          
          if (queryResult.data && queryResult.data.length > 0) {
            const docId = queryResult.data[0]._id;
            console.log(`💾 更新${selectedYear}年度数据, docId:`, docId);
            await db.collection('hrExpenses')
              .doc(docId)
              .update(saveData);
            console.log('✅ 更新成功');
          } else {
            console.log(`💾 创建${selectedYear}年度新数据`);
            await db.collection('hrExpenses').add({
              ...saveData,
              createdAt: new Date(),
              createdBy: userId || 'system'
            });
            console.log('✅ 创建成功');
          }
        })(),
        
        // 保存编制数数据
        (async () => {
          console.log('👥 开始保存编制数数据,年份:', selectedYear);
          
          const saveData = {
            year: selectedYear,
            annualTarget: staffingData.annualTarget,
            monthlyData: staffingData.monthlyData,
            updatedAt: new Date(),
            updatedBy: userId || 'system'
          };
          
          console.log('👥 保存编制数数据:', saveData);
          
          const queryResult = await db.collection('hr_staffing')
            .where({ year: selectedYear })
            .get();
          
          if (queryResult.data && queryResult.data.length > 0) {
            const docId = queryResult.data[0]._id;
            console.log(`👥 更新${selectedYear}年度编制数数据, docId:`, docId);
            await db.collection('hr_staffing')
              .doc(docId)
              .update(saveData);
            console.log('✅ 编制数更新成功');
          } else {
            console.log(`👥 创建${selectedYear}年度新编制数数据`);
            await db.collection('hr_staffing').add({
              ...saveData,
              createdAt: new Date(),
              createdBy: userId || 'system'
            });
            console.log('✅ 编制数创建成功');
          }
        })()
      ]);
      
      // ✅ 保存成功后退出编辑模式
      onEditModeChange?.(false);
    } catch (error) {
      console.error('❌ 保存失败,保持编辑模式:', error);
      toast.error('保存失败');
      throw error;
    } finally {
      onSavingChange?.(false);
    }
  }, [selectedYear, summary, expenses, staffingData, onSavingChange, onEditModeChange]);

  // ✅ 暴露保存方法给父组件
  useEffect(() => {
    onSaveMethodReady?.(saveMethod);
  }, [saveMethod, onSaveMethodReady]);

  // ✅ 当进入编辑模式时备份数据(只在第一次进入时备份)
  useEffect(() => {
    if (isEditMode && originalExpenses.length === 0 && expenses.length > 0) {
      setOriginalExpenses(JSON.parse(JSON.stringify(expenses)));
      setOriginalStaffingData(JSON.parse(JSON.stringify(staffingData)));
    }
  }, [isEditMode]); // 只依赖 isEditMode,避免无限循环

  // ✅ 当退出编辑模式时清空备份数据
  useEffect(() => {
    if (!isEditMode && originalExpenses.length > 0) {
      console.log('🧹 退出编辑模式,清空备份数据');
      setOriginalExpenses([]);
      setOriginalStaffingData({
        year: selectedYear,
        annualTarget: 0,
        monthlyData: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 },
        averageActual: 0
      });
    }
  }, [isEditMode, selectedYear, originalExpenses.length]); // 依赖 isEditMode 和 selectedYear

  // 处理编制数年度预算变更
  const handleStaffingAnnualChange = (value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseInt(value) || 0;
    setStaffingData(prev => ({
      ...prev,
      annualTarget: numValue
    }));
  };

  // 处理编制数月度变更
  const handleStaffingMonthlyChange = (month: number, value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseInt(value) || 0;
    const monthKey = `m${month}` as keyof MonthlyActuals;
    
    setStaffingData(prev => {
      const newMonthlyData = { ...prev.monthlyData, [monthKey]: numValue };
      const newData = { ...prev, monthlyData: newMonthlyData };
      
      // 重新计算平均实际完成
      const avgActual = calculateStaffingAverage(newData);
      
      return { ...newData, averageActual: avgActual };
    });
  };

  // 处理年度预算变更
  const handleBudgetChange = (itemId: string, value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseFloat(value) || 0;
    setExpenses(prev => prev.map(item => {
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
    
    setExpenses(prev => prev.map(item => {
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
  const formatValueWithUnit = (value: number, unit?: string) => {
    if (!value && value !== 0) return '-';
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    return formatNumber(value);
  };

  return (
    <>
      {/* ✅ 隐藏 number input 的上下箭头 */}
      <style dangerouslySetInnerHTML={{ __html: inputNumberStyle }} />
      
      <div className="space-y-4">

      {/* ========== 预算汇总卡片 ========== */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
        <div className="grid grid-cols-3 gap-6">
          {/* 年度预算总额 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">年度预算总额</p>
              <p className="text-2xl font-bold text-emerald-600">{formatNumber(summary.totalBudget)}万元</p>
            </div>
          </div>

          {/* 实际支出总额 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">实际支出总额</p>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(summary.totalActual)}万元</p>
            </div>
          </div>

          {/* 预算执行率 */}
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              summary.totalPercentage > 100 ? 'bg-red-100' :
              summary.totalPercentage > 90 ? 'bg-yellow-100' :
              'bg-green-100'
            }`}>
              <span className="text-2xl">
                {summary.totalPercentage > 100 ? '⚠️' :
                 summary.totalPercentage > 90 ? '⏰' : '✅'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">预算执行率</p>
              <p className={`text-2xl font-bold ${
                summary.totalPercentage > 100 ? 'text-red-600' :
                summary.totalPercentage > 90 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {formatPercent(summary.totalPercentage)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 数据表格 ========== */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-100 text-gray-700 border-b-2 border-gray-300">
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-center font-semibold border-r border-gray-300" style={{width: '152px', minWidth: '152px', maxWidth: '152px'}}>
                费用科目
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-amber-50 border-r border-gray-300" style={{width: '100px', minWidth: '100px', maxWidth: '100px'}}>
                年度预算
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-teal-50 border-r border-gray-300" style={{width: '100px', minWidth: '100px', maxWidth: '100px'}}>
                实际完成
              </th>
              <th className="px-3 py-3 text-center font-semibold bg-teal-50 border-r border-gray-300" style={{width: '90px', minWidth: '90px', maxWidth: '90px'}}>
                完成率
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
            {/* ========== 编制数行 ========== */}
            <tr className="bg-blue-50 border-b-2 border-blue-300">
              {/* 科目名称 */}
              <td className="sticky left-0 z-10 px-4 py-3 text-sm font-bold text-blue-900 bg-blue-100 border-r border-blue-300">
                <div className="leading-relaxed text-center">编制数(人)</div>
              </td>
              
              {/* 年度预算 */}
              <td 
                className={`px-3 py-2 bg-blue-50 border-r border-blue-200 transition-all duration-200 ${
                  isEditMode && hoveredCell?.itemId === 'staffing' && hoveredCell?.field === 'annualTarget'
                    ? 'ring-2 ring-inset ring-blue-400 bg-blue-100 shadow-inner'
                    : ''
                } ${
                  focusedCell?.itemId === 'staffing' && focusedCell?.field === 'annualTarget'
                    ? 'ring-2 ring-inset ring-blue-500 bg-blue-50'
                    : ''
                }`}
                onMouseEnter={() => {
                  if (isEditMode && !focusedCell) {
                    setHoveredCell({itemId: 'staffing', field: 'annualTarget'});
                  }
                }}
                onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
              >
                {isEditMode ? (
                  <input
                    type="number"
                    value={staffingData.annualTarget || ''}
                    onChange={(e) => handleStaffingAnnualChange(e.target.value)}
                    onFocus={() => setFocusedCell({itemId: 'staffing', field: 'annualTarget'})}
                    onBlur={(e) => {
                      const target = e.relatedTarget as HTMLElement;
                      if (!target || target.tagName !== 'INPUT') {
                        setFocusedCell(null);
                      } else {
                        setTimeout(() => setFocusedCell(null), 0);
                      }
                    }}
                    className="w-full text-center bg-transparent focus:outline-none font-mono text-base text-blue-700 font-bold"
                    placeholder="0"
                  />
                ) : (
                  <div className="text-center text-base font-bold text-gray-900">
                    {staffingData.annualTarget}
                  </div>
                )}
              </td>
              
              {/* 实际完成（平均数，一位小数） */}
              <td className="px-3 py-2 bg-blue-50 border-r border-blue-200">
                <div className="text-center text-sm font-medium text-gray-900">
                  {staffingData.averageActual?.toFixed(1) || '0.0'}
                </div>
              </td>
              
              {/* 完成率（实际完成/年度预算*100%） */}
              <td className="px-3 py-2 bg-blue-50 border-r border-blue-200">
                <div className="text-center text-sm font-medium text-gray-900">
                  {staffingData.annualTarget > 0 
                    ? `${((staffingData.averageActual || 0) / staffingData.annualTarget * 100).toFixed(2)}%`
                    : '-'}
                </div>
              </td>
              
              {/* 1-12月（整数） */}
              {Array.from({length: 12}, (_, i) => {
                const month = i + 1;
                const monthKey = `m${month}` as keyof MonthlyActuals;
                const value = staffingData.monthlyData[monthKey];
                
                return (
                  <td 
                    key={month} 
                    className={`px-2 py-2 bg-blue-50 border-r border-blue-200 transition-all duration-200 ${
                      isEditMode && hoveredCell?.itemId === 'staffing' && hoveredCell?.field === `month${month}`
                        ? 'ring-2 ring-inset ring-blue-400 bg-blue-100 shadow-inner'
                        : ''
                    } ${
                      focusedCell?.itemId === 'staffing' && focusedCell?.field === `month${month}`
                        ? 'ring-2 ring-inset ring-blue-500 bg-blue-50'
                        : ''
                    }`}
                    style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
                    onMouseEnter={() => {
                      if (isEditMode && !focusedCell) {
                        setHoveredCell({itemId: 'staffing', field: `month${month}`});
                      }
                    }}
                    onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                  >
                    {isEditMode ? (
                      <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => handleStaffingMonthlyChange(month, e.target.value)}
                        onFocus={() => setFocusedCell({itemId: 'staffing', field: `month${month}`})}
                        onBlur={(e) => {
                          const target = e.relatedTarget as HTMLElement;
                          if (!target || target.tagName !== 'INPUT') {
                            setFocusedCell(null);
                          } else {
                            setTimeout(() => setFocusedCell(null), 0);
                          }
                        }}
                        className="w-full text-center bg-transparent focus:outline-none font-mono text-base text-blue-700 font-bold"
                        placeholder="0"
                      />
                    ) : (
                      <div className="text-center text-base font-bold text-gray-900">
                        {value}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ========== 费用科目列表 ========== */}
            {expenses.map((expense, index) => (
              <tr key={expense.id} className={`transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {/* 费用科目 */}
                <td className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                  <div className="leading-relaxed text-center">{expense.name}</div>
                </td>
                
                {/* 年度预算 */}
                <td 
                  className={`px-3 py-2 bg-emerald-50 border-r border-gray-200 transition-all duration-200 ${
                    isEditMode && hoveredCell?.itemId === expense.id && hoveredCell?.field === 'budget'
                      ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-100 shadow-inner'
                      : ''
                  } ${
                    focusedCell?.itemId === expense.id && focusedCell?.field === 'budget'
                      ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50'
                      : ''
                  }`}
                  onMouseEnter={() => {
                    if (isEditMode && !focusedCell) {
                      setHoveredCell({itemId: expense.id, field: 'budget'});
                    }
                  }}
                  onMouseLeave={() => isEditMode && !focusedCell && setHoveredCell(null)}
                >
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={expense.annualBudget || ''}
                      onChange={(e) => handleBudgetChange(expense.id, e.target.value)}
                      onFocus={() => setFocusedCell({itemId: expense.id, field: 'budget'})}
                      onBlur={(e) => handleBudgetBlur(expense.id, e)}
                      className="w-full text-right bg-transparent focus:outline-none font-mono text-sm text-emerald-700 font-medium"
                      placeholder={expense.unit === '%' ? '0.00%' : '0.00'}
                    />
                  ) : (
                    <div className="text-right font-mono text-sm text-emerald-700 font-medium">{formatValueWithUnit(expense.annualBudget, expense.unit)}</div>
                  )}
                </td>
                
                {/* 实际完成 */}
                <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-purple-700 bg-purple-50 border-r border-gray-200">
                  {formatValueWithUnit(expense.actualTotal, expense.unit)}
                </td>
                
                {/* 完成率 */}
                <td className={`px-3 py-2 text-center font-mono text-sm font-semibold border-r border-gray-200 ${
                  expense.percentage > 100 ? 'text-red-700 bg-red-100' : 
                  expense.percentage >= 90 ? 'text-yellow-700 bg-yellow-100' : 
                  expense.percentage >= 70 ? 'text-blue-700 bg-blue-100' :
                  'text-emerald-700 bg-emerald-100'
                }`}>
                  {formatPercent(expense.percentage)}
                </td>
                
                {/* 月度实际支出 */}
                {Array.from({length: 12}, (_, i) => {
                  const month = i + 1;
                  const monthKey = `m${month}` as keyof MonthlyActuals;
                  const value = expense.monthlyActuals[monthKey];
                  const canEdit = isEditMode && month <= currentMonth;
                  
                  return (
                    <td
                      key={month}
                      className={`px-2 py-2 border-r border-gray-200 transition-all duration-200 ${
                        month <= currentMonth ? 'bg-blue-50' : 'bg-gray-100'
                      } ${
                        isEditMode && hoveredCell?.itemId === expense.id && hoveredCell?.field === `month${month}`
                          ? 'ring-2 ring-inset ring-blue-400 bg-blue-100 shadow-inner'
                          : ''
                      } ${
                        focusedCell?.itemId === expense.id && focusedCell?.field === `month${month}`
                          ? 'ring-2 ring-inset ring-blue-500 bg-blue-50'
                          : ''
                      }`}
                      style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
                      onMouseEnter={() => {
                        if (canEdit && !focusedCell) {
                          setHoveredCell({itemId: expense.id, field: `month${month}`});
                        }
                      }}
                      onMouseLeave={() => canEdit && !focusedCell && setHoveredCell(null)}
                    >
                      {canEdit ? (
                        <input
                          type="number"
                          step="0.01"
                          value={value || ''}
                          onChange={(e) => handleActualChange(expense.id, month, e.target.value)}
                          onFocus={() => setFocusedCell({itemId: expense.id, field: `month${month}`})}
                          onBlur={(e) => handleActualBlur(expense.id, month, e)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-sm text-blue-700"
                          placeholder={expense.unit === '%' ? '0.00%' : '0.00'}
                        />
                      ) : (
                        <div className={`text-right font-mono text-sm ${month <= currentMonth ? 'text-blue-700' : 'text-gray-400'}`}>
                          {formatValueWithUnit(value, expense.unit)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* 合计行 */}
            <tr className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 font-bold border-t-2 border-indigo-300">
              <td className="sticky left-0 z-10 px-4 py-3 text-sm text-indigo-900 bg-gradient-to-r from-blue-100 to-indigo-100">
                合计
              </td>
              <td className="px-3 py-3 text-right font-mono text-base font-bold text-emerald-800 bg-emerald-200 border-r border-indigo-300">
                {formatNumber(summary.totalBudget)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-base font-bold text-purple-800 bg-purple-200 border-r border-indigo-300">
                {formatNumber(summary.totalActual)}
              </td>
              <td className={`px-3 py-3 text-center font-mono text-base font-bold border-r border-indigo-300 ${
                summary.totalPercentage > 100 ? 'text-red-800 bg-red-200' : 
                summary.totalPercentage >= 90 ? 'text-yellow-800 bg-yellow-200' : 
                summary.totalPercentage >= 70 ? 'text-blue-800 bg-blue-200' :
                'text-emerald-800 bg-emerald-200'
              }`}>
                {formatPercent(summary.totalPercentage)}
              </td>
              {Array.from({length: 12}, (_, i) => {
                const monthKey = `m${i+1}` as keyof MonthlyActuals;
                const month = i + 1;
                return (
                  <td 
                    key={i+1} 
                    className={`px-2 py-3 text-right font-mono text-base font-bold border-r border-indigo-200 ${
                      month <= currentMonth ? 'text-blue-800 bg-blue-200' : 'text-gray-600 bg-gray-200'
                    }`}
                    style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
                  >
                    {formatNumber(summary.monthlyTotals[monthKey])}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
