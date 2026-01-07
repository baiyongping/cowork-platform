import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import { showSuccess, showWarning, showError } from '../utils/ui-feedback';

interface DecompositionDimension {
  _id: string;
  name: string;
  items: { id: string; name: string; status: string }[];
  status: string;
}

interface DecompositionTable {
  _id: string;
  name: string;
  horizontalDimension: {
    primary: {
      dimensionId: string;
      dimensionName: string;
      values: string[];
    };
    secondary?: {
      dimensionId: string;
      dimensionName: string;
      values: string[];
    };
  };
  verticalDimension: {
    primary: {
      dimensionId: string;
      dimensionName: string;
      values: string[];
    };
    secondary?: {
      dimensionId: string;
      dimensionName: string;
      values: string[];
    };
  };
  unit: string; // 单位
  showRowTotal: boolean; // 是否显示行汇总
  showColumnTotal: boolean; // 是否显示列总计
}

interface CreateDecompositionTableModalProps {
  editingTable: DecompositionTable | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 创建/编辑分解表模态框
 */
const CreateDecompositionTableModal: React.FC<CreateDecompositionTableModalProps> = ({
  editingTable,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState<DecompositionDimension[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    primaryHorizontalDimensionId: '',
    secondaryHorizontalDimensionId: '',
    primaryVerticalDimensionId: '',
    secondaryVerticalDimensionId: '',
    unit: '万元',
    showRowTotal: false,
    showColumnTotal: false
  });

  useEffect(() => {
    loadDimensions();
  }, []);

  useEffect(() => {
    if (editingTable) {
      setFormData({
        name: editingTable.name,
        primaryHorizontalDimensionId: editingTable.horizontalDimension.primary.dimensionId,
        secondaryHorizontalDimensionId: editingTable.horizontalDimension.secondary?.dimensionId || '',
        primaryVerticalDimensionId: editingTable.verticalDimension.primary.dimensionId,
        secondaryVerticalDimensionId: editingTable.verticalDimension.secondary?.dimensionId || '',
        unit: editingTable.unit || '万元',
        showRowTotal: editingTable.showRowTotal || false,
        showColumnTotal: editingTable.showColumnTotal || false
      });
    }
  }, [editingTable]);

  const loadDimensions = async () => {
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: { action: 'list' }
      });

      if (res.result.success) {
        // 只显示启用的维度
        const activeDimensions = res.result.data.filter(
          (dim: DecompositionDimension) => dim.status === 'active'
        );
        setDimensions(activeDimensions);
      }
    } catch (error) {
      console.error('加载维度失败:', error);
    }
  };

  const getSelectedDimension = (dimensionId: string) => {
    return dimensions.find(d => d._id === dimensionId);
  };

  const handleSave = async () => {
    // 验证表名
    if (!formData.name?.trim()) {
      showWarning('请输入表名');
      return;
    }

    // 验证一级横轴维度
    if (!formData.primaryHorizontalDimensionId) {
      showWarning('请选择一级横轴维度');
      return;
    }

    // 验证一级纵轴维度
    if (!formData.primaryVerticalDimensionId) {
      showWarning('请选择一级纵轴维度');
      return;
    }

    // 横纵轴一级维度不能相同
    if (formData.primaryHorizontalDimensionId === formData.primaryVerticalDimensionId) {
      showWarning('横轴和纵轴的一级维度不能相同');
      return;
    }

    // 获取一级维度信息
    const primaryHorizontalDim = getSelectedDimension(formData.primaryHorizontalDimensionId);
    const primaryVerticalDim = getSelectedDimension(formData.primaryVerticalDimensionId);

    if (!primaryHorizontalDim || !primaryVerticalDim) {
      showError('所选一级维度不存在');
      return;
    }

    // 获取二级维度信息（如果有）
    const secondaryHorizontalDim = formData.secondaryHorizontalDimensionId 
      ? getSelectedDimension(formData.secondaryHorizontalDimensionId) 
      : null;
    const secondaryVerticalDim = formData.secondaryVerticalDimensionId 
      ? getSelectedDimension(formData.secondaryVerticalDimensionId) 
      : null;

    // 获取启用的维度值
    const primaryHorizontalValues = primaryHorizontalDim.items
      .filter(item => item.status === 'active')
      .map(item => item.name);

    const primaryVerticalValues = primaryVerticalDim.items
      .filter(item => item.status === 'active')
      .map(item => item.name);

    if (primaryHorizontalValues.length === 0) {
      showWarning(`一级横轴维度"${primaryHorizontalDim.name}"没有启用的维度项`);
      return;
    }

    if (primaryVerticalValues.length === 0) {
      showWarning(`一级纵轴维度"${primaryVerticalDim.name}"没有启用的维度项`);
      return;
    }

    // 二级维度值
    const secondaryHorizontalValues = secondaryHorizontalDim 
      ? secondaryHorizontalDim.items.filter(item => item.status === 'active').map(item => item.name)
      : [];
    const secondaryVerticalValues = secondaryVerticalDim 
      ? secondaryVerticalDim.items.filter(item => item.status === 'active').map(item => item.name)
      : [];

    if (secondaryHorizontalDim && secondaryHorizontalValues.length === 0) {
      showWarning(`二级横轴维度"${secondaryHorizontalDim.name}"没有启用的维度项`);
      return;
    }

    if (secondaryVerticalDim && secondaryVerticalValues.length === 0) {
      showWarning(`二级纵轴维度"${secondaryVerticalDim.name}"没有启用的维度项`);
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        action: editingTable ? 'update' : 'create',
        data: {
          ...(editingTable && { id: editingTable._id }),
          name: formData.name.trim(),
          horizontalDimension: {
            primary: {
              dimensionId: primaryHorizontalDim._id,
              dimensionName: primaryHorizontalDim.name,
              values: primaryHorizontalValues
            },
            ...(secondaryHorizontalDim && {
              secondary: {
                dimensionId: secondaryHorizontalDim._id,
                dimensionName: secondaryHorizontalDim.name,
                values: secondaryHorizontalValues
              }
            })
          },
          verticalDimension: {
            primary: {
              dimensionId: primaryVerticalDim._id,
              dimensionName: primaryVerticalDim.name,
              values: primaryVerticalValues
            },
            ...(secondaryVerticalDim && {
              secondary: {
                dimensionId: secondaryVerticalDim._id,
                dimensionName: secondaryVerticalDim.name,
                values: secondaryVerticalValues
              }
            })
          },
          unit: formData.unit,
          showRowTotal: formData.showRowTotal,
          showColumnTotal: formData.showColumnTotal
        }
      };

      const res = await callFunction({
        name: 'decomposition-tables',
        data: requestData
      });

      if (res.result.success) {
        showSuccess(editingTable ? '分解表更新成功' : '分解表创建成功');
        onSuccess();
      } else {
        showError(res.result.error || '保存失败');
      }
    } catch (error: any) {
      console.error('保存分解表失败:', error);
      showError(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 标题栏 - 固定在顶部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingTable ? '编辑目标分解表' : '新增目标分解表'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* 表名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：2025年度地域-季度分解表"
            />
          </div>

          {/* 一级横轴维度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              一级横轴维度 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.primaryHorizontalDimensionId}
              onChange={(e) => setFormData({ ...formData, primaryHorizontalDimensionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择一级横轴维度</option>
              {dimensions.map((dim) => (
                <option key={dim._id} value={dim._id}>
                  {dim.name} ({dim.items.filter(item => item.status === 'active').length}个启用项)
                </option>
              ))}
            </select>
            {formData.primaryHorizontalDimensionId && (
              <div className="mt-2 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-700 mb-1">一级横轴维度值:</p>
                <div className="flex flex-wrap gap-1">
                  {getSelectedDimension(formData.primaryHorizontalDimensionId)?.items
                    .filter(item => item.status === 'active')
                    .map((item, index) => (
                      <span key={index} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        {item.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 二级横轴维度（可选）*/}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              二级横轴维度（可选）
            </label>
            <select
              value={formData.secondaryHorizontalDimensionId}
              onChange={(e) => setFormData({ ...formData, secondaryHorizontalDimensionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">无（不使用二级维度）</option>
              {dimensions
                .filter(dim => dim._id !== formData.primaryHorizontalDimensionId)
                .map((dim) => (
                  <option key={dim._id} value={dim._id}>
                    {dim.name} ({dim.items.filter(item => item.status === 'active').length}个启用项)
                  </option>
                ))}
            </select>
            {formData.secondaryHorizontalDimensionId && (
              <div className="mt-2 p-2 bg-indigo-50 rounded">
                <p className="text-xs text-indigo-700 mb-1">二级横轴维度值:</p>
                <div className="flex flex-wrap gap-1">
                  {getSelectedDimension(formData.secondaryHorizontalDimensionId)?.items
                    .filter(item => item.status === 'active')
                    .map((item, index) => (
                      <span key={index} className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">
                        {item.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 一级纵轴维度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              一级纵轴维度 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.primaryVerticalDimensionId}
              onChange={(e) => setFormData({ ...formData, primaryVerticalDimensionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择一级纵轴维度</option>
              {dimensions.map((dim) => (
                <option key={dim._id} value={dim._id}>
                  {dim.name} ({dim.items.filter(item => item.status === 'active').length}个启用项)
                </option>
              ))}
            </select>
            {formData.primaryVerticalDimensionId && (
              <div className="mt-2 p-2 bg-green-50 rounded">
                <p className="text-xs text-green-700 mb-1">一级纵轴维度值:</p>
                <div className="flex flex-wrap gap-1">
                  {getSelectedDimension(formData.primaryVerticalDimensionId)?.items
                    .filter(item => item.status === 'active')
                    .map((item, index) => (
                      <span key={index} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                        {item.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 二级纵轴维度（可选）*/}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              二级纵轴维度（可选）
            </label>
            <select
              value={formData.secondaryVerticalDimensionId}
              onChange={(e) => setFormData({ ...formData, secondaryVerticalDimensionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">无（不使用二级维度）</option>
              {dimensions
                .filter(dim => dim._id !== formData.primaryVerticalDimensionId)
                .map((dim) => (
                  <option key={dim._id} value={dim._id}>
                    {dim.name} ({dim.items.filter(item => item.status === 'active').length}个启用项)
                  </option>
                ))}
            </select>
            {formData.secondaryVerticalDimensionId && (
              <div className="mt-2 p-2 bg-teal-50 rounded">
                <p className="text-xs text-teal-700 mb-1">二级纵轴维度值:</p>
                <div className="flex flex-wrap gap-1">
                  {getSelectedDimension(formData.secondaryVerticalDimensionId)?.items
                    .filter(item => item.status === 'active')
                    .map((item, index) => (
                      <span key={index} className="px-2 py-0.5 text-xs bg-teal-100 text-teal-800 rounded">
                        {item.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 单位 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数值单位 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="万元">万元</option>
              <option value="元">元</option>
              <option value="个">个</option>
              <option value="人">人</option>
              <option value="套">套</option>
            </select>
          </div>

          {/* 汇总和总计选项 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              汇总选项
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showRowTotal}
                  onChange={(e) => setFormData({ ...formData, showRowTotal: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">显示行汇总（每行右侧增加一列"汇总"）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showColumnTotal}
                  onChange={(e) => setFormData({ ...formData, showColumnTotal: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">显示列总计（最底部增加一行"总计"）</span>
              </label>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">两级维度说明：</p>
              <ul className="list-disc list-inside space-y-1 text-amber-600">
                <li>一级维度是必填项，二级维度是可选项（默认为"无"）</li>
                <li>如果选择二级维度，表格列数 = 一级列数 × 二级列数</li>
                <li>例如：一级横轴为Q1~Q4（4列），二级为订单承揽、销售收入（2列），则共8列</li>
                <li>表头会自动合并显示一级维度（如Q1跨越两列：订单承揽、销售收入）</li>
                <li>只会使用启用状态的维度项</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 底部操作栏 - 固定在底部 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.name?.trim() || !formData.primaryHorizontalDimensionId || !formData.primaryVerticalDimensionId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDecompositionTableModal;
