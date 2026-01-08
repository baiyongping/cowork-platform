import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Calendar, User } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import type { GoalDecompositionHistory } from '../types/goalDecomposition';

interface DecompositionHistoryModalProps {
  goalId: string;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}

const DecompositionHistoryModal: React.FC<DecompositionHistoryModalProps> = ({
  goalId,
  onClose,
  onRestore,
}) => {
  const [histories, setHistories] = useState<GoalDecompositionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<GoalDecompositionHistory | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadHistories();
  }, [goalId]);

  const loadHistories = async () => {
    setLoading(true);
    try {
      const res = await callFunction({
        name: 'decomposition-management',
        data: { 
          action: 'getHistory',
          goalId 
        }
      });

      if (res.result.success) {
        setHistories(res.result.data);
      }
    } catch (error) {
      console.error('加载历史版本失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('确定要恢复到此版本吗？当前数据将被保存为历史版本。')) {
      return;
    }

    try {
      const res = await callFunction({
        name: 'decomposition-management',
        data: { 
          action: 'restoreVersion',
          goalId,
          versionId 
        }
      });

      if (res.result.success) {
        onRestore(versionId);
        onClose();
      } else {
        alert(res.result.error || '恢复失败');
      }
    } catch (error: any) {
      alert(error.message || '恢复失败');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderVersionDetail = (history: GoalDecompositionHistory) => {
    const total = history.snapshot.cells.reduce((sum, cell) => sum + cell.value, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">创建时间:</span>
            <span className="ml-2 font-medium">{formatDate(history.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-600">创建人:</span>
            <span className="ml-2 font-medium">{history.createdBy}</span>
          </div>
          <div>
            <span className="text-gray-600">目标值:</span>
            <span className="ml-2 font-medium">{history.snapshot.targetValue.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">分解总和:</span>
            <span className="ml-2 font-medium">{total.toFixed(2)}</span>
          </div>
        </div>

        {history.comment && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">{history.comment}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {history.snapshot.dimensionIds.map((dimId, idx) => (
                  <th key={dimId} className="px-3 py-2 text-left border">
                    维度 {idx + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-right border">值</th>
              </tr>
            </thead>
            <tbody>
              {history.snapshot.cells.slice(0, 10).map((cell, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {cell.dimensionPath.map((path, pathIdx) => (
                    <td key={pathIdx} className="px-3 py-2 border">
                      {path.itemName}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right border">
                    {cell.value.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.snapshot.cells.length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              仅显示前10条数据，共 {history.snapshot.cells.length} 条
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">历史版本</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : histories.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">暂无历史版本</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 h-full">
              {/* 版本列表 */}
              <div className="border-r overflow-y-auto">
                <div className="p-4 space-y-2">
                  {histories.map((history, index) => (
                    <button
                      key={history._id}
                      onClick={() => setSelectedVersion(history)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedVersion?._id === history._id
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            版本 {histories.length - index}
                            {index === 0 && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                当前
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {formatDate(history.createdAt)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            {history.createdBy}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 版本详情 */}
              <div className="col-span-2 overflow-y-auto">
                {selectedVersion ? (
                  <div className="p-6">
                    {renderVersionDetail(selectedVersion)}
                    
                    {selectedVersion !== histories[0] && (
                      <div className="mt-6 pt-6 border-t flex justify-end">
                        <button
                          onClick={() => handleRestore(selectedVersion._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <RotateCcw className="w-4 h-4" />
                          恢复此版本
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    请选择一个版本查看详情
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecompositionHistoryModal;
