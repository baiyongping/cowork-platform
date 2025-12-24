import { useState, useEffect } from 'react';
import { Search, X, CheckCircle } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Project, ProjectStatus } from '../types/project';

interface ProjectSelectorProps {
  selectedId?: string;
  onSelect: (projectId: string, projectName: string) => void;
  onClose: () => void;
}

export default function ProjectSelector({ selectedId, onSelect, onClose }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true);
    try {
      // 获取当前用户
      const currentUserStr = localStorage.getItem('current_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
      console.log('🔍 [ProjectSelector] 当前用户:', currentUser);
      
      // 查询所有项目（不限制状态，由用户通过筛选器选择）
      const query = db.collection('projects')
        .orderBy('updatedAt', 'desc');

      const { data } = await query.get();
      console.log('🔍 [ProjectSelector] 查询到的项目:', data);

      // 权限过滤：只显示用户有查询权限的项目
      let filteredData = data;
      const userId = currentUser.userId || currentUser._id;
      const userRoles = currentUser.roles || [];
      const isAdmin = userRoles.includes('admin') || currentUser.role === 'admin';
      console.log('🔍 [ProjectSelector] 用户ID:', userId, '是否管理员:', isAdmin);
      
      if (!isAdmin) {
        filteredData = data.filter((proj: any) => {
          // 负责人或协同人可查看
          return proj.owner === userId || 
                 (proj.members && proj.members.includes(userId)) ||
                 proj.isPublic === true;
        });
      }
      console.log('🔍 [ProjectSelector] 过滤后的项目:', filteredData);

      // 关联查询负责人信息
      const enrichedData = await Promise.all(
        filteredData.map(async (proj: any) => {
          try {
            let ownerName = '未知';
            if (proj.owner) {
              const ownerRes = await db.collection('users').where({ _id: proj.owner }).get();
              if (ownerRes.data && ownerRes.data.length > 0) {
                ownerName = ownerRes.data[0].name;
              }
            }
            return { ...proj, ownerName };
          } catch (error) {
            return { ...proj, ownerName: '未知' };
          }
        })
      );

      setProjects(enrichedData);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选后的项目列表
  const filteredProjects = projects.filter(proj => {
    // 状态筛选
    if (statusFilter !== 'all' && proj.status !== statusFilter) return false;
    
    // 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        proj.name.toLowerCase().includes(keyword) ||
        proj.code.toLowerCase().includes(keyword) ||
        proj.customer.toLowerCase().includes(keyword)
      );
    }
    
    return true;
  });

  const handleSelect = (proj: Project) => {
    onSelect(proj._id, proj.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">选择项目</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索项目名称、编号、客户..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="未开始">未开始</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
              <option value="暂停">暂停</option>
            </select>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">没有找到匹配的项目</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProjects.map((proj) => (
                <button
                  key={proj._id}
                  onClick={() => handleSelect(proj)}
                  className={`w-full text-left p-4 border rounded-lg transition-all ${
                    selectedId === proj._id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{proj.name}</span>
                        {selectedId === proj._id && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>编号：{proj.code}</div>
                        <div>客户：{proj.customer}</div>
                        <div>状态：
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            proj.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                            proj.status === '已完成' ? 'bg-green-100 text-green-800' :
                            proj.status === '已取消' ? 'bg-red-100 text-red-800' :
                            proj.status === '暂停' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {proj.status}
                          </span>
                        </div>
                        <div>类型：
                          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                            {proj.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
