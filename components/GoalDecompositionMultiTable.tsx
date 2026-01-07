import React, { useState, useEffect } from 'react';
import { AlertCircle, Grid, Save, Edit2, Check, X } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import toast from 'react-hot-toast';

interface GoalDecompositionMultiTableProps {
  goalTypeId: string;
  goalTypeName: string;
  selectedYear: number;  // 🆕 新增年度参数
  onBack: () => void;
  onConfigureClick: () => void;
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
  unit?: string;
  showRowTotal?: boolean;
  showColumnTotal?: boolean;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
}

interface CellData {
  tableId: string;
  rowIndex: number;
  colIndex: number;
  value: string;
}

const GoalDecompositionMultiTable: React.FC<GoalDecompositionMultiTableProps> = ({
  goalTypeId,
  goalTypeName,
  selectedYear,  // 🆕 接收年度参数
  onBack,
  onConfigureClick
}) => {
  const [tables, setTables] = useState<DecompositionTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [cellData, setCellData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // 为每个表格独立管理编辑状态
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  // 保存每个表格原始数据，用于取消时恢复
  const [originalData, setOriginalData] = useState<Record<string, string>>({});

  // 加载分解表列表和数据
  useEffect(() => {
    loadTablesAndData();
  }, [goalTypeId, selectedYear]);  // 🆕 添加 selectedYear 依赖

  const loadTablesAndData = async () => {
    try {
      setLoading(true);
      
      // 1. 加载分解表配置（只加载已启用的表）
      const tablesRes = await callFunction({
        name: 'decomposition-tables',
        data: {
          action: 'list',
          data: {}
        }
      });

      if (!tablesRes.result.success) {
        toast.error('加载分解表失败');
        return;
      }

      const enabledTables = (tablesRes.result.data.list || []).filter(
        (table: DecompositionTable) => table.isEnabled
      );
      setTables(enabledTables);

      // 2. 加载已保存的数据
      if (enabledTables.length > 0) {
        const dataRes = await callFunction({
          name: 'goal-decomposition-data',
          data: {
            action: 'query',
            data: {
              goalTypeId,
              year: selectedYear,  // 🆕 添加年度过滤
              tableIds: enabledTables.map((t: DecompositionTable) => t._id)
            }
          }
        });

        if (dataRes.result.success && dataRes.result.data?.list) {
          // 将数据转换为 cellData 格式
          const loadedData: Record<string, string> = {};
          dataRes.result.data.list.forEach((item: any) => {
            const key = getCellKey(item.tableId, item.rowIndex, item.colIndex);
            loadedData[key] = item.value || '';
          });
          setCellData(loadedData);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取单元格key
  const getCellKey = (tableId: string, rowIndex: number, colIndex: number): string => {
    return `${tableId}_${rowIndex}_${colIndex}`;
  };

  // 处理单元格值变化
  const handleCellChange = (tableId: string, rowIndex: number, colIndex: number, value: string) => {
    const key = getCellKey(tableId, rowIndex, colIndex);
    setCellData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 获取单元格值
  const getCellValue = (tableId: string, rowIndex: number, colIndex: number): string => {
    const key = getCellKey(tableId, rowIndex, colIndex);
    return cellData[key] || '';
  };

  // 格式化数值为千分位
  const formatNumberWithCommas = (value: string): string => {
    if (!value || value.trim() === '') return '';
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // 移除千分位分隔符（用于编辑）
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // 检查是否有未保存的修改
  const hasUnsavedChanges = (tableId: string): boolean => {
    return Object.keys(cellData).some(key => {
      const [tid] = key.split('_');
      return tid === tableId;
    });
  };

  // 获取已填写的单元格数量
  const getFilledCellsCount = (tableId: string): number => {
    return Object.keys(cellData).filter(key => {
      const [tid] = key.split('_');
      return tid === tableId && cellData[key]?.trim();
    }).length;
  };

  // 计算行汇总（某一行的所有列之和）
  const calculateRowTotal = (tableId: string, rowIndex: number, colCount: number): number => {
    let total = 0;
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const value = getCellValue(tableId, rowIndex, colIndex);
      const numValue = parseFloat(removeCommas(value));
      if (!isNaN(numValue)) {
        total += numValue;
      }
    }
    return total;
  };

  // 计算列总计（某一列的所有行之和）
  const calculateColumnTotal = (tableId: string, colIndex: number, rowCount: number): number => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const value = getCellValue(tableId, rowIndex, colIndex);
      const numValue = parseFloat(removeCommas(value));
      if (!isNaN(numValue)) {
        total += numValue;
      }
    }
    return total;
  };

  // 计算总计（所有单元格之和）
  const calculateGrandTotal = (tableId: string, rowCount: number, colCount: number): number => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const value = getCellValue(tableId, rowIndex, colIndex);
        const numValue = parseFloat(removeCommas(value));
        if (!isNaN(numValue)) {
          total += numValue;
        }
      }
    }
    return total;
  };

  // 开始编辑表格
  const handleStartEdit = (tableId: string) => {
    // 保存当前数据作为原始数据
    const tableData: Record<string, string> = {};
    Object.keys(cellData).forEach(key => {
      const [tid] = key.split('_');
      if (tid === tableId) {
        tableData[key] = cellData[key];
      }
    });
    setOriginalData(tableData);
    setEditingTableId(tableId);
  };

  // 取消编辑
  const handleCancelEdit = (tableId: string) => {
    // 恢复原始数据
    setCellData(prev => {
      const newData = { ...prev };
      Object.keys(originalData).forEach(key => {
        newData[key] = originalData[key];
      });
      // 删除新添加的数据
      Object.keys(newData).forEach(key => {
        const [tid] = key.split('_');
        if (tid === tableId && !originalData[key]) {
          delete newData[key];
        }
      });
      return newData;
    });
    setEditingTableId(null);
    setOriginalData({});
  };

  // 保存单个表格数据
  const handleSaveTable = async (tableId: string) => {
    try {
      setSaving(true);
      
      const table = tables.find(t => t._id === tableId);
      if (!table) {
        toast.error('表格不存在');
        return;
      }

      // 构建保存数据
      const saveItems: any[] = [];
      
      // 获取横纵轴的实际维度值列表
      const horizontalValues = table.horizontalDimension.secondary 
        ? table.horizontalDimension.primary.values.flatMap(p => 
            table.horizontalDimension.secondary!.values.map(s => `${p}-${s}`)
          )
        : table.horizontalDimension.primary.values;
        
      const verticalValues = table.verticalDimension.secondary
        ? table.verticalDimension.primary.values.flatMap(p =>
            table.verticalDimension.secondary!.values.map(s => `${p}-${s}`)
          )
        : table.verticalDimension.primary.values;
      
      Object.keys(cellData).forEach(key => {
        const [tid, rowIndex, colIndex] = key.split('_');
        
        if (tid === tableId && cellData[key]) {
          const rowIdx = parseInt(rowIndex);
          const colIdx = parseInt(colIndex);
          
          // 🔥 修复：保存时移除千分位，只存储纯数字
          const rawValue = removeCommas(cellData[key]);
          
          saveItems.push({
            goalTypeId,
            year: selectedYear,
            tableId,
            tableName: table.name,
            rowDimensionId: table.verticalDimension.primary.dimensionId,
            rowDimensionName: table.verticalDimension.primary.dimensionName,
            rowValue: verticalValues[rowIdx],
            rowIndex: rowIdx,
            colDimensionId: table.horizontalDimension.primary.dimensionId,
            colDimensionName: table.horizontalDimension.primary.dimensionName,
            colValue: horizontalValues[colIdx],
            colIndex: colIdx,
            value: rawValue
          });
        }
      });

      if (saveItems.length === 0) {
        toast.error('没有需要保存的数据');
        return;
      }

      // 调用云函数保存数据
      const res = await callFunction({
        name: 'goal-decomposition-data',
        data: {
          action: 'batchSave',
          data: {
            goalTypeId,
            year: selectedYear,
            items: saveItems
          }
        }
      });

      if (res.result.success) {
        toast.success(`成功保存 ${saveItems.length} 条数据`);
        setEditingTableId(null);
        setOriginalData({});
        // 重新加载数据
        await loadTablesAndData();
      } else {
        toast.error(res.result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 保存所有表数据 (保留此方法以防需要)
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      // 构建保存数据
      const saveItems: any[] = [];
      Object.keys(cellData).forEach(key => {
        const [tableId, rowIndex, colIndex] = key.split('_');
        const table = tables.find(t => t._id === tableId);
        
        if (table && cellData[key]) {
          const rowIdx = parseInt(rowIndex);
          const colIdx = parseInt(colIndex);
          
          saveItems.push({
            goalTypeId,
            tableId,
            tableName: table.name,
            rowDimensionId: table.verticalDimension.dimensionId,
            rowDimensionName: table.verticalDimension.dimensionName,
            rowValue: table.verticalDimension.values[rowIdx],
            rowIndex: rowIdx,
            colDimensionId: table.horizontalDimension.dimensionId,
            colDimensionName: table.horizontalDimension.dimensionName,
            colValue: table.horizontalDimension.values[colIdx],
            colIndex: colIdx,
            value: cellData[key]
          });
        }
      });

      if (saveItems.length === 0) {
        toast.error('没有需要保存的数据');
        return;
      }

      // 调用云函数保存数据
      const res = await callFunction({
        name: 'goal-decomposition-data',
        data: {
          action: 'batchSave',
          data: {
            goalTypeId,
            year: selectedYear,  // 🆕 传递年度
            items: saveItems
          }
        }
      });

      if (res.result.success) {
        toast.success(`成功保存 ${saveItems.length} 条数据`);
      } else {
        toast.error(res.result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tables.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无分解表配置</p>
            <button
              onClick={onConfigureClick}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              配置分解表
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 表格卡片列表 */}
            {tables.map((table, tableIndex) => (
              <div
                key={table._id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 卡片头部 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-semibold">
                        {tableIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedYear}年{table.name}
                          {table.unit && (
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              （单位：{table.unit}）
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {table.horizontalDimension.primary.dimensionName}
                          {table.horizontalDimension.secondary && ` × ${table.horizontalDimension.secondary.dimensionName}`}
                          {' × '}
                          {table.verticalDimension.primary.dimensionName}
                          {table.verticalDimension.secondary && ` × ${table.verticalDimension.secondary.dimensionName}`}
                        </p>
                      </div>
                    </div>
                    
                    {/* 编辑/保存按钮 */}
                    <div className="flex items-center gap-2">
                      {editingTableId === table._id ? (
                        <>
                          <button
                            onClick={() => handleSaveTable(table._id)}
                            disabled={saving}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            {saving ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={() => handleCancelEdit(table._id)}
                            disabled={saving}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(table._id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 分解表格 - 添加固定高度和滚动容器 */}
                <div className="overflow-auto max-h-[600px]">
                  <table className="w-full border-collapse">
                    <thead>
                      {/* 一级表头（如果有二级维度）*/}
                      {(table.horizontalDimension.secondary || table.verticalDimension.secondary) && (
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                          {/* 左上角单元格 - 纵轴一级维度 - 固定在左上角 */}
                          <th 
                            className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[80px] sticky left-0 top-0 z-30 whitespace-nowrap"
                            rowSpan={table.horizontalDimension.secondary ? 2 : 1}
                          >
                            {table.verticalDimension.primary.dimensionName}
                          </th>
                          
                          {/* 纵轴二级维度（如果有）- 固定在左上角 */}
                          {table.verticalDimension.secondary && (
                            <th 
                              className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[80px] sticky left-[80px] top-0 z-30 whitespace-nowrap"
                              rowSpan={table.horizontalDimension.secondary ? 2 : 1}
                            >
                              {table.verticalDimension.secondary.dimensionName}
                            </th>
                          )}
                          
                          {/* 一级横轴表头（如果有二级横轴维度）- 固定在顶部 */}
                          {table.horizontalDimension.secondary ? (
                            table.horizontalDimension.primary.values.map((col, colIndex) => (
                              <th
                                key={colIndex}
                                colSpan={table.horizontalDimension.secondary!.values.length}
                                className="border border-gray-200 bg-blue-50 px-3 py-3 text-center font-semibold text-gray-700 whitespace-nowrap sticky top-0 z-20"
                              >
                                {col}
                              </th>
                            ))
                          ) : (
                            table.horizontalDimension.primary.values.map((col, colIndex) => (
                              <th
                                key={colIndex}
                                className="border border-gray-200 bg-blue-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px] whitespace-nowrap sticky top-0 z-20"
                              >
                                {col}
                              </th>
                            ))
                          )}
                          
                          {/* 行汇总列头 - 固定在顶部 */}
                          {table.showRowTotal && (
                            <th 
                              className="border border-gray-200 bg-green-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px] whitespace-nowrap sticky top-0 z-20"
                              rowSpan={table.horizontalDimension.secondary ? 2 : 1}
                            >
                              合计
                            </th>
                          )}
                        </tr>
                      )}
                      
                      {/* 二级表头（如果有二级横轴维度）- 固定在顶部 */}
                      {table.horizontalDimension.secondary && (
                        <tr className="sticky top-[52px] z-20 bg-blue-50">
                          {table.horizontalDimension.primary.values.map((primaryCol, primaryIdx) =>
                            table.horizontalDimension.secondary!.values.map((secondaryCol, secondaryIdx) => (
                              <th
                                key={`${primaryIdx}-${secondaryIdx}`}
                                className="border border-gray-200 bg-blue-50 px-2 py-3 text-center text-sm font-medium text-gray-600 min-w-[100px] whitespace-nowrap"
                              >
                                {secondaryCol}
                              </th>
                            ))
                          )}
                        </tr>
                      )}
                      
                      {/* 单层表头（如果没有二级维度）- 固定在顶部和左侧 */}
                      {!table.horizontalDimension.secondary && !table.verticalDimension.secondary && (
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                          <th className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[80px] sticky left-0 top-0 z-30 whitespace-nowrap">
                            {table.verticalDimension.primary.dimensionName}
                          </th>
                          {table.horizontalDimension.primary.values.map((col, colIndex) => (
                            <th
                              key={colIndex}
                              className="border border-gray-200 bg-blue-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px] whitespace-nowrap sticky top-0 z-20"
                            >
                              {col}
                            </th>
                          ))}
                          {table.showRowTotal && (
                            <th className="border border-gray-200 bg-green-50 px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px] whitespace-nowrap sticky top-0 z-20">
                              合计
                            </th>
                          )}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {/* 数据行 */}
                      {(() => {
                        // 判断是否有纵轴二级维度
                        if (table.verticalDimension.secondary) {
                          // 有纵轴二级维度：需要两列显示
                          const primaryValues = table.verticalDimension.primary.values;
                          const secondaryValues = table.verticalDimension.secondary.values;
                          
                          // 生成列数量
                          const colCount = table.horizontalDimension.secondary
                            ? table.horizontalDimension.primary.values.length * table.horizontalDimension.secondary.values.length
                            : table.horizontalDimension.primary.values.length;
                          
                          let globalRowIndex = 0;
                          
                          return primaryValues.map((primaryValue, primaryIdx) => (
                            secondaryValues.map((secondaryValue, secondaryIdx) => {
                              const currentRowIndex = globalRowIndex++;
                              const isFirstInGroup = secondaryIdx === 0;
                              
                              return (
                                <tr key={currentRowIndex} className="hover:bg-gray-50 transition-colors">
                                  {/* 一级维度列（合并单元格）- 固定在最左侧 */}
                                  {isFirstInGroup && (
                                    <td 
                                      rowSpan={secondaryValues.length}
                                      className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-medium text-gray-700 sticky left-0 z-10 align-middle whitespace-nowrap"
                                    >
                                      {primaryValue}
                                    </td>
                                  )}
                                  
                                  {/* 二级维度列 - 固定在左侧第二列 */}
                                  <td className="border border-gray-200 bg-gray-50 px-3 py-3 text-left font-medium text-gray-700 sticky left-[80px] z-10 whitespace-nowrap">
                                    {secondaryValue}
                                  </td>
                                  
                                  {/* 数据单元格 */}
                                  {Array.from({ length: colCount }).map((_, colIndex) => {
                                    const cellValue = getCellValue(table._id, currentRowIndex, colIndex);
                                    const isEditing = editingTableId === table._id;
                                    const displayValue = isEditing ? cellValue : formatNumberWithCommas(cellValue);
                                    
                                    return (
                                      <td
                                        key={colIndex}
                                        className={`border border-gray-200 px-0 py-0 transition-all duration-200 ${
                                          isEditing ? 'bg-yellow-50 hover:bg-amber-100' : 'bg-white'
                                        }`}
                                      >
                                        <input
                                          type="text"
                                          value={displayValue}
                                          onChange={(e) => {
                                            const rawValue = removeCommas(e.target.value);
                                            handleCellChange(table._id, currentRowIndex, colIndex, rawValue);
                                          }}
                                          onFocus={(e) => {
                                            if (isEditing) {
                                              e.target.parentElement?.classList.add('bg-amber-200', 'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]');
                                              e.target.parentElement?.classList.remove('bg-yellow-50', 'bg-amber-100');
                                            }
                                          }}
                                          onBlur={(e) => {
                                            e.target.parentElement?.classList.remove('bg-amber-200', 'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]');
                                            if (isEditing) {
                                              e.target.parentElement?.classList.add('bg-yellow-50');
                                            }
                                          }}
                                          disabled={!isEditing}
                                          className="w-full h-full px-3 py-3 text-[15px] font-mono text-right focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-default"
                                          placeholder={isEditing ? "0" : ""}
                                        />
                                      </td>
                                    );
                                  })}
                                  
                                  {/* 行汇总单元格 */}
                                  {table.showRowTotal && (
                                    <td className="border border-gray-200 bg-green-50 px-3 py-3 text-right font-mono text-[15px] font-bold text-gray-900">
                                      {calculateRowTotal(table._id, currentRowIndex, colCount).toLocaleString()}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          ));
                        } else {
                          // 没有纵轴二级维度：单列显示
                          const rowLabels = table.verticalDimension.primary.values;
                          
                          const colCount = table.horizontalDimension.secondary
                            ? table.horizontalDimension.primary.values.length * table.horizontalDimension.secondary.values.length
                            : table.horizontalDimension.primary.values.length;
                          
                          return rowLabels.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-medium text-gray-700 sticky left-0 z-10 whitespace-nowrap">
                                {row}
                              </td>
                              {Array.from({ length: colCount }).map((_, colIndex) => {
                                const cellValue = getCellValue(table._id, rowIndex, colIndex);
                                const isEditing = editingTableId === table._id;
                                const displayValue = isEditing ? cellValue : formatNumberWithCommas(cellValue);
                                
                                return (
                                  <td
                                    key={colIndex}
                                    className={`border border-gray-200 px-0 py-0 transition-all duration-200 ${
                                      isEditing ? 'bg-yellow-50 hover:bg-amber-100' : 'bg-white'
                                    }`}
                                  >
                                    <input
                                      type="text"
                                      value={displayValue}
                                      onChange={(e) => {
                                        const rawValue = removeCommas(e.target.value);
                                        handleCellChange(table._id, rowIndex, colIndex, rawValue);
                                      }}
                                      onFocus={(e) => {
                                        if (isEditing) {
                                          e.target.parentElement?.classList.add('bg-amber-200', 'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]');
                                          e.target.parentElement?.classList.remove('bg-yellow-50', 'bg-amber-100');
                                        }
                                      }}
                                      onBlur={(e) => {
                                        e.target.parentElement?.classList.remove('bg-amber-200', 'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]');
                                        if (isEditing) {
                                          e.target.parentElement?.classList.add('bg-yellow-50');
                                        }
                                      }}
                                      disabled={!isEditing}
                                      className="w-full h-full px-3 py-3 text-[15px] font-mono text-right focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-default"
                                      placeholder={isEditing ? "0" : ""}
                                    />
                                  </td>
                                );
                              })}
                              {/* 行汇总单元格 */}
                              {table.showRowTotal && (
                                <td className="border border-gray-200 bg-green-50 px-3 py-3 text-right font-mono text-[15px] font-bold text-gray-900">
                                  {calculateRowTotal(table._id, rowIndex, colCount).toLocaleString()}
                                </td>
                              )}
                            </tr>
                          ));
                        }
                      })()}
                      
                      {/* 列总计行 - 固定在左侧 */}
                      {table.showColumnTotal && (() => {
                        const rowCount = table.verticalDimension.secondary
                          ? table.verticalDimension.primary.values.length * table.verticalDimension.secondary.values.length
                          : table.verticalDimension.primary.values.length;
                        
                        const colCount = table.horizontalDimension.secondary
                          ? table.horizontalDimension.primary.values.length * table.horizontalDimension.secondary.values.length
                          : table.horizontalDimension.primary.values.length;
                        
                        return (
                          <tr className="bg-gray-50 border-t-2 border-gray-300">
                            <td 
                              colSpan={table.verticalDimension.secondary ? 2 : 1}
                              className="border border-gray-200 bg-gray-50 px-3 py-3 text-center font-bold text-gray-900 sticky left-0 z-10 whitespace-nowrap"
                            >
                              总计
                            </td>
                            {Array.from({ length: colCount }).map((_, colIndex) => (
                              <td
                                key={colIndex}
                                className="border border-gray-200 bg-blue-50 px-3 py-3 text-right font-mono text-[15px] font-bold text-gray-900"
                              >
                                {calculateColumnTotal(table._id, colIndex, rowCount).toLocaleString()}
                              </td>
                            ))}
                            {table.showRowTotal && (
                              <td className="border border-gray-200 bg-green-50 px-3 py-3 text-right font-mono text-[15px] font-bold text-gray-900">
                                {calculateGrandTotal(table._id, rowCount, colCount).toLocaleString()}
                              </td>
                            )}
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalDecompositionMultiTable;
