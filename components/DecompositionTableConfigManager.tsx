import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { callFunction } from '../lib/cloudbase';
import { showSuccess, showError, showConfirm } from '../lib/dialog-utils';
import type { DecompositionTableConfig, TableColumn } from '../types/decompositionTable';

export const DecompositionTableConfigManager: React.FC = () => {
  const [tables, setTables] = useState<DecompositionTableConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<DecompositionTableConfig | null>(null);
  const [formData, setFormData] = useState<Partial<DecompositionTableConfig>>({
    name: '',
    columns: [],
    sortOrder: 0,
    isActive: true
  });
  const [newColumn, setNewColumn] = useState<Partial<TableColumn>>({
    name: '',
    type: 'text',
    required: false
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-table-config',
        data: { action: 'list' }
      });

      if (result.result.success) {
        setTables(result.result.data);
      }
    } catch (error) {
      console.error('加载表配置失败:', error);
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    setEditingTable(null);
    setFormData({
      name: '',
      columns: [],
      sortOrder: tables.length,
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditTable = (table: DecompositionTableConfig) => {
    setEditingTable(table);
    setFormData(table);
    setShowModal(true);
  };

  const handleSaveTable = async () => {
    if (!formData.name?.trim()) {
      showError('请输入表名');
      return;
    }

    if (formData.columns!.length === 0) {
      showError('请添加至少一列');
      return;
    }

    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-table-config',
        data: {
          action: editingTable ? 'update' : 'create',
          id: editingTable?._id,
          data: formData
        }
      });

      if (result.result.success) {
        showSuccess(editingTable ? '更新成功' : '创建成功');
        setShowModal(false);
        await loadTables();
      } else {
        showError(result.result.message || '操作失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      showError('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    const confirmed = await showConfirm('确定删除此表配置吗？已关联的数据也会被删除！');
    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-table-config',
        data: { action: 'delete', id }
      });

      if (result.result.success) {
        showSuccess('删除成功');
        await loadTables();
      } else {
        showError(result.result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      showError('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (table: DecompositionTableConfig) => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-table-config',
        data: {
          action: 'update',
          id: table._id,
          data: { isActive: !table.isActive }
        }
      });

      if (result.result.success) {
        showSuccess(table.isActive ? '已禁用' : '已启用');
        await loadTables();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      showError('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveTogether = async (table: DecompositionTableConfig, direction: 'up' | 'down') => {
    const index = tables.findIndex(t => t._id === table._id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tables.length - 1)) {
      return;
    }

    const newTables = [...tables];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newTables[index], newTables[targetIndex]] = [newTables[targetIndex], newTables[index]];

    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-table-config',
        data: {
          action: 'updateSortOrder',
          tables: newTables.map((t, idx) => ({ id: t._id, sortOrder: idx }))
        }
      });

      if (result.result.success) {
        await loadTables();
      }
    } catch (error) {
      console.error('调整顺序失败:', error);
      showError('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    if (!newColumn.name?.trim()) {
      showError('请输入列名');
      return;
    }

    const column: TableColumn = {
      id: Date.now().toString(),
      name: newColumn.name.trim(),
      type: newColumn.type || 'text',
      required: newColumn.required || false,
      options: newColumn.options
    };

    setFormData({
      ...formData,
      columns: [...(formData.columns || []), column]
    });

    setNewColumn({
      name: '',
      type: 'text',
      required: false
    });
  };

  const handleRemoveColumn = (columnId: string) => {
    setFormData({
      ...formData,
      columns: formData.columns!.filter(c => c.id !== columnId)
    });
  };

  return (
    <div className="p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            分解表配置
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            配置目标分解时使用的表结构
          </p>
        </div>
        <button
          onClick={handleAddTable}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新增分解表
        </button>
      </div>

      {/* 表列表 */}
      <div className="grid grid-cols-1 gap-4">
        {tables.map((table, index) => (
          <div
            key={table._id}
            className={`bg-white rounded-lg shadow-sm border-2 p-4 ${
              table.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-gray-900">
                  {table.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  table.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {table.isActive ? '已启用' : '已禁用'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 排序按钮 */}
                <button
                  onClick={() => handleMoveTogether(table, 'up')}
                  disabled={index === 0}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="上移"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveTogether(table, 'down')}
                  disabled={index === tables.length - 1}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="下移"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {/* 启用/禁用 */}
                <button
                  onClick={() => handleToggleActive(table)}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {table.isActive ? '禁用' : '启用'}
                </button>

                {/* 编辑 */}
                <button
                  onClick={() => handleEditTable(table)}
                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* 删除 */}
                <button
                  onClick={() => handleDeleteTable(table._id!)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 列信息 */}
            <div className="flex flex-wrap gap-2">
              {table.columns.map(col => (
                <span
                  key={col.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  <span className="font-medium">{col.name}</span>
                  <span className="text-gray-500">({col.type})</span>
                  {col.required && <span className="text-red-500">*</span>}
                </span>
              ))}
            </div>
          </div>
        ))}

        {tables.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>暂无分解表配置</p>
          </div>
        )}
      </div>

      {/* 新增/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingTable ? '编辑分解表' : '新增分解表'}
              </h3>

              {/* 表名 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表名 *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：地域维度分解表"
                />
              </div>

              {/* 列配置 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  列配置
                </label>

                {/* 已添加的列 */}
                <div className="space-y-2 mb-3">
                  {formData.columns?.map(col => (
                    <div key={col.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1">{col.name}</span>
                      <span className="text-sm text-gray-500">({col.type})</span>
                      {col.required && <span className="text-red-500">*</span>}
                      <button
                        onClick={() => handleRemoveColumn(col.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 添加新列 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newColumn.name || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="列名"
                  />
                  <select
                    value={newColumn.type || 'text'}
                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as any })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="text">文本</option>
                    <option value="number">数字</option>
                    <option value="select">下拉</option>
                    <option value="date">日期</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={newColumn.required || false}
                      onChange={(e) => setNewColumn({ ...newColumn, required: e.target.checked })}
                    />
                    <span className="text-sm">必填</span>
                  </label>
                  <button
                    onClick={handleAddColumn}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTable}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecompositionTableConfigManager;
