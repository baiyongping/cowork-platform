import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Database, 
  Link as LinkIcon, 
  Folder, 
  CheckCircle, 
  XCircle, 
  FileText,
  Settings,
  Package,
  LayoutGrid,
  X,
  Shield,
  GripVertical,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import type { ModuleMetadata } from "../../lib/module-service";
import { moduleService } from "../../lib/module-service";
import { showSuccess, showError, showConfirm } from "../../lib/dialog-utils";
import { app } from "../../lib/cloudbase";

// 模块分类颜色映射（🆕 支持中文分类名称）
const categoryColorMap: Record<string, string> = {
  // 🆕 新的中文分类
  '核心业务': "bg-blue-100 text-blue-800",
  '辅助功能': "bg-yellow-100 text-yellow-800",
  '管理功能': "bg-green-100 text-green-800",
  '报表分析': "bg-purple-100 text-purple-800",
  
  // 保留旧的英文分类（向后兼容）
  core: "bg-blue-100 text-blue-800",
  business: "bg-green-100 text-green-800",
  support: "bg-yellow-100 text-yellow-800",
  system: "bg-purple-100 text-purple-800",
};

// 🎯 **完整的权限模块定义（一级和二级功能）**
const PERMISSION_MODULES = [
  // 1. 工作台（固定显示，不需要权限）
  { code: 'dashboard', name: '工作台', level: 1, parentCode: null },
  
  // 2. 任务管理
  { code: 'tasks', name: '任务管理', level: 1, parentCode: null },
  
  // 3. 问题管理
  { code: 'issues', name: '问题管理', level: 1, parentCode: null },
  
  // 4. 商机管理
  { code: 'opportunities', name: '商机管理', level: 1, parentCode: null },
  
  // 5. 项目管理
  { code: 'projects', name: '项目管理', level: 1, parentCode: null },
  
  // 6. 目标管理（含8个二级功能）
  { code: 'goal', name: '目标管理', level: 1, parentCode: null },
  { code: 'goal.salesGoal', name: '销售目标', level: 2, parentCode: 'goal' },
  { code: 'goal.opportunityGoal', name: '商机目标', level: 2, parentCode: 'goal' },
  { code: 'goal.productOrder', name: '产品订单预测', level: 2, parentCode: 'goal' },
  { code: 'goal.strategy', name: '年度策略', level: 2, parentCode: 'goal' },
  { code: 'goal.outcome', name: '成果目标', level: 2, parentCode: 'goal' },
  { code: 'goal.decomposition', name: '目标分解', level: 2, parentCode: 'goal' },
  { code: 'goal.execution', name: '执行力地图', level: 2, parentCode: 'goal' },
  { code: 'goal.dimensionSettings', name: '维度设置', level: 2, parentCode: 'goal', note: '与执行力地图权限相同' },
  
  // 7. 预算管理（含6个二级功能）
  { code: 'budget', name: '预算管理', level: 1, parentCode: null },
  { code: 'budget.annual', name: '年度预算', level: 2, parentCode: 'budget' },
  { code: 'budget.execution', name: '预算执行', level: 2, parentCode: 'budget' },
  { code: 'budget.asset', name: '资产预算', level: 2, parentCode: 'budget' },
  { code: 'budget.cashFlow', name: '现金流管理', level: 2, parentCode: 'budget', note: '与预算执行权限相同' },
  { code: 'budget.hr', name: '薪酬预算', level: 2, parentCode: 'budget' },
  { code: 'budget.parameters', name: '预算参数', level: 2, parentCode: 'budget' },
  
  // 8. 例会管理
  { code: 'meetings', name: '例会管理', level: 1, parentCode: null },
  
  // 9. 绩效管理
  { code: 'performance', name: '绩效管理', level: 1, parentCode: null },
  
  // 10. 业务管理
  { code: 'business', name: '业务管理', level: 1, parentCode: null },
  
  // 11. 功能模块（仅管理员可见）
  { code: 'moduleManagement', name: '功能模块', level: 1, parentCode: null, adminOnly: true },
  
  // 12. 系统设置（含6个二级功能）
  { code: 'settings', name: '系统设置', level: 1, parentCode: null },
  { code: 'settings.userApproval', name: '用户审核', level: 2, parentCode: 'settings' },
  { code: 'settings.employees', name: '员工管理', level: 2, parentCode: 'settings' },
  { code: 'settings.departments', name: '部门管理', level: 2, parentCode: 'settings' },
  { code: 'settings.roles', name: '角色权限', level: 2, parentCode: 'settings' },
  { code: 'settings.typeSettings', name: '类型设置', level: 2, parentCode: 'settings' },
  { code: 'settings.operationLogs', name: '操作日志', level: 2, parentCode: 'settings' },
];

export default function ModuleManagement() {
  const [modules, setModules] = useState<any[]>([]);
  const [moduleCategories, setModuleCategories] = useState<string[]>([]); // 🆕 功能模块分类
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMetadataDrawerOpen, setIsMetadataDrawerOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [viewingMetadata, setViewingMetadata] = useState<ModuleMetadata | null>(null);
  const [syncingModuleCode, setSyncingModuleCode] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [draggedModule, setDraggedModule] = useState<any | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    synced: 0,
  });

  // 表单状态
  const [formData, setFormData] = useState<any>({
    name: "",
    code: "",
    description: "",
    category: "管理功能", // 🆕 默认分类为"管理功能"
    order: 0,
    enabled: true,
    parentCode: "",
    route: "",
    icon: "",
    dbCollection: "",
  });

  // 🎯 加载模块列表（从数据库读取排序信息）
  const loadModules = async () => {
    setLoading(true);
    try {
      console.log('🔧 [ModuleManagement] 开始加载模块列表（含排序信息）...');
      
      const db = app.database();
      
      // 🆕 加载功能模块分类（从系统设置中获取）
      try {
        const categoryResult = await db.collection('type_settings')
          .where({ type: 'moduleCategory' })
          .get();
        
        if (categoryResult.data && categoryResult.data.length > 0) {
          const categories = categoryResult.data[0].values || [];
          // 只获取启用的分类
          const enabledCategories = categories
            .filter((c: any) => c.enabled !== false)
            .map((c: any) => typeof c === 'string' ? c : c.value);
          setModuleCategories(enabledCategories);
          console.log('🏷️ [ModuleManagement] 已加载功能模块分类:', enabledCategories);
        } else {
          // 如果数据库没有，使用默认分类
          const defaultCategories = ['核心业务', '辅助功能', '管理功能', '报表分析'];
          setModuleCategories(defaultCategories);
          console.log('🏷️ [ModuleManagement] 使用默认分类:', defaultCategories);
        }
      } catch (categoryError) {
        console.warn('⚠️ [ModuleManagement] 查询功能模块分类失败，使用默认分类:', categoryError);
        setModuleCategories(['核心业务', '辅助功能', '管理功能', '报表分析']);
      }
      
      // 🔐 查询权限配置表，检查哪些模块已配置权限
      let configuredModuleCodes = new Set<string>();
      
      try {
        const permissionResult = await db.collection('modulePermissions')
          .field({ moduleCode: true })
          .get();
        
        if (permissionResult.data && Array.isArray(permissionResult.data)) {
          configuredModuleCodes = new Set(
            permissionResult.data.map((p: any) => p.moduleCode)
          );
          console.log('🔐 [ModuleManagement] 已配置权限的模块:', Array.from(configuredModuleCodes));
        } else {
          console.warn('⚠️ [ModuleManagement] 权限配置表查询结果为空');
        }
      } catch (permError) {
        console.warn('⚠️ [ModuleManagement] 查询权限配置表失败:', permError);
      }

      // 📊 从数据库读取排序信息
      let moduleOrderMap = new Map<string, number>();
      try {
        const orderResult = await db.collection('moduleOrder').get();
        if (orderResult.data && Array.isArray(orderResult.data)) {
          orderResult.data.forEach((item: any) => {
            moduleOrderMap.set(item.moduleCode, item.order);
          });
          console.log('📊 [ModuleManagement] 已加载排序信息:', moduleOrderMap.size, '个模块');
        }
      } catch (orderError) {
        console.warn('⚠️ [ModuleManagement] 查询排序信息失败，使用默认顺序:', orderError);
      }

      // ⚠️ 从数据库加载模块（如果存在）
      let dbModules = new Map<string, any>();
      try {
        const dbResult = await db.collection('modulesConfig').get();
        if (dbResult.data && Array.isArray(dbResult.data)) {
          dbResult.data.forEach((m: any) => {
            dbModules.set(m.code, m);
          });
          console.log('📦 [ModuleManagement] 从数据库加载了', dbModules.size, '个模块');
        }
      } catch (dbError) {
        console.warn('⚠️ [ModuleManagement] 数据库模块查询失败，使用本地定义:', dbError);
      }

      // 使用本地定义的权限模块，并添加排序和权限配置状态
      const modulesWithPermissions = PERMISSION_MODULES.map((m, index) => {
        const dbModule = dbModules.get(m.code);
        return {
          _id: dbModule?._id || `module_${m.code}`, // ✅ 优先使用数据库的真实 _id
          code: m.code,
          name: m.name,
          level: m.level,
          parentCode: m.parentCode,
          category: dbModule?.category || '管理功能', // 🆕 分类，默认"管理功能"
          enabled: dbModule?.isEnabled ?? true,
          order: moduleOrderMap.get(m.code) ?? index, // 使用数据库排序或默认索引
          hasPermissions: configuredModuleCodes.has(m.code),
          adminOnly: m.adminOnly || false,
          note: m.note || '',
          isFromDB: !!dbModule // 🔖 标记是否来自数据库
        };
      });

      // 🎯 按 order 字段排序
      modulesWithPermissions.sort((a, b) => {
        // 先按父模块排序
        if (a.parentCode !== b.parentCode) {
          if (!a.parentCode) return -1;
          if (!b.parentCode) return 1;
          return a.parentCode.localeCompare(b.parentCode);
        }
        // 同一父模块下按 order 排序
        return a.order - b.order;
      });
      
      setModules(modulesWithPermissions);
      
      // 计算统计数据
      const total = modulesWithPermissions.length;
      const enabled = modulesWithPermissions.filter(m => m.enabled !== false).length;
      const synced = modulesWithPermissions.filter(m => m.hasPermissions).length;
      
      console.log('📊 [ModuleManagement] 统计数据:', { total, enabled, synced });
      console.log('✅ [ModuleManagement] 模块列表加载成功（已排序）');
      
      setStats({
        total,
        enabled,
        disabled: total - enabled,
        synced,
      });
    } catch (error: any) {
      console.error('❌ [ModuleManagement] 加载模块列表失败:', error);
      showError(error.message || "加载模块列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
    
    // 🎯 自动展开所有一级模块（goal、budget、settings）
    const topLevelModulesWithChildren = ['goal', 'budget', 'settings'];
    setExpandedModules(new Set(topLevelModulesWithChildren));
  }, []);

  // 打开新增/编辑对话框
  const handleOpenModal = (module?: any) => {
    if (module) {
      setEditingModule(module);
      setFormData({ 
        ...module,
        category: module.category || '管理功能' // 🆕 确保有默认分类
      });
    } else {
      setEditingModule(null);
      setFormData({
        name: "",
        code: "",
        description: "",
        category: "管理功能", // 🆕 默认分类为"管理功能"
        order: modules.length,
        enabled: true,
        parentCode: "",
        route: "",
        icon: "",
        dbCollection: "",
      });
    }
    setIsModalOpen(true);
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingModule(null);
    setFormData({});
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.category) {
      showError("请填写必填字段");
      return;
    }

    setLoading(true);
    try {
      if (editingModule) {
        // ⚠️ 检查是否为虚拟 _id（未同步到数据库）
        if (!editingModule.isFromDB) {
          showError("该模块尚未同步到数据库，请先同步元数据");
          return;
        }
        
        // ✅ 使用真实的数据库 _id
        await moduleService.update(editingModule._id, formData);
        showSuccess("更新模块成功");
      } else {
        await moduleService.create(formData);
        showSuccess("创建模块成功");
      }
      handleCloseModal();
      loadModules();
    } catch (error: any) {
      showError(error.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除模块
  const handleDelete = async (_id: string, isFromDB: boolean) => {
    if (!isFromDB) {
      showError("该模块尚未同步到数据库，无需删除");
      return;
    }
    
    const confirmed = await showConfirm(
      "确认删除",
      "删除模块后，所有角色的相关权限也会被自动移除。此操作不可恢复，确定要删除吗？"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await moduleService.delete(_id);
      showSuccess("删除模块成功");
      loadModules();
    } catch (error: any) {
      showError(error.message || "删除失败");
    } finally {
      setLoading(false);
    }
  };

  // 切换启用状态
  const handleToggleStatus = async (_id: string, enabled: boolean, isFromDB: boolean) => {
    if (!isFromDB) {
      showError("该模块尚未同步到数据库，无法切换状态");
      return;
    }
    
    console.log('🔧 [ModuleManagement] 切换模块状态:', { _id, enabled });
    setLoading(true);
    try {
      await moduleService.toggleEnable(_id, enabled);
      showSuccess(`${enabled ? "启用" : "禁用"}模块成功`);
      loadModules();
    } catch (error: any) {
      console.error('❌ [ModuleManagement] 切换状态失败:', error);
      showError(error.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  // 同步元数据
  const handleSyncMetadata = async (_id: string) => {
    setSyncingModuleCode(_id);
    try {
      await moduleService.syncMetadata(_id);
      showSuccess("同步元数据成功");
      loadModules();
    } catch (error: any) {
      showError(error.message || "同步失败");
    } finally {
      setSyncingModuleCode(null);
    }
  };

  // 查看元数据
  const handleViewMetadata = async (_id: string) => {
    setLoading(true);
    try {
      const metadata = await moduleService.getMetadata(_id);
      setViewingMetadata(metadata);
      setIsMetadataDrawerOpen(true);
    } catch (error: any) {
      showError(error.message || "获取元数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 渲染分类标签（🆕 支持中文分类名称）
  const renderCategoryTag = (category: string) => {
    if (!category) return null;
    
    // 获取颜色类（如果没有匹配的颜色，使用默认灰色）
    const colorClass = categoryColorMap[category] || "bg-gray-100 text-gray-800";
    
    // 🆕 不再需要翻译，直接显示分类名称
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {category}
      </span>
    );
  };

  // 切换展开/折叠
  const toggleExpand = (moduleCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleCode)) {
      newExpanded.delete(moduleCode);
    } else {
      newExpanded.add(moduleCode);
    }
    setExpandedModules(newExpanded);
  };

  // 获取子模块
  const getChildModules = (parentCode: string) => {
    return modules.filter(m => m.parentCode === parentCode);
  };

  // 检查是否有子模块
  const hasChildren = (moduleCode: string) => {
    return modules.some(m => m.parentCode === moduleCode);
  };

  // 🎯 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, module: any) => {
    setDraggedModule(module);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 🎯 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  // 🎯 处理拖拽放置（更新数据库中的排序）
  const handleDrop = async (e: React.DragEvent, targetModule: any) => {
    e.preventDefault();
    if (!draggedModule || draggedModule._id === targetModule._id) return;

    // 不允许跨层级拖拽
    if (draggedModule.level !== targetModule.level) {
      showError('不能跨层级拖拽（一级模块和二级功能不能互换）');
      setDraggedModule(null);
      return;
    }

    // 不允许跨父模块拖拽
    if (draggedModule.parentCode !== targetModule.parentCode) {
      showError('不能跨父模块拖拽（不同父模块的二级功能不能互换）');
      setDraggedModule(null);
      return;
    }

    try {
      console.log('🔄 [拖拽排序] 开始交换顺序:', {
        dragged: { code: draggedModule.code, order: draggedModule.order },
        target: { code: targetModule.code, order: targetModule.order }
      });

      const draggedOrder = draggedModule.order;
      const targetOrder = targetModule.order;

      // 📊 更新数据库中的排序
      const db = app.database();
      const _ = db.command;

      await Promise.all([
        db.collection('moduleOrder')
          .where({ moduleCode: draggedModule.code })
          .update({
            order: targetOrder,
            updatedAt: new Date()
          }),
        db.collection('moduleOrder')
          .where({ moduleCode: targetModule.code })
          .update({
            order: draggedOrder,
            updatedAt: new Date()
          })
      ]);

      console.log('✅ [拖拽排序] 数据库更新成功');
      showSuccess('调整顺序成功');
      
      // 重新加载模块列表
      loadModules();
    } catch (error: any) {
      console.error('❌ [拖拽排序] 失败:', error);
      showError(error.message || '调整顺序失败');
    } finally {
      setDraggedModule(null);
    }
  };

  // 阻止默认拖拽行为
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 渲染模块项（支持递归显示子模块 + 🎯 拖拽排序）
  const renderModuleItem = (module: any, level: number = 0) => {
    const children = getChildModules(module.code);
    const isExpanded = expandedModules.has(module.code);
    const isSelected = selectedModule?._id === module._id;
    const isDragging = draggedModule?._id === module._id;

    return (
      <div key={module._id}>
        {/* 父模块 - ✅ 支持拖拽排序 */}
        <div
          draggable={true}  // 🎯 启用拖拽
          onDragStart={(e) => handleDragStart(e, module)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, module)}
          onDragOver={handleDragOver}
          onClick={() => setSelectedModule(module)}
          className={`
            px-4 py-2 cursor-move transition-all group
            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}
            ${isDragging ? 'opacity-40 scale-95' : ''}
          `}
          style={{ paddingLeft: `${16 + level * 20}px` }}
        >
          <div className="flex items-center gap-2">
            {/* 🎯 拖拽手柄图标（鼠标悬停时显示） */}
            <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            
            {/* 展开/折叠图标 */}
            {hasChildren(module.code) ? (
              <button
                onClick={(e) => toggleExpand(module.code, e)}
                className="flex-shrink-0 hover:bg-gray-200 rounded p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-5" /> // 占位
            )}
            
            {/* 模块名称 */}
            <span className={`${level === 0 ? 'font-medium text-gray-900' : 'text-sm text-gray-700'}`}>
              {module.name}
            </span>
          </div>
        </div>

        {/* 子模块（递归渲染） */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderModuleItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          功能模块管理
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          管理系统功能模块配置、权限分配和元数据信息
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总模块数</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已启用</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.enabled}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已禁用</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.disabled}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已配置权限</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.synced}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mb-4">
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增模块
        </button>
      </div>

      {/* 左右分栏布局 */}
      <div className="grid grid-cols-10 gap-6">
        {/* 左侧：模块列表 */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* 标题栏 */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
                功能模块
              </h3>
            </div>

            {/* 模块列表 */}
            <div className="divide-y divide-gray-200">
              {loading && modules.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </div>
              ) : modules.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </div>
              ) : (
                // 只渲染顶级模块（无父模块的模块）
                modules
                  .filter(m => !m.parentCode)
                  .map(module => renderModuleItem(module, 0))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：权限配置 */}
        <div className="col-span-7">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  模块详情
                </h3>
                {selectedModule && (
                  <div className="flex items-center gap-3">
                    {/* 编辑按钮 */}
                    <button
                      onClick={() => handleOpenModal(selectedModule)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      编辑
                    </button>
                    {/* 启用/禁用开关 */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedModule.enabled}
                        onChange={(e) => handleToggleStatus(selectedModule._id, e.target.checked, selectedModule.isFromDB)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {selectedModule.enabled ? '已启用' : '已禁用'}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {selectedModule ? (
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      基本信息
                    </h4>
                    <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">模块名称</span>
                        <span className="text-sm font-medium text-gray-900">{selectedModule.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">模块代码</span>
                        <span className="text-sm font-mono text-gray-900">{selectedModule.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">分类</span>
                        <span>{renderCategoryTag(selectedModule.category)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">排序</span>
                        <span className="text-sm text-gray-900">{selectedModule.order}</span>
                      </div>
                      {selectedModule.description && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">描述</span>
                          <p className="text-sm text-gray-900 mt-1">{selectedModule.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 技术信息 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      技术信息
                    </h4>
                    <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                      {selectedModule.dbCollection && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">数据集合</span>
                          <span className="text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {selectedModule.dbCollection}
                          </span>
                        </div>
                      )}
                      {selectedModule.route && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">路由</span>
                          <span className="text-sm font-mono text-blue-600">{selectedModule.route}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">元数据</span>
                        <div className="flex items-center gap-2">
                          {selectedModule.metadata ? (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              已同步
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              未同步
                            </span>
                          )}
                          <button
                            onClick={() => handleSyncMetadata(selectedModule._id)}
                            disabled={syncingModuleCode === selectedModule._id}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="同步元数据"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingModuleCode === selectedModule._id ? "animate-spin" : ""}`} />
                          </button>
                          {selectedModule.metadata && (
                            <button
                              onClick={() => handleViewMetadata(selectedModule._id)}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                              title="查看元数据"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 权限配置 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      权限配置
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedModule.hasPermissions ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            已配置权限
                          </span>
                          <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                            编辑权限
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <XCircle className="w-8 h-8 text-orange-500 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-gray-600 mb-3">该模块尚未配置权限</p>
                          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                            立即配置
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">请选择一个模块</p>
                  <p className="text-sm mt-2">点击左侧表格行查看模块详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 编辑对话框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingModule ? "编辑模块" : "新增模块"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模块名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模块名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模块代码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingModule}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono"
                  placeholder="例如: tasks 或 settings.users"
                />
                {editingModule && (
                  <p className="text-xs text-gray-500 mt-1">模块代码创建后不可修改</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模块描述
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模块描述"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category || "管理功能"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {moduleCategories.length > 0 ? (
                      moduleCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      <>
                        <option value="核心业务">核心业务</option>
                        <option value="辅助功能">辅助功能</option>
                        <option value="管理功能">管理功能</option>
                        <option value="报表分析">报表分析</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序
                  </label>
                  <input
                    type="number"
                    value={formData.order || 0}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled ?? true}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">启用模块</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  父模块代码
                </label>
                <input
                  type="text"
                  value={formData.parentCode || ""}
                  onChange={(e) => setFormData({ ...formData, parentCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="例如: settings"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  前端路由
                </label>
                <input
                  type="text"
                  value={formData.route || ""}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="例如: /tasks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标名称
                </label>
                <input
                  type="text"
                  value={formData.icon || ""}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: FileText"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数据库集合
                </label>
                <input
                  type="text"
                  value={formData.dbCollection || ""}
                  onChange={(e) => setFormData({ ...formData, dbCollection: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="例如: tasks"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "提交中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 元数据抽屉 */}
      {isMetadataDrawerOpen && viewingMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
          <div className="bg-white w-full md:w-1/2 h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  元数据详情
                </h2>
                <button
                  onClick={() => setIsMetadataDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-900 mb-3">基本信息</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="w-24 text-gray-600">模块名称:</dt>
                      <dd className="flex-1 text-gray-900 font-medium">{viewingMetadata.name}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-gray-600">模块代码:</dt>
                      <dd className="flex-1 text-gray-900 font-mono">{viewingMetadata.code}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-gray-600">分类:</dt>
                      <dd className="flex-1">{renderCategoryTag(viewingMetadata.category)}</dd>
                    </div>
                    {viewingMetadata.description && (
                      <div className="flex">
                        <dt className="w-24 text-gray-600">描述:</dt>
                        <dd className="flex-1 text-gray-900">{viewingMetadata.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* 数据库集合 */}
                {viewingMetadata.collections && viewingMetadata.collections.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      数据库集合 ({viewingMetadata.collections.length})
                    </h3>
                    <div className="space-y-3">
                      {viewingMetadata.collections.map((collection, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm font-medium">{collection.name}</span>
                            {collection.recordCount !== undefined && (
                              <span className="text-xs text-gray-500">{collection.recordCount} 条记录</span>
                            )}
                          </div>
                          {collection.fields && collection.fields.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {collection.fields.map((field, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 前端路由 */}
                {viewingMetadata.routes && viewingMetadata.routes.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      前端路由 ({viewingMetadata.routes.length})
                    </h3>
                    <div className="space-y-2">
                      {viewingMetadata.routes.map((route, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-gray-200">
                          <span className="font-mono text-sm text-blue-600">{route}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* API 接口 */}
                {viewingMetadata.apis && viewingMetadata.apis.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      API 接口 ({viewingMetadata.apis.length})
                    </h3>
                    <div className="space-y-2">
                      {viewingMetadata.apis.map((api, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-gray-200">
                          <span className="font-mono text-sm text-green-600">{api}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 统计信息 */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-900 mb-3">统计信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">集合数:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {viewingMetadata.collections?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">字段数:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {viewingMetadata.collections?.reduce((sum, c) => sum + (c.fields?.length || 0), 0) || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">路由数:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {viewingMetadata.routes?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">API数:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {viewingMetadata.apis?.length || 0}
                      </span>
                    </div>
                  </div>
                  {viewingMetadata.lastSyncedAt && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        最后同步: {new Date(viewingMetadata.lastSyncedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
