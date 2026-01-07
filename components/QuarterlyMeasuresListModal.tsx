import React from 'react';
import { X, Calendar, User, TrendingUp } from 'lucide-react';
import { QuarterlyMeasureEnriched } from '../types/safeguard';

interface QuarterlyMeasuresListModalProps {
  isOpen: boolean;
  onClose: () => void;
  measures: QuarterlyMeasureEnriched[];
  safeguardContent: string;
}

export function QuarterlyMeasuresListModal({
  isOpen,
  onClose,
  measures,
  safeguardContent
}: QuarterlyMeasuresListModalProps) {
  if (!isOpen) return null;

  // 季度标签映射
  const quarterLabels: Record<number, string> = {
    1: '一季度',
    2: '二季度',
    3: '三季度',
    4: '四季度'
  };

  // 进度颜色
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 bg-green-50';
    if (progress >= 60) return 'text-blue-600 bg-blue-50';
    if (progress >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">季度经营措施列表</h2>
            <p className="text-sm text-gray-600 mt-1">保障措施：{safeguardContent}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {measures.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无季度经营措施</p>
            </div>
          ) : (
            <div className="space-y-4">
              {measures.map((measure) => (
                <div
                  key={measure._id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  {/* 季度标签 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <Calendar className="w-4 h-4 mr-1" />
                        {quarterLabels[measure.quarter]}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(
                        measure.progress
                      )}`}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {measure.progress}%
                    </span>
                  </div>

                  {/* 措施内容 */}
                  <div className="mb-3">
                    <h3 className="text-base font-medium text-gray-900 mb-2">
                      {measure.content}
                    </h3>
                  </div>

                  {/* 负责人 */}
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-1.5" />
                    <span>负责人：</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {measure.owner}
                    </span>
                  </div>

                  {/* 目标值和实际值 */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded px-3 py-2">
                      <span className="text-gray-600">目标值：</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {measure.targetValue}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded px-3 py-2">
                      <span className="text-gray-600">实际值：</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {measure.actualValue || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            共 <span className="font-medium text-gray-900">{measures.length}</span> 项季度措施
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
