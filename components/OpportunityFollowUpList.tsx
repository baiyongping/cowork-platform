import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Calendar, User, FileText, CheckCircle, Clock } from 'lucide-react';
import { db, auth } from '../lib/cloudbase';
import type { Task } from '../types/task';
import { getStatusColor } from '../types/task';
import CreateOpportunityTaskModal from './CreateOpportunityTaskModal';

interface OpportunityFollowUpListProps {
  opportunityId: string;
  onTaskUpdate?: () => void; // 任务更新时的回调
}

export default function OpportunityFollowUpList({ opportunityId, onTaskUpdate }: OpportunityFollowUpListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [opportunity, setOpportunity] = useState<any>(null);

  // 加载商机信息和跟进任务
  useEffect(() => {
    loadOpportunityAndTasks();
  }, [opportunityId]);

  const loadOpportunityAndTasks = async () => {
    try {
      setLoading(true);
      const loginState = await auth.getLoginState();
      if (!loginState) return;

      // 加载商机信息
      const oppRes = await db.collection('opportunities').doc(opportunityId).get();
      if (oppRes.data && oppRes.data.length > 0) {
        setOpportunity(oppRes.data[0]);
      }

      // 查询商机跟进任务(按时间倒序)
      const res = await db
        .collection('tasks')
        .where({
          relatedTo: opportunityId,
          type: '商机跟进',
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
      
      let userMap: { [key: string]: string } = {};

      if (allUserIds.length > 0) {
        const userRes = await db
          .collection('users')
          .where({
            _id: db.command.in(allUserIds)
          })
          .field({ _id: true, name: true })
          .get();

        if (userRes.data && Array.isArray(userRes.data)) {
          userMap = Object.fromEntries(
            userRes.data.map((user: any) => [user._id, user.name])
          );
        }
      }

      // 添加用户名称
      const tasksWithNames = (res.data || []).map((item: any) => ({
        ...item,
        ownerName: userMap[item.owner] || '未知用户',
        collaboratorNames: (item.collaborators || []).map((id: string) => userMap[id] || '未知用户')
      }));

      setTasks(tasksWithNames);
    } catch (error) {
      console.error('加载商机跟进任务失败:', error);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="border-t border-gray-200 pt-6">
        {/* 标题和按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">商机跟进任务</h4>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增商机跟进任务
          </button>
        </div>

        {/* 跟进任务列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">暂无商机跟进任务</p>
            <p className="text-sm text-gray-500 mt-2">点击右上角按钮添加第一个跟进任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-blue-300 transition-all hover:shadow-md"
              >
                {/* 头部信息 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h5 className="font-semibold text-gray-900 text-lg">{task.name}</h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    {task.opportunityActionType && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {task.opportunityActionType}
                      </span>
                    )}
                  </div>
                </div>

                {/* 负责人和协同人 */}
                <div className="flex items-center gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">负责人:</span>
                    <span className="font-medium text-gray-900">{task.ownerName}</span>
                  </div>
                  {task.collaboratorNames && task.collaboratorNames.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600">协同人:</span>
                      <span className="text-gray-900">{task.collaboratorNames.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* 任务描述 */}
                {task.description && (
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-700 whitespace-pre-wrap flex-1 text-sm">{task.description}</div>
                    </div>
                  </div>
                )}

                {/* 时间和进度 */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatShortDate(task.startDate)} ~ {formatShortDate(task.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>进度:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">{task.progress}%</span>
                    </div>
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>创建时间: {formatDate(task.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建跟进任务模态框 */}
      {showCreateModal && opportunity && (
        <CreateOpportunityTaskModal
          opportunity={opportunity}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOpportunityAndTasks(); // 刷新列表
            onTaskUpdate?.(); // 通知父组件更新
          }}
        />
      )}
    </>
  );
}
