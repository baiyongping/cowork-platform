import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Phone, Calendar, Search, Mail, Bell, Trash2 } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { sendApprovalSuccessSms, sendApprovalRejectSms } from '../lib/sms-service';
import { showAlert, showConfirm, showSuccess, showError, showWarning } from '../lib/dialog-utils';

interface PendingUser {
  _id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  department: string;
  role: string;
  status: string;
  createdAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
  lastLoginAt?: string;
}

interface UserApprovalPageProps {
  currentUser: any;
  onPendingCountChange?: (count: number) => void;
}

export function UserApprovalPage({ currentUser, onPendingCountChange }: UserApprovalPageProps) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [allUsersStats, setAllUsersStats] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 [用户审核] 开始加载用户列表，筛选条件:', filter);
      
      // 查询所有用户（不使用orderBy，避免索引问题）
      const result = await db.collection('users').get();
      
      console.log('📊 [用户审核] 查询到用户数量:', result.data?.length || 0);
      console.log('📋 [用户审核] 原始数据:', result.data);
      
      if (!result.data || result.data.length === 0) {
        console.warn('⚠️ 数据库中没有用户数据，请先初始化数据库');
        setUsers([]);
        setAllUsersStats({ all: 0, pending: 0, approved: 0, rejected: 0 });
        return;
      }
      
      // 在客户端进行筛选和数据规范化，并按创建时间排序
      let allUsers = result.data.map((user: any) => ({
        ...user,
        // 如果没有 approvalStatus 字段，根据用户名设置默认值
        approvalStatus: user.approvalStatus || (user.username === 'admin' ? 'approved' : 'pending'),
        // 确保必需字段有默认值（防御性编程）
        name: user.name || user.username || '未命名用户',
        username: user.username || 'unknown',
        phone: user.phone || '',
        email: user.email || '',
        department: user.department || '',
        role: user.role || '普通用户',
        createdAt: user.createdAt || new Date().toISOString()
      })) as PendingUser[];
      
      // 客户端排序：按创建时间倒序
      allUsers.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // 降序：新的在前
      });
      
      console.log('🔄 [用户审核] 排序后的用户列表:', allUsers.map(u => ({
        username: u.username,
        approvalStatus: u.approvalStatus,
        createdAt: u.createdAt
      })));
      
      // 计算统计数据
      const stats = {
        all: allUsers.length,
        pending: allUsers.filter(u => u.approvalStatus === 'pending').length,
        approved: allUsers.filter(u => u.approvalStatus === 'approved').length,
        rejected: allUsers.filter(u => u.approvalStatus === 'rejected').length
      };
      setAllUsersStats(stats);
      console.log('📈 用户统计:', stats);
      
      // 通知父组件待审核数量
      onPendingCountChange?.(stats.pending);
      
      // 根据筛选条件过滤
      if (filter !== 'all') {
        allUsers = allUsers.filter(user => user.approvalStatus === filter);
      }
      
      console.log('✅ 最终显示用户数量:', allUsers.length);
      setUsers(allUsers);
      
    } catch (error: any) {
      console.error('❌ 加载用户列表失败:', error);
      await showError(`加载用户列表失败: ${error.message || '未知错误'}\n\n请检查:\n1. CloudBase环境是否正确初始化\n2. 数据库权限是否配置\n3. users集合是否存在\n\n如果数据库为空，请使用初始化工具添加测试数据`);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (user: PendingUser) => {
    // ✅ 移除审核确认提示
    try {
      // 1. 更新数据库状态
      await db.collection('users').doc(user._id).update({
        approvalStatus: 'approved',
        approvedBy: currentUser.userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      });

      // 2. 发送短信通知
      if (user.phone) {
        console.log(`📱 正在向 ${user.phone} 发送审核通过通知...`);
        const smsResult = await sendApprovalSuccessSms(user.phone, user.name);
        
        if (smsResult.success) {
          console.log('✓ 短信通知发送成功');
          await showSuccess(`审核通过成功！\n\n已向用户 ${user.phone} 发送短信通知。`);
        } else {
          console.warn('短信通知发送失败:', smsResult.message);
          await showWarning(`审核通过成功！\n\n⚠️ 但短信通知发送失败：${smsResult.message}`);
        }
      } else {
        await showWarning('审核通过成功！\n\n⚠️ 用户未提供手机号，无法发送短信通知。');
      }

      loadUsers();
    } catch (error) {
      console.error('审核通过失败:', error);
      await showError('审核通过失败，请重试');
    }
  };

  const handleReject = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedUser) return;

    if (!rejectReason.trim()) {
      await showAlert('请填写拒绝原因', 'warning');
      return;
    }

    try {
      const reason = rejectReason.trim();
      
      // 1. 更新数据库状态
      await db.collection('users').doc(selectedUser._id).update({
        approvalStatus: 'rejected',
        approvedBy: currentUser.userId,
        approvedAt: new Date(),
        rejectReason: reason,
        updatedAt: new Date()
      });

      // 2. 发送短信通知
      if (selectedUser.phone) {
        console.log(`📱 正在向 ${selectedUser.phone} 发送审核拒绝通知...`);
        const smsResult = await sendApprovalRejectSms(
          selectedUser.phone, 
          selectedUser.name, 
          reason
        );
        
        if (smsResult.success) {
          console.log('✓ 短信通知发送成功');
          await showSuccess(`审核拒绝成功！\n\n已向用户 ${selectedUser.phone} 发送短信通知。`);
        } else {
          console.warn('短信通知发送失败:', smsResult.message);
          await showWarning(`审核拒绝成功！\n\n⚠️ 但短信通知发送失败：${smsResult.message}`);
        }
      } else {
        await showWarning('审核拒绝成功！\n\n⚠️ 用户未提供手机号，无法发送短信通知。');
      }

      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectReason('');
      loadUsers();
    } catch (error) {
      console.error('审核拒绝失败:', error);
      await showError('审核拒绝失败，请重试');
    }
  };

  const handleDelete = async (user: PendingUser) => {
    // 防止删除admin用户
    if (user.username === 'admin') {
      await showAlert('无法删除管理员账号', 'error');
      return;
    }

    const confirmed = await showConfirm(
      `确认删除用户吗？\n\n` +
      `用户名: ${user.username}\n` +
      `姓名: ${user.name}\n` +
      `手机号: ${user.phone || '未填写'}\n\n` +
      `此操作不可恢复！`
    );

    if (!confirmed) return;

    try {
      // 调用云函数删除用户
      const res = await app.callFunction({
        name: 'user-management',
        data: {
          action: 'delete',
          userId: user._id
        }
      });

      if (!res.result.success) {
        throw new Error(res.result.message || '删除失败');
      }

      await showSuccess(res.result.message || `用户 ${user.name} (@${user.username}) 已删除`);
      loadUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      await showError(error instanceof Error ? error.message : '删除用户失败，请重试');
    }
  };

  // 搜索过滤
  const filteredUsers = users.filter(user => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      user.username.toLowerCase().includes(keyword) ||
      user.name.toLowerCase().includes(keyword) ||
      user.phone.includes(keyword)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
            <Clock className="w-4 h-4" />
            待审核
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            已通过
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium">
            <XCircle className="w-4 h-4" />
            已拒绝
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* 标题栏 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">用户审核管理</h2>
        <p className="text-gray-600 mt-1">查看和审核系统注册用户</p>
      </div>

      {/* 筛选和搜索区 */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6 p-6">
        <div className="flex items-center gap-6">
          
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="搜索用户名、姓名、手机号..."
              />
            </div>
          </div>
          
          {/* 状态筛选 - 单行 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
              <input 
                type="radio" 
                name="status" 
                checked={filter === 'all'}
                onChange={() => setFilter('all')} 
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 whitespace-nowrap">
                全部 <span className="text-gray-400">({allUsersStats.all})</span>
              </span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-orange-50">
              <input 
                type="radio" 
                name="status" 
                checked={filter === 'pending'}
                onChange={() => setFilter('pending')} 
                className="text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-orange-600 whitespace-nowrap">
                待审核 <span className="font-semibold">({allUsersStats.pending})</span>
              </span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-green-50">
              <input 
                type="radio" 
                name="status" 
                checked={filter === 'approved'}
                onChange={() => setFilter('approved')} 
                className="text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-green-600 whitespace-nowrap">
                已通过 ({allUsersStats.approved})
              </span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-red-50">
              <input 
                type="radio" 
                name="status" 
                checked={filter === 'rejected'}
                onChange={() => setFilter('rejected')} 
                className="text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-red-600 whitespace-nowrap">
                已拒绝 ({allUsersStats.rejected})
              </span>
            </label>
          </div>
          
        </div>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">加载中...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">暂无用户数据</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 font-medium">用户列表</h3>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  共 <span className="font-medium text-gray-900">{filteredUsers.length}</span> 个用户
                </div>
                <button 
                  onClick={loadUsers}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  刷新
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">用户信息</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">注册时间</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">审核状态</th>
                  <th className="px-6 py-3 text-center text-sm text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">{filteredUsers.map((user) => {
                  // 头像颜色
                  const avatarColors = [
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  ];
                  const colorIndex = parseInt(user._id.slice(-1), 16) % avatarColors.length;
                  
                  return (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: avatarColors[colorIndex] }}
                          >
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            {user.username === 'admin' && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                管理员
                              </span>
                            )}
                            {user.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                        {user.lastLoginAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            上次登录: {new Date(user.lastLoginAt).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(user.approvalStatus)}
                        {user.rejectReason && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs">
                            原因：{user.rejectReason}
                          </div>
                        )}
                        {user.approvedAt && user.approvalStatus === 'approved' && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(user.approvedAt).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.approvalStatus === 'pending' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApprove(user)}
                              className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="审核通过后将发送短信通知"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(user)}
                              className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="审核拒绝后将发送短信通知"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              title="删除用户（不可恢复）"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {user.approvalStatus === 'approved' && user.username !== 'admin' && (
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDelete(user)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              title="删除用户（不可恢复）"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {user.approvalStatus === 'rejected' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApprove(user)}
                              className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              title="重新审核通过"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              title="删除用户（不可恢复）"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {user.username === 'admin' && (
                          <div className="text-center">
                            <span className="text-sm text-gray-400">--</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* 分页 */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              显示 <span className="font-medium">1-{filteredUsers.length}</span> / <span className="font-medium">{filteredUsers.length}</span>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                上一页
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                下一页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">拒绝注册申请</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                用户: <span className="font-bold text-blue-600">{selectedUser.name}</span> (@{selectedUser.username})
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请填写拒绝原因: <span className="text-red-600">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="例如: 信息不完整、部门不匹配等"
                required
              />
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mt-3">
                <Bell className="w-5 h-5" />
                <span>拒绝后将发送短信通知用户</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedUser(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmReject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
