import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { app, db } from '../lib/cloudbase';
import type { OpportunityStage, OpportunityLevel } from '../types/opportunity';
import { UserAvatar } from './UserAvatar';

interface CreateOpportunityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOpportunityModal({ onClose, onSuccess }: CreateOpportunityModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    stage: '' as OpportunityStage, // 初始为空，从系统设置获取默认值
    level: '一般' as OpportunityLevel,
    customer: '',
    description: '',
    owner: '',
    createdAt: '', // 创建时间，自动生成
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentUser();
    loadOpportunityStages();
    // 设置创建时间为当前日期
    const today = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    setFormData(prev => ({ ...prev, createdAt: today }));
  }, []);

  // 加载商机阶段设置
  const loadOpportunityStages = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      if (result.data && result.data.length > 0) {
        // 支持旧格式（string[]）和新格式（TypeItem[]）
        const values = result.data[0].values;
        let stages: string[] = [];
        
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            stages = values;
          } else {
            stages = values.filter((item: any) => item.enabled).map((item: any) => item.value);
          }
        }
        
        setOpportunityStages(stages);
        // 设置默认阶段为第一个
        if (stages.length > 0 && !formData.stage) {
          setFormData(prev => ({ ...prev, stage: stages[0] }));
        }
      } else {
        // 如果没有配置，使用默认值
        const defaultStages = ['跟进线索', '方案咨询', '商务谈判'];
        setOpportunityStages(defaultStages);
        setFormData(prev => ({ ...prev, stage: defaultStages[0] }));
      }
    } catch (error) {
      console.error('加载商机阶段设置失败:', error);
      // 出错时使用默认值
      const defaultStages = ['跟进线索', '方案咨询', '商务谈判'];
      setOpportunityStages(defaultStages);
      setFormData(prev => ({ ...prev, stage: defaultStages[0] }));
    }
  };

  const loadCurrentUser = async () => {
    try {
      // 尝试从 localStorage 获取用户信息（注意键名是 'current_user' 而不是 'user'）
      const userStr = localStorage.getItem('current_user');
      if (!userStr) {
        console.error('localStorage 中没有用户信息，请先登录');
        alert('无法获取当前用户信息，请刷新页面重新登录');
        return;
      }

      const loginUser = JSON.parse(userStr);
      console.log('从 localStorage 读取的用户信息:', loginUser);
      
      // 确保用户对象有效（注意：用户对象的ID字段是 userId 而不是 _id）
      if (loginUser && loginUser.userId) {
        setCurrentUser(loginUser);
        setFormData(prev => ({ ...prev, owner: loginUser.userId }));
        console.log('用户信息加载成功:', loginUser.name, loginUser.userId);
      } else {
        console.error('用户信息结构无效:', loginUser);
        alert('用户信息格式错误，请重新登录');
      }
    } catch (error) {
      console.error('解析用户信息失败:', error);
      alert('读取用户信息失败，请重新登录');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = '商机名称不能为空';
    if (!formData.customer.trim()) newErrors.customer = '客户名称不能为空';
    if (!formData.stage) newErrors.stage = '请选择商机阶段';
    if (!formData.owner || !currentUser || !currentUser.userId) {
      newErrors.owner = '无法获取当前用户信息，请刷新页面重试';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 二次确认用户信息（注意：用户对象的ID字段是 userId）
    if (!currentUser || !currentUser.userId) {
      alert('无法获取当前用户信息，请刷新页面后重试');
      return;
    }

    if (!validate()) return;

    try {
      setSubmitting(true);
      
      // 准备数据，确保 owner 字段正确
      const opportunityData = {
        name: formData.name,
        stage: formData.stage,
        level: formData.level,
        customer: formData.customer,
        description: formData.description,
        owner: formData.owner, // 确保是用户的 _id
        // 以下字段设置默认值，在详情页编辑
        productType: '', // 产品类型默认空
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        estimatedAmount: 0, // 预计金额默认0
        requirements: [], // 商机需求默认空数组
        expectedCloseDate: new Date().toISOString().slice(0, 10), // 预计成交日期默认为当前日期
        probability: 0, // 成交概率默认0
        notes: '',
        collaborators: [],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: currentUser._id,
      };

      // 打印调试信息
      console.log('创建商机数据:', {
        owner: opportunityData.owner,
        createdBy: opportunityData.createdBy,
        userName: currentUser.name
      });

      // 创建商机
      const result = await db.collection('opportunities').add(opportunityData);

      // 发送消息通知给负责人
      if (opportunityData.owner && opportunityData.owner !== currentUser._id) {
        try {
          await app.callFunction({
            name: 'opportunity-message',
            data: {
              action: 'create',
              opportunityId: result.id,
              opportunityName: opportunityData.opportunityName,
              customer: opportunityData.customer,
              receiver: opportunityData.owner
            }
          });
        } catch (error) {
          console.error('消息通知失败:', error);
        }
      }

      // 直接保存，不弹出提示
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('创建商机失败:', error);
      alert('创建商机失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">新建商机</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 商机名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商机名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="输入商机名称"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* 商机阶段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商机阶段 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value as OpportunityStage })}
              className={`w-full px-3 py-2 border ${errors.stage ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
            >
              {opportunityStages.length === 0 ? (
                <option value="">加载中...</option>
              ) : (
                <>
                  <option value="">请选择商机阶段</option>
                  {opportunityStages.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </>
              )}
            </select>
            {errors.stage && <p className="mt-1 text-sm text-red-500">{errors.stage}</p>}
            <p className="mt-1 text-xs text-gray-500">商机阶段可在系统设置中修改</p>
          </div>

          {/* 商机重要性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商机重要性 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as OpportunityLevel })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="重要">重要</option>
              <option value="一般">一般</option>
              <option value="潜在">潜在</option>
            </select>
          </div>

          {/* 客户名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              客户名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.customer ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
              placeholder="输入客户公司名称"
            />
            {errors.customer && <p className="mt-1 text-sm text-red-500">{errors.customer}</p>}
          </div>

          {/* 责任人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              责任人 <span className="text-red-500">*</span>
            </label>
            <div className={`px-3 py-2 bg-gray-50 border rounded-lg ${
              currentUser ? 'text-gray-900 border-gray-300' : 'text-gray-500 border-yellow-300 bg-yellow-50'
            }`}>
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <UserAvatar user={currentUser} size="xs" />
                  <span>{currentUser.name}</span>
                </div>
              ) : (
                <span>加载中...</span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">默认为商机创建人</p>
            {errors.owner && <p className="mt-1 text-sm text-red-500">{errors.owner}</p>}
          </div>

          {/* 商机描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商机描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="输入商机详细描述..."
            />
          </div>

          {/* 商机创建时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商机创建时间
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {formData.createdAt}
            </div>
            <p className="mt-1 text-xs text-gray-500">系统自动生成，不可编辑</p>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? '创建中...' : '创建商机'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
