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

// 人力费用类型定义
type HRExpenseType = 
  | 'salary'          // 工资
  | 'socialSecurity'  // 社保
  | 'housingFund'     // 公积金
  | 'performance'     // 绩效
  | 'salesBonus'      // 业绩奖金
  | 'mealAllowance'   // 餐补
  | 'welfare'         // 福利
  | 'training'        // 培训
  | 'other';          // 其它

// 费用项目名称映射
const EXPENSE_NAMES: Record<HRExpenseType, string> = {
  salary: '工资',
  socialSecurity: '社保',
  housingFund: '公积金',
  performance: '绩效',
  salesBonus: '业绩奖金',
  mealAllowance: '餐补',
  welfare: '福利',
  training: '培训',
  other: '其它'
};

// 月度数据接口 - 使用对象格式
interface MonthlyActuals {
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
}

// 费用项目接口
interface HRExpenseItem {
  id: string;
  type: HRExpenseType;
  name: string;
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
  
  // 初始化费用项目
  const initializeExpenses = (): HRExpenseItem[] => {
    const types: HRExpenseType[] = [
      'salary', 'socialSecurity', 'housingFund', 'performance',
      'salesBonus', 'mealAllowance', 'welfare', 'training', 'other'
    ];

    return types.map((type, index) => ({
      id: `expense_${type}`,
      type,
      name: EXPENSE_NAMES[type],
      annualBudget: 0,
      actualTotal: 0,
      percentage: 0,
      monthlyActuals: {
        m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
        m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
      },
      order: index + 1
    }));
  };

  // ✅ 静态数据状态
  const [expenses, setExpenses] = useState<HRExpenseItem[]>(initializeExpenses());
  const [originalExpenses, setOriginalExpenses] = useState<HRExpenseItem[]>([]); // 备份原始数据
  // 不再使用内部的 isEditMode 状态,完全使用父组件传递的 prop

  // 🎨 单元格交互状态
  const [hoveredCell, setHoveredCell] = useState<{itemId: string, field: string} | null>(null);

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

  // ✅ 组件初始化 - 加载数据（全局共享）
  useEffect(() => {
    loadExpenses(selectedYear);  // ✅ 只传入年份
  }, [selectedYear]); // 当年份变化时重新加载

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
          setExpenses(data.items);
        } else {
          console.log('⚠️ 数据结构不完整,使用初始化数据');
          setExpenses(initializeExpenses());
        }
      } else {
        console.log(`ℹ️ ${year}年度暂无数据,使用初始化数据`);
        setExpenses(initializeExpenses());
      }
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      toast.error('加载数据失败');
      setExpenses(initializeExpenses());
    }
  };

  // ✅ 保存数据到数据库（全局共享，只按年份更新）
  const saveExpensesToDB = async (year: number) => {
    try {
      const userId = getCurrentUserId();
      
      console.log('💾 开始保存人力费用数据,年份:', year);
      
      // 准备保存的数据
      const saveData = {
        year: year,
        totalBudget: summary.totalBudget,
        totalActual: summary.totalActual,
        items: expenses,
        monthlyTotals: summary.monthlyTotals,
        updatedAt: new Date(),
        updatedBy: userId || 'system'
      };
      
      console.log('💾 保存数据:', saveData);
      
      // 查询是否已存在
      const queryResult = await db.collection('hrExpenses')
        .where({ year: year })
        .get();
      
      if (queryResult.data && queryResult.data.length > 0) {
        // 更新现有记录
        const docId = queryResult.data[0]._id;
        console.log(`💾 更新${year}年度数据, docId:`, docId);
        await db.collection('hrExpenses')
          .doc(docId)
          .update(saveData);
        console.log('✅ 更新成功');
        // toast.success('保存成功'); // 已禁用保存成功提示
      } else {
        // 创建新记录
        console.log(`💾 创建${year}年度新数据`);
        await db.collection('hrExpenses').add({
          ...saveData,
          createdAt: new Date(),
          createdBy: userId || 'system'
        });
        console.log('✅ 创建成功');
        // toast.success('保存成功'); // 已禁用保存成功提示
      }
    } catch (error) {
      console.error('❌ 保存失败:', error);
      toast.error('保存失败');
      throw error;
    }
  };

  // ✅ 使用 useCallback 创建保存方法,避免无限循环
  const saveMethod = useCallback(async () => {
    try {
      onSavingChange?.(true);
      await saveExpensesToDB(selectedYear);
      onEditModeChange?.(false);
      setOriginalExpenses([]);
    } catch (error) {
      console.error('❌ 保存失败,保持编辑模式:', error);
    } finally {
      onSavingChange?.(false);
    }
  }, [selectedYear, expenses, onSavingChange, onEditModeChange]);

  // ✅ 暴露保存方法给父组件
  useEffect(() => {
    onSaveMethodReady?.(saveMethod);
  }, [saveMethod, onSaveMethodReady]);

  // ✅ 当进入编辑模式时备份数据(只在第一次进入时备份)
  useEffect(() => {
    if (isEditMode && originalExpenses.length === 0 && expenses.length > 0) {
      setOriginalExpenses(JSON.parse(JSON.stringify(expenses)));
    }
  }, [isEditMode]); // 只依赖 isEditMode,避免无限循环

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
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-left font-semibold border-r border-gray-300" style={{width: '152px', minWidth: '152px', maxWidth: '152px'}}>
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
            {expenses.map((expense, index) => (
              <tr key={expense.id} className={`transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {/* 费用科目 */}
                <td className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                  <div className="leading-relaxed">{expense.name}</div>
                </td>
                
                {/* 年度预算 */}
                <td className={`px-3 py-2 bg-emerald-50 border-r border-gray-200 transition-all ${
                  isEditMode && hoveredCell?.itemId === expense.id && hoveredCell?.field === 'budget'
                    ? 'ring-2 ring-emerald-400 bg-emerald-100'
                    : ''
                }`}
                onMouseEnter={() => isEditMode && setHoveredCell({itemId: expense.id, field: 'budget'})}
                onMouseLeave={() => setHoveredCell(null)}
                >
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={expense.annualBudget || ''}
                      onChange={(e) => handleBudgetChange(expense.id, e.target.value)}
                      className="w-full text-right bg-transparent focus:outline-none font-mono text-sm text-emerald-700 font-medium"
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="text-right font-mono text-sm text-emerald-700 font-medium">{formatNumber(expense.annualBudget)}</div>
                  )}
                </td>
                
                {/* 实际完成 */}
                <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-purple-700 bg-purple-50 border-r border-gray-200">
                  {formatNumber(expense.actualTotal)}
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
                      className={`px-2 py-2 border-r border-gray-200 transition-all ${
                        isEditMode && hoveredCell?.itemId === expense.id && hoveredCell?.field === `month${month}`
                          ? 'ring-2 ring-blue-400 bg-blue-100'
                          : month <= currentMonth ? 'bg-blue-50' : 'bg-gray-100'
                      }`}
                      onMouseEnter={() => isEditMode && setHoveredCell({itemId: expense.id, field: `month${month}`})}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{width: '80px', minWidth: '80px', maxWidth: '80px'}}
                    >
                      {canEdit ? (
                        <input
                          type="number"
                          step="0.01"
                          value={value || ''}
                          onChange={(e) => handleActualChange(expense.id, month, e.target.value)}
                          className="w-full text-right bg-transparent focus:outline-none font-mono text-sm text-blue-700"
                          placeholder="0.00"
                        />
                      ) : (
                        <div className={`text-right font-mono text-sm ${month <= currentMonth ? 'text-blue-700' : 'text-gray-400'}`}>
                          {formatNumber(value)}
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
