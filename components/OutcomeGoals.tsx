import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { db, callFunction } from '../lib/cloudbase';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import EditTaskModal from './EditTaskModal';
import { getStatusColor } from '../types/task';

// 成果目标接口
interface OutcomeGoal {
  _id?: string;
  year: number;
  content: string;
  owner: string;
  ownerId: string;
  progress: number;
  linkedTaskCount?: number; // 关联任务数量（自动统计）
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OutcomeGoalsProps {
  selectedYear: number;
  currentUser: any;
  users: any[];
  checkPermission: (permission: string, action: string) => boolean;
}

// 中文数字转换
const toChineseNumber = (num: number): string => {
  const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (num <= 10) return chineseNumbers[num];
  if (num < 20) return `十${chineseNumbers[num - 10]}`;
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return `${chineseNumbers[tens]}十${ones > 0 ? chineseNumbers[ones] : ''}`;
};

export const OutcomeGoals: React.FC<OutcomeGoalsProps> = ({
  selectedYear,
  currentUser,
  users,
  checkPermission
}) => {
  const [outcomeGoals, setOutcomeGoals] = useState<OutcomeGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeGoal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    content: '',
    owner: '',
    ownerId: '',
    progress: 0
  });
  const [form, setForm] = useState({
    _id: '',
    year: selectedYear,
    content: '',
    owner: '',
    ownerId: '',
    progress: 0
  });

  // 加载成果目标
  const loadOutcomeGoals = async () => {
    try {
      setLoading(true);
      const res = await db.collection('outcome_goals')
        .where({ year: selectedYear })
        .orderBy('createdAt', 'desc')
        .get();
      
      if (res.code) {
        console.error('❌ CloudBase查询错误:', res.code, res.message);
        setOutcomeGoals([]);
        return;
      }
      
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('📦 加载成果目标数据:', data.length, '条');
      setOutcomeGoals(data);
    } catch (error) {
      console.error('❌ 加载成果目标失败:', error);
      setOutcomeGoals([]);
    } finally {
      setLoading(false);
    }
  };

  // 保存成果目标
  const handleSave = async () => {
    try {
      setLoading(true);

      if (!form.content.trim()) {
        alert('请填写成果目标内容');
        return;
      }

      if (!form.owner || !form.ownerId) {
        alert('请选择责任人');
        return;
      }

      if (form._id) {
        // 更新
        const updateRes = await db.collection('outcome_goals').doc(form._id).update({
          content: form.content,
          owner: form.owner,
          ownerId: form.ownerId,
          progress: form.progress,
          updatedAt: new Date(),
        });

        if (updateRes.code) {
          console.error('❌ 更新成果目标失败:', updateRes.code, updateRes.message);
          alert('更新失败：' + updateRes.message);
          return;
        }
      } else {
        // 新增
        const result = await db.collection('outcome_goals').add({
          year: selectedYear,
          content: form.content,
          owner: form.owner,
          ownerId: form.ownerId,
          progress: 0, // 🔧 新增时默认为0，后续由系统自动计算
          createdBy: currentUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (result.code) {
          console.error('❌ 新增成果目标失败:', result.code, result.message);
          alert('新增失败：' + result.message);
          return;
        }
      }

      await loadOutcomeGoals();
      setShowModal(false);
      setForm({
        _id: '',
        year: selectedYear,
        content: '',
        owner: '',
        ownerId: '',
        progress: 0
      });
    } catch (error) {
      console.error('保存成果目标失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 编辑成果目标
  const handleEdit = (outcome: OutcomeGoal | null) => {
    if (outcome) {
      setForm({
        _id: outcome._id || '',
        year: outcome.year,
        content: outcome.content,
        owner: outcome.owner,
        ownerId: outcome.ownerId,
        progress: outcome.progress
      });
    } else {
      setForm({
        _id: '',
        year: selectedYear,
        content: '',
        owner: '',
        ownerId: '',
        progress: 0
      });
    }
    setShowModal(true);
  };

  // 删除成果目标
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个成果目标吗？')) {
      return;
    }

    try {
      setLoading(true);
      const result = await db.collection('outcome_goals').doc(id).remove();

      if (result.code) {
        console.error('❌ 删除成果目标失败:', result.code, result.message);
        alert('删除失败：' + result.message);
        return;
      }

      await loadOutcomeGoals();
      setShowDetailModal(false);
      setSelectedOutcome(null);
    } catch (error) {
      console.error('删除成果目标失败:', error);
      alert('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开详情
  const handleOpenDetail = (outcome: OutcomeGoal) => {
    setSelectedOutcome(outcome);
    setEditForm({
      content: outcome.content,
      owner: outcome.owner,
      ownerId: outcome.ownerId,
      progress: outcome.progress
    });
    setIsEditing(false);
    setShowDetailModal(true);
  };

  // 进入编辑模式
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editForm.content.trim()) {
      alert('请填写成果目标内容');
      return;
    }

    if (!editForm.owner || !editForm.ownerId) {
      alert('请选择责任人');
      return;
    }

    try {
      setLoading(true);
      const updateRes = await db.collection('outcome_goals').doc(selectedOutcome!._id).update({
        content: editForm.content,
        owner: editForm.owner,
        ownerId: editForm.ownerId,
        progress: editForm.progress,
        updatedAt: new Date(),
      });

      if (updateRes.code) {
        console.error('❌ 更新成果目标失败:', updateRes.code, updateRes.message);
        alert('更新失败：' + updateRes.message);
        return;
      }

      await loadOutcomeGoals();
      setIsEditing(false);
      // 更新选中的成果目标
      setSelectedOutcome({
        ...selectedOutcome!,
        ...editForm,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('保存成果目标失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 新增任务功能
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<string[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [expandedOutcomes, setExpandedOutcomes] = useState<Record<string, boolean>>({});
  const [linkedTasks, setLinkedTasks] = useState<Record<string, any[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);

  // 加载任务类型和状态
  useEffect(() => {
    loadTaskTypesAndStatuses();
  }, []);

  const loadTaskTypesAndStatuses = async () => {
    try {
      const [typesRes, statusesRes] = await Promise.all([
        db.collection('type_settings').where({ type: 'taskType' }).get(),
        db.collection('type_settings').where({ type: 'taskStatus' }).get()
      ]);

      console.log('🔍 任务类型查询结果:', typesRes);
      console.log('🔍 任务状态查询结果:', statusesRes);

      if (typesRes.data && typesRes.data.length > 0) {
        const types = typesRes.data[0].values
          .filter((item: any) => item.enabled)
          .map((item: any) => item.value);
        console.log('✅ 加载的任务类型:', types);
        setTaskTypes(types);
      } else {
        console.warn('⚠️ 未找到任务类型数据');
      }

      if (statusesRes.data && statusesRes.data.length > 0) {
        const statuses = statusesRes.data[0].values
          .filter((item: any) => item.enabled)
          .map((item: any) => item.value);
        console.log('✅ 加载的任务状态:', statuses);
        setTaskStatuses(statuses);
      } else {
        console.warn('⚠️ 未找到任务状态数据');
      }
    } catch (error) {
      console.error('❌ 加载任务类型和状态失败:', error);
    }
  };

  // 新增任务
  const handleAddTask = () => {
    setShowCreateTaskModal(true);
  };

  // 加载关联任务
  const loadLinkedTasks = async (outcomeId: string) => {
    if (!outcomeId) return;

    try {
      setLoadingTasks({ ...loadingTasks, [outcomeId]: true });

      // 🔧 修复：使用正确的字段名 relatedTo 和 type = '成果任务'
      const res = await db
        .collection('tasks')
        .where({
          type: '成果任务',
          relatedTo: outcomeId,
          isDeleted: db.command.neq(true)
        })
        .orderBy('createdAt', 'desc')
        .get();

      console.log(`📦 加载成果目标 ${outcomeId} 的关联任务:`, res.data?.length || 0);

      const tasks = res.data || [];
      
      // 🔧 查询任务负责人信息，将用户ID转换为用户对象
      const ownerIds = [...new Set(tasks.map((t: any) => t.owner).filter(Boolean))];
      let userMap = new Map<string, any>();
      
      if (ownerIds.length > 0) {
        const usersRes = await db.collection('users')
          .where({
            _id: db.command.in(ownerIds)
          })
          .get();
        
        usersRes.data?.forEach((user: any) => {
          userMap.set(user._id, {
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            department: user.department
          });
        });
      }
      
      // 🔧 为任务构建完整的 owner 对象（包含用户信息）和 ownerName 字段（用于显示）
      const tasksWithOwner = tasks.map((task: any) => {
        const ownerData = userMap.get(task.owner);
        return {
          ...task,
          owner: ownerData || { _id: task.owner, name: task.owner }, // 完整的用户对象
          ownerName: ownerData?.name || task.owner // 用于显示的用户名
        };
      });
      
      setLinkedTasks({ ...linkedTasks, [outcomeId]: tasksWithOwner });

      // 更新关联任务数量
      if (tasks.length !== outcomeGoals.find(o => o._id === outcomeId)?.linkedTaskCount) {
        await db.collection('outcome_goals').doc(outcomeId).update({
          linkedTaskCount: tasks.length
        });
        await loadOutcomeGoals(); // 刷新成果目标列表
      }
    } catch (error) {
      console.error('❌ 加载关联任务失败:', error);
    } finally {
      setLoadingTasks({ ...loadingTasks, [outcomeId]: false });
    }
  };

  // 展开/折叠成果目标
  const toggleExpand = async (outcomeId: string) => {
    const isExpanding = !expandedOutcomes[outcomeId];
    setExpandedOutcomes({ ...expandedOutcomes, [outcomeId]: isExpanding });

    if (isExpanding && !linkedTasks[outcomeId]) {
      await loadLinkedTasks(outcomeId);
    }
  };

  // 🆕 重新计算成果目标完成度
  const recalculateOutcomeGoalProgress = async (outcomeId: string) => {
    try {
      console.log('📊 重新计算成果目标完成度:', outcomeId);
      
      const res = await callFunction({
        name: 'outcome-goal-management',
        data: {
          action: 'calculateCompletion',
          data: { outcomeGoalId: outcomeId }
        }
      });

      if (res.result?.success) {
        console.log('✅ 成果目标完成度已更新:', res.result.data);
        // 刷新成果目标列表
        await loadOutcomeGoals();
      } else {
        console.error('❌ 重新计算失败:', res.result?.message);
      }
    } catch (error) {
      console.error('❌ 重新计算成果目标完成度失败:', error);
    }
  };

  // 打开任务详情
  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  // 编辑任务
  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetailModal(false);
    setShowEditTaskModal(true);
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string, outcomeId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      await db.collection('tasks').doc(taskId).update({ isDeleted: true });
      
      // 🔧 自动重新计算成果目标完成度
      await recalculateOutcomeGoalProgress(outcomeId);
      
      await loadLinkedTasks(outcomeId); // 刷新任务列表
      setShowTaskDetailModal(false);
    } catch (error) {
      console.error('❌ 删除任务失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 初始加载
  useEffect(() => {
    loadOutcomeGoals();
  }, [selectedYear]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{selectedYear}年度成果目标</h3>
          {checkPermission('goal.strategy', 'create') && (
            <button
              onClick={() => handleEdit(null)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增成果目标
            </button>
          )}
        </div>

        <div className="space-y-4">
          {loading && <div className="text-center py-8 text-gray-500">加载中...</div>}
          
          {!loading && outcomeGoals.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无成果目标，点击上方按钮新增</div>
          )}
          
          {!loading && outcomeGoals.map((outcome, index) => {
            const isCompleted = outcome.progress === 100;
            const isExpanded = expandedOutcomes[outcome._id!];
            const tasks = linkedTasks[outcome._id!] || [];
            const loadingOutcomeTasks = loadingTasks[outcome._id!];
            
            return (
              <div 
                key={outcome._id} 
                className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md"
              >
                {/* 成果目标卡片 - 可点击展开/折叠 */}
                <div 
                  className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(outcome._id!)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-blue-600">{toChineseNumber(index + 1)}、</span>
                          {outcome.content}
                          {isCompleted && (
                            <span className="text-yellow-500" title="已完成">⭐</span>
                          )}
                        </h4>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-gray-600">
                        <div>
                          <span className="text-gray-500">责任人：</span>
                          <span className="font-medium">{outcome.owner}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">完成度：</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  outcome.progress >= 80 ? 'bg-green-500' :
                                  outcome.progress >= 50 ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${outcome.progress}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${
                              outcome.progress >= 80 ? 'text-green-600' :
                              outcome.progress >= 50 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {outcome.progress}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">关联任务：</span>
                          <span className="font-medium text-blue-600">
                            {outcome.linkedTaskCount || 0}个
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 操作按钮区 */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* 编辑按钮 */}
                      {checkPermission('goal.strategy', 'edit') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(outcome);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {/* 删除按钮 */}
                      {checkPermission('goal.strategy', 'delete') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(outcome._id!);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {/* 展开/折叠按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(outcome._id!);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title={isExpanded ? "折叠" : "展开"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 关联任务列表（展开时显示） - 参考季度措施的显示方式 */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    {/* 操作按钮区 */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">关联任务列表</h4>
                      <div className="flex gap-2">
                        {checkPermission('task.assign', 'create') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOutcome(outcome);
                              handleAddTask();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            新增任务
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(outcome);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          编辑目标
                        </button>
                      </div>
                    </div>

                    {/* 任务列表 */}
                    {loadingOutcomeTasks ? (
                      <div className="text-center py-4 text-gray-400 text-sm">加载中...</div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        暂无关联任务
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskClick(task);
                            }}
                            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100"
                          >
                            {/* 任务内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{task.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-700">
                                <span>负责人: {task.ownerName || task.owner}</span>
                                <span>类型: {task.type}</span>
                                {task.endDate && (
                                  <span>截止: {new Date(task.endDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>

                            {/* 完成度 */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    task.progress >= 80 ? 'bg-green-500' :
                                    task.progress >= 50 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">
                                {task.progress}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {form._id ? '编辑成果目标' : '新增成果目标'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 年度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年度</label>
                <input
                  type="text"
                  value={form.year}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              {/* 成果目标内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  成果目标内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="请输入成果目标内容"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* 责任人 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  责任人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.ownerId}
                  onChange={(e) => {
                    const user = users.find(u => u._id === e.target.value);
                    setForm({
                      ...form,
                      ownerId: e.target.value,
                      owner: user ? user.name : ''
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择责任人</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* 🔧 完成度字段已隐藏，改为自动计算 */}
              {/* 完成度 = 关联成果任务进度的平均值 */}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedOutcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">成果目标详情</h2>
                <div className="flex items-center gap-2">
                  {checkPermission('goal.strategy', 'edit') && (
                    <button
                      onClick={isEditing ? handleSaveEdit : handleStartEdit}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isEditing
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:bg-gray-300`}
                    >
                      {loading ? '保存中...' : (isEditing ? '保存' : '编辑')}
                    </button>
                  )}
                  {checkPermission('goal.strategy', 'delete') && !isEditing && (
                    <button
                      onClick={() => handleDelete(selectedOutcome._id!)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      删除
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setIsEditing(false);
                      setSelectedOutcome(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* 内容区 */}
            <div className="p-6 space-y-6">
              {/* 年度 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">年度</label>
                <div className="text-base font-medium text-gray-900">{selectedOutcome.year}年</div>
              </div>

              {/* 成果目标内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">成果目标内容</label>
                {isEditing ? (
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <div className="text-base text-gray-900 whitespace-pre-wrap">{selectedOutcome.content}</div>
                )}
              </div>

              {/* 责任人 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">责任人</label>
                {isEditing ? (
                  <select
                    value={editForm.ownerId}
                    onChange={(e) => {
                      const user = users.find(u => u._id === e.target.value);
                      setEditForm({
                        ...editForm,
                        ownerId: e.target.value,
                        owner: user ? user.name : ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择责任人</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-base text-gray-900">{selectedOutcome.owner}</div>
                )}
              </div>

              {/* 完成度 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">完成度</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.progress}
                    onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          selectedOutcome.progress >= 80 ? 'bg-green-500' :
                          selectedOutcome.progress >= 50 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${selectedOutcome.progress}%` }}
                      />
                    </div>
                    <span className={`text-base font-bold ${
                      selectedOutcome.progress >= 80 ? 'text-green-600' :
                      selectedOutcome.progress >= 50 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {selectedOutcome.progress}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增任务模态框 */}
      {showCreateTaskModal && (
        <CreateTaskModal
          onClose={() => {
            setShowCreateTaskModal(false);
            setSelectedOutcome(null);
          }}
          onSuccess={async () => {
            setShowCreateTaskModal(false);
            if (selectedOutcome?._id) {
              // 🔧 自动重新计算成果目标完成度
              await recalculateOutcomeGoalProgress(selectedOutcome._id);
              await loadLinkedTasks(selectedOutcome._id); // 刷新关联任务列表
            }
            setSelectedOutcome(null);
          }}
          defaultValues={{
            level: '团队级',
            type: '成果任务',
            status: '未开始',
            relatedTo: selectedOutcome?._id, // 🔧 修复:使用 relatedTo 字段
            relatedGoalContent: selectedOutcome?.content
          }}
          taskStatuses={taskStatuses}
          taskTypes={taskTypes}
        />
      )}

      {/* 任务详情模态框 */}
      {showTaskDetailModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetailModal(false);
            setSelectedTask(null);
          }}
          onEdit={(task) => handleEditTask(task)}
          onDelete={() => {
            // 🔧 修复：onDelete 无参数，直接使用 selectedTask._id
            if (selectedTask?._id && selectedTask?.relatedTo) {
              handleDeleteTask(selectedTask._id, selectedTask.relatedTo);
            }
          }}
          onSave={async () => {
            // 🔧 修复：保存后重新加载关联任务
            console.log('📝 [成果目标] 任务保存回调触发，重新加载关联任务');
            
            try {
              // 🔧 1. 重新获取最新任务数据
              if (selectedTask?._id) {
                const taskRes = await db.collection('tasks').doc(selectedTask._id).get();
                const latestTask = taskRes.data?.[0];
                
                if (latestTask) {
                  console.log('✅ [成果目标] 获取到最新任务数据', latestTask);
                  
                  // 🔧 2. 更新 selectedTask 状态
                  setSelectedTask(latestTask);
                  
                  // 🔧 3. 使用最新任务数据的 relatedTo（而不是 selectedTask.relatedTo）
                  if (latestTask.relatedTo) {
                    // ⚠️ 注意：不需要再次计算完成度，TaskDetailModal 已经在保存时计算过了
                    // 🔧 4. 刷新关联任务列表
                    await loadLinkedTasks(latestTask.relatedTo);
                    // 🔧 5. 重新加载成果目标列表（更新完成度显示）
                    await loadOutcomeGoals();
                    
                    console.log('✅ [成果目标] 关联任务和成果目标列表已刷新');
                  }
                }
              }
            } catch (error) {
              console.error('❌ [成果目标] 重新加载关联任务失败:', error);
            }
          }}
        />
      )}

      {/* 编辑任务模态框 */}
      {showEditTaskModal && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => {
            setShowEditTaskModal(false);
            setSelectedTask(null);
          }}
          onSuccess={async () => {
            setShowEditTaskModal(false);
            if (selectedTask?.relatedTo) { // 🔧 修复：使用 relatedTo 字段
              // 🔧 自动重新计算成果目标完成度
              await recalculateOutcomeGoalProgress(selectedTask.relatedTo);
              await loadLinkedTasks(selectedTask.relatedTo); // 刷新关联任务列表
            }
            setSelectedTask(null);
          }}
          taskStatuses={taskStatuses}
          taskTypes={taskTypes}
        />
      )}
    </div>
  );
};
