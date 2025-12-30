import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Lock, Star, Edit, Trash2, Save, X, ChevronUp, ChevronDown as MoveDown, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/cloudbase';
import { usePermissionContext } from '../../contexts/PermissionContext';

interface BudgetAccount {
  _id?: string;
  _openid?: string;
  id: string;
  name: string;
  year: number;
  order: number;
  type?: 'income' | 'summary' | 'expense' | 'percentage';
  total: number;
  totalUnit: string;
  isSystemParam: boolean;
  isExpanded: boolean;
  children: Array<{
    id: string;
    name: string;
    parentId: string;
    amount: number;
    amountUnit: string;
    order: number;
    isSystemParam: boolean;
  }>;
  formula?: Array<{
    type: 'account' | 'operator';
    value: string;
  }>;
  // ✅ 新增：计算值（用于百分率科目）
  calculatedValue?: number;
}

interface BudgetParametersManagementProps {
  year: number;
}

export const BudgetParametersManagement: React.FC<BudgetParametersManagementProps> = ({ year }) => {
  // ✅ 引入权限检查
  const { checkPermission, loading: permissionLoading } = usePermissionContext();
  
  // 添加 Tab 状态
  const [activeTab, setActiveTab] = useState<'profit-loss' | 'payroll'>('profit-loss');
  
  const [accounts, setAccounts] = useState<BudgetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BudgetAccount | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<BudgetAccount | null>(null);
  const [showSubAccountDialog, setShowSubAccountDialog] = useState(false);
  const [showEditSubAccountDialog, setShowEditSubAccountDialog] = useState(false);
  const [showDeleteSubAccountDialog, setShowDeleteSubAccountDialog] = useState(false);
  const [currentParentAccount, setCurrentParentAccount] = useState<BudgetAccount | null>(null);
  const [editingSubAccount, setEditingSubAccount] = useState<any>(null);
  const [deletingSubAccount, setDeletingSubAccount] = useState<any>(null);
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'summary' | 'expense' | 'percentage',
    totalUnit: '万元',
    isSystemParam: false
  });
  const [newSubAccountForm, setNewSubAccountForm] = useState({
    name: '',
    amountUnit: '万元',
    isSystemParam: false
  });
  const [editSubAccountForm, setEditSubAccountForm] = useState({
    name: '',
    amountUnit: '万元',
    isSystemParam: false
  });
  const [editAccountForm, setEditAccountForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'summary' | 'expense' | 'percentage',
    totalUnit: '万元',
    isSystemParam: false
  });
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  
  // ✅ 新增：汇总科目公式编辑对话框状态
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);
  const [editingFormulaAccount, setEditingFormulaAccount] = useState<BudgetAccount | null>(null);
  const [formulaInput, setFormulaInput] = useState<Array<{type: 'account' | 'operator' | 'number', value: string}>>([]);

  // 加载预算科目数据 - 根据当前Tab加载不同的数据
  useEffect(() => {
    loadAccounts();
  }, [year, activeTab]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // 根据Tab类型查询不同的科目
      // 损益参数使用原来的 budget_accounts 集合
      // 薪酬核算参数使用 payroll_accounts 集合
      const collectionName = activeTab === 'profit-loss' ? 'budget_accounts' : 'payroll_accounts';
      
      const result = await db.collection(collectionName)
        .where({
          year: year
        })
        .orderBy('order', 'asc')
        .limit(1000)
        .get();

      let loadedAccounts = result.data || [];
      
      // ✅ 如果是损益参数,计算利润率
      if (activeTab === 'profit-loss') {
        loadedAccounts = calculateProfitMargin(loadedAccounts);
      }

      setAccounts(loadedAccounts);
    } catch (error: any) {
      console.error('加载预算科目失败:', error);
      toast.error('加载预算科目失败');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 计算科目总额（递归计算所有子科目金额）
  const calculateAccountTotal = (account: BudgetAccount): number => {
    if (!account.children || account.children.length === 0) {
      return account.total || 0;
    }
    const childrenTotal = account.children.reduce((sum, child) => sum + (child.amount || 0), 0);
    return childrenTotal;
  };

  // ✅ 计算利润率
  const calculateProfitMargin = (accountsList: BudgetAccount[]): BudgetAccount[] => {
    // 找到营业收入和营业成本
    const revenueAccount = accountsList.find(acc => acc.name === '营业收入');
    const costAccount = accountsList.find(acc => acc.name === '营业成本');
    
    if (!revenueAccount || !costAccount) {
      return accountsList;
    }
    
    const revenue = calculateAccountTotal(revenueAccount);
    const cost = calculateAccountTotal(costAccount);
    
    // 利润率 = (营业收入 - 营业成本) / 营业成本 × 100%
    let profitMargin = 0;
    if (cost !== 0) {
      profitMargin = ((revenue - cost) / cost) * 100;
    }
    
    // 更新利润率科目的计算值
    return accountsList.map(acc => {
      if (acc.name === '利润率' && acc.type === 'percentage') {
        return {
          ...acc,
          calculatedValue: profitMargin,
          total: profitMargin
        };
      }
      return acc;
    });
  };

  // 生成新的科目ID
  const generateAccountId = () => {
    return `primary_${Date.now()}`;
  };

  // 获取当前使用的集合名称
  const getCollectionName = () => {
    return activeTab === 'profit-loss' ? 'budget_accounts' : 'payroll_accounts';
  };

  // 新增一级科目
  const handleAddAccount = async () => {
    if (!newAccountForm.name.trim()) {
      toast.error('请输入科目名称');
      return;
    }

    try {
      const newAccount: BudgetAccount = {
        id: generateAccountId(),
        name: newAccountForm.name.trim(),
        year: year,
        order: accounts.length + 1,
        type: newAccountForm.type,
        total: 0,
        totalUnit: newAccountForm.totalUnit,
        isSystemParam: newAccountForm.isSystemParam,
        isExpanded: true,
        children: []
      };

      await db.collection(getCollectionName()).add(newAccount);

      setShowAddDialog(false);
      setNewAccountForm({
        name: '',
        type: 'expense',
        totalUnit: '万元',
        isSystemParam: false
      });
      loadAccounts();
    } catch (error) {
      console.error('新增科目失败:', error);
      toast.error('新增科目失败');
    }
  };

  // 打开编辑对话框
  const handleOpenEdit = (account: BudgetAccount) => {
    setEditingAccount(account);
    setEditAccountForm({
      name: account.name,
      type: account.type || 'expense',
      totalUnit: account.totalUnit,
      isSystemParam: account.isSystemParam
    });
    setShowEditDialog(true);
  };

  // 编辑一级科目
  const handleEditAccount = async () => {
    if (!editingAccount) return;

    if (!editAccountForm.name.trim()) {
      toast.error('请输入科目名称');
      return;
    }

    try {
      // 更新数据库
      await db.collection(getCollectionName())
        .where({
          _id: editingAccount._id
        })
        .update({
          name: editAccountForm.name.trim(),
          type: editAccountForm.type,
          totalUnit: editAccountForm.totalUnit,
          isSystemParam: editAccountForm.isSystemParam
        });

      setShowEditDialog(false);
      setEditingAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('编辑科目失败:', error);
      toast.error('编辑科目失败');
    }
  };

  // 打开删除确认对话框
  const handleOpenDeleteDialog = (account: BudgetAccount) => {
    console.log('🔴 点击删除按钮，科目信息:', {
      _id: account._id,
      id: account.id,
      name: account.name,
      isSystemParam: account.isSystemParam,
      完整对象: account
    });
    setDeletingAccount(account);
    setShowDeleteDialog(true);
    console.log('🔴 已设置删除对话框状态为 true');
  };

  // 删除一级科目
  const handleDeleteAccount = async () => {
    console.log('🟢 开始执行删除操作');
    console.log('🟢 待删除科目:', deletingAccount);

    if (!deletingAccount) {
      console.log('❌ deletingAccount 为空，退出');
      return;
    }

    if (!deletingAccount._id) {
      console.log('❌ deletingAccount._id 为空，退出');
      console.log('❌ deletingAccount 完整对象:', deletingAccount);
      return;
    }

    console.log('🟢 准备删除，_id:', deletingAccount._id);

    try {
      console.log('🟢 开始调用数据库删除方法...');
      
      // 使用 doc(_id).remove() 方法删除
      const result = await db.collection(getCollectionName())
        .doc(deletingAccount._id)
        .remove();

      console.log('✅ 删除结果:', result);
      console.log('✅ 删除成功，准备关闭对话框和刷新列表');
      
      toast.success('删除成功');
      setShowDeleteDialog(false);
      setDeletingAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('❌ 删除科目失败:', error);
      console.error('❌ 错误详情:', JSON.stringify(error, null, 2));
      toast.error('删除科目失败');
    }
  };

  // 上移科目
  const handleMoveUp = async (account: BudgetAccount, index: number) => {
    if (index === 0) return; // 已经是第一个，无法上移

    try {
      const prevAccount = accounts[index - 1];
      
      // 交换 order 值
      await db.collection(getCollectionName())
        .where({ _id: account._id })
        .update({ order: prevAccount.order });

      await db.collection(getCollectionName())
        .where({ _id: prevAccount._id })
        .update({ order: account.order });

      // 不显示提示，直接刷新
      loadAccounts();
    } catch (error) {
      console.error('上移失败:', error);
      toast.error('上移失败');
    }
  };

  // 下移科目
  const handleMoveDown = async (account: BudgetAccount, index: number) => {
    if (index === accounts.length - 1) return; // 已经是最后一个，无法下移

    try {
      const nextAccount = accounts[index + 1];
      
      // 交换 order 值
      await db.collection(getCollectionName())
        .where({ _id: account._id })
        .update({ order: nextAccount.order });

      await db.collection(getCollectionName())
        .where({ _id: nextAccount._id })
        .update({ order: account.order });

      // 不显示提示，直接刷新
      loadAccounts();
    } catch (error) {
      console.error('下移失败:', error);
      toast.error('下移失败');
    }
  };

  // ==================== 二级科目功能 ====================

  // 切换一级科目的展开/收起状态
  const toggleAccountExpand = (accountId: string) => {
    setAccounts(prev => 
      prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, isExpanded: !acc.isExpanded }
          : acc
      )
    );
  };

  // 打开新增二级科目对话框
  const handleOpenAddSubAccount = (parentAccount: BudgetAccount) => {
    // 汇总类和百分率科目不能添加子科目
    if (parentAccount.type === 'summary' || parentAccount.type === 'percentage') {
      toast.error('汇总类和百分率科目不能设立子科目');
      return;
    }
    
    setCurrentParentAccount(parentAccount);
    setNewSubAccountForm({
      name: '',
      amountUnit: '万元',
      isSystemParam: false
    });
    setShowSubAccountDialog(true);
  };

  // 新增二级科目
  const handleAddSubAccount = async () => {
    if (!currentParentAccount || !currentParentAccount._id) {
      toast.error('请先选择一级科目');
      return;
    }

    if (!newSubAccountForm.name.trim()) {
      toast.error('请输入二级科目名称');
      return;
    }

    try {
      if (!currentParentAccount._id) {
        toast.error('父科目ID不存在');
        return;
      }

      const parentAccount = await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .get();

      // 🐛 修复：.doc().get() 返回的 data 可能是数组格式，需要取第一个元素
      const parentData = (Array.isArray(parentAccount.data) ? parentAccount.data[0] : parentAccount.data) as any;
      
      console.log('📊 [添加二级科目] parentAccount.data 类型:', Array.isArray(parentAccount.data) ? '数组' : '对象');
      console.log('📊 [添加二级科目] parentData:', parentData);
      console.log('📊 [添加二级科目] 当前 children 数量:', parentData?.children?.length || 0);
      
      if (!parentData) {
        toast.error('未找到父科目数据');
        return;
      }
      
      const children = (parentData?.children || []) as any[];
      const newSubAccount = {
        id: `sub_${Date.now()}`,
        name: newSubAccountForm.name.trim(),
        amountUnit: newSubAccountForm.amountUnit,
        isSystemParam: newSubAccountForm.isSystemParam,
        order: children.length
      };
      
      console.log('📊 [添加二级科目] 新二级科目:', newSubAccount);
      console.log('📊 [添加二级科目] 更新后 children 数量:', children.length + 1);

      await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .update({
          children: [...children, newSubAccount]
        });

      toast.success('二级科目添加成功');
      setShowSubAccountDialog(false);
      setCurrentParentAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('添加二级科目失败:', error);
      toast.error('添加二级科目失败');
    }
  };

  // 打开编辑二级科目对话框
  const handleOpenEditSubAccount = (parentAccount: BudgetAccount, subAccount: any) => {
    setCurrentParentAccount(parentAccount);
    setEditingSubAccount(subAccount);
    setEditSubAccountForm({
      name: subAccount.name,
      amountUnit: subAccount.amountUnit,
      isSystemParam: subAccount.isSystemParam
    });
    setShowEditSubAccountDialog(true);
  };

  // 编辑二级科目
  const handleEditSubAccount = async () => {
    if (!currentParentAccount || !editingSubAccount) return;

    if (!editSubAccountForm.name.trim()) {
      toast.error('请输入二级科目名称');
      return;
    }

    try {
      if (!currentParentAccount._id) {
        toast.error('父科目ID不存在');
        return;
      }

      const parentAccount = await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .get();

      // 🐛 修复：.doc().get() 返回的 data 可能是数组格式，需要取第一个元素
      const parentData = (Array.isArray(parentAccount.data) ? parentAccount.data[0] : parentAccount.data) as any;
      
      if (!parentData) {
        toast.error('未找到父科目数据');
        return;
      }
      
      const children = parentData?.children || [];
      const updatedChildren = children.map((child: any) =>
        child.id === editingSubAccount.id
          ? {
              ...child,
              name: editSubAccountForm.name.trim(),
              amountUnit: editSubAccountForm.amountUnit,
              isSystemParam: editSubAccountForm.isSystemParam
            }
          : child
      );

      await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .update({
          children: updatedChildren
        });

      toast.success('二级科目编辑成功');
      setShowEditSubAccountDialog(false);
      setCurrentParentAccount(null);
      setEditingSubAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('编辑二级科目失败:', error);
      toast.error('编辑二级科目失败');
    }
  };

  // 打开删除二级科目对话框
  const handleOpenDeleteSubAccount = (parentAccount: BudgetAccount, subAccount: any) => {
    setCurrentParentAccount(parentAccount);
    setDeletingSubAccount(subAccount);
    setShowDeleteSubAccountDialog(true);
  };

  // 删除二级科目
  const handleDeleteSubAccount = async () => {
    if (!currentParentAccount || !deletingSubAccount) return;

    try {
      if (!currentParentAccount._id) {
        toast.error('父科目ID不存在');
        return;
      }

      const parentAccount = await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .get();

      // 🐛 修复：.doc().get() 返回的 data 可能是数组格式，需要取第一个元素
      const parentData = (Array.isArray(parentAccount.data) ? parentAccount.data[0] : parentAccount.data) as any;
      
      if (!parentData) {
        toast.error('未找到父科目数据');
        return;
      }
      
      const children = parentData?.children || [];
      const updatedChildren = children.filter((child: any) => child.id !== deletingSubAccount.id);

      await db.collection(getCollectionName())
        .doc(currentParentAccount._id)
        .update({
          children: updatedChildren
        });

      toast.success('二级科目删除成功');
      setShowDeleteSubAccountDialog(false);
      setCurrentParentAccount(null);
      setDeletingSubAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('删除二级科目失败:', error);
      toast.error('删除二级科目失败');
    }
  };

  // 上移二级科目
  const handleMoveUpSubAccount = async (parentAccount: BudgetAccount, subAccount: any, index: number) => {
    if (index === 0) return;

    try {
      if (!parentAccount._id) {
        toast.error('父科目ID不存在');
        return;
      }

      const parent = await db.collection(getCollectionName())
        .doc(parentAccount._id)
        .get();

      // 🐛 修复：.doc().get() 返回的 data 可能是数组格式，需要取第一个元素
      const parentData = (Array.isArray(parent.data) ? parent.data[0] : parent.data) as any;
      
      if (!parentData) {
        toast.error('未找到父科目数据');
        return;
      }
      
      const children = [...(parentData?.children || [])];
      
      if (index <= 0 || index >= children.length) {
        toast.error('无法上移');
        return;
      }
      
      const prevChild = children[index - 1];
      
      if (!prevChild || prevChild.order === undefined) {
        toast.error('上一个科目数据异常');
        return;
      }

      // 交换 order 值
      children[index] = { ...children[index], order: prevChild.order };
      children[index - 1] = { ...prevChild, order: subAccount.order };

      // 重新排序
      children.sort((a, b) => a.order - b.order);

      await db.collection(getCollectionName())
        .doc(parentAccount._id)
        .update({ children });

      loadAccounts();
    } catch (error) {
      console.error('上移失败:', error);
      toast.error('上移失败');
    }
  };

  // 下移二级科目
  const handleMoveDownSubAccount = async (parentAccount: BudgetAccount, subAccount: any, index: number) => {
    if (!parentAccount.children || index === parentAccount.children.length - 1) return;

    try {
      if (!parentAccount._id) {
        toast.error('父科目ID不存在');
        return;
      }

      const parent = await db.collection(getCollectionName())
        .doc(parentAccount._id)
        .get();

      // 🐛 修复：.doc().get() 返回的 data 可能是数组格式，需要取第一个元素
      const parentData = (Array.isArray(parent.data) ? parent.data[0] : parent.data) as any;
      
      if (!parentData) {
        toast.error('未找到父科目数据');
        return;
      }
      
      const children = [...(parentData?.children || [])];
      
      if (index < 0 || index >= children.length - 1) {
        toast.error('无法下移');
        return;
      }
      
      const nextChild = children[index + 1];
      
      if (!nextChild || nextChild.order === undefined) {
        toast.error('下一个科目数据异常');
        return;
      }

      // 交换 order 值
      children[index] = { ...children[index], order: nextChild.order };
      children[index + 1] = { ...nextChild, order: subAccount.order };

      // 重新排序
      children.sort((a, b) => a.order - b.order);

      await db.collection(getCollectionName())
        .doc(parentAccount._id)
        .update({ children });

      loadAccounts();
    } catch (error) {
      console.error('下移失败:', error);
      toast.error('下移失败');
    }
  };

  // 复制上一年度科目
  const handleCopyPreviousYear = async () => {
    if (year <= 2025) {
      toast.error('仅2026年及以后年度支持此功能');
      return;
    }

    setIsCopying(true);
    try {
      const previousYear = year - 1;

      // 查询上一年度的所有科目
      const previousYearAccounts = await db.collection(getCollectionName())
        .where({
          year: previousYear
        })
        .orderBy('order', 'asc')
        .limit(1000)
        .get();

      if (!previousYearAccounts.data || previousYearAccounts.data.length === 0) {
        toast.error(`${previousYear}年度没有财务科目数据`);
        setIsCopying(false);
        return;
      }

      // 删除当前年度的所有科目
      const currentYearAccounts = await db.collection(getCollectionName())
        .where({
          year: year
        })
        .limit(1000)
        .get();

      // 批量删除当前年度科目
      for (const account of currentYearAccounts.data) {
        await db.collection(getCollectionName())
          .doc(account._id)
          .remove();
      }

      // 复制上一年度科目到当前年度
      const newAccounts = previousYearAccounts.data.map((account: any) => {
        const { _id, _openid, ...accountData } = account;
        return {
          ...accountData,
          year: year,
          total: 0, // 重置金额为0
          children: (accountData.children || []).map((child: any) => ({
            ...child,
            amount: 0 // 重置二级科目金额为0
          }))
        };
      });

      // 批量插入新科目
      for (const account of newAccounts) {
        await db.collection(getCollectionName()).add(account);
      }

      toast.success(`成功复制${previousYear}年度的${newAccounts.length}个科目到${year}年度`);
      setShowCopyDialog(false);
      loadAccounts();
    } catch (error) {
      console.error('复制科目失败:', error);
      toast.error('复制科目失败，请重试');
    } finally {
      setIsCopying(false);
    }
  };

  // ==================== 汇总科目公式编辑功能 ====================

  // 打开公式编辑对话框
  const handleOpenFormulaDialog = (account: BudgetAccount) => {
    setEditingFormulaAccount(account);
    setFormulaInput(account.formula || []);
    setShowFormulaDialog(true);
  };

  // 点击科目按钮，追加到公式
  const handleAppendAccount = (accountName: string) => {
    setFormulaInput(prev => [...prev, { type: 'account', value: accountName }]);
  };

  // 点击运算符按钮，追加到公式
  const handleAppendOperator = (operator: string) => {
    setFormulaInput(prev => [...prev, { type: 'operator', value: operator }]);
  };

  // 点击数字按钮，追加到公式
  const handleAppendNumber = (number: string) => {
    setFormulaInput(prev => {
      const lastItem = prev[prev.length - 1];
      // 如果最后一项是数字，则合并
      if (lastItem && lastItem.type === 'number') {
        return [
          ...prev.slice(0, -1),
          { type: 'number', value: lastItem.value + number }
        ];
      }
      // 否则新增一个数字项
      return [...prev, { type: 'number', value: number }];
    });
  };

  // 清空公式
  const handleClearFormula = () => {
    setFormulaInput([]);
  };

  // 退格删除
  const handleBackspace = () => {
    setFormulaInput(prev => prev.slice(0, -1));
  };

  // 循环依赖检测算法
  const detectCircularDependency = (
    targetAccountId: string,
    formula: Array<{type: string, value: string}>,
    allAccounts: BudgetAccount[]
  ): boolean => {
    const visited = new Set<string>();
    const path = new Set<string>(); // 记录当前路径
    
    const dfs = (currentId: string, newFormula?: Array<{type: string, value: string}>): boolean => {
      // 如果在当前路径中已经访问过，说明形成循环
      if (path.has(currentId)) {
        return true;
      }
      
      // 如果已经完全访问过（在之前的路径中），无需重复检查
      if (visited.has(currentId)) {
        return false;
      }
      
      path.add(currentId);
      visited.add(currentId);
      
      // 查找当前科目
      const currentAccount = allAccounts.find(acc => acc.id === currentId);
      if (!currentAccount) {
        path.delete(currentId);
        return false;
      }
      
      // 使用新公式（如果是正在编辑的科目）或现有公式
      const formulaToCheck = (currentId === targetAccountId && newFormula) 
        ? newFormula 
        : currentAccount.formula;
      
      if (!formulaToCheck) {
        path.delete(currentId);
        return false;
      }
      
      // 遍历公式中引用的科目
      for (const item of formulaToCheck) {
        if (item.type === 'account') {
          const referencedAccount = allAccounts.find(acc => acc.name === item.value);
          if (referencedAccount) {
            // 如果引用了自己，直接返回循环
            if (referencedAccount.id === currentId) {
              path.delete(currentId);
              return true;
            }
            // 递归检查引用的科目
            if (dfs(referencedAccount.id)) {
              path.delete(currentId);
              return true;
            }
          }
        }
      }
      
      path.delete(currentId);
      return false;
    };
    
    // 从目标科目开始检查，使用新公式
    return dfs(targetAccountId, formula);
  };

  // 保存公式
  const handleSaveFormula = async () => {
    if (!editingFormulaAccount) return;

    // 检查循环依赖
    if (detectCircularDependency(editingFormulaAccount.id, formulaInput, accounts)) {
      toast.error('检测到循环依赖，无法保存！请检查公式中的科目引用。');
      return;
    }

    try {
      await db.collection(getCollectionName())
        .where({ _id: editingFormulaAccount._id })
        .update({ formula: formulaInput });

      toast.success('公式保存成功');
      setShowFormulaDialog(false);
      setEditingFormulaAccount(null);
      setFormulaInput([]);
      loadAccounts();
    } catch (error) {
      console.error('保存公式失败:', error);
      toast.error('保存公式失败');
    }
  };

  // 渲染公式编辑对话框
  const renderFormulaDialog = () => {
    if (!showFormulaDialog || !editingFormulaAccount) return null;

    // 获取所有一级科目（排除当前编辑的科目）
    const availableAccounts = accounts.filter(acc => acc.id !== editingFormulaAccount.id);

    // 运算符列表
    const operators = ['+', '-', '×', '÷', '(', ')'];

    // 数字按钮
    const numbers = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

    // 格式化显示公式
    const formatFormula = () => {
      return formulaInput.map(item => {
        if (item.type === 'account') {
          return `【${item.value}】`;
        }
        return item.value;
      }).join(' ');
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in duration-200 flex flex-col" style={{ height: '80vh' }}>
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                编辑公式：{editingFormulaAccount.name}
              </h3>
              <button
                onClick={() => {
                  setShowFormulaDialog(false);
                  setEditingFormulaAccount(null);
                  setFormulaInput([]);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 上半部分：公式输入框 */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4 min-h-[80px] font-mono text-lg">
              {formulaInput.length === 0 ? (
                <span className="text-gray-400">点击下方按钮构建公式...</span>
              ) : (
                formatFormula()
              )}
            </div>
          </div>

          {/* 下半部分：左右分区 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧：运算符和清空/退格 */}
            <div className="w-1/3 p-4 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">运算符</h4>
              <div className="grid grid-cols-3 gap-2">
                {operators.map(op => (
                  <button
                    key={op}
                    onClick={() => handleAppendOperator(op)}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold text-lg"
                  >
                    {op}
                  </button>
                ))}
                <button
                  onClick={handleClearFormula}
                  className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold text-sm"
                >
                  清空
                </button>
                <button
                  onClick={handleBackspace}
                  className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-sm col-span-2"
                >
                  退格 ⌫
                </button>
              </div>
            </div>

            {/* 右侧：科目列表和数字 */}
            <div className="w-2/3 p-4 overflow-y-auto">
              {/* 科目列表 */}
              <h4 className="text-sm font-semibold text-gray-700 mb-3">一级科目</h4>
              <div className="space-y-2 mb-6 max-h-[40%] overflow-y-auto">
                {availableAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleAppendAccount(acc.name)}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-left text-sm font-medium"
                  >
                    {acc.name}
                  </button>
                ))}
              </div>

              {/* 数字按钮 */}
              <h4 className="text-sm font-semibold text-gray-700 mb-3">数字</h4>
              <div className="grid grid-cols-3 gap-2">
                {numbers.map(num => (
                  <button
                    key={num}
                    onClick={() => handleAppendNumber(num)}
                    className="px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-bold text-lg"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              onClick={() => {
                setShowFormulaDialog(false);
                setEditingFormulaAccount(null);
                setFormulaInput([]);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSaveFormula}
              className="px-5 py-2.5 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              保存公式
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染复制年度科目确认对话框
  const renderCopyDialog = () => {
    if (!showCopyDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">⚠️ 复制上一年度科目</h3>
              <button
                onClick={() => setShowCopyDialog(false)}
                className="text-white/80 hover:text-white transition-colors"
                disabled={isCopying}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-4">
            {/* 警告信息 */}
            <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-600 text-2xl">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-900 mb-2">
                    重要提示：数据将被完全替换！
                  </p>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 复制上一年度（{year - 1}年）的所有财务科目</li>
                    <li>• <strong className="text-red-900">当前年度（{year}年）的所有科目将被删除</strong></li>
                    <li>• 此操作不可撤销，可能导致数据丢失</li>
                    <li>• 复制后的科目金额将重置为0</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 操作说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>复制内容：</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>✓ 一级科目及其二级科目</li>
                <li>✓ 科目类型（收入/费用/汇总）</li>
                <li>✓ 科目属性（系统项/普通项）</li>
                <li>✓ 科目顺序</li>
              </ul>
            </div>

            {/* 确认提示 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900 font-medium">
                请仔细确认后再执行此操作！
              </p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setShowCopyDialog(false)}
              disabled={isCopying}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleCopyPreviousYear}
              disabled={isCopying}
              className="px-5 py-2.5 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCopying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>复制中...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>确认复制</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染新增科目对话框
  const renderAddDialog = () => {
    if (!showAddDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">新增一级科目</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 表单内容 */}
          <div className="p-6 space-y-5">
            {/* 科目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                科目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAccountForm.name}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="例如：营业收入、管理费用"
                autoFocus
              />
            </div>

            {/* 科目类型和参数类型 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  科目类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAccountForm.type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setNewAccountForm({ 
                      ...newAccountForm, 
                      type: newType,
                      totalUnit: newType === 'percentage' ? '%' : newAccountForm.totalUnit
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="income">收入类</option>
                  <option value="expense">费用类</option>
                  <option value="summary">汇总类</option>
                  <option value="percentage">百分率</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  单位
                </label>
                <select
                  value={newAccountForm.totalUnit}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, totalUnit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="万元">万元</option>
                  <option value="元">元</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>

            {/* 参数类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                参数类型 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="isSystemParam"
                    checked={newAccountForm.isSystemParam === true}
                    onChange={() => setNewAccountForm({ ...newAccountForm, isSystemParam: true })}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                    🔒 系统项（不可删除）
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="isSystemParam"
                    checked={newAccountForm.isSystemParam === false}
                    onChange={() => setNewAccountForm({ ...newAccountForm, isSystemParam: false })}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                    ⭐ 普通项（可编辑删除）
                  </span>
                </label>
              </div>
            </div>

            {/* 说明提示 */}
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">类型说明：</p>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>收入类</strong>：营业收入等收入科目</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>费用类</strong>：固定费用、变动费用、财务费用等</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>汇总类</strong>：需要通过公式计算的科目（如净利润）</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>百分率</strong>：以百分比形式计算的指标（如利润率）</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setShowAddDialog(false)}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleAddAccount}
              className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染编辑科目对话框
  const renderEditDialog = () => {
    if (!showEditDialog || !editingAccount) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">编辑一级科目</h3>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingAccount(null);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 表单内容 */}
          <div className="p-6 space-y-5">
            {/* 科目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                科目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editAccountForm.name}
                onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="例如：营业收入、管理费用"
                autoFocus
              />
            </div>

            {/* 科目类型和金额单位 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  科目类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={editAccountForm.type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setEditAccountForm({ 
                      ...editAccountForm, 
                      type: newType,
                      totalUnit: newType === 'percentage' ? '%' : editAccountForm.totalUnit
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="income">收入类</option>
                  <option value="expense">费用类</option>
                  <option value="summary">汇总类</option>
                  <option value="percentage">百分率</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  单位
                </label>
                <select
                  value={editAccountForm.totalUnit}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, totalUnit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="万元">万元</option>
                  <option value="元">元</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>

            {/* 参数类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                参数类型 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="editIsSystemParam"
                    checked={editAccountForm.isSystemParam === true}
                    onChange={() => setEditAccountForm({ ...editAccountForm, isSystemParam: true })}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                    🔒 系统项（不可删除）
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="editIsSystemParam"
                    checked={editAccountForm.isSystemParam === false}
                    onChange={() => setEditAccountForm({ ...editAccountForm, isSystemParam: false })}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                    ⭐ 普通项（可编辑删除）
                  </span>
                </label>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4">
              <p className="text-sm text-yellow-800 flex items-start">
                <span className="text-lg mr-2">⚠️</span>
                <span>修改科目类型或参数类型可能会影响已关联的预算数据，请谨慎操作。</span>
              </p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowEditDialog(false);
                setEditingAccount(null);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleEditAccount}
              className="px-5 py-2.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              保存修改
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染新增二级科目对话框
  const renderAddSubAccountDialog = () => {
    if (!showSubAccountDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">新增二级科目</h3>
              <button
                onClick={() => {
                  setShowSubAccountDialog(false);
                  setCurrentParentAccount(null);
                }}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 父科目信息 */}
          {currentParentAccount && (
            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
              <p className="text-sm text-blue-900">
                <span className="font-medium">所属一级科目：</span>
                <span className="ml-2">{currentParentAccount.name}</span>
              </p>
            </div>
          )}

          {/* 表单内容 */}
          <div className="p-6 space-y-4">
            {/* 科目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                二级科目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSubAccountForm.name}
                onChange={(e) => setNewSubAccountForm({ ...newSubAccountForm, name: e.target.value })}
                placeholder="请输入二级科目名称"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* 单位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                单位
              </label>
              <select
                value={newSubAccountForm.amountUnit}
                onChange={(e) => setNewSubAccountForm({ ...newSubAccountForm, amountUnit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="万元">万元</option>
                <option value="元">元</option>
                <option value="%">%</option>
              </select>
            </div>

            {/* 系统项标识 */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <input
                type="checkbox"
                id="subIsSystemParam"
                checked={newSubAccountForm.isSystemParam}
                onChange={(e) => setNewSubAccountForm({ ...newSubAccountForm, isSystemParam: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="subIsSystemParam" className="text-sm text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>标记为系统项（系统项不可删除）</span>
              </label>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowSubAccountDialog(false);
                setCurrentParentAccount(null);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleAddSubAccount}
              className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 inline-block mr-1" />
              添加
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染编辑二级科目对话框
  const renderEditSubAccountDialog = () => {
    if (!showEditSubAccountDialog || !editingSubAccount) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">编辑二级科目</h3>
              <button
                onClick={() => {
                  setShowEditSubAccountDialog(false);
                  setCurrentParentAccount(null);
                  setEditingSubAccount(null);
                }}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 父科目信息 */}
          {currentParentAccount && (
            <div className="bg-green-50 px-6 py-3 border-b border-green-100">
              <p className="text-sm text-green-900">
                <span className="font-medium">所属一级科目：</span>
                <span className="ml-2">{currentParentAccount.name}</span>
              </p>
            </div>
          )}

          {/* 表单内容 */}
          <div className="p-6 space-y-4">
            {/* 科目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                二级科目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editSubAccountForm.name}
                onChange={(e) => setEditSubAccountForm({ ...editSubAccountForm, name: e.target.value })}
                placeholder="请输入二级科目名称"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              />
            </div>

            {/* 单位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                单位
              </label>
              <select
                value={editSubAccountForm.amountUnit}
                onChange={(e) => setEditSubAccountForm({ ...editSubAccountForm, amountUnit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              >
                <option value="万元">万元</option>
                <option value="元">元</option>
                <option value="%">%</option>
              </select>
            </div>

            {/* 系统项标识 */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <input
                type="checkbox"
                id="editSubIsSystemParam"
                checked={editSubAccountForm.isSystemParam}
                onChange={(e) => setEditSubAccountForm({ ...editSubAccountForm, isSystemParam: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <label htmlFor="editSubIsSystemParam" className="text-sm text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>标记为系统项（系统项不可删除）</span>
              </label>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowEditSubAccountDialog(false);
                setCurrentParentAccount(null);
                setEditingSubAccount(null);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleEditSubAccount}
              className="px-5 py-2.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              <Save className="w-4 h-4 inline-block mr-1" />
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染删除二级科目确认对话框
  const renderDeleteSubAccountDialog = () => {
    if (!showDeleteSubAccountDialog || !deletingSubAccount) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">确认删除二级科目</h3>
              <button
                onClick={() => {
                  setShowDeleteSubAccountDialog(false);
                  setCurrentParentAccount(null);
                  setDeletingSubAccount(null);
                }}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-4">
            {/* 警告图标和提示 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 text-base mb-2">
                  确定要删除二级科目 <strong className="text-red-600">"{deletingSubAccount.name}"</strong> 吗？
                </p>
                <p className="text-sm text-gray-600">
                  此操作不可恢复，请谨慎操作
                </p>
              </div>
            </div>

            {/* 科目信息 */}
            {currentParentAccount && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">所属一级科目：</span>
                  <span className="text-gray-900 font-medium">{currentParentAccount.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">二级科目名称：</span>
                  <span className="text-gray-900 font-medium">{deletingSubAccount.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">单位：</span>
                  <span className="text-gray-900">{deletingSubAccount.amountUnit}</span>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteSubAccountDialog(false);
                setCurrentParentAccount(null);
                setDeletingSubAccount(null);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleDeleteSubAccount}
              className="px-5 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染删除确认对话框
  const renderDeleteDialog = () => {
    if (!showDeleteDialog || !deletingAccount) return null;

    const hasChildren = deletingAccount.children && deletingAccount.children.length > 0;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">确认删除科目</h3>
              <button
                onClick={() => {
                  console.log('🟡 关闭删除对话框');
                  setShowDeleteDialog(false);
                  setDeletingAccount(null);
                }}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-4">
            {/* 警告图标和提示 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 text-base mb-2">
                  确定要删除科目 <strong className="text-red-600">"{deletingAccount.name}"</strong> 吗？
                </p>
                <p className="text-sm text-gray-600">
                  此操作不可恢复，请谨慎操作
                </p>
              </div>
            </div>

            {/* 二级科目警告 */}
            {hasChildren && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      该科目包含 <strong>{deletingAccount.children.length}</strong> 个二级科目
                    </p>
                    <p className="text-xs text-yellow-800">
                      删除后，所有二级科目也将被一并删除，且无法恢复
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 科目信息摘要 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">科目名称：</span>
                <span className="text-gray-900 font-medium">{deletingAccount.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">科目类型：</span>
                <span className="text-gray-900">
                  {deletingAccount.type === 'income' && '收入类'}
                  {deletingAccount.type === 'expense' && '费用类'}
                  {deletingAccount.type === 'summary' && '汇总类'}
                  {deletingAccount.type === 'percentage' && '百分率'}
                </span>
              </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">单位：</span>
                  <span className="text-gray-900">{deletingAccount.totalUnit}</span>
                </div>
              {hasChildren && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">包含二级科目：</span>
                  <span className="text-red-600 font-medium">{deletingAccount.children.length} 个</span>
                </div>
              )}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                console.log('🟡 取消删除');
                setShowDeleteDialog(false);
                setDeletingAccount(null);
              }}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={() => {
                console.log('🟢 用户点击了确认删除按钮');
                handleDeleteAccount();
              }}
              className="px-5 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染科目列表项
  const renderAccountItem = (account: BudgetAccount, index: number) => {
    const typeColor = {
      income: 'text-green-600 bg-green-50',
      expense: 'text-red-600 bg-red-50',
      summary: 'text-blue-600 bg-blue-50',
      percentage: 'text-purple-600 bg-purple-50'
    };

    const typeLabel = {
      income: '收入',
      expense: '费用',
      summary: '汇总',
      percentage: '百分率'
    };

    const hasChildren = account.children && account.children.length > 0;

    return (
      <div key={account.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        {/* 一级科目头部 */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 展开/收起按钮 */}
              <button
                onClick={() => toggleAccountExpand(account.id)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={account.isExpanded ? '收起' : '展开'}
              >
                {account.isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>

              {/* 系统/自定义标识 */}
              {account.isSystemParam ? (
                <div title="系统科目">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              ) : (
                <div title="自定义科目">
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
              )}

              {/* 科目名称 */}
              <span className="font-medium text-gray-900">{account.name}</span>

              {/* 科目类型标签 */}
              {account.type && (
                <span className={`px-2 py-0.5 text-xs rounded ${typeColor[account.type]}`}>
                  {typeLabel[account.type]}
                </span>
              )}

              {/* ✅ 百分率科目显示计算值 */}
              {account.type === 'percentage' && account.calculatedValue !== undefined && (
                <span className="text-sm font-semibold text-purple-600">
                  {account.calculatedValue.toFixed(2)}%
                </span>
              )}

              {/* 单位 */}
              <span className="text-sm text-gray-500">({account.totalUnit})</span>

              {/* 二级科目数量提示 */}
              {hasChildren && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {account.children.length} 个二级科目
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 上移按钮 */}
              <button
                onClick={() => handleMoveUp(account, index)}
                disabled={index === 0}
                className={`p-1.5 rounded transition-colors ${
                  index === 0 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="上移"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* 下移按钮 */}
              <button
                onClick={() => handleMoveDown(account, index)}
                disabled={index === accounts.length - 1}
                className={`p-1.5 rounded transition-colors ${
                  index === accounts.length - 1
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="下移"
              >
                <MoveDown className="w-4 h-4" />
              </button>
              
              {/* 新增二级科目按钮 - 仅损益参数显示,薪酬核算参数不显示,汇总类和百分率科目不可添加 */}
              {activeTab === 'profit-loss' && checkPermission('budget.parameters', 'create') && (
                <button
                  onClick={() => handleOpenAddSubAccount(account)}
                  disabled={account.type === 'summary' || account.type === 'percentage'}
                  className={`p-1.5 rounded transition-colors ${
                    account.type === 'summary' || account.type === 'percentage'
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-purple-600 hover:bg-purple-50'
                  }`}
                  title={
                    account.type === 'summary' || account.type === 'percentage' 
                      ? '汇总类和百分率科目不能设立子科目' 
                      : '新增二级科目'
                  }
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {/* 编辑公式按钮 - 汇总类和百分率科目显示 */}
              {(account.type === 'summary' || account.type === 'percentage') && checkPermission('budget.parameters', 'edit') && (
                <button
                  onClick={() => handleOpenFormulaDialog(account)}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                  title="编辑公式"
                >
                  <span className="text-xs font-bold">f(x)</span>
                </button>
              )}

              {/* 编辑按钮 - 所有科目都可以编辑 */}
              {checkPermission('budget.parameters', 'edit') && (
                <button
                  onClick={() => handleOpenEdit(account)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="编辑科目"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              
              {/* 删除按钮 - 只有非系统项才显示 */}
              {!account.isSystemParam && checkPermission('budget.parameters', 'delete') && (
                <button
                  onClick={(e) => {
                    console.log('🔵 删除按钮被点击');
                    console.log('🔵 点击事件对象:', e);
                    console.log('🔵 account 对象:', account);
                    handleOpenDeleteDialog(account);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="删除科目"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 二级科目列表 */}
        {account.isExpanded && hasChildren && (
          <div className="bg-gray-50 border-t border-gray-200">
            <div className="p-4 space-y-2">
              {account.children.map((subAccount, subIndex) => (
                <div 
                  key={subAccount.id} 
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* 二级标识 */}
                    <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center">
                      <span className="text-xs text-blue-600 font-medium">二级</span>
                    </div>

                    {/* 系统项标识 */}
                    {subAccount.isSystemParam && (
                      <div title="系统项">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}

                    {/* 科目名称 */}
                    <span className="text-sm font-medium text-gray-900">{subAccount.name}</span>

                    {/* 单位 */}
                    <span className="text-xs text-gray-500">({subAccount.amountUnit})</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1.5">
                    {/* 上移按钮 */}
                    <button
                      onClick={() => handleMoveUpSubAccount(account, subAccount, subIndex)}
                      disabled={subIndex === 0}
                      className={`p-1 rounded transition-colors ${
                        subIndex === 0 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="上移"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    {/* 下移按钮 */}
                    <button
                      onClick={() => handleMoveDownSubAccount(account, subAccount, subIndex)}
                      disabled={subIndex === account.children.length - 1}
                      className={`p-1 rounded transition-colors ${
                        subIndex === account.children.length - 1
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="下移"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    {/* 编辑按钮 */}
                    {checkPermission('budget.parameters', 'edit') && (
                      <button
                        onClick={() => handleOpenEditSubAccount(account, subAccount)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* 删除按钮 - 只有非系统项才显示 */}
                    {!subAccount.isSystemParam && checkPermission('budget.parameters', 'delete') && (
                      <button
                        onClick={() => handleOpenDeleteSubAccount(account, subAccount)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 固定头部区域 */}
      <div className="sticky top-0 z-10 bg-white pb-6 border-b border-gray-200 shadow-sm">
        {/* Tab 切换栏 */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('profit-loss')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'profit-loss'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            损益参数
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'payroll'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            薪酬核算参数
          </button>
        </div>

        {/* 顶部操作栏 */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'profit-loss' ? '损益参数设置' : '薪酬核算参数设置'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {year}年度 • 共 {accounts.length} 个科目
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 复制上一年度科目按钮 - 仅2026年及以后显示 */}
            {year >= 2026 && (
              <button
                onClick={() => setShowCopyDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
                复制上一年度科目
              </button>
            )}
            
            {/* 新增一级科目按钮 */}
            {checkPermission('budget.parameters', 'create') && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增一级科目
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto pt-6">
        {/* 科目列表 */}
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">暂无预算科目</p>
              <button
                onClick={() => setShowAddDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建第一个科目
              </button>
            </div>
          ) : (
            accounts.map((account, index) => renderAccountItem(account, index))
          )}
        </div>
      </div>

      {/* 新增科目对话框 */}
      {renderAddDialog()}

      {/* 编辑科目对话框 */}
      {renderEditDialog()}

      {/* 删除确认对话框 */}
      {renderDeleteDialog()}

      {/* 新增二级科目对话框 */}
      {renderAddSubAccountDialog()}

      {/* 编辑二级科目对话框 */}
      {renderEditSubAccountDialog()}

      {/* 删除二级科目确认对话框 */}
      {renderDeleteSubAccountDialog()}

      {/* 复制上一年度科目确认对话框 */}
      {renderCopyDialog()}

      {/* 公式编辑对话框 */}
      {renderFormulaDialog()}
    </div>
  );
};
