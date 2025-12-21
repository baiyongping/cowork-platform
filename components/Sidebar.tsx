import { LayoutDashboard, CheckSquare, TrendingUp, FolderKanban, Target, Settings, LogOut, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../lib/cloudbase';
import { usePermissionContext } from '../contexts/PermissionContext';
import { APP_VERSION } from '../lib/version';

type PageType = 'dashboard' | 'tasks' | 'opportunities' | 'projects' | 'goals' | 'settings' | 'account';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  userRole: 'admin' | 'employee';
  currentUser: any;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onPageChange, userRole, currentUser, onLogout }: SidebarProps) {
  // 从数据库读取的功能模块名称
  const [moduleLabels, setModuleLabels] = useState<string[]>([
    '工作台', '任务管理', '商机管理', '项目管理', '目标管理', '个人信息'
  ]);

  // 从数据库读取的系统名称和Logo
  const [systemName, setSystemName] = useState('际华定制协同办公管理平台');
  const [companyLogo, setCompanyLogo] = useState<string>('/logo.png'); // 默认Logo

  // ✅ v2.2.0: 使用权限上下文
  const { checkPermission } = usePermissionContext();

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
            // 支持两种格式：Base64编码 或 云存储URL
            if (logoData.base64) {
              setCompanyLogo(logoData.base64);
            } else if (logoData.tempFileURL) {
              setCompanyLogo(logoData.tempFileURL);
            }
          }
        }
      } catch (error) {
        console.error('加载系统设置失败:', error);
      }
    };

    loadSystemSettings();
  }, [currentUser]);

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
            
            // 确保至少有6个元素（工作台、任务、商机、项目、目标、账户）
            if (labels.length >= 6) {
              setModuleLabels(labels.slice(0, 6));
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
    { id: 'opportunities', label: moduleLabels[2], icon: TrendingUp, requiresPermission: true, module: 'opportunities' },
    { id: 'projects', label: moduleLabels[3], icon: FolderKanban, requiresPermission: true, module: 'projects' },
    { id: 'goals', label: moduleLabels[4], icon: Target, requiresPermission: true, module: 'goal' },
    { id: 'account', label: moduleLabels[5], icon: UserCircle, requiresPermission: false },
  ] as const;

  // ✅ v2.2.0: 基于权限过滤菜单
  const menuItems = [
    ...allMenuItems.filter(item => {
      // 工作台和个人信息始终显示
      if (!item.requiresPermission) {
        return true;
      }
      // 检查是否有查看权限
      return checkPermission(item.module!, 'view');
    }),
    // 🔧 系统设置权限化：只有拥有任一系统设置子模块权限的用户才能看到
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
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200 relative pb-6">
        <div className="mb-3 flex justify-center">
          <img 
            src={companyLogo} 
            alt="公司Logo" 
            className="h-16 object-contain"
            onError={(e) => {
              // 如果图片加载失败，隐藏图片元素
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-red-700 text-base font-bold text-center" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
          {systemName}
        </h1>
        <p className="text-gray-500 text-sm mt-1 text-center">高效 协同 共赢</p>
        <div className="absolute bottom-2 right-6 text-xs text-gray-400">
          v{APP_VERSION}
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id as PageType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
            {currentUser?.name?.charAt(0) || '管'}
          </div>
          <div>
            <div className="text-sm text-gray-900">{currentUser?.name || '管理员'}</div>
            <div className="text-xs text-gray-500">
              {currentUser?.position || (userRole === 'admin' ? '系统管理员' : '员工')}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">退出登录</span>
        </button>
      </div>
    </div>
  );
}