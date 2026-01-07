import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { SafeguardInlineForm } from './SafeguardInlineForm';
import { QuarterlyInlineForm } from './QuarterlyInlineForm';
import { AnnualStrategyWithSafeguards, SafeguardMeasureWithQuarterly, QuarterlyMeasureEnriched } from '../types/safeguard';
import { callFunction } from '../lib/cloudbase';
import { showSuccess, showError, showConfirm } from '../lib/dialog-utils';

interface StrategyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: AnnualStrategyWithSafeguards | null;
  users: Array<{ _id: string; name: string }>;
  canEdit: boolean;
  onRefresh?: () => void;
}

export function StrategyDetailModal({
  isOpen,
  onClose,
  strategy,
  users,
  canEdit,
  onRefresh
}: StrategyDetailModalProps) {
  const [safeguards, setSafeguards] = useState<SafeguardMeasureWithQuarterly[]>([]);
  const [loading, setLoading] = useState(false);

  // 内联编辑状态
  const [editingSafeguardId, setEditingSafeguardId] = useState<string | null>(null);
  const [addingSafeguard, setAddingSafeguard] = useState(false);
  const [editingQuarterlyId, setEditingQuarterlyId] = useState<string | null>(null);
  const [addingQuarterlyForSafeguard, setAddingQuarterlyForSafeguard] = useState<string | null>(null);
  const [expandedSafeguards, setExpandedSafeguards] = useState<Set<string>>(new Set());

  // 加载保障措施和季度措施
  useEffect(() => {
    if (isOpen && strategy) {
      loadSafeguardsWithQuarterly();
    }
  }, [isOpen, strategy]);

  const loadSafeguardsWithQuarterly = async () => {
    if (!strategy?._id) return;

    setLoading(true);
    try {
      // 1. 查询保障措施
      const safeguardRes = await callFunction({
        name: 'safeguard-measures',
        data: {
          action: 'queryByStrategy',
          data: { strategyId: strategy._id }
        }
      });

      if (!safeguardRes.result.success) {
        throw new Error(safeguardRes.result.message || '查询保障措施失败');
      }

      const safeguardData = safeguardRes.result.data || [];

      // 2. 为每个保障措施查询关联的季度措施
      const enrichedSafeguards = await Promise.all(
        safeguardData.map(async (safeguard: any) => {
          const quarterlyRes = await callFunction({
            name: 'quarterly-measures',
            data: {
              action: 'queryBySafeguard',
              data: { safeguardMeasureId: safeguard._id }
            }
          });

          return {
            ...safeguard,
            quarterlyMeasures: quarterlyRes.result.success ? quarterlyRes.result.data : []
          };
        })
      );

      setSafeguards(enrichedSafeguards);
    } catch (error: any) {
      console.error('加载保障措施失败:', error);
      showError(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加保障措施
  const handleAddSafeguard = () => {
    console.log('🆕 开始添加保障措施');
    setAddingSafeguard(true);
    setEditingSafeguardId(null);
  };

  // 编辑保障措施
  const handleEditSafeguard = (safeguardId: string) => {
    console.log('✏️ 开始编辑保障措施:', safeguardId);
    setEditingSafeguardId(safeguardId);
    setAddingSafeguard(false);
  };

  // 取消保障措施编辑
  const handleCancelSafeguardEdit = () => {
    setEditingSafeguardId(null);
    setAddingSafeguard(false);
  };

  // 删除保障措施
  const handleDeleteSafeguard = async (safeguardId: string) => {
    console.log('🗑️ 点击删除保障措施:', safeguardId);
    const confirmed = await showConfirm('确定要删除此保障措施吗？删除后关联的季度措施也会被删除。');
    console.log('✅ 用户确认删除:', confirmed);
    if (!confirmed) return;

    try {
      console.log('📡 调用云函数删除...');
      const res = await callFunction({
        name: 'safeguard-measures',
        data: {
          action: 'delete',
          data: { _id: safeguardId }
        }
      });

      console.log('📦 云函数返回:', res);
      if (!res.result.success) {
        throw new Error(res.result.message || '删除失败');
      }

      showSuccess('删除成功');
      console.log('🔄 重新加载数据...');
      loadSafeguardsWithQuarterly();
      onRefresh?.();
    } catch (error: any) {
      console.error('❌ 删除保障措施失败:', error);
      showError(error.message || '删除失败');
    }
  };

  // 保存保障措施
  const handleSaveSafeguard = async (data: any) => {
    try {
      const isEditing = editingSafeguardId !== null;
      const action = isEditing ? 'update' : 'create';
      const submitData = isEditing ? { ...data, _id: editingSafeguardId } : data;
      
      const res = await callFunction({
        name: 'safeguard-measures',
        data: { action, data: submitData }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '保存失败');
      }

      showSuccess(isEditing ? '更新成功' : '添加成功');
      handleCancelSafeguardEdit();
      loadSafeguardsWithQuarterly();
      onRefresh?.();
    } catch (error: any) {
      console.error('保存保障措施失败:', error);
      showError(error.message || '保存失败');
    }
  };

  // 添加季度措施
  const handleAddQuarterly = (safeguardId: string) => {
    console.log('🆕 开始添加季度措施:', safeguardId);
    setAddingQuarterlyForSafeguard(safeguardId);
    setEditingQuarterlyId(null);
    // 自动展开保障措施
    setExpandedSafeguards(prev => new Set([...prev, safeguardId]));
  };

  // 编辑季度措施
  const handleEditQuarterly = (quarterlyId: string, safeguardId: string) => {
    console.log('✏️ 开始编辑季度措施:', quarterlyId);
    setEditingQuarterlyId(quarterlyId);
    setAddingQuarterlyForSafeguard(null);
    // 自动展开保障措施
    setExpandedSafeguards(prev => new Set([...prev, safeguardId]));
  };

  // 取消季度措施编辑
  const handleCancelQuarterlyEdit = () => {
    setEditingQuarterlyId(null);
    setAddingQuarterlyForSafeguard(null);
  };

  // 切换保障措施展开状态
  const toggleSafeguardExpand = (safeguardId: string) => {
    setExpandedSafeguards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(safeguardId)) {
        newSet.delete(safeguardId);
      } else {
        newSet.add(safeguardId);
      }
      return newSet;
    });
  };

  // 删除季度措施
  const handleDeleteQuarterly = async (quarterlyId: string) => {
    const confirmed = await showConfirm('确定要删除此季度措施吗？');
    if (!confirmed) return;

    try {
      const res = await callFunction({
        name: 'quarterly-measures',
        data: {
          action: 'delete',
          data: { _id: quarterlyId }
        }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '删除失败');
      }

      showSuccess('删除成功');
      loadSafeguardsWithQuarterly();
      onRefresh?.();
    } catch (error: any) {
      console.error('删除季度措施失败:', error);
      showError(error.message || '删除失败');
    }
  };

  // 保存季度措施
  const handleSaveQuarterly = async (data: any) => {
    try {
      const isEditing = editingQuarterlyId !== null;
      const action = isEditing ? 'update' : 'create';
      const submitData = isEditing ? { ...data, _id: editingQuarterlyId } : data;
      
      const res = await callFunction({
        name: 'quarterly-measures',
        data: { action, data: submitData }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '保存失败');
      }

      showSuccess(isEditing ? '更新成功' : '添加成功');
      handleCancelQuarterlyEdit();
      loadSafeguardsWithQuarterly();
      onRefresh?.();
    } catch (error: any) {
      console.error('保存季度措施失败:', error);
      showError(error.message || '保存失败');
    }
  };



  if (!isOpen || !strategy) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">年度策略详情</h2>
              <p className="text-sm text-gray-600 mt-1">{strategy.year}年度经营策略</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSafeguardsWithQuarterly}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="刷新"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 策略信息 */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">策略内容：</span>
                <span className="text-gray-900 font-medium">{strategy.content}</span>
              </div>
              <div>
                <span className="text-gray-600">负责人：</span>
                <span className="text-gray-900 font-medium">{strategy.owner}</span>
              </div>
              <div>
                <span className="text-gray-600">权重：</span>
                <span className="text-gray-900 font-medium">{strategy.weight}%</span>
              </div>
              <div>
                <span className="text-gray-600">完成度：</span>
                <span className="text-gray-900 font-medium">{strategy.completionRate || 0}%</span>
              </div>
            </div>
          </div>

          {/* 保障措施列表 */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 添加保障措施按钮 */}
                {canEdit && !addingSafeguard && (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">保障措施列表</h3>
                    <button
                      onClick={handleAddSafeguard}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加保障措施
                    </button>
                  </div>
                )}

                {/* 添加保障措施表单 */}
                {addingSafeguard && (
                  <SafeguardInlineForm
                    onSubmit={handleSaveSafeguard}
                    onCancel={handleCancelSafeguardEdit}
                    strategyId={strategy._id!}
                    year={strategy.year}
                    users={users}
                  />
                )}

                {safeguards.length === 0 && !addingSafeguard ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">暂无保障措施</p>
                    {canEdit && (
                      <button
                        onClick={handleAddSafeguard}
                        className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        点击添加保障措施
                      </button>
                    )}
                  </div>
                ) : (
                  safeguards.map((safeguard) => (
                    <div key={safeguard._id} className="space-y-2">
                      {/* 保障措施卡片 */}
                      {editingSafeguardId === safeguard._id ? (
                        // 编辑模式
                        <SafeguardInlineForm
                          editing={safeguard}
                          onSubmit={handleSaveSafeguard}
                          onCancel={handleCancelSafeguardEdit}
                          strategyId={strategy._id!}
                          year={strategy.year}
                          users={users}
                        />
                      ) : (
                        // 查看模式
                        <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                          {/* 保障措施头部 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-base font-medium text-gray-900 mb-2">
                                {safeguard.content}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div>
                                  <span>负责人：</span>
                                  <span className="font-medium text-gray-900">{safeguard.owner}</span>
                                </div>
                                <div>
                                  <span>完成度：</span>
                                  <span className="font-medium text-gray-900">{safeguard.completionRate || 0}%</span>
                                </div>
                                <div>
                                  <span>季度措施：</span>
                                  <span className="font-medium text-gray-900">
                                    {safeguard.quarterlyMeasures?.length || 0} 项
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-2 ml-4">
                              {/* 展开/收起季度措施 */}
                              {safeguard.quarterlyMeasures && safeguard.quarterlyMeasures.length > 0 && (
                                <button
                                  onClick={() => toggleSafeguardExpand(safeguard._id!)}
                                  className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                  title={expandedSafeguards.has(safeguard._id!) ? "收起" : "展开"}
                                >
                                  {expandedSafeguards.has(safeguard._id!) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {canEdit && (
                                <>
                                  {/* 添加季度措施 */}
                                  <button
                                    onClick={() => handleAddQuarterly(safeguard._id!)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="添加季度措施"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>

                                  {/* 编辑保障措施 */}
                                  <button
                                    onClick={() => handleEditSafeguard(safeguard._id!)}
                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                    title="编辑"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  {/* 删除保障措施 */}
                                  <button
                                    onClick={() => handleDeleteSafeguard(safeguard._id!)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 进度条 */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${safeguard.completionRate || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 季度措施列表（展开时显示） */}
                      {expandedSafeguards.has(safeguard._id!) && (
                        <div className="ml-6 space-y-2">
                          {/* 添加季度措施表单 */}
                          {addingQuarterlyForSafeguard === safeguard._id && (
                            <QuarterlyInlineForm
                              onSubmit={handleSaveQuarterly}
                              onCancel={handleCancelQuarterlyEdit}
                              safeguardMeasureId={safeguard._id!}
                              year={strategy.year}
                              users={users}
                            />
                          )}

                          {/* 季度措施列表 */}
                          {safeguard.quarterlyMeasures?.map((quarterly) => (
                            <div key={quarterly._id}>
                              {editingQuarterlyId === quarterly._id ? (
                                // 编辑模式
                                <QuarterlyInlineForm
                                  editing={quarterly}
                                  onSubmit={handleSaveQuarterly}
                                  onCancel={handleCancelQuarterlyEdit}
                                  safeguardMeasureId={safeguard._id!}
                                  year={strategy.year}
                                  users={users}
                                />
                              ) : (
                                // 查看模式
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                          Q{quarterly.quarter}
                                        </span>
                                        <span className="text-sm text-gray-900 font-medium">
                                          {quarterly.content}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-gray-600">
                                        <div>
                                          <span>负责人：</span>
                                          <span className="font-medium text-gray-900">{quarterly.owner}</span>
                                        </div>
                                        <div>
                                          <span>完成度：</span>
                                          <span className="font-medium text-gray-900">{quarterly.completionRate || 0}%</span>
                                        </div>
                                      </div>
                                    </div>

                                    {canEdit && (
                                      <div className="flex items-center gap-1 ml-4">
                                        <button
                                          onClick={() => handleEditQuarterly(quarterly._id!, safeguard._id!)}
                                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                          title="编辑"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteQuarterly(quarterly._id!)}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* 进度条 */}
                                  <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${quarterly.completionRate || 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
