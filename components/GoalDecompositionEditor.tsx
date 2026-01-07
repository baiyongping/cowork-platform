import React, { useState, useEffect } from 'react';
import { X, Save, History, AlertCircle, Check } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import type { 
  GoalDecomposition, 
  DecompositionDimension, 
  DecompositionCell 
} from '../types/goalDecomposition';

interface GoalDecompositionEditorProps {
  goalId: string;
  goalName: string;
  targetValue: number;
  onClose: () => void;
  onSave: () => void;
}

const GoalDecompositionEditor: React.FC<GoalDecompositionEditorProps> = ({
  goalId,
  goalName,
  targetValue,
  onClose,
  onSave,
}) => {
  const [dimensions, setDimensions] = useState<DecompositionDimension[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [cells, setCells] = useState<DecompositionCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [existingDecomposition, setExistingDecomposition] = useState<GoalDecomposition | null>(null);

  // 加载维度和已有分解数据
  useEffect(() => {
    loadDimensions();
    loadExistingDecomposition();
  }, [goalId]);

  const loadDimensions = async () => {
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: { action: 'list' }
      });
      
      if (res.result.success) {
        const activeDimensions = res.result.data.filter((d: DecompositionDimension) => d.status === 'active');
        setDimensions(activeDimensions);
      }
    } catch (error) {
      console.error('加载维度失败:', error);
    }
  };

  const loadExistingDecomposition = async () => {
    try {
      const res = await callFunction({
        name: 'decomposition-management',
        data: { 
          action: 'get',
          goalId 
        }
      });
      
      if (res.result.success && res.result.data) {
        const decomposition = res.result.data;
        setExistingDecomposition(decomposition);
        setSelectedDimensions(decomposition.dimensionIds);
        setCells(decomposition.cells);
      }
    } catch (error) {
      console.error('加载分解数据失败:', error);
    }
  };

  // 生成分解单元格
  const generateCells = () => {
    if (selectedDimensions.length === 0) {
      setCells([]);
      return;
    }

    const selectedDims = dimensions.filter(d => selectedDimensions.includes(d._id));
    const newCells: DecompositionCell[] = [];

    // 递归生成所有维度组合
    const generateCombinations = (
      dimIndex: number,
      currentPath: { dimensionId: string; itemId: string; itemName: string }[]
    ) => {
      if (dimIndex >= selectedDims.length) {
        // 生成一个单元格
        const cellId = currentPath.map(p => p.itemId).join('_');
        const existingCell = cells.find(c => c.cellId === cellId);
        
        newCells.push({
          cellId,
          dimensionPath: currentPath,
          value: existingCell?.value || 0
        });
        return;
      }

      const currentDim = selectedDims[dimIndex];
      for (const item of currentDim.items) {
        if (item.status === 'active') {
          const newPath = [
            ...currentPath,
            {
              dimensionId: currentDim._id,
              itemId: item.id,
              itemName: item.name
            }
          ];
          
          // 递归处理下一级维度
          generateCombinations(dimIndex + 1, newPath);
        }
      }
    };

    generateCombinations(0, []);
    setCells(newCells);
  };

  // 更新单元格值
  const updateCellValue = (cellId: string, value: number) => {
    setCells(prev => 
      prev.map(cell => 
        cell.cellId === cellId ? { ...cell, value } : cell
      )
    );
    setValidationError('');
  };

  // 数据校验
  const validateData = (): boolean => {
    const total = cells.reduce((sum, cell) => sum + cell.value, 0);
    const diff = Math.abs(total - targetValue);
    
    if (diff > 0.01) {
      setValidationError(
        `分解总和(${total.toFixed(2)})必须等于目标值(${targetValue.toFixed(2)})`
      );
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // 保存分解数据
  const handleSave = async () => {
    if (!validateData()) return;

    setLoading(true);
    try {
      const res = await callFunction({
        name: 'decomposition-management',
        data: {
          action: existingDecomposition ? 'update' : 'create',
          goalId,
          goalName,
          targetValue,
          dimensionIds: selectedDimensions,
          cells
        }
      });

      if (res.result.success) {
        onSave();
        onClose();
      } else {
        alert(res.result.error || '保存失败');
      }
    } catch (error: any) {
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染表格
  const renderTable = () => {
    if (selectedDimensions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          请选择至少一个分解维度
        </div>
      );
    }

    if (cells.length === 0) {
      return (
        <div className="text-center py-12">
          <button
            onClick={generateCells}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            生成分解表格
          </button>
        </div>
      );
    }

    const selectedDims = dimensions.filter(d => selectedDimensions.includes(d._id));
    const total = cells.reduce((sum, cell) => sum + cell.value, 0);
    const isValid = Math.abs(total - targetValue) < 0.01;

    return (
      <div className="space-y-4">
        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {selectedDims.map(dim => (
                  <th key={dim._id} className="px-4 py-2 text-left border">
                    {dim.name}
                  </th>
                ))}
                <th className="px-4 py-2 text-right border">目标值</th>
              </tr>
            </thead>
            <tbody>
              {cells.map(cell => (
                <tr key={cell.cellId} className="hover:bg-gray-50">
                  {cell.dimensionPath.map((path, idx) => (
                    <td key={idx} className="px-4 py-2 border">
                      {path.itemName}
                    </td>
                  ))}
                  <td className="px-4 py-2 border">
                    <input
                      type="number"
                      value={cell.value}
                      onChange={(e) => updateCellValue(cell.cellId, Number(e.target.value))}
                      className="w-full px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={selectedDims.length} className="px-4 py-2 text-right border">
                  合计
                </td>
                <td className={`px-4 py-2 text-right border ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {total.toFixed(2)}
                  {isValid && <Check className="inline-block ml-2 w-4 h-4" />}
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td colSpan={selectedDims.length} className="px-4 py-2 text-right border">
                  目标值
                </td>
                <td className="px-4 py-2 text-right border font-semibold">
                  {targetValue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 校验错误提示 */}
        {validationError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              目标分解 - {goalName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              目标值: {targetValue.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 维度选择 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              选择分解维度
            </h3>
            <div className="flex flex-wrap gap-2">
              {dimensions.map(dim => (
                <label
                  key={dim._id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(dim._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDimensions([...selectedDimensions, dim._id]);
                      } else {
                        setSelectedDimensions(selectedDimensions.filter(id => id !== dim._id));
                      }
                      setCells([]); // 重置单元格
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>{dim.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 分解表格 */}
          {renderTable()}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => {/* TODO: 打开历史版本 */}}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <History className="w-4 h-4" />
            历史版本
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading || cells.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDecompositionEditor;
