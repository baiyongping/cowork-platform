// Mock数据演示组件 - 用于离线预览UI效果
import { useState } from 'react';
import OpportunityDetailModal from './OpportunityDetailModal';
import { mockOpportunity } from '../mocks/opportunityMockData';

export default function OpportunityDetailMockDemo() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            商机详情页面 UI 演示
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            使用Mock数据预览优化后的界面效果
          </p>
          <p className="text-sm text-gray-500">
            (无需网络连接,纯前端演示)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          🎯 点击查看商机详情
        </button>

        <div className="mt-12 grid grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="text-3xl mb-2">✨</div>
            <div className="text-sm font-semibold text-gray-900 mb-2">现代化设计</div>
            <div className="text-xs text-gray-600">渐变色 + 圆角 + 阴影</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-sm font-semibold text-gray-900 mb-2">流畅交互</div>
            <div className="text-xs text-gray-600">悬停动效 + 过渡动画</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm font-semibold text-gray-900 mb-2">信息清晰</div>
            <div className="text-xs text-gray-600">层次分明 + 重点突出</div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 mb-2">演示说明</div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 本页面使用Mock数据,无需连接CloudBase</li>
                <li>• 所有UI交互和动效完全可用</li>
                <li>• 适合用于UI演示、截图、培训等场景</li>
                <li>• 数据修改不会保存(仅前端展示)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>优化版本: v2.0 | 优化日期: 2025-12-13</p>
        </div>
      </div>

      {/* 商机详情Modal */}
      {showModal && (
        <OpportunityDetailModal
          opportunity={mockOpportunity as any}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            console.log('Mock模式: 数据刷新 (无实际操作)');
          }}
        />
      )}
    </div>
  );
}
