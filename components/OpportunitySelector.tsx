import { useState, useEffect } from 'react';
import { Search, X, CheckCircle } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Opportunity, OpportunityStage } from '../types/opportunity';

interface OpportunitySelectorProps {
  selectedId?: string;
  onSelect: (opportunityId: string, opportunityName: string) => void;
  onClose: () => void;
}

export default function OpportunitySelector({ selectedId, onSelect, onClose }: OpportunitySelectorProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);

  useEffect(() => {
    loadOpportunityStages();
    loadOpportunities();
  }, []);

  // 加载商机阶段
  const loadOpportunityStages = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      if (result.data && result.data.length > 0) {
        // 支持旧格式（string[]）和新格式（TypeItem[]）
        const values = result.data[0].values;
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            setOpportunityStages(values);
          } else {
            setOpportunityStages(values.filter((item: any) => item.enabled).map((item: any) => item.value));
          }
        }
      }
    } catch (error) {
      console.error('加载商机阶段失败:', error);
      setOpportunityStages(['跟进线索', '方案咨询', '商务谈判']);
    }
  };

  // 加载商机列表
  const loadOpportunities = async () => {
    setLoading(true);
    try {
      // 获取当前用户
      const currentUserStr = localStorage.getItem('current_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
      console.log('🔍 [OpportunitySelector] 当前用户:', currentUser);
      
      // 查询所有商机（不限制阶段，由用户通过筛选器选择）
      const query = db.collection('opportunities')
        .orderBy('updatedAt', 'desc');

      const { data } = await query.get();
      console.log('🔍 [OpportunitySelector] 查询到的商机:', data);

      // 权限过滤：只显示用户有查询权限的商机
      let filteredData = data;
      const userId = currentUser.userId || currentUser._id;
      const userRoles = currentUser.roles || [];
      const isAdmin = userRoles.includes('admin') || currentUser.role === 'admin';
      console.log('🔍 [OpportunitySelector] 用户ID:', userId, '是否管理员:', isAdmin);
      
      if (!isAdmin) {
        filteredData = data.filter((opp: any) => {
          // 负责人或协同人可查看
          return opp.owner === userId || 
                 (opp.collaborators && opp.collaborators.includes(userId)) ||
                 opp.isPublic === true;
        });
      }
      console.log('🔍 [OpportunitySelector] 过滤后的商机:', filteredData);

      // 关联查询负责人信息
      const enrichedData = await Promise.all(
        filteredData.map(async (opp: any) => {
          try {
            let ownerName = '未知';
            if (opp.owner) {
              const ownerRes = await db.collection('users').where({ _id: opp.owner }).get();
              if (ownerRes.data && ownerRes.data.length > 0) {
                ownerName = ownerRes.data[0].name;
              }
            }
            return { ...opp, ownerName };
          } catch (error) {
            return { ...opp, ownerName: '未知' };
          }
        })
      );

      setOpportunities(enrichedData);
    } catch (error) {
      console.error('加载商机列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选后的商机列表
  const filteredOpportunities = opportunities.filter(opp => {
    // 阶段筛选
    if (stageFilter !== 'all' && opp.stage !== stageFilter) return false;
    
    // 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        opp.name.toLowerCase().includes(keyword) ||
        opp.customer.toLowerCase().includes(keyword) ||
        opp.contactPerson.toLowerCase().includes(keyword)
      );
    }
    
    return true;
  });

  const handleSelect = (opp: Opportunity) => {
    onSelect(opp._id, opp.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">选择商机</h3>
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
                placeholder="搜索商机名称、客户名称、联系人..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 阶段筛选 */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as OpportunityStage | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部阶段</option>
              {opportunityStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 商机列表 */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">没有找到匹配的商机</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredOpportunities.map((opp) => (
                <button
                  key={opp._id}
                  onClick={() => handleSelect(opp)}
                  className={`w-full text-left p-4 border rounded-lg transition-all ${
                    selectedId === opp._id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{opp.name}</span>
                        {selectedId === opp._id && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>客户：{opp.customer}</div>
                        <div>联系人：{opp.contactPerson}</div>
                        <div>阶段：
                          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                            {opp.stage}
                          </span>
                        </div>
                        <div>级别：
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            opp.level === '重点' ? 'bg-red-100 text-red-800' :
                            opp.level === '一般' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {opp.level}
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
