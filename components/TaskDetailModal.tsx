import { X, User, Calendar, Clock, Target, CheckCircle, AlertCircle, Pause, Ban, FileText, MessageSquare, Trash2 } from 'lucide-react';
import { Task, TaskStatus, getStatusColor, getStatusText } from '../types/task';
import { useState, useEffect } from 'react';
import { db } from '../lib/cloudbase';
import { usePermissionContext } from '../contexts/PermissionContext';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

interface Comment {
  _id: string;
  content: string;
  createdBy: {
    _id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  replies?: Reply[];
}

interface Reply {
  _id: string;
  content: string;
  createdBy: {
    _id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
}

export default function TaskDetailModal({ task, onClose, onEdit, onDelete }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [relatedName, setRelatedName] = useState<string>('');
  const [relatedMeasureName, setRelatedMeasureName] = useState<string>(''); // 关联的季度举措名称
  const [relatedTeamTaskName, setRelatedTeamTaskName] = useState<string>(''); // 关联的团队月度任务名称
  
  // 使用新权限系统
  const { checkPermission } = usePermissionContext();

  useEffect(() => {
    loadComments();
    loadCurrentUser();
    loadRelatedData();
    loadRelatedMeasure();
    loadRelatedTeamTask();
  }, [task._id]);

  const loadCurrentUser = async () => {
    try {
      // 修复: 使用正确的localStorage键名
      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('📝 [任务详情] 加载用户信息:', user);
        
        // 从数据库查询完整的用户信息
        const result = await db.collection('users').doc(user.userId).get();
        if (result.data && result.data.length > 0) {
          const dbUser = result.data[0];
          console.log('✅ [任务详情] 数据库用户信息:', dbUser);
          setCurrentUser(dbUser);
        } else {
          // 如果数据库查询失败,使用 localStorage 的数据
          console.warn('⚠️ [任务详情] 数据库未找到用户,使用localStorage数据');
          const fallbackUser = {
            _id: user.userId,
            username: user.username,
            name: user.name,
            role: user.role
          };
          setCurrentUser(fallbackUser);
        }
      } else {
        console.error('❌ [任务详情] localStorage中没有用户信息');
      }
    } catch (error) {
      console.error('❌ [任务详情] 加载用户信息失败:', error);
    }
  };

  // 加载关联的商机或项目数据
  const loadRelatedData = async () => {
    try {
      if (task.relatedTo) {
        if (task.type === '商机跟进') {
          const result = await db.collection('opportunities').doc(task.relatedTo).get();
          if (result.data && result.data.length > 0) {
            setRelatedName(result.data[0].name);
          }
        } else if (task.type === '项目任务') {
          const result = await db.collection('projects').doc(task.relatedTo).get();
          if (result.data && result.data.length > 0) {
            setRelatedName(result.data[0].name);
          }
        }
      }
    } catch (error) {
      console.error('加载关联数据失败:', error);
    }
  };

  // 加载关联的季度举措
  const loadRelatedMeasure = async () => {
    try {
      if (task.relatedMeasure) {
        const result = await db.collection('quarterly_measures').doc(task.relatedMeasure).get();
        if (result.data && result.data.length > 0) {
          const measure = result.data[0];
          setRelatedMeasureName(`${measure.quarter} - ${measure.content}`);
        }
      }
    } catch (error) {
      console.error('加载关联季度举措失败:', error);
    }
  };

  // 加载关联的团队月度任务
  const loadRelatedTeamTask = async () => {
    try {
      if (task.relatedTeamTask) {
        const result = await db.collection('tasks').doc(task.relatedTeamTask).get();
        if (result.data && result.data.length > 0) {
          const teamTask = result.data[0];
          setRelatedTeamTaskName(teamTask.name);
        }
      }
    } catch (error) {
      console.error('加载关联团队月度任务失败:', error);
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const result = await db.collection('task_comments')
        .where({
          taskId: task._id
        })
        .orderBy('createdAt', 'desc')
        .get();

      console.log('原始评论数据:', result.data);

      if (result.data && result.data.length > 0) {
        // 查询评论者信息和回复者信息
        const commentsWithUsers = await Promise.all(
          result.data.map(async (comment: any) => {
            try {
              // 查询评论者信息
              const userResult = await db.collection('users')
                .where({
                  _id: comment.createdBy
                })
                .get();
              
              const userData = userResult.data && userResult.data.length > 0 
                ? userResult.data[0] 
                : { _id: comment.createdBy, name: '未知用户' };
              
              // 处理回复信息
              let repliesWithUsers = [];
              if (comment.replies && comment.replies.length > 0) {
                repliesWithUsers = await Promise.all(
                  comment.replies.map(async (reply: any) => {
                    try {
                      const replyUserResult = await db.collection('users')
                        .where({
                          _id: reply.createdBy
                        })
                        .get();
                      
                      const replyUserData = replyUserResult.data && replyUserResult.data.length > 0
                        ? replyUserResult.data[0]
                        : { _id: reply.createdBy, name: '未知用户' };
                      
                      return {
                        ...reply,
                        createdBy: replyUserData
                      };
                    } catch (error) {
                      console.error('查询回复用户失败:', reply.createdBy, error);
                      return {
                        ...reply,
                        createdBy: { _id: reply.createdBy, name: '未知用户' }
                      };
                    }
                  })
                );
              }
              
              return {
                ...comment,
                createdBy: userData,
                replies: repliesWithUsers
              };
            } catch (error) {
              console.error('查询用户失败:', comment.createdBy, error);
              return {
                ...comment,
                createdBy: { _id: comment.createdBy, name: '未知用户' },
                replies: []
              };
            }
          })
        );

        console.log('带用户信息的评论:', commentsWithUsers);
        setComments(commentsWithUsers);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      setLoading(true);
      await db.collection('task_comments').add({
        taskId: task._id,
        content: newComment.trim(),
        createdBy: currentUser._id,
        createdAt: new Date(),
        replies: []
      });

      setNewComment('');
      await loadComments();
    } catch (error: any) {
      console.error('添加评论失败:', error);
      alert('添加评论失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    const content = replyContent[commentId]?.trim();
    if (!content || !currentUser) return;

    try {
      setLoading(true);
      
      // 查询原评论
      const commentResult = await db.collection('task_comments').doc(commentId).get();
      if (!commentResult.data || commentResult.data.length === 0) {
        throw new Error('评论不存在');
      }

      const comment = commentResult.data[0];
      const replies = comment.replies || [];

      // 添加新回复
      replies.push({
        _id: `reply_${Date.now()}`,
        content: content,
        createdBy: currentUser._id,
        createdAt: new Date()
      });

      // 更新评论
      await db.collection('task_comments').doc(commentId).update({
        replies: replies
      });

      // 清空回复内容
      setReplyContent(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(null);
      await loadComments();
    } catch (error: any) {
      console.error('添加回复失败:', error);
      alert('添加回复失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case '未开始':
        return <Clock className="w-5 h-5" />;
      case '进行中':
        return <Target className="w-5 h-5" />;
      case '已完成':
        return <CheckCircle className="w-5 h-5" />;
      case '延期':
        return <AlertCircle className="w-5 h-5" />;
      case '取消':
        return <Ban className="w-5 h-5" />;
      case '暂停':
        return <Pause className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 flex-1 mr-4">
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <h3 className="text-xl font-bold text-gray-900 break-words" style={{ maxWidth: '20ch', wordBreak: 'break-word' }}>
              {task.name.length > 50 ? `${task.name.substring(0, 50)}...` : task.name}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* 已完成的任务不显示编辑和删除按钮 */}
            {task.status !== '已完成' && (
              <>
                {checkPermission('tasks', 'edit') && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    编辑任务
                  </button>
                )}
                {checkPermission('tasks', 'delete') && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    放入回收站
                  </button>
                )}
              </>
            )}
            {task.status === '已完成' && (
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                ✓ 任务已完成
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 状态和进度 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">任务状态</div>
              <div className={`flex items-center gap-2 ${getStatusColor(task.status)}`}>
                {getStatusIcon(task.status)}
                <span className="font-medium">{getStatusText(task.status)}</span>
                {/* 延期标识 */}
                {task.status === '延期' && task.overdueCount && task.overdueCount > 0 && (
                  <div className="flex items-center gap-0.5 ml-2">
                    {Array.from({ length: Math.min(task.overdueCount, 5) }).map((_, index) => (
                      <AlertCircle 
                        key={index}
                        className="w-4 h-4 text-red-600 fill-red-100" 
                      />
                    ))}
                    {task.overdueCount > 5 && (
                      <span className="text-xs text-red-600 font-bold ml-1">
                        +{task.overdueCount - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* 延期次数显示 */}
              {task.status === '延期' && task.overdueCount && task.overdueCount > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  已延期 {task.overdueCount} 次
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">完成进度</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{task.progress}%</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">任务级别</div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                task.level === '团队级' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {task.level}
              </span>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
              <span className="text-gray-900">{task.type}</span>
            </div>

            {/* 计划类型(仅日常工作显示) */}
            {task.type === '日常工作' && task.planType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">计划类型</label>
                <span className="text-gray-900">{task.planType}</span>
              </div>
            )}

            {/* 关联季度举措(仅团队级月度计划显示) */}
            {task.type === '日常工作' && 
             task.level === '团队级' && 
             (task.planType === '本月计划' || task.planType === '下月计划') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    关联季度举措
                  </span>
                </label>
                {relatedMeasureName ? (
                  <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-300 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md font-semibold text-sm shadow-md">
                        战略举措
                      </span>
                      <span className="text-gray-900 font-bold text-base">
                        {relatedMeasureName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-500 text-sm">未关联季度举措</span>
                  </div>
                )}
              </div>
            )}

            {/* 关联团队月度任务(仅个人级周计划显示) */}
            {task.type === '日常工作' && 
             task.level === '个人级' && 
             (task.planType === '本周计划' || task.planType === '下周计划') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    关联团队月度工作任务
                  </span>
                </label>
                {relatedTeamTaskName ? (
                  <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 border-3 border-blue-400 rounded-lg p-5 shadow-lg">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-bold text-sm shadow-lg">
                        🎯 团队任务
                      </span>
                      <span className="text-gray-900 font-extrabold text-lg">
                        {relatedTeamTaskName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-500 text-sm">未关联团队月度任务</span>
                  </div>
                )}
              </div>
            )}

            {/* 显示关联团队任务(适用于所有任务) */}
            {task.relatedTeamTask && relatedTeamTaskName && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    关联团队月度任务
                  </span>
                </label>
                <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 border-3 border-blue-400 rounded-lg p-5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-bold text-sm shadow-lg">
                      🎯 团队任务
                    </span>
                    <span className="text-gray-900 font-extrabold text-lg">
                      {relatedTeamTaskName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                负责人
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full inline-flex">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                  {task.owner.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-900">{task.owner.name}</span>
              </div>
            </div>

            {/* 协同人 */}
            {task.collaborators && task.collaborators.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  协同人 ({task.collaborators.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.collaborators.map((collaborator) => (
                    <div
                      key={collaborator._id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {collaborator.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{collaborator.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                开始日期
              </label>
              <span className="text-gray-900">{new Date(task.startDate).toLocaleDateString()}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                截止日期
              </label>
              <span className={`${
                new Date(task.endDate) < new Date() && task.status !== '已完成'
                  ? 'text-red-600 font-medium'
                  : 'text-gray-900'
              }`}>
                {new Date(task.endDate).toLocaleDateString()}
              </span>
            </div>

            {task.team && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">所属团队</label>
                <span className="text-gray-900">{task.team}</span>
              </div>
            )}

            {/* 是否公开 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">可见性</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                task.isPublic 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {task.isPublic ? '公开（团队成员可见）' : '私有'}
              </span>
            </div>
          </div>

          {/* 任务描述 */}
          {task.description && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {/* 商机跟进任务特有字段 */}
          {task.type === '商机跟进' && (
            <>
              {relatedName && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联商机</label>
                  <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 font-medium">
                    {relatedName}
                  </span>
                </div>
              )}
              {task.opportunityActionType && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">跟进动作类型</label>
                  <span className="text-gray-900">{task.opportunityActionType}</span>
                </div>
              )}
            </>
          )}

          {/* 项目任务特有字段 */}
          {task.type === '项目任务' && (
            <>
              {relatedName && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联项目</label>
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium">
                    {relatedName}
                  </span>
                </div>
              )}
              {task.projectPhase && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">项目任务环节</label>
                  <span className="inline-flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-medium">
                    {task.projectPhase}
                  </span>
                </div>
              )}
            </>
          )}

          {/* 评论区 */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-medium text-gray-900">评论 ({comments.length})</h4>
            </div>

            {/* 添加评论 */}
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="添加评论..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '发布中...' : '发布评论'}
                </button>
              </div>
            </div>

            {/* 评论列表 */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {comment.createdBy.avatar ? (
                      <img
                        src={comment.createdBy.avatar}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {comment.createdBy.name?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{comment.createdBy.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-2">{comment.content}</p>
                      
                      {/* 回复按钮 */}
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {replyingTo === comment._id ? '取消回复' : '回复'}
                      </button>

                      {/* 回复列表 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200">
                          {comment.replies.map((reply) => (
                            <div key={reply._id} className="bg-white rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                                  {reply.createdBy.name?.[0] || '?'}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{reply.createdBy.name}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 ml-8">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 回复输入框 */}
                      {replyingTo === comment._id && (
                        <div className="mt-3">
                          <textarea
                            value={replyContent[comment._id] || ''}
                            onChange={(e) => setReplyContent(prev => ({ ...prev, [comment._id]: e.target.value }))}
                            placeholder="输入回复内容..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleAddReply(comment._id)}
                              disabled={!replyContent[comment._id]?.trim() || loading}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? '发送中...' : '发送回复'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {comments.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  暂无评论，快来发表第一条评论吧！
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认放入回收站</h3>
                <p className="text-sm text-gray-600 mt-1">任务将被移入回收站，可在回收站中恢复</p>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                <span className="font-medium">将要移入回收站:</span> {task.name}
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                确认移入回收站
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
