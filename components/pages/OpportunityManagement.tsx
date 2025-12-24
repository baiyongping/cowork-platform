import { useState, useEffect } from 'react';
import { Plus, Search, Filter, TrendingUp, DollarSign, Users, Calendar, CheckCircle, Edit, Trash2, ListTodo, Target, MessageSquare, UserCheck } from 'lucide-react';
import { app, db, auth } from '../../lib/cloudbase';
import CreateOpportunityModal from '../CreateOpportunityModal';
import OpportunityDetailModal from '../OpportunityDetailModal';
import OpportunityRecycleBin from '../OpportunityRecycleBin';
import { buildQueryConditions } from '../../utils/permission';
import { usePermissionContext } from '../../contexts/PermissionContext';
import type { 
  Opportunity, 
  OpportunityStage, 
  OpportunityLevel, 
  ProductType,
  OpportunityStatistics
} from '../../types/opportunity';

interface OpportunityManagementProps {
  userRole: 'admin' | 'user';
  currentUserId: string;
  openOpportunityId?: string;  // 🔧 要打开的商机ID
  onOpportunityOpened?: () => void;  // 🔧 打开后的回调
}

export function OpportunityManagement({ userRole, currentUserId, openOpportunityId, onOpportunityOpened }: OpportunityManagementProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<OpportunityStatistics>({
    total: 0,
    byStage: {},
    totalAmount: 0,
    closedAmount: 0,
  });
  
  // 使用新权限系统
  const { checkPermission, userPermissions } = usePermissionContext();
  
  // 商机阶段列表（从系统设置加载）
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]);
  
  // 所有负责人列表（用于筛选）
  const [allOwners, setAllOwners] = useState<Array<{ _id: string; name: string }>>([]);

  // 筛选条件
  const [filters, setFilters] = useState({
    stage: 'all' as OpportunityStage | 'all',
    owner: 'all' as string,
    keyword: '',
  });

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  
  // 加载商机阶段设置
  const loadOpportunityStages = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      if (result.data && result.data.length > 0) {
        // 支持旧格式（string[]）和新格式（TypeItem[]）
        const values = result.data[0].values;
        console.log('📊 商机阶段原始数据:', values);
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            // 旧格式：直接使用字符串数组
            console.log('✅ 使用旧格式（字符串数组）');
            setOpportunityStages(values);
          } else {
            // 新格式：提取enabled=true的value
            const enabledStages = values.filter((item: any) => item.enabled).map((item: any) => item.value);
            console.log('✅ 使用新格式（TypeItem数组），提取启用的阶段:', enabledStages);
            setOpportunityStages(enabledStages);
          }
        } else {
          // 数据为空，使用默认值并保存到数据库
          const defaultStages = ['跟进线索', '方案咨询', '商务谈判'];
          setOpportunityStages(defaultStages);
          await db.collection('type_settings').add({
            type: 'opportunity',
            values: defaultStages.map(v => ({ value: v, enabled: true })),
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('商机阶段设置已初始化到数据库');
        }
      } else {
        // 数据库中没有记录，创建并保存默认值
        const defaultStages = ['跟进线索', '方案咨询', '商务谈判'];
        setOpportunityStages(defaultStages);
        await db.collection('type_settings').add({
          type: 'opportunity',
          values: defaultStages.map(v => ({ value: v, enabled: true })),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('商机阶段设置已初始化到数据库');
      }
    } catch (error) {
      console.error('加载商机阶段设置失败:', error);
      setOpportunityStages(['跟进线索', '方案咨询', '商务谈判']);
    }
  };

  // 加载商机列表
  const loadOpportunities = async () => {
    setLoading(true);
    try {
      // 获取当前用户信息
      const currentUserStr = localStorage.getItem('current_user');
      let currentUserId = '';
      let currentUserRole = '';
      
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        currentUserId = currentUser.userId;
        // 🔧 关键修复：优先使用roles数组，兼容旧的role字段
        // 如果用户有admin角色，则role应该是'admin'
        if (currentUser.roles && Array.isArray(currentUser.roles)) {
          currentUserRole = currentUser.roles.includes('admin') ? 'admin' : (currentUser.roles[0] || currentUser.role || '');
        } else {
          currentUserRole = currentUser.role || '';
        }
      }
      
      // 使用权限工具构建查询条件
      const queryConditions = await buildQueryConditions(currentUserId, currentUserRole, db);
      
      // 应用筛选条件（排除已删除的商机）
      const where: any = {
        isDeleted: db.command.neq(true),
        ...queryConditions
      };
      
      if (filters.stage !== 'all') {
        where.stage = filters.stage;
      }
      if (filters.owner !== 'all') {
        where.owner = filters.owner;
      }

      const { data } = await db.collection('opportunities')
        .where(where)
        .orderBy('updatedAt', 'desc')
        .get();

      // 同时查询本年度所有商机（用于统计卡片，也应用权限过滤）
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
      
      const yearDataResult = await db.collection('opportunities')
        .where({
          isDeleted: db.command.neq(true),
          createdAt: db.command.gte(yearStart).and(db.command.lte(yearEnd)),
          ...queryConditions
        })
        .get();

      // 关联查询负责人信息
      const enrichedData = await Promise.all(
        data.map(async (opp: any) => {
          try {
            // 修复：使用 where 查询而不是 doc
            let ownerName = '未知';
            if (opp.owner) {
              const ownerRes = await db.collection('users').where({ _id: opp.owner }).get();
              if (ownerRes.data && ownerRes.data.length > 0) {
                ownerName = ownerRes.data[0].name;
              }
            }

            // 查询协同人信息
            let collaboratorNames: string[] = [];
            if (opp.collaborators && opp.collaborators.length > 0) {
              const collabRes = await db
                .collection('users')
                .where({
                  _id: db.command.in(opp.collaborators),
                })
                .get();
              collaboratorNames = collabRes.data.map((u: any) => u.name);
            }

            // 查询所有关联的跟进任务数(不限状态)
            const tasksRes = await db
              .collection('tasks')
              .where({
                relatedTo: opp._id,
                type: '商机跟进',
                isDeleted: db.command.neq(true)
              })
              .get();

            return {
              ...opp,
              ownerName,
              collaboratorNames,
              relatedTasksCount: tasksRes.data?.length || 0
            };
          } catch (error) {
            console.error('查询用户信息失败:', error);
            return {
              ...opp,
              ownerName: '未知',
              collaboratorNames: [],
              relatedTasksCount: 0
            };
          }
        })
      );

      // 关键词搜索
      let filteredData = enrichedData;
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        filteredData = enrichedData.filter((opp) =>
          opp.name.toLowerCase().includes(keyword) ||
          opp.customer.toLowerCase().includes(keyword)
        );
      }

      setOpportunities(filteredData);

      // 提取所有唯一的负责人
      const ownersMap = new Map<string, string>();
      filteredData.forEach((opp: any) => {
        if (opp.owner) {
          ownersMap.set(opp.owner, opp.ownerName);
        }
      });
      const owners = Array.from(ownersMap.entries()).map(([_id, name]) => ({ _id, name }));
      setAllOwners(owners);

      // 计算统计数据（使用本年度数据）
      calculateStatistics(filteredData, yearDataResult.data || []);
    } catch (error) {
      console.error('加载商机列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStatistics = (displayData: Opportunity[], yearData: any[]) => {
    const byStage: Record<string, { count: number; amount: number }> = {};
    
    // 按阶段统计（使用本年度数据）
    opportunityStages.forEach(stage => {
      const stageOpportunities = yearData.filter(o => o.stage === stage);
      byStage[stage] = {
        count: stageOpportunities.length,
        amount: stageOpportunities.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0)
      };
    });
    
    // 单独统计"成交"阶段（使用 stage = "成交" 的所有商机，不限年度）
    const closedOpportunities = yearData.filter(o => o.stage === '成交');
    byStage['成交'] = {
      count: closedOpportunities.length,
      amount: closedOpportunities.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0)
    };
    
    const stats: OpportunityStatistics = {
      total: displayData.length, // 当前筛选结果的总数
      byStage, // 各阶段数量和金额
      totalAmount: displayData.reduce((sum, o) => sum + o.estimatedAmount, 0),
      closedAmount: closedOpportunities.reduce((sum, o) => sum + (o.estimatedAmount || 0), 0),
    };
    setStatistics(stats);
  };

  useEffect(() => {
    loadOpportunityStages();
  }, []);

  useEffect(() => {
    if (opportunityStages.length > 0) {
      loadOpportunities();
    }
  }, [filters, opportunityStages]);

  // 🔧 自动打开指定的商机详情
  useEffect(() => {
    console.log('🔧 [OpportunityManagement] 检查自动打开:', { openOpportunityId, opportunitiesCount: opportunities.length });
    if (openOpportunityId && opportunities.length > 0) {
      const opportunityToOpen = opportunities.find(o => o._id === openOpportunityId);
      console.log('🔧 [OpportunityManagement] 找到商机:', opportunityToOpen);
      if (opportunityToOpen) {
        setSelectedOpportunity(opportunityToOpen);
        setShowDetailModal(true);
        onOpportunityOpened?.();  // 通知父组件已打开
        console.log('✅ [OpportunityManagement] 已打开商机详情');
      } else {
        console.warn('⚠️ [OpportunityManagement] 未找到商机:', openOpportunityId);
      }
    }
  }, [openOpportunityId, opportunities]);

  // 直接更新商机阶段
  const handleUpdateOpportunityStage = async (oppId: string, newStage: string) => {
    try {
      // 先获取商机详情
      const oppResult = await db.collection('opportunities').doc(oppId).get();
      const opportunity = oppResult.data;
      
      if (!opportunity) {
        console.error('商机不存在');
        return;
      }

      // 如果是修改为"成交"阶段，需要特殊处理
      if (newStage === '成交') {
        // 检查当前阶段是否已经是成交
        if (opportunity.stage === '成交') {
          console.log('该商机已经是成交状态，无法再次修改');
          return;
        }
        
        // 直接执行成交逻辑，不弹出确认对话框
        await handleOpportunityClose(oppId, opportunity);
      } else if (newStage === '取消' || newStage === '失败') {
        // 处理取消或失败阶段
        await handleOpportunityCancelOrFail(oppId, opportunity, newStage);
      } else {
        // 检查商机是否已成交，如果已成交则不允许修改
        if (opportunity.stage === '成交') {
          console.log('该商机已成交，状态已锁定，不能修改');
          return;
        }
        
        // 检查商机是否已取消或失败，如果是则不允许修改
        if (opportunity.stage === '取消' || opportunity.stage === '失败') {
          console.log('该商机已取消或失败，状态已锁定，不能修改');
          return;
        }
        
        // 普通状态更新
        setLoading(true);
        await db.collection('opportunities').doc(oppId).update({
          stage: newStage,
          updatedAt: new Date(),
        });

        // 发送状态变更通知
        if (opportunity.owner !== currentUserId) {
          try {
            await app.callFunction({
              name: 'opportunity-message',
              data: {
                action: 'statusChange',
                opportunityId: oppId,
                opportunityName: opportunity.opportunityName,
                customer: opportunity.customer,
                newStatus: newStage,
                receiver: opportunity.owner
              }
            });
          } catch (error) {
            console.error('消息通知失败:', error);
          }
        }
        
        // 重新加载商机列表
        await loadOpportunities();
      }
    } catch (error) {
      console.error('更新商机阶段失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理商机成交
  const handleOpportunityClose = async (oppId: string, opportunity: any) => {
    setLoading(true);
    try {
      // 获取当前日期字符串 (YYYY-MM-DD)
      const currentDate = new Date();
      const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      // 获取预期成交日期
      const expectedDate = opportunity.expectedCloseDate;
      
      // 如果预期成交日期晚于当前时间，使用当前时间；否则使用预期成交日期
      let closedAtDate = currentDateStr;
      if (expectedDate && new Date(expectedDate) <= currentDate) {
        closedAtDate = expectedDate;
      }
      
      console.log('✅ 商机成交，设置成交时间:', closedAtDate);
      
      // 1. 更新商机状态为成交
      await db.collection('opportunities').doc(oppId).update({
        stage: '成交',
        updatedAt: new Date(),
        closedAt: closedAtDate, // 添加成交时间（字符串格式）
        isClosed: true, // 添加成交标记
      });

      // 2. 更新销售目标的订单承揽额
      await updateSalesGoal(opportunity.estimatedAmount, opportunity.owner);

      // 3. 重新加载商机列表
      await loadOpportunities();
    } catch (error) {
      console.error('商机成交处理失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 处理商机取消或失败
  const handleOpportunityCancelOrFail = async (oppId: string, opportunity: any, newStage: '取消' | '失败') => {
    setLoading(true);
    try {
      // 更新商机状态为取消或失败
      await db.collection('opportunities').doc(oppId).update({
        stage: newStage,
        estimatedAmount: 0, // 预计金额置为0
        expectedCloseDate: '', // 预计成交时间置为空
        updatedAt: new Date(),
        cancelledAt: new Date(), // 添加取消/失败时间
        isCancelled: true, // 添加取消/失败标记
      });

      // 重新加载商机列表
      await loadOpportunities();
    } catch (error) {
      console.error('商机取消/失败处理失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 更新销售目标
  const updateSalesGoal = async (amount: number, ownerId: string) => {
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.floor((new Date().getMonth() / 3)) + 1;
      const quarterStr = `Q${currentQuarter}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';

      console.log(`📊 updateSalesGoal - 开始更新销售目标: 金额=${amount}元, 年份=${currentYear}, 季度=${quarterStr}`);

      // 查询当前季度的销售目标
      const goalResult = await db.collection('sales_goals')
        .where({
          year: currentYear,
          quarter: quarterStr,
          type: 'quarterly'
        })
        .get();

      console.log(`🔍 查询季度目标结果:`, goalResult);

      if (goalResult.data && goalResult.data.length > 0) {
        // 已存在，更新订单承揽实际值
        const goal = goalResult.data[0];
        const currentActual = goal.orderActual || 0;
        const newActual = currentActual + (amount / 10000); // 转换为万元

        console.log(`📝 更新季度目标: 当前值=${currentActual}, 新值=${newActual}, 目标ID=${goal._id}`);

        const updateResult = await db.collection('sales_goals').doc(goal._id).update({
          orderActual: newActual,
          updatedAt: new Date(),
        });
        
        console.log(`✅ 季度目标更新结果:`, updateResult);
        console.log(`✅ 已更新${currentYear}年${quarterStr}销售目标，订单承揽增加: ${(amount / 10000).toFixed(2)}万元`);
      } else {
        // 不存在，创建新的销售目标记录
        console.log(`⚠️ 未找到${currentYear}年${quarterStr}季度目标，将创建新记录`);
        
        const addResult = await db.collection('sales_goals').add({
          year: currentYear,
          quarter: quarterStr,
          type: 'quarterly',
          orderTarget: 0,
          orderActual: amount / 10000, // 转换为万元
          revenueTarget: 0,
          revenueActual: 0,
          createdBy: ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`✅ 季度目标创建结果:`, addResult);
        console.log(`✅ 已创建${currentYear}年${quarterStr}销售目标，订单承揽: ${(amount / 10000).toFixed(2)}万元`);
      }
      
      // 同时更新年度销售目标
      const annualGoalResult = await db.collection('sales_goals')
        .where({
          year: currentYear,
          type: 'annual'
        })
        .get();
      
      console.log(`🔍 查询年度目标结果:`, annualGoalResult);
      
      if (annualGoalResult.data && annualGoalResult.data.length > 0) {
        const annualGoal = annualGoalResult.data[0];
        const currentAnnualActual = annualGoal.orderActual || 0;
        const newAnnualActual = currentAnnualActual + (amount / 10000);
        
        console.log(`📝 更新年度目标: 当前值=${currentAnnualActual}, 新值=${newAnnualActual}, 目标ID=${annualGoal._id}`);
        
        const annualUpdateResult = await db.collection('sales_goals').doc(annualGoal._id).update({
          orderActual: newAnnualActual,
          updatedAt: new Date(),
        });
        
        console.log(`✅ 年度目标更新结果:`, annualUpdateResult);
        console.log(`✅ 已更新${currentYear}年度销售目标，订单承揽增加: ${(amount / 10000).toFixed(2)}万元`);
      } else {
        // 创建年度销售目标记录
        console.log(`⚠️ 未找到${currentYear}年度目标，将创建新记录`);
        
        const annualAddResult = await db.collection('sales_goals').add({
          year: currentYear,
          type: 'annual',
          orderTarget: 0,
          orderActual: amount / 10000,
          revenueTarget: 0,
          revenueActual: 0,
          createdBy: ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`✅ 年度目标创建结果:`, annualAddResult);
        console.log(`✅ 已创建${currentYear}年度销售目标，订单承揽: ${(amount / 10000).toFixed(2)}万元`);
      }
    } catch (error) {
      console.error('❌ 更新销售目标失败:', error);
      console.error('❌ 错误详情:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  // 从商机创建项目
  const createProjectFromOpportunity = async (opportunity: any) => {
    try {
      // 生成项目编号（格式：PRJ-YYYYMMDD-XXX）
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const projectCode = `PRJ-${dateStr}-${randomNum}`;

      // 创建项目数据（继承商机数据）
      const projectData = {
        name: opportunity.name, // 继承商机名称
        code: projectCode,
        type: '定制项目' as const,
        status: '未开始' as const,
        phase: '需求分析' as const,
        priority: '高' as const,
        progress: 0,
        owner: opportunity.owner, // 继承负责人
        members: opportunity.collaborators || [], // 继承协同人作为项目成员
        startDate: new Date().toISOString().slice(0, 10),
        endDate: opportunity.expectedCloseDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 默认3个月后
        budget: opportunity.estimatedAmount, // 继承预计金额作为预算
        actualCost: 0,
        customer: opportunity.customer, // 继承客户名称
        contactPerson: opportunity.contactPerson, // 继承联系人
        contactPhone: opportunity.contactPhone, // 继承联系电话
        opportunityId: opportunity._id, // 关联商机ID
        description: opportunity.description || `由商机"${opportunity.name}"自动生成的项目`,
        requirements: opportunity.description || '',
        deliverables: opportunity.notes || '',
        notes: `从商机"${opportunity.name}"（${opportunity.productType}）自动创建`,
        isPublic: opportunity.isPublic !== false,
        createdBy: opportunity.owner,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 插入项目
      const result = await db.collection('projects').add(projectData);

      // 发送消息通知给负责人
      if (projectData.owner && projectData.owner !== currentUserId) {
        try {
          await app.callFunction({
            name: 'project-message',
            data: {
              action: 'create',
              projectId: result.id,
              projectName: projectData.name,
              receiver: projectData.owner
            }
          });
          console.log('✅ 消息通知已发送');
        } catch (error) {
          console.error('❌ 消息通知失败:', error);
        }
      }

      console.log('项目创建成功:', projectCode);
    } catch (error) {
      console.error('创建项目失败:', error);
      throw error;
    }
  };

  // 点击商机打开详情模态框
  const handleViewOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setShowDetailModal(true);
  };

  // 关闭详情模态框
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedOpportunity(null);
  };

  // 处理商机成功（创建/更新后）
  const handleOpportunitySuccess = () => {
    loadOpportunities();
    setShowDetailModal(false);
    setSelectedOpportunity(null);
  };

  // 格式化金额
  const formatAmount = (amount?: number): string => {
    // 修复：处理 undefined 或 null 的情况
    if (!amount || isNaN(amount)) {
      return '0.00';
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount.toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商机管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和跟进销售商机</p>
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ 回收站权限控制：需要delete权限 */}
          {checkPermission('opportunities', 'delete') && (
            <button
              onClick={() => setShowRecycleBin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              回收站
            </button>
          )}
          {/* ✅ 创建按钮权限控制 */}
          {checkPermission('opportunities', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>新建商机</span>
            </button>
          )}
        </div>
      </div>

      {/* 统计卡片 - 四个固定阶段 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 跟进线索 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">跟进线索</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{statistics.byStage['跟进线索']?.count || 0}</p>
              <p className="text-xs text-blue-600 mt-1">
                预计金额: {((statistics.byStage['跟进线索']?.amount || 0) / 100000000).toFixed(2)}亿
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 方案咨询 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">方案咨询</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{statistics.byStage['方案咨询']?.count || 0}</p>
              <p className="text-xs text-green-600 mt-1">
                预计金额: {((statistics.byStage['方案咨询']?.amount || 0) / 10000).toFixed(0)}万
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 商务谈判 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">商务谈判</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{statistics.byStage['商务谈判']?.count || 0}</p>
              <p className="text-xs text-purple-600 mt-1">
                预计金额: {((statistics.byStage['商务谈判']?.amount || 0) / 10000).toFixed(0)}万
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 成交 */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">成交</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{statistics.byStage['成交']?.count || 0}</p>
              <p className="text-xs text-amber-600 mt-1">
                成交金额: {((statistics.byStage['成交']?.amount || 0) / 10000).toFixed(0)}万
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 关键词搜索 */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索商机名称、客户名称..."
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 阶段筛选 */}
          <div>
            <select
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部阶段</option>
              {opportunityStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* 负责人筛选 */}
          <div>
            <select
              value={filters.owner}
              onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部负责人</option>
              {allOwners.map(owner => (
                <option key={owner._id} value={owner._id}>{owner.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 商机列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无商机</h3>
            <p className="mt-1 text-sm text-gray-500">点击上方"新建商机"按钮开始创建</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {opportunities.map((opp) => (
              <div
                key={opp._id}
                onClick={() => handleViewOpportunity(opp)}
                className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${
                  opp.stage === '成交' 
                    ? 'bg-green-50 hover:bg-green-100 border-green-500 hover:border-green-600'
                    : opp.stage === '失败'
                    ? 'bg-red-50 hover:bg-red-100 border-red-500 hover:border-red-600'
                    : 'hover:bg-blue-50 border-transparent hover:border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* 左侧：商机信息 */}
                  <div className="flex-1 space-y-2">
                    {/* 第一行：商机名称和标签 */}
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {opp.name}
                      </h3>
                      {/* 阶段选择器：如果商机已取消、失败或成交则禁用 */}
                      {(opp.stage === '取消' || opp.stage === '失败' || opp.stage === '成交') ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getOpportunityStageColor(opp.stage, opportunityStages)}`}>
                          {opp.stage}
                        </span>
                      ) : (
                        <select
                          value={opp.stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdateOpportunityStage(opp._id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 transition-colors cursor-pointer ${getOpportunityStageColor(opp.stage, opportunityStages)} hover:opacity-80`}
                        >
                          {opportunityStages.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOpportunityLevelColor(opp.level)}`}>
                        {opp.level}
                      </span>
                    </div>

                    {/* 第二行：客户、关联任务、成交概率、预计成交日期 */}
                    <div className="grid gap-4 text-sm" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-600">客户:</span>
                        <span className="text-gray-900 font-medium truncate">{opp.customer}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-gray-600">关联任务:</span>
                        <span className="font-bold text-purple-600">{opp.relatedTasksCount || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">成交概率:</span>
                          <span className="font-bold text-green-700">{opp.probability}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        {opp.stage === '成交' ? (
                          <>
                            <span className="text-gray-600">成交时间:</span>
                            <span className="text-green-900 font-medium">
                              {opp.closedAt ? new Date(opp.closedAt).toLocaleDateString('zh-CN') : (opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString('zh-CN') : '未设置')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-600">预计成交:</span>
                            <span className="text-gray-900 font-medium">
                              {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString('zh-CN') : '未设置'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 第三行：负责人和协同人 */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600">负责人:</span>
                        <span className="font-medium text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                          {opp.ownerName}
                        </span>
                      </div>
                      {opp.collaboratorNames && opp.collaboratorNames.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-600">协同人:</span>
                          <div className="flex items-center gap-1">
                            {opp.collaboratorNames.map((name, idx) => (
                              <span key={idx} className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧：金额 */}
                  <div className="flex items-center justify-end min-w-[120px]">
                    <div className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-600 font-medium mb-0.5">预计金额</div>
                      <div className="text-xl font-bold text-blue-700 min-w-[80px]">{formatAmountInteger(opp.estimatedAmount)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建商机模态框 */}
      {showCreateModal && (
        <CreateOpportunityModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOpportunities();
          }}
        />
      )}

      {/* 商机详情模态框 */}
      {showDetailModal && selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={handleCloseDetail}
          onSuccess={handleOpportunitySuccess}
          userPermissions={userPermissions}
        />
      )}

      {/* 回收站模态框 */}
      {showRecycleBin && (
        <OpportunityRecycleBin
          onClose={() => setShowRecycleBin(false)}
          onRestore={loadOpportunities}
        />
      )}
    </div>
  );
}

// 导入类型辅助函数
function getOpportunityStageColor(stage: string, allStages: string[]): string {
  const colorSchemes = [
    'bg-gray-100 text-gray-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-green-100 text-green-800',
    'bg-red-100 text-red-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
  ];
  
  const index = allStages.indexOf(stage);
  if (index === -1) return 'bg-gray-100 text-gray-800';
  return colorSchemes[index % colorSchemes.length];
}

function getOpportunityLevelColor(level: OpportunityLevel): string {
  const colors: Record<OpportunityLevel, string> = {
    'A级': 'bg-red-100 text-red-800',
    'B级': 'bg-blue-100 text-blue-800',
    'C级': 'bg-gray-100 text-gray-800',
  };
  return colors[level] || 'bg-gray-100 text-gray-800';
}

// 格式化金额
function formatAmount(amount?: number): string {
  // 修复：处理 undefined 或 null 的情况
  if (!amount || isNaN(amount)) {
    return '0.00';
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`;
  }
  return `${amount.toFixed(2)}`;
}

// 格式化金额（取整显示，保证5位数字空间）
function formatAmountInteger(amount?: number): string {
  if (!amount || isNaN(amount)) {
    return '0';
  }
  if (amount >= 100000000) {
    // 亿级别: 1.23亿
    return `${(amount / 100000000).toFixed(2)}亿`;
  }
  if (amount >= 10000) {
    // 万级别: 12345万 (最多5位数)
    return `${Math.round(amount / 10000)}万`;
  }
  // 元级别: 9999元 (最多4位数)
  return `${Math.round(amount)}`;
}
