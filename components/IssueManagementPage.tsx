import { useState, useEffect } from 'react';
import { Plus, Filter, Search, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Issue, IssueType } from '../types/issue';
import IssueCard from './IssueCard';
import CreateIssueModal from './CreateIssueModal';
import IssueDetailModal from './IssueDetailModal';
import EditIssueModal from './EditIssueModal';
import IssueRecycleBin from './IssueRecycleBin';
import { buildQueryConditions } from '../utils/permission';

export default function IssueManagementPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | IssueType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // 统计数据
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    processed: 0,
    confirmed: 0
  });

  useEffect(() => {
    loadIssueTypes();
    loadIssues();
  }, []);

  useEffect(() => {
    calculateStatistics();
  }, [issues]);

  const loadIssueTypes = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'issue' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const typeConfig = result.data[0];
        const typeValues = (typeConfig.values || [])
          .filter((item: any) => item.enabled !== false)
          .map((item: any) => typeof item === 'string' ? item : item.value);
        setIssueTypes(typeValues.length > 0 ? typeValues : ['销售问题', '产品问题', '财务问题', '管理问题', '系统BUG与建议']);
      } else {
        setIssueTypes(['销售问题', '产品问题', '财务问题', '管理问题', '系统BUG与建议']);
      }
    } catch (error) {
      console.error('加载问题类型配置失败:', error);
      setIssueTypes(['销售问题', '产品问题', '财务问题', '管理问题', '系统BUG与建议']);
    }
  };

  const loadIssues = async () => {
    try {
      setLoading(true);
      
      // 从localStorage获取当前用户信息
      const currentUserStr = localStorage.getItem('current_user');
      let currentUserId = '';
      let currentUserRole = '';
      
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        currentUserId = currentUser._id || currentUser.userId || '';
        
        // 🔧 关键修复:多层兼容逻辑确保admin角色正确识别
        // 优先级：roles数组 > role字段 > username判断
        if (currentUser.roles && Array.isArray(currentUser.roles)) {
          // 如果有roles数组，优先使用
          currentUserRole = currentUser.roles.includes('admin') ? 'admin' : (currentUser.roles[0] || currentUser.role || '');
        } else if (currentUser.role) {
          // 如果没有roles数组，使用role字段
          currentUserRole = currentUser.role;
        } else if (currentUser.username === 'admin') {
          // 兜底：如果username是admin，识别为admin角色
          currentUserRole = 'admin';
        } else {
          currentUserRole = '';
        }
      }

      console.log('当前用户信息:', { currentUserId, currentUserRole });

      // 使用权限工具构建查询条件
      const queryConditions = await buildQueryConditions(currentUserId, currentUserRole, db);
      console.log('查询条件:', queryConditions);
      
      // 🔧 修复: 使用 _.neq 查询未删除或字段不存在的记录
      const _ = db.command;
      const result = await db.collection('issues')
        .where({
          ...queryConditions,
          isDeleted: _.neq(true) // 查询 isDeleted != true (包括不存在的情况)
        })
        .orderBy('createdAt', 'desc')
        .get();

      console.log('查询结果:', result);
      console.log('问题数量:', result.data?.length || 0);

      if (result.data) {
        setIssues(result.data as Issue[]);
      }
    } catch (error) {
      console.error('加载问题列表失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    const total = issues.length;
    const pending = issues.filter(i => i.status === '待接收').length;
    const processing = issues.filter(i => i.status === '处理中').length;
    const processed = issues.filter(i => i.status === '已处理').length;
    const confirmed = issues.filter(i => i.status === '已确认').length;

    setStatistics({ total, pending, processing, processed, confirmed });
  };

  const filteredIssues = issues.filter(issue => {
    // 类型筛选
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false;
    
    // 状态筛选
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
    
    // 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        issue.name.toLowerCase().includes(keyword) ||
        issue.owner?.name?.toLowerCase().includes(keyword) ||
        issue.suggestions?.toLowerCase().includes(keyword)
      );
    }
    
    return true;
  });

  const handleIssueClick = async (issue: Issue) => {
    try {
      // 查询问题完整数据（包括 populate owner 和 solvers）
      const res = await db.collection('issues')
        .doc(issue._id)
        .get();
      
      if (!res.data) {
        alert('问题不存在');
        return;
      }

      const issueData = res.data[0];
      
      // Populate owner
      let owner = null;
      if (issueData.owner) {
        const ownerRes = await db.collection('users')
          .doc(issueData.owner)
          .get();
        owner = ownerRes.data?.[0] || null;
      }

      // Populate solvers
      let solvers = [];
      if (issueData.solvers && issueData.solvers.length > 0) {
        const solversRes = await db.collection('users')
          .where({
            _id: db.command.in(issueData.solvers)
          })
          .get();
        solvers = solversRes.data || [];
      }

      setSelectedIssue({
        ...issueData,
        owner,
        solvers
      });
    } catch (error) {
      console.error('获取问题详情失败:', error);
      alert('获取问题详情失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* 顶部标题和操作栏 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                问题管理
              </h1>
              <p className="text-gray-600 mt-2">记录和跟踪工作中的问题</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecycleBin(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                回收站
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                新建问题
              </button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-5 gap-4">
            {/* 全部问题 */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`bg-gradient-to-br rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                statusFilter === 'all' 
                  ? 'from-purple-100 to-purple-200 ring-2 ring-purple-500' 
                  : 'from-gray-50 to-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className={`text-sm font-medium mb-2 ${
                    statusFilter === 'all' ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    全部问题
                  </p>
                  <p className={`text-3xl font-bold ${
                    statusFilter === 'all' ? 'text-purple-900' : 'text-gray-900'
                  }`}>
                    {statistics.total}
                  </p>
                </div>
                <Filter className={`w-8 h-8 opacity-50 ${
                  statusFilter === 'all' ? 'text-purple-600' : 'text-gray-600'
                }`} />
              </div>
            </button>

            {/* 待接收 */}
            <button
              onClick={() => setStatusFilter('待接收')}
              className={`bg-gradient-to-br rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                statusFilter === '待接收' 
                  ? 'from-blue-100 to-blue-200 ring-2 ring-blue-500' 
                  : 'from-blue-50 to-blue-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className={`text-sm font-medium mb-2 ${
                    statusFilter === '待接收' ? 'text-blue-700' : 'text-blue-600'
                  }`}>
                    待接收
                  </p>
                  <p className={`text-3xl font-bold ${
                    statusFilter === '待接收' ? 'text-blue-900' : 'text-blue-900'
                  }`}>
                    {statistics.pending}
                  </p>
                </div>
                <AlertCircle className={`w-8 h-8 opacity-50 ${
                  statusFilter === '待接收' ? 'text-blue-700' : 'text-blue-600'
                }`} />
              </div>
            </button>

            {/* 处理中 */}
            <button
              onClick={() => setStatusFilter('处理中')}
              className={`bg-gradient-to-br rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                statusFilter === '处理中' 
                  ? 'from-yellow-100 to-yellow-200 ring-2 ring-yellow-500' 
                  : 'from-yellow-50 to-yellow-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className={`text-sm font-medium mb-2 ${
                    statusFilter === '处理中' ? 'text-yellow-700' : 'text-yellow-600'
                  }`}>
                    处理中
                  </p>
                  <p className={`text-3xl font-bold ${
                    statusFilter === '处理中' ? 'text-yellow-900' : 'text-yellow-900'
                  }`}>
                    {statistics.processing}
                  </p>
                </div>
                <AlertCircle className={`w-8 h-8 opacity-50 ${
                  statusFilter === '处理中' ? 'text-yellow-700' : 'text-yellow-600'
                }`} />
              </div>
            </button>

            {/* 已处理 */}
            <button
              onClick={() => setStatusFilter('已处理')}
              className={`bg-gradient-to-br rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                statusFilter === '已处理' 
                  ? 'from-orange-100 to-orange-200 ring-2 ring-orange-500' 
                  : 'from-orange-50 to-orange-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className={`text-sm font-medium mb-2 ${
                    statusFilter === '已处理' ? 'text-orange-700' : 'text-orange-600'
                  }`}>
                    已处理
                  </p>
                  <p className={`text-3xl font-bold ${
                    statusFilter === '已处理' ? 'text-orange-900' : 'text-orange-900'
                  }`}>
                    {statistics.processed}
                  </p>
                </div>
                <Search className={`w-8 h-8 opacity-50 ${
                  statusFilter === '已处理' ? 'text-orange-700' : 'text-orange-600'
                }`} />
              </div>
            </button>

            {/* 已确认 */}
            <button
              onClick={() => setStatusFilter('已确认')}
              className={`bg-gradient-to-br rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                statusFilter === '已确认' 
                  ? 'from-green-100 to-green-200 ring-2 ring-green-500' 
                  : 'from-green-50 to-green-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className={`text-sm font-medium mb-2 ${
                    statusFilter === '已确认' ? 'text-green-700' : 'text-green-600'
                  }`}>
                    已确认
                  </p>
                  <p className={`text-3xl font-bold ${
                    statusFilter === '已确认' ? 'text-green-900' : 'text-green-900'
                  }`}>
                    {statistics.confirmed}
                  </p>
                </div>
                <Search className={`w-8 h-8 opacity-50 ${
                  statusFilter === '已确认' ? 'text-green-700' : 'text-green-600'
                }`} />
              </div>
            </button>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex gap-4">
            {/* 类型筛选 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | IssueType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">全部类型</option>
                {issueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 搜索框 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索问题名称、负责人..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 问题列表 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">暂无问题数据</p>
            <p className="text-gray-400 mt-2">点击"新建问题"按钮创建第一个问题</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      问题名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      解决结果
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      解决方式
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      重要程度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      紧急程度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      解决人
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      截止日期
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIssues.map(issue => (
                    <IssueCard
                      key={issue._id}
                      issue={issue}
                      onView={() => handleIssueClick(issue)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateIssueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadIssues();
          }}
          issueTypes={issueTypes}
        />
      )}

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={() => {
            loadIssues();
          }}
          onEdit={() => {
            setEditingIssue(selectedIssue);
            setSelectedIssue(null);
          }}
          onDelete={() => {
            loadIssues();
          }}
        />
      )}

      {editingIssue && (
        <EditIssueModal
          issue={editingIssue}
          issueTypes={issueTypes}
          onClose={() => setEditingIssue(null)}
          onSuccess={() => {
            setEditingIssue(null);
            loadIssues();
          }}
        />
      )}

      {showRecycleBin && (
        <IssueRecycleBin
          onClose={() => setShowRecycleBin(false)}
          onRestore={loadIssues}
        />
      )}
    </div>
  );
}
