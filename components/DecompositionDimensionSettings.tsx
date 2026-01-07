import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Check, AlertCircle, Users, User } from 'lucide-react';
import { callFunction, db } from '../lib/cloudbase';
import { showSuccess, showWarning, showError } from '../utils/ui-feedback';
import type { DecompositionDimension, DimensionItem } from '../types/goalDecomposition';

interface DecompositionDimensionSettingsProps {
  onDimensionsUpdated?: () => void;
}

// 维度属性类型
type DimensionType = 'custom' | 'team' | 'person';

// 部门数据类型
interface Department {
  _id: string;
  name: string;
}

// 员工数据类型
interface User {
  _id: string;
  name: string;
  department?: string;
}

const DecompositionDimensionSettings: React.FC<DecompositionDimensionSettingsProps> = ({
  onDimensionsUpdated
}) => {
  const [dimensions, setDimensions] = useState<DecompositionDimension[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDimension, setEditingDimension] = useState<DecompositionDimension | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [] as DimensionItem[]
  });
  const [newItemName, setNewItemName] = useState('');
  
  // 新增状态
  const [dimensionType, setDimensionType] = useState<DimensionType>('custom');
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showPersonSelector, setShowPersonSelector] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  useEffect(() => {
    loadDimensions();
  }, []);

  // 加载部门数据
  const loadDepartments = async () => {
    try {
      const result = await db.collection('departments').get();
      setDepartments(result.data as Department[]);
    } catch (error) {
      console.error('加载部门失败:', error);
      showError('加载部门数据失败');
    }
  };

  // 加载员工数据
  const loadUsers = async () => {
    try {
      const result = await db.collection('users')
        .where({ approvalStatus: 'approved' })
        .get();
      setUsers(result.data as User[]);
    } catch (error) {
      console.error('加载员工失败:', error);
      showError('加载员工数据失败');
    }
  };

  const loadDimensions = async () => {
    setLoading(true);
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: { action: 'list' }
      });
      
      if (res.result.success) {
        // 确保每个维度都有 items 数组
        const dimensionsWithItems = res.result.data.map((dim: DecompositionDimension) => ({
          ...dim,
          items: dim.items || []
        }));
        setDimensions(dimensionsWithItems);
      }
    } catch (error) {
      console.error('加载维度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDimension = () => {
    setFormData({
      name: '',
      description: '',
      items: []
    });
    setDimensionType('custom');
    setSelectedTeams([]);
    setSelectedPersons([]);
    setShowAddModal(true);
  };

  const handleEditDimension = (dimension: DecompositionDimension) => {
    setEditingDimension(dimension);
    setFormData({
      name: dimension.name || '',
      description: dimension.description || '',
      items: [...(dimension.items || [])]
    });
    setShowEditModal(true);
  };

  const handleAddItem = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!newItemName?.trim()) {
      showWarning('请输入维度项名称');
      return;
    }
    
    const newItem: DimensionItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      status: 'active'
    };
    
    console.log('添加新维度项:', newItem);
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setNewItemName('');
    showSuccess('维度项添加成功');
  };

  // 维度属性切换处理
  const handleDimensionTypeChange = async (type: DimensionType) => {
    setDimensionType(type);
    
    if (type === 'team') {
      await loadDepartments();
      setShowTeamSelector(true);
    } else if (type === 'person') {
      await loadUsers();
      setShowPersonSelector(true);
    }
  };

  // 确认选择团队
  const handleConfirmTeamSelection = () => {
    const selectedDepts = departments.filter(d => selectedTeams.includes(d._id));
    const newItems: DimensionItem[] = selectedDepts.map(dept => ({
      id: dept._id,
      name: dept.name,
      status: 'active'
    }));
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
    
    setShowTeamSelector(false);
    showSuccess(`已添加 ${newItems.length} 个团队维度项`);
  };

  // 确认选择员工
  const handleConfirmPersonSelection = () => {
    const selectedEmployees = users.filter(u => selectedPersons.includes(u._id));
    const newItems: DimensionItem[] = selectedEmployees.map(user => ({
      id: user._id,
      name: user.name,
      status: 'active'
    }));
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
    
    setShowPersonSelector(false);
    showSuccess(`已添加 ${newItems.length} 个个人维度项`);
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId)
    });
  };

  const handleToggleItemStatus = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => 
        item.id === itemId 
          ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
          : item
      )
    });
  };

  const handleSaveDimension = async () => {
    if (!formData.name?.trim()) {
      showWarning('请输入维度名称');
      return;
    }
    
    if (formData.items.length === 0) {
      showWarning('请至少添加一个维度项');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        action: editingDimension ? 'update' : 'create',
        ...(editingDimension && { 
          dimensionId: editingDimension._id 
        }),
        dimensionName: formData.name,
        description: formData.description || '',
        level1Items: formData.items.map(item => item.name),
        hasLevel2: false,
        level2Items: []
      };
      
      console.log('🔍 [维度保存] 请求数据:', requestData);
      console.log('🔍 [维度保存] formData:', formData);
      console.log('🔍 [维度保存] editingDimension:', editingDimension);
      
      const res = await callFunction({
        name: 'dimension-management',
        data: requestData
      });

      if (res.result.success) {
        showSuccess(editingDimension ? '维度更新成功' : '维度创建成功');
        await loadDimensions();
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingDimension(null);
        onDimensionsUpdated?.();
      } else {
        showError(res.result.error || '保存失败');
      }
    } catch (error: any) {
      showError(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDimension = async (id: string) => {
    if (!confirm('确定要删除这个维度吗？删除后无法恢复')) return;

    setLoading(true);
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: {
          action: 'delete',
          dimensionId: id
        }
      });

      if (res.result.success) {
        showSuccess(res.result.message || '维度删除成功');
        await loadDimensions();
        onDimensionsUpdated?.();
      } else {
        showError(res.result.error || '删除失败');
      }
    } catch (error: any) {
      showError(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDimensionStatus = async (dimension: DecompositionDimension) => {
    setLoading(true);
    try {
      const res = await callFunction({
        name: 'dimension-management',
        data: {
          action: 'update',
          id: dimension._id,
          status: dimension.status === 'active' ? 'inactive' : 'active'
        }
      });

      if (res.result.success) {
        await loadDimensions();
        onDimensionsUpdated?.();
      }
    } catch (error: any) {
      alert(error.message || '更新状态失败');
    } finally {
      setLoading(false);
    }
  };

  const renderDimensionModal = () => {
    const isEditMode = showEditModal;
    const isOpen = showAddModal || showEditModal;
    
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditMode ? '编辑分解维度' : '新增分解维度'}
            </h3>
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingDimension(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容区 */}
          <div className="px-6 py-4 space-y-4">
            {/* 维度名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                维度名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：产品线、地区、部门等"
              />
            </div>

            {/* 维度描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                维度描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="简要说明这个维度的用途"
              />
            </div>

            {/* 维度属性选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                维度属性 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dimensionType"
                    value="custom"
                    checked={dimensionType === 'custom'}
                    onChange={(e) => handleDimensionTypeChange(e.target.value as DimensionType)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">🔧 自建</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dimensionType"
                    value="team"
                    checked={dimensionType === 'team'}
                    onChange={(e) => handleDimensionTypeChange(e.target.value as DimensionType)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">👥 团队</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dimensionType"
                    value="person"
                    checked={dimensionType === 'person'}
                    onChange={(e) => handleDimensionTypeChange(e.target.value as DimensionType)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">👤 个人</span>
                </label>
              </div>
            </div>

            {/* 维度项 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                维度项 <span className="text-red-500">*</span>
              </label>
              
              {/* 自建模式：显示输入框 */}
              {dimensionType === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem(e);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入维度项名称（例如：华北、华南、华东）"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* 团队/个人模式：显示提示 */}
              {(dimensionType === 'team' || dimensionType === 'person') && formData.items.length === 0 && (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg mb-3">
                  请从{dimensionType === 'team' ? '团队' : '员工'}列表中选择
                </div>
              )}

              {/* 维度项列表 */}
              {formData.items.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                        item.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleItemStatus(item.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            item.status === 'active' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-300 text-gray-500'
                          }`}
                        >
                          {item.status === 'active' && <Check className="w-4 h-4" />}
                        </button>
                        <span className={item.status === 'active' ? 'text-gray-900' : 'text-gray-500 line-through'}>
                          {item.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  暂无维度项，请添加
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">使用说明：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>维度项可以禁用/启用，禁用后不会出现在分解选项中</li>
                  <li>已使用的维度项无法删除，只能禁用</li>
                  <li>建议先规划好维度结构，避免频繁调整</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingDimension(null);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveDimension}
              disabled={loading || !formData.name?.trim() || formData.items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && dimensions.length === 0) {
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
          <h3 className="text-lg font-semibold text-gray-900">分解维度参数设置</h3>
          <p className="text-sm text-gray-600 mt-1">
            配置目标分解使用的维度（产品线、地区、部门等）
          </p>
        </div>
        <button
          onClick={handleAddDimension}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增维度
        </button>
      </div>

      {/* 维度列表 */}
      {dimensions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
          </svg>
          <p className="text-gray-500 mb-2">还没有配置任何分解维度</p>
          <p className="text-sm text-gray-400 mb-4">
            点击"新增维度"按钮开始配置
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dimension) => (
            <div
              key={dimension._id}
              className={`border rounded-lg p-4 ${
                dimension.status === 'active' ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-semibold text-gray-900">
                      {dimension.name}
                    </h4>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      dimension.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {dimension.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </div>
                  {dimension.description && (
                    <p className="text-sm text-gray-600">{dimension.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleDimensionStatus(dimension)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title={dimension.status === 'active' ? '禁用' : '启用'}
                  >
                    {dimension.status === 'active' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditDimension(dimension)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDimension(dimension._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 维度项 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  维度项 ({dimension.items?.filter(item => item.status === 'active').length || 0}/{dimension.items?.length || 0})
                </div>
                <div className="flex flex-wrap gap-2">
                  {(dimension.items || []).map((item) => (
                    <span
                      key={item.id}
                      className={`px-3 py-1 text-sm rounded-full ${
                        item.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500 line-through'
                      }`}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 模态框 */}
      {renderDimensionModal()}

      {/* 团队选择器 */}
      {showTeamSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                选择团队
              </h3>
              <button
                onClick={() => {
                  setShowTeamSelector(false);
                  setSelectedTeams([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {departments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无团队数据
                </div>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <label
                      key={dept._id}
                      className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(dept._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams([...selectedTeams, dept._id]);
                          } else {
                            setSelectedTeams(selectedTeams.filter(id => id !== dept._id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-900">{dept.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                已选择 {selectedTeams.length} 个团队
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTeamSelector(false);
                    setSelectedTeams([]);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmTeamSelection}
                  disabled={selectedTeams.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 员工选择器 */}
      {showPersonSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                选择员工
              </h3>
              <button
                onClick={() => {
                  setShowPersonSelector(false);
                  setSelectedPersons([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无员工数据
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPersons.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPersons([...selectedPersons, user._id]);
                          } else {
                            setSelectedPersons(selectedPersons.filter(id => id !== user._id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-gray-900">{user.name}</div>
                        {user.department && (
                          <div className="text-sm text-gray-500">{user.department}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                已选择 {selectedPersons.length} 位员工
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPersonSelector(false);
                    setSelectedPersons([]);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmPersonSelection}
                  disabled={selectedPersons.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecompositionDimensionSettings;
