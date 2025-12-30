import { useState, useEffect } from 'react';
import { X, Edit, Trash2, Calendar, Users, DollarSign, TrendingUp, Target, FolderKanban, AlertCircle, Package, CheckCircle, Briefcase } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Project } from '../types/project';
import { getProjectStatusColor, isProjectOverdue } from '../types/project';
import ProjectTaskList from './ProjectTaskList';
import EditProjectModal from './EditProjectModal';
import { usePermissionContext } from '../contexts/PermissionContext';
import Drawer from './Drawer';
import { showSuccess, showError } from '../utils/ui-feedback';

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectDetailModal({ project, onClose, onSuccess }: ProjectDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(project);
  const [recordingRevenue, setRecordingRevenue] = useState(false);
  const [showRevenueConfirm, setShowRevenueConfirm] = useState(false);
  
  // 使用新权限系统
  const { checkPermission } = usePermissionContext();

  // 刷新项目数据
  const refreshProject = async () => {
    try {
      const result = await db.collection('projects').doc(project._id).get();
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        const proj = result.data[0];
        
        // 查询项目经理名称
        let managerName = '未知';
        if (proj.owner) {
          const managerRes = await db.collection('users').where({ _id: proj.owner }).get();
          if (managerRes.data && managerRes.data.length > 0) {
            managerName = managerRes.data[0].name;
          }
        }
        
        // 查询成员名称
        let memberNames: string[] = [];
        if (proj.members && proj.members.length > 0) {
          const memberRes = await db.collection('users')
            .where({ _id: db.command.in(proj.members) })
            .get();
          memberNames = memberRes.data.map((u: any) => u.name);
        }
        
        setCurrentProject({
          ...proj,
          managerName,
          memberNames
        });
      }
    } catch (error) {
      console.error('刷新项目数据失败:', error);
    }
  };

  // 打开编辑Modal
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    setShowEditModal(false);
    refreshProject(); // 刷新项目数据
    onSuccess(); // 刷新父组件
  };

  // 处理放入回收站（软删除）
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // 软删除项目
      await db.collection('projects').doc(project._id).update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      setShowDeleteConfirm(false);
      onSuccess();
    } catch (error) {
      console.error('移入回收站失败:', error);
      showError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 计入销售业绩
  const handleRecordRevenue = async () => {
    // 检查是否已计入
    if (currentProject.revenueRecorded) {
      showError('该项目已计入销售业绩，无法重复计入');
      return;
    }

    // 检查项目总金额
    if (!totalAmount || totalAmount <= 0) {
      showError('项目总金额为0，无法计入销售业绩');
      return;
    }

    try {
      setRecordingRevenue(true);

      // 使用当前确认收入的时间（而不是项目交付日期）来计算年份和季度
      const confirmDate = new Date();
      
      // 验证日期有效性
      if (isNaN(confirmDate.getTime())) {
        throw new Error('收入确认日期无效');
      }

      const year = confirmDate.getFullYear();
      const quarter = `Q${Math.floor(confirmDate.getMonth() / 3) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';

      // 项目总金额（单位：元）
      const revenueAmount = totalAmount / 10000; // 转换为万元

      console.log(`📊 计入销售业绩 - 年份: ${year}, 季度: ${quarter}, 金额: ${revenueAmount}万元`);

      // 1. 更新季度销售目标
      const quarterlyGoalResult = await db.collection('sales_goals')
        .where({
          year: year,
          quarter: quarter,
          type: 'quarterly'
        })
        .get();

      if (quarterlyGoalResult.data && quarterlyGoalResult.data.length > 0) {
        const goal = quarterlyGoalResult.data[0];
        const newRevenueActual = (goal.revenueActual || 0) + revenueAmount;

        await db.collection('sales_goals').doc(goal._id).update({
          revenueActual: newRevenueActual,
          updatedAt: new Date(),
        });

        console.log(`✅ 已更新${year}年${quarter}季度销售收入目标，增加: ${revenueAmount.toFixed(2)}万元`);
      } else {
        // 创建新的季度销售目标记录
        await db.collection('sales_goals').add({
          year: year,
          quarter: quarter,
          type: 'quarterly',
          orderTarget: 0,
          orderActual: 0,
          revenueTarget: 0,
          revenueActual: revenueAmount,
          createdBy: currentProject.owner,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ 已创建${year}年${quarter}季度销售目标，销售收入: ${revenueAmount.toFixed(2)}万元`);
      }

      // 2. 更新年度销售目标
      const annualGoalResult = await db.collection('sales_goals')
        .where({
          year: year,
          type: 'annual'
        })
        .get();

      if (annualGoalResult.data && annualGoalResult.data.length > 0) {
        const annualGoal = annualGoalResult.data[0];
        const newAnnualRevenueActual = (annualGoal.revenueActual || 0) + revenueAmount;

        await db.collection('sales_goals').doc(annualGoal._id).update({
          revenueActual: newAnnualRevenueActual,
          updatedAt: new Date(),
        });

        console.log(`✅ 已更新${year}年度销售收入目标，增加: ${revenueAmount.toFixed(2)}万元`);
      } else {
        // 创建年度销售目标记录
        await db.collection('sales_goals').add({
          year: year,
          type: 'annual',
          orderTarget: 0,
          orderActual: 0,
          revenueTarget: 0,
          revenueActual: revenueAmount,
          createdBy: currentProject.owner,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ 已创建${year}年度销售目标，销售收入: ${revenueAmount.toFixed(2)}万元`);
      }

      // 3. 更新项目记录，标记已计入销售业绩
      await db.collection('projects').doc(currentProject._id).update({
        revenueRecorded: true,
        revenueRecordedAt: new Date(),
        updatedAt: new Date()
      });

      // 刷新项目数据
      await refreshProject();

      showSuccess(`成功计入销售业绩！年份: ${year}年，季度: ${quarter}，金额: ${formatAmount(totalAmount)}`);
    } catch (error) {
      console.error('计入销售业绩失败:', error);
      showError(`计入销售业绩失败：${error instanceof Error ? error.message : '未知错误'}，请重试或联系管理员`);
    } finally {
      setRecordingRevenue(false);
    }
  };

  // 格式化日期（年月日）
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // 格式化金额
  const formatAmount = (amount?: number): string => {
    if (!amount || isNaN(amount)) return '0.00';
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  // 解析项目交付产品（从字符串转为对象数组）
  const parseDeliverables = (deliverables?: string) => {
    if (!deliverables) return [];
    
    try {
      // 按双换行分割各个产品
      const products = deliverables.split('\n\n').filter(p => p.trim());
      
      return products.map(product => {
        const lines = product.split('\n').filter(l => l.trim());
        const nameMatch = lines[0]?.match(/^\d+\.\s+(.+)$/);
        
        // 兼容新旧字段名称：产品数量 / 需求数量
        const quantityMatch = lines.find(l => l.includes('产品数量') || l.includes('需求数量'))?.match(/(\d+)\s*件/);
        
        // 兼容新旧字段名称：单价 / 预算单价
        const unitPriceMatch = lines.find(l => l.includes('单价') && !l.includes('预算') && !l.includes('成本'))?.match(/([\d.]+)\s*元/)
          || lines.find(l => l.includes('预算单价'))?.match(/([\d.]+)\s*元/);
        
        // 总价
        const totalPriceMatch = lines.find(l => l.includes('总价'))?.match(/([\d.]+)\s*元/);
        
        // 兼容新旧字段名称：采购成本单价 / 采购成本 / 预估成本
        const estimatedCostUnitMatch = lines.find(l => l.includes('采购成本单价'))?.match(/([\d.]+)\s*元/)
          || lines.find(l => l.includes('采购成本') && !l.includes('单价'))?.match(/([\d.]+)\s*元/)
          || lines.find(l => l.includes('预估成本'))?.match(/([\d.]+)\s*元/);
        
        const quantity = parseInt(quantityMatch?.[1] || '0');
        const unitPrice = parseFloat(unitPriceMatch?.[1] || '0');
        const costUnit = parseFloat(estimatedCostUnitMatch?.[1] || '0');
        const totalCost = costUnit * quantity; // 总成本 = 采购成本单价 × 产品数量
        
        return {
          productType: nameMatch?.[1] || '',
          quantity,
          unitPrice,
          totalPrice: parseFloat(totalPriceMatch?.[1] || '0'),
          estimatedCostUnit: costUnit, // 采购成本单价
          estimatedCost: totalCost, // 总成本
          grossProfit: (parseFloat(totalPriceMatch?.[1] || '0') - totalCost)
        };
      });
    } catch (error) {
      console.error('解析项目交付产品失败:', error);
      return [];
    }
  };

  const deliverableProducts = parseDeliverables(currentProject.deliverables);
  const totalAmount = deliverableProducts.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalCost = deliverableProducts.reduce((sum, p) => sum + p.estimatedCost, 0);
  const grossProfit = totalAmount - totalCost;

  return (
    <>
      {/* 侧边抽屉式项目详情 */}
      <Drawer
        isOpen={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getProjectStatusColor(currentProject.status)} bg-opacity-20`}>
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {currentProject.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getProjectStatusColor(currentProject.status)}`}>
                  {currentProject.status}
                </span>
                {currentProject.revenueRecorded && (
                  <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">
                    ✓ 已确认收入
                  </span>
                )}
                {isProjectOverdue(currentProject) && (
                  <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700">
                    已逾期
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* 确认销售收入按钮 */}
            <button
                onClick={() => setShowRevenueConfirm(true)}
                disabled={currentProject.revenueRecorded || recordingRevenue}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
                  currentProject.revenueRecorded
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={currentProject.revenueRecorded ? '已确认销售收入' : '点击确认销售收入'}
              >
                {recordingRevenue ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    确认中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {currentProject.revenueRecorded ? '已确认收入' : '确认收入'}
                  </>
                )}
              </button>
              {checkPermission('projects', 'edit') && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  title="编辑项目"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
            </div>
        }
      >
        <div className="space-y-6">
          {/* 关键指标 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">项目总金额</div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="text-lg font-medium text-gray-900">{formatAmount(totalAmount)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">项目毛利润</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-medium text-gray-900">{formatAmount(grossProfit)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">成本: {formatAmount(totalCost)}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">项目状态</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectStatusColor(currentProject.status)}`}>
                  {currentProject.status}
                </span>
                {currentProject.phase && ['准备期', '制造期', '交付期'].includes(currentProject.status) && (
                  <div className="text-xs text-gray-500 mt-1">环节: {currentProject.phase}</div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">项目进度</div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="text-lg font-medium text-gray-900">{currentProject.progress || 0}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, currentProject.progress || 0))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentProject.code && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">项目编号</label>
                  <span className="text-gray-900">{currentProject.code}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户名称</label>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{currentProject.customer}</span>
                </div>
              </div>

              {currentProject.contactPerson && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">对接人</label>
                  <span className="text-gray-900">{currentProject.contactPerson}</span>
                </div>
              )}

              {currentProject.contactPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                  <span className="text-gray-900">{currentProject.contactPhone}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{formatDate(currentProject.startDate)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">计划交付日期</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{formatDate(currentProject.endDate)}</span>
                  {isProjectOverdue(currentProject) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      已延期
                    </span>
                  )}
                </div>
              </div>

              {currentProject.managerName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">项目经理</label>
                  <span className="text-gray-900">{currentProject.managerName}</span>
                </div>
              )}

              {currentProject.memberNames && currentProject.memberNames.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">项目成员</label>
                  <span className="text-gray-900">{currentProject.memberNames.join(', ')}</span>
                </div>
              )}
            </div>

            {/* 项目描述 */}
            {currentProject.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {currentProject.description}
                </div>
              </div>
            )}

            {/* 项目交付产品 */}
            {currentProject.deliverables && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">项目交付产品</h4>
                </div>

                {deliverableProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>暂无交付产品</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {deliverableProducts.map((product, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 grid grid-cols-6 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">产品类别</label>
                              <div className="text-sm font-medium text-gray-900">{product.productType}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">产品数量</label>
                              <div className="text-sm text-gray-900">{product.quantity} 件</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">单价</label>
                              <div className="text-sm text-gray-900">¥{product.unitPrice.toFixed(2)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">采购成本单价</label>
                              <div className="text-sm text-gray-900">¥{product.estimatedCostUnit.toFixed(2)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">采购总成本</label>
                              <div className="text-sm text-orange-600 font-semibold">¥{formatAmount(product.estimatedCost)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">总价</label>
                              <div className="text-sm font-semibold text-blue-600">¥{formatAmount(product.totalPrice)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">预估毛利润</label>
                              <div className="text-sm font-semibold text-green-600">¥{formatAmount(product.grossProfit)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 总计 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">项目总销售额</span>
                        <span className="text-xl font-bold text-blue-600">¥{formatAmount(totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-blue-200 pt-3">
                        <span className="text-sm font-medium text-gray-700">项目总成本</span>
                        <span className="text-lg font-semibold text-orange-600">¥{formatAmount(totalCost)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-blue-200 pt-3">
                        <span className="text-sm font-medium text-gray-700">项目毛利润</span>
                        <span className="text-xl font-bold text-green-600">¥{formatAmount(grossProfit)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 操作按钮区域 */}
            <div className="border-t border-gray-200 pt-6 flex justify-end">
              {checkPermission('projects', 'delete') && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  放入回收站
                </button>
              )}
            </div>

            {/* 项目任务列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <ProjectTaskList
                projectId={currentProject._id}
                onTaskUpdate={() => {
                  refreshProject();
                }}
              />
            </div>
          </div>
      </Drawer>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">确认放入回收站</h3>
              <p className="text-sm text-gray-600 mt-1">项目将被移入回收站，可在回收站中恢复</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                <span className="font-medium">将要移入回收站:</span> {currentProject.name}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    确认移入回收站
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收入确认对话框 */}
      {showRevenueConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">确认计入销售业绩</h2>
            <p className="text-gray-600 mb-6">
              确认将项目总金额 <span className="font-bold text-blue-600">{formatAmount(totalAmount)}</span> 计入销售业绩？
              <br /><br />
              <span className="text-red-600">此操作不可撤销</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevenueConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowRevenueConfirm(false);
                  handleRecordRevenue();
                }}
                disabled={recordingRevenue}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {recordingRevenue ? '处理中...' : '确认计入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑项目模态框 */}
      {showEditModal && (
        <EditProjectModal
          project={currentProject}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            setShowEditModal(false);
            await refreshProject(); // 刷新项目详情页面，继续显示详情
            onSuccess(); // 通知父组件刷新项目列表
          }}
        />
      )}
    </>
  );
}
