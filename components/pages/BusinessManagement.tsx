import { useState } from 'react';
import { Briefcase } from 'lucide-react';

interface BusinessManagementProps {
  userRole: 'admin' | 'employee';
  currentUser: any;
}

export function BusinessManagement({ userRole, currentUser }: BusinessManagementProps) {
  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">业务管理</h1>
              <p className="text-gray-500 mt-1">Business Management</p>
            </div>
          </div>
        </div>

        {/* 功能区域 - 待开发 */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-12 h-12 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">业务管理功能</h2>
            <p className="text-gray-600 mb-6">
              该模块将提供业务流程、客户关系、合同管理等功能
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-orange-50 text-orange-700 rounded-lg font-medium">
              🚧 功能开发中...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
