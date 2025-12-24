import { useState, useEffect } from 'react';
import { X, Search, Check, Users } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface User {
  _id: string;
  name: string;
  username: string;
  department?: string;
  avatar?: string;
}

interface CollaboratorSelectorProps {
  selectedIds: string[];
  excludeIds?: string[];
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export default function CollaboratorSelector({ 
  selectedIds, 
  excludeIds = [],
  onConfirm, 
  onClose 
}: CollaboratorSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { db } = await import('../lib/cloudbase');
      
      const result = await db.collection('users')
        .where({
          isActive: true,
          approvalStatus: 'approved'
        })
        .get();
      
      if (result.data) {
        // 过滤掉被排除的用户（如负责人）
        const filteredUsers = result.data.filter(
          (user: any) => !excludeIds.includes(user._id)
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      user.name.toLowerCase().includes(keyword) ||
      user.username.toLowerCase().includes(keyword) ||
      user.department?.toLowerCase().includes(keyword)
    );
  });

  const toggleUser = (userId: string) => {
    if (tempSelected.includes(userId)) {
      setTempSelected(tempSelected.filter(id => id !== userId));
    } else {
      setTempSelected([...tempSelected, userId]);
    }
  };

  const handleConfirm = () => {
    onConfirm(tempSelected);
    onClose();
  };

  const handleSelectAll = () => {
    setTempSelected(filteredUsers.map(u => u._id));
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">选择协同人</h3>
                <p className="text-sm text-gray-600">
                  已选择 <span className="font-medium text-blue-600">{tempSelected.length}</span> 人
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索姓名、用户名或部门..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              全选
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              清空
            </button>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">加载中...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">未找到符合条件的用户</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredUsers.map((user) => {
                const isSelected = tempSelected.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUser(user._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* 复选框 */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* 用户头像 */}
                    <UserAvatar user={user} size="md" />

                    {/* 用户信息 */}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        {user.username} {user.department && `· ${user.department}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {tempSelected.length > 0 ? (
                <span>
                  已选择 <span className="font-medium text-blue-600">{tempSelected.length}</span> 位协同人
                </span>
              ) : (
                <span className="text-gray-400">未选择协同人</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
