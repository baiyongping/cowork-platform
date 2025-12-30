import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2, Edit, Archive, DollarSign, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/cloudbase';
import CreateAssetBudgetModal from '../CreateAssetBudgetModal';
import { AssetBudgetItems } from '../AssetBudgetItems';

// 资产类别枚举
const ASSET_CATEGORIES = [
  '房屋建筑物',
  '机器设备',
  '运输工具',
  '电子设备',
  '办公家具',
  '软件系统',
  '专利权',
  '商标权',
  '股权投资',
  '债券投资',
  '其他资产'
] as const;

// 采购状态枚举
const PURCHASE_STATUS = [
  '未开始',
  '进行中',
  '已完成',
  '取消',
  '暂停'
] as const;

// 预算明细项接口
interface BudgetItem {
  id: string;
  itemName: string;          // 物品名称
  quantity: number;          // 数量
  unitPrice: number;         // 单价
  totalPrice: number;        // 总价（自动计算）
  specifications: string;    // 规格属性
}

// 资产预算接口
interface AssetBudget {
  _id?: string;
  _openid?: string;                // CloudBase 系统字段
  name: string;                    // 预算名称
  category: typeof ASSET_CATEGORIES[number];  // 类别
  totalAmount: number;             // 总金额（自动汇总）
  startDate: string;               // 采购启动时间
  deliveryDate: string;            // 预计交付时间
  department: string;              // 需求部门
  contactPerson: string;           // 对接人
  purchaseManager: string;         // 采购责任人
  status: typeof PURCHASE_STATUS[number];  // 采购状态
  items: BudgetItem[];             // 预算明细子表
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  deletedAt?: Date;                // 删除时间
  deletedBy?: string;              // 删除人
  // 兼容旧字段
  completionDate?: string;         // 旧字段,已废弃,使用 deliveryDate
}

interface AssetBudgetManagementProps {
  year: number;
}

export function AssetBudgetManagement({ year }: AssetBudgetManagementProps) {
  // 状态管理
  const [budgets, setBudgets] = useState<AssetBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // 新增：新建模态框状态
  const [showRecycleBin, setShowRecycleBin] = useState(false); // 新增：回收站模态框状态
  const [deletedBudgets, setDeletedBudgets] = useState<AssetBudget[]>([]); // 新增：回收站数据
  const [editingBudget, setEditingBudget] = useState<AssetBudget | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 部门和员工列表
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string; username: string }[]>([]);

  // 表单状态
  const [formData, setFormData] = useState<AssetBudget>({
    name: '',
    category: '机器设备',
    totalAmount: 0,
    startDate: '',               // 采购启动时间
    deliveryDate: '',            // 预计交付时间
    department: '',
    contactPerson: '',
    purchaseManager: '',
    status: '未开始',
    items: []
  });

  // 加载预算列表
  const loadBudgets = async () => {
    setLoading(true);
    try {
      const result = await db.collection('asset_budgets')
        .where({ year })
        .orderBy('createdAt', 'desc')
        .get();
      
      // 过滤掉已删除的数据（兼容没有 deleted 字段的旧数据）
      const activeBudgets = result.data?.filter((budget: any) => 
        budget.deleted !== true
      ) || [];
      
      setBudgets(activeBudgets as AssetBudget[]);
    } catch (error) {
      console.error('加载资产预算失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载回收站数据
  const loadDeletedBudgets = async () => {
    try {
      const result = await db.collection('asset_budgets')
        .where({ year, deleted: true })
        .orderBy('deletedAt', 'desc')
        .get();
      
      setDeletedBudgets(result.data as AssetBudget[]);
    } catch (error) {
      console.error('加载回收站失败:', error);
      toast.error('加载回收站失败');
    }
  };

  // 加载部门列表
  const loadDepartments = async () => {
    try {
      const result = await db.collection('departments').get();
      setDepartments(result.data.map((dept: any) => ({
        _id: dept._id,
        name: dept.name
      })));
    } catch (error) {
      console.error('加载部门列表失败:', error);
    }
  };

  // 加载员工列表
  const loadEmployees = async () => {
    try {
      const result = await db.collection('users')
        .where({
          approvalStatus: 'approved',
          deleted: { $ne: true }
        })
        .get();
      
      setEmployees(result.data.map((user: any) => ({
        _id: user._id,
        name: user.name,
        username: user.username
      })));
    } catch (error) {
      console.error('加载员工列表失败:', error);
    }
  };

  useEffect(() => {
    loadBudgets();
    loadDepartments();
    loadEmployees();
  }, [year]);

  // 打开新建/编辑表单
  const openModal = (budget?: AssetBudget) => {
    if (budget) {
      setEditingBudget(budget);
      // 兼容旧数据:如果没有新字段,则使用旧字段
      setFormData({
        ...budget,
        startDate: budget.startDate || '',
        deliveryDate: budget.deliveryDate || budget.completionDate || ''
      });
      setIsEditing(false); // 默认浏览模式
    } else {
      setEditingBudget(null);
      setFormData({
        name: '',
        category: '机器设备',
        totalAmount: 0,
        startDate: '',
        deliveryDate: '',
        department: '',
        contactPerson: '',
        purchaseManager: '',
        status: '未开始',
        items: []
      });
      setIsEditing(true); // 新建时直接进入编辑模式
    }
    setShowModal(true);
  };

  // 关闭表单
  const closeModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setIsEditing(false);
    setIsAddingItem(false);
  };

  // 切换编辑模式
  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // 从编辑模式切换回浏览模式时,保存数据
      handleSave();
    }
  };

  // 删除预算（软删除）
  const handleDelete = async () => {
    if (!editingBudget?._id) return;

    try {
      await db.collection('asset_budgets')
        .doc(editingBudget._id)
        .update({
          deleted: true,
          deletedAt: new Date(),
          deletedBy: getCurrentUserId()
        });
      
      toast.success('预算已放入回收站');
      setShowDeleteConfirm(false);
      closeModal();
      loadBudgets();
    } catch (error) {
      console.error('删除预算失败:', error);
      toast.error('删除失败');
    }
  };

  // 恢复预算
  const handleRestore = async (budgetId: string) => {
    try {
      await db.collection('asset_budgets')
        .doc(budgetId)
        .update({
          deleted: false,
          deletedAt: null,
          deletedBy: null
        });
      
      toast.success('预算已恢复');
      loadDeletedBudgets();
      loadBudgets();
    } catch (error) {
      console.error('恢复预算失败:', error);
      toast.error('恢复失败');
    }
  };

  // 永久删除预算
  const handlePermanentDelete = async (budgetId: string) => {
    if (!window.confirm('确定要永久删除此预算吗？此操作不可撤销！')) {
      return;
    }

    try {
      await db.collection('asset_budgets')
        .doc(budgetId)
        .remove();
      
      toast.success('预算已永久删除');
      loadDeletedBudgets();
    } catch (error) {
      console.error('永久删除失败:', error);
      toast.error('删除失败');
    }
  };

  // 明细更新回调（由 AssetBudgetItems 组件调用）
  const handleItemsUpdate = (items: BudgetItem[]) => {
    console.log('🔄 父组件收到明细更新回调...');
    console.log('📦 接收到的明细项数量:', items.length);
    console.log('📦 接收到的明细项内容:', JSON.stringify(items, null, 2));
    
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    console.log('💵 自动计算的总金额:', totalAmount);
    
    const updatedFormData = {
      ...formData,
      items,
      totalAmount
    };
    
    console.log('📋 更新后的 formData:', JSON.stringify(updatedFormData, null, 2));
    
    setFormData(updatedFormData);
    console.log('✅ formData 状态已更新');
  };

  // 格式化数字（千分位，无小数点）
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString('zh-CN');
  };

  // 格式化金额（仿照商机列表的显示方式）
  const formatAmountInteger = (amount?: number): string => {
    if (!amount || isNaN(amount)) {
      return '0';
    }
    if (amount >= 100000000) {
      // 亿级别: 1.23亿
      return `${(amount / 100000000).toFixed(2)}亿`;
    }
    if (amount >= 10000) {
      // 万级别: 12345万 (最多5位数)
      return `${Math.round(amount / 10000)}万`;
    }
    // 元级别: 9999元 (最多4位数)
    return `${Math.round(amount)}`;
  };

  // 计算总金额
  const calculateTotalAmount = (): number => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // 保存预算
  const handleSave = async () => {
    // 验证必填字段 - 修复: 使用新字段 deliveryDate 替代旧字段 completionDate
    if (!formData.name || !formData.department || !formData.contactPerson || !formData.purchaseManager || !formData.deliveryDate) {
      toast.error('请填写所有必填字段');
      return;
    }

    try {
      console.log('🔍 开始保存预算...');
      console.log('📋 formData 内容:', JSON.stringify(formData, null, 2));
      console.log('📦 明细项数量:', formData.items?.length || 0);
      console.log('💰 明细项详情:', formData.items);
      
      const currentUserId = getCurrentUserId();
      const now = new Date();
      
      // 自动计算总金额
      const totalAmount = calculateTotalAmount();
      console.log('💵 计算的总金额:', totalAmount);

      if (editingBudget?._id) {
        // 更新现有预算
        console.log('📝 更新模式 - 预算ID:', editingBudget._id);
        
        // 移除系统字段（_id, _openid, createdAt, createdBy）
        const { _id, _openid, createdAt, createdBy, ...updateFields } = formData;
        
        const updateData = {
          ...updateFields,
          totalAmount,
          updatedAt: now
        };
        console.log('📤 即将写入数据库的数据:', JSON.stringify(updateData, null, 2));
        
        const result = await db.collection('asset_budgets')
          .doc(editingBudget._id)
          .update(updateData);
        
        console.log('✅ 数据库更新结果:', result);
        toast.success('预算更新成功');
      } else {
        // 新建预算
        console.log('🆕 新建模式');
        const newData = {
          ...formData,
          totalAmount,
          year,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUserId
        };
        console.log('📤 即将写入数据库的数据:', JSON.stringify(newData, null, 2));
        
        const result = await db.collection('asset_budgets')
          .add(newData);
        
        console.log('✅ 数据库添加结果:', result);
        toast.success('预算创建成功');
      }

      closeModal();
      loadBudgets();
    } catch (error) {
      console.error('❌ 保存预算失败:', error);
      console.error('❌ 错误详情:', JSON.stringify(error, null, 2));
      toast.error('保存失败');
    }
  };

  // 获取当前用户ID
  const getCurrentUserId = (): string => {
    try {
      const currentUserStr = localStorage.getItem('current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser.userId || '';
      }
    } catch (error) {
      console.error('获取用户ID失败:', error);
    }
    return '';
  };

  // 计算统计数据
  const calculateStatistics = () => {
    const totalAmount = budgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const inProgressAmount = budgets
      .filter(b => b.status === '进行中')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const completedAmount = budgets
      .filter(b => b.status === '已完成')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const completionRate = totalAmount > 0 ? (completedAmount / totalAmount) * 100 : 0;

    return {
      totalAmount,
      inProgressAmount,
      completedAmount,
      completionRate
    };
  };

  const statistics = calculateStatistics();

  // 加载预算数据
  useEffect(() => {
    loadBudgets();
  }, [year]);

  // 打开回收站时加载数据
  useEffect(() => {
    if (showRecycleBin) {
      loadDeletedBudgets();
    }
  }, [showRecycleBin]);

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">资产预算管理</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRecycleBin(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>回收站</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新建预算</span>
          </button>
        </div>
      </div>

      {/* 统计卡片条 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 投资预算总额 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">投资预算总额</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formatAmountInteger(statistics.totalAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 进行中金额 */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium">进行中金额</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{formatAmountInteger(statistics.inProgressAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 已完成金额 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">已完成金额</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{formatAmountInteger(statistics.completedAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 完成率 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">完成率</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{statistics.completionRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 预算列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <div className="bg-gradient-to-r from-purple-50 to-purple-50 rounded-lg p-12 border-l-4 border-l-purple-500">
          <div className="text-center">
            <div className="text-6xl mb-6">🏢</div>
            <h3 className="text-2xl font-bold text-purple-900 mb-4">暂无资产预算</h3>
            <p className="text-purple-700 text-lg mb-6">点击"新建预算"开始创建第一个资产预算项目</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {budgets.map((budget) => (
            <div 
              key={budget._id} 
              onClick={() => openModal(budget)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                {/* 左侧：预算信息 */}
                <div className="flex-1">
                  {/* 标题行：预算名称 + 状态标签 */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      budget.status === '未开始' ? 'bg-gray-100 text-gray-700' :
                      budget.status === '进行中' ? 'bg-blue-100 text-blue-700' :
                      budget.status === '已完成' ? 'bg-green-100 text-green-700' :
                      budget.status === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                      budget.status === '取消' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {budget.status}
                    </span>
                  </div>
                  {/* 详细信息 */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                    <div><span className="font-medium">类别：</span>{budget.category}</div>
                    <div><span className="font-medium">需求部门：</span>{budget.department}</div>
                    <div><span className="font-medium">对接人：</span>{budget.contactPerson}</div>
                    <div><span className="font-medium">采购责任人：</span>{budget.purchaseManager}</div>
                    <div><span className="font-medium">采购启动：</span>{budget.startDate || '-'}</div>
                    <div><span className="font-medium">预计交付：</span>{budget.deliveryDate || budget.completionDate || '-'}</div>
                  </div>
                </div>

                {/* 右侧：金额（仿照商机列表样式） */}
                <div className="flex items-center justify-end min-w-[120px]">
                  <div className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-0.5">预算总额</div>
                    <div className="text-xl font-bold text-blue-700 min-w-[80px]">{formatAmountInteger(budget.totalAmount)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Archive className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
                <p className="text-sm text-gray-600">
                  确定要将预算"{editingBudget?.name}"放入回收站吗？此操作不可恢复。
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                <span>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建/编辑表单模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 模态框头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBudget ? (isEditing ? '编辑资产预算' : '查看资产预算') : '新建资产预算'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="px-6 py-4 space-y-4">
              {/* 预算名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预算名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                  placeholder="请输入预算名称"
                />
              </div>

              {/* 类别 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  资产类别 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  {ASSET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* 需求部门 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  需求部门 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="">请选择需求部门</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* 对接人 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  对接人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="">请选择对接人</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.name}>{emp.name} ({emp.username})</option>
                  ))}
                </select>
              </div>

              {/* 采购责任人 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  采购责任人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchaseManager}
                  onChange={(e) => setFormData({ ...formData, purchaseManager: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="">请选择采购责任人</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.name}>{emp.name} ({emp.username})</option>
                  ))}
                </select>
              </div>

              {/* 采购启动时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  采购启动时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* 预计交付时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预计交付时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* 采购状态 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  采购状态 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  {PURCHASE_STATUS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* 预算明细组件 */}
              <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                <AssetBudgetItems
                  items={formData.items}
                  onUpdate={handleItemsUpdate}
                  isEditing={isEditing}
                />
              </div>
            </div>

            {/* 模态框底部 */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              {editingBudget ? (
                // 查看/编辑现有预算
                isEditing ? (
                  // 编辑模式：取消 + 保存 + 回收站
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>放入回收站</span>
                    </button>
                    <button
                      onClick={toggleEdit}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>保存</span>
                    </button>
                  </>
                ) : (
                  // 查看模式：编辑 + 回收站 + 关闭
                  <>
                    <button
                      onClick={toggleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>编辑</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>放入回收站</span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      关闭
                    </button>
                  </>
                )
              ) : (
                // 新建模式：取消 + 保存
                <>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>保存</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 回收站弹窗 */}
      {showRecycleBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 回收站头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Archive className="w-6 h-6 text-gray-600" />
                <h3 className="text-xl font-bold text-gray-900">回收站</h3>
                <span className="text-sm text-gray-500">（{deletedBudgets.length}个项目）</span>
              </div>
              <button
                onClick={() => setShowRecycleBin(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 回收站内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {deletedBudgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Archive className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">回收站为空</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletedBudgets.map((budget) => (
                    <div 
                      key={budget._id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{budget.name}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-500">类别：</span>
                              <span className="font-medium">{budget.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">总金额：</span>
                              <span className="font-medium text-blue-600">{formatNumber(budget.totalAmount)} 元</span>
                            </div>
                            <div>
                              <span className="text-gray-500">部门：</span>
                              <span className="font-medium">{budget.department}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">删除时间：</span>
                              <span className="font-medium text-red-600">
                                {budget.deletedAt ? new Date(budget.deletedAt).toLocaleString('zh-CN') : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleRestore(budget._id!)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            <span>恢复</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(budget._id!)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>永久删除</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建资产预算模态框 */}
      <CreateAssetBudgetModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadBudgets}
      />
    </div>
  );
}
