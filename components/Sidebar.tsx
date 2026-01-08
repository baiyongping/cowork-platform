import { LayoutDashboard, CheckSquare, TrendingUp, FolderKanban, Target, Settings, LogOut, UserCircle, DollarSign, Calendar, Award, Briefcase, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, AlertCircle } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { app, db } from '../lib/cloudbase';
import { getStoragePublicURL } from '../constants/cloudbase';
import { usePermissionContext } from '../contexts/PermissionContext';
import { APP_VERSION } from '../lib/version';
import { useNotificationStore } from '../lib/notification-store';

type PageType = 'dashboard' | 'tasks' | 'issues' | 'opportunities' | 'projects' | 'goals' | 'budget' | 'meetings' | 'performance' | 'business' | 'settings' | 'account' | 'modules';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType, itemId?: string) => void;  // 🔧 添加可选的 itemId 参数
  userRole: 'admin' | 'employee';
  currentUser: any;
  onLogout: () => void;
  pendingUserCount?: number;
  collapsed?: boolean;  // 🎨 收起状态
  onToggleCollapse?: () => void;  // 🎨 切换函数
}

export function Sidebar({ currentPage, onPageChange, userRole, currentUser, onLogout, pendingUserCount = 0, collapsed = false, onToggleCollapse }: SidebarProps) {
  // 从数据库读取的功能模块名称
  const [moduleLabels, setModuleLabels] = useState<string[]>([
    '工作台', '任务管理', '问题管理', '商机管理', '项目管理', '目标管理', '预算管理', '例会管理', '绩效管理', '业务管理', '个人信息'
  ]);

  // 从数据库读取的系统名称和Logo
  const [systemName, setSystemName] = useState('际华定制协同办公管理平台');
  const [companyLogo, setCompanyLogo] = useState<string>('/logo.png'); // 默认Logo

  // 🔔 使用消息通知 store
  const { unreadCount } = useNotificationStore();

  // ✅ v2.2.0: 使用权限上下文
  const { checkPermission } = usePermissionContext();

  // 🎯 滚动指示器状态
  const navRef = useRef<HTMLDivElement>(null);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // 加载系统设置（名称和Logo）
  useEffect(() => {
    // ✅ 只在用户已登录时加载系统设置
    if (!currentUser) return;
    
    const loadSystemSettings = async () => {
      try {
        // 加载系统名称
        const nameResult = await db.collection('type_settings')
          .where({ type: 'systemName' })
          .get();
        
        if (nameResult.data && nameResult.data.length > 0 && nameResult.data[0].values && nameResult.data[0].values.length > 0) {
          const nameValue = nameResult.data[0].values[0];
          // 支持新旧格式
          if (typeof nameValue === 'string') {
            setSystemName(nameValue);
          } else if (nameValue && typeof nameValue === 'object' && nameValue.value) {
            setSystemName(nameValue.value);
          }
        }
        
        // 加载公司Logo
        const logoResult = await db.collection('type_settings')
          .where({ type: 'companyLogo' })
          .get();
        
        if (logoResult.data && logoResult.data.length > 0) {
          const logoData = logoResult.data[0].values?.[0];
          if (logoData) {
            // 支持三种格式：Base64编码、临时URL、或云存储公共URL
            if (logoData.base64) {
              setCompanyLogo(logoData.base64);
            } else if (logoData.tempFileURL) {
              setCompanyLogo(logoData.tempFileURL);
            } else if (logoData.fileID) {
              // ✅ 使用配置文件中的云存储域名构造公共URL
              const publicURL = getStoragePublicURL(logoData.fileID);
              setCompanyLogo(publicURL);
            }
          }
        }
      } catch (error) {
        console.error('加载系统设置失败:', error);
      }
    };

    loadSystemSettings();
  }, [currentUser]);

  // ❌ 移除本地的未读消息加载逻辑(已移至 App.tsx 统一管理)

  // 加载功能模块名称配置
  useEffect(() => {
    // ✅ 只在用户已登录时加载功能模块名称
    if (!currentUser) return;
    
    const loadModuleNames = async () => {
      try {
        const result = await db.collection('type_settings')
          .where({ type: 'moduleNames' })
          .get();
        
        if (result.data && result.data.length > 0) {
          const moduleNamesData = result.data[0];
          if (moduleNamesData.values && Array.isArray(moduleNamesData.values)) {
            // 支持新旧格式
            let labels: string[] = [];
            if (moduleNamesData.values.length > 0 && typeof moduleNamesData.values[0] === 'string') {
              // 旧格式：字符串数组
              labels = moduleNamesData.values;
            } else {
              // 新格式：对象数组，提取value字段
              labels = moduleNamesData.values.map((item: any) => item.value || '');
            }
            
            // 确保至少有10个元素（工作台、任务、商机、项目、目标、预算、例会、绩效、业务、账户）
            if (labels.length >= 10) {
              setModuleLabels(labels.slice(0, 10));
            }
          }
        }
      } catch (error) {
        console.error('加载功能模块名称失败:', error);
        // 失败时使用默认值
      }
    };

    loadModuleNames();
  }, [currentUser]);

  // ✅ v2.2.0: 定义所有菜单项及其权限要求
  const allMenuItems = [
    { id: 'dashboard', label: moduleLabels[0], icon: LayoutDashboard, requiresPermission: false },
    { id: 'tasks', label: moduleLabels[1], icon: CheckSquare, requiresPermission: true, module: 'tasks' },
    { id: 'issues', label: moduleLabels[2], icon: AlertCircle, requiresPermission: true, module: 'issues' },
    { id: 'opportunities', label: moduleLabels[3], icon: TrendingUp, requiresPermission: true, module: 'opportunities' },
    { id: 'projects', label: moduleLabels[4], icon: FolderKanban, requiresPermission: true, module: 'projects' },
    { id: 'goals', label: moduleLabels[5], icon: Target, requiresPermission: true, module: 'goal' },
    { id: 'budget', label: moduleLabels[6], icon: DollarSign, requiresPermission: true, module: 'budget' },
    { id: 'meetings', label: moduleLabels[7], icon: Calendar, requiresPermission: true, module: 'meetings' },
    { id: 'performance', label: moduleLabels[8], icon: Award, requiresPermission: true, module: 'performance' },
    { id: 'business', label: moduleLabels[9], icon: Briefcase, requiresPermission: true, module: 'business' },
  ] as const;

  // 🎯 从数据库读取排序信息
  const [moduleOrderMap, setModuleOrderMap] = useState<Map<string, number>>(new Map());
  
  useEffect(() => {
    if (!currentUser) return;
    
    const loadModuleOrder = async () => {
      try {
        const result = await db.collection('moduleOrder')
          .where({ level: 1 })  // 只读取一级模块
          .get();
        
        if (result.data && Array.isArray(result.data)) {
          const orderMap = new Map<string, number>();
          result.data.forEach((item: any) => {
            orderMap.set(item.moduleCode, item.order);
          });
          setModuleOrderMap(orderMap);
          console.log('🎯 [Sidebar] 已加载模块排序:', orderMap.size, '个模块');
        }
      } catch (error) {
        console.error('❌ [Sidebar] 加载模块排序失败:', error);
      }
    };
    
    loadModuleOrder();
  }, [currentUser]);

  // ✅ v2.2.0: 基于权限过滤菜单 + 🎯 按数据库排序
  const menuItems = [
    // 先过滤出有权限的菜单项
    ...allMenuItems.filter(item => {
      if (!item.requiresPermission) return true;
      return checkPermission(item.module!, 'view');
    }),
    // 功能模块管理（只有管理员可见）
    ...(userRole === 'admin' || currentUser?.username === 'admin'
      ? [{ id: 'modules' as const, label: '功能模块', icon: Settings }]
      : []
    ),
    // 系统设置权限化
    ...(userRole === 'admin' || 
        checkPermission('settings.userApproval', 'view') ||
        checkPermission('settings.employees', 'view') ||
        checkPermission('settings.departments', 'view') ||
        checkPermission('settings.roles', 'view') ||
        checkPermission('settings.typeSettings', 'view') ||
        checkPermission('settings.operationLogs', 'view')
      ? [{ id: 'settings' as const, label: '系统设置', icon: Settings }]
      : []
    ),
  ].sort((a, b) => {
    // 🎯 按数据库中的 order 排序
    const orderA = moduleOrderMap.get(a.id) ?? 999;
    const orderB = moduleOrderMap.get(b.id) ?? 999;
    return orderA - orderB;
  });

  // 🎯 检测滚动状态
  const checkScrollIndicators = () => {
    if (!navRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = navRef.current;
    
    // 上方是否还有内容
    setShowScrollUp(scrollTop > 5);
    
    // 下方是否还有内容
    setShowScrollDown(scrollTop + clientHeight < scrollHeight - 5);
  };

  // 🎯 监听滚动事件
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    // 初始检测
    checkScrollIndicators();

    // 添加滚动监听
    navElement.addEventListener('scroll', checkScrollIndicators);
    
    // 窗口大小变化时重新检测
    window.addEventListener('resize', checkScrollIndicators);

    return () => {
      navElement.removeEventListener('scroll', checkScrollIndicators);
      window.removeEventListener('resize', checkScrollIndicators);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems.length]); // menuItems数量变化时重新检测

  return (
    <div className={`h-screen bg-white flex flex-col shadow-xl border-r border-gray-200 transition-all duration-300 relative ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* ========== 顶部区域：Logo与系统信息 ========== */}
      <div className={`flex-shrink-0 px-4 py-3 border-b border-gray-200 ${collapsed ? 'hidden' : ''}`}>
        <div className="mb-2 flex justify-center">
          <img 
            src={companyLogo} 
            alt="公司Logo" 
            className="h-12 object-contain"
            onError={(e) => {
              // 如果图片加载失败，隐藏图片元素
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-red-700 text-base font-bold text-center tracking-wide leading-tight" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
          {systemName}
        </h1>
        <p className="text-gray-600 text-xs mt-1 text-center">高效 · 协同 · 共赢</p>
        <div className="mt-1 text-center text-xs text-gray-500">
          v{APP_VERSION}
        </div>
      </div>

      {/* ========== 中间区域：功能列表 ========== */}
      <div className={`flex-1 relative overflow-hidden ${collapsed ? 'hidden' : ''}`}>
        {/* 向上滚动指示器 */}
        {showScrollUp && (
          <div className="absolute top-0 right-2 z-10 pointer-events-none">
            <div className="bg-gradient-to-b from-white via-white to-transparent pt-2 pb-4">
              <ChevronUp className="w-5 h-5 text-blue-500 animate-bounce" />
            </div>
          </div>
        )}

        {/* 功能列表 */}
        <nav 
          ref={navRef}
          className="h-full px-3 py-4 overflow-y-auto"
          style={{ 
            scrollbarWidth: 'none',  // 隐藏Firefox滚动条
            msOverflowStyle: 'none'  // 隐藏IE/Edge滚动条
          }}
        >
          {/* 隐藏Webkit滚动条 */}
          <style>{`
            nav::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id as PageType)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.id === 'settings' && pendingUserCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px]">
                      {pendingUserCount > 9 ? '9+' : pendingUserCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* 向下滚动指示器 */}
        {showScrollDown && (
          <div className="absolute bottom-0 right-2 z-10 pointer-events-none">
            <div className="bg-gradient-to-t from-white via-white to-transparent pb-2 pt-4">
              <ChevronDown className="w-5 h-5 text-blue-500 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* ========== 底部区域：个人信息 ========== */}
      <div className="flex-shrink-0 px-3 py-3 bg-gray-50 border-t border-gray-200">
        {/* 个人信息显示区域 - 可点击跳转到个人信息页面 - 收起时隐藏 */}
        {!collapsed && (
          <button
            onClick={() => onPageChange('account')}
            className="w-full flex flex-col items-center justify-center px-2 py-2 hover:bg-gray-100 transition-colors group rounded-md"
          >
            {/* 头像 - 方形居中显示 */}
            <div className="relative mb-1.5">
              {currentUser?.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt="用户头像"
                  className="w-12 h-12 rounded-lg object-cover border-2 border-gray-300 group-hover:border-blue-400 transition-colors"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-gray-300 group-hover:border-blue-400 transition-colors">
                  {currentUser?.name?.charAt(0) || '管'}
                </div>
              )}
            </div>
            
            {/* 姓名 - 头像下方居中 */}
            <div className="text-sm font-semibold text-gray-800 mb-0.5 group-hover:text-blue-600 transition-colors">
              {currentUser?.name || '管理员'}
            </div>
            
            {/* 签名 - 姓名下方居中,最多2行,超出显示省略号 */}
            <div className="text-xs text-gray-500 text-center line-clamp-2 w-full group-hover:text-gray-700">
              {currentUser?.signature || currentUser?.position || (userRole === 'admin' ? '系统管理员' : '员工')}
            </div>
          </button>
        )}
      </div>
      
      {/* 🎨 切换按钮 - 始终固定在整个侧边栏的右下角 */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute right-2 bottom-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg p-2 shadow-lg transition-all hover:scale-105 z-20"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}