import { useState, useEffect } from 'react';
import { X, Edit, Trash2, Calendar, Users, TrendingUp, Target, CheckCircle, Save } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Opportunity } from '../types/opportunity';
import EditOpportunityModal from './EditOpportunityModal';
import OpportunityFollowUpList from './OpportunityFollowUpList';
import OpportunityRequirements from './OpportunityRequirements';
import CreateProjectFromOpportunityModal from './CreateProjectFromOpportunityModal';
import { getOpportunityStageColor, getOpportunityLevelColor } from '../types/opportunity';
import { usePermissionContext } from '../contexts/PermissionContext';

interface OpportunityDetailModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OpportunityDetailModal({ opportunity, onClose, onSuccess }: OpportunityDetailModalProps) {
  // 判断商机是否已锁定（取消、失败或成交）
  const isLocked = opportunity.stage === '取消' || opportunity.stage === '失败' || opportunity.stage === '成交';
  
  // 使用新权限系统
  const { checkPermission } = usePermissionContext();

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
      
      // 1. 软删除商机
      await db.collection('opportunities').doc(opportunity._id).update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      // 2. 同步软删除关联的商机跟进任务
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
      {/* 主模态框 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          // 点击背景关闭阶段选择器
          if (e.target === e.currentTarget) {
            setShowStageSelector(false);
          }
        }}
      >
        <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={() => setShowStageSelector(false)}>
          {/* 头部 - 固定顶部 - 优化后的渐变设计 */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 px-8 py-5 flex items-center justify-between z-10 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide">商机详情</h2>
                {isLocked && (
                  <p className="mt-1.5 text-sm text-yellow-200 font-medium flex items-center gap-1.5 bg-yellow-400 bg-opacity-20 px-3 py-1 rounded-lg backdrop-blur-sm">
                    <span>⚠️</span>
                    <span>该商机已{opportunity.stage}，已锁定无法修改</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 仅当商机阶段为"成交"时显示"形成项目"按钮 */}
              {opportunity.stage === '成交' && (
                <button
                  onClick={() => !opportunity.projectId && setShowCreateProjectModal(true)}
                  disabled={!!opportunity.projectId}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold shadow-lg ${
                    opportunity.projectId
                      ? 'bg-white bg-opacity-20 text-white cursor-not-allowed'
                      : 'bg-white text-green-600 hover:scale-105 hover:shadow-xl'
                  }`}
                  title={opportunity.projectId ? '该商机已形成项目' : '点击形成项目'}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{opportunity.projectId ? '已形成项目' : '形成项目'}</span>
                </button>
              )}
              {/* ✅ 使用新权限系统: 编辑按钮 */}
              {!isLocked && checkPermission('opportunities', 'edit') && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 rounded-xl hover:scale-105 transition-all duration-200 text-sm font-semibold shadow-lg"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
              <button
                onClick={handleSaveAndClose}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 hover:scale-105 transition-all duration-200 text-sm font-semibold shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <Save className="w-4 h-4" />
                保存关闭
              </button>
              {/* ✅ 使用新权限系统: 删除按钮 */}
              {checkPermission('opportunities', 'delete') && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 hover:scale-105 transition-all duration-200 text-sm font-semibold shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  放入回收站
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* 内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="p-8 space-y-6">
              {/* 商机名称 - Hero Section */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{opportunity.name}</h3>
                <div className="flex items-center gap-2 text-lg text-gray-600">
                  <span className="font-medium text-gray-800">客户：</span>
                  <span className="text-blue-600 font-semibold">{opportunity.customer}</span>
                </div>
              </div>

              {/* 关键指标卡片 - 优化后的设计 */}
              <div className="grid grid-cols-4 gap-4">
                {/* 预计金额 - 蓝色渐变 */}
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm opacity-90 font-medium">预计金额</div>
                    <TrendingUp className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{formatAmount(opportunity.estimatedAmount)}</div>
                  <div className="mt-2 text-xs opacity-75">预计收益</div>
                </div>

                {/* 商机阶段 - 紫色渐变 */}
                <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm opacity-90 font-medium">商机阶段</div>
                  </div>
                  <div 
                    onClick={() => !isLocked && setShowStageSelector(!showStageSelector)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-white bg-opacity-90 ${
                      isLocked 
                        ? 'cursor-not-allowed text-gray-400' 
                        : 'cursor-pointer transition-all hover:bg-opacity-100 hover:shadow-md text-purple-700'
                    }`}
                  >
                    {opportunity.stage}
                  </div>
                  <div className="mt-2 text-xs opacity-75">当前进度</div>
                  
                  {/* 阶段选择下拉 */}
                  {showStageSelector && !isLocked && (
                    <div className="absolute top-full left-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-20 min-w-[180px] overflow-hidden">
                      <div className="p-2 space-y-1">
                        {opportunityStages.map((stage) => (
                          <button
                            key={stage}
                            onClick={() => {
                              handleUpdateStage(stage);
                              setHasUnsavedChanges(true);
                            }}
                            disabled={loading || stage === opportunity.stage}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                              stage === opportunity.stage
                                ? 'bg-purple-50 text-purple-700 font-semibold cursor-default'
                                : 'hover:bg-gray-50 text-gray-700 hover:pl-5'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {stage}
                            {stage === opportunity.stage && (
                              <span className="ml-2 text-sm text-purple-500 font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 重要程度 - 橙色渐变 */}
                <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm opacity-90 font-medium">重要程度</div>
                    <span className="text-xl">⭐</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{opportunity.level}</div>
                  <div className="mt-2 text-xs opacity-75">优先级标识</div>
                </div>

                {/* 成交概率 - 绿色渐变 */}
                <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm opacity-90 font-medium">成交概率</div>
                    <Target className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-3xl font-bold tracking-tight">{getProbability()}</div>
                    <div className="text-lg opacity-90 font-medium">%</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full h-2 mt-4 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${getProbability()}%` }}
                    />
                  </div>
                </div>
              </div>


              {/* 商机需求 - 优化后的设计 */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
                    <span className="text-white text-lg">📦</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">商机需求</h4>
                </div>
                <OpportunityRequirements
                  opportunityId={opportunity._id}
                  requirements={opportunity.requirements || []}
                  onUpdate={(requirements, totalAmount) => {
                    setHasUnsavedChanges(true);
                  }}
                  readOnly={true}
                />
              </div>

              {/* 详细信息 - 两列布局 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 预计成交日期 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900">预计成交日期</h4>
                  </div>
                  <div className="text-xl text-gray-900 font-semibold ml-11">
                    {opportunity.expectedCloseDate ? formatYearMonth(opportunity.expectedCloseDate as string) : '未设置'}
                  </div>
                </div>

                {/* 可见性设置 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="text-sm text-gray-600 mb-3 font-medium">可见性设置</div>
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                    opportunity.isPublic 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {opportunity.isPublic ? '👥 团队可见' : '🔒 不公开'}
                  </div>
                  <div className="text-xs text-gray-500 mt-3">
                    {opportunity.isPublic 
                      ? '所有团队成员可见' 
                      : '仅负责人、协同人可见'
                    }
                  </div>
                </div>

                {/* 负责人信息 - 跨列 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 col-span-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-xl">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900">团队信息</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 ml-11">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 font-medium">负责人</div>
                      <div className="text-base text-gray-900 font-semibold">{opportunity.ownerName || '未知'}</div>
                    </div>
                    {opportunity.collaboratorNames && opportunity.collaboratorNames.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 font-medium">协同人</div>
                        <div className="text-base text-gray-900">{opportunity.collaboratorNames.join(', ')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 商机备忘 */}
              {opportunity.description && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-xl">
                      <span className="text-white text-lg">📝</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">商机备忘</h4>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                    {opportunity.description}
                  </div>
                </div>
              )}

              {/* 创建时间 */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-2 rounded-xl">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">创建时间</h4>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{formatDate(opportunity.createdAt)}</div>
                </div>
              </div>

              {/* 商机跟进任务列表 */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-gradient-to-br from-green-500 to-teal-500 p-2 rounded-xl">
                    <span className="text-white text-lg">📋</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900">商机跟进任务</h4>
                </div>
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
        </div>
      </div>

      {/* 编辑模态框 */}
      {showEditModal && (
        <EditOpportunityModal
          opportunity={opportunity}
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
