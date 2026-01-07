import React, { useState, useEffect } from 'react';
import { 
  Target, Plus, Save, X, Edit2, Trash2, ChevronDown, ChevronRight,
  Settings, Users, Calendar, DollarSign, TrendingUp, AlertCircle,
  Check, Clock, Grid
} from 'lucide-react';
import { db, callFunction } from '../lib/cloudbase';
import { showSuccess, showError, showConfirm } from '../lib/dialog-utils';
import GoalDecompositionMultiTable from './GoalDecompositionMultiTable';

// 分解维度接口
interface DecompositionDimension {
  _id: string;
  name: string;
  type: 'time' | 'department' | 'person' | 'product' | 'region' | 'custom';
  description: string;
  isActive: boolean;
  sortOrder: number;
  options?: string[]; // 维度选项(如部门列表、产品线等)
}

// 目标分解数据接口
interface GoalDecomposition {
  _id?: string;
  goalId: string;
  goalTitle: string;
  goalType: 'sales' | 'opportunity';
  dimensionId: string;
  dimensionName: string;
  parentId?: string; // 父级分解ID(支持多层分解)
  targetValue: number;
  actualValue: number;
  unit: string; // 单位(万元、个、%)
  owner: string;
  ownerId: string;
  attributes: Record<string, any>; // 维度属性(如时间=Q1, 部门=销售一部)
  status: '未开始' | '进行中' | '已完成' | '延期';
  progress: number; // 0-100
  startDate?: Date;
  endDate?: Date;
  children?: GoalDecomposition[]; // 子分解
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  goalId: string;
  goalTitle: string;
  goalType: 'sales' | 'opportunity';
  targetValue: number;
  unit: string;
  year?: number;
  onClose: () => void;
}

export const GoalDecompositionManager: React.FC<Props> = ({
  goalId,
  goalTitle,
  goalType,
  targetValue,
  unit,
  year,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState<DecompositionDimension[]>([]);
  const [decompositions, setDecompositions] = useState<GoalDecomposition[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 多表分解模式
  const [showMultiTableView, setShowMultiTableView] = useState(false);

  // 新增/编辑表单
  const [formData, setFormData] = useState<Partial<GoalDecomposition>>({
    targetValue: 0,
    owner: '',
    ownerId: '',
    attributes: {},
    status: '未开始',
    progress: 0
  });

  // 加载分解维度
  const loadDimensions = async () => {
    try {
      const result = await callFunction({
        name: 'dimension-management',
        data: { action: 'list', isActive: true }
      });

      if (result.result.success) {
        setDimensions(result.result.data);
      }
    } catch (error) {
      console.error('加载维度失败:', error);
      showError('加载维度失败');
    }
  };

  // 加载目标分解数据
  const loadDecompositions = async () => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-management',
        data: {
          action: 'query',
          goalId,
          dimensionId: selectedDimension || undefined
        }
      });

      if (result.result.success) {
        // 构建树形结构
        const treeData = buildTree(result.result.data);
        setDecompositions(treeData);
      }
    } catch (error) {
      console.error('加载分解数据失败:', error);
      showError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 构建树形结构
  const buildTree = (items: GoalDecomposition[]): GoalDecomposition[] => {
    const map = new Map<string, GoalDecomposition>();
    const roots: GoalDecomposition[] = [];

    // 第一遍:建立映射
    items.forEach(item => {
      map.set(item._id!, { ...item, children: [] });
    });

    // 第二遍:建立父子关系
    items.forEach(item => {
      const node = map.get(item._id!);
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(node!);
      } else {
        roots.push(node!);
      }
    });

    return roots;
  };

  // 保存分解数据
  const handleSave = async () => {
    if (!selectedDimension) {
      showError('请选择分解维度');
      return;
    }

    if (!formData.targetValue || formData.targetValue <= 0) {
      showError('请输入有效的目标值');
      return;
    }

    if (!formData.owner || !formData.ownerId) {
      showError('请选择负责人');
      return;
    }

    try {
      setLoading(true);

      const dimension = dimensions.find(d => d._id === selectedDimension);
      
      const data = {
        ...formData,
        goalId,
        goalTitle,
        goalType,
        dimensionId: selectedDimension,
        dimensionName: dimension?.name || '',
        unit,
        actualValue: formData.actualValue || 0
      };

      const result = await callFunction({
        name: 'decomposition-management',
        data: {
          action: editingId ? 'update' : 'create',
          id: editingId,
          data
        }
      });

      if (result.result.success) {
        showSuccess(editingId ? '更新成功' : '创建成功');
        setShowAddForm(false);
        setEditingId(null);
        setFormData({
          targetValue: 0,
          owner: '',
          ownerId: '',
          attributes: {},
          status: '未开始',
          progress: 0
        });
        await loadDecompositions();
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

  // 删除分解数据
  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('确定删除此分解项吗?');
    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await callFunction({
        name: 'decomposition-management',
        data: { action: 'delete', id }
      });

      if (result.result.success) {
        showSuccess('删除成功');
        await loadDecompositions();
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

  // 编辑分解数据
  const handleEdit = (item: GoalDecomposition) => {
    setEditingId(item._id!);
    setFormData(item);
    setSelectedDimension(item.dimensionId);
    setShowAddForm(true);
  };

  // 切换节点展开/收起
  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // 渲染分解树节点
  const renderTreeNode = (item: GoalDecomposition, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedNodes.has(item._id!);
    const completionRate = item.targetValue > 0 
      ? ((item.actualValue / item.targetValue) * 100).toFixed(1)
      : 0;

    const statusColors = {
      '未开始': 'text-gray-500 bg-gray-100',
      '进行中': 'text-blue-600 bg-blue-50',
      '已完成': 'text-green-600 bg-green-50',
      '延期': 'text-red-600 bg-red-50'
    };

    return (
      <div key={item._id} className="relative">
        {/* 连接线 */}
        {level > 0 && (
          <div 
            className="absolute left-4 top-0 h-6 w-px bg-gray-300"
            style={{ left: `${level * 24 + 8}px` }}
          />
        )}

        {/* 节点内容 */}
        <div 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* 展开/收起按钮 */}
          <div className="w-5 h-5 flex-shrink-0">
            {hasChildren && (
              <button
                onClick={() => toggleNode(item._id!)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>

          {/* 维度标签 */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
              {item.dimensionName}
            </span>
          </div>

          {/* 属性信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {Object.entries(item.attributes).map(([key, value]) => (
                <span key={key} className="text-sm text-gray-700">
                  <span className="font-medium">{key}:</span> {value}
                </span>
              ))}
            </div>
          </div>

          {/* 目标与实际 */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-gray-500">目标</div>
              <div className="text-sm font-semibold text-gray-900">
                {item.targetValue}{unit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">实际</div>
              <div className="text-sm font-semibold text-blue-600">
                {item.actualValue}{unit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">完成率</div>
              <div className={`text-sm font-semibold ${
                Number(completionRate) >= 100 ? 'text-green-600' :
                Number(completionRate) >= 80 ? 'text-blue-600' :
                Number(completionRate) >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {completionRate}%
              </div>
            </div>
          </div>

          {/* 状态 */}
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusColors[item.status]}`}>
              {item.status}
            </span>
          </div>

          {/* 负责人 */}
          <div className="flex-shrink-0 text-sm text-gray-600">
            {item.owner}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleEdit(item)}
              className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 hover:text-blue-600"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item._id!)}
              className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 hover:text-red-600"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadDimensions();
  }, []);

  useEffect(() => {
    if (selectedDimension) {
      loadDecompositions();
    }
  }, [selectedDimension]);

  // 计算总完成率
  const calculateTotalCompletion = () => {
    if (decompositions.length === 0) return 0;
    const total = decompositions.reduce((sum, item) => sum + item.targetValue, 0);
    const actual = decompositions.reduce((sum, item) => sum + item.actualValue, 0);
    return total > 0 ? ((actual / total) * 100).toFixed(1) : 0;
  };

  return (
    <>
      {showMultiTableView ? (
        <GoalDecompositionMultiTable
          goalTypeId={goalType}
          goalTypeName={goalType === 'sales' ? '销售目标' : '商机目标'}
          selectedYear={year || new Date().getFullYear()}  // ✅ 修复：传递年度参数
          onBack={() => setShowMultiTableView(false)}
          onConfigureClick={() => {
            setShowMultiTableView(false);
            // 这里可以打开配置页面
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              目标分解管理
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {goalTitle} - 目标: {targetValue}{unit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMultiTableView(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
            >
              <Grid className="w-4 h-4" />
              多表分解视图
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧:维度选择 */}
          <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                分解维度
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                选择维度对目标进行分解
              </p>
            </div>

            <div className="space-y-2">
              {dimensions.map(dim => (
                <button
                  key={dim._id}
                  onClick={() => setSelectedDimension(dim._id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedDimension === dim._id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{dim.name}</div>
                  {dim.description && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {dim.description}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {dimensions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无可用维度</p>
                <p className="text-xs mt-1">请先配置分解维度</p>
              </div>
            )}
          </div>

          {/* 右侧:分解内容 */}
          <div className="flex-1 flex flex-col">
            {selectedDimension ? (
              <>
                {/* 操作栏 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setShowAddForm(true);
                        setEditingId(null);
                        setFormData({
                          targetValue: 0,
                          owner: '',
                          ownerId: '',
                          attributes: {},
                          status: '未开始',
                          progress: 0
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新增分解
                    </button>

                    <div className="text-sm text-gray-600">
                      总完成率: <span className="font-semibold text-blue-600">{calculateTotalCompletion()}%</span>
                    </div>
                  </div>

                  <button
                    onClick={loadDecompositions}
                    disabled={loading}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {loading ? '加载中...' : '刷新'}
                  </button>
                </div>

                {/* 分解列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">加载中...</p>
                      </div>
                    </div>
                  ) : decompositions.length > 0 ? (
                    <div className="space-y-1">
                      {decompositions.map(item => renderTreeNode(item))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">暂无分解数据</p>
                        <p className="text-sm mt-2">点击"新增分解"开始创建</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">请选择分解维度</p>
                  <p className="text-sm mt-2">从左侧选择一个维度开始分解</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 新增/编辑表单(模态框) */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? '编辑分解' : '新增分解'}
              </h3>

              <div className="space-y-4">
                {/* 目标值 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标值 *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.targetValue || ''}
                      onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入目标值"
                    />
                    <span className="text-gray-600">{unit}</span>
                  </div>
                </div>

                {/* 负责人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    负责人 *
                  </label>
                  <input
                    type="text"
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入负责人姓名"
                  />
                </div>

                {/* 维度属性 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    维度属性
                  </label>
                  <div className="text-sm text-gray-500 mb-2">
                    根据所选维度填写具体属性(如时间=Q1, 部门=销售一部)
                  </div>
                  <textarea
                    value={JSON.stringify(formData.attributes || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({ ...formData, attributes: JSON.parse(e.target.value) });
                      } catch (err) {
                        // 忽略JSON解析错误
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={4}
                    placeholder='{"时间": "Q1", "部门": "销售一部"}'
                  />
                </div>

                {/* 状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={formData.status || '未开始'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="未开始">未开始</option>
                    <option value="进行中">进行中</option>
                    <option value="已完成">已完成</option>
                    <option value="延期">延期</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      )}
    </>
  );
};

export default GoalDecompositionManager;
