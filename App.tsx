import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Bell, LogOut } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/pages/Dashboard';
import { TaskManagement } from './components/pages/TaskManagement';
import { OpportunityManagement } from './components/pages/OpportunityManagement';
import { ProjectManagement } from './components/pages/ProjectManagement';
import { GoalManagement } from './components/pages/GoalManagement';
import BudgetManagement from './components/pages/BudgetManagement';
import { MeetingManagement } from './components/pages/MeetingManagement';
import { PerformanceManagement } from './components/pages/PerformanceManagement';
import { BusinessManagement } from './components/pages/BusinessManagement';
import { SystemSettings } from './components/pages/SystemSettings';
import { AccountSettings } from './components/pages/AccountSettings';
import { LoginPage } from './components/LoginPage';
import { WechatBindModal } from './components/WechatBindModal';
import { MessageCenter } from './components/MessageCenter';
import { verifyToken } from './lib/auth-service';
import { ensureAuth, app } from './lib/cloudbase';
import { PermissionProvider } from './contexts/PermissionContext';
import { useNotificationStore } from './lib/notification-store';

// 开发环境日志工具（生产环境静默）
const isDev = import.meta.env.DEV;
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

type PageType = 'dashboard' | 'tasks' | 'opportunities' | 'projects' | 'goals' | 'budget' | 'meetings' | 'performance' | 'business' | 'settings' | 'account';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [showWechatBindModal, setShowWechatBindModal] = useState(false);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [openItemId, setOpenItemId] = useState<string | undefined>();  // 🔧 保存要打开的项目ID
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);  // 🎨 侧边栏收起状态
  
  // 🔔 使用消息通知 store
  const { unreadCount, setUnreadCount, showNotification, setShowNotification, playNotificationSound } = useNotificationStore();

  // 🔧 处理页面导航（支持传递 itemId）
  const handleNavigate = (page: PageType, itemId?: string) => {
    console.log('🔧 [App] handleNavigate:', { page, itemId });
    setCurrentPage(page);
    setOpenItemId(itemId);
  };

  // 🎨 智能侧边栏控制：检测页面内容宽度，自动决定是否收起
  useEffect(() => {
    // 延迟检测，确保页面内容已渲染
    const checkContentWidth = () => {
      setTimeout(() => {
        // 查找所有可能需要横向滚动的容器
        const scrollContainers = document.querySelectorAll('.overflow-x-auto');
        let needsCollapse = false;

        scrollContainers.forEach((container) => {
          const element = container as HTMLElement;
          // 检查是否真的需要滚动(内容宽度 > 容器宽度)
          if (element.scrollWidth > element.clientWidth) {
            needsCollapse = true;
          }
        });

        // 根据检测结果自动调整侧边栏状态
        if (needsCollapse) {
          console.log('🔍 检测到横向滚动，收起侧边栏');
          setSidebarCollapsed(true);
        } else {
          console.log('🔍 无需横向滚动，展开侧边栏');
          setSidebarCollapsed(false);
        }
      }, 300); // 增加延迟时间，确保内容完全渲染
    };

    // 页面切换时检测
    checkContentWidth();

    // 监听窗口大小变化
    window.addEventListener('resize', checkContentWidth);

    return () => {
      window.removeEventListener('resize', checkContentWidth);
    };
  }, [currentPage]);

  // 🎯 步骤1: 确保 CloudBase 认证完成
  useEffect(() => {
    console.log('🚀 [App] 开始初始化 CloudBase 认证...');
    ensureAuth()
      .then(() => {
        console.log('✓ [App] CloudBase 认证完成');
        setAuthReady(true);
      })
      .catch(err => {
        // ⚠️ 即使认证失败也允许系统继续运行
        console.warn('⚠️ [App] CloudBase 认证遇到问题，但系统仍可正常使用:', err?.message || err);
        setAuthReady(true); // 仍然标记为已完成，允许用户登录
      });
  }, []);

  // 🎯 步骤2: 检查本地存储的登录状态（仅在认证完成后执行）
  useEffect(() => {
    if (!authReady) {
      console.log('⏳ [App] 等待 CloudBase 认证完成...');
      return;
    }
    
    console.log('✓ [App] 认证已完成，检查本地登录状态...');
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('current_user');

    if (storedToken && storedUser) {
      const tokenVerification = verifyToken(storedToken);
      
      if (tokenVerification.valid) {
        setCurrentUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } else {
        // Token过期，清除本地存储
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }
    }
    
    setLoading(false);
  }, [authReady]);

  // 🎯 步骤3: 加载待审核用户数量和未读消息数
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    
    const loadPendingUsers = async () => {
      try {
        const { db } = await import('./lib/cloudbase');
        const result = await db.collection('users')
          .where({ approvalStatus: 'pending' })
          .count();
        setPendingUserCount(result.total);
      } catch (error) {
        console.error('获取待审核数量失败:', error);
      }
    };
    
    const loadUnreadCount = async () => {
      try {
        // 🔧 防御性检查：确保用户已登录且有 userId
        if (!currentUser?.userId) {
          devLog('🔔 [App] 用户未登录或缺少 userId，跳过统计未读消息');
          return;
        }
        
        devLog('🔔 [App] 开始统计未读消息, userId:', currentUser.userId);
        
        // 🔧 传递当前用户ID给云函数
        const result = await app.callFunction({
          name: 'message-count',
          data: {
            userId: currentUser.userId
          }
        });
        
        devLog('🔔 [App] 未读消息统计返回:', result);
        
        if (result.result?.success && result.result?.data) {
          const newCount = result.result.data.total || 0;
          const oldCount = unreadCount;
          
          devLog('🔔 [App] 更新未读数:', { oldCount, newCount });
          setUnreadCount(newCount);
          
          // 🔔 如果有新消息,播放提示音
          if (newCount > oldCount && oldCount !== 0) {
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('获取未读消息数失败:', error);
      }
    };
    
    loadPendingUsers();
    loadUnreadCount();
    
    // 每30秒刷新一次
    const interval = setInterval(() => {
      loadPendingUsers();
      loadUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser, unreadCount, setUnreadCount, playNotificationSound]);

  const handleLogin = (user: any, token: string) => {
    // 保存用户信息和token到本地存储
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    
    setCurrentUser(user);
    setIsLoggedIn(true);
    
    // 检查是否是超级管理员且未绑定微信
    if (user.role === 'admin' && !user.wxOpenId) {
      // 延迟500ms显示弹窗，避免登录动画冲突
      setTimeout(() => {
        setShowWechatBindModal(true);
      }, 500);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    // 更新用户信息
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      // 1. 调用 CloudBase 退出登录（清除匿名登录状态）
      const { auth, resetAuth } = await import('./lib/cloudbase');
      await auth.signOut();
      console.log('✓ CloudBase 已退出登录');
      
      // 2. 清除认证缓存（关键修复：允许重新初始化）
      resetAuth();
      
      // 3. 清除本地存储
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      
      // 4. 重置状态
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentPage('dashboard');
      
      // 5. 重新初始化 CloudBase 匿名登录（为下次登录做准备）
      const { ensureAuth } = await import('./lib/cloudbase');
      await ensureAuth();
      console.log('✓ 退出登录成功，已重置认证状态');
    } catch (error) {
      console.error('❌ 退出登录失败:', error);
      // 即使出错也要清除本地状态
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      setIsLoggedIn(false);
      setCurrentUser(null);
      
      // 重新加载页面以确保状态完全重置
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userRole={currentUser?.role} currentUser={currentUser} onLogout={handleLogout} />;
      case 'tasks':
        return <TaskManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
          openTaskId={openItemId}  // 🔧 传递要打开的任务ID
          onTaskOpened={() => {
            console.log('✅ [App] 任务详情已打开，清除 openItemId');
            setOpenItemId(undefined);  // 🔧 打开后清除ID
          }}
        />;
      case 'opportunities':
        return <OpportunityManagement 
          userRole={currentUser?.role} 
          currentUserId={currentUser?._id}
          openOpportunityId={openItemId}  // 🔧 传递要打开的商机ID
          onOpportunityOpened={() => {
            console.log('✅ [App] 商机详情已打开，清除 openItemId');
            setOpenItemId(undefined);  // 🔧 打开后清除ID
          }}
        />;
      case 'projects':
        return <ProjectManagement 
          userRole={currentUser?.role} 
          currentUserId={currentUser?._id}
          openProjectId={openItemId}  // 🔧 传递要打开的项目ID
          onProjectOpened={() => {
            console.log('✅ [App] 项目详情已打开，清除 openItemId');
            setOpenItemId(undefined);  // 🔧 打开后清除ID
          }}
        />;
      case 'goals':
        return <GoalManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
          openGoalId={openItemId}  // 🔧 传递要打开的目标ID
          onGoalOpened={() => {
            console.log('✅ [App] 目标详情已打开，清除 openItemId');
            setOpenItemId(undefined);  // 🔧 打开后清除ID
          }}
        />;
      case 'budget':
        return <BudgetManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
        />;
      case 'meetings':
        return <MeetingManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
        />;
      case 'performance':
        return <PerformanceManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
        />;
      case 'business':
        return <BusinessManagement 
          userRole={currentUser?.role} 
          currentUser={currentUser}
        />;
      case 'account':
        return <AccountSettings currentUser={currentUser} onUserUpdate={handleUserUpdate} onNavigate={handleNavigate} />;
      case 'settings':
        return <SystemSettings 
          currentUser={currentUser} 
          userRole={currentUser?.role}
          onPendingCountChange={setPendingUserCount}
        />;
      default:
        return <Dashboard userRole={currentUser?.role} currentUser={currentUser} />;
    }
  };

  return (
    <PermissionProvider currentUser={currentUser}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={handleNavigate}  // 🔧 使用 handleNavigate 支持传递 itemId
          userRole={currentUser?.role}
          currentUser={currentUser}
          onLogout={handleLogout}
          pendingUserCount={pendingUserCount}
          collapsed={sidebarCollapsed}  // 🎨 传递收起状态
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}  // 🎨 切换函数
        />
        
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 页面内容 */}
          <main className="flex-1 overflow-auto main-content-container">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* 🔔 消息中心弹窗 */}
      {showNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] overflow-hidden">
            <MessageCenter 
              onClose={() => setShowNotification(false)}
              onNavigate={(page, itemId) => {
                handleNavigate(page, itemId);
                setShowNotification(false);  // 跳转后关闭消息中心
              }}
            />
          </div>
        </div>
      )}
      
      {/* 全局Toast通知 */}
      <Toaster 
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* 超级管理员微信绑定弹窗 */}
      {showWechatBindModal && (
        <WechatBindModal
          onClose={() => setShowWechatBindModal(false)}
          onSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
            setShowWechatBindModal(false);
          }}
        />
      )}
    </PermissionProvider>
  );
}
