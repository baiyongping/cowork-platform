import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/cloudbase';

interface CreateAssetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Department {
  _id: string;
  name: string;
}

interface Employee {
  _id: string;
  name: string;
  username: string;
}

const ASSET_CATEGORIES = [
  '机器设备',
  '房屋建筑物',
  '土地使用权',
  '无形资产',
  '其他资产'
] as const;

const PURCHASE_STATUS = [
  '待采购',
  '采购中',
  '已完成',
  '已取消'
] as const;

const CreateAssetBudgetModal: React.FC<CreateAssetBudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '机器设备' as typeof ASSET_CATEGORIES[number],
    department: '',
    contactPerson: '',
    purchaseManager: '',
    completionDate: '',
    status: '待采购' as typeof PURCHASE_STATUS[number],
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载部门和员工数据
  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      loadEmployees();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const res = await db.collection('departments').get();
      console.log('✅ 加载部门数据:', res.data);
      setDepartments(res.data || []);
    } catch (error) {
      console.error('❌ 加载部门失败:', error);
      toast.error('加载部门失败');
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await db.collection('users').get();
      console.log('✅ 加载员工数据:', res.data);
      // 只显示已审核通过的员工（排除已删除、未通过审核和 admin 用户）
      const approvedUsers = res.data?.filter((user: any) => 
        user.deleted !== true && 
        user.approvalStatus === 'approved' &&
        user.username !== 'admin'
      ) || [];
      setEmployees(approvedUsers);
    } catch (error) {
      console.error('❌ 加载员工失败:', error);
      toast.error('加载员工失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!formData.name.trim()) {
      toast.error('请输入预算名称');
      return;
    }
    if (!formData.department) {
      toast.error('请选择需求部门');
      return;
    }
    if (!formData.contactPerson) {
      toast.error('请选择对接人');
      return;
    }
    if (!formData.purchaseManager) {
      toast.error('请选择采购责任人');
      return;
    }
    if (!formData.completionDate) {
      toast.error('请选择采购完成日期');
      return;
    }

    setLoading(true);
    try {
      const year = new Date().getFullYear();

      await db.collection('asset_budgets').add({
        ...formData,
        items: [], // 新建时明细为空，需要在编辑时添加
        totalAmount: 0,
        year,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      });

      toast.success('资产预算创建成功');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('创建失败:', error);
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      category: '机器设备',
      department: '',
      contactPerson: '',
      purchaseManager: '',
      completionDate: '',
      status: '待采购',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">新建资产预算</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 预算名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预算名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入预算名称"
            />
          </div>

          {/* 资产类别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              资产类别 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择采购责任人</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.name}>{emp.name} ({emp.username})</option>
              ))}
            </select>
          </div>

          {/* 采购完成日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              采购完成日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.completionDate}
              onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PURCHASE_STATUS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 提示：保存后可在详情页中添加预算明细项
            </p>
          </div>
        </form>

        {/* 底部操作栏 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAssetBudgetModal;
