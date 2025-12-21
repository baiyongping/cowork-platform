import { useState, useEffect } from 'react';
import { X, Search, RotateCcw, Trash2, Calendar, DollarSign, Users } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Opportunity } from '../types/opportunity';
import OpportunityRecycleBinDetail from './OpportunityRecycleBinDetail';
import { getOpportunityStageColor, getOpportunityLevelColor } from '../types/opportunity';

interface OpportunityRecycleBinProps {
  onClose: () => void;
  onRestore: () => void;
}

export default function OpportunityRecycleBin({ onClose, onRestore }: OpportunityRecycleBinProps) {
  const [deletedOpportunities, setDeletedOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);

  useEffect(() => {
    loadDeletedOpportunities();
    loadOpportunityStages();
  }, []);

  // 加载商机阶段设置
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
      console.error('加载商机阶段设置失败:', error);
      setOpportunityStages(['跟进线索', '方案咨询', '商务谈判']);
    }
  };

  useEffect(() => {
    // 根据关键词过滤
    if (keyword.trim()) {
      const filtered = deletedOpportunities.filter(opp =>
        opp.name.toLowerCase().includes(keyword.toLowerCase()) ||
        opp.customer.toLowerCase().includes(keyword.toLowerCase()) ||
        (opp.ownerName && opp.ownerName.toLowerCase().includes(keyword.toLowerCase()))
      );
      setFilteredOpportunities(filtered);
    } else {
      setFilteredOpportunities(deletedOpportunities);
    }
  }, [keyword, deletedOpportunities]);

  const loadDeletedOpportunities = async () => {
    try {
      setLoading(true);

      // 查询已删除的商机
      const result = await db.collection('opportunities')
        .where({
          isDeleted: true
        })
        .orderBy('deletedAt', 'desc')
        .get();

      // 获取所有用户ID
      const userIds = new Set<string>();
      result.data.forEach((opp: any) => {
        if (opp.owner) userIds.add(opp.owner);
        if (opp.collaborators) {
          opp.collaborators.forEach((id: string) => userIds.add(id));
        }
      });

      // 批量查询用户信息
      let usersMap = new Map();
      if (userIds.size > 0) {
        const usersResult = await db.collection('users')
          .where({
            _id: db.command.in(Array.from(userIds))
          })
          .get();
        
        usersResult.data.forEach((user: any) => {
          usersMap.set(user._id, user);
        });
      }

      // 组装数据
      const opportunitiesWithUsers = result.data.map((opp: any) => ({
        ...opp,
        ownerName: usersMap.get(opp.owner)?.name || '未知用户',
        collaboratorNames: opp.collaborators?.map((id: string) => 
          usersMap.get(id)?.name || '未知用户'
        ) || []
      }));

      setDeletedOpportunities(opportunitiesWithUsers);
    } catch (error) {
      console.error('加载回收站商机失败:', error);
      alert('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开详情
  const handleOpenDetail = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setSelectedOpportunity(null);
  };

  // 处理恢复或删除成功
  const handleSuccess = () => {
    loadDeletedOpportunities();
    setSelectedOpportunity(null);
    onRestore();
  };

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN');
  };

  // 格式化金额
  const formatAmount = (amount?: number): string => {
    if (!amount || isNaN(amount)) return '0.00';
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* 头部 */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">商机回收站</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  已删除的商机 ({filteredOpportunities.length})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 搜索栏 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索商机名称、客户名称或负责人..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 商机列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Trash2 className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  {keyword ? '未找到匹配的商机' : '回收站为空'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp._id}
                    onClick={() => handleOpenDetail(opp)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      {/* 左侧：商机信息 */}
                      <div className="flex-1 space-y-2">
                        {/* 第一行：商机名称和标签 */}
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-medium text-gray-900">{opp.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOpportunityStageColor(opp.stage, opportunityStages)}`}>
                            {opp.stage}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOpportunityLevelColor(opp.level)}`}>
                            {opp.level}
                          </span>
                        </div>

                        {/* 第二行：客户信息 */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {opp.customer}
                          </span>
                          <span>产品：{opp.productType}</span>
                          <span>负责人：{opp.ownerName}</span>
                        </div>

                        {/* 第三行：删除时间 */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          删除时间：{formatDate(opp.deletedAt || '')}
                        </div>
                      </div>

                      {/* 右侧：金额 */}
                      <div className="ml-6 text-right">
                        <div className="text-sm text-gray-500">预计金额</div>
                        <div className="text-lg font-bold text-blue-600">{formatAmount(opp.estimatedAmount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              点击商机可查看详情并选择恢复或永久删除
            </p>
          </div>
        </div>
      </div>

      {/* 商机详情（恢复/永久删除） */}
      {selectedOpportunity && (
        <OpportunityRecycleBinDetail
          opportunity={selectedOpportunity}
          onClose={handleCloseDetail}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
