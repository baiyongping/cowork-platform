import React, { useState, useEffect } from 'react';
import { Users, Building2, Shield, Tags, Plus, X, FileText, Calendar, Search, Download, UserCheck, ChevronDown, ChevronUp, Save, CheckCircle, XCircle, Trash2, User, Upload, Image as ImageIcon, UserPlus } from 'lucide-react';
import { UserApprovalPage } from '../UserApprovalPage';
import EmployeeDetailModal from '../EmployeeDetailModal';
import CreateEmployeeModal from '../CreateEmployeeModal';
import { EmployeeTrash } from '../EmployeeTrash';
import { db, app } from '../../lib/cloudbase';
import { getStoragePublicURL } from '../../constants/cloudbase';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { showAlert, showConfirm, showSuccess, showError, showWarning } from '../../lib/dialog-utils';
import { generateDefaultPermissions } from '../../constants/modules';

interface TypeItem {
  value: string;
  enabled: boolean;
  isSystem?: boolean; // 是否为系统参数，系统参数不可编辑和删除
}

interface SystemSettingsProps {
  currentUser: any;
  userRole: 'admin' | 'employee';
  onPendingCountChange?: (count: number) => void;
}

export function SystemSettings({ currentUser: propCurrentUser, userRole, onPendingCountChange }: SystemSettingsProps) {
  const [selectedTab, setSelectedTab] = useState<'approval' | 'team' | 'department' | 'role' | 'types' | 'logs'>('approval');
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 使用权限上下文
  const { checkPermission, loading: permissionLoading } = usePermissionContext();
  
  // 🔧 自动选择第一个有权限的Tab
  useEffect(() => {
    if (!permissionLoading) {
      const tabs: Array<'approval' | 'team' | 'department' | 'role' | 'types' | 'logs'> = ['approval', 'team', 'department', 'role', 'types', 'logs'];
      const moduleMap = {
        approval: 'settings.userApproval',
        team: 'settings.employees',
        department: 'settings.departments',
        role: 'settings.roles',
        types: 'settings.typeSettings',
        logs: 'settings.operationLogs'
      };
      
      // 检查当前选中的Tab是否有权限
      const currentTabHasPermission = checkPermission(moduleMap[selectedTab], 'view');
      
      if (!currentTabHasPermission) {
        // 找到第一个有权限的Tab
        const firstAvailableTab = tabs.find(tab => checkPermission(moduleMap[tab], 'view'));
        if (firstAvailableTab) {
          setSelectedTab(firstAvailableTab);
        }
      }
    }
  }, [permissionLoading, checkPermission]);
  
  // 更新当前用户
  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);
  
  // 获取待审核用户数量
  useEffect(() => {
    loadPendingCount();
  }, []);
  
  const loadPendingCount = async () => {
    try {
      const result = await db.collection('users')
        .where({ approvalStatus: 'pending' })
        .count();
      setPendingCount(result.total);
      onPendingCountChange?.(result.total);
    } catch (error) {
      console.error('获取待审核数量失败:', error);
    }
  };
  // 员工管理状态
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [showEmployeeTrash, setShowEmployeeTrash] = useState(false);
  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationData, setInvitationData] = useState<{code: string; url: string; qrUrl: string} | null>(null);
  const [generatingInvitation, setGeneratingInvitation] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    departments: [] as string[], // 改为数组，支持多部门
    roles: [] as string[], // 改为数组，支持多角色
    status: '在职',
    approvalStatus: '已通过', // 审核状态
    supervisorId: '', // 上级ID
    position: '' // 职务
  });
  
  // 搜索和筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [showDeleteDepartmentModal, setShowDeleteDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    leaderId: '',
    leaderName: '',
    description: '',
    memberIds: [] as string[]
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleForm, setRoleForm] = useState({
    role: '',
    name: '',
    description: '',
    permissions: {} as any
  });
  const [showAddTypeModal, setShowAddTypeModal] = useState<string | null>(null);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [showAddNewCategoryModal, setShowAddNewCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingTypeCategory, setEditingTypeCategory] = useState<string>('');
  const [editingTypeIndex, setEditingTypeIndex] = useState<number>(-1);
  const [typeFormValue, setTypeFormValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryKey, setEditingCategoryKey] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  
  // 操作日志状态
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logStartDate, setLogStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 默认查询最近7天
    return date.toISOString().split('T')[0];
  });
  const [logEndDate, setLogEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  
  // 固定类型列表常量
  const fixedTypes = ['moduleNames', 'moduleCategory', 'task', 'taskStatus', 'opportunity', 'action', 'preparation', 'production', 'delivery', 'projectStatus', 'productType', 'strategyStatus'];
  
  // 加载已审核通过的用户列表
  useEffect(() => {
    if (selectedTab === 'team') {
      loadEmployees();
    }
  }, [selectedTab]);
  
  // 加载部门列表和员工列表（部门管理需要员工数据来选择负责人和成员）
  useEffect(() => {
    if (selectedTab === 'department') {
      loadDepartments();
      loadEmployees(); // ✨ 关键修复：部门管理也需要员工数据
    }
  }, [selectedTab]);
  
  // 加载角色权限配置
  const loadRolePermissions = async () => {
    setLoadingRoles(true);
    try {
      const result = await db.collection('role_permissions').get();
      
      // 检查是否是集合不存在的错误
      if (result.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        console.log('集合不存在，开始创建集合和默认角色...');
        // 集合不存在，需要先创建
        // CloudBase的集合会在第一次添加数据时自动创建，所以我们直接添加数据即可
      }
      
      // 如果没有配置,创建默认角色配置
      if (!result.data || result.data.length === 0 || result.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        console.log('数据库中没有角色配置，开始创建默认角色...');
        const defaultRoles = [
          {
            role: 'admin',
            name: '管理员',
            description: '系统管理员，拥有所有权限',
            permissions: (() => {
              const perms = generateDefaultPermissions();
              // 管理员拥有所有权限
              Object.keys(perms).forEach(key => {
                if (typeof perms[key] === 'object' && 'view' in perms[key]) {
                  perms[key] = { view: true, create: true, edit: true, delete: true, export: true };
                } else if (typeof perms[key] === 'object') {
                  // 有子模块的情况
                  Object.keys(perms[key]).forEach(subKey => {
                    perms[key][subKey] = { view: true, create: true, edit: true, delete: true, export: true };
                  });
                }
              });
              return perms;
            })(),
            createdAt: new Date()
          },
          {
            role: 'manager',
            name: '经理',
            description: '部门经理，可管理本部门及下级数据',
            permissions: (() => {
              const perms = generateDefaultPermissions();
              // 经理权限:查看+创建+编辑,不允许删除
              Object.keys(perms).forEach(key => {
                if (typeof perms[key] === 'object' && 'view' in perms[key]) {
                  perms[key] = { view: true, create: true, edit: true, delete: false, export: true };
                } else if (typeof perms[key] === 'object') {
                  Object.keys(perms[key]).forEach(subKey => {
                    perms[key][subKey] = { view: true, create: true, edit: true, delete: false, export: true };
                  });
                }
              });
              return perms;
            })(),
            createdAt: new Date()
          },
          {
            role: 'employee',
            name: '员工',
            description: '普通员工，可管理自己的数据和协作数据',
            permissions: generateDefaultPermissions(), // 使用默认权限
            createdAt: new Date()
          }
        ];
        
        // 批量创建默认角色
        for (const role of defaultRoles) {
          try {
            const addResult = await db.collection('role_permissions').add(role);
            console.log(`创建角色 ${role.name}，返回结果:`, addResult);
            
            // 检查是否创建成功
            if (addResult.code) {
              console.error(`创建角色 ${role.name} 失败:`, addResult.message);
              throw new Error(`创建角色失败: ${addResult.message}`);
            }
            
            console.log(`返回的ID字段 - id: ${(addResult as any).id}, _id: ${(addResult as any)._id}, docId: ${(addResult as any).docId}`);
          } catch (err) {
            console.error(`创建角色 ${role.name} 异常:`, err);
            throw err;
          }
        }
        
        // 等待一小段时间确保数据库写入完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重新从数据库读取
        console.log('重新从数据库读取角色列表...');
        const reloadResult = await db.collection('role_permissions').get();
        console.log('重新读取的完整结果:', reloadResult);
        
        if (!reloadResult || !reloadResult.data) {
          console.error('重新读取失败，reloadResult:', reloadResult);
          throw new Error('重新读取角色配置失败');
        }
        
        console.log('读取到的角色数量:', reloadResult.data.length);
        if (reloadResult.data.length > 0) {
          console.log('角色数据示例:', reloadResult.data[0]);
        }
        
        const normalizedRoles = reloadResult.data.map((role: any) => {
          const roleId = role._id || role.id || role.docId;
          console.log(`角色 ${role.name} 的ID: ${roleId}, 完整对象:`, role);
          return {
            ...role,
            _id: roleId,
            permissions: normalizePermissions(role.permissions) // 标准化权限键名
          };
        });
        
        console.log('最终设置的角色列表:', normalizedRoles);
        setRolePermissions(normalizedRoles);
      } else {
        console.log(`从数据库读取到 ${result.data.length} 个角色`);
        // 确保所有角色都有正确的ID字段,并标准化权限键名
        const normalizedRoles = result.data.map((role: any) => {
          const roleId = role._id || role.id || role.docId;
          if (!roleId) {
            console.error('角色缺少ID字段:', role);
          }
          
          console.log(`📊 角色 ${role.name} 从数据库加载的原始权限:`, role.permissions);
          const normalizedPermissions = normalizePermissions(role.permissions);
          console.log(`✅ 角色 ${role.name} 标准化后的权限:`, normalizedPermissions);
          
          // ✅ 自动修复缺少role字段的角色配置
          let roleKey = role.role; // 使用已有的role字段
          if (!roleKey) {
            // 根据角色名称推断role字段
            if (role.name === '管理员' || role.name?.includes('管理员')) {
              roleKey = 'admin';
            } else if (role.name === '子管理员' || role.name?.includes('子管理员')) {
              roleKey = 'manager';
            } else if (role.name === '经理' || role.name?.includes('经理')) {
              roleKey = 'manager';
            } else if (role.name === '会议主持' || role.name?.includes('主持')) {
              roleKey = 'manager';
            } else if (role.name === '普通员工' || role.name === '员工') {
              roleKey = 'employee';
            } else if (role.name === '公司高管' || role.name?.includes('高管')) {
              roleKey = 'executive';
            } else if (role.name === '测试') {
              roleKey = 'test';
            } else {
              // 如果无法推断，使用默认值
              roleKey = 'employee';
            }
            
            console.warn('⚠️ 角色', role.name, '缺少role字段，自动设置为:', roleKey);
            
            // 更新数据库中的角色配置
            db.collection('role_permissions')
              .doc(roleId)
              .update({ role: roleKey })
              .then(() => console.log('✅ 已更新角色', role.name, '的role字段'))
              .catch(err => console.error('❌ 更新角色role字段失败:', err));
          }
          
          return {
            ...role,
            _id: roleId,
            role: roleKey, // ✅ 确保role字段存在
            permissions: normalizedPermissions // 标准化权限键名
          };
        });
        console.log('处理后的角色列表:', normalizedRoles);
        setRolePermissions(normalizedRoles);
      }
    } catch (error) {
      console.error('加载角色权限失败:', error);
      alert('加载角色权限失败，请刷新页面重试');
    } finally {
      setLoadingRoles(false);
    }
  };
  
  // 打开新增角色modal
  const handleAddRole = () => {
    // ✅ 使用统一的模块配置生成默认权限
    setRoleForm({
      role: '',
      name: '',
      description: '',
      permissions: generateDefaultPermissions()
    });
    setShowAddRoleModal(true);
  };
  
  // 创建新角色
  const handleCreateRole = async () => {
    if (!roleForm.role.trim()) {
      alert('请输入角色标识（英文）');
      return;
    }
    if (!roleForm.name.trim()) {
      alert('请输入角色名称');
      return;
    }
    
    // 检查角色标识是否已存在
    const exists = rolePermissions.some(r => r.role === roleForm.role);
    if (exists) {
      alert('角色标识已存在，请使用其他标识');
      return;
    }
    
    // 检查是否为管理员
    if (userRole !== 'admin') {
      alert('只有管理员才能创建角色');
      return;
    }
    
    try {
      console.log('开始创建角色...');
      const result = await db.collection('role_permissions').add({
        role: roleForm.role.trim(),
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        permissions: roleForm.permissions,
        createdAt: new Date()
      });
      
      console.log('创建角色返回结果:', result);
      
      // 检查是否有错误码
      if (result.code) {
        throw new Error(result.message || '创建失败');
      }
      
      await addOperationLog('角色管理', '新增', `创建角色: ${roleForm.name} (${roleForm.role})`);
      
      // 等待一下确保数据库写入完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      alert('角色创建成功');
      setShowAddRoleModal(false);
      
      // 强制刷新角色列表
      console.log('刷新角色列表...');
      await loadRolePermissions();
    } catch (error: any) {
      console.error('创建角色失败:', error);
      alert(`创建失败: ${error.message || '请重试'}`);
    }
  };
  
  // 打开编辑角色modal
  // 转换旧权限键名为新权限键名
  const normalizePermissions = (permissions: any) => {
    if (!permissions) return {};
    
    const normalized = { ...permissions };
    
    // 转换旧键名为新键名
    if (normalized.task) {
      normalized.tasks = normalized.task;
      delete normalized.task;
    }
    if (normalized.opportunity) {
      normalized.opportunities = normalized.opportunity;
      delete normalized.opportunity;
    }
    if (normalized.project) {
      normalized.projects = normalized.project;
      delete normalized.project;
    }
    
    return normalized;
  };

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    setRoleForm({
      role: role.role,
      name: role.name,
      description: role.description || '',
      permissions: normalizePermissions(role.permissions)
    });
    setShowEditRoleModal(true);
  };
  
  // 保存角色权限
  const handleSaveRole = async () => {
    if (!selectedRole) return;
    
    // 检查是否为管理员
    if (userRole !== 'admin') {
      alert('只有管理员才能编辑角色');
      return;
    }
    
    try {
      // 尝试多种可能的ID字段名
      const possibleId = selectedRole._id || selectedRole.id || selectedRole.docId;
      
      if (!possibleId) {
        console.error('selectedRole对象:', selectedRole);
        throw new Error('找不到角色ID字段');
      }
      
      const docId = String(possibleId);
      
      if (docId === 'undefined' || docId === 'null' || docId === '') {
        console.error('无效的docId:', docId, '原始数据:', selectedRole);
        throw new Error('角色ID无效');
      }
      
      console.log('准备更新角色，docId:', docId);
      console.log('即将保存的权限数据:', JSON.stringify(roleForm.permissions, null, 2));
      
      await db.collection('role_permissions').doc(docId).update({
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        updatedAt: new Date()
      });
      
      console.log('✅ 角色权限已保存到数据库');
      
      await addOperationLog('角色管理', '编辑', `编辑角色: ${roleForm.name}`);
      // ✅ 移除保存确认提示
      setShowEditRoleModal(false);
      setSelectedRole(null);
      await loadRolePermissions();
    } catch (error: any) {
      console.error('保存角色权限失败:', error);
      alert(`保存失败: ${error.message || '请重试'}`);
    }
  };
  
  // 删除角色
  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    // 检查是否为管理员
    if (userRole !== 'admin') {
      alert('只有管理员才能删除角色');
      return;
    }
    
    // 禁止删除admin角色
    if (selectedRole.role === 'admin') {
      alert('不能删除管理员角色');
      return;
    }
    
    // ✅ 添加删除确认
    if (!showConfirm(`确定要删除角色「${selectedRole.name}」吗？\n\n此操作不可撤销！`)) {
      return;
    }
    
    try {
      // 检查该角色是否有用户在使用
      const usersResult = await db.collection('users')
        .where({ role: selectedRole.role })
        .count();
      
      if (usersResult.total > 0) {
        alert(`该角色下还有 ${usersResult.total} 个用户，无法删除。请先修改这些用户的角色。`);
        return;
      }
      
      // 删除角色
      const docId = selectedRole._id || selectedRole.id || selectedRole.docId;
      if (!docId) {
        throw new Error('无法获取角色ID');
      }
      
      await db.collection('role_permissions').doc(docId).remove();
      await addOperationLog('角色管理', '删除', `删除角色: ${selectedRole.name}`);
      
      alert('角色已删除');
      setShowDeleteRoleModal(false);
      setSelectedRole(null);
      await loadRolePermissions();
    } catch (error: any) {
      console.error('删除角色失败:', error);
      alert(`删除失败: ${error.message || '请重试'}`);
    }
  };
  
  // 更新角色权限中的某个模块的某个操作
  const handleTogglePermission = (module: string, action: string) => {
    console.log('切换权限:', module, action, '当前值:', roleForm.permissions[module]?.[action]);
    
    setRoleForm(prev => {
      const newPermissions = { ...prev.permissions };
      if (!newPermissions[module]) {
        newPermissions[module] = {};
      }
      newPermissions[module] = {
        ...newPermissions[module],
        [action]: !newPermissions[module][action]
      };
      
      console.log('新权限对象:', newPermissions[module]);
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };
  
  // 获取角色的用户数量
  const getRoleUserCount = async (role: string) => {
    try {
      const result = await db.collection('users')
        .where({ role: role, approvalStatus: 'approved' })
        .count();
      return result.total;
    } catch (error) {
      console.error('获取角色用户数量失败:', error);
      return 0;
    }
  };
  
  // 加载操作日志
  useEffect(() => {
    if (selectedTab === 'logs') {
      loadLogs();
    }
  }, [selectedTab]);
  
  // 加载角色权限
  useEffect(() => {
    if (selectedTab === 'role') {
      loadRolePermissions();
    }
  }, [selectedTab]);
  
  // 加载类型设置
  useEffect(() => {
    if (selectedTab === 'types') {
      loadTypeSettings();
      loadCompanyLogo(); // 加载公司Logo
    }
  }, [selectedTab]);
  
  // 加载公司Logo
  const loadCompanyLogo = async () => {
    try {
      const result = await db.collection('type_settings')
        .where({ type: 'companyLogo' })
        .get();
      
      if (result.data && result.data.length > 0) {
        const logoData = result.data[0].values?.[0];
        if (logoData) {
          setCompanyLogo(logoData);
          
          // 支持两种格式：Base64编码 或 云存储URL
          if (logoData.base64) {
            // Base64编码格式
            setLogoPreview(logoData.base64);
          } else if (logoData.tempFileURL) {
            // 云存储URL格式
            setLogoPreview(logoData.tempFileURL);
          }
        }
      }
    } catch (error) {
      console.error('加载Logo失败:', error);
    }
  };
  
  // 处理Logo文件选择
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('只支持PNG、JPG、JPEG、SVG格式的图片');
      return;
    }
    
    // 验证文件大小（2MB）
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('文件大小不能超过2MB');
      return;
    }
    
    setLogoFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // 上传Logo（使用Base64编码存储到数据库）
  const handleUploadLogo = async () => {
    if (!logoFile) {
      alert('请先选择Logo文件');
      return;
    }
    
    setUploadingLogo(true);
    
    try {
      // 确保 logoFile 存在后再访问属性
      const fileName = logoFile.name;
      const fileType = logoFile.type;
      const fileSize = logoFile.size;
      
      console.log('开始上传Logo:', fileName, 'Type:', fileType, 'Size:', fileSize);
      
      // 将文件转换为Base64编码
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsDataURL(logoFile);
      });
      
      console.log('Base64编码完成，长度:', base64.length);
      
      // 保存Logo信息到数据库（使用Base64编码）
      const logoData = {
        base64,
        fileName,
        fileType,
        fileSize,
        uploadTime: new Date().toISOString()
      };
      
      console.log('准备保存Logo数据到数据库');
      
      // 查询是否已存在companyLogo记录
      const existingResult = await db.collection('type_settings')
        .where({ type: 'companyLogo' })
        .get();
      
      console.log('现有Logo记录:', existingResult.data?.length || 0);
      
      if (existingResult.data && existingResult.data.length > 0) {
        // 更新现有记录
        const updateResult = await db.collection('type_settings')
          .doc(existingResult.data[0]._id)
          .update({
            values: [logoData],
            updatedAt: new Date()
          });
        console.log('更新记录结果:', updateResult);
      } else {
        // 创建新记录
        const addResult = await db.collection('type_settings').add({
          type: 'companyLogo',
          name: '公司Logo',
          values: [logoData],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('创建记录结果:', addResult);
      }
      
      // 更新状态
      setCompanyLogo(logoData as any);
      setLogoFile(null);
      setLogoPreview(base64); // 立即更新预览
      
      // 记录操作日志
      await addOperationLog('类型设置', '上传公司Logo', `上传新Logo文件: ${fileName}`);
      
      console.log('✅ Logo上传完成!');
      alert('✅ Logo上传成功！页面将自动刷新显示新Logo。');
      
      // 刷新页面以更新所有Logo显示
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ 上传Logo失败:', error);
      console.error('错误类型:', error?.constructor?.name);
      console.error('错误消息:', error?.message);
      console.error('错误堆栈:', error?.stack);
      
      let errorMsg = '上传失败，请稍后重试';
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      alert(`❌ ${errorMsg}`);
    } finally {
      setUploadingLogo(false);
    }
  };
  
  // 删除Logo
  const handleDeleteLogo = async () => {
    if (!companyLogo) {
      alert('当前没有Logo');
      return;
    }
    
    if (!showConfirm('确定要删除公司Logo吗？删除后将恢复默认Logo。')) {
      return;
    }
    
    try {
      console.log('开始删除Logo');
      
      // 如果是云存储文件，删除云存储中的文件
      if (companyLogo.fileID) {
        try {
          await app.deleteFile({
            fileList: [companyLogo.fileID]
          });
          console.log('已删除云存储文件');
        } catch (error) {
          console.error('删除云存储文件失败:', error);
          // 继续执行，删除数据库记录
        }
      }
      
      // 删除数据库记录
      const result = await db.collection('type_settings')
        .where({ type: 'companyLogo' })
        .get();
      
      if (result.data && result.data.length > 0) {
        await db.collection('type_settings')
          .doc(result.data[0]._id)
          .remove();
        console.log('已删除数据库记录');
      }
      
      // 重置状态
      setCompanyLogo(null);
      setLogoPreview('');
      setLogoFile(null);
      
      // 记录操作日志
      await addOperationLog('类型设置', '删除公司Logo', '删除公司Logo文件');
      
      console.log('✅ Logo删除成功');
      alert('✅ Logo删除成功！页面将自动刷新恢复默认Logo。');
      
      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('删除Logo失败:', error);
      alert('删除失败，请稍后重试');
    }
  };
  
  // 从数据库加载所有类型设置
  const loadTypeSettings = async () => {
    try {
      // 加载所有类型设置
      const result = await db.collection('type_settings').get();
      
      // 默认值配置(字符串数组格式)
      const defaults: Record<string, string[]> = {
        moduleNames: ['工作台', '任务管理', '商机管理', '项目管理', '目标管理'],
        moduleCategory: ['核心业务', '辅助功能', '管理功能', '报表分析'], // 🆕 功能模块分类
        task: ['日常工作', '商机跟进', '项目任务', '采购任务'],  // 🆕 添加采购任务
        taskStatus: ['未开始', '进行中', '已完成', '延期', '取消', '暂停'],
        opportunity: ['跟进线索', '方案咨询', '商务谈判'],
        action: ['拜访客户', '联络客户感情', '了解年度采购计划', '提交公司资质和案例', '样衣展示和试穿', '提交定制方案和报价', '提交投标文件', '价格谈判', '合同条款确认', '其它'],
        preparation: ['物料采购', '样衣生产', '量体数据采集'],
        production: ['缝制生产', '质量检验', '产品入库'],
        delivery: ['物流配送', '产品交付', '售后服务'],
        projectStatus: ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停'],
        productType: ['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它'],
        strategyStatus: ['未开始', '进行中', '已完成', '暂停']
      };
      
      // 默认类型名称映射
      const defaultNames: Record<string, string> = {
        moduleNames: '功能模块名称',
        moduleCategory: '功能模块分类', // 🆕 功能模块分类
        task: '任务类型设置',
        taskStatus: '任务状态设置',
        opportunity: '商机阶段设置',
        action: '商机跟进动作类型',
        preparation: '项目准备期环节设置',
        production: '项目生产期环节设置',
        delivery: '项目交付期环节设置',
        projectStatus: '项目阶段设置',
        productType: '产品类型设置',
        strategyStatus: '经营策略状态设置'
      };
      
      // 🔧 去重：只保留每个type的最新记录
      const typeMap: Record<string, { item: any; items: TypeItem[] }> = {};
      const duplicateIds: string[] = []; // 记录需要删除的重复记录ID
      
      if (result.data && Array.isArray(result.data)) {
        // 按type分组，并找出每组中最新的记录
        result.data.forEach((item: any) => {
          const existingRecord = typeMap[item.type];
          
          // 转换items格式
          let items: TypeItem[] = [];
          if (item.values && Array.isArray(item.values)) {
            if (item.values.length > 0 && typeof item.values[0] === 'string') {
              // 旧格式：转换为新格式
              items = item.values.map((v: string) => ({ 
                value: v, 
                enabled: true,
                isSystem: defaults[item.type]?.includes(v) || false
              }));
            } else {
              // 新格式
              items = item.values.map((v: any) => ({
                value: v.value,
                enabled: v.enabled !== undefined ? v.enabled : true,
                isSystem: v.isSystem !== undefined ? v.isSystem : (defaults[item.type]?.includes(v.value) || false)
              }));
            }
          }
          
          if (!existingRecord) {
            // 第一次遇到此type，直接记录
            typeMap[item.type] = { item, items };
          } else {
            // 已存在相同type，比较更新时间
            const existingTime = existingRecord.item.updatedAt?.$date || existingRecord.item.createdAt?.$date || 0;
            const currentTime = item.updatedAt?.$date || item.createdAt?.$date || 0;
            
            if (currentTime > existingTime) {
              // 当前记录更新，标记旧记录为重复
              duplicateIds.push(existingRecord.item._id);
              typeMap[item.type] = { item, items };
            } else {
              // 保留现有记录，标记当前记录为重复
              duplicateIds.push(item._id);
            }
          }
        });
      }
      
      // 🔧 删除重复记录（安全删除：只删除标记的重复项）
      if (duplicateIds.length > 0) {
        console.warn(`发现 ${duplicateIds.length} 条重复的类型设置记录，正在清理...`);
        for (const id of duplicateIds) {
          try {
            await db.collection('type_settings').doc(id).remove();
            console.log(`已删除重复记录: ${id}`);
          } catch (err) {
            console.error(`删除重复记录失败 ${id}:`, err);
          }
        }
      }
      
      // 构建最终的类型数据
      const allTypes: Array<{ key: string; name: string; items: TypeItem[] }> = [];
      const existingTypes = new Set<string>();
      
      for (const [type, record] of Object.entries(typeMap)) {
        existingTypes.add(type);
        allTypes.push({
          key: type,
          name: record.item.name || defaultNames[type] || type,
          items: record.items
        });
      }
      
      // 检查并初始化缺失的默认类型设置
      for (const [type, defaultValues] of Object.entries(defaults)) {
        if (!existingTypes.has(type)) {
          const defaultItems = defaultValues.map(v => ({ value: v, enabled: true, isSystem: true }));
          console.log(`初始化缺失的类型设置: ${type}`);
          
          try {
            await db.collection('type_settings').add({
              type,
              name: defaultNames[type],
              values: defaultItems,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            typeMap[type] = { 
              item: { type, name: defaultNames[type], values: defaultItems },
              items: defaultItems 
            };
            
            allTypes.push({
              key: type,
              name: defaultNames[type],
              items: defaultItems
            });
          } catch (err) {
            console.error(`初始化类型设置失败 ${type}:`, err);
          }
        }
      }
      
      // 设置各类型数据
      setModuleNames(typeMap.moduleNames?.items || defaults.moduleNames.map(v => ({ value: v, enabled: true })));
      setModuleCategories(typeMap.moduleCategory?.items || defaults.moduleCategory.map(v => ({ value: v, enabled: true }))); // 🆕 功能模块分类
      setTaskTypes(typeMap.task?.items || defaults.task.map(v => ({ value: v, enabled: true })));
      setTaskStatuses(typeMap.taskStatus?.items || defaults.taskStatus.map(v => ({ value: v, enabled: true })));
      setOpportunityStages(typeMap.opportunity?.items || defaults.opportunity.map(v => ({ value: v, enabled: true })));
      setOpportunityActionTypes(typeMap.action?.items || defaults.action.map(v => ({ value: v, enabled: true })));
      setPreparationPhases(typeMap.preparation?.items || defaults.preparation.map(v => ({ value: v, enabled: true })));
      setProductionPhases(typeMap.production?.items || defaults.production.map(v => ({ value: v, enabled: true })));
      setDeliveryPhases(typeMap.delivery?.items || defaults.delivery.map(v => ({ value: v, enabled: true })));
      setProjectStatuses(typeMap.projectStatus?.items || defaults.projectStatus.map(v => ({ value: v, enabled: true })));
      setProductTypes(typeMap.productType?.items || defaults.productType.map(v => ({ value: v, enabled: true })));
      setStrategyStatuses(typeMap.strategyStatus?.items || defaults.strategyStatus.map(v => ({ value: v, enabled: true })));
      
      // 设置所有类型设置
      setAllTypeSettings(allTypes);
      
      // 初始化折叠状态
      const initialCollapsed: Record<string, boolean> = {};
      allTypes.forEach(type => {
        initialCollapsed[type.key] = true; // 默认折叠
      });
      setCollapsedSections(initialCollapsed);
      
      console.log('类型设置加载完成，共', allTypes.length, '个类型');
      if (duplicateIds.length > 0) {
        console.log('已清理重复记录', duplicateIds.length, '条');
      }
      
    } catch (error) {
      console.error('加载类型设置失败:', error);
      // 出错时使用默认值,但不保存到数据库
      const defaults: Record<string, string[]> = {
        moduleCategory: ['核心业务', '辅助功能', '管理功能', '报表分析'], // 🆕 功能模块分类
        task: ['日常工作', '商机跟进', '项目任务', '采购任务'],  // 🆕 添加采购任务
        taskStatus: ['未开始', '进行中', '已完成', '延期', '取消', '暂停'],
        opportunity: ['跟进线索', '方案咨询', '商务谈判'],
        action: ['拜访客户', '联络客户感情', '了解年度采购计划', '提交公司资质和案例', '样衣展示和试穿', '提交定制方案和报价', '提交投标文件', '价格谈判', '合同条款确认', '其它'],
        preparation: ['物料采购', '样衣生产', '量体数据采集'],
        production: ['缝制生产', '质量检验', '产品入库'],
        delivery: ['物流配送', '产品交付', '售后服务'],
        projectStatus: ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停'],
        productType: ['西服套装', '衬衫', '大衣', '冲锋衣', '休闲裤', '配饰', '其它']
      };
      
      setTaskTypes(defaults.task.map(v => ({ value: v, enabled: true })));
      setModuleCategories(defaults.moduleCategory?.map(v => ({ value: v, enabled: true })) || []); // 🆕 功能模块分类
      setTaskStatuses(defaults.taskStatus.map(v => ({ value: v, enabled: true })));
      setOpportunityStages(defaults.opportunity.map(v => ({ value: v, enabled: true })));
      setOpportunityActionTypes(defaults.action.map(v => ({ value: v, enabled: true })));
      setPreparationPhases(defaults.preparation.map(v => ({ value: v, enabled: true })));
      setProductionPhases(defaults.production.map(v => ({ value: v, enabled: true })));
      setDeliveryPhases(defaults.delivery.map(v => ({ value: v, enabled: true })));
      setProjectStatuses(defaults.projectStatus.map(v => ({ value: v, enabled: true })));
      setProductTypes(defaults.productType.map(v => ({ value: v, enabled: true })));
    }
  };
  
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // ✅ 只加载已审核通过的用户
      const result = await db.collection('users')
        .where({ approvalStatus: 'approved' })
        .get();
      
      // 🔧 过滤掉已删除的用户和 admin 超级用户（系统默认隐藏）
      const activeUsers = result.data.filter((user: any) => 
        user.deleted !== true && user.username !== 'admin'
      );
      
      // 加载所有部门以匹配员工所属部门
      const deptResult = await db.collection('departments').get();
      
      // 建立员工ID到部门列表的映射（支持多部门）
      const deptMap = new Map<string, string[]>();
      deptResult.data.forEach((dept: any) => {
        if (dept.memberIds && Array.isArray(dept.memberIds)) {
          dept.memberIds.forEach((memberId: string) => {
            if (!deptMap.has(memberId)) {
              deptMap.set(memberId, []);
            }
            deptMap.get(memberId)!.push(dept.name);
          });
        }
      });
      
      // 为员工添加部门名称列表
      const employeesWithDept = activeUsers.map((emp: any) => {
        const departments = deptMap.get(emp._id) || [];
        return {
          ...emp,
          departments: departments, // 部门数组
          departmentNames: departments.length > 0 ? departments.join('、') : '-' // 显示用的字符串
        };
      });
      
      // 为员工添加上级姓名
      const employeesWithSupervisor = employeesWithDept.map((emp: any) => {
        // ✅ 清理roles数组：只保留有效的角色ID（排除MongoDB哈希值）
        const validRoleIds = ['admin', 'manager', 'employee', 'test']; // 已知的有效角色ID
        let cleanedRoles = emp.roles || (emp.role ? [emp.role] : []);
        
        // 过滤掉哈希值（长度>20的字符串通常是MongoDB的_id）
        cleanedRoles = cleanedRoles.filter((roleId: string) => {
          // 如果是已知的有效角色ID，保留
          if (validRoleIds.includes(roleId)) {
            return true;
          }
          // 如果长度>20，可能是哈希值，过滤掉
          if (roleId.length > 20) {
            console.warn('⚠️ 员工', emp.name, '过滤掉疑似哈希值的角色ID:', roleId);
            return false;
          }
          // 其他情况保留（可能是自定义角色）
          return true;
        });
        
        if (emp.supervisorId) {
          const supervisor = employeesWithDept.find((e: any) => e._id === emp.supervisorId);
          return {
            ...emp,
            roles: cleanedRoles, // ✅ 使用清理后的角色数组
            supervisorName: supervisor ? supervisor.name : '未知'
          };
        }
        return {
          ...emp,
          roles: cleanedRoles, // ✅ 使用清理后的角色数组
          supervisorName: '-'
        };
      });
      
      console.log('加载的员工列表:', employeesWithSupervisor);
      setEmployees(employeesWithSupervisor);
    } catch (error) {
      console.error('加载员工列表失败:', error);
      alert('加载员工列表失败，请刷新页面重试');
    } finally {
      setLoadingEmployees(false);
    }
  };
  
  // 过滤员工列表
  const getFilteredEmployees = () => {
    let filtered = [...employees];
    
    // 搜索过滤(姓名、用户名、手机号)
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        (emp.name && emp.name.toLowerCase().includes(keyword)) ||
        (emp.username && emp.username.toLowerCase().includes(keyword)) ||
        (emp.phone && emp.phone.includes(keyword))
      );
    }
    
    // 部门过滤
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(emp => 
        emp.departments && emp.departments.includes(filterDepartment)
      );
    }
    
    // 角色过滤
    if (filterRole !== 'all') {
      filtered = filtered.filter(emp => {
        if (!emp.roles || !Array.isArray(emp.roles)) {
          return filterRole === 'employee'; // 默认角色（只有user）
        }
        
        // 特殊处理：employee 表示只有 user 角色的员工
        if (filterRole === 'employee') {
          const nonUserRoles = emp.roles.filter((r: string) => r !== 'user');
          return nonUserRoles.length === 0; // 只有user角色
        }
        
        // 其他角色：检查是否包含该角色
        return emp.roles.includes(filterRole);
      });
    }
    
    return filtered;
  };
  
  // 加载部门列表
  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const result = await db.collection('departments').get();
      console.log('加载的部门列表:', result.data);
      setDepartments(result.data);
    } catch (error) {
      console.error('加载部门列表失败:', error);
      alert('加载部门列表失败，请刷新页面重试');
    } finally {
      setLoadingDepartments(false);
    }
  };
  
  // 加载操作日志
  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const startDateTime = new Date(logStartDate + 'T00:00:00');
      const endDateTime = new Date(logEndDate + 'T23:59:59');
      
      const result = await db.collection('operation_logs')
        .where({
          createdAt: db.command.gte(startDateTime.getTime()).and(db.command.lte(endDateTime.getTime()))
        })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      
      console.log('加载的操作日志:', result.data);
      setLogs(result.data);
    } catch (error) {
      console.error('加载操作日志失败:', error);
      alert('加载操作日志失败，请刷新页面重试');
    } finally {
      setLoadingLogs(false);
    }
  };
  
  // 记录操作日志的通用函数
  const addOperationLog = async (module: string, action: string, details: string) => {
    try {
      await db.collection('operation_logs').add({
        userId: currentUser._id,
        username: currentUser.username,
        name: currentUser.name || currentUser.username,
        module, // 模块: 员工管理、部门管理、用户审核、类型设置等
        action, // 操作: 新增、编辑、删除、审核等
        details, // 详细描述
        createdAt: new Date()
      });
      console.log('操作日志已记录:', { module, action, details });
    } catch (error) {
      console.error('记录操作日志失败:', error);
    }
  };
  
  // 清空操作日志
  const handleClearLogs = async () => {
    try {
      // 获取所有日志记录
      const result = await db.collection('operation_logs').get();
      
      // 批量删除
      const batch = [];
      for (const log of result.data) {
        batch.push(
          db.collection('operation_logs').doc(log._id).remove()
        );
      }
      
      await Promise.all(batch);
      
      alert(`成功清空 ${result.data.length} 条操作日志！`);
      setShowClearLogsModal(false);
      loadLogs(); // 重新加载日志列表
    } catch (error) {
      console.error('清空操作日志失败:', error);
      alert('清空操作日志失败: ' + (error as any).message);
    }
  };
  
  // 打开编辑模态框
  const handleEditEmployee = async (employee: any) => {
    // 确保角色列表已加载
    if (rolePermissions.length === 0) {
      await loadRolePermissions();
    }
    
    // 获取员工的角色（优先使用roles数组，否则使用role字段）
    let employeeRoles = employee.roles || (employee.role ? [employee.role] : []);
    
    // 过滤掉不存在的角色（如'user'），只保留在角色清单中的角色
    const validRoleIds = rolePermissions.map(r => r.role);
    employeeRoles = employeeRoles.filter((roleId: string) => validRoleIds.includes(roleId));
    
    // ✅ v2.2.0: 不再默认分配角色，保持空数组
    
    console.log('打开编辑弹窗，员工角色:', {
      原始roles: employee.roles,
      原始role: employee.role,
      过滤后roles: employeeRoles,
      可用角色: validRoleIds
    });
    
    setSelectedEmployee(employee);
    setEditForm({
      name: employee.name || '',
      phone: employee.phone || '',
      departments: employee.departments || [], // 使用多部门数组
      roles: employeeRoles, // 使用过滤后的有效角色
      status: employee.status || '在职',
      approvalStatus: employee.approvalStatus || '已通过', // 审核状态
      supervisorId: employee.supervisorId || '', // 上级ID
      position: employee.position || '' // 职务
    });
    
    // 确保部门列表已加载
    if (departments.length === 0) {
      await loadDepartments();
    }
    
    setShowEditModal(true);
  };
  
  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;
    
    try {
      console.log('准备保存员工信息:', {
        selectedEmployee,
        editForm,
        roles: editForm.roles,
        primaryRole: editForm.roles[0] || 'employee'
      });
      
      const oldDepartments = selectedEmployee.departments || [];
      const newDepartments = editForm.departments;
      
      // 更新用户数据库（不包含phone，因为手机号不可修改）
      // 将departments数组转为逗号分隔的字符串存储（兼容旧字段）
      const updateData: {
        name: string;
        phone: string;
        departments: string[];
        roles: string[];
        status: string;
        supervisorId: string;
        position: string;
        approvalStatus?: string;
        department?: string;
        role?: string;
        updatedAt: Date;
      } = {
        name: editForm.name,
        phone: editForm.phone,
        department: newDepartments.join('、'), // 兼容旧字段
        departments: newDepartments, // 新的多部门字段
        role: editForm.roles[0] || '', // ✅ v2.2.0: 空字符串，不使用默认角色
        roles: editForm.roles, // 多角色数组
        status: editForm.status,
        approvalStatus: editForm.approvalStatus, // 🔧 修复：添加审核状态字段
        supervisorId: editForm.supervisorId || null as any, // 上级ID，如果为空则设为null
        position: editForm.position || '', // 职务
        updatedAt: new Date()
      };
      
      console.log('即将更新数据库，数据:', updateData);
      
      const result = await db.collection('users')
        .doc(selectedEmployee._id)
        .update(updateData);
      
      console.log('数据库更新结果:', result);
      
      // ✅ 移除保存确认提示 (原: alert('员工信息已更新');)
      
      // 找出被移除的部门
      const removedDepartments = oldDepartments.filter(
        (dept: string) => !newDepartments.includes(dept)
      );
      
      // 找出新增的部门
      const addedDepartments = newDepartments.filter(
        (dept: string) => !oldDepartments.includes(dept)
      );
      
      // 从被移除的部门中删除该员工
      for (const deptName of removedDepartments) {
        const deptResult = await db.collection('departments')
          .where({ name: deptName })
          .get();
        
        if (deptResult.data.length > 0) {
          const dept = deptResult.data[0];
          const updatedMemberIds = (dept.memberIds || []).filter(
            (id: string) => id !== selectedEmployee._id
          );
          
          await db.collection('departments')
            .doc(dept._id)
            .update({
              memberIds: updatedMemberIds,
              memberCount: updatedMemberIds.length,
              updatedAt: new Date()
            });
        }
      }
      
      // 添加到新部门
      for (const deptName of addedDepartments) {
        const deptResult = await db.collection('departments')
          .where({ name: deptName })
          .get();
        
        if (deptResult.data.length > 0) {
          const dept = deptResult.data[0];
          const currentMemberIds = dept.memberIds || [];
          
          // 避免重复添加
          if (!currentMemberIds.includes(selectedEmployee._id)) {
            const updatedMemberIds = [...currentMemberIds, selectedEmployee._id];
            
            await db.collection('departments')
              .doc(dept._id)
              .update({
                memberIds: updatedMemberIds,
                memberCount: updatedMemberIds.length,
                updatedAt: new Date()
              });
          }
        }
      }
      
      console.log('员工信息更新成功，准备记录日志和刷新列表');
      
      // 用户信息更新成功 - 静默操作，无需提示
      
      // 记录操作日志
      await addOperationLog(
        '员工管理',
        '编辑员工',
        `编辑了员工 ${editForm.name}(${selectedEmployee.username}) 的信息`
      );
      
      console.log('操作日志记录完成，关闭弹窗并刷新列表');
      
      setShowEditModal(false);
      setSelectedEmployee(null);
      loadEmployees(); // 重新加载列表
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新用户失败: ' + (error as any).message);
    }
  };
  
  // 生成邀请注册链接（小程序版）
  const handleGenerateInvitation = async () => {
    setGeneratingInvitation(true);
    try {
      // 调用云函数生成小程序码
      const result = await app.callFunction({
        name: 'createInvitation',
        data: {
          action: 'create'
        }
      });

      console.log('createInvitation result:', result);

      if (result.result.code === 200) {
        const { invitationCode, qrCodeBuffer, expireAt } = result.result.data;
        
        // 将小程序码 buffer 转换为 base64 图片
        let qrCodeUrl = '';
        if (qrCodeBuffer) {
          // Buffer 转 base64
          const base64 = btoa(
            new Uint8Array(qrCodeBuffer.data)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          qrCodeUrl = `data:image/png;base64,${base64}`;
        }
        
        // 计算过期时间
        const expireDate = new Date(expireAt);
        const expireText = `${expireDate.getMonth() + 1}月${expireDate.getDate()}日 ${expireDate.getHours()}:${expireDate.getMinutes().toString().padStart(2, '0')}`;
        
        setInvitationData({
          code: invitationCode,
          url: `扫码使用小程序注册（有效期至 ${expireText}）`,
          qrUrl: qrCodeUrl
        });
        
        setShowInvitationModal(true);
      } else {
        throw new Error(result.result.message || '生成小程序码失败');
      }
    } catch (error) {
      console.error('生成小程序码失败:', error);
      alert('生成小程序码失败: ' + (error as Error).message + '\n\n提示：请确保已配置小程序权限');
    } finally {
      setGeneratingInvitation(false);
    }
  };
  
  // 打开删除确认模态框
  const handleDeleteEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };
  
  // 确认删除
  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;
    
    // 🔧 防止删除 admin 超级用户
    if (selectedEmployee.username === 'admin' || selectedEmployee.role === 'admin') {
      alert('不能删除系统超级管理员账号！');
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      return;
    }
    
    try {
      // 从数据库删除用户
      await db.collection('users')
        .doc(selectedEmployee._id)
        .remove();
      
      // 从所有所属部门的memberIds中移除该员工
      const departments = selectedEmployee.departments || [];
      for (const deptName of departments) {
        const deptResult = await db.collection('departments')
          .where({ name: deptName })
          .get();
        
        if (deptResult.data.length > 0) {
          const dept = deptResult.data[0];
          const updatedMemberIds = (dept.memberIds || []).filter(
            (id: string) => id !== selectedEmployee._id
          );
          
          await db.collection('departments')
            .doc(dept._id)
            .update({
              memberIds: updatedMemberIds,
              memberCount: updatedMemberIds.length,
              updatedAt: new Date()
            });
        }
      }
      
      // 用户删除成功 - 静默操作，无需提示
      
      // 记录操作日志
      await addOperationLog(
        '员工管理',
        '删除员工',
        `删除了员工 ${selectedEmployee.name}(${selectedEmployee.username})`
      );
      
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      loadEmployees(); // 重新加载列表
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败: ' + (error as any).message);
    }
  };

  // 打开添加部门模态框
  const handleAddDepartment = () => {
    setDepartmentForm({
      name: '',
      leaderId: '',
      leaderName: '',
      description: '',
      memberIds: []
    });
    setShowDepartmentModal(true);
  };
  
  // 打开编辑部门模态框
  const handleEditDepartment = (department: any) => {
    setSelectedDepartment(department);
    setDepartmentForm({
      name: department.name || '',
      leaderId: department.leaderId || '',
      leaderName: department.leaderName || '',
      description: department.description || '',
      memberIds: department.memberIds || []
    });
    setShowEditDepartmentModal(true);
  };
  
  // 保存新增部门
  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      alert('请输入部门名称');
      return;
    }
    if (!departmentForm.leaderId) {
      alert('请选择部门负责人');
      return;
    }
    
    try {
      // 检查部门名称是否重复
      const existingDept = await db.collection('departments')
        .where({ name: departmentForm.name.trim() })
        .get();
      
      if (existingDept.data.length > 0) {
        alert('该部门名称已存在，请使用其他名称');
        return;
      }
      
      const departmentName = departmentForm.name.trim();
      
      // 创建部门
      await db.collection('departments').add({
        name: departmentName,
        leaderId: departmentForm.leaderId,
        leaderName: departmentForm.leaderName,
        description: departmentForm.description.trim(),
        memberIds: departmentForm.memberIds,
        memberCount: departmentForm.memberIds.length,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 同步更新所有成员的department字段
      if (departmentForm.memberIds.length > 0) {
        for (const memberId of departmentForm.memberIds) {
          await db.collection('users')
            .doc(memberId)
            .update({
              department: departmentName,
              updatedAt: new Date()
            });
        }
      }
      
      // ✅ 移除保存确认提示 (部门创建成功 - 静默操作，无需提示)
      
      // 记录操作日志
      await addOperationLog(
        '部门管理',
        '新增部门',
        `创建了部门 ${departmentName}，负责人：${departmentForm.leaderName}，成员数：${departmentForm.memberIds.length}`
      );
      
      setShowDepartmentModal(false);
      loadDepartments(); // 重新加载列表
      if (selectedTab === 'team') {
        loadEmployees(); // 如果在员工管理页面，也刷新员工列表
      }
    } catch (error) {
      console.error('创建部门失败:', error);
      alert('创建部门失败: ' + (error as any).message);
    }
  };
  
  // 保存编辑部门
  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return;
    
    if (!departmentForm.name.trim()) {
      alert('请输入部门名称');
      return;
    }
    if (!departmentForm.leaderId) {
      alert('请选择部门负责人');
      return;
    }
    
    try {
      // 检查部门名称是否与其他部门重复
      const existingDept = await db.collection('departments')
        .where({ name: departmentForm.name.trim() })
        .get();
      
      const isDuplicate = existingDept.data.some(
        (dept: any) => dept._id !== selectedDepartment._id
      );
      
      if (isDuplicate) {
        alert('该部门名称已存在，请使用其他名称');
        return;
      }
      
      const oldDepartmentName = selectedDepartment.name;
      const newDepartmentName = departmentForm.name.trim();
      const oldMemberIds = selectedDepartment.memberIds || [];
      const newMemberIds = departmentForm.memberIds;
      
      // ✅ 移除保存确认提示
      // 更新部门
      await db.collection('departments')
        .doc(selectedDepartment._id)
        .update({
          name: newDepartmentName,
          leaderId: departmentForm.leaderId,
          leaderName: departmentForm.leaderName,
          description: departmentForm.description.trim(),
          memberIds: newMemberIds,
          memberCount: newMemberIds.length,
          updatedAt: new Date()
        });
      
      // 找出被移除的成员
      const removedMemberIds = oldMemberIds.filter(
        (id: string) => !newMemberIds.includes(id)
      );
      
      // 找出新增的成员
      const addedMemberIds = newMemberIds.filter(
        (id: string) => !oldMemberIds.includes(id)
      );
      
      // 更新被移除成员的department字段为空
      for (const memberId of removedMemberIds) {
        await db.collection('users')
          .doc(memberId)
          .update({
            department: '',
            updatedAt: new Date()
          });
      }
      
      // 更新新增成员的department字段
      for (const memberId of addedMemberIds) {
        await db.collection('users')
          .doc(memberId)
          .update({
            department: newDepartmentName,
            updatedAt: new Date()
          });
      }
      
      // 如果部门名称发生变化，更新所有保留成员的department字段
      if (oldDepartmentName !== newDepartmentName) {
        const retainedMemberIds = newMemberIds.filter(
          (id: string) => oldMemberIds.includes(id)
        );
        
        for (const memberId of retainedMemberIds) {
          await db.collection('users')
            .doc(memberId)
            .update({
              department: newDepartmentName,
              updatedAt: new Date()
            });
        }
      }
      
      // 部门更新成功 - 静默操作，无需提示
      
      // 记录操作日志
      await addOperationLog(
        '部门管理',
        '编辑部门',
        `编辑了部门 ${newDepartmentName}，负责人：${departmentForm.leaderName}，成员数：${newMemberIds.length}`
      );
      
      setShowEditDepartmentModal(false);
      setSelectedDepartment(null);
      loadDepartments(); // 重新加载列表
      if (selectedTab === 'team') {
        loadEmployees(); // 如果在员工管理页面，也刷新员工列表
      }
    } catch (error) {
      console.error('更新部门失败:', error);
      alert('更新部门失败: ' + (error as any).message);
    }
  };
  
  // 打开删除部门确认模态框
  const handleDeleteDepartment = (department: any) => {
    setSelectedDepartment(department);
    setShowDeleteDepartmentModal(true);
  };
  
  // 确认删除部门
  const handleConfirmDeleteDepartment = async () => {
    if (!selectedDepartment) return;
    
    try {
      // 删除部门
      await db.collection('departments')
        .doc(selectedDepartment._id)
        .remove();
      
      // 清除该部门所有成员的department字段
      const memberIds = selectedDepartment.memberIds || [];
      for (const memberId of memberIds) {
        await db.collection('users')
          .doc(memberId)
          .update({
            department: '',
            updatedAt: new Date()
          });
      }
      
      // 部门删除成功 - 静默操作，无需提示
      
      // 记录操作日志
      await addOperationLog(
        '部门管理',
        '删除部门',
        `删除了部门 ${selectedDepartment.name}，原成员数：${memberIds.length}`
      );
      
      setShowDeleteDepartmentModal(false);
      setSelectedDepartment(null);
      loadDepartments(); // 重新加载列表
      if (selectedTab === 'team') {
        loadEmployees(); // 如果在员工管理页面，也刷新员工列表
      }
    } catch (error) {
      console.error('删除部门失败:', error);
      alert('删除部门失败: ' + (error as any).message);
    }
  };
  
  // 打开新增类型模态框
  const handleOpenAddType = (category: string) => {
    setEditingTypeCategory(category);
    setTypeFormValue('');
    setShowAddTypeModal(category);
  };

  // 打开编辑类型模态框
  const handleOpenEditType = (category: string, index: number, currentValue: string) => {
    // 检查是否为系统参数
    let isSystemParam = false;
    switch (category) {
      case 'moduleNames':
        isSystemParam = moduleNames[index]?.isSystem || false;
        break;
      case 'task':
        isSystemParam = taskTypes[index]?.isSystem || false;
        break;
      case 'taskStatus':
        isSystemParam = taskStatuses[index]?.isSystem || false;
        break;
      case 'opportunity':
        isSystemParam = opportunityStages[index]?.isSystem || false;
        break;
      case 'action':
        isSystemParam = opportunityActionTypes[index]?.isSystem || false;
        break;
      case 'preparation':
        isSystemParam = preparationPhases[index]?.isSystem || false;
        break;
      case 'production':
        isSystemParam = productionPhases[index]?.isSystem || false;
        break;
      case 'delivery':
        isSystemParam = deliveryPhases[index]?.isSystem || false;
        break;
      case 'projectStatus':
        isSystemParam = projectStatuses[index]?.isSystem || false;
        break;
      case 'productType':
        isSystemParam = productTypes[index]?.isSystem || false;
        break;
      case 'strategyStatus':
        isSystemParam = strategyStatuses[index]?.isSystem || false;
        break;
    }

    // 系统参数不能编辑
    if (isSystemParam) {
      alert('系统参数不能编辑！');
      return;
    }

    setEditingTypeCategory(category);
    setEditingTypeIndex(index);
    setTypeFormValue(currentValue);
    setShowEditTypeModal(true);
  };

  // 切换系统参数状态
  const handleToggleSystemParam = async (category: string, index: number) => {
    let newValues: TypeItem[] = [];
    let dbType = '';

    switch (category) {
      case 'moduleNames':
        newValues = [...moduleNames];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setModuleNames(newValues);
        dbType = 'moduleNames';
        break;
      case 'task':
        newValues = [...taskTypes];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setTaskTypes(newValues);
        dbType = 'task';
        break;
      case 'taskStatus':
        newValues = [...taskStatuses];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setTaskStatuses(newValues);
        dbType = 'taskStatus';
        break;
      case 'opportunity':
        newValues = [...opportunityStages];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setOpportunityStages(newValues);
        dbType = 'opportunity';
        break;
      case 'action':
        newValues = [...opportunityActionTypes];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setOpportunityActionTypes(newValues);
        dbType = 'action';
        break;
      case 'preparation':
        newValues = [...preparationPhases];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setPreparationPhases(newValues);
        dbType = 'preparation';
        break;
      case 'production':
        newValues = [...productionPhases];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setProductionPhases(newValues);
        dbType = 'production';
        break;
      case 'delivery':
        newValues = [...deliveryPhases];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setDeliveryPhases(newValues);
        dbType = 'delivery';
        break;
      case 'projectStatus':
        newValues = [...projectStatuses];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setProjectStatuses(newValues);
        dbType = 'projectStatus';
        break;
      case 'productType':
        newValues = [...productTypes];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setProductTypes(newValues);
        dbType = 'productType';
        break;
      case 'strategyStatus':
        newValues = [...strategyStatuses];
        newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
        setStrategyStatuses(newValues);
        dbType = 'strategyStatus';
        break;
      default:
        // 处理动态类型（自定义类型）
        const typeSetting = allTypeSettings.find(t => t.key === category);
        if (typeSetting) {
          newValues = [...typeSetting.items];
          newValues[index] = { ...newValues[index], isSystem: !newValues[index].isSystem };
          dbType = category;
        } else {
          console.error('未找到类型:', category);
          return;
        }
        break;
    }

    try {
      // 保存到数据库
      await saveTypeSettingsToDb(dbType, newValues);
      
      // 如果是动态类型，需要更新 allTypeSettings
      if (!['moduleNames', 'moduleCategory', 'task', 'taskStatus', 'opportunity', 'action', 'preparation', 'production', 'delivery', 'projectStatus', 'productType', 'strategyStatus'].includes(category)) {
        const updatedAllSettings = allTypeSettings.map(t => 
          t.key === category ? { ...t, items: newValues } : t
        );
        setAllTypeSettings(updatedAllSettings);
      }
      
      setHasUnsavedChanges(false);
      
      // 重新加载类型设置以确保数据同步
      await loadTypeSettings();
    } catch (error) {
      console.error('切换系统参数状态失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 渲染类型设置块（带折叠和启用开关）
  const renderTypeBlock = (
    category: string,
    title: string,
    items: TypeItem[]
  ) => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => toggleSection(category)}
      >
        <div className="flex items-center gap-2">
          {collapsedSections[category] ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
          <h3 className="text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            ({items.filter(item => item.enabled).length}/{items.length} 已启用)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {checkPermission('settings.typeSettings', 'edit') && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditCategory(category, title);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
              title="编辑类型名称"
            >
              编辑
            </button>
          )}
          {checkPermission('settings.typeSettings', 'delete') && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(category, items);
              }}
              className="text-sm text-red-600 hover:text-red-700"
              title="删除此类型设置"
            >
              删除
            </button>
          )}
          {checkPermission('settings.typeSettings', 'create') && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddType(category);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 新增
            </button>
          )}
        </div>
      </div>
      
      {!collapsedSections[category] && (
        <div className="p-6">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.enabled ? 'bg-gray-50' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={item.enabled}
                      onChange={() => handleToggleTypeEnabled(category, index)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className={`text-sm ${item.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.value}
                  </span>
                  {!item.enabled && (
                    <span className="text-xs text-gray-400">(已禁用)</span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">系统参数:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={item.isSystem || false}
                        onChange={() => handleToggleSystemParam(category, index)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  {checkPermission('settings.typeSettings', 'edit') && (
                    <button 
                      onClick={() => handleOpenEditType(category, index, item.value)}
                      disabled={item.isSystem}
                      className={`text-sm ${
                        item.isSystem 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                      title={item.isSystem ? '系统参数不可编辑' : '编辑'}
                    >
                      编辑
                    </button>
                  )}
                  {checkPermission('settings.typeSettings', 'delete') && (
                    <button 
                      onClick={() => handleDeleteType(category, index)}
                      disabled={item.isSystem}
                      className={`text-sm ${
                        item.isSystem 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-700'
                      }`}
                      title={item.isSystem ? '系统参数不可删除' : '删除'}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 保存新增类型 - 直接添加无需确认
  const handleSaveAddType = async () => {
    if (!typeFormValue.trim()) {
      alert('请输入内容');
      return;
    }

    const value = typeFormValue.trim();
    let newValues: TypeItem[] = [];
    let dbType = '';

    // 首先检查是否为固定的11个类型
    if (fixedTypes.includes(editingTypeCategory)) {
      // 处理固定类型（使用原有逻辑）
      switch (editingTypeCategory) {
        case 'moduleNames':
          if (moduleNames.some(t => t.value === value)) {
            alert('该模块名称已存在');
            return;
          }
          newValues = [...moduleNames, { value, enabled: true, isSystem: false }];
          setModuleNames(newValues);
          dbType = 'moduleNames';
          break;
        case 'moduleCategory': // 🆕 功能模块分类
          if (moduleCategories.some(t => t.value === value)) {
            alert('该分类已存在');
            return;
          }
          newValues = [...moduleCategories, { value, enabled: true, isSystem: false }];
          setModuleCategories(newValues);
          dbType = 'moduleCategory';
          break;
        case 'task':
          if (taskTypes.some(t => t.value === value)) {
            alert('该任务类型已存在');
            return;
          }
          newValues = [...taskTypes, { value, enabled: true, isSystem: false }];
          setTaskTypes(newValues);
          dbType = 'task';
          break;
        case 'taskStatus':
          if (taskStatuses.some(t => t.value === value)) {
            alert('该任务状态已存在');
            return;
          }
          newValues = [...taskStatuses, { value, enabled: true, isSystem: false }];
          setTaskStatuses(newValues);
          dbType = 'taskStatus';
          break;
        case 'opportunity':
          if (opportunityStages.some(t => t.value === value)) {
            alert('该商机阶段已存在');
            return;
          }
          newValues = [...opportunityStages, { value, enabled: true, isSystem: false }];
          setOpportunityStages(newValues);
          dbType = 'opportunity';
          break;
        case 'action':
          if (opportunityActionTypes.some(t => t.value === value)) {
            alert('该动作类型已存在');
            return;
          }
          newValues = [...opportunityActionTypes, { value, enabled: true, isSystem: false }];
          setOpportunityActionTypes(newValues);
          dbType = 'action';
          break;
        case 'preparation':
          if (preparationPhases.some(t => t.value === value)) {
            alert('该准备期环节已存在');
            return;
          }
          newValues = [...preparationPhases, { value, enabled: true, isSystem: false }];
          setPreparationPhases(newValues);
          dbType = 'preparation';
          break;
        case 'production':
          if (productionPhases.some(t => t.value === value)) {
            alert('该生产期环节已存在');
            return;
          }
          newValues = [...productionPhases, { value, enabled: true, isSystem: false }];
          setProductionPhases(newValues);
          dbType = 'production';
          break;
        case 'delivery':
          if (deliveryPhases.some(t => t.value === value)) {
            alert('该交付期环节已存在');
            return;
          }
          newValues = [...deliveryPhases, { value, enabled: true, isSystem: false }];
          setDeliveryPhases(newValues);
          dbType = 'delivery';
          break;
        case 'projectStatus':
          if (projectStatuses.some(t => t.value === value)) {
            alert('该项目阶段已存在');
            return;
          }
          newValues = [...projectStatuses, { value, enabled: true, isSystem: false }];
          setProjectStatuses(newValues);
          dbType = 'projectStatus';
          break;
        case 'productType':
          if (productTypes.some(t => t.value === value)) {
            alert('该产品类型已存在');
            return;
          }
          newValues = [...productTypes, { value, enabled: true, isSystem: false }];
          setProductTypes(newValues);
          dbType = 'productType';
          break;
        case 'strategyStatus':
          if (strategyStatuses.some(t => t.value === value)) {
            alert('该经营策略状态已存在');
            return;
          }
          newValues = [...strategyStatuses, { value, enabled: true, isSystem: false }];
          setStrategyStatuses(newValues);
          dbType = 'strategyStatus';
          break;
      }

      try {
        // 保存到数据库
        await saveTypeSettingsToDb(dbType, newValues);
        setShowAddTypeModal(null);
        setTypeFormValue('');
        setHasUnsavedChanges(false);
        
        // 重新加载类型设置以确保数据同步
        await loadTypeSettings();
      } catch (error) {
        console.error('保存类型设置失败:', error);
        alert('保存失败，请稍后重试');
      }
    } else {
      // 处理动态类型（新增的自定义类型）
      try {
        // 查询当前类型设置
        const result = await db.collection('type_settings')
          .where({ type: editingTypeCategory })
          .get();

        if (result.data && result.data.length > 0) {
          const typeSettingId = result.data[0]._id;
          const currentValues: TypeItem[] = result.data[0].values || [];

          // 检查是否已存在
          if (currentValues.some(t => t.value === value)) {
            alert('该选项已存在');
            return;
          }

          // 添加新值
          newValues = [...currentValues, { value, enabled: true, isSystem: false }];

          // 更新数据库
          await db.collection('type_settings').doc(typeSettingId).update({
            values: newValues,
            updatedAt: new Date()
          });

          // 记录操作日志
          await addOperationLog(
            '类型设置',
            '新增子项',
            `在 ${editingTypeCategory} 中添加了: ${value}`
          );

          // 添加成功 - 静默保存，无需提示
          setShowAddTypeModal(null);
          setTypeFormValue('');

          // 重新加载类型设置
          await loadTypeSettings();
        } else {
          alert('类型设置不存在，请刷新页面后重试');
        }
      } catch (error) {
        console.error('保存类型设置失败:', error);
        alert('保存失败，请稍后重试');
      }
    }
  };

  // 保存编辑类型 - 直接保存无需确认
  const handleSaveEditType = async () => {
    if (!typeFormValue.trim()) {
      alert('请输入内容');
      return;
    }

    const value = typeFormValue.trim();
    let newValues: TypeItem[] = [];
    let dbType = '';

    // 首先检查是否为固定的11个类型
    if (fixedTypes.includes(editingTypeCategory)) {
      // 处理固定类型
      switch (editingTypeCategory) {
        case 'moduleNames':
          if (moduleNames.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该模块名称已存在');
            return;
          }
          newValues = [...moduleNames];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setModuleNames(newValues);
          dbType = 'moduleNames';
          break;
        case 'moduleCategory': // 🆕 功能模块分类
          if (moduleCategories.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该分类已存在');
            return;
          }
          newValues = [...moduleCategories];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setModuleCategories(newValues);
          dbType = 'moduleCategory';
          break;
        case 'task':
          if (taskTypes.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该任务类型已存在');
            return;
          }
          newValues = [...taskTypes];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setTaskTypes(newValues);
          dbType = 'task';
          break;
        case 'taskStatus':
          if (taskStatuses.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该任务状态已存在');
            return;
          }
          newValues = [...taskStatuses];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setTaskStatuses(newValues);
          dbType = 'taskStatus';
          break;
        case 'opportunity':
          if (opportunityStages.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该商机阶段已存在');
            return;
          }
          newValues = [...opportunityStages];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setOpportunityStages(newValues);
          dbType = 'opportunity';
          break;
        case 'action':
          if (opportunityActionTypes.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该动作类型已存在');
            return;
          }
          newValues = [...opportunityActionTypes];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setOpportunityActionTypes(newValues);
          dbType = 'action';
          break;
        case 'preparation':
          if (preparationPhases.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该准备期环节已存在');
            return;
          }
          newValues = [...preparationPhases];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setPreparationPhases(newValues);
          dbType = 'preparation';
          break;
        case 'production':
          if (productionPhases.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该生产期环节已存在');
            return;
          }
          newValues = [...productionPhases];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setProductionPhases(newValues);
          dbType = 'production';
          break;
        case 'delivery':
          if (deliveryPhases.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该交付期环节已存在');
            return;
          }
          newValues = [...deliveryPhases];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setDeliveryPhases(newValues);
          dbType = 'delivery';
          break;
        case 'projectStatus':
          if (projectStatuses.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该项目阶段已存在');
            return;
          }
          newValues = [...projectStatuses];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setProjectStatuses(newValues);
          dbType = 'projectStatus';
          break;
        case 'productType':
          if (productTypes.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该产品类型已存在');
            return;
          }
          newValues = [...productTypes];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setProductTypes(newValues);
          dbType = 'productType';
          break;
        case 'strategyStatus':
          if (strategyStatuses.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该经营策略状态已存在');
            return;
          }
          newValues = [...strategyStatuses];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };
          setStrategyStatuses(newValues);
          dbType = 'strategyStatus';
          break;
      }

      try {
        // 保存到数据库
        await saveTypeSettingsToDb(dbType, newValues);
        setShowEditTypeModal(false);
        setTypeFormValue('');
        setEditingTypeIndex(-1);
        setHasUnsavedChanges(false);
        
        // 重新加载类型设置以确保数据同步
        await loadTypeSettings();
      } catch (error) {
        console.error('保存类型设置失败:', error);
        alert('保存失败，请稍后重试');
      }
    } else {
      // 处理动态类型
      try {
        const result = await db.collection('type_settings')
          .where({ type: editingTypeCategory })
          .get();

        if (result.data && result.data.length > 0) {
          const typeSettingId = result.data[0]._id;
          const currentValues: TypeItem[] = result.data[0].values || [];

          // 检查是否已存在（排除当前编辑的项）
          if (currentValues.some((t, i) => t.value === value && i !== editingTypeIndex)) {
            alert('该选项已存在');
            return;
          }

          // 更新值
          newValues = [...currentValues];
          newValues[editingTypeIndex] = { ...newValues[editingTypeIndex], value };

          // 更新数据库
          await db.collection('type_settings').doc(typeSettingId).update({
            values: newValues,
            updatedAt: new Date()
          });

          // 修改成功 - 静默保存，无需提示
          setShowEditTypeModal(false);
          setTypeFormValue('');
          setEditingTypeIndex(-1);

          // 重新加载类型设置
          await loadTypeSettings();
        }
      } catch (error) {
        console.error('保存类型设置失败:', error);
        alert('保存失败，请稍后重试');
      }
    }
  };

  // 切换类型启用状态
  const handleToggleTypeEnabled = async (category: string, index: number) => {
    let newValues: TypeItem[] = [];
    let dbType = '';

    switch (category) {
      case 'moduleNames':
        newValues = [...moduleNames];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setModuleNames(newValues);
        dbType = 'moduleNames';
        break;
      case 'task':
        newValues = [...taskTypes];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setTaskTypes(newValues);
        dbType = 'task';
        break;
      case 'taskStatus':
        newValues = [...taskStatuses];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setTaskStatuses(newValues);
        dbType = 'taskStatus';
        break;
      case 'opportunity':
        newValues = [...opportunityStages];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setOpportunityStages(newValues);
        dbType = 'opportunity';
        break;
      case 'action':
        newValues = [...opportunityActionTypes];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setOpportunityActionTypes(newValues);
        dbType = 'action';
        break;
      case 'preparation':
        newValues = [...preparationPhases];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setPreparationPhases(newValues);
        dbType = 'preparation';
        break;
      case 'production':
        newValues = [...productionPhases];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setProductionPhases(newValues);
        dbType = 'production';
        break;
      case 'delivery':
        newValues = [...deliveryPhases];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setDeliveryPhases(newValues);
        dbType = 'delivery';
        break;
      case 'projectStatus':
        newValues = [...projectStatuses];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setProjectStatuses(newValues);
        dbType = 'projectStatus';
        break;
      case 'productType':
        newValues = [...productTypes];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setProductTypes(newValues);
        dbType = 'productType';
        break;
      case 'strategyStatus':
        newValues = [...strategyStatuses];
        newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
        setStrategyStatuses(newValues);
        dbType = 'strategyStatus';
        break;
      default:
        // 处理动态类型（自定义类型）
        const typeSetting = allTypeSettings.find(t => t.key === category);
        if (typeSetting) {
          newValues = [...typeSetting.items];
          newValues[index] = { ...newValues[index], enabled: !newValues[index].enabled };
          dbType = category;
        } else {
          console.error('未找到类型:', category);
          return;
        }
        break;
    }

    try {
      // 保存到数据库
      await saveTypeSettingsToDb(dbType, newValues);
      
      // 如果是动态类型，需要更新 allTypeSettings
      if (!['moduleNames', 'moduleCategory', 'task', 'taskStatus', 'opportunity', 'action', 'preparation', 'production', 'delivery', 'projectStatus', 'productType', 'strategyStatus'].includes(category)) {
        const updatedAllSettings = allTypeSettings.map(t => 
          t.key === category ? { ...t, items: newValues } : t
        );
        setAllTypeSettings(updatedAllSettings);
      }
      
      setHasUnsavedChanges(false);
      
      // 重新加载类型设置以确保数据同步
      await loadTypeSettings();
    } catch (error) {
      console.error('切换启用状态失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 删除类型 - 需要确认
  const handleDeleteType = async (category: string, index: number) => {
    // 首先检查是否为固定的9个类型
    
    // 检查是否为系统参数
    let isSystemParam = false;
    let currentTypeSetting = allTypeSettings.find(t => t.key === category);
    
    if (currentTypeSetting && currentTypeSetting.items[index]) {
      isSystemParam = currentTypeSetting.items[index].isSystem || false;
    } else {
      // 如果在allTypeSettings中找不到，说明是固定类型，用原逻辑检查
      switch (category) {
        case 'moduleNames':
          isSystemParam = moduleNames[index]?.isSystem || false;
          break;
        case 'moduleCategory': // 🆕 功能模块分类
          isSystemParam = moduleCategories[index]?.isSystem || false;
          break;
        case 'task':
          isSystemParam = taskTypes[index]?.isSystem || false;
          break;
        case 'taskStatus':
          isSystemParam = taskStatuses[index]?.isSystem || false;
          break;
        case 'opportunity':
          isSystemParam = opportunityStages[index]?.isSystem || false;
          break;
        case 'action':
          isSystemParam = opportunityActionTypes[index]?.isSystem || false;
          break;
        case 'preparation':
          isSystemParam = preparationPhases[index]?.isSystem || false;
          break;
        case 'production':
          isSystemParam = productionPhases[index]?.isSystem || false;
          break;
        case 'delivery':
          isSystemParam = deliveryPhases[index]?.isSystem || false;
          break;
        case 'projectStatus':
          isSystemParam = projectStatuses[index]?.isSystem || false;
          break;
        case 'productType':
          isSystemParam = productTypes[index]?.isSystem || false;
          break;
        case 'strategyStatus':
          isSystemParam = strategyStatuses[index]?.isSystem || false;
          break;
      }
    }

    // 系统参数不能删除
    if (isSystemParam) {
      alert('系统参数不能删除！');
      return;
    }

    let typeValue = '';
    let collectionName = '';
    let fieldName = '';
    let typeName = '';

    // 首先检查是否为固定的11个类型
    
    if (fixedTypes.includes(category)) {
      // 处理固定类型 - 获取要删除的类型值和对应的集合信息
      switch (category) {
        case 'moduleNames':
          // 功能模块名称不需要检查引用关系，可以直接删除（实际上作为系统参数也不会被删除）
          typeValue = moduleNames[index].value;
          typeName = '功能模块名称';
          // 不设置 collectionName，跳过引用检查
          break;
        case 'moduleCategory': // 🆕 功能模块分类
          // 功能模块分类不需要检查引用关系，可以直接删除
          typeValue = moduleCategories[index].value;
          typeName = '功能模块分类';
          // 不设置 collectionName，跳过引用检查
          break;
        case 'task':
          typeValue = taskTypes[index].value;
          collectionName = 'tasks';
          fieldName = 'type';
          typeName = '任务类型';
          break;
        case 'taskStatus':
          typeValue = taskStatuses[index].value;
          collectionName = 'tasks';
          fieldName = 'status';
          typeName = '任务状态';
          break;
        case 'opportunity':
          typeValue = opportunityStages[index].value;
          collectionName = 'opportunities';
          fieldName = 'stage';
          typeName = '商机阶段';
          break;
        case 'action':
          typeValue = opportunityActionTypes[index].value;
          collectionName = 'opportunity_goals';
          fieldName = 'actionType';
          typeName = '商机跟进动作类型';
          break;
        case 'preparation':
          typeValue = preparationPhases[index].value;
          collectionName = 'projects';
          fieldName = 'preparationPhase';
          typeName = '项目准备期环节';
          break;
        case 'production':
          typeValue = productionPhases[index].value;
          collectionName = 'projects';
          fieldName = 'productionPhase';
          typeName = '项目生产期环节';
          break;
        case 'delivery':
          typeValue = deliveryPhases[index].value;
          collectionName = 'projects';
          fieldName = 'deliveryPhase';
          typeName = '项目交付期环节';
          break;
        case 'projectStatus':
          typeValue = projectStatuses[index].value;
          collectionName = 'projects';
          fieldName = 'status';
          typeName = '项目阶段';
          break;
        case 'productType':
          typeValue = productTypes[index].value;
          collectionName = 'opportunities';
          fieldName = 'productType';
          typeName = '产品类型';
          break;
        case 'strategyStatus':
          typeValue = strategyStatuses[index].value;
          collectionName = 'annual_strategies';
          fieldName = 'status';
          typeName = '经营策略状态';
          break;
      }

      try {
        // 检查是否有引用（功能模块名称不需要检查）
        if (collectionName) {
          const query: any = {};
          query[fieldName] = typeValue;
          
          const result = await db.collection(collectionName).where(query).count();
          
          if (result.total > 0) {
            alert(`无法删除！该${typeName}「${typeValue}」正被 ${result.total} 条记录使用。\n\n请先修改或删除相关记录后再删除此类型。`);
            return;
          }
        }

        // 确认删除
        if (!showConfirm(`确定要删除${typeName}「${typeValue}」吗？`)) {
          return;
        }

        // 执行删除
        let newValues: TypeItem[] = [];
        let dbType = '';

        switch (category) {
          case 'moduleNames':
            newValues = moduleNames.filter((_, i) => i !== index);
            setModuleNames(newValues);
            dbType = 'moduleNames';
            break;
          case 'moduleCategory': // 🆕 功能模块分类
            newValues = moduleCategories.filter((_, i) => i !== index);
            setModuleCategories(newValues);
            dbType = 'moduleCategory';
            break;
          case 'task':
            newValues = taskTypes.filter((_, i) => i !== index);
            setTaskTypes(newValues);
            dbType = 'task';
            break;
          case 'taskStatus':
            newValues = taskStatuses.filter((_, i) => i !== index);
            setTaskStatuses(newValues);
            dbType = 'taskStatus';
            break;
          case 'opportunity':
            newValues = opportunityStages.filter((_, i) => i !== index);
            setOpportunityStages(newValues);
            dbType = 'opportunity';
            break;
          case 'action':
            newValues = opportunityActionTypes.filter((_, i) => i !== index);
            setOpportunityActionTypes(newValues);
            dbType = 'action';
            break;
          case 'preparation':
            newValues = preparationPhases.filter((_, i) => i !== index);
            setPreparationPhases(newValues);
            dbType = 'preparation';
            break;
          case 'production':
            newValues = productionPhases.filter((_, i) => i !== index);
            setProductionPhases(newValues);
            dbType = 'production';
            break;
          case 'delivery':
            newValues = deliveryPhases.filter((_, i) => i !== index);
            setDeliveryPhases(newValues);
            dbType = 'delivery';
            break;
          case 'projectStatus':
            newValues = projectStatuses.filter((_, i) => i !== index);
            setProjectStatuses(newValues);
            dbType = 'projectStatus';
            break;
          case 'productType':
            newValues = productTypes.filter((_, i) => i !== index);
            setProductTypes(newValues);
            dbType = 'productType';
            break;
          case 'strategyStatus':
            newValues = strategyStatuses.filter((_, i) => i !== index);
            setStrategyStatuses(newValues);
            dbType = 'strategyStatus';
            break;
        }

        // 保存到数据库
        await saveTypeSettingsToDb(dbType, newValues);
        // 删除成功 - 静默操作，无需提示
        setHasUnsavedChanges(false);
        
        // 重新加载类型设置以确保数据同步
        await loadTypeSettings();
      } catch (error) {
        console.error('删除类型失败:', error);
        alert('删除失败，请稍后重试');
      }
    } else {
      // 处理动态类型（新增的自定义类型）
      const currentTypeSetting = allTypeSettings.find(t => t.key === category);
      if (!currentTypeSetting || !currentTypeSetting.items[index]) {
        alert('类型设置不存在');
        return;
      }

      typeValue = currentTypeSetting.items[index].value;
      typeName = currentTypeSetting.name;

      // 确认删除
      if (!showConfirm(`确定要删除${typeName}「${typeValue}」吗？`)) {
        return;
      }

      try {
        // 查询类型设置
        const result = await db.collection('type_settings')
          .where({ type: category })
          .get();

        if (result.data && result.data.length > 0) {
          const typeSettingId = result.data[0]._id;
          const currentValues: TypeItem[] = result.data[0].values || [];

          // 删除指定索引的项
          const newValues = currentValues.filter((_, i) => i !== index);

          // 更新数据库
          await db.collection('type_settings').doc(typeSettingId).update({
            values: newValues,
            updatedAt: new Date()
          });

          // 删除成功 - 静默操作，无需提示

          // 重新加载类型设置
          await loadTypeSettings();
        }
      } catch (error) {
        console.error('删除类型失败:', error);
        alert('删除失败，请稍后重试');
      }
    }
  };

  // 保存类型设置到数据库
  const saveTypeSettingsToDb = async (type: string, values: TypeItem[]) => {
    try {
      // 查询是否已存在该类型配置
      const result = await db.collection('type_settings')
        .where({ type })
        .get();
      
      if (result.data && result.data.length > 0) {
        // 更新已存在的配置
        await db.collection('type_settings')
          .doc(result.data[0]._id)
          .update({
            values,
            updatedAt: new Date()
          });
      } else {
        // 创建新配置
        await db.collection('type_settings').add({
          type,
          values,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setHasUnsavedChanges(false);
      console.log(`类型设置已保存: ${type}`, values);
    } catch (error) {
      console.error('保存类型设置到数据库失败:', error);
      throw error;
    }
  };

  // 保存所有类型设置
  const handleSaveAllSettings = async () => {
    try {
      // 批量保存所有类型设置
      await Promise.all([
        saveTypeSettingsToDb('moduleNames', moduleNames),
        saveTypeSettingsToDb('moduleCategory', moduleCategories), // 🆕 功能模块分类
        saveTypeSettingsToDb('task', taskTypes),
        saveTypeSettingsToDb('taskStatus', taskStatuses),
        saveTypeSettingsToDb('opportunity', opportunityStages),
        saveTypeSettingsToDb('action', opportunityActionTypes),
        saveTypeSettingsToDb('preparation', preparationPhases),
        saveTypeSettingsToDb('production', productionPhases),
        saveTypeSettingsToDb('delivery', deliveryPhases),
        saveTypeSettingsToDb('projectStatus', projectStatuses),
        saveTypeSettingsToDb('productType', productTypes),
        saveTypeSettingsToDb('strategyStatus', strategyStatuses)
      ]);
      
      // 所有设置已保存 - 静默操作，无需提示
      setHasUnsavedChanges(false);
      
      // 记录操作日志
      await addOperationLog(
        '类型设置',
        '批量保存',
        '保存了所有类型设置'
      );
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败: ' + (error as any).message);
    }
  };

  // 获取类型分类的显示名称
  const getTypeCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      'task': '任务类型',
      'taskStatus': '任务状态',
      'opportunity': '商机阶段',
      'action': '商机跟进动作类型',
      'preparation': '项目准备期环节',
      'production': '项目生产期环节',
      'delivery': '项目交付期环节',
      'projectStatus': '项目阶段',
      'productType': '产品类型'
    };
    return names[category] || '类型';
  };

  // 处理新增类型设置
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('请输入类型名称');
      return;
    }

    const categoryKey = newCategoryName.trim().toLowerCase().replace(/\s+/g, '_');
    
    // 检查是否已存在
    const existingCategories = allTypeSettings.map(t => t.key);
    
    if (existingCategories.includes(categoryKey)) {
      alert('该类型设置已存在');
      return;
    }

    try {
      // 创建新的类型设置集合，初始为空数组
      await db.collection('type_settings').add({
        type: categoryKey,
        name: newCategoryName.trim(),
        values: [],
        createdAt: new Date(),
        createdBy: currentUser?.name || '系统'
      });

      // 创建成功 - 静默保存，无需提示
      setShowAddNewCategoryModal(false);
      setNewCategoryName('');
      
      // 记录操作日志
      await addOperationLog(
        '类型设置',
        '新增类型',
        `创建了新的类型设置:${newCategoryName.trim()}`
      );

      // 重新加载类型设置，而不刷新整个页面
      await loadTypeSettings();
    } catch (error) {
      console.error('创建类型设置失败:', error);
      alert('创建失败，请稍后重试');
    }
  };

  // 打开编辑类型设置弹窗
  const handleOpenEditCategory = (categoryKey: string, categoryName: string) => {
    setEditingCategoryKey(categoryKey);
    setEditingCategoryName(categoryName);
    setShowEditCategoryModal(true);
  };

  // 处理编辑类型设置名称
  const handleEditCategory = async () => {
    if (!editingCategoryName.trim()) {
      alert('请输入类型名称');
      return;
    }

    try {
      // 查询当前类型设置
      const result = await db.collection('type_settings')
        .where({ type: editingCategoryKey })
        .get();

      if (result.data && result.data.length > 0) {
        const typeSettingId = result.data[0]._id;
        
        // 更新类型名称
        await db.collection('type_settings').doc(typeSettingId).update({
          name: editingCategoryName.trim(),
          updatedAt: new Date()
        });

        // 修改成功 - 静默保存，无需提示
        setShowEditCategoryModal(false);
        
        // 记录操作日志
        await addOperationLog(
          '类型设置',
          '编辑类型',
          `修改类型设置名称:${editingCategoryKey} → ${editingCategoryName.trim()}`
        );

        // 重新加载类型设置
        await loadTypeSettings();
      }
    } catch (error) {
      console.error('修改类型名称失败:', error);
      alert('修改失败，请稍后重试');
    }
  };

  // 处理删除类型设置
  const handleDeleteCategory = async (categoryKey: string, items: TypeItem[]) => {
    // 检查是否有子项
    if (items.length > 0) {
      alert(`无法删除：此类型设置下还有 ${items.length} 个子项，请先删除所有子项后再删除类型设置。`);
      return;
    }

    // ✅ 保留删除二次确认
    if (!showConfirm(`确定要删除此类型设置吗？\n\n类型: ${categoryKey}\n\n此操作不可撤销！`)) {
      return;
    }

    try {
      // 查询并删除类型设置
      const result = await db.collection('type_settings')
        .where({ type: categoryKey })
        .get();

      if (result.data && result.data.length > 0) {
        const typeSettingId = result.data[0]._id;
        
        await db.collection('type_settings').doc(typeSettingId).remove();

        // 删除成功 - 静默操作，无需提示
        
        // 记录操作日志
        await addOperationLog(
          '类型设置',
          '删除类型',
          `删除了类型设置:${categoryKey}`
        );

        // 重新加载类型设置
        await loadTypeSettings();
      }
    } catch (error) {
      console.error('删除类型设置失败:', error);
      alert('删除失败，请稍后重试');
    }
  };
  
  // 当选择负责人时更新负责人姓名
  const handleLeaderChange = (leaderId: string) => {
    const leader = employees.find(emp => emp._id === leaderId);
    setDepartmentForm({
      ...departmentForm,
      leaderId,
      leaderName: leader ? leader.name : ''
    });
  };
  
  // 切换成员选择
  const handleToggleMember = (employeeId: string) => {
    const newMemberIds = departmentForm.memberIds.includes(employeeId)
      ? departmentForm.memberIds.filter(id => id !== employeeId)
      : [...departmentForm.memberIds, employeeId];
    
    setDepartmentForm({
      ...departmentForm,
      memberIds: newMemberIds
    });
  };

  const [roles, setRoles] = useState([
    { id: '1', name: '管理员', permissions: ['全部权限'], members: [], userCount: 2 },
    { id: '2', name: '高层领导', permissions: ['查看全部', '编辑策略', '审批'], members: [], userCount: 3 },
    { id: '3', name: '销售经理', permissions: ['商机管理', '任务管理'], members: ['张经理', '李总监'], userCount: 8 },
    { id: '4', name: '项目经理', permissions: ['项目管理', '任务管理'], members: ['王经理'], userCount: 5 },
  ]);

  const [taskTypes, setTaskTypes] = useState<TypeItem[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TypeItem[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<TypeItem[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<TypeItem[]>([]);
  const [moduleNames, setModuleNames] = useState<TypeItem[]>([]);
  const [moduleCategories, setModuleCategories] = useState<TypeItem[]>([]); // 🆕 功能模块分类
  
  const [opportunityActionTypes, setOpportunityActionTypes] = useState<TypeItem[]>([]);

  const [preparationPhases, setPreparationPhases] = useState<TypeItem[]>([]);

  const [productionPhases, setProductionPhases] = useState<TypeItem[]>([]);

  const [deliveryPhases, setDeliveryPhases] = useState<TypeItem[]>([]);

  const [productTypes, setProductTypes] = useState<TypeItem[]>([]);
  
  const [strategyStatuses, setStrategyStatuses] = useState<TypeItem[]>([]);

  // Logo上传相关状态
  const [companyLogo, setCompanyLogo] = useState<{
    fileID?: string;
    tempFileURL?: string;
    base64?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    uploadTime?: string;
  } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 动态类型设置（用于存储所有类型设置，包括新增的）
  const [allTypeSettings, setAllTypeSettings] = useState<Array<{
    key: string;
    name: string;
    items: TypeItem[];
  }>>([]);

  // 折叠状态
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // 切换折叠状态
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderEmployeeSettings = () => {
    const filteredEmployees = getFilteredEmployees();
    
    // 获取所有部门列表(用于筛选下拉框)
    const allDepartments = Array.from(new Set(
      employees.flatMap(emp => emp.departments || [])
    )).sort();
    
    // 获取所有角色列表(用于筛选下拉框)
    const allRoles = [
      { value: 'admin', label: '管理员' },
      { value: 'employee', label: '普通员工' }
    ];
    
    return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">员工管理</h3>
            <p className="text-sm text-gray-600 mt-1">管理已审核通过的员工信息</p>
          </div>
          <div className="flex items-center gap-3">
            {checkPermission('settings.employees', 'create') && (
              <>
                <button
                  onClick={() => setShowCreateEmployeeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  新增员工
                </button>
                <button
                  onClick={handleGenerateInvitation}
                  disabled={generatingInvitation}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {generatingInvitation ? '生成中...' : '邀请注册'}
                </button>
              </>
            )}
            {checkPermission('settings.employees', 'delete') && (
              <button
                onClick={() => setShowEmployeeTrash(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                回收站
              </button>
            )}
          </div>
        </div>
        
        {/* 搜索和筛选栏 */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、用户名或手机号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* 部门筛选 */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">全部部门</option>
            {allDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          {/* 角色筛选 */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">全部角色</option>
            {allRoles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          
          {/* 筛选结果统计 */}
          {(searchKeyword || filterDepartment !== 'all' || filterRole !== 'all') && (
            <div className="text-sm text-gray-600">
              找到 <span className="font-semibold text-blue-600">{filteredEmployees.length}</span> 名员工
            </div>
          )}
        </div>
      </div>

      {/* 员工卡片网格 */}
      {loadingEmployees ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchKeyword || filterDepartment !== 'all' || filterRole !== 'all' 
              ? '没有找到符合条件的员工' 
              : '暂无员工数据'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => (
            <div
              key={employee._id}
              onClick={async () => {
                // 确保部门和角色列表已加载
                if (departments.length === 0) {
                  await loadDepartments();
                }
                if (rolePermissions.length === 0) {
                  await loadRolePermissions();
                }
                setSelectedEmployee(employee);
                setShowEmployeeDetail(true);
              }}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
            >
              {/* 员工头像和基本信息 */}
              <div className="flex items-start gap-3 mb-4">
                {/* 🎨 显示用户头像 */}
                {employee.avatar ? (
                  <img 
                    src={employee.avatar} 
                    alt={employee.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {employee.name ? employee.name.charAt(0) : employee.username.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {employee.name || employee.username}
                  </h4>
                  <p className="text-sm text-gray-500 truncate">{employee.username}</p>
                </div>
              </div>

              {/* 状态标签 */}
              <div className="mb-3">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  employee.status === '在职' 
                    ? 'bg-green-100 text-green-700' 
                    : employee.status === '离职'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {employee.status || '在职'}
                </span>
              </div>

              {/* 详细信息 */}
              <div className="space-y-2 text-sm">
                {/* 手机号 */}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-gray-400">📱</span>
                    <span className="truncate">{employee.phone}</span>
                  </div>
                )}

                {/* 部门 */}
                {employee.departments && employee.departments.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">🏢</span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {employee.departments.slice(0, 2).map((dept: string, index: number) => (
                        <span key={index} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {dept}
                        </span>
                      ))}
                      {employee.departments.length > 2 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          +{employee.departments.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 上级 */}
                {employee.supervisorName && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-gray-400">👤</span>
                    <span className="truncate">上级: {employee.supervisorName}</span>
                  </div>
                )}

                {/* 角色 */}
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">🎭</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(() => {
                      // 获取角色数组并过滤掉user角色
                      const rolesArray = employee.roles && employee.roles.length > 0 
                        ? employee.roles.filter((r: string) => r !== 'user')
                        : (employee.role && employee.role !== 'user' ? [employee.role] : []);
                      
                      if (rolesArray.length === 0) {
                        return <span className="text-xs text-gray-500">--</span>;
                      }
                      
                      return rolesArray.slice(0, 2).map((roleId: string, index: number) => {
                        const roleConfig = rolePermissions.find((r: any) => r.role === roleId);
                        const roleName = roleConfig ? roleConfig.name : roleId;
                        return (
                          <span key={index} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                            {roleName}
                          </span>
                        );
                      });
                    })()}
                    {(() => {
                      const rolesArray = employee.roles && employee.roles.length > 0 
                        ? employee.roles.filter((r: string) => r !== 'user')
                        : (employee.role && employee.role !== 'user' ? [employee.role] : []);
                      return rolesArray.length > 2 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          +{rolesArray.length - 2}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  const renderDepartmentSettings = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">部门管理</h3>
            <p className="text-sm text-gray-600 mt-1">管理组织部门结构</p>
          </div>
          {checkPermission('settings.departments', 'create') && (
            <button 
              onClick={handleAddDepartment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              添加部门
            </button>
          )}
        </div>
      </div>
      
      {loadingDepartments ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无部门数据</p>
          <button 
            onClick={handleAddDepartment}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            添加第一个部门
          </button>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {departments.map((dept) => {
              // 获取部门成员详细信息
              const deptMembers = employees.filter(emp => 
                dept.memberIds?.includes(emp._id)
              );
              
              return (
                <div key={dept._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-medium mb-1">{dept.name}</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">负责人:</span> {dept.leaderName || '-'}
                      </div>
                      {dept.description && (
                        <div className="text-xs text-gray-500 mb-2">
                          {dept.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {checkPermission('settings.departments', 'edit') && (
                        <button 
                          onClick={() => handleEditDepartment(dept)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          编辑
                        </button>
                      )}
                      {checkPermission('settings.departments', 'delete') && (
                        <button 
                          onClick={() => handleDeleteDepartment(dept)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Users className="w-4 h-4" />
                    <span>{dept.memberCount || 0} 人</span>
                  </div>
                  {deptMembers.length > 0 && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                      <span className="font-medium">成员: </span>
                      {deptMembers.map(m => m.name).join('、')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderRoleSettings = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">角色权限管理</h3>
            <p className="text-sm text-gray-500 mt-1">配置不同角色的功能权限，数据权限自动按规则控制</p>
          </div>
          {checkPermission('settings.roles', 'create') && (
            <button
              onClick={handleAddRole}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增角色
            </button>
          )}
        </div>
      </div>
      {loadingRoles ? (
        <div className="p-12 text-center text-gray-500">
          加载中...
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-4">
            {rolePermissions.map((role, index) => (
              <div key={role._id || role.id || `role-${index}`} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg text-gray-900">{role.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {role.role}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {checkPermission('settings.roles', 'edit') && (
                      <button 
                        onClick={() => handleEditRole(role)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Shield className="w-4 h-4" />
                        编辑权限
                      </button>
                    )}
                    {role.role !== 'admin' && checkPermission('settings.roles', 'delete') && (
                      <button 
                        onClick={() => {
                          setSelectedRole(role);
                          setShowDeleteRoleModal(true);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 权限表格 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">模块</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">查看</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">创建</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">编辑</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">删除</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">导出</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries({
                        tasks: '任务管理',
                        opportunities: '商机管理',
                        projects: '项目管理',
                        goal: '目标管理',
                        issues: '问题管理',
                        budget: '预算管理',
                        settings: '系统设置'
                      }).map(([key, label]) => {
                        // 目标管理有子模块
                        if (key === 'goal') {
                          const subModules = {
                            salesGoal: '销售目标',
                            opportunityGoal: '商机目标',
                            strategy: '经营策略',
                            decomposition: '目标分解',
                            execution: '执行力地图'
                          };
                          
                          return (
                            <React.Fragment key={key}>
                              {/* 目标管理主标题 */}
                              <tr className="bg-blue-50">
                                <td colSpan={6} className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {label}
                                </td>
                              </tr>
                              {/* 目标管理子模块 */}
                              {Object.entries(subModules).map(([subKey, subLabel]) => {
                                const perms = role.permissions?.goal?.[subKey] || {};
                                return (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-2 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.view ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.create ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.edit ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.delete ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.export ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        }
                        
                        // 预算管理有子模块，需要特殊处理
                        if (key === 'budget') {
                          const subModules = {
                            annual: '年度预算表',
                            asset: '资产/采购预算',
                            execution: '预算执行管理',
                            parameters: '预算参数设置',
                            hr: '人力费用管理'
                          };
                          
                          return (
                            <React.Fragment key={key}>
                              {/* 预算管理主模块标题 */}
                              <tr className="bg-purple-50">
                                <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                  {label}
                                </td>
                              </tr>
                              {/* 预算管理子模块 */}
                              {Object.entries(subModules).map(([subKey, subLabel]) => {
                                const perms = role.permissions?.budget?.[subKey] || {};
                                return (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-2 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.view ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.create ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.edit ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.delete ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {perms.export ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        }
                        
                        // 系统设置有子模块，需要特殊处理
                        if (key === 'settings') {
                          const subModules = {
                            userApproval: '用户审核',
                            employees: '员工管理',
                            departments: '部门管理',
                            roles: '角色权限',
                            typeSettings: '类型设置',
                            operationLogs: '操作日志'
                          };
                          
                          return (
                            <React.Fragment key={key}>
                              {/* 系统设置主模块标题 */}
                              <tr className="bg-gray-50">
                                <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                  {label}
                                </td>
                              </tr>
                              {/* 系统设置子模块 */}
                              {Object.entries(subModules).map(([subKey, subLabel]) => (
                                <tr key={`${key}-${subKey}`}>
                                  <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                    └ {subLabel}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {role.permissions[key]?.[subKey]?.view ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {role.permissions[key]?.[subKey]?.create ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {role.permissions[key]?.[subKey]?.edit ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {role.permissions[key]?.[subKey]?.delete ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {role.permissions[key]?.[subKey]?.export ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        }
                        
                        // 其他模块正常处理
                        return (
                          <tr key={key}>
                            <td className="px-4 py-3 text-sm text-gray-900">{label}</td>
                            <td className="px-4 py-3 text-center">
                              {role.permissions[key]?.view ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {role.permissions[key]?.create ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {role.permissions[key]?.edit ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {role.permissions[key]?.delete ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {role.permissions[key]?.export ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* 数据权限说明 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">数据权限规则（自动应用）：</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li key="rule-1">• 自己创建的数据：可增删改查</li>
                    <li key="rule-2">• 协作人数据：可查看和编辑（任务、商机、项目的协作人）</li>
                    <li key="rule-3">• 下级数据：可查看所有下级及下级的下级的数据</li>
                    <li key="rule-4">• 同部门公开数据：可查看同部门成员设为公开的数据</li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          {rolePermissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无角色配置
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTypeSettings = () => (
    <div className="space-y-6">
      {/* 公司Logo设置 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-gray-900">公司Logo</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {/* Logo预览 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-white"
                      style={{ maxWidth: '200px' }}
                    />
                  </div>
                ) : (
                  <div className="h-16 w-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-sm text-gray-500">
                    <ImageIcon className="w-6 h-6 mr-2" />
                    暂无Logo
                  </div>
                )}
              </div>
            </div>
            
            {/* 文件选择和操作按钮 */}
            {checkPermission('settings.typeSettings', 'edit') && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择新Logo
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    支持格式: PNG, JPG, JPEG, SVG | 文件大小: 不超过2MB | 建议尺寸: 200×60 px (宽×高)
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUploadLogo}
                    disabled={!logoFile || uploadingLogo}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      !logoFile || uploadingLogo
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {uploadingLogo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        上传Logo
                      </>
                    )}
                  </button>
                  
                  {companyLogo && (
                    <button
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除Logo
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* 上传时间 */}
            {companyLogo?.uploadTime && (
              <p className="text-xs text-gray-500">
                上传时间: {new Date(companyLogo.uploadTime).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* 新增类型设置按钮 */}
      {checkPermission('settings.typeSettings', 'create') && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddNewCategoryModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增类型设置
          </button>
        </div>
      )}
      
      {/* 动态渲染所有类型设置 */}
      {allTypeSettings.map(typeSetting => (
        <div key={typeSetting.key}>
          {renderTypeBlock(typeSetting.key, typeSetting.name, typeSetting.items)}
        </div>
      ))}
    </div>
  );

  const renderLogSettings = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-900">操作日志</h3>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={logStartDate}
              onChange={(e) => setLogStartDate(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={logEndDate}
              onChange={(e) => setLogEndDate(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Search className="w-4 h-4 inline mr-1" />
              查询
            </button>
            {checkPermission('settings.operationLogs', 'export') && (
              <button 
                onClick={() => {
                  // 模拟导出Excel
                  alert('操作日志已导出为Excel文件');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
            {checkPermission('settings.operationLogs', 'delete') && (
              <button 
                onClick={() => setShowClearLogsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <X className="w-4 h-4" />
                清空
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">
        {loadingLogs ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500">暂无操作日志</p>
            <p className="text-sm text-gray-400 mt-1">尝试调整日期范围或执行一些操作</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{log.name || log.username}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{log.module}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{log.action}</span>
                    </div>
                    <p className="text-sm text-gray-600">{log.details}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {new Date(log.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">系统设置</h1>
        <p className="text-gray-600">系统配置和权限管理</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {checkPermission('settings.userApproval', 'view') && (
          <button
            onClick={() => {
              setSelectedTab('approval');
              loadPendingCount(); // 切换时刷新待审核数量
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'approval' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            用户审核
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        )}
        
        {checkPermission('settings.employees', 'view') && (
          <button
            onClick={() => setSelectedTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'team' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            员工管理
          </button>
        )}
        
        {checkPermission('settings.departments', 'view') && (
          <button
            onClick={() => setSelectedTab('department')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'department' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-5 h-5" />
            部门管理
          </button>
        )}
        
        {checkPermission('settings.roles', 'view') && (
          <button
            onClick={() => setSelectedTab('role')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'role' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-5 h-5" />
            角色权限
          </button>
        )}
        
        {checkPermission('settings.typeSettings', 'view') && (
          <button
            onClick={() => setSelectedTab('types')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'types' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Tags className="w-5 h-5" />
            类型设置
          </button>
        )}
        
        {checkPermission('settings.operationLogs', 'view') && (
          <button
            onClick={() => setSelectedTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'logs' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            操作日志
          </button>
        )}
      </div>

      {/* Content */}
      {selectedTab === 'team' && renderEmployeeSettings()}
      {selectedTab === 'approval' && currentUser && (
        <UserApprovalPage 
          currentUser={currentUser}
          onPendingCountChange={(count) => {
            setPendingCount(count);
            onPendingCountChange?.(count);
          }}
        />
      )}
      {selectedTab === 'department' && renderDepartmentSettings()}
      {selectedTab === 'role' && renderRoleSettings()}
      {selectedTab === 'types' && renderTypeSettings()}
      {selectedTab === 'logs' && renderLogSettings()}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">编辑员工信息</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">用户名</label>
                  <input
                    type="text"
                    value={selectedEmployee.username}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">用户名不可修改</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">姓名 *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">手机号</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="请输入手机号"
                  />
                  <p className="text-xs text-gray-500 mt-1">手机号作为用户唯一标识，不可在此修改。用户可在个人账户设置中修改</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门（可多选）</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {departments.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无部门</p>
                    ) : (
                      departments.map((dept) => (
                        <label key={dept._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={editForm.departments.includes(dept.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({
                                  ...editForm,
                                  departments: [...editForm.departments, dept.name]
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  departments: editForm.departments.filter(d => d !== dept.name)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900">{dept.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">可选择员工所属的多个部门，部门成员列表将自动同步</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">直属上级</label>
                  <select
                    value={editForm.supervisorId}
                    onChange={(e) => setEditForm({ ...editForm, supervisorId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">无上级</option>
                    {employees
                      .filter(emp => emp._id !== selectedEmployee._id) // 排除自己
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name || emp.username} {emp.departments && emp.departments.length > 0 ? `(${emp.departments.join('、')})` : ''}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-xs text-gray-500 mt-1">选择该员工的直属上级，用于汇报关系管理</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">职务</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入职务，如：总经理、部门主管、销售经理等"
                  />
                  <p className="text-xs text-gray-500 mt-1">填写员工的职务名称</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">角色（可多选）</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {rolePermissions.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无角色配置</p>
                    ) : (
                      rolePermissions.map((roleItem) => (
                        <label key={roleItem._id || roleItem.role} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={editForm.roles.includes(roleItem.role)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({
                                  ...editForm,
                                  roles: [...editForm.roles, roleItem.role]
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  roles: editForm.roles.filter(r => r !== roleItem.role)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 font-medium">{roleItem.name}</div>
                            {roleItem.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{roleItem.description}</div>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">可选择多个角色，最终权限为所有角色的并集</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="在职">在职</option>
                    <option value="离职">离职</option>
                    <option value="暂停使用">暂停使用</option>
                  </select>
                  <p className="text-xs text-orange-600 mt-1">⚠️ 选择"离职"或"暂停使用"后，该用户将无法登录系统</p>
                </div>
              </div>
            </div>
            
            {/* 固定底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Employee Modal */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-900">确认删除</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">确定要删除以下员工吗？</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">用户名:</span>
                  <span className="text-sm text-gray-900 font-medium">{selectedEmployee.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">姓名:</span>
                  <span className="text-sm text-gray-900 font-medium">{selectedEmployee.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">部门:</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {selectedEmployee.departmentNames && Array.isArray(selectedEmployee.departmentNames) && selectedEmployee.departmentNames.length > 0 
                      ? selectedEmployee.departmentNames.join('、') 
                      : '无部门'}
                  </span>
                </div>
              </div>
              <p className="text-red-600 text-sm mt-4">⚠️ 此操作不可恢复，请谨慎操作！</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">添加部门</h2>
              <button onClick={() => setShowDepartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门名称 *</label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入部门名称"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门负责人 *</label>
                  <select 
                    value={departmentForm.leaderId}
                    onChange={(e) => handleLeaderChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择负责人</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}{emp.departmentNames && Array.isArray(emp.departmentNames) && emp.departmentNames.length > 0 ? ` - ${emp.departmentNames.join('、')}` : ' - 无部门'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">负责人必须是已审核通过的员工</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门描述</label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入部门描述（可选）"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">添加部门成员</label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {employees.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">暂无可选员工</p>
                    ) : (
                      employees.map(emp => (
                        <label key={emp._id} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
                          <input 
                            type="checkbox" 
                            checked={departmentForm.memberIds.includes(emp._id)}
                            onChange={() => handleToggleMember(emp._id)}
                            className="w-4 h-4" 
                          />
                          <span className="text-sm text-gray-900 flex-1">{emp.name}</span>
                          <span className="text-xs text-gray-500">
                            {emp.departmentNames && Array.isArray(emp.departmentNames) && emp.departmentNames.length > 0 ? emp.departmentNames.join('、') : '无部门'}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">一名员工可以加入多个部门</p>
                </div>
              </div>
            </div>
            
            {/* 固定底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDepartmentModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveDepartment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditDepartmentModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">编辑部门</h2>
              <button onClick={() => setShowEditDepartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门名称 *</label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入部门名称"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门负责人 *</label>
                  <select 
                    value={departmentForm.leaderId}
                    onChange={(e) => handleLeaderChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择负责人</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}{emp.departmentNames && Array.isArray(emp.departmentNames) && emp.departmentNames.length > 0 ? ` - ${emp.departmentNames.join('、')}` : ' - 无部门'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">负责人必须是已审核通过的员工</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">部门描述</label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入部门描述（可选）"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">添加部门成员</label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {employees.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">暂无可选员工</p>
                    ) : (
                      employees.map(emp => (
                        <label key={emp._id} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
                          <input 
                            type="checkbox" 
                            checked={departmentForm.memberIds.includes(emp._id)}
                            onChange={() => handleToggleMember(emp._id)}
                            className="w-4 h-4" 
                          />
                          <span className="text-sm text-gray-900 flex-1">{emp.name}</span>
                          <span className="text-xs text-gray-500">
                            {emp.departmentNames && Array.isArray(emp.departmentNames) && emp.departmentNames.length > 0 ? emp.departmentNames.join('、') : '无部门'}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">一名员工可以加入多个部门</p>
                </div>
              </div>
            </div>
            
            {/* 固定底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditDepartmentModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleUpdateDepartment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteDepartmentModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">确认删除</h2>
              <button onClick={() => setShowDeleteDepartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">确定要删除以下部门吗？</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">部门名称:</span>
                  <span className="text-sm text-gray-900 font-medium">{selectedDepartment.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">负责人:</span>
                  <span className="text-sm text-gray-900 font-medium">{selectedDepartment.leaderName || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">成员数:</span>
                  <span className="text-sm text-gray-900 font-medium">{selectedDepartment.memberCount || 0} 人</span>
                </div>
              </div>
              <p className="text-red-600 text-sm mt-4">⚠️ 此操作不可恢复，请谨慎操作！</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteDepartmentModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteDepartment}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-900">添加角色</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">角色名称 *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入角色名称"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">添加角色成员</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 py-1">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm text-gray-900">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">一名员工可以是多个角色</p>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">功能权限</label>
                <div className="border border-gray-300 rounded-lg p-3 space-y-2">
                  {['查看任务', '编辑任务', '查看商机', '编辑商机', '查看项目', '编辑项目', '系统设置'].map((perm, index) => (
                    <label key={index} className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm text-gray-900">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Type Modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">添加{getTypeCategoryName(showAddTypeModal)}</h2>
              <button onClick={() => setShowAddTypeModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">名称 *</label>
                <input
                  type="text"
                  value={typeFormValue}
                  onChange={(e) => setTypeFormValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveAddType();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`请输入${getTypeCategoryName(showAddTypeModal)}`}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">提示：输入后按回车键直接添加</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowAddTypeModal(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveAddType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Type Modal */}
      {showEditTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">编辑{getTypeCategoryName(editingTypeCategory)}</h2>
              <button onClick={() => setShowEditTypeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">名称 *</label>
                <input
                  type="text"
                  value={typeFormValue}
                  onChange={(e) => setTypeFormValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`请输入${getTypeCategoryName(editingTypeCategory)}`}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowEditTypeModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveEditType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
      {showAddNewCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">新增类型设置</h2>
              <button onClick={() => setShowAddNewCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">类型名称 *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewCategory();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：客户来源类型"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  新增后将创建一个新的类型设置分类，您可以在其中添加具体的选项
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowAddNewCategoryModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAddNewCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">编辑类型设置</h2>
              <button onClick={() => setShowEditCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">类型名称 *</label>
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEditCategory();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入类型名称"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  修改类型名称后，系统将更新该类型设置的显示名称
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowEditCategoryModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleEditCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Confirmation Modal */}
      {showClearLogsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">确认清空操作日志</h2>
              <button onClick={() => setShowClearLogsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">确定要清空所有操作日志吗？</p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <span className="text-orange-600 text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm text-orange-800 font-medium mb-1">警告</p>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li key="warning-1">• 所有操作日志记录将被永久删除</li>
                      <li key="warning-2">• 此操作不可恢复</li>
                      <li key="warning-3">• 建议在清空前先导出重要日志</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowClearLogsModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 新增角色Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl text-gray-900">新增角色</h2>
                <p className="text-sm text-gray-500 mt-1">创建新角色并配置功能权限</p>
              </div>
              <button 
                onClick={() => setShowAddRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    角色标识 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleForm.role}
                    onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: sales_manager (小写英文+下划线)"
                  />
                  <p className="text-xs text-gray-500 mt-1">用于程序中识别角色，创建后不可修改</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    角色名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: 销售经理"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色描述</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="描述这个角色的职责和权限范围"
                    rows={2}
                  />
                </div>
                
                {/* 功能权限配置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">功能权限配置</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">模块</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">查看</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">创建</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">编辑</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">删除</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">导出</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries({
                          tasks: '任务管理',
                          opportunities: '商机管理',
                          projects: '项目管理',
                          goal: '目标管理',
                          issues: '问题管理',
                          budget: '预算管理',
                          settings: '系统设置'
                        }).map(([key, label]) => {
                          // 目标管理有子模块，需要特殊处理
                          if (key === 'goal') {
                            const subModules = {
                              salesGoal: '销售目标',
                              opportunityGoal: '商机目标',
                              productOrder: '产品目标',
                              strategy: '经营策略',
                              decomposition: '目标分解',
                              execution: '执行力地图'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 目标管理主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 目标管理子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 预算管理有子模块，需要特殊处理
                          if (key === 'budget') {
                            const subModules = {
                              annual: '年度预算表',
                              asset: '资产/采购预算',
                              execution: '预算执行管理',
                              parameters: '预算参数设置',
                              hr: '人力费用管理'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 预算管理主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 预算管理子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 系统设置有子模块，需要特殊处理
                          if (key === 'settings') {
                            const subModules = {
                              userApproval: '用户审核',
                              employees: '员工管理',
                              departments: '部门管理',
                              roles: '角色权限',
                              typeSettings: '类型设置',
                              operationLogs: '操作日志'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 系统设置主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 系统设置子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 其他模块正常处理
                          return (
                            <tr key={key}>
                              <td className="px-4 py-3 text-sm text-gray-900">{label}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.view || false}
                                  onChange={() => handleTogglePermission(key, 'view')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.create || false}
                                  onChange={() => handleTogglePermission(key, 'create')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.edit || false}
                                  onChange={() => handleTogglePermission(key, 'edit')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.delete || false}
                                  onChange={() => handleTogglePermission(key, 'delete')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.export || false}
                                  onChange={() => handleTogglePermission(key, 'export')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-900 font-medium mb-2">权限说明：</p>
                    <ul className="text-xs text-amber-800 space-y-1">
                      <li key="perm-1">• <strong>查看</strong>：可以查看模块数据（受数据权限规则限制）</li>
                      <li key="perm-2">• <strong>创建</strong>：可以创建新数据</li>
                      <li key="perm-3">• <strong>编辑</strong>：可以编辑有权限的数据（自己创建的和协作的）</li>
                      <li key="perm-4">• <strong>删除</strong>：可以删除数据（通常只能删除自己创建的）</li>
                      <li key="perm-5">• <strong>导出</strong>：可以导出数据</li>
                    </ul>
                  </div>
                </div>
                
                {/* 数据权限说明 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">数据权限规则（自动应用，无需配置）：</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li key="rule-1">• 自己创建的数据：可增删改查</li>
                    <li key="rule-2">• 协作人数据：可查看和编辑（任务、商机、项目的协作人）</li>
                    <li key="rule-3">• 下级数据：可查看所有下级及下级的下级的数据</li>
                    <li key="rule-4">• 同部门公开数据：可查看同部门成员设为公开的数据</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 固定底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建角色
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑角色权限Modal */}
      {showEditRoleModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl text-gray-900">编辑角色权限</h2>
                <p className="text-sm text-gray-500 mt-1">配置 {roleForm.name} 的功能权限</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditRoleModal(false);
                  setSelectedRole(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入角色名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色描述</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入角色描述"
                    rows={2}
                  />
                </div>
                
                {/* 功能权限配置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">功能权限配置</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">模块</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">查看</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">创建</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">编辑</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">删除</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">导出</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries({
                          tasks: '任务管理',
                          opportunities: '商机管理',
                          projects: '项目管理',
                          goal: '目标管理',
                          issues: '问题管理',
                          budget: '预算管理',
                          settings: '系统设置'
                        }).map(([key, label]) => {
                          // 目标管理有子模块，需要特殊处理
                          if (key === 'goal') {
                            const subModules = {
                              salesGoal: '销售目标',
                              opportunityGoal: '商机目标',
                              productOrder: '产品目标',
                              strategy: '经营策略',
                              decomposition: '目标分解',
                              execution: '执行力地图'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 目标管理主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 目标管理子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 预算管理有子模块，需要特殊处理
                          if (key === 'budget') {
                            const subModules = {
                              annual: '年度预算表',
                              asset: '资产/采购预算',
                              execution: '预算执行管理',
                              parameters: '预算参数设置',
                              hr: '人力费用管理'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 预算管理主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 预算管理子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 系统设置有子模块，需要特殊处理
                          if (key === 'settings') {
                            const subModules = {
                              userApproval: '用户审核',
                              employees: '员工管理',
                              departments: '部门管理',
                              roles: '角色权限',
                              typeSettings: '类型设置',
                              operationLogs: '操作日志'
                            };
                            
                            return (
                              <React.Fragment key={key}>
                                {/* 系统设置主模块标题 */}
                                <tr className="bg-gray-50">
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {label}
                                  </td>
                                </tr>
                                {/* 系统设置子模块 */}
                                {Object.entries(subModules).map(([subKey, subLabel]) => (
                                  <tr key={`${key}-${subKey}`}>
                                    <td className="px-4 py-3 text-sm text-gray-900 pl-8">
                                      └ {subLabel}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.view || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].view = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.create || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].create = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.edit || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].edit = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.delete || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].delete = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={roleForm.permissions[key]?.[subKey]?.export || false}
                                        onChange={(e) => {
                                          const newPermissions = { ...roleForm.permissions } as any;
                                          const moduleKey = key as any;
                                          if (!newPermissions[moduleKey]) {
                                            // 根据模块类型创建默认权限结构
                                            if (moduleKey === 'goal') {
                                              newPermissions[moduleKey] = {
                                                salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
                                                productOrder: { view: false, create: false, edit: false, delete: false, export: false },
                                                strategy: { view: false, create: false, edit: false, delete: false, export: false },
                                                decomposition: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'budget') {
                                              newPermissions[moduleKey] = {
                                                annual: { view: false, create: false, edit: false, delete: false, export: false },
                                                asset: { view: false, create: false, edit: false, delete: false, export: false },
                                                execution: { view: false, create: false, edit: false, delete: false, export: false },
                                                parameters: { view: false, create: false, edit: false, delete: false, export: false },
                                                hr: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            } else if (moduleKey === 'settings') {
                                              newPermissions[moduleKey] = {
                                                userApproval: { view: false, create: false, edit: false, delete: false, export: false },
                                                employees: { view: false, create: false, edit: false, delete: false, export: false },
                                                departments: { view: false, create: false, edit: false, delete: false, export: false },
                                                roles: { view: false, create: false, edit: false, delete: false, export: false },
                                                typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
                                                operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
                                              };
                                            }
                                          }
                                          if (!newPermissions[moduleKey][subKey]) newPermissions[moduleKey][subKey] = { view: false, create: false, edit: false, delete: false, export: false };
                                          newPermissions[moduleKey][subKey].export = e.target.checked;
                                          setRoleForm({ ...roleForm, permissions: newPermissions });
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 其他模块正常处理
                          return (
                            <tr key={key}>
                              <td className="px-4 py-3 text-sm text-gray-900">{label}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.view || false}
                                  onChange={() => handleTogglePermission(key, 'view')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.create || false}
                                  onChange={() => handleTogglePermission(key, 'create')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.edit || false}
                                  onChange={() => handleTogglePermission(key, 'edit')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.delete || false}
                                  onChange={() => handleTogglePermission(key, 'delete')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[key]?.export || false}
                                  onChange={() => handleTogglePermission(key, 'export')}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-900 font-medium mb-2">权限说明：</p>
                    <ul className="text-xs text-amber-800 space-y-1">
                      <li key="perm-1">• <strong>查看</strong>：可以查看模块数据（受数据权限规则限制）</li>
                      <li key="perm-2">• <strong>创建</strong>：可以创建新数据</li>
                      <li key="perm-3">• <strong>编辑</strong>：可以编辑有权限的数据（自己创建的和协作的）</li>
                      <li key="perm-4">• <strong>删除</strong>：可以删除数据（通常只能删除自己创建的）</li>
                      <li key="perm-5">• <strong>导出</strong>：可以导出数据</li>
                    </ul>
                  </div>
                </div>
                
                {/* 数据权限说明 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">数据权限规则（自动应用，无需配置）：</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li key="data-rule-1">• <strong>自己创建的数据</strong>：拥有完整的增删改查权限</li>
                    <li key="data-rule-2">• <strong>协作数据</strong>：作为任务/商机/项目协作人时，可查看和编辑</li>
                    <li key="data-rule-3">• <strong>下级数据</strong>：可查看所有下级（包括下级的下级）的数据</li>
                    <li key="data-rule-4">• <strong>同部门公开数据</strong>：可查看同部门成员设为公开的数据</li>
                    <li key="data-rule-5">• <strong>公开数据</strong>：所有人都可以查看标记为公开的数据</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 固定底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setSelectedRole(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存权限
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除角色确认Modal */}
      {showDeleteRoleModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">删除角色</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-2">
                确定要删除角色 <span className="font-semibold text-red-600">{selectedRole.name}</span> 吗？
              </p>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-800">
                  ⚠️ 删除前会检查是否有用户使用该角色，如果有则无法删除。
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteRoleModal(false);
                  setSelectedRole(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {showEmployeeDetail && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => {
            setShowEmployeeDetail(false);
            setSelectedEmployee(null);
          }}
          onSuccess={async () => {
            // console.log('🔄 [员工详情] 保存成功,准备刷新数据...'); // 已禁用保存成功提示
            console.log('  - 当前员工ID:', selectedEmployee._id);
            console.log('  - 对话框状态:', { showEmployeeDetail });
            
            // 1. 先刷新员工列表
            console.log('📋 [员工详情] 刷新员工列表...');
            await loadEmployees();
            console.log('✅ [员工详情] 员工列表刷新完成');
            
            // 2. 重新从数据库获取更新后的员工数据
            try {
              console.log('🔍 [员工详情] 查询更新后的员工数据...');
              const updatedResult = await db.collection('users')
                .doc(selectedEmployee._id)
                .get();
              
              console.log('📦 [员工详情] 查询结果:', updatedResult);
              const updatedEmployee = updatedResult.data?.[0];
              
              if (updatedEmployee) {
                console.log('✅ [员工详情] 获取到更新后的员工数据:', updatedEmployee);
                console.log('  - 更新后的部门:', updatedEmployee.departments);
                // 更新 selectedEmployee 以便详情对话框显示最新数据
                setSelectedEmployee(updatedEmployee);
                console.log('✅ [员工详情] selectedEmployee 已更新，对话框保持打开');
              } else {
                console.warn('⚠️ [员工详情] 未找到更新后的员工数据,关闭对话框');
                console.warn('  - 查询结果为空，可能员工已被删除');
                setShowEmployeeDetail(false);
                setSelectedEmployee(null);
              }
            } catch (error) {
              console.error('❌ [员工详情] 刷新员工数据失败:', error);
              console.error('  - 错误详情:', JSON.stringify(error, null, 2));
              // 出错时关闭对话框
              setShowEmployeeDetail(false);
              setSelectedEmployee(null);
            }
          }}
          allDepartments={departments}
          rolePermissions={rolePermissions}
          allEmployees={employees}
          currentUserRole={userRole}
        />
      )}

      {/* Employee Trash Modal */}
      {showEmployeeTrash && (
        <EmployeeTrash
          onClose={() => setShowEmployeeTrash(false)}
          onSuccess={() => loadEmployees()}
        />
      )}

      {/* Create Employee Modal */}
      {showCreateEmployeeModal && (
        <CreateEmployeeModal
          show={showCreateEmployeeModal}
          onClose={() => setShowCreateEmployeeModal(false)}
          onSuccess={async () => {
            console.log('✅ [新增员工] 员工创建成功,刷新员工列表...');
            await loadEmployees();
            showSuccess('员工创建成功');
          }}
          departments={departments.map(d => d.name)}
          currentUser={currentUser}
        />
      )}

      {/* 邀请注册弹窗 - 小程序版 */}
      {showInvitationModal && invitationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-8">
              {/* 标题 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">员工注册邀请</h3>
                <button
                  onClick={() => {
                    setShowInvitationModal(false);
                    setInvitationData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 二维码 */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-inner">
                  <img
                    src={invitationData.qrUrl}
                    alt="注册二维码"
                    className="w-56 h-56 border-4 border-white shadow-lg rounded-xl"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center max-w-xs">
                  使用微信扫描小程序码即可进入注册页面
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      // 生成精美的下载图片
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;

                      // 设置画布尺寸（750x1334，iPhone 6/7/8标准尺寸）
                      canvas.width = 750;
                      canvas.height = 1334;

                      // 背景渐变
                      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                      gradient.addColorStop(0, '#3b82f6');
                      gradient.addColorStop(1, '#2563eb');
                      ctx.fillStyle = gradient;
                      ctx.fillRect(0, 0, canvas.width, canvas.height);

                      // 获取系统名称
                      let systemName = '际华定制协同办公管理平台';
                      try {
                        const systemNameRes = await db.collection('type_settings')
                          .where({ type: 'systemName' })
                          .get();
                        
                        if (systemNameRes.data && systemNameRes.data.length > 0 && systemNameRes.data[0].value) {
                          systemName = systemNameRes.data[0].value;
                        }
                      } catch (err) {
                        console.log('获取系统名称失败，使用默认值:', err);
                      }

                      // 绘制标题
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 64px Arial, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText(systemName, canvas.width / 2, 180);

                      // 绘制副标题
                      ctx.font = '36px Arial, sans-serif';
                      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                      ctx.fillText('员工注册邀请', canvas.width / 2, 260);

                      // 加载并绘制二维码
                      const qrImg = new Image();
                      qrImg.crossOrigin = 'anonymous';
                      await new Promise((resolve, reject) => {
                        qrImg.onload = resolve;
                        qrImg.onerror = reject;
                        qrImg.src = invitationData.qrUrl;
                      });

                      // 绘制二维码（居中，带白色背景和阴影）
                      const qrSize = 400;
                      const qrX = (canvas.width - qrSize) / 2;
                      const qrY = 350;
                      
                      // 白色背景
                      ctx.fillStyle = '#ffffff';
                      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                      ctx.shadowBlur = 20;
                      ctx.shadowOffsetY = 10;
                      ctx.fillRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60);
                      
                      // 重置阴影
                      ctx.shadowColor = 'transparent';
                      ctx.shadowBlur = 0;
                      ctx.shadowOffsetY = 0;
                      
                      // 绘制二维码图片
                      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

                      // 绘制使用说明
                      ctx.fillStyle = '#ffffff';
                      ctx.font = '32px Arial, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText('注册步骤', canvas.width / 2, 850);

                      const steps = [
                        '1. 使用微信扫描小程序码',
                        '2. 填写您的姓名',
                        '3. 等待管理员审核',
                        '4. 审核通过后即可使用'
                      ];

                      ctx.font = '28px Arial, sans-serif';
                      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                      ctx.textAlign = 'left';
                      
                      steps.forEach((step, index) => {
                        ctx.fillText(step, 150, 920 + index * 50);
                      });

                      // 加载并绘制公司Logo（右下角）
                      try {
                        const logoRes = await db.collection('type_settings')
                          .where({ type: 'companyLogo' })
                          .get();
                        
                        if (logoRes.data && logoRes.data.length > 0 && logoRes.data[0].tempFileURL) {
                          const logoImg = new Image();
                          logoImg.crossOrigin = 'anonymous';
                          await new Promise((resolve) => {
                            logoImg.onload = resolve;
                            logoImg.onerror = resolve; // 加载失败也继续
                            logoImg.src = logoRes.data[0].tempFileURL;
                          });

                          // 计算Logo尺寸（保持宽高比，最大120x120）
                          const maxLogoSize = 120;
                          let logoWidth = logoImg.width;
                          let logoHeight = logoImg.height;
                          
                          if (logoWidth > maxLogoSize || logoHeight > maxLogoSize) {
                            const scale = Math.min(maxLogoSize / logoWidth, maxLogoSize / logoHeight);
                            logoWidth *= scale;
                            logoHeight *= scale;
                          }

                          // 绘制Logo（右下角，留边距）
                          const logoX = canvas.width - logoWidth - 80;
                          const logoY = canvas.height - logoHeight - 80;
                          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                        }
                      } catch (logoError) {
                        console.log('Logo加载失败，跳过:', logoError);
                      }

                      // 转换为Blob并下载
                      canvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `员工注册邀请_${new Date().toLocaleDateString()}.png`;
                          link.click();
                          URL.revokeObjectURL(url);
                          alert('二维码图片已下载！');
                        }
                      }, 'image/png');

                    } catch (error) {
                      console.error('生成图片失败:', error);
                      alert('生成图片失败: ' + (error as Error).message);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  下载邀请图片
                </button>
              </div>

              {/* 使用说明 */}
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  使用说明
                </h4>
                <ul className="text-sm text-blue-800 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>员工使用微信扫描小程序码进入注册页面</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>填写真实姓名后提交注册申请</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>管理员在"用户审核"模块审核通过后员工即可使用</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>可下载邀请图片分享给员工或打印张贴</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}