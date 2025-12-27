import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, Package, Calendar, Users, Settings, FileText, BarChart3,
  AlertCircle, CheckCircle, Clock, Edit, Save
} from 'lucide-react';
import { AssetBudgetManagement } from './AssetBudgetManagement';
import { HRExpenseManagement } from './HRExpenseManagement';
import { BudgetParametersManagement } from './BudgetParametersManagement';
import { toast } from 'react-hot-toast';

const BudgetManagement: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTab, setSelectedTab] = useState<'execution' | 'annual' | 'asset' | 'cashFlow' | 'labor' | 'parameters' | 'sales'>('annual');
  
  // 人力费用预算编辑状态
  const [isLaborEditMode, setIsLaborEditMode] = useState(false);
  const [isSavingLabor, setIsSavingLabor] = useState(false);
  const [laborSaveMethod, setLaborSaveMethod] = useState<(() => void) | null>(null);

  // 年度选择器
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Tab配置 - 每个Tab配置独特的颜色主题
  const tabs = [
    { 
      id: 'annual', 
      label: '年度预算', 
      icon: Calendar,
      colors: {
        border: 'border-green-500',
        text: 'text-green-600',
        bg: 'bg-green-100',
        hoverBg: 'hover:bg-green-50',
        hoverBorder: 'hover:border-green-300'
      }
    },
    { 
      id: 'execution', 
      label: '预算执行', 
      icon: BarChart3,
      colors: {
        border: 'border-blue-500',
        text: 'text-blue-600',
        bg: 'bg-blue-100',
        hoverBg: 'hover:bg-blue-50',
        hoverBorder: 'hover:border-blue-300'
      }
    },
    { 
      id: 'asset', 
      label: '资产预算', 
      icon: Package,
      colors: {
        border: 'border-purple-500',
        text: 'text-purple-600',
        bg: 'bg-purple-100',
        hoverBg: 'hover:bg-purple-50',
        hoverBorder: 'hover:border-purple-300'
      }
    },
    { 
      id: 'cashFlow', 
      label: '现金流预测', 
      icon: DollarSign,
      colors: {
        border: 'border-yellow-500',
        text: 'text-yellow-600',
        bg: 'bg-yellow-100',
        hoverBg: 'hover:bg-yellow-50',
        hoverBorder: 'hover:border-yellow-300'
      }
    },
    { 
      id: 'labor', 
      label: '人力费用预算', 
      icon: Users,
      colors: {
        border: 'border-orange-500',
        text: 'text-orange-600',
        bg: 'bg-orange-100',
        hoverBg: 'hover:bg-orange-50',
        hoverBorder: 'hover:border-orange-300'
      }
    },
    { 
      id: 'parameters', 
      label: '预算参数', 
      icon: Settings,
      colors: {
        border: 'border-pink-500',
        text: 'text-pink-600',
        bg: 'bg-pink-100',
        hoverBg: 'hover:bg-pink-50',
        hoverBorder: 'hover:border-pink-300'
      }
    }
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
      {/* 指标卡片 - 添加渐变背景 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {executionMetrics.map((metric, index) => (
          <div key={index}>
            {renderMetricCard(metric)}
          </div>
        ))}
      </div>

      {/* 预算执行表格 - 优化边框和圆角 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
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

  // 渲染占位视图 - 简化样式，外层已有渐变
  const renderPlaceholderView = (title: string, description: string) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-6">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <FileText className="mr-2 h-4 w-4" />
            开始使用
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      {/* 页面标题和年度选择器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">预算管理</h1>
            <p className="text-gray-600">企业财务资源管控中心</p>
          </div>
        
          <div>
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
          </div>
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
                    transition-all duration-200
                    ${isActive 
                      ? `${tab.colors.border} ${tab.colors.text} ${tab.colors.bg}` 
                      : `border-transparent text-gray-500 hover:text-gray-700 ${tab.colors.hoverBg} ${tab.colors.hoverBorder}`
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
          {selectedTab === 'annual' && (
            <div className="bg-gradient-to-r from-cyan-50 to-cyan-50 rounded-lg p-6 border-l-4 border-l-cyan-500">
              {renderPlaceholderView('年度预算编制', '创建和管理企业年度预算计划')}
            </div>
          )}
          {selectedTab === 'asset' && <AssetBudgetManagement year={selectedYear} />}
          {selectedTab === 'cashFlow' && (
            <div className="bg-gradient-to-r from-teal-50 to-teal-50 rounded-lg p-6 border-l-4 border-l-teal-500">
              {renderPlaceholderView('现金流预测', '预测和监控企业现金流状况')}
            </div>
          )}
          {selectedTab === 'labor' && (
            <div>
              {/* 编辑/保存按钮 */}
              <div className="flex justify-end mb-4">
                {!isLaborEditMode ? (
                  <button
                    onClick={() => setIsLaborEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    编辑预算
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (laborSaveMethod) {
                        setIsSavingLabor(true);
                        await laborSaveMethod();
                        setIsSavingLabor(false);
                        setIsLaborEditMode(false);
                        toast.success('保存成功');
                      }
                    }}
                    disabled={isSavingLabor}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingLabor ? '保存中...' : '保存'}
                  </button>
                )}
              </div>
              
              {/* 人力费用管理组件 */}
              <HRExpenseManagement 
                selectedYear={selectedYear}
                isEditMode={isLaborEditMode}
                onEditModeChange={setIsLaborEditMode}
                onSavingChange={setIsSavingLabor}
                onSaveMethodReady={(method) => setLaborSaveMethod(() => method)}
              />
            </div>
          )}
          {selectedTab === 'parameters' && (
            <BudgetParametersManagement year={selectedYear} />
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetManagement;
