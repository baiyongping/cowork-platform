import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { SafeguardMeasureWithQuarterly, QuarterlyMeasureEnriched } from '../types/safeguard';

interface SafeguardMeasuresTreeProps {
  safeguards: SafeguardMeasureWithQuarterly[];
  onAddSafeguard?: () => void;
  onEditSafeguard?: (safeguard: SafeguardMeasureWithQuarterly) => void;
  onDeleteSafeguard?: (safeguardId: string) => void;
  onAddQuarterly?: (safeguardId: string) => void;
  onEditQuarterly?: (quarterly: QuarterlyMeasureEnriched) => void;
  onDeleteQuarterly?: (quarterlyId: string) => void;
  canEdit: boolean;
}

export function SafeguardMeasuresTree({
  safeguards,
  onAddSafeguard,
  onEditSafeguard,
  onDeleteSafeguard,
  onAddQuarterly,
  onEditQuarterly,
  onDeleteQuarterly,
  canEdit
}: SafeguardMeasuresTreeProps) {
  // 折叠状态管理
  const [expandedSafeguards, setExpandedSafeguards] = useState<Record<string, boolean>>({});

  const toggleSafeguard = (safeguardId: string) => {
    setExpandedSafeguards(prev => ({
      ...prev,
      [safeguardId]: !prev[safeguardId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成': return 'bg-green-100 text-green-800';
      case '进行中': return 'bg-blue-100 text-blue-800';
      case '未开始': return 'bg-gray-100 text-gray-800';
      case '暂停': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 60) return 'bg-blue-500';
    if (rate >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      {/* 添加保障措施按钮 */}
      {canEdit && (
        <button
          onClick={onAddSafeguard}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加保障措施
        </button>
      )}

      {/* 保障措施列表 */}
      {safeguards.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          暂无保障措施
        </div>
      ) : (
        safeguards.map((safeguard) => (
          <div key={safeguard._id} className="border border-gray-200 rounded-lg">
            {/* 保障措施头部 */}
            <div className="flex items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
              {/* 展开/折叠图标 */}
              <button
                onClick={() => toggleSafeguard(safeguard._id!)}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              >
                {expandedSafeguards[safeguard._id!] ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>

              {/* 保障措施内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-gray-900">{safeguard.content}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(safeguard.status)}`}>
                    {safeguard.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>负责人: {safeguard.owner}</span>
                  <span>截止: {new Date(safeguard.deadline).toLocaleDateString()}</span>
                  <span>季度措施: {safeguard.quarterlyMeasures?.length || 0}条</span>
                </div>
              </div>

              {/* 完成度进度条 */}
              <div className="flex-shrink-0 w-32">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">完成度</span>
                  <span className="text-xs font-medium text-gray-900">{safeguard.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(safeguard.completionRate)}`}
                    style={{ width: `${safeguard.completionRate}%` }}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSafeguard?.(safeguard);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="编辑保障措施"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSafeguard?.(safeguard._id!);
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除保障措施"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 季度措施列表（展开时显示） */}
            {expandedSafeguards[safeguard._id!] && (
              <div className="p-4 bg-white border-t border-gray-200">
                {/* 添加季度措施按钮 */}
                {canEdit && (
                  <button
                    onClick={() => onAddQuarterly?.(safeguard._id!)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors mb-3"
                  >
                    <Plus className="w-4 h-4" />
                    添加季度措施
                  </button>
                )}

                {/* 季度措施列表 */}
                {(!safeguard.quarterlyMeasures || safeguard.quarterlyMeasures.length === 0) ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    暂无季度措施
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeguard.quarterlyMeasures.map((quarterly) => (
                      <div
                        key={quarterly._id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {/* 季度标签 */}
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                          {quarterly.quarter}
                        </div>

                        {/* 季度措施内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{quarterly.content}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(quarterly.status)}`}>
                              {quarterly.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>负责人: {quarterly.owner}</span>
                            <span>截止: {new Date(quarterly.deadline).toLocaleDateString()}</span>
                            {quarterly.taskCount !== undefined && (
                              <span>关联任务: {quarterly.taskCount}个</span>
                            )}
                          </div>
                        </div>

                        {/* 完成度 */}
                        <div className="flex-shrink-0 w-24">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">完成度</span>
                            <span className="text-xs font-medium text-gray-900">{quarterly.completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getProgressColor(quarterly.completionRate)}`}
                              style={{ width: `${quarterly.completionRate}%` }}
                            />
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditQuarterly?.(quarterly);
                              }}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="编辑季度措施"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteQuarterly?.(quarterly._id!);
                              }}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="删除季度措施"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
