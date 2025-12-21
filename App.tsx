import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/pages/Dashboard';
import { TaskManagement } from './components/pages/TaskManagement';
import { OpportunityManagement } from './components/pages/OpportunityManagement';
import { ProjectManagement } from './components/pages/ProjectManagement';
import { GoalManagement } from './components/pages/GoalManagement';
import { SystemSettings } from './components/pages/SystemSettings';
import { AccountSettings } from './components/pages/AccountSettings';
import { LoginPage } from './components/LoginPage';
import { verifyToken } from './lib/auth-service';
import { ensureAuth } from './lib/cloudbase';
import { PermissionProvider } from './contexts/PermissionContext';

type PageType = 'dashboard' | 'tasks' | 'opportunities' | 'projects' | 'goals' | 'settings' | 'account';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

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

  const handleLogin = (user: any, token: string) => {
    // 保存用户信息和token到本地存储
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    
    setCurrentUser(user);
    setIsLoggedIn(true);
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
        return <Dashboard userRole={currentUser?.role} currentUser={currentUser} />;
      case 'tasks':
        return <TaskManagement userRole={currentUser?.role} currentUser={currentUser} />;
      case 'opportunities':
        return <OpportunityManagement userRole={currentUser?.role} currentUserId={currentUser?._id} />;
      case 'projects':
        return <ProjectManagement userRole={currentUser?.role} currentUserId={currentUser?._id} />;
      case 'goals':
        return <GoalManagement userRole={currentUser?.role} currentUser={currentUser} />;
      case 'account':
        return <AccountSettings currentUser={currentUser} onUserUpdate={handleUserUpdate} />;
      case 'settings':
        return <SystemSettings currentUser={currentUser} userRole={currentUser?.role} />;
      default:
        return <Dashboard userRole={currentUser?.role} currentUser={currentUser} />;
    }
  };

  return (
    <PermissionProvider currentUser={currentUser}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          userRole={currentUser?.role}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </PermissionProvider>
  );
}
