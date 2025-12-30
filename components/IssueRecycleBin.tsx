import { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Search, Calendar, User } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Issue } from '../types/issue';
import { showError, showConfirm } from '../utils/ui-feedback';

interface IssueRecycleBinProps {
  onClose: () => void;
  onRestore: () => void;
}

export default function IssueRecycleBin({ onClose, onRestore }: IssueRecycleBinProps) {
  const [deletedIssues, setDeletedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadDeletedIssues();
  }, []);

  const loadDeletedIssues = async () => {
    try {
      setLoading(true);
      const { ensureAuth } = await import('../lib/cloudbase');
      await ensureAuth();

      const { data } = await db.collection('issues')
        .where({
          isDeleted: true
        })
        .orderBy('deletedAt', 'desc')
        .get();

      setDeletedIssues(data as Issue[]);
    } catch (error) {
      console.error('加载已删除问题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (issue: Issue) => {
    if (!showConfirm(`确定要恢复问题"${issue.name}"吗?`)) {
      return;
    }

    try {
      const { ensureAuth } = await import('../lib/cloudbase');
      await ensureAuth();

      await db.collection('issues').doc(issue._id).update({
        isDeleted: false,
        deletedAt: null
      });

      loadDeletedIssues();
      onRestore();
    } catch (error) {
      console.error('恢复问题失败:', error);
      showError('恢复问题失败，请稍后重试');
    }
  };

  const handlePermanentDelete = async (issue: Issue) => {
    if (!showConfirm(`确定要永久删除问题"${issue.name}"吗？此操作不可恢复！`)) {
      return;
    }

    try {
      const { ensureAuth } = await import('../lib/cloudbase');
      await ensureAuth();

      await db.collection('issues').doc(issue._id).remove();

      loadDeletedIssues();
    } catch (error) {
      console.error('永久删除问题失败:', error);
      showError('永久删除问题失败，请稍后重试');
    }
  };

  const filteredIssues = deletedIssues.filter(issue =>
    issue.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    issue.suggestions?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Trash2 className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">问题回收站</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索已删除的问题..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 问题列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Trash2 className="h-16 w-16 mb-4" />
              <p className="text-lg">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {issue.name}
                      </h3>
                      {issue.suggestions && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {issue.suggestions}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            删除于: {new Date(issue.deletedAt || '').toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{issue.owner.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          issue.type === '销售问题' ? 'bg-red-100 text-red-800' :
                          issue.type === '产品问题' ? 'bg-blue-100 text-blue-800' :
                          issue.type === '财务问题' ? 'bg-green-100 text-green-800' :
                          issue.type === '管理问题' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {issue.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleRestore(issue)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>恢复</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(issue)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>永久删除</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            共 {filteredIssues.length} 个已删除的问题
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
