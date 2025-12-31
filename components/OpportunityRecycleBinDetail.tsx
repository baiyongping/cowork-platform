import { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, Calendar, DollarSign, Users, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { db } from '../lib/cloudbase';
import type { Opportunity } from '../types/opportunity';
import { getOpportunityStageColor, getOpportunityLevelColor } from '../types/opportunity';
import { showError, showSuccess } from '../utils/ui-feedback';

interface OpportunityRecycleBinDetailProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OpportunityRecycleBinDetail({ opportunity, onClose, onSuccess }: OpportunityRecycleBinDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);

  // 加载商机阶段设置
  useEffect(() => {
    loadOpportunityStages();
  }, []);

  const loadOpportunityStages = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      if (result.data && result.data.length > 0) {
        // 支持旧格式（string[]）和新格式（TypeItem[]）
        const values = result.data[0].values;
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            setOpportunityStages(values);
          } else {
            setOpportunityStages(values.filter((item: any) => item.enabled).map((item: any) => item.value));
          }
        }
      }
    } catch (error) {
      console.error('加载商机阶段设置失败:', error);
      setOpportunityStages(['跟进线索', '方案咨询', '商务谈判']);
    }
  };

  // 恢复商机
  const handleRestore = async () => {
    try {
      setLoading(true);
      
      // 1. 恢复商机
      await db.collection('opportunities').doc(opportunity._id).update({
        isDeleted: false,
        deletedAt: db.command.remove(),
        updatedAt: new Date()
      });

      // 2. 同步恢复关联的商机跟进任务
      const tasksResult = await db.collection('tasks')
        .where({
          relatedTo: opportunity._id,
          type: '商机跟进',
          isDeleted: true
        })
        .get();

      if (tasksResult.data && tasksResult.data.length > 0) {
        // 批量恢复关联任务
        const updatePromises = tasksResult.data.map((task: any) =>
          db.collection('tasks').doc(task._id).update({
            isDeleted: false,
            deletedAt: db.command.remove(),
            updatedAt: new Date()
          })
        );
        await Promise.all(updatePromises);
      }

      showSuccess('商机及关联任务已恢复');
      onSuccess();
    } catch (error) {
      console.error('恢复商机失败:', error);
      showError('恢复失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 永久删除
  const handlePermanentDelete = async () => {
    try {
      setLoading(true);

      // 1. 永久删除关联的商机跟进任务
      const tasksResult = await db.collection('tasks')
        .where({
          relatedTo: opportunity._id,
          type: '商机跟进'
        })
        .get();

      if (tasksResult.data && tasksResult.data.length > 0) {
        const deletePromises = tasksResult.data.map((task: any) =>
          db.collection('tasks').doc(task._id).remove()
        );
        await Promise.all(deletePromises);
      }

      // 2. 永久删除商机
      await db.collection('opportunities').doc(opportunity._id).remove();

      showSuccess('商机及关联任务已永久删除');
      onSuccess();
    } catch (error) {
      console.error('永久删除失败:', error);
      showError('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN');
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold text-gray-900">商机详情（回收站）</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRestore}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                返回继续执行
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                永久删除
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{opportunity.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityStageColor(opportunity.stage, opportunityStages)}`}>
                      {opportunity.stage}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityLevelColor(opportunity.level)}`}>
                      {opportunity.level}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">预计金额</div>
                  <div className="text-3xl font-bold text-blue-600">{formatAmount(opportunity.estimatedAmount)}</div>
                </div>
              </div>

              {/* 成交概率 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">成交概率</span>
                  <span className="text-sm font-bold text-green-600">{opportunity.probability}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${opportunity.probability}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 商机详情 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 预计成交日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  预计成交日期
                </label>
                <div className="text-gray-900">{formatDate(opportunity.expectedCloseDate)}</div>
              </div>
            </div>

            {/* 客户信息 */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    客户名称
                  </label>
                  <div className="text-gray-900">{opportunity.customer}</div>
                </div>
              </div>
            </div>

            {/* 负责人信息 */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">负责人信息</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                  <div className="text-gray-900">{opportunity.ownerName || '未知'}</div>
                </div>
                {opportunity.collaboratorNames && opportunity.collaboratorNames.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">协同人</label>
                    <div className="text-gray-900">{opportunity.collaboratorNames.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 商机描述 */}
            {opportunity.description && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">商机描述</h4>
                <div className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</div>
              </div>
            )}

            {/* 备注 */}
            {opportunity.notes && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">备注信息</h4>
                <div className="text-gray-700 whitespace-pre-wrap">{opportunity.notes}</div>
              </div>
            )}

            {/* 删除时间 */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>删除时间：{formatDate(opportunity.deletedAt || '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 永久删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认永久删除</h3>
                <p className="text-sm text-gray-600 mt-1">此操作无法撤销，确定要永久删除这个商机吗？</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <span className="font-medium">将要删除:</span> {opportunity.name}
              </p>
              <p className="text-xs text-red-600 mt-1">
                商机及其所有相关数据将被永久删除
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    确认永久删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
