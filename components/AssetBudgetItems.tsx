import React, { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

// 明细项接口（匹配数据库结构）
interface BudgetItem {
  id: string;
  itemName: string;          // 物品名称
  quantity: number;          // 数量
  unitPrice: number;         // 单价
  totalPrice: number;        // 总价（自动计算）
  specifications: string;    // 规格属性
}

interface AssetBudgetItemsProps {
  items: BudgetItem[];
  onUpdate: (items: BudgetItem[]) => void;
  isEditing: boolean;
}

export function AssetBudgetItems({ items, onUpdate, isEditing }: AssetBudgetItemsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  // 添加明细
  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  // 编辑明细
  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // 删除明细
  const handleDelete = (id: string) => {
    if (!confirm('确定要删除此明细项吗？')) {
      return;
    }

    const newItems = items.filter(item => item.id !== id);
    onUpdate(newItems);
    toast.success('明细已删除');
  };

  // 保存明细
  const handleSave = (item: BudgetItem) => {
    console.log('🔍 明细组件 - 开始保存明细...');
    console.log('📝 保存的明细项:', JSON.stringify(item, null, 2));
    
    let newItems: BudgetItem[];
    
    if (editingItem) {
      // 编辑现有项
      console.log('📝 更新模式 - 明细ID:', item.id);
      newItems = items.map(i => i.id === item.id ? item : i);
      toast.success('明细已更新');
    } else {
      // 添加新项
      console.log('🆕 新增模式');
      newItems = [...items, { ...item, id: Date.now().toString() }];
      toast.success('明细已添加');
    }

    console.log('📦 更新后的明细列表 (数量):', newItems.length);
    console.log('📦 更新后的明细列表 (内容):', JSON.stringify(newItems, null, 2));
    
    onUpdate(newItems);
    console.log('✅ 已调用父组件的 onUpdate 回调');
    
    setShowModal(false);
  };

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // 格式化数字
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      {/* 头部：标题和添加按钮 */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-gray-900">预算明细</h4>
        {isEditing && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加明细</span>
          </button>
        )}
      </div>

      {/* 明细列表 */}
      {items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">暂无明细项</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div 
              key={item.id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <h5 className="text-base font-semibold text-gray-900">{item.itemName}</h5>
                    {item.specifications && (
                      <span className="text-sm text-gray-500">（{item.specifications}）</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">数量：</span>
                      <span className="font-medium text-gray-900">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">单价：</span>
                      <span className="font-medium text-gray-900">{formatNumber(item.unitPrice)} 元</span>
                    </div>
                    <div>
                      <span className="text-gray-500">总金额：</span>
                      <span className="font-medium text-blue-600">{formatNumber(item.totalPrice)} 元</span>
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 总计 */}
      {items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">预算总金额</span>
          <span className="text-xl font-bold text-blue-600">{formatNumber(totalAmount)} 元</span>
        </div>
      )}

      {/* 明细项模态框 */}
      {showModal && (
        <ItemModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// 明细项模态框组件
interface ItemModalProps {
  item: BudgetItem | null;
  onSave: (item: BudgetItem) => void;
  onClose: () => void;
}

function ItemModal({ item, onSave, onClose }: ItemModalProps) {
  const [formData, setFormData] = useState<BudgetItem>(
    item || {
      id: '',
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      specifications: ''
    }
  );

  // 更新字段
  const updateField = (field: keyof BudgetItem, value: any) => {
    const newData = { ...formData, [field]: value };

    // 自动计算总金额
    if (field === 'quantity' || field === 'unitPrice') {
      newData.totalPrice = newData.quantity * newData.unitPrice;
    }

    setFormData(newData);
  };

  // 提交表单
  const handleSubmit = () => {
    // 验证
    if (!formData.itemName.trim()) {
      toast.error('请输入物品名称');
      return;
    }
    if (formData.quantity < 1) {
      toast.error('数量必须大于等于1');
      return;
    }
    if (formData.unitPrice < 0) {
      toast.error('单价不能为负数');
      return;
    }

    // 保存
    onSave({
      ...formData,
      totalPrice: formData.quantity * formData.unitPrice
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 模态框头部 */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {item ? '编辑明细' : '添加明细'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-4">
          {/* 物品名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              物品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => updateField('itemName', e.target.value)}
              placeholder="例如：办公电脑"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 规格属性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              规格属性
            </label>
            <input
              type="text"
              value={formData.specifications}
              onChange={(e) => updateField('specifications', e.target.value)}
              placeholder="例如：i7/16G/512G SSD"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 预算数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预算数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 预算单价 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预算单价（元）<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.unitPrice}
              onChange={(e) => updateField('unitPrice', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 总金额（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              总金额（元）
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
              {(formData.quantity * formData.unitPrice).toLocaleString('zh-CN', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
        </div>

        {/* 模态框底部 */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
