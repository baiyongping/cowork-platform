import { useState, useEffect } from 'react';
import { X, MessageCircle, Paperclip, Send, Calendar, User, Tag, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Issue, IssueReply, IssueType } from '../types/issue';
import AttachmentViewer from './AttachmentViewer';
import { usePermissionContext } from '../contexts/PermissionContext';
import { checkIssuePermission } from '../utils/permission';
import Drawer from './Drawer';

interface IssueDetailModalProps {
  issue: Issue;
  onClose: () => void;
  onUpdate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function IssueDetailModal({ issue, onClose, onUpdate, onEdit }: IssueDetailModalProps) {
  const { currentUser, isAdmin } = usePermissionContext();
  const [replies, setReplies] = useState<IssueReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<IssueType | null>(issue.type);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 获取当前用户ID - 支持 _id 和 userId 两种字段
  const getCurrentUserId = () => {
    if (!currentUser) return null;
    return currentUser._id || currentUser.userId || null;
  };

  // 获取当前用户的权限
  const userId = getCurrentUserId();
  const permissions = userId ? checkIssuePermission(userId, issue) : null;
  // ✅ 管理员拥有查看所有问题的权限
  const canView = isAdmin || (permissions?.canView || false);
  const canEditIssue = isAdmin || (permissions?.canEditDetails || false);
  const canDeleteIssue = isAdmin || (permissions?.canDelete || false);

  useEffect(() => {
    if (issue.type) {
      loadIssueType();
    }
  }, [issue.type]); // Only reload when type changes

  useEffect(() => {
    if (issue._id) {
      loadReplies();
    }
  }, [issue._id]); // Only reload when issue ID changes

  const loadIssueType = async () => {
    if (!issue.type) return;
    try {
      // issue.type 已经是 IssueType 字符串类型
      // 这里只是为了演示,实际上 issue.type 已经包含了类型信息
      // 如果 issue_types 集合存储了额外信息,可以通过 name 字段查询
      const result = await db.collection('issue_types').where({ name: issue.type }).get();
      if (result.data && result.data.length > 0) {
        setIssueType(result.data[0] as any);
      }
    } catch (error) {
      console.error('加载问题类型失败:', error);
      setError('加载问题类型失败,请刷新重试');
    }
  };

  const loadReplies = async () => {
    if (!issue._id) return;
    try {
      console.log('🔍 开始加载答复, issueId:', issue._id);
      const result = await db
        .collection('issue_replies')
        .where({ issueId: issue._id, isDeleted: false })
        .orderBy('createdAt', 'asc')
        .get();
      console.log('📦 查询结果:', result);
      console.log('📊 答复数量:', result.data?.length || 0);
      console.log('📝 答复数据:', result.data);
      setReplies(result.data as IssueReply[]);
    } catch (error) {
      console.error('❌ 加载答复失败:', error);
      setError('加载答复失败,请刷新重试');
    }
  };

  const handleAddReply = async () => {
    if (!newReply.trim() || !currentUser) return;
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // ✅ 支持 _id 和 userId 两种字段
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setError('无法获取当前用户ID,请重新登录');
        console.error('❌ 无法获取当前用户ID');
        return;
      }
      
      const replyData = {
        issueId: issue._id,
        content: newReply.trim(),
        createdBy: currentUserId,
        createdByName: currentUser.name || currentUser.username,
        replyTo: replyTo || null,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 准备添加答复:', replyData);
      const addResult = await db.collection('issue_replies').add(replyData);
      console.log('✅ 答复添加成功:', addResult);
      
      await db.collection('issues').doc(issue._id).update({
        updatedAt: new Date().toISOString()
      });
      
      setNewReply('');
      setReplyTo(null);
      
      console.log('🔄 开始重新加载答复...');
      await loadReplies();
      console.log('✅ 答复加载完成, 当前答复数量:', replies?.length);
      
      onUpdate();
    } catch (error) {
      console.error('❌ 添加答复失败:', error);
      setError('添加答复失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  const getReplyTo = (replyToId: string) => {
    return replies.find(r => r._id === replyToId);
  };

  const handleDelete = async () => {
    if (!canDeleteIssue) return;
    try {
      await db.collection('issues').doc(issue._id).update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId
      });
      setShowDeleteConfirm(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('移入回收站失败:', error);
      alert('移入回收站失败，请重试');
    }
  };

  if (!canView) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">无权查看</h3>
            <p className="text-gray-600 mb-4">您没有权限查看此问题</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 bg-opacity-20">
            <Tag className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">
              {issue.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                issue.status === '待接收' ? 'bg-gray-50 text-gray-700' :
                issue.status === '处理中' ? 'bg-blue-50 text-blue-700' :
                issue.status === '已处理' ? 'bg-green-50 text-green-700' :
                issue.status === '待确认' ? 'bg-yellow-50 text-yellow-700' :
                issue.status === '已确认' ? 'bg-purple-50 text-purple-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                {issue.status}
              </span>
              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-700 font-medium">
                <Calendar className="h-3 w-3" />
                {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
              </span>
              {issueType && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                  <Tag className="h-3 w-3" />
                  {issueType}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEditIssue && onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )}
            {canDeleteIssue && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
          {/* 问题描述及建议 */}
          {issue.suggestions && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">问题描述及建议</label>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap border border-gray-200">
                {issue.suggestions}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 紧急程度 */}
            {issue.urgency && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">紧急程度</label>
                <span className={`px-3 py-1 rounded-full font-medium ${
                  issue.urgency === '及时解决' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {issue.urgency}
                </span>
              </div>
            )}

            {/* 重要程度 */}
            {issue.priority && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">重要程度</label>
                <span className={`px-3 py-1 rounded-full font-medium ${
                  issue.priority === '非常重要' ? 'bg-red-50 text-red-700' :
                  issue.priority === '一般重要' ? 'bg-orange-50 text-orange-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                  {issue.priority}
                </span>
              </div>
            )}

            {/* 开始日期 */}
            {issue.startDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  开始日期
                </label>
                <span className="text-gray-900">{new Date(issue.startDate).toLocaleDateString('zh-CN')}</span>
              </div>
            )}

            {/* 截止日期 */}
            {issue.endDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  截止日期
                </label>
                <span className="text-gray-900">{new Date(issue.endDate).toLocaleDateString('zh-CN')}</span>
              </div>
            )}

            {/* 发起人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                发起人
              </label>
              <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full inline-flex">
                <span className="text-sm font-medium text-gray-900">{issue.owner.name || '未知用户'}</span>
              </div>
            </div>

            {/* 问题解决人 */}
            {issue.solvers && issue.solvers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  问题解决人
                </label>
                <div className="flex flex-wrap gap-2">
                  {issue.solvers.map((solver, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {typeof solver === 'string' ? solver : (solver.name || '未知用户')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 解决方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">解决方式</label>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                {issue.solution || '未设置'}
              </span>
            </div>

            {/* 解决结果 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">解决结果</label>
              <span className={`px-3 py-1 rounded-full font-medium ${
                issue.result === '已解决' ? 'bg-green-50 text-green-700' :
                !issue.result ? 'bg-gray-50 text-gray-700' :
                'bg-red-50 text-red-700'
              }`}>
                {issue.result || '未确定'}
              </span>
            </div>

            {/* 公开性 */}
            {issue.isPublic !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">可见性</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  issue.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {issue.isPublic ? '公开（团队成员可见）' : '私有'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 附件 */}
        {issue.attachments && issue.attachments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              附件 ({issue.attachments.length})
            </h4>
            <AttachmentViewer 
              attachments={issue.attachments}
            />
          </div>
        )}

        {/* 答复区 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <h4 className="text-lg font-medium text-gray-900">答复 ({replies?.length || 0})</h4>
          </div>

          {/* 答复列表 */}
          <div className="space-y-4">
            {(replies || []).map((reply) => {
              const replyToData = reply.replyTo ? getReplyTo(reply.replyTo) : null;
              return (
                <div key={reply._id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{reply.createdByName}</span>
                      <span className="text-gray-500">
                        {new Date(reply.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {currentUser && (
                      <button onClick={() => setReplyTo(reply._id!)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        回复
                      </button>
                    )}
                  </div>
                  {replyToData && (
                    <div className="mb-2 pl-3 border-l-2 border-gray-300 text-sm text-gray-600">
                      回复 @{replyToData.createdByName}: {replyToData.content?.substring(0, 50) || '(无内容)'}...
                    </div>
                  )}
                  <div className="text-gray-700 whitespace-pre-wrap">{reply.content}</div>
                </div>
              );
            })}
            {(replies?.length || 0) === 0 && (
              <div className="text-center py-8 text-gray-500">暂无答复</div>
            )}
          </div>
        </div>
      </div>
      
      {/* 答复输入区 */}
      {currentUser && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
              <span className="text-sm text-blue-700">回复 @{getReplyTo(replyTo)?.createdByName}</span>
              <button onClick={() => setReplyTo(null)} className="text-blue-700 hover:text-blue-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="输入答复内容..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <button
              onClick={handleAddReply}
              disabled={!newReply.trim() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 self-end"
            >
              <Send className="h-4 w-4" />
              发送
            </button>
          </div>
        </div>
      )}
    </Drawer>

    {/* 删除确认对话框 */}
    {showDeleteConfirm && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认放入回收站</h3>
                <p className="text-sm text-gray-600 mt-1">问题将被移入回收站，可在回收站中恢复</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-medium">将要移入回收站:</span> {issue.name}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
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

export default IssueDetailModal;
