import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Grid, Table as TableIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { callFunction } from '../../lib/cloudbase';
import { DecompositionTable } from '../../types/decompositionTable';

interface GoalDecompositionProps {}

const GoalDecomposition: React.FC<GoalDecompositionProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const goalTypeId = queryParams.get('goalTypeId');
  const goalTypeName = queryParams.get('goalTypeName');

  const [tables, setTables] = useState<DecompositionTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<DecompositionTable | null>(null);
  const [cellData, setCellData] = useState<Record<string, any>>({});

  // 加载分解表列表
  useEffect(() => {
    if (goalTypeId) {
      loadTables();
    }
  }, [goalTypeId]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await callFunction({
        name: 'decomposition-table-configs',
        data: {
          action: 'listByGoalType',
          data: { goalTypeId }
        }
      });

      if (res.result.success) {
        setTables(res.result.data || []);
        if (res.result.data?.length > 0) {
          setSelectedTable(res.result.data[0]);
        }
      }
    } catch (error) {
      console.error('加载分解表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理单元格值变化
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!selectedTable) return;
    
    const key = `${selectedTable._id}_${rowIndex}_${colIndex}`;
    setCellData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 获取单元格值
  const getCellValue = (rowIndex: number, colIndex: number): string => {
    if (!selectedTable) return '';
    const key = `${selectedTable._id}_${rowIndex}_${colIndex}`;
    return cellData[key] || '';
  };

  // 保存当前表数据
  const handleSave = async () => {
    if (!selectedTable) return;

    try {
      // TODO: 实现保存逻辑
      console.log('保存数据:', cellData);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  if (!goalTypeId || !goalTypeName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">缺少目标类型信息</p>
          <button
            onClick={() => navigate('/goals')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            返回目标管理
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/goals')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {goalTypeName} - 目标分解
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  共 {tables.length} 个分解表
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/goal-decomposition-table-config?goalTypeId=${goalTypeId}&goalTypeName=${goalTypeName}`)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              配置分解表
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无分解表配置</p>
            <button
              onClick={() => navigate(`/goal-decomposition-table-config?goalTypeId=${goalTypeId}&goalTypeName=${goalTypeName}`)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
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
                          {table.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {table.horizontalDimension.dimensionName} × {table.verticalDimension.dimensionName}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      保存
                    </button>
                  </div>
                </div>

                {/* 分解表格 */}
                <div className="p-6 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[120px]">
                          {table.verticalDimension.dimensionName}
                        </th>
                        {table.horizontalDimension.values.map((col, colIndex) => (
                          <th
                            key={colIndex}
                            className="border border-gray-300 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[150px]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.verticalDimension.values.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                          <td className="border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                            {row}
                          </td>
                          {table.horizontalDimension.values.map((_, colIndex) => (
                            <td
                              key={colIndex}
                              className="border border-gray-300 px-2 py-2"
                            >
                              <input
                                type="text"
                                value={getCellValue(rowIndex, colIndex)}
                                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                className="w-full px-3 py-2 border-0 focus:ring-2 focus:ring-blue-500 rounded text-sm text-gray-900 bg-transparent hover:bg-white transition-colors"
                                placeholder="输入数值"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 卡片底部统计 */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {table.horizontalDimension.values.length} 列
                    </span>
                    <span>×</span>
                    <span>{table.verticalDimension.values.length} 行</span>
                    <span>=</span>
                    <span className="font-semibold text-blue-600">
                      {table.horizontalDimension.values.length * table.verticalDimension.values.length} 个单元格
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    更新于 {new Date(table.updatedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalDecomposition;
