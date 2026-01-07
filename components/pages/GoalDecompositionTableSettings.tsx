import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import DecompositionDimensionSettings from '../DecompositionDimensionSettings';
import DecompositionTableConfigManager from '../DecompositionTableConfigManager';

const GoalDecompositionTableSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'tables'>('dimensions');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">分解表设置</h1>
          </div>
          <p className="text-sm text-gray-600">
            配置目标分解表的维度参数、分解项等
          </p>
        </div>

        {/* Tab栏 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dimensions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'dimensions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              维度参数设置
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'tables'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              分解表配置
            </button>
          </div>
        </div>

        {/* Tab内容 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'dimensions' && <DecompositionDimensionSettings />}
          {activeTab === 'tables' && <DecompositionTableConfigManager />}
        </div>
      </div>
    </div>
  );
};

export default GoalDecompositionTableSettings;
