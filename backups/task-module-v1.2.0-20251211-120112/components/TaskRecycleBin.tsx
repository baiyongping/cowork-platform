import { useState, useEffect } from 'react';
import { X, Trash2, Search, Calendar } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Task } from '../types/task';
import TaskRecycleBinDetail from './TaskRecycleBinDetail';

interface TaskRecycleBinProps {
  onClose: () => void;
  onRestore: () => void;
}

export default function TaskRecycleBin({ onClose, onRestore }: TaskRecycleBinProps) {
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  const loadDeletedTasks = async () => {
    try {
      setLoading(true);
      
      // 查询所有已删除的任务
      const result = await db.collection('tasks')
        .where({
          isDeleted: true
        })
        .orderBy('deletedAt', 'desc')
        .get();
      
      if (result.data && result.data.length > 0) {
        // 收集所有需要查询的用户ID
        const allUserIds = new Set<string>();
        result.data.forEach((task: any) => {
          allUserIds.add(task.owner);
        });

        // 查询所有相关用户信息
        const userIds = Array.from(allUserIds);
        const usersMap = new Map();

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
          owner: usersMap.get(task.owner) || { _id: task.owner, name: '未知用户', username: '' }
        }));

        setDeletedTasks(tasksWithUsers);
      } else {
        setDeletedTasks([]);
      }
    } catch (error) {
      console.error('加载回收站任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedTask(null);
  };

  const handleRestoreSuccess = async () => {
    setShowDetail(false);
    setSelectedTask(null);
    await loadDeletedTasks();
    onRestore();
  };

  const filteredTasks = deletedTasks.filter(task => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        task.name.toLowerCase().includes(keyword) ||
        task.owner.name.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-gray-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">任务回收站</h3>
                <p className="text-sm text-gray-600">已删除的任务将在此保留，可恢复或永久删除</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 搜索 */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索任务名称或负责人..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">加载中...</p>
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">回收站为空</h3>
                <p className="text-gray-600">已删除的任务将显示在这里</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
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
                        删除时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.map((task) => (
                      <tr 
                        key={task._id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(task)}
                      >
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
                          <div className="text-sm text-gray-900">
                            {new Date(task.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {task.deletedAt ? new Date(task.deletedAt).toLocaleString() : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 任务详情模态框 */}
      {showDetail && selectedTask && (
        <TaskRecycleBinDetail
          task={selectedTask}
          onClose={handleCloseDetail}
          onRestoreSuccess={handleRestoreSuccess}
        />
      )}
    </>
  );
}
