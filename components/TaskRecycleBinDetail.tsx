import { X, User, Calendar, FileText, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { Task } from '../types/task';
import { useState } from 'react';
import { db } from '../lib/cloudbase';

interface TaskRecycleBinDetailProps {
  task: Task;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export default function TaskRecycleBinDetail({ task, onClose, onRestoreSuccess }: TaskRecycleBinDetailProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 恢复任务
  const handleRestore = async () => {
    try {
      setLoading(true);
      
      // 移除删除标记
      await db.collection('tasks').doc(task._id).update({
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date()
      });
      
      onRestoreSuccess();
    } catch (error) {
      console.error('恢复任务失败:', error);
      alert('恢复任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 永久删除任务
  const handlePermanentDelete = async () => {
    try {
      setLoading(true);
      
      // 真正删除任务
      await db.collection('tasks').doc(task._id).remove();
      
      // 同时删除任务相关的评论
      const commentsResult = await db.collection('task_comments')
        .where({
          taskId: task._id
        })
        .get();
      
      if (commentsResult.data && commentsResult.data.length > 0) {
        await Promise.all(
          commentsResult.data.map((comment: any) =>
            db.collection('task_comments').doc(comment._id).remove()
          )
        );
      }
      
      setShowDeleteConfirm(false);
      onRestoreSuccess();
    } catch (error) {
      console.error('永久删除任务失败:', error);
      alert('永久删除任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{task.name}</h3>
                <p className="text-sm text-orange-600">此任务已在回收站中</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 提示信息 */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">任务已被删除</p>
                  <p className="text-sm text-orange-700 mt-1">
                    删除时间: {task.deletedAt ? new Date(task.deletedAt).toLocaleString() : '未知'}
                  </p>
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">任务级别</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.level === '公司级' ? 'bg-red-100 text-red-800' :
                  task.level === '团队级' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.level}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
                <span className="text-gray-900">{task.type}</span>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">任务状态</label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {task.status}
                </span>
              </div>

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
                <span className="text-gray-900">{new Date(task.endDate).toLocaleDateString()}</span>
              </div>

              {task.team && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">所属团队</label>
                  <span className="text-gray-900">{task.team}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">完成进度</label>
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
          </div>

          {/* 底部操作按钮 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              永久删除
            </button>
            <button
              onClick={handleRestore}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? '恢复中...' : '返回继续执行'}
            </button>
          </div>
        </div>
      </div>

      {/* 永久删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认永久删除</h3>
                <p className="text-sm text-gray-600 mt-1">此操作无法撤销，任务将被永久删除</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <span className="font-medium">将要永久删除:</span> {task.name}
              </p>
              <p className="text-xs text-red-700 mt-1">
                相关的评论也将被一并删除
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
                onClick={handlePermanentDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? '删除中...' : '确认永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
