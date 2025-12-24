import { useState, useEffect } from 'react';
import { X, Save, UserPlus, Package } from 'lucide-react';
import { app, db } from '../lib/cloudbase';
import CollaboratorSelector from './CollaboratorSelector';
import type { Project, ProjectStatus, ProjectPhase } from '../types/project';
import { UserAvatar } from './UserAvatar';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

interface DeliverableProduct {
  productType: string;
  quantity: number;
  unitPrice: number;
  estimatedCost: number;
  totalPrice: number;
}

export default function EditProjectModal({ project, onClose, onSuccess }: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: project.name || '',
    code: project.code || '',
    status: project.status || '项目未开始' as ProjectStatus,
    phase: project.phase || '需求分析' as ProjectPhase,
    customer: project.customer || '',
    contactPerson: project.contactPerson || '',
    contactPhone: project.contactPhone || '',
    startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    progress: project.progress || 0,
    description: project.description || '',
    requirements: project.requirements || '',
    owner: project.owner || '',
    members: project.members || [] as string[],
    opportunityId: project.opportunityId || '',
  });

  const [deliverables, setDeliverables] = useState<DeliverableProduct[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 从系统设置加载的项目状态和环节数据
  const [projectStatuses, setProjectStatuses] = useState<string[]>([]);
  const [preparationPhases, setPreparationPhases] = useState<string[]>([]);
  const [productionPhases, setProductionPhases] = useState<string[]>([]);
  const [deliveryPhases, setDeliveryPhases] = useState<string[]>([]);
  const [currentPhaseOptions, setCurrentPhaseOptions] = useState<string[]>([]);
  const [showPhaseField, setShowPhaseField] = useState(false);
  const [productTypes, setProductTypes] = useState<string[]>([]); // 产品类型列表
  const [previousStatus, setPreviousStatus] = useState<string>(''); // 跟踪上一次的状态

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadOpportunities();
    parseExistingDeliverables();
    loadProjectSettings();
  }, []);
  
  // 当系统设置加载完成后，初始化阶段选项
  useEffect(() => {
    if (projectStatuses.length > 0) {
      // 初始化时根据项目当前状态设置阶段选项
      initializePhaseOptions(project.status);
      // 记录初始状态
      setPreviousStatus(project.status);
    }
  }, [projectStatuses, preparationPhases, productionPhases, deliveryPhases]);
  
  // 监听项目状态变化，更新项目进度和阶段选项
  useEffect(() => {
    if (projectStatuses.length > 0 && formData.status !== previousStatus && previousStatus !== '') {
      // 只有状态真正改变时才更新
      console.log('状态改变:', previousStatus, '->', formData.status);
      updateProgressAndPhaseOptions(formData.status);
      setPreviousStatus(formData.status);
    }
  }, [formData.status]);
  
  // 监听项目阶段变化，更新项目进度
  useEffect(() => {
    if (showPhaseField && formData.phase) {
      updateProgressByPhase(formData.status, formData.phase);
    }
  }, [formData.phase, showPhaseField]);
  
  // 初始化阶段选项（不改变进度）
  const initializePhaseOptions = (status: string) => {
    let newShowPhaseField = false;
    let newPhaseOptions: string[] = [];
    
    switch (status) {
      case '准备期':
        newShowPhaseField = true;
        newPhaseOptions = preparationPhases;
        break;
      case '制造期':
      case '生产期':
        newShowPhaseField = true;
        newPhaseOptions = productionPhases;
        break;
      case '交付期':
        newShowPhaseField = true;
        newPhaseOptions = deliveryPhases;
        break;
      default:
        newShowPhaseField = false;
        break;
    }
    
    setShowPhaseField(newShowPhaseField);
    setCurrentPhaseOptions(newPhaseOptions);
  };

  const parseExistingDeliverables = () => {
    if (!project.deliverables) return;
    
    try {
      const products = project.deliverables.split('\n\n').filter(p => p.trim());
      const parsed = products.map(product => {
        const lines = product.split('\n').filter(l => l.trim());
        const nameMatch = lines[0]?.match(/^\d+\.\s+(.+)$/);
        
        // 兼容新旧字段名称
        const quantityMatch = lines.find(l => l.includes('产品数量') || l.includes('需求数量'))?.match(/(\d+)\s*件/);
        const unitPriceMatch = lines.find(l => l.includes('单价') && !l.includes('预算'))?.match(/([\d.]+)\s*元/) 
          || lines.find(l => l.includes('预算单价'))?.match(/([\d.]+)\s*元/);
        const totalPriceMatch = lines.find(l => l.includes('总价'))?.match(/([\d.]+)\s*元/);
        const estimatedCostMatch = lines.find(l => l.includes('采购成本') || l.includes('预估成本'))?.match(/([\d.]+)\s*元/);
        
        return {
          productType: nameMatch?.[1] || '',
          quantity: parseInt(quantityMatch?.[1] || '0'),
          unitPrice: parseFloat(unitPriceMatch?.[1] || '0'),
          estimatedCost: parseFloat(estimatedCostMatch?.[1] || '0'),
          totalPrice: parseFloat(totalPriceMatch?.[1] || '0'),
        };
      });
      setDeliverables(parsed);
    } catch (error) {
      console.error('解析交付产品失败:', error);
    }
  };
  
  // 加载项目设置数据（状态和环节）
  const loadProjectSettings = async () => {
    try {
      const result = await db.collection('type_settings').get();
      
      // 默认值配置
      const defaults = {
        projectStatus: ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停'],
        preparation: ['物料采购', '样衣生产', '量体数据采集'],
        production: ['缝制生产', '质量检验', '产品入库'],
        delivery: ['物流配送', '产品交付', '售后服务'],
        productType: ['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']
      };
      
      // 初始化标记
      let foundProjectStatus = false;
      let foundPreparation = false;
      let foundProduction = false;
      let foundDelivery = false;
      let foundProductType = false;
      
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((item: any) => {
          if (item.values && Array.isArray(item.values)) {
            // 将TypeItem[]格式转换为string[]，只取启用的值
            const enabledValues = item.values
              .filter((v: any) => v.enabled !== false)
              .map((v: any) => typeof v === 'string' ? v : v.value);
            
            switch (item.type) {
              case 'projectStatus':
                if (enabledValues.length > 0) {
                  setProjectStatuses(enabledValues);
                  foundProjectStatus = true;
                }
                break;
              case 'preparation':
                if (enabledValues.length > 0) {
                  setPreparationPhases(enabledValues);
                  foundPreparation = true;
                }
                break;
              case 'production':
                if (enabledValues.length > 0) {
                  setProductionPhases(enabledValues);
                  foundProduction = true;
                }
                break;
              case 'delivery':
                if (enabledValues.length > 0) {
                  setDeliveryPhases(enabledValues);
                  foundDelivery = true;
                }
                break;
              case 'productType':
                if (enabledValues.length > 0) {
                  setProductTypes(enabledValues);
                  foundProductType = true;
                }
                break;
            }
          }
        });
      }
      
      // 如果数据库中没有数据，使用默认值
      if (!foundProjectStatus) {
        console.log('使用默认项目状态');
        setProjectStatuses(defaults.projectStatus);
      }
      if (!foundPreparation) {
        setPreparationPhases(defaults.preparation);
      }
      if (!foundProduction) {
        setProductionPhases(defaults.production);
      }
      if (!foundDelivery) {
        setDeliveryPhases(defaults.delivery);
      }
      if (!foundProductType) {
        console.log('使用默认产品类型');
        setProductTypes(defaults.productType);
      }
      
    } catch (error) {
      console.error('加载项目设置失败:', error);
      // 使用默认值
      setProjectStatuses(['未开始', '准备期', '制造期', '交付期', '已完成', '暂停']);
      setPreparationPhases(['物料采购', '样衣生产', '量体数据采集']);
      setProductionPhases(['缝制生产', '质量检验', '产品入库']);
      setDeliveryPhases(['物流配送', '产品交付', '售后服务']);
      setProductTypes(['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']);
    }
  };
  
  // 根据项目状态更新进度和阶段选项
  const updateProgressAndPhaseOptions = (status: string) => {
    let newProgress = formData.progress;
    let newShowPhaseField = false;
    let newPhaseOptions: string[] = [];
    let resetPhase = false;
    
    switch (status) {
      case '准备期':
        // 准备期初始进度为5%（准备期最小值）
        newProgress = 5;
        newShowPhaseField = true;
        newPhaseOptions = preparationPhases;
        resetPhase = true;
        break;
      case '制造期':
      case '生产期':
        newProgress = 30; // 变更为生产期时，自动设为30%
        newShowPhaseField = true;
        newPhaseOptions = productionPhases;
        resetPhase = true;
        break;
      case '交付期':
        newProgress = 80; // 变更为交付期时，自动设为80%
        newShowPhaseField = true;
        newPhaseOptions = deliveryPhases;
        resetPhase = true;
        break;
      case '已完成':
        newProgress = 100;
        newShowPhaseField = false;
        break;
      case '暂停':
        // 保持当前进度不变
        newShowPhaseField = false;
        break;
      default:
        // 未开始等其他状态
        newProgress = 0;
        newShowPhaseField = false;
        break;
    }
    
    setShowPhaseField(newShowPhaseField);
    setCurrentPhaseOptions(newPhaseOptions);
    setFormData(prev => ({
      ...prev,
      progress: newProgress,
      phase: resetPhase ? '' : prev.phase // 状态改变时清空阶段选择
    }));
  };
  
  // 根据项目状态和阶段更新进度
  const updateProgressByPhase = (status: string, phase: string) => {
    let newProgress = formData.progress;
    let phaseList: string[] = [];
    let minProgress = 0;
    let maxProgress = 0;
    
    switch (status) {
      case '准备期':
        phaseList = preparationPhases;
        minProgress = 5;
        maxProgress = 25;
        break;
      case '制造期':
      case '生产期':
        phaseList = productionPhases;
        minProgress = 30;
        maxProgress = 75;
        break;
      case '交付期':
        phaseList = deliveryPhases;
        minProgress = 80;
        maxProgress = 95;
        break;
      default:
        return;
    }
    
    // 查找当前阶段的索引
    const phaseIndex = phaseList.indexOf(phase);
    if (phaseIndex === -1) return;
    
    // 计算该阶段对应的进度
    const phaseCount = phaseList.length;
    const progressRange = maxProgress - minProgress;
    const progressPerPhase = Math.floor(progressRange / phaseCount);
    
    // 计算当前阶段的进度（取整）
    newProgress = Math.floor(minProgress + progressPerPhase * (phaseIndex + 1));
    
    setFormData(prev => ({
      ...prev,
      progress: newProgress
    }));
  };

  const loadCurrentUser = async () => {
    try {
      const loginUser = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(loginUser);
    } catch (error) {
      console.error('加载当前用户失败:', error);
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

  const loadOpportunities = async () => {
    try {
      const cmd = db.command;
      const result = await db.collection('opportunities')
        .where({
          isDeleted: cmd.neq(true),
          isClosed: cmd.neq(true),
        })
        .orderBy('createdAt', 'desc')
        .get();
      setOpportunities(result.data || []);
    } catch (error) {
      console.error('加载商机列表失败:', error);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = '项目名称不能为空';
    if (!formData.customer.trim()) newErrors.customer = '客户名称不能为空';
    if (!formData.startDate) newErrors.startDate = '项目立项日期不能为空';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, {
      productType: '',
      quantity: '' as any, // 默认为空
      unitPrice: '' as any, // 默认为空
      estimatedCost: '' as any, // 默认为空
      totalPrice: 0,
    }]);
  };

  const updateDeliverable = (index: number, field: keyof DeliverableProduct, value: string | number) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [field]: value };
    
    // 自动计算总价
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = typeof updated[index].quantity === 'number' ? updated[index].quantity : 0;
      const price = typeof updated[index].unitPrice === 'number' ? updated[index].unitPrice : 0;
      updated[index].totalPrice = qty * price;
    }
    
    setDeliverables(updated);
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };
  
  // 计算总体销售额、毛利润和毛利率
  const calculateFinancials = () => {
    const totalSales = deliverables.reduce((sum, product) => sum + (product.totalPrice || 0), 0);
    const totalCost = deliverables.reduce((sum, product) => {
      const qty = typeof product.quantity === 'number' ? product.quantity : 0;
      const cost = typeof product.estimatedCost === 'number' ? product.estimatedCost : 0;
      return sum + (qty * cost);
    }, 0);
    const grossProfit = totalSales - totalCost;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    
    return {
      totalSales,
      totalCost,
      grossProfit,
      grossProfitMargin
    };
  };

  const serializeDeliverables = (): string => {
    return deliverables
      .filter(d => d.productType.trim())
      .map((d, index) => {
        // 处理空值：如果是空字符串或undefined，使用0
        const qty = typeof d.quantity === 'number' ? d.quantity : (d.quantity === '' ? 0 : parseFloat(String(d.quantity)) || 0);
        const price = typeof d.unitPrice === 'number' ? d.unitPrice : (d.unitPrice === '' ? 0 : parseFloat(String(d.unitPrice)) || 0);
        const cost = typeof d.estimatedCost === 'number' ? d.estimatedCost : (d.estimatedCost === '' ? 0 : parseFloat(String(d.estimatedCost)) || 0);
        const total = typeof d.totalPrice === 'number' ? d.totalPrice : 0;
        
        return `${index + 1}. ${d.productType}
产品数量: ${qty} 件
单价: ${price.toFixed(2)} 元
采购成本: ${cost.toFixed(2)} 元
总价: ${total.toFixed(2)} 元`;
      })
      .join('\n\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    // 验证：如果原项目状态是"完成"，检查是否尝试修改阶段或环节
    if (project.status === '完成') {
      if (formData.status !== project.status || formData.phase !== project.phase) {
        alert('⚠️ 项目阶段已完成，不可再变更阶段或环节');
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const deliverablesStr = serializeDeliverables();
      
      // 调试日志：打印要保存的数据
      console.log('📝 保存项目数据:', {
        status: formData.status,
        phase: formData.phase,
        progress: formData.progress,
        fullFormData: formData
      });
      
      await db.collection('projects').doc(project._id).update({
        ...formData,
        deliverables: deliverablesStr,
        updatedAt: new Date(),
      });

      // 如果状态改变,发送通知给负责人
      if (project.status !== formData.status && formData.owner !== currentUser._id) {
        try {
          await app.callFunction({
            name: 'project-message',
            data: {
              action: 'statusChange',
              projectId: project._id,
              projectName: formData.name,
              newStatus: formData.status,
              receiver: formData.owner
            }
          });
        } catch (error) {
          console.error('状态变更通知失败:', error);
        }
      }

      console.log('✅ 项目更新成功，已保存到数据库');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('更新项目失败:', error);
      alert('更新项目失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">编辑项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 项目基本信息 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">项目基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
                  placeholder="输入项目名称"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目编号</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="如: PRJ-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目阶段 <span className="text-red-500">*</span>
                  {formData.status === '完成' && (
                    <span className="ml-2 text-xs text-green-600">(项目阶段已完成，不可再变更)</span>
                  )}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                  disabled={projectStatuses.length === 0 || formData.status === '完成'}
                >
                  {projectStatuses.length === 0 ? (
                    <option value="">加载中...</option>
                  ) : (
                    projectStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))
                  )}
                </select>
                {projectStatuses.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">正在加载项目阶段数据...</p>
                )}
                {formData.status === '完成' && (
                  <p className="mt-1 text-xs text-green-600">⚠️ 项目阶段已设置为"完成"，不可再变更</p>
                )}
              </div>

              {showPhaseField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目环节 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value as ProjectPhase })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择项目环节</option>
                    {currentPhaseOptions.map(phase => (
                      <option key={phase} value={phase}>{phase}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目进度 (自动计算)</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed">
                  {formData.progress}%
                </div>
                <p className="mt-1 text-xs text-gray-500">项目进度根据状态和阶段自动计算，不可手动修改</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目经理 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} {user.role === 'admin' ? '(管理员)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目立项日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">立项日期不可修改</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计划交付日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目关联商机</label>
                <select
                  value={formData.opportunityId}
                  onChange={(e) => {
                    const selectedOpp = opportunities.find(o => o._id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      opportunityId: e.target.value,
                      customer: selectedOpp?.customerName || formData.customer
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未知</option>
                  {opportunities.map(opp => (
                    <option key={opp._id} value={opp._id}>
                      {opp.name} - {opp.customerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 客户信息 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  客户名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className={`w-full px-3 py-2 border ${errors.customer ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
                  placeholder="输入客户名称"
                />
                {errors.customer && <p className="mt-1 text-sm text-red-500">{errors.customer}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">对接人</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="输入对接人姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="输入联系电话"
                />
              </div>
            </div>
          </div>

          {/* 协同人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">协同人</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMemberSelector(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
              >
                <UserPlus className="w-5 h-5" />
                <span>选择协同人</span>
              </button>

              {formData.members.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      已选择 {formData.members.length} 位协同人
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, members: [] })}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.members.map(memberId => {
                      const user = users.find(u => u._id === memberId);
                      if (!user) return null;
                      return (
                        <div
                          key={user._id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm"
                        >
                          <UserAvatar user={user} size="xs" />
                          <span className="text-gray-900">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                members: formData.members.filter(id => id !== user._id)
                              });
                            }}
                            className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 项目交付产品 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">项目交付产品</h3>
              <button
                type="button"
                onClick={addDeliverable}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                添加产品
              </button>
            </div>

            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>暂无交付产品，点击"添加产品"按钮添加</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((product, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-6 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">产品类别</label>
                        <select
                          value={product.productType}
                          onChange={(e) => updateDeliverable(index, 'productType', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择</option>
                          {productTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">产品数量</label>
                        <input
                          type="number"
                          min="0"
                          value={product.quantity === '' ? '' : product.quantity}
                          onChange={(e) => updateDeliverable(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="数量"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">单价 (¥)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.unitPrice === '' ? '' : product.unitPrice}
                          onChange={(e) => updateDeliverable(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="单价"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">采购成本 (¥)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.estimatedCost === '' ? '' : product.estimatedCost}
                          onChange={(e) => updateDeliverable(index, 'estimatedCost', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="成本"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">总价 (¥)</label>
                        <div className="px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm font-semibold text-blue-600">
                          {product.totalPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeDeliverable(index)}
                          className="w-full px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 财务统计 */}
            {deliverables.length > 0 && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded"></span>
                  财务统计
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">总体销售额</div>
                    <div className="text-lg font-bold text-blue-600">
                      ¥ {calculateFinancials().totalSales.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">总采购成本</div>
                    <div className="text-lg font-bold text-orange-600">
                      ¥ {calculateFinancials().totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">毛利润</div>
                    <div className={`text-lg font-bold ${calculateFinancials().grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥ {calculateFinancials().grossProfit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">毛利率</div>
                    <div className={`text-lg font-bold ${calculateFinancials().grossProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateFinancials().grossProfitMargin.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 项目备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目备注</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="输入项目备注信息..."
            />
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
              <span>{submitting ? '保存中...' : '保存修改'}</span>
            </button>
          </div>
        </form>

        {/* 成员选择器 */}
        {showMemberSelector && (
          <CollaboratorSelector
            selectedIds={formData.members}
            excludeIds={formData.owner ? [formData.owner] : []}
            onConfirm={(selectedIds) => {
              setFormData({ ...formData, members: selectedIds });
            }}
            onClose={() => setShowMemberSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
