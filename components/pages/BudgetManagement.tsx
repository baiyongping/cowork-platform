import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, Package, Calendar, Users, Settings, FileText, BarChart3,
  AlertCircle, CheckCircle, Clock
} from 'lucide-react';

const BudgetManagement: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTab, setSelectedTab] = useState<'execution' | 'annual' | 'asset' | 'cashFlow' | 'labor' | 'parameters' | 'sales'>('execution');

  // 年度选择器
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Tab配置
  const tabs = [
    { id: 'execution', label: '预算执行', icon: BarChart3 },
    { id: 'annual', label: '年度预算', icon: Calendar },
    { id: 'asset', label: '资产预算', icon: Package },
    { id: 'cashFlow', label: '现金流预测', icon: DollarSign },
    { id: 'labor', label: '人力费用预算', icon: Users },
    { id: 'parameters', label: '预算参数', icon: Settings },
    { id: 'sales', label: '产品销售预测', icon: TrendingUp }
  ];

  // 预算执行 - 指标卡片数据
  const executionMetrics = [
    { 
      title: '总预算', 
      value: '¥12,580,000', 
      subtitle: '年度预算总额',
      icon: DollarSign,
      color: 'blue'
    },
    { 
      title: '已执行', 
      value: '¥8,342,150', 
      subtitle: '执行率 66.3%',
      icon: TrendingUp,
      color: 'green'
    },
    { 
      title: '剩余预算', 
      value: '¥4,237,850', 
      subtitle: '剩余 33.7%',
      icon: Clock,
      color: 'yellow'
    },
    { 
      title: '预警项', 
      value: '3', 
      subtitle: '需要关注',
      icon: AlertCircle,
      color: 'red'
    }
  ];

  // 预算执行 - 科目执行数据
  const executionData = [
    { category: '研发费用', budget: 4500000, actual: 3200000, rate: 71.1, status: 'normal' },
    { category: '市场费用', budget: 2800000, actual: 2100000, rate: 75.0, status: 'normal' },
    { category: '人力成本', budget: 3200000, actual: 2400000, rate: 75.0, status: 'normal' },
    { category: '办公费用', budget: 1280000, actual: 642150, rate: 50.2, status: 'warning' },
    { category: '差旅费用', budget: 800000, actual: 1000000, rate: 125.0, status: 'danger' }
  ];

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'danger': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-50';
      case 'warning': return 'bg-yellow-50';
      case 'danger': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  // 渲染指标卡片
  const renderMetricCard = (metric: typeof executionMetrics[0]) => {
    const IconComponent = metric.icon;
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600'
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-3 rounded-lg ${colorClasses[metric.color]}`}>
            <IconComponent className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
          <div className="text-sm text-gray-500">{metric.title}</div>
          <div className="text-xs text-gray-400">{metric.subtitle}</div>
        </div>
      </div>
    );
  };

  // 渲染预算执行视图
  const renderExecutionView = () => (
    <div className="space-y-6">
      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {executionMetrics.map((metric, index) => (
          <div key={index}>
            {renderMetricCard(metric)}
          </div>
        ))}
      </div>

      {/* 预算执行表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">预算执行明细</h3>
          <p className="text-sm text-gray-500 mt-1">{selectedYear}年度各科目预算执行情况</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  预算科目
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  预算金额
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  实际支出
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  执行率
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  剩余预算
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {executionData.map((item, index) => {
                const remaining = item.budget - item.actual;
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                      ¥{item.budget.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                      ¥{item.actual.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold ${getStatusColor(item.status)}`}>
                      {item.rate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                      ¥{remaining.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBg(item.status)} ${getStatusColor(item.status)}`}>
                        {item.status === 'normal' && '正常'}
                        {item.status === 'warning' && '预警'}
                        {item.status === 'danger' && '超支'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button className="text-blue-600 hover:text-blue-900 font-medium">
                        查看详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // 渲染占位视图
  const renderPlaceholderView = (title: string, description: string) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-6">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <FileText className="mr-2 h-4 w-4" />
            开始使用
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题和年度选择器 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">预算管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            企业财务资源管控中心
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 年度选择器 */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>

          {/* 新建预算按钮 */}
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            新建预算
          </button>
        </div>
      </div>

      {/* Tab导航 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`
                    group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap
                    ${isActive 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab内容 */}
        <div className="p-6">
          {selectedTab === 'execution' && renderExecutionView()}
          {selectedTab === 'annual' && renderPlaceholderView('年度预算编制', '创建和管理企业年度预算计划')}
          {selectedTab === 'asset' && renderPlaceholderView('资产预算管理', '管理企业资产采购和投资预算')}
          {selectedTab === 'cashFlow' && renderPlaceholderView('现金流预测', '预测和监控企业现金流状况')}
          {selectedTab === 'labor' && renderPlaceholderView('人力费用预算', '管理企业人力成本预算')}
          {selectedTab === 'parameters' && renderPlaceholderView('预算参数设置', '配置损益项和预算管理参数')}
          {selectedTab === 'sales' && renderPlaceholderView('产品销售预测', '预测产品销售收入')}
        </div>
      </div>
    </div>
  );
};

export default BudgetManagement;
