import { useState, useEffect } from 'react';
import { Plus, Filter, Search, Clock, CheckCircle, AlertCircle, TrendingUp, Circle, Pause, XCircle, Trash2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Task, TaskLevel, TaskStatus, getStatusColor, getStatusText } from '../types/task';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import EditTaskModal from './EditTaskModal';
import TaskRecycleBin from './TaskRecycleBin';

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TaskLevel>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'thisWeek' | 'thisMonth'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 统计数据
  const [statistics, setStatistics] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    calculateStatistics();
  }, [tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户信息
      const currentUserStr = localStorage.getItem('current_user');
      let currentUserId = '';
      let currentUserRole = '';
      let currentUserDepartment = '';
      
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        currentUserId = currentUser.userId;
        currentUserRole = currentUser.role;
        
        // 查询完整的用户信息以获取部门
        try {
          const userResult = await db.collection('users').doc(currentUserId).get();
          if (userResult.data && userResult.data.length > 0) {
            currentUserDepartment = userResult.data[0].department || '';
          }
        } catch (error) {
          console.error('查询当前用户完整信息失败:', error);
        }
      }
      
      // 查询所有未删除的任务,按更新时间降序排序
      const result = await db.collection('tasks')
        .where({
          isDeleted: db.command.neq(true)
        })
        .orderBy('updatedAt', 'desc')
        .get();
      
      if (result.data && result.data.length > 0) {
        // 收集所有需要查询的用户ID（包括负责人和协同人）
        const allUserIds = new Set<string>();
        result.data.forEach((task: any) => {
          allUserIds.add(task.owner);
          if (task.collaborators && Array.isArray(task.collaborators)) {
            task.collaborators.forEach((cid: string) => allUserIds.add(cid));
          }
        });

        // 查询所有相关用户信息
        const userIds = Array.from(allUserIds);
        const usersMap = new Map();

        // 逐个查询用户信息以避免查询失败
        await Promise.all(
          userIds.map(async (userId) => {
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

        // 组装任务数据
        const tasksWithUsers = result.data.map((task: any) => ({
          ...task,
          owner: usersMap.get(task.owner) || { _id: task.owner, name: '未知用户', username: '' },
          collaborators: task.collaborators?.map((cid: string) => 
            usersMap.get(cid) || { _id: cid, name: '未知用户', username: '' }
          ) || []
        }));

        // 权限过滤：
        // 1. 公开任务（isPublic: true）- 所有人可见
        // 2. 私密任务（isPublic: false）- 只有以下人员可见：
        //    a. 任务负责人
        //    b. 任务协同人
        //    c. 部门负责人（任务负责人所在部门）
        //    d. 管理角色（admin）
        const filteredTasks = tasksWithUsers.filter((task: any) => {
          // 公开任务，所有人可见
          if (task.isPublic) return true;
          
          // 私密任务的权限判断
          const isOwner = task.owner._id === currentUserId;
          const isCollaborator = task.collaborators?.some((c: any) => c._id === currentUserId);
          const isAdmin = currentUserRole === 'admin';
          
          // 判断是否是部门负责人
          // 部门负责人：当前用户的department与任务负责人的department相同，且当前用户角色为department_head
          const taskOwnerDepartment = task.owner.department || '';
          const isDepartmentHead = currentUserRole === 'department_head' && 
                                   currentUserDepartment === taskOwnerDepartment &&
                                   currentUserDepartment !== '';
          
          return isOwner || isCollaborator || isDepartmentHead || isAdmin;
        });

        setTasks(filteredTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === '进行中').length;
    const completed = tasks.filter(t => t.status === '已完成').length;
    
    // 修复延期统计：包括状态为"延期"的任务，或者截止日期已过且未完成的任务
    const overdue = tasks.filter(t => {
      if (t.status === '延期') return true;
      if (t.status === '已完成' || t.status === '取消') return false;
      return new Date(t.endDate) < new Date();
    }).length;

    setStatistics({ total, inProgress, completed, overdue });
  };

  // 获取任务提醒状态
  const getTaskAlertStatus = (task: Task) => {
    const now = new Date();
    const endDate = new Date(task.endDate);
    const startDate = new Date(task.startDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const remainingDuration = endDate.getTime() - now.getTime();
    const remainingRatio = remainingDuration / totalDuration;

    // 已完成 - 绿色勾选
    if (task.status === '已完成') {
      return { icon: CheckCircle, color: 'text-green-600', label: '已完成' };
    }

    // 延期 - 红色实心圆
    if (task.status === '延期') {
      return { icon: Circle, color: 'text-red-600 fill-red-600', label: '延期' };
    }

    // 暂停 - 红色暂停图标
    if (task.status === '暂停') {
      return { icon: Pause, color: 'text-red-600', label: '暂停' };
    }

    // 取消 - 灰色
    if (task.status === '取消') {
      return { icon: XCircle, color: 'text-gray-400', label: '已取消' };
    }

    // 未开始 - 灰色实心圆
    if (task.status === '未开始') {
      return { icon: Circle, color: 'text-gray-400 fill-gray-400', label: '未开始' };
    }

    // 进行中 - 需要根据进度和剩余时间判断
    if (task.status === '进行中') {
      // 已超期且未完成 - 红色执行标识
      if (now > endDate && task.progress < 100) {
        return { icon: AlertCircle, color: 'text-red-600', label: '已超期' };
      }

      // 即将超期：距离结束<1/4时间 且 完成率<50%
      if (remainingRatio < 0.25 && task.progress < 50) {
        return { icon: Circle, color: 'text-orange-500 fill-orange-500', label: '即将超期' };
      }

      // 正常进行中 - 绿色实心圆
      return { icon: Circle, color: 'text-green-600 fill-green-600', label: '进行中' };
    }

    // 默认
    return { icon: Circle, color: 'text-gray-400', label: '未知' };
  };

  const filteredTasks = tasks.filter(task => {
    // 级别筛选
    if (filter !== 'all' && task.level !== filter) return false;
    
    // 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        task.name.toLowerCase().includes(keyword) ||
        task.owner.name.toLowerCase().includes(keyword)
      );
    }
    
    // 时间筛选
    if (timeFilter !== 'all') {
      const endDate = new Date(task.endDate);
      const now = new Date();
      
      if (timeFilter === 'thisWeek') {
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);
        return endDate <= weekFromNow;
      }
      
      if (timeFilter === 'thisMonth') {
        return endDate.getMonth() === now.getMonth() && 
               endDate.getFullYear() === now.getFullYear();
      }
    }
    
    return true;
  });

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleEditFromDetail = () => {
    // 检查是否是已完成任务
    if (selectedTask && selectedTask.status === '已完成') {
      alert('已完成的任务不可编辑');
      return;
    }
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  const handleTaskSuccess = () => {
    loadTasks();
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    try {
      setLoading(true);
      // 软删除：标记为已删除，而不是真正删除
      await db.collection('tasks').doc(selectedTask._id).update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      });
      
      // 关闭详情模态框
      setShowDetailModal(false);
      setSelectedTask(null);
      
      // 重新加载任务列表
      await loadTasks();
    } catch (error) {
      console.error('移入回收站失败:', error);
      alert('移入回收站失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 直接更新任务状态
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setLoading(true);
      
      // 如果状态改为"已完成"，自动将进度设为100%
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      if (newStatus === '已完成') {
        updateData.progress = 100;
      }
      
      await db.collection('tasks').doc(taskId).update(updateData);
      
      // 重新加载任务列表
      await loadTasks();
    } catch (error) {
      console.error('更新任务状态失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">任务管理</h2>
            <p className="text-gray-600 mt-1">管理和跟踪团队任务</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRecycleBin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              回收站
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              新建任务
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">总任务</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 mb-1">进行中</p>
                <p className="text-2xl font-bold text-yellow-900">{statistics.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">已完成</p>
                <p className="text-2xl font-bold text-green-900">{statistics.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">延期</p>
                <p className="text-2xl font-bold text-red-900">{statistics.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索任务名称或负责人..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 级别筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | TaskLevel)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部级别</option>
              <option value="公司级">公司级</option>
              <option value="团队级">团队级</option>
              <option value="个人级">个人级</option>
            </select>
          </div>

          {/* 时间筛选 */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部时间</option>
            <option value="thisWeek">本周</option>
            <option value="thisMonth">本月</option>
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-600">点击右上角"新建任务"按钮创建第一个任务</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提醒
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    级别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    负责人
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    截止日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => {
                  const alertStatus = getTaskAlertStatus(task);
                  const AlertIcon = alertStatus.icon;
                  const isCompleted = task.status === '已完成';
                  
                  return (
                  <tr 
                    key={task._id} 
                    className={`hover:bg-gray-50 transition-colors ${isCompleted ? 'opacity-75' : 'cursor-pointer'}`}
                    onClick={() => !isCompleted && handleViewDetail(task)}
                    title={isCompleted ? '已完成任务不可编辑' : '点击查看详情'}
                  >
                    {/* 提醒列 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" title={alertStatus.label}>
                        <AlertIcon className={`w-5 h-5 ${alertStatus.color}`} />
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.level === '公司级' ? 'bg-red-100 text-red-800' :
                        task.level === '团队级' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{task.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{task.owner.name}</div>
                      {task.team && (
                        <div className="text-xs text-gray-500">{task.team}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm ${
                        new Date(task.endDate) < new Date() && task.status !== '已完成'
                          ? 'text-red-600 font-medium'
                          : 'text-gray-900'
                      }`}>
                        {new Date(task.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value as TaskStatus)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isCompleted}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 transition-colors ${
                          isCompleted 
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : task.status === '进行中' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer' :
                          task.status === '已完成' ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer' :
                          task.status === '延期' ? 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer' :
                          task.status === '暂停' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer' :
                          task.status === '取消' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer' :
                          'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer'
                        }`}
                      >
                        <option value="未开始">未开始</option>
                        <option value="进行中">进行中</option>
                        <option value="已完成">已完成</option>
                        <option value="延期">延期</option>
                        <option value="取消">取消</option>
                        <option value="暂停">暂停</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{task.progress}%</span>
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTaskSuccess}
        />
      )}

      {/* 任务详情模态框 */}
      {showDetailModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteTask}
        />
      )}

      {/* 编辑任务模态框 */}
      {showEditModal && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={handleCloseEdit}
          onSuccess={handleTaskSuccess}
        />
      )}

      {/* 回收站模态框 */}
      {showRecycleBin && (
        <TaskRecycleBin
          onClose={() => setShowRecycleBin(false)}
          onRestore={loadTasks}
        />
      )}
    </div>
  );
}
