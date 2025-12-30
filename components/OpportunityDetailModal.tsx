import { useState, useEffect } from 'react';
import { X, Edit, Trash2, Calendar, Users, TrendingUp, Target, CheckCircle, Save, Briefcase, DollarSign } from 'lucide-react';
import { db, app } from '../lib/cloudbase';
import type { Opportunity } from '../types/opportunity';
import EditOpportunityModal from './EditOpportunityModal';
import OpportunityFollowUpList from './OpportunityFollowUpList';
import OpportunityRequirements from './OpportunityRequirements';
import CreateProjectFromOpportunityModal from './CreateProjectFromOpportunityModal';
import { getOpportunityStageColor, getOpportunityLevelColor } from '../types/opportunity';
import { usePermissionContext } from '../contexts/PermissionContext';
import Drawer from './Drawer';

interface OpportunityDetailModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId?: string;
}

export default function OpportunityDetailModal({ opportunity, onClose, onSuccess, currentUserId }: OpportunityDetailModalProps) {
  // 判断商机是否已锁定（取消、失败或成交）
  const isLocked = opportunity.stage === '取消' || opportunity.stage === '失败' || opportunity.stage === '成交';
  
  // 使用新权限系统
  const { checkPermission } = usePermissionContext();

  // 从 localStorage 获取当前用户ID（如果没有通过 props 传入）
  const getUserId = () => {
    if (currentUserId) return currentUserId;
    const currentUserStr = localStorage.getItem('current_user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser._id || '';
      } catch (error) {
        console.error('解析当前用户失败:', error);
        return '';
      }
    }
    return '';
  };

  const actualUserId = getUserId();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false); // 形成项目modal
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // 跟踪是否有未保存的更改

  // 加载商机阶段设置
  useEffect(() => {
    loadOpportunityStages();
  }, []);

  // 打开编辑Modal
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    setShowEditModal(false);
    onSuccess(); // 刷新数据
  };

  const loadOpportunityStages = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      console.log('🔍 [OpportunityDetailModal] 商机阶段原始数据:', result.data);
      
      if (result.data && result.data.length > 0) {
        // 支持旧格式（string[]）和新格式（TypeItem[]）
        const values = result.data[0].values;
        console.log('🔍 [OpportunityDetailModal] values数据:', values);
        
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            console.log('📝 [OpportunityDetailModal] 使用旧格式（字符串数组）');
            setOpportunityStages(values);
          } else {
            const enabledStages = values.filter((item: any) => item.enabled).map((item: any) => item.value);
            console.log('📝 [OpportunityDetailModal] 使用新格式，启用的阶段:', enabledStages);
            setOpportunityStages(enabledStages);
          }
        }
      }
    } catch (error) {
      console.error('加载商机阶段设置失败:', error);
      setOpportunityStages(['跟进线索', '方案咨询', '商务谈判']);
    }
  };

  // 获取成交概率
  const getProbability = (): number => {
    return opportunity.probability || 0;
  };

  // 更新商机阶段
  const handleUpdateStage = async (newStage: string) => {
    try {
      setLoading(true);
      
      // 准备更新数据
      const updateData: any = {
        stage: newStage,
        updatedAt: new Date()
      };
      
      // 如果变更为"成交"阶段，自动设置成交时间
      if (newStage === '成交') {
        const currentDate = new Date();
        const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        
        // 获取预期成交日期
        const expectedDate = opportunity.expectedCloseDate;
        
        // 如果预期成交日期晚于当前时间，使用当前时间；否则使用预期成交日期
        if (expectedDate && new Date(expectedDate) > currentDate) {
          updateData.closedAt = currentDateStr;
        } else {
          updateData.closedAt = expectedDate || currentDateStr;
        }
        
        console.log('✅ 设置成交时间:', updateData.closedAt);
      }
      
      await db.collection('opportunities').doc(opportunity._id).update(updateData);
      
      setShowStageSelector(false);
      setHasUnsavedChanges(false); // 重置未保存标记
      onSuccess(); // 刷新数据
    } catch (error) {
      console.error('更新商机阶段失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };


  // 保存并关闭
  const handleSaveAndClose = async () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      // ✅ 移除保存确认提示
      // 刷新数据以确保最新
      onSuccess();
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除(软删除)
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // 1. 如果商机已形成项目，先扣减产品订单数据
      if (opportunity.isProjectFormed) {
        console.log('⚠️  该商机已形成项目，先扣减产品订单数据...');
        
        const removeResult = await app.callFunction({
          name: 'remove-product-forecast',
          data: { opportunityId: opportunity._id }
        });
        
        console.log('扣减产品订单返回:', removeResult);
        
        if (!removeResult.result || !removeResult.result.success) {
          const errorMsg = removeResult.result?.message || '扣减产品订单失败';
          console.error('❌ 扣减产品订单失败:', errorMsg);
          alert(`删除失败: ${errorMsg}`);
          setLoading(false);
          return;
        }
        
        console.log('✅ 产品订单扣减成功');
      }
      
      // 2. 软删除商机
      await db.collection('opportunities').doc(opportunity._id).update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      // 3. 同步软删除关联的商机跟进任务
      const tasksResult = await db.collection('tasks')
        .where({
          relatedTo: opportunity._id,
          type: '商机跟进',
          isDeleted: db.command.neq(true)
        })
        .get();

      if (tasksResult.data && tasksResult.data.length > 0) {
        // 批量更新关联任务
        const updatePromises = tasksResult.data.map((task: any) =>
          db.collection('tasks').doc(task._id).update({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date()
          })
        );
        await Promise.all(updatePromises);
      }

      setShowDeleteConfirm(false);
      onSuccess();
    } catch (error) {
      console.error('移入回收站失败:', error);
      alert('操作失败,请重试');
    } finally {
      setLoading(false);
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

  // 格式化年月
  const formatYearMonth = (dateStr: string): string => {
    if (!dateStr) return '-';
    const [year, month] = dateStr.split('-');
    return `${year}年${month}月`;
  };

  // 格式化金额
  const formatAmount = (amount?: number): string => {
    if (!amount || isNaN(amount)) return '0.00';
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  return (
    <>
      {/* 侧边抽屉式商机详情 */}
      <Drawer
        isOpen={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getOpportunityStageColor(opportunity.stage || '', opportunityStages)} bg-opacity-20`}>
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {opportunity.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getOpportunityStageColor(opportunity.stage || '', opportunityStages)}`}>
                  {opportunity.stage}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getOpportunityLevelColor(opportunity.level)}`}>
                  {opportunity.level}
                </span>
                {isLocked && (
                  <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700">
                    🔒 已锁定
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* 仅当商机阶段为"成交"时显示"形成项目"按钮 */}
            {opportunity.stage === '成交' && (
                <button
                  onClick={() => !opportunity.isProjectFormed && setShowCreateProjectModal(true)}
                  disabled={!!opportunity.isProjectFormed}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
                    opportunity.isProjectFormed
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={opportunity.isProjectFormed ? '该商机已形成项目' : '点击形成项目'}
                >
                  <CheckCircle className="w-4 h-4" />
                  {opportunity.isProjectFormed ? '已形成项目' : '形成项目'}
                </button>
              )}
              {!isLocked && checkPermission('opportunities', 'edit') && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                编辑
              </button>
            )}
            {checkPermission('opportunities', 'delete') && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* 查看模式 */}
          <div className="space-y-6">
              {/* 关键指标 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">预计金额</div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-medium text-gray-900">{formatAmount(opportunity.estimatedAmount)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 relative">
                  <div className="text-sm text-gray-600 mb-1">商机阶段</div>
                  <div 
                    onClick={() => !isLocked && setShowStageSelector(!showStageSelector)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityStageColor(opportunity.stage || '', opportunityStages)} ${
                      isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                    }`}
                  >
                    {opportunity.stage}
                  </div>
                  
                  {/* 阶段选择下拉 */}
                  {showStageSelector && !isLocked && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                      <div className="p-1">
                        {opportunityStages.map((stage) => (
                          <button
                            key={stage}
                            onClick={() => {
                              handleUpdateStage(stage);
                              setHasUnsavedChanges(true);
                            }}
                            disabled={loading || stage === opportunity.stage}
                            className={`w-full text-left px-3 py-2 rounded text-sm ${
                              stage === opportunity.stage
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'hover:bg-gray-50 text-gray-700'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">重要程度</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityLevelColor(opportunity.level)}`}>
                    {opportunity.level}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">成交概率</div>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-medium text-gray-900">{getProbability()}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProbability()}%` }}
                    />
                  </div>
                </div>
              </div>


              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">客户名称</label>
                  <span className="text-gray-900">{opportunity.customerName || opportunity.customer || '-'}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系人</label>
                  <span className="text-gray-900">{opportunity.contact || '-'}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                  <span className="text-gray-900">{opportunity.contactPhone || '-'}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">预计成交日期</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">{opportunity.expectedCloseDate ? formatYearMonth(opportunity.expectedCloseDate as string) : '-'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">负责人</label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">{opportunity.ownerName || '-'}</span>
                  </div>
                </div>

                {opportunity.collaboratorNames && opportunity.collaboratorNames.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">协同人</label>
                    <span className="text-gray-900">{opportunity.collaboratorNames.join(', ')}</span>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">可见性设置</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    opportunity.isPublic 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {opportunity.isPublic ? '👥 团队可见' : '🔒 不公开'}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {opportunity.isPublic 
                      ? '所有团队成员可见' 
                      : '仅负责人、协同人可见'
                    }
                  </div>
                </div>
              </div>

              {/* 商机需求 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">商机需求</label>
                <OpportunityRequirements
                  opportunityId={opportunity._id}
                  requirements={opportunity.requirements || []}
                  onUpdate={(requirements, totalAmount) => {
                    setHasUnsavedChanges(true);
                  }}
                  readOnly={true}
                />
              </div>

              {/* 商机备忘 */}
              {opportunity.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商机备忘</label>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {opportunity.description}
                  </div>
                </div>
              )}

              {/* 创建时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{formatDate(opportunity.createdAt)}</span>
                </div>
              </div>

              {/* 商机跟进任务列表 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">商机跟进任务</label>
                <OpportunityFollowUpList 
                  opportunityId={opportunity._id}
                  onTaskUpdate={() => {
                    setHasUnsavedChanges(true);
                    onSuccess();
                  }}
                />
              </div>
            </div>
        </div>
      </Drawer>

      {/* 编辑模态框 */}
      {showEditModal && (
        <EditOpportunityModal
          opportunity={opportunity}
          currentUserId={actualUserId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onSuccess();
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">确认放入回收站</h3>
              <p className="text-sm text-gray-600 mt-1">商机将被移入回收站,可在回收站中恢复</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                <span className="font-medium">将要移入回收站:</span> {opportunity.name}
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

      {/* 形成项目Modal */}
      {showCreateProjectModal && (
        <CreateProjectFromOpportunityModal
          opportunity={opportunity}
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={() => {
            setShowCreateProjectModal(false);
            onSuccess(); // 刷新父组件数据
          }}
        />
      )}

      {/* 编辑商机Modal */}
      {showEditModal && (
        <EditOpportunityModal
          opportunity={opportunity}
          currentUserId={actualUserId}
          onClose={() => {
            setShowEditModal(false);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            onSuccess(); // 刷新商机数据，保持在详情页
          }}
        />
      )}
    </>
  );
}
