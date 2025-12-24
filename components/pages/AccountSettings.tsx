import { useState, useEffect } from 'react';
import { User, Phone, Lock, Save, Send, Users, ChevronDown, ChevronUp, Building2, Edit2, Mail } from 'lucide-react';
import { changePassword, changePhone, sendVerificationCode } from '../../lib/auth-service';
import { db } from '../../lib/cloudbase';
import toast, { Toaster } from 'react-hot-toast';
import { MessageCenter } from '../MessageCenter';
import { useNotificationStore } from '../../lib/notification-store';

interface AccountSettingsProps {
  currentUser: any;
  onUserUpdate: (updatedUser: any) => void;
  onNavigate?: (page: 'dashboard' | 'tasks' | 'opportunities' | 'projects' | 'goals' | 'settings' | 'account') => void;
}

export function AccountSettings({ currentUser, onUserUpdate, onNavigate }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'team' | 'message'>('info');
  const [userInfo, setUserInfo] = useState<any>(currentUser);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  
  // 🔔 使用消息通知 store
  const { unreadCount } = useNotificationStore();
  
  // 编辑状态
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // 团队数据状态
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<Map<string, any[]>>(new Map());
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  // 从数据库加载最新的用户信息
  useEffect(() => {
    loadUserInfoFromDB();
  }, [currentUser.userId]);
  
  // 加载团队信息
  useEffect(() => {
    if (activeTab === 'team') {
      loadTeamData();
    }
  }, [activeTab]);
  
  const loadUserInfoFromDB = async () => {
    if (!currentUser.userId) return;
    
    setLoadingUserInfo(true);
    try {
      console.log('📝 [账户设置] 从数据库加载用户信息, userId:', currentUser.userId);
      const result = await db.collection('users').doc(currentUser.userId).get();
      
      if (result.data && result.data.length > 0) {
        const dbUser = result.data[0];
        console.log('✅ [账户设置] 数据库用户信息:', dbUser);
        
        // 查询用户所属部门
        const deptResult = await db.collection('departments').get();
        const userDepartments: string[] = [];
        
        deptResult.data.forEach((dept: any) => {
          if (dept.memberIds && dept.memberIds.includes(dbUser._id)) {
            userDepartments.push(dept.name);
          }
        });
        
        const updatedUser = {
          ...currentUser,
          ...dbUser,
          userId: dbUser._id,
          departments: userDepartments,
          departmentNames: userDepartments.length > 0 ? userDepartments.join('、') : '未分配'
        };
        
        console.log('✅ [账户设置] 合并后的用户信息:', updatedUser);
        setUserInfo(updatedUser);
        
        // 同步更新到父组件
        onUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error('❌ [账户设置] 加载用户信息失败:', error);
      setUserInfo(currentUser);
    } finally {
      setLoadingUserInfo(false);
    }
  };
  
  // 加载团队数据(部门及员工)
  const loadTeamData = async () => {
    setLoadingTeam(true);
    try {
      // 1. 加载所有部门
      const deptResult = await db.collection('departments').get();
      const allDepartments = deptResult.data || [];
      
      // 2. 加载所有已审核的员工
      const usersResult = await db.collection('users')
        .where({ approvalStatus: 'approved' })
        .get();
      const allUsers = usersResult.data.filter((user: any) => user.deleted !== true);
      
      // 3. 构建部门-员工映射
      const deptEmpMap = new Map<string, any[]>();
      const deptIdSet = new Set<string>();
      
      allDepartments.forEach((dept: any) => {
        deptIdSet.add(dept._id);
        const employees = allUsers.filter((user: any) => 
          dept.memberIds && dept.memberIds.includes(user._id)
        );
        deptEmpMap.set(dept._id, employees);
      });
      
      // 4. 设置默认所有部门展开
      setExpandedDepartments(deptIdSet);
      
      setDepartments(allDepartments);
      setDepartmentEmployees(deptEmpMap);
    } catch (error) {
      console.error('❌ 加载团队数据失败:', error);
    } finally {
      setLoadingTeam(false);
    }
  };
  
  // 切换部门展开/折叠
  const toggleDepartment = (deptId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };
  
  // 保存字段修改
  const handleSaveField = async (field: string, value: any, silent = false) => {
    if (!currentUser.userId) {
      if (!silent) toast.error('用户信息无效');
      return;
    }
    
    // 手机号验证
    if (field === 'phone') {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(value)) {
        toast.error('手机号格式不正确(11位数字,以1开头)');
        return;
      }
    }
    
    setSaving(true);
    try {
      console.log(`💾 保存${field}字段:`, value);
      
      // 更新数据库
      await db.collection('users').doc(currentUser.userId).update({
        [field]: value
      });
      
      console.log(`✅ ${field}字段保存成功`);
      
      // 更新本地状态
      const updatedUser = { ...userInfo, [field]: value };
      setUserInfo(updatedUser);
      onUserUpdate(updatedUser);
      
      // 退出编辑模式
      setEditingField(null);
      setEditValue(null);
      
      if (!silent) {
        // 不弹提示,只在控制台输出
        console.log('✓ 保存成功');
      }
    } catch (error) {
      console.error(`❌ 保存${field}失败:`, error);
      if (!silent) toast.error('保存失败,请重试');
    } finally {
      setSaving(false);
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue(null);
  };
  
  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    
    // 检查文件大小 (限制2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB');
      return;
    }
    
    setSaving(true);
    try {
      console.log('📤 上传头像:', file.name);
      
      // 生成唯一文件名
      const ext = file.name.split('.').pop();
      const filename = `avatar-${currentUser.userId}-${Date.now()}.${ext}`;
      
      // 读取文件为base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          
          // 使用云函数上传
          const cloudbase = (await import('../../lib/cloudbase')).default;
          const result = await cloudbase.callFunction({
            name: 'uploadAvatar',
            data: {
              fileContent: base64.split(',')[1], // 移除data:image/xxx;base64,前缀
              fileName: filename,
              userId: currentUser.userId
            }
          });
          
          if (result.result?.success && result.result?.tempFileURL) {
            console.log('✅ 头像上传成功:', result.result.fileID);
            console.log('📎 头像URL:', result.result.tempFileURL);
            
            // 直接使用云函数返回的tempFileURL,不要再次调用getTempFileURL
            const avatarUrl = result.result.tempFileURL;
            
            // 保存到数据库(不弹提示)
            await handleSaveField('avatar', avatarUrl, true);
            toast.success('头像上传成功');
          } else {
            throw new Error(result.result?.message || '上传失败');
          }
        } catch (error) {
          console.error('❌ 上传头像失败:', error);
          toast.error('上传失败,请重试');
        } finally {
          setSaving(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ 读取文件失败:', error);
      toast.error('读取文件失败,请重试');
      setSaving(false);
    }
  };
  
  // 修改手机号表单
  const [phoneForm, setPhoneForm] = useState({
    newPhone: '',
    verificationCode: ''
  });
  const [phoneSendingCode, setPhoneSendingCode] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  // 修改密码表单
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // 发送验证码（修改手机号）
  const handleSendPhoneCode = async () => {
    if (!phoneForm.newPhone) {
      toast.error('请输入新手机号');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneForm.newPhone)) {
      toast.error('手机号格式不正确');
      return;
    }

    if (phoneForm.newPhone === currentUser.phone) {
      toast.error('新手机号与当前手机号相同');
      return;
    }

    setPhoneSendingCode(true);

    try {
      const result = await sendVerificationCode(phoneForm.newPhone);
      
      if (result.success) {
        toast.success(result.message);
        
        // 开始倒计时
        setPhoneCountdown(60);
        const timer = setInterval(() => {
          setPhoneCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('发送验证码失败，请稍后重试');
    } finally {
      setPhoneSendingCode(false);
    }
  };

  // 提交修改手机号
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneForm.newPhone || !phoneForm.verificationCode) {
      toast.error('请填写完整信息');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneForm.newPhone)) {
      toast.error('手机号格式不正确');
      return;
    }

    if (phoneForm.verificationCode.length !== 6) {
      toast.error('验证码格式不正确');
      return;
    }

    setPhoneSubmitting(true);

    try {
      const result = await changePhone(
        currentUser.userId,
        phoneForm.newPhone,
        phoneForm.verificationCode
      );

      if (result.success) {
        toast.success(result.message);
        
        // 更新用户信息
        const updatedUser = { ...currentUser, phone: phoneForm.newPhone };
        onUserUpdate(updatedUser);
        
        // 重置表单
        setPhoneForm({ newPhone: '', verificationCode: '' });
        
        // 返回基本信息页面
        setActiveTab('info');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('修改手机号失败，请稍后重试');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  // 提交修改密码
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('请填写完整信息');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码长度不能少于6位');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setPasswordSubmitting(true);

    try {
      const result = await changePassword(
        currentUser.userId,
        passwordForm.oldPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast.success(result.message);
        
        // 重置表单
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('修改密码失败，请稍后重试');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">个人信息</h1>
        <p className="text-gray-600">管理您的个人信息、安全设置和查看团队成员</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'info' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="w-5 h-5" />
          基本信息
        </button>
        
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'team' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-5 h-5" />
          团队
        </button>
        
        <button
          onClick={() => setActiveTab('message')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
            activeTab === 'message' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Mail className="w-5 h-5" />
          消息
          {/* 🔔 未读消息数量徽章 */}
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 基本信息 */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
            <p className="text-sm text-gray-600 mt-1">查看和编辑您的个人信息</p>
          </div>
          <div className="p-6">
            {loadingUserInfo ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : (
              <>
                {/* 头像 */}
                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                  <div className="relative">
                    {userInfo.avatar ? (
                      <img 
                        src={userInfo.avatar} 
                        alt="用户头像"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {userInfo.name?.[0] || userInfo.username?.[0] || 'U'}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{userInfo.name || userInfo.username}</h3>
                    <p className="text-sm text-gray-500">点击头像更换</p>
                  </div>
                </div>

                <div className="space-y-1 mt-6">
                  {/* 昵称 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-gray-500 w-20">昵称</span>
                      {editingField === 'nickname' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{userInfo.nickname || '未设置'}</p>
                      )}
                    </div>
                    {editingField === 'nickname' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          取消
                        </button>
                        <button 
                          onClick={() => handleSaveField('nickname', editValue)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingField('nickname');
                          setEditValue(userInfo.nickname || '');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* 真实姓名 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-20">真实姓名</span>
                      <p className="text-gray-900 font-medium">{userInfo.name || '-'}</p>
                    </div>
                  </div>
                  
                  {/* 个人签名 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-gray-500 w-20">个人签名</span>
                      {editingField === 'signature' ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{userInfo.signature || '未设置'}</p>
                      )}
                    </div>
                    {editingField === 'signature' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          取消
                        </button>
                        <button 
                          onClick={() => handleSaveField('signature', editValue)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingField('signature');
                          setEditValue(userInfo.signature || '');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* 手机号 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-gray-500 w-20">手机号</span>
                      {editingField === 'phone' ? (
                        <input
                          type="tel"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={11}
                          autoFocus
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{userInfo.phone || userInfo.username || '未设置'}</p>
                      )}
                    </div>
                    {editingField === 'phone' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          取消
                        </button>
                        <button 
                          onClick={() => handleSaveField('phone', editValue)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingField('phone');
                          setEditValue(userInfo.phone || userInfo.username || '');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                
                  {/* 部门 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-20">部门</span>
                      <p className="text-gray-900 font-medium">{userInfo.departmentNames || '未分配'}</p>
                    </div>
                  </div>
                  
                  {/* 岗位 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-20">岗位</span>
                      <p className="text-gray-900 font-medium">{userInfo.position || '未设置'}</p>
                    </div>
                  </div>
                  
                  {/* 角色 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-20">角色</span>
                    </div>
                    {(() => {
                      const displayRoles = userInfo.roles && userInfo.roles.length > 0
                        ? userInfo.roles.filter((r: string) => r !== 'user')
                        : (userInfo.role && userInfo.role !== 'user' ? [userInfo.role] : []);
                      
                      if (displayRoles.length === 0) {
                        return <span className="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-500">--</span>;
                      }
                      
                      const firstRole = displayRoles[0];
                      const isAdmin = firstRole === 'admin';
                      
                      return (
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                          isAdmin 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isAdmin ? '管理员' : firstRole}
                        </span>
                      );
                    })()}
                  </div>

                  {/* 密码修改 */}
                  <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-20">密码</span>
                      <p className="text-gray-900 font-medium">••••••••</p>
                    </div>
                    <button 
                      onClick={() => setEditingField('password')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 消息 */}
      {activeTab === 'message' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <MessageCenter onNavigate={onNavigate} />
          </div>
        </div>
      )}

      {/* 团队 */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">团队成员</h3>
            <p className="text-sm text-gray-600 mt-1">查看各部门的团队成员信息</p>
          </div>
          
          <div className="p-6">
            {loadingTeam ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无部门数据</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departments.map((dept) => {
                  const isExpanded = expandedDepartments.has(dept._id);
                  const employees = departmentEmployees.get(dept._id) || [];
                  
                  return (
                    <div key={dept._id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* 部门头部 */}
                      <button
                        onClick={() => toggleDepartment(dept._id)}
                        className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                            <p className="text-sm text-gray-500">{employees.length} 名成员</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </button>
                      
                      {/* 员工列表 */}
                      {isExpanded && (
                        <div className="divide-y divide-gray-100">
                          {employees.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-500 text-sm">
                              暂无成员
                            </div>
                          ) : (
                            employees.map((employee) => (
                              <div key={employee._id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                  {/* 头像 */}
                                  {employee.avatar ? (
                                    <img 
                                      src={employee.avatar} 
                                      alt={employee.name || employee.username}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                      {employee.name ? employee.name.charAt(0) : employee.username.charAt(0)}
                                    </div>
                                  )}
                                  
                                  {/* 信息列 */}
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[100px_100px_140px_120px_1fr] gap-x-4 gap-y-2">
                                    {/* 姓名 */}
                                    <div>
                                      <span className="text-xs text-gray-500">姓名</span>
                                      <p className="text-sm font-medium text-gray-900 truncate" title={employee.name || '-'}>
                                        {employee.name || '-'}
                                      </p>
                                    </div>
                                    
                                    {/* 昵称 */}
                                    <div>
                                      <span className="text-xs text-gray-500">昵称</span>
                                      <p className={`text-sm truncate ${employee.nickname ? 'text-gray-700' : 'text-gray-400 italic'}`} title={employee.nickname || '未设置'}>
                                        {employee.nickname || '未设置'}
                                      </p>
                                    </div>
                                    
                                    {/* 手机号 */}
                                    <div>
                                      <span className="text-xs text-gray-500">手机号</span>
                                      <p className="text-sm text-gray-700 truncate" title={employee.phone || employee.username || '-'}>
                                        {employee.phone || employee.username || '-'}
                                      </p>
                                    </div>
                                    
                                    {/* 职务 */}
                                    <div>
                                      <span className="text-xs text-gray-500">职务</span>
                                      <p className="text-sm text-gray-700 truncate" title={employee.position || '-'}>
                                        {employee.position || '-'}
                                      </p>
                                    </div>
                                    
                                    {/* 签名 */}
                                    <div>
                                      <span className="text-xs text-gray-500">签名</span>
                                      <p className="text-sm text-gray-700 line-clamp-2" title={employee.signature || '-'}>
                                        {employee.signature || '-'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* 底部提示 */}
          {!loadingTeam && departments.length > 0 && (
            <div className="px-6 pb-6">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">提示</p>
                    <p className="text-sm text-blue-700 mt-1">
                      点击部门名称可以展开或折叠成员列表
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* 修改手机号/密码弹窗 */}
      {editingField === 'password' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">原密码</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入原密码"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入新密码(至少6位)"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {passwordSubmitting ? '提交中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改手机号 */}
      {activeTab === 'phone' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">修改手机号</h3>
            <p className="text-sm text-gray-600 mt-1">更换您的账户绑定手机号</p>
          </div>
          
          <div className="p-6">
            <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Phone className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <span className="text-sm text-gray-600">当前手机号</span>
                  <p className="text-lg font-semibold text-gray-900">{userInfo.username || '未设置'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新手机号 *</label>
                <input
                  type="tel"
                  value={phoneForm.newPhone}
                  onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="请输入新手机号"
                  maxLength={11}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">验证码 *</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={phoneForm.verificationCode}
                    onChange={(e) => setPhoneForm({ ...phoneForm, verificationCode: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="请输入6位验证码"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={handleSendPhoneCode}
                    disabled={phoneSendingCode || phoneCountdown > 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap font-medium"
                  >
                    <Send className="w-4 h-4" />
                    {phoneCountdown > 0 ? `${phoneCountdown}秒` : '发送验证码'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  验证码将发送到新手机号
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={phoneSubmitting}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md font-medium"
                >
                  <Save className="w-5 h-5" />
                  {phoneSubmitting ? '提交中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>

          <div className="px-6 pb-6">
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900">安全提示</p>
                  <p className="text-sm text-orange-700 mt-1">
                    手机号作为账户的唯一标识，修改后请妥善保管
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
