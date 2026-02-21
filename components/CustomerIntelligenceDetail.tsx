import { useState, useEffect } from 'react';
import { FileText, Globe, Calendar, User, Tag, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading';
import { db } from '../lib/cloudbase';
import type { CustomerIntelligence } from '../types/customer-intelligence';
import {
  getIntelligenceTypeName,
  getIntelligenceTypeColor,
  getIntelligenceSourceName,
  getReliabilityLevel
} from '../types/customer-intelligence';

interface CustomerIntelligenceDetailProps {
  opportunityId?: string;
  customerId?: string;
  customerName?: string;
  currentUserId: string;
  onClose?: () => void;
}

export default function CustomerIntelligenceDetail({
  opportunityId,
  customerId,
  customerName,
  currentUserId,
  onClose
}: CustomerIntelligenceDetailProps) {
  const [intelligenceList, setIntelligenceList] = useState<CustomerIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 加载情报列表
  useEffect(() => {
    loadIntelligence();
  }, [opportunityId, customerId, selectedType]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);

      const filters: any = {};
      
      if (opportunityId) {
        filters.opportunityId = opportunityId;
      }
      
      if (customerId) {
        filters.customerId = customerId;
      }
      
      if (selectedType !== 'all') {
        filters.type = selectedType;
      }

      const result = await db.callFunction({
        name: 'intelligence-collector',
        data: {
          action: 'list',
          filters
        }
      });

      console.log('情报列表查询结果:', result);

      if (result.result && result.result.success) {
        setIntelligenceList(result.result.data.list || []);
      } else {
        throw new Error(result.result?.error || '加载失败');
      }
    } catch (error: any) {
      console.error('加载情报失败:', error);
      alert(`加载失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除情报
  const handleDelete = async (intelligenceId: string) => {
    if (!confirm('确定要删除这条情报吗？')) {
      return;
    }

    setDeletingId(intelligenceId);

    try {
      const result = await db.callFunction({
        name: 'intelligence-collector',
        data: {
          action: 'delete',
          intelligenceId
        }
      });

      if (result.result && result.result.success) {
        // 从列表中移除
        setIntelligenceList(prev => prev.filter(item => item._id !== intelligenceId));
      } else {
        throw new Error(result.result?.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除情报失败:', error);
      alert(`删除失败: ${error.message || '未知错误'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // 格式化日期
  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 情报类型选项
  const typeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'company_background', label: '公司背景' },
    { value: 'business_status', label: '经营状况' },
    { value: 'industry_trends', label: '行业动态' },
    { value: 'competitor_info', label: '竞争对手' },
    { value: 'key_persons', label: '关键人物' },
    { value: 'risk_warning', label: '风险预警' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">客户情报</h3>
          {customerName && (
            <p className="text-sm text-gray-500 mt-1">
              {customerName} - 共 {intelligenceList.length} 条情报
            </p>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-2">
        {typeOptions.map(option => (
          <Badge
            key={option.value}
            className={`cursor-pointer transition-all ${
              selectedType === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedType(option.value)}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      {/* 情报列表 */}
      {intelligenceList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无情报数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {intelligenceList.map(intelligence => {
            const reliabilityInfo = getReliabilityLevel(intelligence.reliability || 0);
            const isDeleting = deletingId === intelligence._id;

            return (
              <Card key={intelligence._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {intelligence.title}
                          </h4>
                          <Badge className={getIntelligenceTypeColor(intelligence.type)}>
                            {getIntelligenceTypeName(intelligence.type)}
                          </Badge>
                        </div>
                        
                        {/* 摘要 */}
                        {intelligence.summary && (
                          <p className="text-sm text-gray-600 mb-2">
                            {intelligence.summary}
                          </p>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(intelligence._id)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 详细内容 */}
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {intelligence.content}
                    </div>

                    {/* 关键词 */}
                    {intelligence.keywords && intelligence.keywords.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-4 h-4 text-gray-400" />
                        {intelligence.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 元信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-2">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {getIntelligenceSourceName(intelligence.source)}
                      </div>
                      
                      {intelligence.reliability !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>可靠度:</span>
                          <span className={`font-semibold ${reliabilityInfo.color}`}>
                            {intelligence.reliability}分 ({reliabilityInfo.level})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(intelligence.createdAt)}
                      </div>

                      {intelligence.sourceUrl && (
                        <a
                          href={intelligence.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          查看来源
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
