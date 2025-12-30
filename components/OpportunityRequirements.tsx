import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import type { OpportunityRequirement } from '../types/opportunity';
import { db } from '../lib/cloudbase';
import { showError } from '../utils/ui-feedback';

interface OpportunityRequirementsProps {
  opportunityId: string;
  requirements: OpportunityRequirement[];
  onUpdate: (requirements: OpportunityRequirement[], totalAmount: number) => void;
  readOnly?: boolean;
}

export default function OpportunityRequirements({ 
  opportunityId, 
  requirements, 
  onUpdate, 
  readOnly = false 
}: OpportunityRequirementsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OpportunityRequirement | null>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });

  useEffect(() => {
    loadProductTypes();
  }, []);

  // 加载产品类型设置
  const loadProductTypes = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'productType' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const values = result.data[0].values;
        // 支持新格式（TypeItem[]）和旧格式（string[]）
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            // 旧格式：字符串数组
            setProductTypes(values);
          } else {
            // 新格式：TypeItem对象数组，只提取启用的值
            setProductTypes(
              values
                .filter((item: any) => item.enabled)
                .map((item: any) => item.value)
            );
          }
        } else {
          setProductTypes(['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']);
        }
      } else {
        setProductTypes(['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']);
      }
    } catch (error) {
      console.error('加载产品类型设置失败:', error);
      setProductTypes(['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']);
    }
  };

  // 计算总金额和总毛利润
  const calculateTotalAmount = (reqs: OpportunityRequirement[]) => {
    return reqs.reduce((sum, req) => sum + req.totalPrice, 0);
  };

  const calculateTotalGrossProfit = (reqs: OpportunityRequirement[]) => {
    return reqs.reduce((sum, req) => sum + req.grossProfit, 0);
  };

  // 添加/编辑需求项
  const handleSave = async (item: OpportunityRequirement) => {
    let updatedRequirements: OpportunityRequirement[];
    
    if (editingItem) {
      // 编辑现有项
      updatedRequirements = requirements.map(req => 
        req.id === item.id ? item : req
      );
    } else {
      // 添加新项
      updatedRequirements = [...requirements, item];
    }

    const totalAmount = calculateTotalAmount(updatedRequirements);
    
    // 如果有 opportunityId，直接更新数据库
    if (opportunityId) {
      try {
        await db.collection('opportunities').doc(opportunityId).update({
          requirements: updatedRequirements,
          estimatedAmount: totalAmount,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('更新商机需求失败:', error);
        showError('保存失败，请重试');
        return;
      }
    }
    
    onUpdate(updatedRequirements, totalAmount);
    setShowModal(false);
    setEditingItem(null);
  };

  // 删除需求项
  const handleDelete = async (id: string) => {
    const updatedRequirements = requirements.filter(req => req.id !== id);
    const totalAmount = calculateTotalAmount(updatedRequirements);
    
    // 如果有 opportunityId，直接更新数据库
    if (opportunityId) {
      try {
        await db.collection('opportunities').doc(opportunityId).update({
          requirements: updatedRequirements,
          estimatedAmount: totalAmount,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('删除商机需求失败:', error);
        showError('删除失败，请重试');
        return;
      }
    }
    
    onUpdate(updatedRequirements, totalAmount);
  };

  // 格式化金额
  const formatAmount = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  const totalAmount = calculateTotalAmount(requirements);
  const totalGrossProfit = calculateTotalGrossProfit(requirements);

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">商机需求</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingItem(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            添加需求
          </button>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p>暂无产品需求</p>
          {!readOnly && (
            <p className="text-sm mt-1">点击上方"添加需求"按钮添加产品需求</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {requirements.map((req) => (
              <div
                key={req.id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">产品类别</label>
                      <div className="text-sm font-medium text-gray-900">{req.productType}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">需求数量</label>
                      <div className="text-sm text-gray-900">{req.quantity} 件</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">预算单价</label>
                      <div className="text-sm text-gray-900">¥{req.unitPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">预估成本</label>
                      <div className="text-sm text-gray-900">¥{req.estimatedCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">总价</label>
                      <div className="text-sm font-semibold text-blue-600">¥{formatAmount(req.totalPrice)}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">预估毛利润</label>
                      <div className="text-sm font-semibold text-green-600">¥{formatAmount(req.grossProfit)}</div>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingItem(req);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm({ show: true, id: req.id });
                        }}
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

          {/* 总计 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">商机预期金额</span>
              <span className="text-xl font-bold text-blue-600">¥{formatAmount(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-blue-200 pt-3">
              <span className="text-sm font-medium text-gray-700">商机预估毛利润</span>
              <span className="text-xl font-bold text-green-600">{totalGrossProfit >= 10000 ? `¥${(totalGrossProfit / 10000).toFixed(2)}万` : `¥${totalGrossProfit.toFixed(2)}`}</span>
            </div>
          </div>
        </>
      )}

      {/* 添加/编辑需求模态框 */}
      {showModal && (
        <RequirementModal
          item={editingItem}
          productTypes={productTypes}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">确认删除</h2>
            <p className="text-gray-600 mb-6">
              确定要删除这条需求吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.id) {
                    handleDelete(deleteConfirm.id);
                  }
                  setDeleteConfirm({ show: false, id: null });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 需求项编辑模态框
interface RequirementModalProps {
  item: OpportunityRequirement | null;
  productTypes: string[];
  onSave: (item: OpportunityRequirement) => void;
  onClose: () => void;
}

function RequirementModal({ item, productTypes, onSave, onClose }: RequirementModalProps) {
  const [formData, setFormData] = useState<OpportunityRequirement>(() => {
    if (item) {
      return { ...item };
    }
    return {
      id: `req_${Date.now()}`,
      productType: productTypes[0] || '',
      quantity: 0,
      unitPrice: 0,
      estimatedCost: 0,
      totalPrice: 0,
      grossProfit: 0,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 自动计算总价和毛利润
  useEffect(() => {
    const totalPrice = formData.quantity * formData.unitPrice;
    const grossProfit = totalPrice - (formData.quantity * formData.estimatedCost);
    setFormData(prev => ({ ...prev, totalPrice, grossProfit }));
  }, [formData.quantity, formData.unitPrice, formData.estimatedCost]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.productType) newErrors.productType = '请选择产品类别';
    if (formData.quantity <= 0) newErrors.quantity = '数量必须大于0';
    if (formData.unitPrice < 0) newErrors.unitPrice = '单价不能为负数';
    if (formData.estimatedCost < 0) newErrors.estimatedCost = '成本不能为负数';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-md p-6 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {item ? '编辑需求' : '添加需求'}
        </h3>

        <div className="space-y-4">
          {/* 产品类别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品类别 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.productType}
              onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.productType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {productTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.productType && <p className="mt-1 text-sm text-red-500">{errors.productType}</p>}
          </div>

          {/* 需求数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              需求数量（件）<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="请输入需求数量"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              min="1"
              step="1"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
          </div>

          {/* 预算单价 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预算单价（元）
            </label>
            <input
              type="number"
              value={formData.unitPrice || ''}
              onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              placeholder="请输入预算单价"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.unitPrice ? 'border-red-500' : 'border-gray-300'
              }`}
              min="0"
              step="0.01"
            />
            {errors.unitPrice && <p className="mt-1 text-sm text-red-500">{errors.unitPrice}</p>}
          </div>

          {/* 预估成本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预估成本（元）
            </label>
            <input
              type="number"
              value={formData.estimatedCost || ''}
              onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
              placeholder="请输入预估成本"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.estimatedCost ? 'border-red-500' : 'border-gray-300'
              }`}
              min="0"
              step="0.01"
            />
            {errors.estimatedCost && <p className="mt-1 text-sm text-red-500">{errors.estimatedCost}</p>}
          </div>

          {/* 总价（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">总价（元）</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold">
              ¥{formData.totalPrice.toFixed(2)}
            </div>
          </div>

          {/* 预估毛利润（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">预估毛利润（元）</label>
            <div className={`px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold ${
              formData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ¥{formData.grossProfit.toFixed(2)}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
