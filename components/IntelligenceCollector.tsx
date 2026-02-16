import { useState } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle, Globe, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { db } from '../lib/cloudbase';
import type { 
  IntelligenceSearchRequest, 
  IntelligenceSearchResult,
  IntelligenceType,
  CustomerIntelligence,
  CreateIntelligenceDto
} from '../types/customer-intelligence';
import { 
  getIntelligenceTypeName, 
  getIntelligenceTypeColor,
  getReliabilityLevel 
} from '../types/customer-intelligence';

interface IntelligenceCollectorProps {
  customerName: string;
  opportunityId?: string;
  customerId?: string;
  currentUserId: string;
  onSuccess?: () => void;
}

export default function IntelligenceCollector({ 
  customerName, 
  opportunityId, 
  customerId,
  currentUserId,
  onSuccess 
}: IntelligenceCollectorProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IntelligenceSearchResult[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<IntelligenceType[]>([
    'company_background',
    'business_status',
    'industry_trends'
  ]);
  const [customQuery, setCustomQuery] = useState('');
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // 可选的情报类型
  const intelligenceTypes: { value: IntelligenceType; label: string }[] = [
    { value: 'company_background', label: '公司背景' },
    { value: 'business_status', label: '经营状况' },
    { value: 'industry_trends', label: '行业动态' },
    { value: 'competitor_info', label: '竞争对手信息' },
    { value: 'key_persons', label: '关键人物' },
    { value: 'risk_warning', label: '风险预警' },
  ];

  // 切换选择的情报类型
  const toggleType = (type: IntelligenceType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // 执行情报采集
  const handleCollect = async () => {
    if (selectedTypes.length === 0) {
      alert('请至少选择一种情报类型');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSavedIds(new Set());

    try {
      // 调用云函数进行网络搜索
      const result = await db.callFunction({
        name: 'intelligence-collector',
        data: {
          action: 'search',
          customerName,
          types: selectedTypes,
          customQuery: customQuery || undefined,
          maxResults: 10
        }
      });

      console.log('情报采集结果:', result);

      if (result.result && result.result.success) {
        setSearchResults(result.result.data || []);
      } else {
        throw new Error(result.result?.error || '采集失败');
      }
    } catch (error: any) {
      console.error('情报采集失败:', error);
      alert(`采集失败: ${error.message || '未知错误'}`);
    } finally {
      setIsSearching(false);
    }
  };

  // 保存单条情报到数据库
  const handleSaveIntelligence = async (result: IntelligenceSearchResult, index: number) => {
    setSavingIds(prev => new Set([...prev, index]));

    try {
      const intelligenceData: CreateIntelligenceDto = {
        customerName,
        customerId,
        opportunityId,
        type: result.type,
        source: 'web_search',
        title: result.title,
        content: result.content,
        summary: result.summary,
        keywords: result.keywords,
        sourceUrl: result.sourceUrl,
        reliability: result.reliability,
      };

      // 调用云函数保存情报
      const saveResult = await db.callFunction({
        name: 'intelligence-collector',
        data: {
          action: 'save',
          intelligence: intelligenceData,
          userId: currentUserId
        }
      });

      if (saveResult.result && saveResult.result.success) {
        setSavedIds(prev => new Set([...prev, index]));
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(saveResult.result?.error || '保存失败');
      }
    } catch (error: any) {
      console.error('保存情报失败:', error);
      alert(`保存失败: ${error.message || '未知错误'}`);
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // 批量保存所有情报
  const handleSaveAll = async () => {
    for (let i = 0; i < searchResults.length; i++) {
      if (!savedIds.has(i)) {
        await handleSaveIntelligence(searchResults[i], i);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            互联网情报采集
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 客户名称显示 */}
          <div>
            <label className="text-sm font-medium text-gray-700">目标客户</label>
            <div className="mt-1 text-base font-semibold text-blue-600">
              {customerName}
            </div>
          </div>

          {/* 情报类型选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              选择情报类型
            </label>
            <div className="flex flex-wrap gap-2">
              {intelligenceTypes.map(type => (
                <Badge
                  key={type.value}
                  className={`cursor-pointer transition-all ${
                    selectedTypes.includes(type.value)
                      ? getIntelligenceTypeColor(type.value)
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  onClick={() => toggleType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* 自定义搜索关键词 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              自定义关键词（可选）
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：最新动态、合作伙伴、产品信息..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
            />
          </div>

          {/* 采集按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleCollect}
              disabled={isSearching || selectedTypes.length === 0}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  采集中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  开始采集
                </>
              )}
            </Button>

            {searchResults.length > 0 && (
              <Button
                onClick={handleSaveAll}
                variant="outline"
                disabled={savedIds.size === searchResults.length}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                批量保存全部
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            采集结果 ({searchResults.length} 条)
          </h3>
          {searchResults.map((result, index) => {
            const isSaving = savingIds.has(index);
            const isSaved = savedIds.has(index);
            const reliabilityInfo = getReliabilityLevel(result.reliability);

            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      {/* 标题和类型 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">
                          {result.title}
                        </h4>
                        <Badge className={getIntelligenceTypeColor(result.type)}>
                          {getIntelligenceTypeName(result.type)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-gray-500">可靠度:</span>
                          <span className={`font-semibold ${reliabilityInfo.color}`}>
                            {result.reliability}分 ({reliabilityInfo.level})
                          </span>
                        </div>
                      </div>

                      {/* 摘要 */}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.summary}
                      </p>

                      {/* 关键词 */}
                      {result.keywords && result.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.keywords.map((keyword, kidx) => (
                            <span
                              key={kidx}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 来源链接 */}
                      {result.sourceUrl && (
                        <a
                          href={result.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          查看来源
                        </a>
                      )}
                    </div>

                    {/* 保存按钮 */}
                    <div>
                      {isSaved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600"
                          disabled
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          已保存
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSaveIntelligence(result, index)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              保存中
                            </>
                          ) : (
                            '保存'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 空状态提示 */}
      {!isSearching && searchResults.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>选择情报类型并点击"开始采集"以获取客户情报</p>
        </div>
      )}
    </div>
  );
}
