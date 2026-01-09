import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Folder, 
  CheckCircle, 
  XCircle, 
  Settings,
  Package,
  LayoutGrid,
  X,
  Shield,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  Database,
  Code,
  FolderOpen,
  // 🎨 新增：所有可能用到的图标
  LayoutDashboard,
  TrendingUp,
  FolderKanban,
  Target,
  DollarSign,
  Calendar,
  Award,
  Briefcase,
  AlertCircle,
  UserCircle,
  LogOut
} from "lucide-react";
import { moduleService } from "../../lib/module-service";
import { showSuccess, showError, showConfirm } from "../../lib/dialog-utils";
import { app, callFunction } from "../../lib/cloudbase";
import { getFlatModuleList } from "../../constants/modules"; // 🆕 导入统一配置
import { useModuleConfig } from "../../contexts/ModuleConfigContext"; // 🔧 导入全局配置上下文

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

// 🎨 图标映射函数
const getIconComponent = (iconName?: string) => {
  if (!iconName) return null;
  
  const iconMap: Record<string, any> = {
    LayoutDashboard,
    CheckCircle,
    TrendingUp,
    FolderKanban,
    Target,
    Settings,
    DollarSign,
    Calendar,
    Award,
    Briefcase,
    AlertCircle,
    Shield,
    UserCircle,
    LogOut,
    Package,
    LayoutGrid,
    Folder,
    FolderOpen
  };
  
  return iconMap[iconName] || null;
};

// 🎯 **完整的权限模块定义（从统一配置导入）**
// ⚠️ 重要: 所有模块定义现在来自 constants/modules.ts，确保单一配置源
const PERMISSION_MODULES = getFlatModuleList();

export default function ModuleManagement() {
  const [modules, setModules] = useState<any[]>([]);
  const [moduleCategories, setModuleCategories] = useState<string[]>([]); // 🆕 功能模块分类
  
  // 🔧 使用全局配置上下文
  const { reloadModules } = useModuleConfig();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
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

  // 🎯 加载模块列表（✅ 直接从 modulesConfig 数据库读取，一一对应）
  const loadModules = async () => {
    setLoading(true);
    try {
      console.log('🔧 [ModuleManagement] 开始从数据库加载模块列表...');
      
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

      // ✅ 使用云函数查询模块配置（避免权限问题）
      console.log('🔍 [ModuleManagement] 调用云函数查询 modulesConfig...');
      
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'queryAll'
        }
      });
      
      console.log('📦 [ModuleManagement] 云函数响应:', {
        success: res?.result?.success,
        dataLength: res?.result?.data?.length || 0
      });
      
      if (!res?.result?.success || !res?.result?.data || !Array.isArray(res.result.data)) {
        console.warn('⚠️ [ModuleManagement] 云函数返回失败或数据为空:', res);
        message.warning('无法加载模块配置，请联系管理员');
        setModules([]);
        setStats({ total: 0, enabled: 0, disabled: 0, synced: 0 });
        return;
      }

      const dbResult = { data: res.result.data };
      console.log('📦 [ModuleManagement] 从云函数加载了', dbResult.data.length, '个模块');

      // 🔧 映射数据库字段到前端显示格式（✅ 与 modulesConfig 集合字段一一对应）
      const modulesData = dbResult.data.map((m: any, index: number) => {
        // 🔍 推断父模块代码
        // 规则：
        // 1. 如果有 parentId，使用 parentId（如 "settings", "goal"）
        // 2. 如果 _id 包含 "."，从 _id 提取父模块（如 "module-settings.moduleManagement" → "settings"）
        // 3. 否则为顶级模块，parentCode = null
        let parentCode = null;
        if (m.parentId) {
          parentCode = m.parentId;
        } else if (m._id.includes('.')) {
          // ✅ 修复：去掉 module- 前缀后再提取父模块
          parentCode = m._id.replace('module-', '').split('.')[0];
        }
        
        // 🔍 使用数据库的 level 字段（如果没有则推断）
        const level = m.level ?? (parentCode ? 2 : 1);
        
        const moduleData = {
          _id: m._id,
          code: m._id.replace('module-', ''), // ✅ 去掉 module- 前缀，保持与 parentId 一致
          name: m.name,
          level,
          parentCode,
          category: m.category || '管理功能',
          enabled: m.isEnabled ?? true,
          order: m.order ?? index,
          hasPermissions: configuredModuleCodes.has(m._id),
          adminOnly: false,
          note: m.description || '',
          isFromDB: true, // ✅ 所有模块都来自数据库
          description: m.description || '',
          icon: m.icon || 'Settings',
          path: m.path || '', // ✅ 使用数据库的 path 字段（路由路径）
          route: m.path || '', // route 字段映射到 path
          dbCollection: '', // ✅ 暂时为空（数据库中没有此字段）
          hasChildren: m.hasChildren ?? false, // ✅ 是否有子模块
          isCustom: m.isCustom ?? false, // ✅ 是否自定义模块
          metadata: m.metadata || null, // 🆕 元数据信息
          showInSidebar: m.showInSidebar ?? true // 🆕 侧边栏显示
        };
        
        // 🔍 调试日志：显示前 5 个模块的 parentCode 和 metadata
        if (index < 5) {
          console.log('🔍 [ModuleManagement] 模块映射:', {
            _id: m._id,
            name: m.name,
            parentId: m.parentId,
            推断的parentCode: parentCode,
            level,
            hasMetadata: !!m.metadata,
            metadataFields: m.metadata?.fields ? Object.keys(m.metadata.fields) : []
          });
        }
        
        return moduleData;
      });

      // 🎯 构建层级化列表：一级功能后面紧跟其二级功能
      const hierarchicalList: any[] = [];
      
      // 1. 获取所有一级功能（无父模块）
      const topLevelModules = modulesData.filter(m => !m.parentCode && !m.parentId);
      
      // 2. 按 order 排序一级功能
      topLevelModules.sort((a, b) => a.order - b.order);
      
      // 3. 对于每个一级功能，先添加自己，然后添加其下的二级功能
      topLevelModules.forEach(topModule => {
        // 添加一级功能
        hierarchicalList.push(topModule);
        
        // 查找该一级功能的所有二级功能
        const childModules = modulesData.filter(m => 
          m.parentCode === topModule.code || 
          m.parentId === topModule.code || 
          m.parentCode === topModule._id ||
          m.parentId === topModule._id
        );
        
        // 按 order 排序二级功能
        childModules.sort((a, b) => a.order - b.order);
        
        // 添加二级功能
        hierarchicalList.push(...childModules);
      });
      
      console.log('🔍 [ModuleManagement] 层级化列表构建完成:', {
        一级功能数: topLevelModules.length,
        总模块数: hierarchicalList.length
      });
      
      console.log('🔍 [ModuleManagement] 前3个模块:', modulesData.slice(0, 3).map(m => ({
        _id: m._id,
        name: m.name,
        level: m.level
      })));
      
      // 🔍 对比能显示和不能显示的子模块
      const visible = modulesData.filter(m => ['settings.accountSettings', 'settings.rolePermissions'].includes(m.code));
      const hidden = modulesData.filter(m => ['goal.productOrder', 'goal.outcomeGoals'].includes(m.code));
      console.log('🔍 [对比分析] 能显示的子模块:', visible.map(m => ({
        _id: m._id,
        code: m.code,
        name: m.name,
        parentCode: m.parentCode,
        parentId: m.parentId,
        enabled: m.enabled,
        level: m.level,
        order: m.order
      })));
      console.log('🔍 [对比分析] 不能显示的子模块:', hidden.map(m => ({
        _id: m._id,
        code: m.code,
        name: m.name,
        parentCode: m.parentCode,
        parentId: m.parentId,
        enabled: m.enabled,
        level: m.level,
        order: m.order
      })));
      
      // ✅ 使用层级化列表
      setModules(hierarchicalList);
      
      // 计算统计数据（使用层级化列表）
      const total = hierarchicalList.length;
      const enabled = hierarchicalList.filter(m => m.enabled !== false).length;
      const synced = hierarchicalList.filter(m => m.hasPermissions).length;
      
      console.log('📊 [ModuleManagement] 统计数据:', { total, enabled, synced });
      console.log('✅ [ModuleManagement] 模块列表加载成功（与数据库一一对应）');
      
      setStats({
        total,
        enabled,
        disabled: total - enabled,
        synced,
      });
      
      // 🆕 自动展开所有一级模块（显示其下的二级功能）
      // 使用之前已经计算好的 topLevelModules 变量（第262行）
      const topLevelCodes = topLevelModules.map((m: any) => m.code || m._id); // 优先使用 code，fallback 到 _id
      
      if (topLevelCodes.length > 0) {
        setExpandedModules(new Set(topLevelCodes));
        console.log('🔽 [ModuleManagement] 自动展开了所有一级模块:', topLevelCodes.length, '个:', topLevelCodes);
      }
    } catch (error: any) {
      console.error('❌ [ModuleManagement] 加载模块列表失败:', error);
      showError(error.message || "加载模块列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  // 打开新增/编辑对话框
  const handleOpenModal = (module?: any) => {
    if (module) {
      console.log('🔍 [ModuleManagement] 打开编辑模态框:', {
        _id: module._id,
        name: module.name,
        isFromDB: module.isFromDB,
        code: module.code
      });
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

  // 🆕 处理名称实时同步（编辑时更新左侧模块树显示）
  const handleNameChange = (newName: string) => {
    // 更新表单数据
    setFormData({ ...formData, name: newName });
    
    // 如果是编辑模式，实时同步更新模块列表中的名称
    if (editingModule) {
      // 🔧 修复：保留所有属性（特别是 isFromDB）
      const updatedEditingModule = { 
        ...editingModule, 
        name: newName,
        isFromDB: editingModule.isFromDB // ✅ 确保 isFromDB 不丢失
      };
      setEditingModule(updatedEditingModule);
      
      // 更新模块列表
      setModules(prevModules => 
        prevModules.map(m => 
          m._id === editingModule._id 
            ? updatedEditingModule
            : m
        )
      );
      
      // 同时更新选中的模块（右侧详情展示）
      if (selectedModule?._id === editingModule._id) {
        setSelectedModule(updatedEditingModule);
      }
    }
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
      // 🔧 字段映射：前端字段 → 云函数字段
      const mappedData = {
        _id: formData.code || editingModule?._id, // code 对应云函数的 _id
        name: formData.name,
        description: formData.description || '',
        icon: formData.icon || 'Settings',
        parentId: formData.parentCode || null,
        order: formData.order ?? 0,
        isEnabled: formData.enabled !== false,
        category: formData.category || '管理功能',
        metadata: {
          collections: formData.dbCollection ? [formData.dbCollection] : [],
          fields: {},
          routes: formData.route ? [formData.route] : [],
          apis: []
        }
      };
      
      if (editingModule) {
        // 🔍 调试：打印 editingModule 状态
        console.log('🔍 [ModuleManagement] 编辑模块状态:', {
          _id: editingModule._id,
          name: editingModule.name,
          isFromDB: editingModule.isFromDB,
          code: editingModule.code
        });
        
        // 🔧 强制检查数据库中是否存在该模块（避免 isFromDB 状态错误）
        try {
          let moduleExists = false;
          try {
            await moduleService.get(editingModule._id);
            moduleExists = true;
          } catch (getError: any) {
            // 模块不存在，getError 会抛出异常
            moduleExists = false;
          }
          
          console.log('🔍 [ModuleManagement] 数据库检查:', {
            moduleId: editingModule._id,
            exists: moduleExists,
            isFromDB: editingModule.isFromDB
          });
          
          if (moduleExists) {
            // ✅ 模块存在于数据库，执行更新
            console.log('📝 [ModuleManagement] 更新已存在模块:', mappedData);
            await moduleService.update(editingModule._id, mappedData);
            showSuccess("更新模块成功");
          } else {
            // 🆕 模块不存在于数据库，执行创建
            console.log('📝 [ModuleManagement] 创建新模块到数据库:', mappedData);
            await moduleService.create(mappedData);
            showSuccess("模块已同步到数据库");
          }
        } catch (dbError: any) {
          console.error('❌ [ModuleManagement] 数据库操作失败:', dbError);
          throw dbError;
        }
      } else {
        // 创建新模块
        console.log('📝 [ModuleManagement] 创建新模块:', mappedData);
        await moduleService.create(mappedData);
        showSuccess("创建模块成功");
      }
      
      // ✅ 关闭模态框并刷新数据（即使有错误也要刷新）
      handleCloseModal();
      await loadModules();
      
      // 🔧 触发全局配置更新
      await reloadModules();
      console.log('✅ [ModuleManagement] 全局配置已更新');
    } catch (error: any) {
      console.error('❌ [ModuleManagement] 提交失败:', error);
      showError(error.message || "操作失败");
      
      // 🔧 即使失败也刷新数据（恢复到最新状态）
      try {
        await loadModules();
        await reloadModules();
      } catch (refreshError) {
        console.error('❌ [ModuleManagement] 刷新数据失败:', refreshError);
      }
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
      
      // 🔧 触发全局配置更新
      await reloadModules();
      console.log('✅ [ModuleManagement] 全局配置已更新（删除模块）');
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
      
      // 🔧 触发全局配置更新
      await reloadModules();
      console.log('✅ [ModuleManagement] 全局配置已更新（切换状态）');
    } catch (error: any) {
      console.error('❌ [ModuleManagement] 切换状态失败:', error);
      showError(error.message || "操作失败");
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

  // 获取子模块（✅ 使用和 hasChildren 相同的逻辑）
  const getChildModules = (parentIdentifier: string) => {
    return modules.filter(m => {
      // 优先使用 parentCode/parentId 字段匹配
      if (m.parentCode === parentIdentifier || m.parentId === parentIdentifier) {
        return true;
      }
      // ✅ 如果没有 parentCode/parentId，则通过 code 前缀匹配（兼容旧数据）
      if (m.code && m.code.startsWith(parentIdentifier + '.')) {
        return true;
      }
      return false;
    });
  };

  // 检查是否有子模块（支持 parentCode 和 parentId 两种字段名，以及 code/_id 作为父标识）
  const hasChildren = (moduleIdentifier: string) => {
    return modules.some(m => m.parentCode === moduleIdentifier || m.parentId === moduleIdentifier);
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
    // 兼容旧模块（可能没有 code 字段，使用 _id）
    const moduleIdentifier = module.code || module._id;
    const children = getChildModules(moduleIdentifier);
    const isExpanded = expandedModules.has(moduleIdentifier);
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
          onClick={(e) => {
            // 确保点击事件生效
            console.log('🖱️ 点击模块:', module.name, module);
            setSelectedModule(module);
          }}
          className={`
            px-4 py-2 cursor-pointer transition-all group
            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}
            ${isDragging ? 'opacity-40 scale-95' : ''}
          `}
          style={{ paddingLeft: `${16 + level * 20}px` }}
        >
          <div className="flex items-center gap-2">
            {/* 🎯 拖拽手柄图标（鼠标悬停时显示） */}
            <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            
            {/* 展开/折叠图标 */}
            {hasChildren(moduleIdentifier) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // ⚠️ 阻止事件冒泡到父元素
                  toggleExpand(moduleIdentifier, e);
                }}
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
                // ✅ 直接渲染一级模块（modules 已经是层级化列表，一级模块后面紧跟其二级功能）
                (() => {
                  // 从层级化列表中提取一级模块（level 属性标识了层级）
                  const topLevelOnly = modules.filter(m => m.level === 1);
                  console.log('🔍 [ModuleManagement] 渲染模块列表:', {
                    总模块数: modules.length,
                    一级模块数: topLevelOnly.length,
                    一级模块: topLevelOnly.map(m => ({ _id: m._id, code: m.code, name: m.name, level: m.level }))
                  });
                  return topLevelOnly.map(module => renderModuleItem(module, 0));
                })()
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
                  {/* 1️⃣ 基础信息 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        基础信息
                      </h4>
                    </div>
                    <div className="p-4 bg-white space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">模块名称</label>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedModule.name}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">模块代码</label>
                          <p className="text-sm font-mono bg-gray-100 text-gray-900 px-2 py-1 rounded mt-1 inline-block">
                            {selectedModule.code}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">分类</label>
                          <div className="mt-1">{renderCategoryTag(selectedModule.category)}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">层级</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedModule.level === 1 ? '一级模块' : '二级模块'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">排序权重</label>
                          <p className="text-sm font-medium text-blue-600 mt-1">{selectedModule.order}</p>
                        </div>
                      </div>

                      {/* 🎨 新增：图标显示 */}
                      {selectedModule.icon && (() => {
                        const IconComponent = getIconComponent(selectedModule.icon);
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">图标</label>
                              <div className="mt-1 flex items-center gap-3">
                                {IconComponent ? (
                                  <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg">
                                    <IconComponent className="w-5 h-5" />
                                    <span className="text-sm font-mono">{selectedModule.icon}</span>
                                  </div>
                                ) : (
                                  <p className="text-sm font-mono bg-gray-50 text-gray-700 px-3 py-1.5 rounded inline-block">
                                    {selectedModule.icon}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 🎨 优化：父模块代码和是否有子模块显示在一行 */}
                      {(selectedModule.parentCode || selectedModule.hasChildren !== undefined) && (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedModule.parentCode && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">父模块代码</label>
                              <p className="text-sm font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded mt-1 inline-block">
                                {selectedModule.parentCode}
                              </p>
                            </div>
                          )}
                          
                          {selectedModule.hasChildren !== undefined && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">是否有子模块</label>
                              <div className="mt-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  selectedModule.hasChildren 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {selectedModule.hasChildren ? '是' : '否'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedModule.description && (
                        <div className="pt-3 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">模块描述</label>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{selectedModule.description}</p>
                        </div>
                      )}

                      {selectedModule.isCustom && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">自定义模块</span>
                            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              是
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2️⃣ 元数据信息 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-600" />
                        元数据信息
                      </h4>
                    </div>
                    <div className="p-4 bg-white space-y-4">
                      {/* 路由路径 */}
                      {selectedModule.path && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">路由路径</label>
                          <p className="text-sm font-mono bg-blue-50 text-blue-700 px-3 py-1.5 rounded mt-1 inline-block">
                            {selectedModule.path}
                          </p>
                        </div>
                      )}
                      
                      {/* 侧边栏显示 */}
                      {selectedModule.showInSidebar !== undefined && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">侧边栏显示</label>
                          <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                            selectedModule.showInSidebar 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {selectedModule.showInSidebar ? '显示' : '隐藏'}
                          </span>
                        </div>
                      )}

                      {/* 仅管理员可访问 */}
                      {selectedModule.adminOnly && (
                        <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                          <div className="flex items-center gap-2 text-red-700">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">仅管理员可访问</span>
                          </div>
                        </div>
                      )}

                      {/* 🆕 字段信息展示 */}
                      {selectedModule.metadata?.fields && Object.keys(selectedModule.metadata.fields).length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">关联字段</label>
                          <div className="space-y-3">
                            {Object.entries(selectedModule.metadata.fields).map(([collectionName, fields]: [string, any[]]) => (
                              <div key={collectionName} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Database className="w-4 h-4 text-purple-600" />
                                  <span className="text-sm font-semibold text-purple-900">{collectionName}</span>
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                    {fields.length} 个字段
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {fields.map((field: any, index: number) => (
                                    <div key={index} className="bg-white border border-purple-200 rounded px-3 py-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <Code className="w-3.5 h-3.5 text-gray-500" />
                                            <span className="text-sm font-mono font-medium text-gray-900">{field.name}</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                              {field.type}
                                            </span>
                                          </div>
                                          {field.description && (
                                            <p className="text-xs text-gray-600 mt-1 ml-5">{field.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 暂无信息提示 */}
                      {!selectedModule.path && !selectedModule.metadata?.fields && (
                        <div className="text-center py-8 text-gray-400">
                          <Database className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">暂无元数据信息</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3️⃣ 关联集合信息 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-600" />
                        关联集合信息
                      </h4>
                    </div>
                    <div className="p-4 bg-white">
                      {selectedModule.dbCollection ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Database className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">主集合名称</p>
                                <p className="text-xs text-gray-500 mt-0.5">Primary Collection</p>
                              </div>
                            </div>
                            <span className="text-sm font-mono bg-white text-green-700 px-3 py-1.5 rounded border border-green-300">
                              {selectedModule.dbCollection}
                            </span>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-600">集合状态</span>
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">已关联</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center justify-center gap-2">
                              <Database className="w-4 h-4" />
                              查看集合
                            </button>
                            <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2">
                              <Edit className="w-4 h-4" />
                              编辑关联
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">暂未关联数据库集合</p>
                          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" />
                            添加集合关联
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4️⃣ 关联函数信息 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Code className="w-5 h-5 text-orange-600" />
                        关联云函数信息
                      </h4>
                    </div>
                    <div className="p-4 bg-white">
                      {selectedModule.cloudFunctions && selectedModule.cloudFunctions.length > 0 ? (
                        <div className="space-y-2">
                          {selectedModule.cloudFunctions.map((funcName: string, index: number) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 hover:bg-orange-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Code className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-mono text-gray-900">{funcName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">已部署</span>
                                <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          <button className="w-full mt-3 px-3 py-2 text-sm bg-white border border-dashed border-orange-300 text-orange-600 rounded hover:bg-orange-50 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />
                            添加云函数
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Code className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">暂未关联云函数</p>
                          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" />
                            添加云函数关联
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5️⃣ 关联存储信息 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-indigo-600" />
                        关联云存储信息
                      </h4>
                    </div>
                    <div className="p-4 bg-white">
                      {selectedModule.storageBuckets && selectedModule.storageBuckets.length > 0 ? (
                        <div className="space-y-2">
                          {selectedModule.storageBuckets.map((bucket: any, index: number) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 hover:bg-indigo-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <FolderOpen className="w-4 h-4 text-indigo-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{bucket.name || bucket}</p>
                                  {bucket.path && (
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{bucket.path}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">已配置</span>
                                <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          <button className="w-full mt-3 px-3 py-2 text-sm bg-white border border-dashed border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />
                            添加存储桶
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">暂未关联云存储桶</p>
                          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" />
                            添加存储桶关联
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
                  <p className="text-sm mt-2">点击左侧列表选择模块查看详情</p>
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
                  onChange={(e) => handleNameChange(e.target.value)}
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
    </div>
  );
}
