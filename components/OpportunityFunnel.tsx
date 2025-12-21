import { useState } from 'react';

interface FunnelData {
  stage: string;
  count: number;
  amount: number;
  color: string;
}

interface OpportunityFunnelProps {
  data: FunnelData[];
  totalTarget: number;
  totalActual: number;
  newThisQuarter: number;
  closedCount: number;
  failedCount: number;
  onStageClick?: (stage: string) => void;
}

export function OpportunityFunnel({
  data,
  totalTarget,
  totalActual,
  newThisQuarter,
  closedCount,
  failedCount,
  onStageClick
}: OpportunityFunnelProps) {
  const successRate = closedCount + failedCount > 0 
    ? Math.round((closedCount / (closedCount + failedCount)) * 100)
    : 0;
  
  const completionRate = totalTarget > 0
    ? Math.round((totalActual / totalTarget) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* 商机挖掘进度 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">待挖掘商机</span>
          <span className="text-sm text-gray-900">{totalActual}/{totalTarget}个</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>完成率: {completionRate}%</span>
          <span>本季度新增: {newThisQuarter}个</span>
        </div>
      </div>

      {/* 漏斗图 - 不可点击 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="space-y-2">
          {data.map((item, index) => {
            const maxWidth = 100;
            const widthPercent = maxWidth - (index * 15);
            
            return (
              <div key={item.stage} className="flex flex-col items-center">
                <div
                  className="w-full pointer-events-none"
                  style={{ width: `${widthPercent}%` }}
                >
                  <div
                    className={`rounded-lg p-3 text-white ${
                      item.color === '#60a5fa' ? 'bg-blue-400' :
                      item.color === '#3b82f6' ? 'bg-blue-600' :
                      'bg-blue-700'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm mb-1">{item.stage}</div>
                      <div className="flex items-center justify-center gap-4 text-xs">
                        <span>{item.count}个</span>
                        <span>|</span>
                        <span>{(item.amount / 10000).toFixed(0)}万元</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg text-green-600">{closedCount}</div>
            <div className="text-xs text-gray-600">已成交</div>
          </div>
          <div>
            <div className="text-lg text-red-600">{failedCount}</div>
            <div className="text-xs text-gray-600">已失败</div>
          </div>
          <div>
            <div className="text-lg text-blue-600">{successRate}%</div>
            <div className="text-xs text-gray-600">成功率</div>
          </div>
        </div>
      </div>
    </div>
  );
}
