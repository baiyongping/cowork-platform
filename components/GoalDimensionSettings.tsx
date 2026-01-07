import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  Power,
  AlertCircle,
  Users,
  Building2
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { callFunction } from '../lib/cloudbase';
import type { GoalDecompositionDimension, CreateDimensionInput, UpdateDimensionInput } from '../types/goalDecomposition';

interface SortableItemProps {
  id: string;
  value: string;
  onEdit: (value: string) => void;
  onDelete: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, value, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(editValue.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>

      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditValue(value);
              setIsEditing(false);
            }}
            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1">{value}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const GoalDimensionSettings: React.FC = () => {
  const [dimensions, setDimensions] = useState<GoalDecompositionDimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDimension, setEditingDimension] = useState<GoalDecompositionDimension | null>(null);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    loadDimensions();
  }, []);

  const loadDimensions = async () => {
    try {
      setLoading(true);
      const res = await callFunction({
        name: 'dimension-management',
        data: {
          action: 'list',
          data: { status: 'all' }
        }
      });

      if (res.result.success) {
        setDimensions(res.result.data);
      }
    } catch (error) {
      console.error('加载维度失败:', error);
      alert('加载维度失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (dimensionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: {
          action: 'toggleStatus',
          data: { dimensionId, status: newStatus }
        }
      });

      if (res.result.success) {
        await loadDimensions();
        alert(res.result.message);
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      alert('切换状态失败');
    }
  };

  const handleDeleteDimension = async (dimensionId: string) => {
    if (!confirm('确定要删除此维度吗？如果已被使用，将只能停用。')) {
      return;
    }

    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: {
          action: 'delete',
          data: { dimensionId }
        }
      });

      if (res.result.success) {
        await loadDimensions();
        alert(res.result.message);
      }
    } catch (error) {
      console.error('删除维度失败:', error);
      alert('删除维度失败');
    }
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">目标分解维度设置</h2>
          <p className="text-sm text-gray-500 mt-1">配置目标分解的维度结构</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          新增维度
        </button>
      </div>

      {/* 维度列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : dimensions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">暂无维度，点击"新增维度"开始配置</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {dimensions.map((dimension) => (
            <DimensionCard
              key={dimension._id}
              dimension={dimension}
              sensors={sensors}
              onEdit={() => setEditingDimension(dimension)}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteDimension}
              onUpdate={loadDimensions}
            />
          ))}
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {(showCreateModal || editingDimension) && (
        <DimensionModal
          dimension={editingDimension}
          onClose={() => {
            setShowCreateModal(false);
            setEditingDimension(null);
          }}
          onSuccess={loadDimensions}
        />
      )}
    </div>
  );
};

interface DimensionCardProps {
  dimension: GoalDecompositionDimension;
  sensors: any;
  onEdit: () => void;
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

const DimensionCard: React.FC<DimensionCardProps> = ({
  dimension,
  sensors,
  onEdit,
  onToggleStatus,
  onDelete,
  onUpdate
}) => {
  const [level1Items, setLevel1Items] = useState(dimension.level1Items);
  const [level2Items, setLevel2Items] = useState(dimension.level2Items);

  const handleDragEnd = async (event: any, level: 'level1' | 'level2') => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const items = level === 'level1' ? level1Items : level2Items;
      const setItems = level === 'level1' ? setLevel1Items : setLevel2Items;

      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // 更新排序
      try {
        await callFunction({
          name: 'dimension-management',
          data: {
            action: 'updateOrder',
            data: {
              dimensionId: dimension._id,
              level,
              newOrder: newItems.map((_, index) => index)
            }
          }
        });
        onUpdate();
      } catch (error) {
        console.error('更新排序失败:', error);
        alert('更新排序失败');
      }
    }
  };

  const handleEditItem = async (level: 'level1' | 'level2', index: number, newValue: string) => {
    const items = level === 'level1' ? [...level1Items] : [...level2Items];
    items[index] = newValue;

    try {
      await callFunction({
        name: 'dimension-management',
        data: {
          action: 'update',
          data: {
            dimensionId: dimension._id,
            [level === 'level1' ? 'level1Items' : 'level2Items']: items
          }
        }
      });

      if (level === 'level1') {
        setLevel1Items(items);
      } else {
        setLevel2Items(items);
      }
      onUpdate();
    } catch (error) {
      console.error('更新项失败:', error);
      alert('更新项失败');
    }
  };

  const handleDeleteItem = async (level: 'level1' | 'level2', index: number) => {
    const items = level === 'level1' ? [...level1Items] : [...level2Items];
    items.splice(index, 1);

    try {
      await callFunction({
        name: 'dimension-management',
        data: {
          action: 'update',
          data: {
            dimensionId: dimension._id,
            [level === 'level1' ? 'level1Items' : 'level2Items']: items
          }
        }
      });

      if (level === 'level1') {
        setLevel1Items(items);
      } else {
        setLevel2Items(items);
      }
      onUpdate();
    } catch (error) {
      console.error('删除项失败:', error);
      alert('删除项失败');
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${dimension.status === 'inactive' ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
      {/* 维度头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{dimension.dimensionName}</h3>
          <span className={`px-2 py-1 text-xs rounded ${
            dimension.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {dimension.status === 'active' ? '启用' : '停用'}
          </span>
          {dimension.usageCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              使用中 ({dimension.usageCount})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleStatus(dimension._id, dimension.status)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title={dimension.status === 'active' ? '停用' : '启用'}
          >
            <Power className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(dimension._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 一级维度 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">一级维度项</h4>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEnd(event, 'level1')}
        >
          <SortableContext items={level1Items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {level1Items.map((item, index) => (
                <SortableItem
                  key={item}
                  id={item}
                  value={item}
                  onEdit={(value) => handleEditItem('level1', index, value)}
                  onDelete={() => handleDeleteItem('level1', index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 二级维度 */}
      {dimension.hasLevel2 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">二级维度项</h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, 'level2')}
          >
            <SortableContext items={level2Items} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {level2Items.map((item, index) => (
                  <SortableItem
                    key={item}
                    id={item}
                    value={item}
                    onEdit={(value) => handleEditItem('level2', index, value)}
                    onDelete={() => handleDeleteItem('level2', index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

interface DimensionModalProps {
  dimension: GoalDecompositionDimension | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DimensionModal: React.FC<DimensionModalProps> = ({ dimension, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateDimensionInput>({
    dimensionName: dimension?.dimensionName || '',
    level1Items: dimension?.level1Items || [''],
    hasLevel2: dimension?.hasLevel2 || false,
    level2Items: dimension?.level2Items || []
  });
  const [saving, setSaving] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<'level1' | 'level2'>('level1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!formData.dimensionName.trim()) {
      alert('请输入维度名称');
      return;
    }

    const validLevel1Items = formData.level1Items.filter(item => item.trim());
    if (validLevel1Items.length === 0) {
      alert('请至少添加一个一级维度项');
      return;
    }

    if (formData.hasLevel2) {
      const validLevel2Items = formData.level2Items?.filter(item => item.trim()) || [];
      if (validLevel2Items.length === 0) {
        alert('启用二级维度时，请至少添加一个二级维度项');
        return;
      }
    }

    try {
      setSaving(true);

      const data: any = {
        dimensionName: formData.dimensionName.trim(),
        level1Items: validLevel1Items,
        hasLevel2: formData.hasLevel2,
        level2Items: formData.hasLevel2 
          ? (formData.level2Items?.filter(item => item.trim()) || [])
          : []
      };

      if (dimension) {
        // 更新
        data.dimensionId = dimension._id;
        await callFunction({
          name: 'dimension-management',
          data: {
            action: 'update',
            data
          }
        });
      } else {
        // 创建
        await callFunction({
          name: 'dimension-management',
          data: {
            action: 'create',
            data
          }
        });
      }

      alert(`维度${dimension ? '更新' : '创建'}成功`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('保存维度失败:', error);
      alert('保存维度失败');
    } finally {
      setSaving(false);
    }
  };

  const addLevel1Item = () => {
    setFormData({
      ...formData,
      level1Items: [...formData.level1Items, '']
    });
  };

  const updateLevel1Item = (index: number, value: string) => {
    const newItems = [...formData.level1Items];
    newItems[index] = value;
    setFormData({ ...formData, level1Items: newItems });
  };

  const removeLevel1Item = (index: number) => {
    const newItems = formData.level1Items.filter((_, i) => i !== index);
    setFormData({ ...formData, level1Items: newItems });
  };

  const addLevel2Item = () => {
    setFormData({
      ...formData,
      level2Items: [...(formData.level2Items || []), '']
    });
  };

  const updateLevel2Item = (index: number, value: string) => {
    const newItems = [...(formData.level2Items || [])];
    newItems[index] = value;
    setFormData({ ...formData, level2Items: newItems });
  };

  const removeLevel2Item = (index: number) => {
    const newItems = (formData.level2Items || []).filter((_, i) => i !== index);
    setFormData({ ...formData, level2Items: newItems });
  };

  const handleBatchAddItems = (items: string[], level: 'level1' | 'level2') => {
    if (level === 'level1') {
      const newItems = [...formData.level1Items.filter(item => item.trim()), ...items];
      setFormData({ ...formData, level1Items: newItems });
    } else {
      const newItems = [...(formData.level2Items || []).filter(item => item.trim()), ...items];
      setFormData({ ...formData, level2Items: newItems });
    }
  };

  const openEmployeeModal = (level: 'level1' | 'level2') => {
    setCurrentLevel(level);
    setShowEmployeeModal(true);
  };

  const openDepartmentModal = (level: 'level1' | 'level2') => {
    setCurrentLevel(level);
    setShowDepartmentModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold">
            {dimension ? '编辑维度' : '新增维度'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 维度名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              维度名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.dimensionName}
              onChange={(e) => setFormData({ ...formData, dimensionName: e.target.value })}
              placeholder="如：季度维度、区域维度"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 一级维度项 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              一级维度项 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {formData.level1Items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateLevel1Item(index, e.target.value)}
                    placeholder="输入维度项名称（例如：华北、华南、华东）"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {index === formData.level1Items.length - 1 && (
                    <>
                      <button
                        type="button"
                        onClick={addLevel1Item}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        title="手动添加"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEmployeeModal('level1')}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                        title="从员工列表选择"
                      >
                        <Users className="w-4 h-4" />
                        <span className="text-sm">员工</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDepartmentModal('level1')}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                        title="从部门列表选择"
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">部门</span>
                      </button>
                    </>
                  )}
                  {formData.level1Items.length > 1 && index !== formData.level1Items.length - 1 && (
                    <button
                      type="button"
                      onClick={() => removeLevel1Item(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formData.level1Items.length === 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center py-4 border border-dashed border-gray-300 rounded">
                暂无维度项，请添加
              </p>
            )}
          </div>

          {/* 二级维度开关 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasLevel2"
              checked={formData.hasLevel2}
              onChange={(e) => setFormData({ ...formData, hasLevel2: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="hasLevel2" className="text-sm font-medium text-gray-700">
              启用二级维度
            </label>
          </div>

          {/* 二级维度项 */}
          {formData.hasLevel2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                二级维度项 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {(formData.level2Items || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateLevel2Item(index, e.target.value)}
                      placeholder="输入维度项名称（例如：华北、华南、华东）"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {index === (formData.level2Items?.length || 0) - 1 && (
                      <>
                        <button
                          type="button"
                          onClick={addLevel2Item}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                          title="手动添加"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEmployeeModal('level2')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                          title="从员工列表选择"
                        >
                          <Users className="w-4 h-4" />
                          <span className="text-sm">员工</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDepartmentModal('level2')}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                          title="从部门列表选择"
                        >
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">部门</span>
                        </button>
                      </>
                    )}
                    {(formData.level2Items?.length || 0) > 1 && index !== (formData.level2Items?.length || 0) - 1 && (
                      <button
                        type="button"
                        onClick={() => removeLevel2Item(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(formData.level2Items?.length || 0) === 0 && (
                <p className="text-sm text-gray-500 mt-2 text-center py-4 border border-dashed border-gray-300 rounded">
                  暂无维度项，请添加
                </p>
              )}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        {/* 员工选择模态框 */}
        {showEmployeeModal && (
          <EmployeeSelectionModal
            onClose={() => setShowEmployeeModal(false)}
            onConfirm={(employees) => {
              handleBatchAddItems(employees, currentLevel);
              setShowEmployeeModal(false);
            }}
          />
        )}

        {/* 部门选择模态框 */}
        {showDepartmentModal && (
          <DepartmentSelectionModal
            onClose={() => setShowDepartmentModal(false)}
            onConfirm={(departments) => {
              handleBatchAddItems(departments, currentLevel);
              setShowDepartmentModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

// 员工选择模态框
interface EmployeeSelectionModalProps {
  onClose: () => void;
  onConfirm: (employees: string[]) => void;
}

const EmployeeSelectionModal: React.FC<EmployeeSelectionModalProps> = ({ onClose, onConfirm }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await callFunction({
        name: 'user-management',
        data: {
          action: 'list',
          data: { status: 'active' }
        }
      });

      if (res.result.success) {
        setEmployees(res.result.data || []);
      }
    } catch (error) {
      console.error('加载员工失败:', error);
      alert('加载员工失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selectedEmployees = employees
      .filter(emp => selectedIds.has(emp._id))
      .map(emp => emp.name);
    onConfirm(selectedEmployees);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">选择员工</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="搜索员工姓名或工号..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 员工列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无员工</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => (
                <label
                  key={emp._id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp._id)}
                    onChange={() => toggleSelection(emp._id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{emp.name}</div>
                    {emp.employeeId && (
                      <div className="text-sm text-gray-500">工号: {emp.employeeId}</div>
                    )}
                    {emp.team && (
                      <div className="text-sm text-gray-500">部门: {emp.team}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              已选择 {selectedIds.size} 人
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              清空选择
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确定（{selectedIds.size}）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 部门选择模态框
interface DepartmentSelectionModalProps {
  onClose: () => void;
  onConfirm: (departments: string[]) => void;
}

const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({ onClose, onConfirm }) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await callFunction({
        name: 'department-management',
        data: {
          action: 'list',
          data: {}
        }
      });

      if (res.result.success) {
        setDepartments(res.result.data || []);
      }
    } catch (error) {
      console.error('加载部门失败:', error);
      alert('加载部门失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selectedDepartments = departments
      .filter(dept => selectedIds.has(dept._id))
      .map(dept => dept.name);
    onConfirm(selectedDepartments);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">选择部门</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="搜索部门名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 部门列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无部门</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDepartments.map((dept) => (
                <label
                  key={dept._id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(dept._id)}
                    onChange={() => toggleSelection(dept._id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{dept.name}</div>
                    {dept.description && (
                      <div className="text-sm text-gray-500">{dept.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              已选择 {selectedIds.size} 个部门
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              清空选择
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确定（{selectedIds.size}）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDimensionSettings;
