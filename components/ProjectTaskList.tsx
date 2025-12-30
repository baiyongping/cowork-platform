import { useState, useEffect } from 'react';
import { Plus, FolderKanban, Calendar, User, CheckCircle, Clock } from 'lucide-react';
import { db, auth } from '../lib/cloudbase';
import type { Task } from '../types/task';
import { getStatusColor } from '../types/task';
import CreateProjectTaskModal from './CreateProjectTaskModal';
import TaskDetailModal from './TaskDetailModal';
import EditTaskModal from './EditTaskModal';
import { showError } from '../utils/ui-feedback';

// 扩展 Task 类型以支持关联查询后的对象
interface TaskWithPopulatedFields extends Omit<Task, 'owner' | 'collaborators'> {
  owner: {
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
    department?: string;
  };
  collaborators?: Array<{
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
    department?: string;
  }>;
  ownerName?: string;
  collaboratorNames?: string[];
}

interface ProjectTaskListProps {
  projectId: string;
  onTaskUpdate?: () => void;
}

export default function ProjectTaskList({ projectId, onTaskUpdate }: ProjectTaskListProps) {
  const [tasks, setTasks] = useState<TaskWithPopulatedFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithPopulatedFields | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<string[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);

  // 加载任务状态和类型配置
  useEffect(() => {
    loadTaskStatuses();
    loadTaskTypes();
  }, []);

  // 加载项目信息和项目任务
  useEffect(() => {
    loadProjectAndTasks();
  }, [projectId]);

  const loadProjectAndTasks = async () => {
    try {
      setLoading(true);
      const loginState = await auth.getLoginState();
      if (!loginState) return;

      // 加载项目信息
      const projRes = await db.collection('projects').doc(projectId).get();
      if (projRes.data && projRes.data.length > 0) {
        setProject(projRes.data[0]);
      }

      // 查询项目任务(按时间倒序)
      const res = await db
        .collection('tasks')
        .where({
          relatedTo: projectId,
          type: '项目任务',
          isDeleted: db.command.neq(true)
        })
        .orderBy('createdAt', 'desc')
        .get();

      // 获取用户信息
      const ownerIds = [...new Set(res.data?.map((item: any) => item.owner).filter(Boolean) || [])];
      const collaboratorIds = [...new Set(
        res.data?.flatMap((item: any) => item.collaborators || []).filter(Boolean) || []
      )];
      const allUserIds = [...new Set([...ownerIds, ...collaboratorIds])];
      
      // 创建用户映射对象
      const usersMap = new Map();

      if (allUserIds.length > 0) {
        // 逐个查询用户信息
        await Promise.all(
          allUserIds.map(async (userId) => {
            try {
              const userResult = await db.collection('users').doc(userId).get();
              if (userResult.data && userResult.data.length > 0) {
                usersMap.set(userId, userResult.data[0]);
              } else {
                usersMap.set(userId, { _id: userId, name: '未知用户', username: '' });
              }
            } catch (error) {
              console.error('查询用户失败:', userId, error);
              usersMap.set(userId, { _id: userId, name: '未知用户', username: '' });
            }
          })
        );
      }

      // 组装任务数据：将 owner 和 collaborators 转换为完整的用户对象
      const tasksWithUsers = (res.data || []).map((item: any) => ({
        ...item,
        owner: usersMap.get(item.owner) || { _id: item.owner, name: '未知用户', username: '' },
        collaborators: (item.collaborators || []).map((cid: string) => 
          usersMap.get(cid) || { _id: cid, name: '未知用户', username: '' }
        ),
        // 保留原有的 ownerName 和 collaboratorNames 字段（用于显示）
        ownerName: usersMap.get(item.owner)?.name || '未知用户',
        collaboratorNames: (item.collaborators || []).map((cid: string) => 
          usersMap.get(cid)?.name || '未知用户'
        )
      }));

      setTasks(tasksWithUsers);
    } catch (error) {
      console.error('加载项目任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载任务状态配置
  const loadTaskStatuses = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'taskStatus' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const statusConfig = result.data[0];
        const statusValues = (statusConfig.values || [])
          .filter((item: any) => item.enabled !== false)
          .map((item: any) => typeof item === 'string' ? item : item.value);
        setTaskStatuses(statusValues.length > 0 ? statusValues : ['未开始', '进行中', '已完成', '延期', '取消', '暂停']);
      } else {
        setTaskStatuses(['未开始', '进行中', '已完成', '延期', '取消', '暂停']);
      }
    } catch (error) {
      console.error('加载任务状态配置失败:', error);
      setTaskStatuses(['未开始', '进行中', '已完成', '延期', '取消', '暂停']);
    }
  };

  // 加载任务类型配置
  const loadTaskTypes = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'taskType' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const typeConfig = result.data[0];
        const typeValues = (typeConfig.values || [])
          .filter((item: any) => item.enabled !== false)
          .map((item: any) => typeof item === 'string' ? item : item.value);
        setTaskTypes(typeValues.length > 0 ? typeValues : ['日常工作', '商机跟进', '项目任务', '采购任务']);
      } else {
        setTaskTypes(['日常工作', '商机跟进', '项目任务', '采购任务']);
      }
    } catch (error) {
      console.error('加载任务类型配置失败:', error);
      setTaskTypes(['日常工作', '商机跟进', '项目任务', '采购任务']);
    }
  };

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化简短日期
  const formatShortDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN');
  };

  // 打开任务详情
  const handleOpenTaskDetail = (task: TaskWithPopulatedFields) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  // 关闭任务详情
  const handleCloseTaskDetail = () => {
    setShowTaskDetailModal(false);
    setSelectedTask(null);
  };

  // 从任务详情打开编辑模态框
  const handleEditFromDetail = () => {
    setShowTaskDetailModal(false);
    setShowEditModal(true);
  };

  // 关闭编辑模态框
  const handleCloseEdit = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  // 任务更新成功回调
  const handleTaskUpdateSuccess = () => {
    loadProjectAndTasks();
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };

  // 删除任务
  const handleDeleteTask = async () => {
    try {
      if (!selectedTask) return;

      // 软删除：将 isDeleted 标记为 true
      await db.collection('tasks').doc(selectedTask._id).update({
        isDeleted: true,
        deletedAt: new Date()
      });

      // 刷新任务列表
      handleCloseTaskDetail();
      handleTaskUpdateSuccess();
    } catch (error) {
      console.error('删除任务失败:', error);
      showError('删除任务失败，请重试');
    }
  };

  return (
    <>
      <div className="border-t border-gray-200 pt-6">
        {/* 标题和按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">项目任务</h4>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            增加项目任务
          </button>
        </div>

        {/* 项目任务列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">暂无项目任务</p>
            <p className="text-sm text-gray-500 mt-2">点击右上角按钮添加第一个项目任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                onClick={() => handleOpenTaskDetail(task)}
                className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-blue-300 transition-all hover:shadow-md cursor-pointer"
              >
                {/* 头部信息 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h5 className="font-semibold text-gray-900 text-lg">{task.name}</h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    {task.projectPhase && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {task.projectPhase}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      完成进度: <span className="text-blue-600">{task.progress}%</span>
                    </div>
                  </div>
                </div>

                {/* 详细信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium text-gray-700">负责人:</span>
                    <span>{task.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-gray-700">截止日期:</span>
                    <span>{formatShortDate(task.endDate)}</span>
                  </div>
                  {task.collaboratorNames && task.collaboratorNames.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium text-gray-700">协同人:</span>
                      <span>{task.collaboratorNames.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* 任务描述 */}
                {task.description && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                  </div>
                )}

                {/* 创建时间 */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>创建于: {formatDate(task.createdAt)}</span>
                  </div>
                  {task.status === '已完成' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>已完成</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && project && (
        <CreateProjectTaskModal
          project={project}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProjectAndTasks();
            if (onTaskUpdate) {
              onTaskUpdate();
            }
          }}
        />
      )}

      {/* 任务详情模态框 */}
      {showTaskDetailModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseTaskDetail}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteTask}
        />
      )}

      {/* 编辑任务模态框 */}
      {showEditModal && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={handleCloseEdit}
          onSuccess={() => {
            handleCloseEdit();
            handleTaskUpdateSuccess();
          }}
          taskStatuses={taskStatuses}
          taskTypes={taskTypes}
        />
      )}
    </>
  );
}
