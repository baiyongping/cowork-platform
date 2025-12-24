import { X, User, Calendar, Clock, Target, CheckCircle, AlertCircle, Pause, Ban, FileText, MessageSquare, Trash2, Briefcase, Users, Edit2 } from 'lucide-react';
import { Task, TaskStatus, getStatusColor, getStatusText } from '../types/task';
import { useState, useEffect } from 'react';
import { app, db } from '../lib/cloudbase';
import { usePermissionContext } from '../contexts/PermissionContext';
import { UserAvatar } from './UserAvatar';
import Drawer from './Drawer';

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
  const [isEditing, setIsEditing] = useState(false); // 编辑模式状态
  const [editForm, setEditForm] = useState<any>({}); // 编辑表单数据
  
  // 新增状态：可编辑字段的数据源
  const [allUsers, setAllUsers] = useState<any[]>([]); // 所有用户列表
  const [quarterlyMeasures, setQuarterlyMeasures] = useState<any[]>([]); // 季度举措列表
  const [teamMonthlyTasks, setTeamMonthlyTasks] = useState<any[]>([]); // 团队月度任务列表
  const [selectedMeasure, setSelectedMeasure] = useState<{ id: string; content: string } | null>(null);
  const [selectedTeamTask, setSelectedTeamTask] = useState<{ id: string; name: string } | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]); // 已选择的协同人ID列表
  const [planType, setPlanType] = useState(task.planType || '本周计划'); // 计划类型
  
  // 使用新权限系统
  const { checkPermission } = usePermissionContext();

  useEffect(() => {
    loadComments();
    loadCurrentUser();
    loadRelatedData();
    loadRelatedMeasure();
    loadRelatedTeamTask();
    loadUsers(); // 新增：加载用户列表
    loadQuarterlyMeasures(); // 新增：加载季度举措列表
    loadTeamMonthlyTasks(); // 新增：加载团队月度任务列表
    
    // 初始化编辑表单
    const initialPlanType = task.planType || (task.level === '个人级' ? '本周计划' : '本月计划');
    
    setEditForm({
      name: task.name || '',
      status: task.status || '未开始',
      progress: task.progress || 0,
      level: task.level || '个人级',
      type: task.type || '日常工作',
      planType: initialPlanType, // 新增：计划类型
      description: task.description || '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      owner: task.owner._id || '', // 新增：负责人ID
      collaborators: task.collaborators?.map((c: any) => c._id) || [], // 新增：协同人ID列表
      isPublic: task.isPublic !== undefined ? task.isPublic : true, // 新增：可见性设置
      relatedMeasure: task.relatedMeasure || '', // 新增：关联季度举措
      relatedTeamTask: task.relatedTeamTask || '', // 新增:关联团队月度任务
    });
    
    // 同步 planType 状态
    setPlanType(initialPlanType);
    
    // 初始化协同人选择状态
    if (task.collaborators && task.collaborators.length > 0) {
      setSelectedCollaborators(task.collaborators.map((c: any) => c._id));
    }
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

  // 新增：加载用户列表
  const loadUsers = async () => {
    try {
      const result = await db.collection('users')
        .where({ approvalStatus: 'approved', isActive: true })
        .get();
      if (result.data) {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  // 新增：获取日期所在的季度
  // 工具函数: 获取指定日期的季度信息
  const getQuarter = (date: Date): { year: number; quarter: string; display: string } => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return {
      year,
      quarter: `Q${quarter}`,
      display: `${year}Q${quarter}`
    };
  };

  // 新增: 计算目标季度(根据计划类型智能判断)
  const getTargetQuarter = (planType: string): { year: number; quarter: string; display: string } => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    let targetDate = now;
    
    if (planType === '下月计划') {
      // 下月计划: 计算下个月所在的季度
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      targetDate = new Date(nextYear, nextMonth - 1, 1);
    } else if (planType === '下周计划') {
      // 下周计划: 计算下周所在的季度
      targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    // 本周计划/本月计划: 使用当前日期
    
    return getQuarter(targetDate);
  };

  // 加载季度举措列表(根据计划类型动态加载对应季度)
  const loadQuarterlyMeasures = async (currentPlanType?: string) => {
    try {
      // 使用传入的planType或当前的planType状态
      const targetPlanType = currentPlanType || planType;
      
      // 根据计划类型计算目标季度
      const { year, quarter, display } = getTargetQuarter(targetPlanType);
      
      console.log(`📅 加载季度举措 - 计划类型: ${targetPlanType}, 目标季度: ${display}`);
      
      const result = await db.collection('quarterly_measures')
        .where({ 
          year: year,
          quarter: quarter,
          status: db.command.neq('已完成') 
        })
        .get();
      
      if (result.data) {
        setQuarterlyMeasures(result.data);
        console.log(`✅ 加载到 ${result.data.length} 条季度举措 (${display})`);
        
        // 如果任务已关联季度举措,设置选中状态
        if (task.relatedMeasure) {
          const measure = result.data.find((m: any) => m._id === task.relatedMeasure);
          if (measure) {
            setSelectedMeasure({ id: measure._id, content: measure.content });
          } else {
            // 如果关联的举措不在当前季度,清除选中状态
            console.warn('⚠️ 关联的季度举措不在目标季度,已清除选中状态');
            setSelectedMeasure(null);
            setEditForm(prev => ({ ...prev, relatedMeasure: undefined }));
          }
        }
      } else {
        setQuarterlyMeasures([]);
      }
    } catch (error) {
      console.error('加载季度举措列表失败:', error);
      setQuarterlyMeasures([]);
    }
  };

  // 新增：加载团队月度任务列表
  const loadTeamMonthlyTasks = async () => {
    try {
      if (!currentUser) {
        console.warn('⚠️ 当前用户信息未加载,无法查询团队月度任务');
        return;
      }

      // 查询所有团队级 + 本月/下月计划 + 进行中的任务
      const result = await db.collection('tasks')
        .where({
          level: '团队级',
          type: '日常工作',
          planType: db.command.in(['本月计划', '下月计划']), // 查询本月和下月计划
          status: '进行中', // 只查询进行中的任务
          isDeleted: db.command.neq(true)
        })
        .get();
      
      if (result.data) {
        // 客户端过滤:只保留当前用户有查看权限的任务
        const filteredTasks = result.data.filter((t: any) => {
          // 1. 管理员可以看到所有任务
          if (currentUser.role === 'admin' || currentUser.roles?.includes('admin')) {
            return true;
          }
          
          // 2. 公开任务都可以看到
          if (t.isPublic === true) {
            return true;
          }
          
          // 3. 负责人是当前用户
          if (t.owner === currentUser._id || t.owner?._id === currentUser._id) {
            return true;
          }
          
          // 4. 协同人包含当前用户
          if (t.collaborators && Array.isArray(t.collaborators)) {
            const collaboratorIds = t.collaborators.map((c: any) => 
              typeof c === 'string' ? c : c._id
            );
            if (collaboratorIds.includes(currentUser._id)) {
              return true;
            }
          }
          
          return false;
        });
        
        setTeamMonthlyTasks(filteredTasks);
        console.log(`📋 加载团队月度任务: 总数${result.data.length}, 有权限查看${filteredTasks.length}`);
        
        // 如果任务已关联团队月度任务,设置选中状态
        if (task.relatedTeamTask) {
          const teamTask = filteredTasks.find((t: any) => t._id === task.relatedTeamTask);
          if (teamTask) {
            setSelectedTeamTask({ id: teamTask._id, name: teamTask.name });
          }
        }
      } else {
        setTeamMonthlyTasks([]);
      }
    } catch (error) {
      console.error('加载团队月度任务列表失败:', error);
      setTeamMonthlyTasks([]);
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

      // 发送评论通知
      const receiversSet = new Set<string>();
      
      // 通知任务负责人
      if (task.owner && task.owner._id !== currentUser._id) {
        receiversSet.add(task.owner._id);
      }
      
      // 通知协同人
      if (task.collaborators) {
        task.collaborators.forEach((c: any) => {
          if (c._id !== currentUser._id) {
            receiversSet.add(c._id);
          }
        });
      }
      
      const receivers = Array.from(receiversSet);
      if (receivers.length > 0) {
        try {
          await app.callFunction({
            name: 'task-message',
            data: {
              action: 'comment',
              taskId: task._id,
              taskName: task.name,
              taskLevel: task.level,
              receivers
            }
          });
        } catch (error) {
          console.error('评论通知失败:', error);
        }
      }

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // 重置表单
    setEditForm({
      name: task.name || '',
      status: task.status || '未开始',
      progress: task.progress || 0,
      level: task.level || '个人级',
      type: task.type || '日常工作',
      description: task.description || '',
      startDate: task.startDate || '',
      endDate: task.endDate || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      
      await db.collection('tasks').doc(task._id).update({
        ...editForm,
        updatedAt: new Date()
      });
      
      setIsEditing(false);
      // 调用父组件的刷新回调
      if (onEdit) {
        onEdit();
      }
      onClose(); // 关闭抽屉
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败,请重试');
    } finally {
      setLoading(false);
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
      {/* 侧边抽屉式任务详情 */}
      <Drawer
        isOpen={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(task.status)} bg-opacity-20`}>
              {getStatusIcon(task.status)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {task.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className="text-xs text-gray-500">进度: {task.progress}%</span>
              </div>
            </div>
          </div>
        }
        actions={
          !isEditing ? (
            <div className="flex items-center gap-2">
              {task.status !== '已完成' ? (
                <>
                  {checkPermission('tasks', 'edit') && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </button>
                  )}
                  {checkPermission('tasks', 'delete') && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  )}
                </>
              ) : (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
                  ✓ 已完成
                </span>
              )}
            </div>
          ) : null
        }
      >
        <div className="space-y-6">
          {/* 编辑模式 */}
          {isEditing ? (
            <div className="space-y-6">
              {/* 基本信息表单 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 任务名称 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务名称 *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入任务名称"
                    />
                  </div>

                  {/* 任务状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务状态 *</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="未开始">未开始</option>
                      <option value="进行中">进行中</option>
                      <option value="已完成">已完成</option>
                      <option value="延期">延期</option>
                      <option value="取消">取消</option>
                      <option value="暂停">暂停</option>
                    </select>
                  </div>

                  {/* 完成进度 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">完成进度 *</label>
                    <input
                      type="number"
                      value={editForm.progress}
                      onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0-100"
                    />
                  </div>

                  {/* 任务类型（只读显示） */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
                    <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                      {editForm.type}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      任务类型创建后不可修改
                    </p>
                  </div>

                  {/* 任务级别(仅日常工作显示) */}
                  {editForm.type === '日常工作' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">任务级别 *</label>
                      <select
                        value={editForm.level}
                        onChange={(e) => {
                          const newLevel = e.target.value;
                          setEditForm({ ...editForm, level: newLevel });
                          
                          // 如果选择团队级,立即加载季度举措
                          if (newLevel === '团队级') {
                            const currentPlanType = editForm.level === '个人级' ? '本月计划' : planType;
                            loadQuarterlyMeasures(currentPlanType);
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="个人级">个人级</option>
                        <option value="团队级">团队级</option>
                      </select>
                    </div>
                  )}

                  {/* 计划类型(仅日常工作显示) */}
                  {editForm.type === '日常工作' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">计划类型 *</label>
                      <select
                        value={planType}
                        onChange={(e) => {
                          const newPlanType = e.target.value;
                          setPlanType(newPlanType);
                          setEditForm({ ...editForm, planType: newPlanType });
                          
                          // 如果是团队级任务,切换计划类型时重新加载对应季度的举措
                          if (editForm.level === '团队级') {
                            loadQuarterlyMeasures(newPlanType);
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {editForm.level === '个人级' ? (
                          <>
                            <option value="本周计划">本周计划</option>
                            <option value="下周计划">下周计划</option>
                          </>
                        ) : (
                          <>
                            <option value="本月计划">本月计划</option>
                            <option value="下月计划">下月计划</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {/* 关联季度举措(仅团队级 + 日常工作时显示) */}
                  {editForm.type === '日常工作' && editForm.level === '团队级' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关联季度举措
                      </label>
                      <select
                        value={selectedMeasure?.id || ''}
                        onChange={(e) => {
                          const measureId = e.target.value;
                          if (measureId) {
                            const measure = quarterlyMeasures.find(m => m._id === measureId);
                            if (measure) {
                              setSelectedMeasure({ id: measure._id, content: measure.content });
                              setEditForm({ ...editForm, relatedMeasure: measureId });
                            }
                          } else {
                            setSelectedMeasure(null);
                            setEditForm({ ...editForm, relatedMeasure: undefined });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">请选择季度举措(可选)</option>
                        {quarterlyMeasures.map(measure => (
                          <option key={measure._id} value={measure._id}>
                            {measure.year}Q{measure.quarter.replace('Q', '')} - {measure.content}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        选择本任务关联的季度举措(目标季度: {getTargetQuarter(planType).display})
                      </p>
                    </div>
                  )}

                  {/* 关联团队月度任务（仅个人级 + 周计划时显示） */}
                  {editForm.type === '日常工作' && 
                   editForm.level === '个人级' && 
                   (planType === '本周计划' || planType === '下周计划') && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关联团队月度工作任务
                      </label>
                      <select
                        value={selectedTeamTask?.id || ''}
                        onChange={(e) => {
                          const taskId = e.target.value;
                          if (taskId) {
                            const teamTask = teamMonthlyTasks.find(t => t._id === taskId);
                            if (teamTask) {
                              setSelectedTeamTask({ id: teamTask._id, name: teamTask.name });
                              setEditForm({ ...editForm, relatedTeamTask: taskId });
                            }
                          } else {
                            setSelectedTeamTask(null);
                            setEditForm({ ...editForm, relatedTeamTask: undefined });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">请选择团队月度任务（可选）</option>
                        {teamMonthlyTasks.map(task => (
                          <option key={task._id} value={task._id}>
                            {task.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        选择本任务关联的团队月度工作任务
                      </p>
                    </div>
                  )}

                  {/* 关联商机（仅商机跟进显示） */}
                  {editForm.type === '商机跟进' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关联商机 <span className="text-red-500">*</span>
                      </label>
                      <p className="text-sm text-gray-600">
                        {task.relatedTo && relatedName ? (
                          <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 font-medium">
                            {relatedName}
                          </span>
                        ) : (
                          <span className="text-gray-500">未关联商机</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        商机关联信息不可修改，请在创建任务时选择
                      </p>
                    </div>
                  )}

                  {/* 关联项目（仅项目任务显示） */}
                  {editForm.type === '项目任务' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关联项目 <span className="text-red-500">*</span>
                      </label>
                      <p className="text-sm text-gray-600">
                        {task.relatedTo && relatedName ? (
                          <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium">
                            {relatedName}
                          </span>
                        ) : (
                          <span className="text-gray-500">未关联项目</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        项目关联信息不可修改，请在创建任务时选择
                      </p>
                    </div>
                  )}

                  {/* 开始日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">开始日期 *</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 截止日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">截止日期 *</label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 任务描述 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入任务描述"
                    />
                  </div>

                  {/* 负责人 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">负责人 *</label>
                    <select
                      value={editForm.owner || ''}
                      onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择负责人</option>
                      {allUsers.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 协同人 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">协同人</label>
                    <div className="space-y-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const userId = e.target.value;
                          if (userId && !selectedCollaborators.includes(userId)) {
                            const newCollaborators = [...selectedCollaborators, userId];
                            setSelectedCollaborators(newCollaborators);
                            setEditForm({ ...editForm, collaborators: newCollaborators });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">添加协同人...</option>
                        {allUsers
                          .filter(user => 
                            user._id !== editForm.owner && 
                            !selectedCollaborators.includes(user._id)
                          )
                          .map(user => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.department})
                            </option>
                          ))
                        }
                      </select>
                      {selectedCollaborators.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedCollaborators.map((collaboratorId) => {
                            const collaborator = allUsers.find(u => u._id === collaboratorId);
                            if (!collaborator) return null;
                            return (
                              <span
                                key={collaboratorId}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-sm font-medium text-blue-800"
                              >
                                {collaborator.name}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCollaborators = selectedCollaborators.filter(id => id !== collaboratorId);
                                    setSelectedCollaborators(newCollaborators);
                                    setEditForm({ ...editForm, collaborators: newCollaborators });
                                  }}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {selectedCollaborators.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCollaborators([]);
                            setEditForm({ ...editForm, collaborators: [] });
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          清空协同人
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 可见性设置 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">可见性设置</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={editForm.isPublic === true}
                          onChange={() => setEditForm({ ...editForm, isPublic: true })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">✓ 团队可见</span>
                        <span className="text-xs text-gray-500">所有团队成员都可以查看此任务</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={editForm.isPublic === false}
                          onChange={() => setEditForm({ ...editForm, isPublic: false })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">🔒 不公开</span>
                        <span className="text-xs text-gray-500">仅任务负责人、协同人、部门负责人和管理员可见</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 保存和取消按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            /* 查看模式 */
            <div className="space-y-6">
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

            {/* 关联季度举措(仅团队级 + 日常工作显示) */}
            {task.type === '日常工作' && task.level === '团队级' && (
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
                    关联团队月度任务
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                负责人
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full inline-flex">
                <UserAvatar user={task.owner} size="xs" />
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
                      <UserAvatar user={collaborator} size="xs" />
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
                                <UserAvatar user={reply.createdBy} size="xs" />
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
          )}
        </div>
      </Drawer>

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

// 获取状态图标辅助函数
function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case '未开始':
      return <Clock className="w-5 h-5 text-gray-600" />;
    case '进行中':
      return <Target className="w-5 h-5 text-blue-600" />;
    case '已完成':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case '延期':
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case '暂停':
      return <Pause className="w-5 h-5 text-yellow-600" />;
    case '取消':
      return <Ban className="w-5 h-5 text-gray-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-600" />;
  }
}
