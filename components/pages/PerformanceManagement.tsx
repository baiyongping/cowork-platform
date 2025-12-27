import { useState } from 'react';
import { Award } from 'lucide-react';

interface PerformanceManagementProps {
  userRole: 'admin' | 'employee';
  currentUser: any;
}

export function PerformanceManagement({ userRole, currentUser }: PerformanceManagementProps) {
  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">绩效管理</h1>
              <p className="text-gray-500 mt-1">Performance Management</p>
            </div>
          </div>
        </div>

        {/* 功能区域 - 待开发 */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">绩效管理功能</h2>
            <p className="text-gray-600 mb-6">
              该模块将提供绩效考核、评估、激励等功能
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-purple-50 text-purple-700 rounded-lg font-medium">
              🚧 功能开发中...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
