import { useState, useEffect } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import { db } from '../lib/cloudbase';
import CollaboratorSelector from './CollaboratorSelector';
import OpportunityRequirements from './OpportunityRequirements';
import type { Opportunity, OpportunityStage, OpportunityLevel, ProductType, OpportunityRequirement } from '../types/opportunity';

interface EditOpportunityModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOpportunityModal({ opportunity, onClose, onSuccess }: EditOpportunityModalProps) {
  // 判断商机是否已锁定（取消或失败，成交状态不锁定其他字段）
  const isLocked = opportunity.stage === '取消' || opportunity.stage === '失败';
  // 判断商机状态是否锁定（成交、取消、失败都锁定状态）
  const isStatusLocked = opportunity.stage === '成交' || opportunity.stage === '取消' || opportunity.stage === '失败';

  // 解析预计成交日期
  const parseExpectedCloseDate = (dateStr: string | Date) => {
    // 如果日期为空或无效，使用当前日期
    if (!dateStr) {
      const today = new Date().toISOString().split('T')[0];
      const [year, month] = today.split('-');
      return { year, month };
    }
    const dateString = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
    const [year, month] = dateString.split('T')[0].split('-');
    return { year, month };
  };

  const initialDate = parseExpectedCloseDate(opportunity.expectedCloseDate);

  const [formData, setFormData] = useState({
    name: opportunity.name,
    stage: opportunity.stage as OpportunityStage,
    level: opportunity.level as OpportunityLevel,
    customer: opportunity.customer,
    contactPerson: opportunity.contactPerson,
    contactPhone: opportunity.contactPhone,
    contactEmail: opportunity.contactEmail || '',
    estimatedAmount: opportunity.estimatedAmount, // 自动计算
    expectedCloseDate: opportunity.expectedCloseDate 
      ? (typeof opportunity.expectedCloseDate === 'string' 
          ? opportunity.expectedCloseDate.split('T')[0] 
          : new Date(opportunity.expectedCloseDate).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0], // 如果为空，默认当前日期
    probability: opportunity.probability,
    description: opportunity.description || '',
    owner: opportunity.owner,
    collaborators: opportunity.collaborators || [] as string[],
    isPublic: opportunity.isPublic !== false
  });

  // 独立管理年月选择器
  const [selectedYear, setSelectedYear] = useState(initialDate.year);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.month);

  const [requirements, setRequirements] = useState<OpportunityRequirement[]>(
    opportunity.requirements || []
  ); // 商机需求列表
  const [users, setUsers] = useState<any[]>([]);
  const [showCollaboratorSelector, setShowCollaboratorSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);

  // 生成年份和月份选项
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    return { value: month, label: `${i + 1}月` };
  });

  useEffect(() => {
    loadUsers();
    loadOpportunityStages();
  }, []);

  // 监听年月变化，更新 formData
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      setFormData(prev => ({
        ...prev,
        expectedCloseDate: `${selectedYear}-${selectedMonth}-01`
      }));
    }
  }, [selectedYear, selectedMonth]);

  // 加载商机阶段设置
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

  const loadUsers = async () => {
    try {
      const result = await db.collection('users').get();
      setUsers(result.data || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = '商机名称不能为空';
    if (!formData.customer.trim()) newErrors.customer = '客户名称不能为空';
    if (!formData.stage) newErrors.stage = '请选择商机阶段';
    if (!formData.owner) newErrors.owner = '请选择负责人';
    // 预计金额验证：如果有商机需求，则金额必须大于0；如果没有需求，则允许为0
    if (requirements.length > 0 && formData.estimatedAmount <= 0) {
      newErrors.estimatedAmount = '请至少添加一条产品需求';
    }
    // 预计成交日期改为非必填
    // if (!formData.expectedCloseDate) newErrors.expectedCloseDate = '预计成交日期不能为空';
    if (formData.probability < 0 || formData.probability > 100) {
      newErrors.probability = '成交概率必须在0-100之间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      // 滚动到第一个错误位置
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const errorElement = document.querySelector(`[name="${firstErrorKey}"]`);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);

      // 更新商机，去掉已删除的字段
      await db.collection('opportunities').doc(opportunity._id).update({
        ...formData,
        requirements: requirements, // 商机需求列表
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('更新商机失败:', error);
      alert('更新商机失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">编辑商机</h2>
              {isLocked && (
                <p className="mt-1 text-sm text-red-600 font-medium">
                  ⚠️ 该商机已{opportunity.stage}，所有字段已锁定，无法修改
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 商机名称 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商机名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLocked}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                  placeholder="输入商机名称"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* 商机阶段 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商机阶段 <span className="text-red-500">*</span>
                </label>
                {/* 当商机状态为"成交"、"取消"或"失败"时，状态不可修改 */}
                {isStatusLocked ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                    {formData.stage}
                  </div>
                ) : (
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as OpportunityStage })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {opportunityStages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                )}
                {isStatusLocked && (
                  <p className="mt-1 text-xs text-gray-500">商机状态已锁定，不可修改</p>
                )}
              </div>

              {/* 商机重要性 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商机重要性 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as OpportunityLevel })}
                  disabled={isLocked}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="重要">重要</option>
                  <option value="一般">一般</option>
                  <option value="潜在">潜在</option>
                </select>
              </div>

              {/* 预计金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预计金额(万元)
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold">
                  ¥{(formData.estimatedAmount / 10000).toFixed(2)}万
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {isLocked ? '已锁定，无法修改' : '自动计算为商机需求总价合计'}
                </p>
                {errors.estimatedAmount && <p className="mt-1 text-sm text-red-500">{errors.estimatedAmount}</p>}
              </div>
            </div>

            {/* 客户信息 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* 客户名称 */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    客户名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    disabled={isLocked}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.customer ? 'border-red-500' : 'border-gray-300'
                    } ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="输入客户公司名称"
                  />
                  {errors.customer && <p className="mt-1 text-sm text-red-500">{errors.customer}</p>}
                </div>
              </div>
            </div>

            {/* 商机需求 */}
            <OpportunityRequirements
              opportunityId={opportunity._id}
              requirements={requirements}
              onUpdate={(updatedReqs, totalAmount) => {
                setRequirements(updatedReqs);
                setFormData({ ...formData, estimatedAmount: totalAmount });
              }}
              readOnly={isLocked}
            />

            {/* 商机备忘 */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商机备忘
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isLocked}
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                }`}
                placeholder="输入商机备忘信息..."
              />
            </div>

            {/* 商机进展 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">商机进展</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* 成交概率 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    成交概率(%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.probability === 0 ? '' : formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    onFocus={(e) => { if (formData.probability === 0) e.target.value = ''; }}
                    disabled={isLocked}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.probability ? 'border-red-500' : 'border-gray-300'
                    } ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="请输入成交概率 (0-100)"
                    min="0"
                    max="100"
                  />
                  {errors.probability && <p className="mt-1 text-sm text-red-500">{errors.probability}</p>}
                </div>

                {/* 预计成交日期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预计成交日期
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 年份选择 */}
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      disabled={isLocked}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.expectedCloseDate ? 'border-red-500' : 'border-gray-300'
                      } ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      {yearOptions.map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>

                    {/* 月份选择 */}
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      disabled={isLocked}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.expectedCloseDate ? 'border-red-500' : 'border-gray-300'
                      } ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      {monthOptions.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {errors.expectedCloseDate && <p className="mt-1 text-sm text-red-500">{errors.expectedCloseDate}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {isLocked ? '已锁定，无法修改' : '选择预计成交的年份和月份'}
                  </p>
                </div>
              </div>
            </div>

            {/* 负责人和协同人 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">负责人信息</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* 负责人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    负责人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    disabled={isLocked}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  >
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 协同人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    协同人
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCollaboratorSelector(true)}
                    disabled={isLocked}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors flex items-center justify-between ${
                      isLocked 
                        ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-gray-600">
                      {formData.collaborators.length > 0
                        ? `已选择 ${formData.collaborators.length} 人`
                        : '选择协同人'}
                    </span>
                    <UserPlus className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* 可见性设置 */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                可见性设置
              </label>
              <div className="space-y-3">
                {/* 团队可见 */}
                <label className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all ${
                  isLocked 
                    ? 'cursor-not-allowed bg-gray-50' 
                    : 'cursor-pointer hover:bg-blue-50 hover:border-blue-300'
                } has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.isPublic === true}
                    onChange={() => setFormData({ ...formData, isPublic: true })}
                    disabled={isLocked}
                    className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">团队可见</div>
                    <div className="text-xs text-gray-500 mt-1">
                      所有团队成员都可以查看此商机
                    </div>
                  </div>
                </label>

                {/* 不公开 */}
                <label className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all ${
                  isLocked 
                    ? 'cursor-not-allowed bg-gray-50' 
                    : 'cursor-pointer hover:bg-orange-50 hover:border-orange-300'
                } has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.isPublic === false}
                    onChange={() => setFormData({ ...formData, isPublic: false })}
                    disabled={isLocked}
                    className="mt-0.5 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">不公开</div>
                    <div className="text-xs text-gray-500 mt-1">
                      仅商机负责人、协同人、部门负责人和管理员可见
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLocked ? '关闭' : '取消'}
              </button>
              {!isLocked && (
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim() || !formData.customer.trim() || !formData.stage || !formData.owner}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={(!formData.name.trim() || !formData.customer.trim() || !formData.stage || !formData.owner) ? '请填写所有必填项' : ''}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      保存修改
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* 协同人选择器 */}
      {showCollaboratorSelector && (
        <CollaboratorSelector
          selectedIds={formData.collaborators}
          onConfirm={(ids) => {
            setFormData({ ...formData, collaborators: ids });
            setShowCollaboratorSelector(false);
          }}
          onClose={() => setShowCollaboratorSelector(false)}
        />
      )}
    </>
  );
}

