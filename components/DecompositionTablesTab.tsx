import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import { showSuccess, showError } from '../utils/ui-feedback';
import CreateDecompositionTableModal from './CreateDecompositionTableModal';

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
  unit: string; // 单位：万元、元、个、人、套
  showRowTotal: boolean; // 是否显示行汇总
  showColumnTotal: boolean; // 是否显示列总计
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
}

/**
 * 分解表构建 Tab
 * 显示分解表列表，支持创建、编辑、删除、启用/禁用
 */
const DecompositionTablesTab: React.FC = () => {
  const [tables, setTables] = useState<DecompositionTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTable, setEditingTable] = useState<DecompositionTable | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await callFunction({
        name: 'decomposition-tables',
        data: { action: 'list', data: {} }
      });

      if (res.result.success) {
        setTables(res.result.data.list || []);
      } else {
        showError(res.result.error || '加载失败');
      }
    } catch (error: any) {
      console.error('加载分解表失败:', error);
      showError(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTable(null);
    setShowCreateModal(true);
  };

  const handleEdit = (table: DecompositionTable) => {
    setEditingTable(table);
    setShowCreateModal(true);
  };

  const handleToggleStatus = async (table: DecompositionTable) => {
    setLoading(true);
    try {
      const res = await callFunction({
        name: 'decomposition-tables',
        data: {
          action: 'toggleStatus',
          data: { id: table._id }
        }
      });

      if (res.result.success) {
        showSuccess(res.result.data.message);
        await loadTables();
      } else {
        showError(res.result.error || '状态切换失败');
      }
    } catch (error: any) {
      console.error('切换状态失败:', error);
      showError(error.message || '状态切换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (table: DecompositionTable) => {
    if (!confirm(`确定要删除分解表"${table.name}"吗？删除后无法恢复`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await callFunction({
        name: 'decomposition-tables',
        data: {
          action: 'delete',
          data: { id: table._id }
        }
      });

      if (res.result.success) {
        showSuccess('分解表删除成功');
        await loadTables();
      } else {
        showError(res.result.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除分解表失败:', error);
      showError(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingTable(null);
  };

  const handleSaveSuccess = () => {
    setShowCreateModal(false);
    setEditingTable(null);
    loadTables();
  };

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">分解表构建</h3>
          <p className="text-sm text-gray-600 mt-1">
            创建和管理目标分解表结构（横纵轴维度）
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增目标分解表
        </button>
      </div>

      {/* 分解表列表（卡片形式） */}
      {tables.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 mb-2">还没有创建任何分解表</p>
          <p className="text-sm text-gray-400 mb-4">
            点击"新增目标分解表"按钮开始创建
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div
              key={table._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* 表名和状态 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-semibold text-gray-900">
                      📊 {table.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        table.isEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {table.isEnabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    创建时间: {new Date(table.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* 维度信息 */}
              <div className="space-y-2 mb-4">
                {/* 横轴 - 只显示一级维度 */}
                {table.horizontalDimension?.primary ? (
                  <div>
                    <span className="text-xs font-medium text-gray-600">横轴: </span>
                    <span className="text-sm text-gray-900">
                      {table.horizontalDimension.primary.dimensionName}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {table.horizontalDimension.primary.values?.map((value, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-600">
                    ⚠️ 横轴维度数据缺失
                  </div>
                )}

                {/* 纵轴 - 只显示一级维度 */}
                {table.verticalDimension?.primary ? (
                  <div>
                    <span className="text-xs font-medium text-gray-600">纵轴: </span>
                    <span className="text-sm text-gray-900">
                      {table.verticalDimension.primary.dimensionName}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {table.verticalDimension.primary.values?.map((value, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-600">
                    ⚠️ 纵轴维度数据缺失
                  </div>
                )}

                {/* 配置信息 */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">单位:</span>
                      <span className="font-medium text-gray-900">{table.unit || '未设置'}</span>
                    </div>
                    {table.showRowTotal && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                        显示行汇总
                      </span>
                    )}
                    {table.showColumnTotal && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">
                        显示列总计
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleStatus(table)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
                    table.isEnabled
                      ? 'text-orange-600 hover:bg-orange-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {table.isEnabled ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      禁用
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      启用
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEdit(table)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {showCreateModal && (
        <CreateDecompositionTableModal
          editingTable={editingTable}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
};

export default DecompositionTablesTab;
