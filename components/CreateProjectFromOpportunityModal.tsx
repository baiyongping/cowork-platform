import { useState, useEffect } from 'react';
import { X, Save, CheckCircle } from 'lucide-react';
import { db } from '../lib/cloudbase';

interface CreateProjectFromOpportunityModalProps {
  opportunity: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectFromOpportunityModal({
  opportunity,
  onClose,
  onSuccess,
}: CreateProjectFromOpportunityModalProps) {
  const [projectManager, setProjectManager] = useState(opportunity.owner); // 默认为商机负责人
  const [users, setUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await db.collection('users').get();
      setUsers(result.data || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const handleConfirm = async () => {
    if (!projectManager) {
      alert('请选择项目经理');
      return;
    }

    setSubmitting(true);
    try {
      // 创建项目
      const today = new Date().toISOString().split('T')[0];
      
      // 构建协同人列表：包含商机负责人（如果不是项目经理）和原有协同人
      let members = [...(opportunity.collaborators || [])];
      if (opportunity.owner !== projectManager && !members.includes(opportunity.owner)) {
        members.push(opportunity.owner); // 将商机负责人添加为协同人
      }

      // 将商机需求转换为项目交付产品格式
      let deliverables = '';
      if (opportunity.requirements && opportunity.requirements.length > 0) {
        deliverables = opportunity.requirements.map((req: any, index: number) => {
          return `${index + 1}. ${req.productType}
   - 需求数量：${req.quantity} 件
   - 预算单价：${req.unitPrice.toFixed(2)} 元
   - 总价：${req.totalPrice.toFixed(2)} 元`;
        }).join('\n\n');
      }

      const projectData = {
        name: opportunity.name, // 继承商机名称
        code: '', // 项目编号默认为空
        type: '定制项目' as const,
        status: '项目未开始' as const, // 项目状态固定为"项目未开始"
        phase: '需求分析' as const,
        priority: '中' as const,
        progress: 0,
        owner: projectManager, // 使用确认的项目经理
        members: members, // 协同人列表
        startDate: today, // 项目立项日期为当前日期
        endDate: opportunity.expectedCloseDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        budget: opportunity.estimatedAmount || 0,
        actualCost: 0,
        customer: opportunity.customer, // 客户名称为成交商机的客户名称
        contactPerson: opportunity.contactPerson || '',
        contactPhone: opportunity.contactPhone || '',
        opportunityId: opportunity._id, // 项目关联商机为当前成交商机
        description: opportunity.description || `由商机"${opportunity.name}"形成的项目`,
        requirements: opportunity.description || '',
        deliverables: deliverables, // 从商机需求转换而来的交付产品
        notes: `由商机"${opportunity.name}"形成`,
        isPublic: opportunity.isPublic !== false,
        createdBy: projectManager,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const projectResult = await db.collection('projects').add(projectData);

      // 更新商机的 projectId 字段，标记已形成项目
      await db.collection('opportunities').doc(opportunity._id).update({
        projectId: projectResult.id, // 使用新创建的项目ID
        updatedAt: new Date(),
      });

      alert('✅ 项目创建成功！');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('创建项目失败:', error);
      alert('创建项目失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取商机负责人姓名
  const getOwnerName = () => {
    const owner = users.find(u => u._id === opportunity.owner);
    return owner ? owner.name : '未知';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">形成项目</h2>
              <p className="text-sm text-gray-500">确认项目信息</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 内容 - 可滚动区域 */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 商机信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>商机成交信息</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">商机名称：</span>
                <span className="text-gray-900 font-medium">{opportunity.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">客户名称：</span>
                <span className="text-gray-900 font-medium">{opportunity.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">商机负责人：</span>
                <span className="text-gray-900 font-medium">{getOwnerName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">预计金额：</span>
                <span className="text-gray-900 font-medium">{opportunity.estimatedAmount?.toFixed(2) || '0.00'} 万元</span>
              </div>
            </div>
          </div>

          {/* 项目经理选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目经理 <span className="text-red-500">*</span>
            </label>
            <select
              value={projectManager}
              onChange={(e) => setProjectManager(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} {user._id === opportunity.owner ? '(商机负责人)' : ''} {user.role === 'admin' ? '(管理员)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">默认：商机负责人</p>
          </div>

          {/* 说明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">项目创建说明</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 项目名称：继承商机名称</li>
              <li>• 项目编号：默认为空</li>
              <li>• 项目状态：项目未开始</li>
              <li>• 立项日期：当前日期</li>
              <li>• 客户名称：继承商机客户名称</li>
              <li>• 关联商机：当前成交商机</li>
              <li>• 协同人：包含商机负责人（如非项目经理）</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 - 固定在底部 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>创建中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>确认创建项目</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
