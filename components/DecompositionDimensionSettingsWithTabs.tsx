import React, { useState } from 'react';
import { Settings, Table } from 'lucide-react';
import DecompositionDimensionSettings from './DecompositionDimensionSettings';
import DecompositionTablesTab from './DecompositionTablesTab';

/**
 * 维度设置 - 带子Tab的版本
 * 子Tab 1: 分解维度参数设置
 * 子Tab 2: 分解表构建
 */
const DecompositionDimensionSettingsWithTabs: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dimensions' | 'tables'>('dimensions');

  return (
    <div className="space-y-4">
      {/* 子Tab导航 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('dimensions')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors relative ${
            activeSubTab === 'dimensions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          分解维度参数设置
        </button>
        <button
          onClick={() => setActiveSubTab('tables')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors relative ${
            activeSubTab === 'tables'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Table className="w-4 h-4" />
          分解表构建
        </button>
      </div>

      {/* 子Tab内容 */}
      <div className="pt-4">
        {activeSubTab === 'dimensions' && <DecompositionDimensionSettings />}
        {activeSubTab === 'tables' && <DecompositionTablesTab />}
      </div>
    </div>
  );
};

export default DecompositionDimensionSettingsWithTabs;
