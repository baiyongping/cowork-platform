import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, MapPin, Users, FileText, Target, CheckSquare, Briefcase, FolderKanban, AlertCircle, DollarSign, Trash2, UserPlus, Edit2 } from 'lucide-react';
import { callFunction, db } from '../lib/cloudbase';
import { toastError } from '../lib/dialog-utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import AttendeeSelector from './AttendeeSelector';
import { UserAvatar } from './UserAvatar';
import { Meeting } from '../types/meeting';


interface CreateMeetingModalProps {
  meeting?: Meeting;
  onClose: () => void;
  onSuccess: () => void;
}

// 会议类型定义（只有2种，与云函数保持一致）
const MEETING_TYPES = [
  { value: '周工作例会', label: '📅 周工作例会', description: '每周召开的例会' },
  { value: '月度工作例会', label: '📆 月度工作例会', description: '每月召开的例会' }
];

// 议题类型定义（7种）
const AGENDA_TYPES = [
  { value: 'goal', label: '🎯 目标复盘', module: '目标管理', icon: Target },
  { value: 'task', label: '✅ 任务汇报', module: '任务管理', icon: CheckSquare },
  { value: 'opportunity', label: '💼 商机分析', module: '商机管理', icon: Briefcase },
  { value: 'project', label: '📁 项目进展', module: '项目管理', icon: FolderKanban },
  { value: 'issue', label: '⚠️ 问题解决', module: '问题管理', icon: AlertCircle },
  { value: 'budget', label: '💰 预算决策', module: '预算管理', icon: DollarSign },
  { value: 'other', label: '📝 其他议题', module: '无关联', icon: FileText }
];

interface Agenda {
  id: string;
  type: string;
  title: string;
  content: string;
  duration: number;
  relatedIds: string[];
  relatedData?: any[]; // 🔧 新增：存储关联数据的详细信息
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  meeting,
  onClose,
  onSuccess
}) => {
  const isEditMode = !!meeting;
  const [loading, setLoading] = useState(false);
  
  // 格式化日期为 YYYY-MM-DDTHH:mm 格式
  const formatDateForInput = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState({
    title: meeting?.title || '',
    type: meeting?.type || '周工作例会', // 会议类型：周工作例会 或 月度工作例会
    scheduledTime: meeting?.scheduledTime ? formatDateForInput(meeting.scheduledTime) : '',
    duration: meeting?.duration || 60,
    location: meeting?.location || '',
    attendees: meeting?.attendees || [] as string[],
    host: meeting?.host || '',         // 🔧 新增：会议主持人
    recorder: meeting?.recorder || '', // 🔧 新增：会议记录人
    description: meeting?.description || ''
  });
  
  // 议题列表（一个会议可以有多个议题）
  const [agendas, setAgendas] = useState<Agenda[]>(meeting?.agendas || []);
  
  // 当前编辑的议题
  const [currentAgenda, setCurrentAgenda] = useState<Agenda>({
    id: '',
    type: 'goal',
    title: '',
    content: '',
    duration: 15,
    relatedIds: []
  });
  
  // 是否显示添加议题表单
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  
  // 业务数据列表（根据议题类型动态加载）
  const [relatedDataList, setRelatedDataList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // 🔧 新增：全局的时间维度选择(会议创建时手动选择)
  const [timeDimension, setTimeDimension] = useState<'current' | 'next'>('current');
  
  // 任务时间范围选择（本周/下周 或 本月/下月） - 已弃用，改用 timeDimension
  const [taskTimeRange, setTaskTimeRange] = useState<'current' | 'next' | null>(null);
  
  // 任务选择模态框
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalTitle, setTaskModalTitle] = useState('');
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  // 🔧 新增：任务筛选条件
  const [taskOwnerFilter, setTaskOwnerFilter] = useState<string>(''); // 任务负责人筛选

  // 🔧 新增：商机选择模态框
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [availableOpportunities, setAvailableOpportunities] = useState<any[]>([]);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<string[]>([]);
  const [opportunityStageFilter, setOpportunityStageFilter] = useState<string>(''); // 商机阶段筛选
  const [opportunityStages, setOpportunityStages] = useState<string[]>([]); // 商机阶段列表

  // 🔧 新增：项目选择模态框
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectPhaseFilter, setProjectPhaseFilter] = useState<string>(''); // 项目阶段筛选
  const [projectPhases, setProjectPhases] = useState<string[]>([]); // 项目阶段列表

  // 参会员工选择器状态
  const [showAttendeeSelector, setShowAttendeeSelector] = useState(false);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [userList, setUserList] = useState<any[]>([]); // 保留用于显示已选择的员工名称

  // 获取当前年份第几周
  const getWeekOfYear = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // 根据会议类型自动生成标题
  const generateMeetingTitle = (type: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    
    if (type === '周工作例会') {
      const week = getWeekOfYear(now);
      return `${year}年第${week}周周例会`;
    } else {
      const month = now.getMonth() + 1;
      return `${year}年${month}月例会`;
    }
  };

  // 当会议类型改变时，自动生成标题
  const handleMeetingTypeChange = (type: string) => {
    const newTitle = generateMeetingTitle(type);
    setFormData({
      ...formData,
      type,
      title: newTitle
    });
  };

  // 根据议题类型加载相关业务数据
  useEffect(() => {
    if (currentAgenda.type !== 'other' && currentAgenda.type !== 'task' && currentAgenda.type !== 'opportunity' && currentAgenda.type !== 'project') {
      loadRelatedData(currentAgenda.type);
    } else if (currentAgenda.type === 'task') {
      // 任务类型：清空关联数据，等待用户选择时间范围
      setRelatedDataList([]);
      setTaskTimeRange(null);
    } else if (currentAgenda.type === 'opportunity') {
      // 商机类型：清空关联数据，等待用户打开选择器
      setRelatedDataList([]);
    } else if (currentAgenda.type === 'project') {
      // 项目类型：清空关联数据，等待用户打开选择器
      setRelatedDataList([]);
    }
  }, [currentAgenda.type]);

  // 组件初始化时，自动生成标题
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      title: generateMeetingTitle(prev.type)
    }));
  }, []);

  // 加载员工列表
  useEffect(() => {
    loadUsers();
  }, []);

  const loadRelatedData = async (agendaType: string) => {
    setLoadingData(true);
    try {
      switch (agendaType) {
        case 'goal':
          await loadGoals();
          break;
        case 'task':
          // 任务类型不在这里加载，通过模态框选择
          break;
        case 'opportunity':
          await loadOpportunities();
          break;
        case 'project':
          await loadProjects();
          break;
        case 'issue':
          await loadIssues();
          break;
        case 'budget':
          await loadBudgetSubjects();
          break;
      }
    } catch (error) {
      console.error('加载业务数据失败:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // 加载目标列表
  const loadGoals = async () => {
    // TODO: 目标管理云函数暂未部署，先返回空数组
    setRelatedDataList([]);
  };

  // 🔧 新增：计算自然周的时间范围（周一到周日）
  const getNaturalWeekRange = (timeRange: 'current' | 'next') => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
    
    // 计算本周一的日期
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日的话往前推6天
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    // 如果是下周，再往后推7天
    if (timeRange === 'next') {
      monday.setDate(monday.getDate() + 7);
    }
    
    // 计算周日的日期
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { startDate: monday, endDate: sunday };
  };
  
  // 🔧 新增：计算自然月的时间范围（1日到月末）
  const getNaturalMonthRange = (timeRange: 'current' | 'next') => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    
    // 如果是下月
    if (timeRange === 'next') {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    
    // 月初
    const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
    
    // 月末（下个月的第0天就是本月的最后一天）
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    return { startDate: firstDay, endDate: lastDay };
  };
  
  // 打开任务选择模态框
  const handleOpenTaskModal = async (timeRange: 'current' | 'next') => {
    let startDate: string;
    let endDate: string;
    let dateRange: { startDate: Date; endDate: Date };
    
    if (formData.type === '周工作例会') {
      // 🔧 使用自然周计算
      dateRange = getNaturalWeekRange(timeRange);
      startDate = dateRange.startDate.toISOString().split('T')[0];
      endDate = dateRange.endDate.toISOString().split('T')[0];
      
      // 格式化日期范围显示
      const formatDateRange = (start: Date, end: Date) => {
        const startMonth = start.getMonth() + 1;
        const startDay = start.getDate();
        const endMonth = end.getMonth() + 1;
        const endDay = end.getDate();
        
        if (startMonth === endMonth) {
          return `${startMonth}月${startDay}日-${endDay}日`;
        } else {
          return `${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        }
      };
      
      const dateRangeText = formatDateRange(dateRange.startDate, dateRange.endDate);
      setTaskModalTitle(
        timeRange === 'current' 
          ? `选择本周任务（${dateRangeText}）` 
          : `选择下周任务（${dateRangeText}）`
      );
    } else {
      // 🔧 使用自然月计算
      dateRange = getNaturalMonthRange(timeRange);
      startDate = dateRange.startDate.toISOString().split('T')[0];
      endDate = dateRange.endDate.toISOString().split('T')[0];
      
      // 格式化日期范围显示
      const month = dateRange.startDate.getMonth() + 1;
      const lastDay = dateRange.endDate.getDate();
      const dateRangeText = `${month}月1日-${lastDay}日`;
      
      setTaskModalTitle(
        timeRange === 'current' 
          ? `选择本月任务（${dateRangeText}）` 
          : `选择下月任务（${dateRangeText}）`
      );
    }
    
    // 🔧 临时修复：直接查询数据库，绕过有问题的云函数
    setLoadingData(true);
    try {
      console.log('🔍 开始查询任务，日期范围:', { startDate, endDate });
      
      // 获取当前用户信息
      const currentUserStr = localStorage.getItem('current_user');
      if (!currentUserStr) {
        toastError('请先登录');
        return;
      }
      
      const currentUser = JSON.parse(currentUserStr);
      const currentUserId = currentUser.userId;
      
      // 构建查询条件
      const queryConditions: any = {
        isDeleted: { $ne: true }
      };
      
      // 添加用户权限条件
      if (currentUser.roles && currentUser.roles.includes('admin')) {
        // 管理员可以查看所有任务
      } else {
        // 普通用户只能查看自己的任务或参与的任务
        queryConditions.$or = [
          { owner: currentUserId },
          { collaborators: currentUserId }
        ];
      }
      
      // 添加日期范围过滤
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        const dateCondition = {
          $or: [
            // 任务开始日期在范围内
            { 
              startDate: { 
                $gte: startDateObj, 
                $lte: endDateObj 
              } 
            },
            // 任务结束日期在范围内
            { 
              endDate: { 
                $gte: startDateObj, 
                $lte: endDateObj 
              } 
            },
            // 任务跨越整个范围
            {
              $and: [
                { startDate: { $lte: startDateObj } },
                { endDate: { $gte: endDateObj } }
              ]
            }
          ]
        };
        
        queryConditions.$and = queryConditions.$and || [];
        queryConditions.$and.push(dateCondition);
      }
      
      // 执行查询
      const tasksResult = await db.collection('tasks')
        .where(queryConditions)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();
      
      console.log('✅ 查询到任务数量:', tasksResult.data.length);
      
      // 🔧 获取所有任务负责人的用户信息
      const ownerIds = [...new Set(tasksResult.data.map((task: any) => task.owner).filter(Boolean))];
      const usersResult = await db.collection('users')
        .where({
          _id: db.command.in(ownerIds)
        })
        .get();
      
      // 创建 ownerId -> userName 的映射
      const ownerMap = new Map(usersResult.data.map((user: any) => [user._id, user.name]));
      
      // 处理任务数据，将owner ID转换为姓名
      const tasks = tasksResult.data.map((task: any) => ({
        _id: task._id,
        name: task.name || task.title || '未命名任务',
        owner: ownerMap.get(task.owner) || '未知',
        ownerId: task.owner, // 保留原始ID用于筛选
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status || '未开始'
      }));
      
      console.log('✅ 处理后的任务:', tasks);
      setAvailableTasks(Array.isArray(tasks) ? tasks : []);
      setSelectedTaskIds(currentAgenda.relatedIds); // 回显已选任务
      setTaskOwnerFilter(''); // 🔧 重置负责人筛选
      setTaskTimeRange(timeRange);
      setShowTaskModal(true);
      
    } catch (error: any) {
      console.error('❌ 获取任务失败:', error);
      toastError('获取任务失败：' + (error.message || '未知错误'));
    }
    setLoadingData(false);
  };
  
  // 确认选择任务
  const handleConfirmTasks = () => {
    // 🔧 修改：区分新增议题和重新选择
    if (reSelectingAgendaId) {
      // 重新选择任务
      handleConfirmReSelectTasks();
    } else {
      // 新增议题时选择任务
      const selectedData = availableTasks.filter(task => selectedTaskIds.includes(task._id));
      setCurrentAgenda({ 
        ...currentAgenda, 
        relatedIds: selectedTaskIds,
        relatedData: selectedData // 保存关联数据的详细信息
      });
      setRelatedDataList(selectedData);
      setShowTaskModal(false);
    }
  };
  
  // 切换任务选择
  const handleTaskToggle = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    } else {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    }
  };

  // 加载商机列表
  const loadOpportunities = async () => {
    const result = await callFunction({
      name: 'getOpportunities',
      data: {}
    });
    if (result.result) {
      setRelatedDataList(Array.isArray(result.result) ? result.result : []);
    }
  };

  // 🔧 新增：打开商机选择模态框
  const handleOpenOpportunityModal = async () => {
    try {
      setLoadingData(true);
      
      // 1. 加载商机阶段列表
      const stagesResult = await db.collection('type_settings')
        .where({ type: 'opportunity' })
        .get();
      
      let stages: string[] = [];
      if (stagesResult.data && stagesResult.data.length > 0) {
        const values = stagesResult.data[0].values;
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            stages = values;
          } else {
            stages = values.filter((item: any) => item.enabled).map((item: any) => item.value);
          }
        }
      }
      setOpportunityStages(stages.length > 0 ? stages : ['跟进线索', '方案咨询', '商务谈判']);
      
      // 2. 加载商机列表
      const currentUserStr = localStorage.getItem('current_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
      const userId = currentUser.userId || currentUser._id;
      const userRoles = currentUser.roles || [];
      const isAdmin = userRoles.includes('admin') || currentUser.role === 'admin';
      
      console.log('🔍 [CreateMeeting] 当前用户:', userId, '是否管理员:', isAdmin);
      
      // 查询所有商机（排除已删除的）
      const opportunitiesResult = await db.collection('opportunities')
        .where({
          isDeleted: db.command.neq(true)
        })
        .orderBy('updatedAt', 'desc')
        .get();
      
      console.log('🔍 [CreateMeeting] 查询到的商机:', opportunitiesResult.data.length);
      
      // 权限过滤
      let filteredData = opportunitiesResult.data;
      if (!isAdmin) {
        filteredData = opportunitiesResult.data.filter((opp: any) => {
          return opp.owner === userId || 
                 (opp.collaborators && opp.collaborators.includes(userId)) ||
                 opp.isPublic === true;
        });
      }
      
      console.log('🔍 [CreateMeeting] 过滤后的商机:', filteredData.length);
      
      // 3. 关联查询负责人信息
      const ownerIds = [...new Set(filteredData.map((opp: any) => opp.owner).filter(Boolean))];
      const usersResult = await db.collection('users')
        .where({
          _id: db.command.in(ownerIds)
        })
        .get();
      
      const ownerMap = new Map(usersResult.data.map((user: any) => [user._id, user.name]));
      
      // 4. 处理商机数据
      const opportunities = filteredData.map((opp: any) => ({
        _id: opp._id,
        customer: opp.customer || '未知客户',
        contact: opp.contact || '-',
        amount: opp.amount || 0,
        stage: opp.stage || '跟进线索',
        owner: ownerMap.get(opp.owner) || '未知',
        ownerId: opp.owner,
        updatedAt: opp.updatedAt,
        description: opp.description || ''
      }));
      
      console.log('✅ [CreateMeeting] 处理后的商机:', opportunities.length);
      setAvailableOpportunities(opportunities);
      setSelectedOpportunityIds(currentAgenda.relatedIds); // 回显已选商机
      setOpportunityStageFilter(''); // 重置阶段筛选
      setShowOpportunityModal(true);
    } catch (error: any) {
      console.error('❌ 获取商机失败:', error);
      toastError('获取商机失败：' + (error.message || '未知错误'));
    } finally {
      setLoadingData(false);
    }
  };
  
  // 🔧 新增：确认选择商机
  const handleConfirmOpportunities = () => {
    const selectedData = availableOpportunities.filter(opp => selectedOpportunityIds.includes(opp._id));
    setCurrentAgenda({ 
      ...currentAgenda, 
      relatedIds: selectedOpportunityIds,
      relatedData: selectedData
    });
    setRelatedDataList(selectedData);
    setShowOpportunityModal(false);
  };
  
  // 🔧 新增：切换商机选择
  const handleOpportunityToggle = (oppId: string, checked: boolean) => {
    if (checked) {
      setSelectedOpportunityIds([...selectedOpportunityIds, oppId]);
    } else {
      setSelectedOpportunityIds(selectedOpportunityIds.filter(id => id !== oppId));
    }
  };

  // 加载项目列表
  const loadProjects = async () => {
    const result = await callFunction({
      name: 'getProjects',
      data: {}
    });
    if (result.result) {
      setRelatedDataList(Array.isArray(result.result) ? result.result : []);
    }
  };

  // 🔧 新增：打开项目选择模态框
  const handleOpenProjectModal = async () => {
    try {
      setLoadingData(true);
      
      // 1. 加载项目阶段列表
      const phasesResult = await db.collection('type_settings')
        .where({ type: 'projectStatus' })
        .get();
      
      let phases: string[] = [];
      if (phasesResult.data && phasesResult.data.length > 0) {
        const values = phasesResult.data[0].values;
        if (values && values.length > 0) {
          if (typeof values[0] === 'string') {
            phases = values;
          } else {
            phases = values.filter((item: any) => item.enabled).map((item: any) => item.value);
          }
        }
      }
      setProjectPhases(phases.length > 0 ? phases : ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停']);
      
      // 2. 加载项目列表
      const currentUserStr = localStorage.getItem('current_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
      const userId = currentUser.userId || currentUser._id;
      const userRoles = currentUser.roles || [];
      const isAdmin = userRoles.includes('admin') || currentUser.role === 'admin';
      
      console.log('🔍 [CreateMeeting] 当前用户:', userId, '是否管理员:', isAdmin);
      
      // 查询所有项目（排除已删除的）
      const projectsResult = await db.collection('projects')
        .where({
          isDeleted: db.command.neq(true)
        })
        .orderBy('updatedAt', 'desc')
        .get();
      
      console.log('🔍 [CreateMeeting] 查询到的项目:', projectsResult.data.length);
      
      // 权限过滤
      let filteredData = projectsResult.data;
      if (!isAdmin) {
        filteredData = projectsResult.data.filter((proj: any) => {
          return proj.owner === userId || 
                 (proj.members && proj.members.includes(userId)) ||
                 proj.isPublic === true;
        });
      }
      
      console.log('🔍 [CreateMeeting] 过滤后的项目:', filteredData.length);
      
      // 3. 关联查询负责人信息
      const ownerIds = [...new Set(filteredData.map((proj: any) => proj.owner).filter(Boolean))];
      const usersResult = await db.collection('users')
        .where({
          _id: db.command.in(ownerIds)
        })
        .get();
      
      const ownerMap = new Map(usersResult.data.map((user: any) => [user._id, user.name]));
      
      // 4. 处理项目数据
      const projects = filteredData.map((proj: any) => ({
        _id: proj._id,
        name: proj.name || '未命名项目',
        customer: proj.customer || '-',
        contractAmount: proj.contractAmount || 0,
        status: proj.status || '未开始',
        owner: ownerMap.get(proj.owner) || '未知',
        ownerId: proj.owner,
        updatedAt: proj.updatedAt,
        description: proj.description || ''
      }));
      
      console.log('✅ [CreateMeeting] 处理后的项目:', projects.length);
      setAvailableProjects(projects);
      setSelectedProjectIds(currentAgenda.relatedIds); // 回显已选项目
      setProjectPhaseFilter(''); // 重置阶段筛选
      setShowProjectModal(true);
    } catch (error: any) {
      console.error('❌ 获取项目失败:', error);
      toastError('获取项目失败：' + (error.message || '未知错误'));
    } finally {
      setLoadingData(false);
    }
  };
  
  // 🔧 新增：确认选择项目
  const handleConfirmProjects = () => {
    const selectedData = availableProjects.filter(proj => selectedProjectIds.includes(proj._id));
    setCurrentAgenda({ 
      ...currentAgenda, 
      relatedIds: selectedProjectIds,
      relatedData: selectedData
    });
    setRelatedDataList(selectedData);
    setShowProjectModal(false);
  };
  
  // 🔧 新增：切换项目选择
  const handleProjectToggle = (projId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjectIds([...selectedProjectIds, projId]);
    } else {
      setSelectedProjectIds(selectedProjectIds.filter(id => id !== projId));
    }
  };

  // 加载问题列表
  const loadIssues = async () => {
    // TODO: 问题管理云函数暂未部署，先返回空数组
    setRelatedDataList([]);
  };

  // 加载预算科目列表
  const loadBudgetSubjects = async () => {
    // TODO: 预算管理云函数暂未部署，先返回空数组
    setRelatedDataList([]);
  };

  // 加载员工列表（仅用于显示已选择的员工名称）
  const loadUsers = async () => {
    try {
      // ✅ 只加载已审核通过的用户（与员工管理页面保持一致）
      const result = await db.collection('users')
        .where({ approvalStatus: 'approved' })
        .get();
      
      // 🔧 过滤掉已删除的用户和 admin 超级用户
      const activeUsers = result.data.filter((user: any) => 
        user.deleted !== true && user.username !== 'admin'
      );
      
      setUserList(activeUsers);
    } catch (error) {
      console.error('加载员工列表失败:', error);
      toastError('加载员工列表失败');
    }
  };

  // 确认选择参会员工
  const handleConfirmAttendees = (selectedIds: string[]) => {
    setSelectedAttendeeIds(selectedIds);
    // 将选中的员工姓名存入 formData.attendees
    const selectedNames = userList
      .filter(user => selectedIds.includes(user._id))
      .map(user => user.name);
    setFormData({
      ...formData,
      attendees: selectedNames
    });
  };

  // 添加议题到列表
  const handleAddAgenda = () => {
    if (!currentAgenda.title.trim()) {
      alert('请填写议题标题');
      return;
    }
    
    if (currentAgenda.type !== 'other' && currentAgenda.relatedIds.length === 0) {
      alert('请选择关联数据');
      return;
    }
    
    if (currentAgenda.type === 'other' && !currentAgenda.content.trim()) {
      alert('请填写议题内容');
      return;
    }
    
    // 🔧 修改：区分新增和重新选择
    if (reSelectingAgendaId) {
      // 重新选择模式：更新现有议题
      const selectedData = relatedDataList.filter(item => currentAgenda.relatedIds.includes(item._id));
      
      setAgendas(prev => prev.map(agenda => {
        if (agenda.id === reSelectingAgendaId) {
          return {
            ...agenda,
            relatedIds: currentAgenda.relatedIds,
            relatedData: selectedData
          };
        }
        return agenda;
      }));
      
      // 关闭表单并重置状态
      setShowAgendaForm(false);
      setReSelectingAgendaId(null);
      setReSelectModalType(null);
      setCurrentAgenda({
        id: '',
        type: 'goal',
        title: '',
        content: '',
        duration: 15,
        relatedIds: []
      });
    } else {
      // 新增模式：添加新议题
      const newAgenda: Agenda = {
        ...currentAgenda,
        id: Date.now().toString(),
        relatedData: relatedDataList.filter(item => currentAgenda.relatedIds.includes(item._id))
      };
      
      setAgendas([...agendas, newAgenda]);
      
      // 重置当前议题并隐藏表单
      setCurrentAgenda({
        id: '',
        type: 'goal',
        title: '',
        content: '',
        duration: 15,
        relatedIds: []
      });
      setShowAgendaForm(false);
    }
  };
  
  // 删除议题
  const handleRemoveAgenda = (id: string) => {
    setAgendas(agendas.filter(a => a.id !== id));
  };

  // 🔧 新增：重新选择议题关联内容
  const [reSelectingAgendaId, setReSelectingAgendaId] = useState<string | null>(null);
  const [reSelectModalType, setReSelectModalType] = useState<string | null>(null);
  
  // 打开重新选择模态框
  const handleReSelectContent = async (agendaId: string, agendaType: string) => {
    setReSelectingAgendaId(agendaId);
    setReSelectModalType(agendaType);
    
    // 根据议题类型加载对应数据
    if (agendaType === 'task') {
      // 任务类型：需要先选择时间维度，然后打开模态框
      // 获取该议题的时间维度（从议题标题判断）
      const agenda = agendas.find(a => a.id === agendaId);
      if (agenda) {
        const isCurrentTime = agenda.title.includes('本周') || agenda.title.includes('本月');
        const timeRange = isCurrentTime ? 'current' : 'next';
        await handleOpenTaskModalForReSelect(timeRange, agendaId);
      }
    } else {
      // 其他类型：直接加载数据并打开选择器
      await loadRelatedDataForReSelect(agendaType, agendaId);
      setShowAgendaForm(true); // 打开议题表单（重用现有的表单UI）
    }
  };
  
  // 加载重新选择的关联数据
  const loadRelatedDataForReSelect = async (agendaType: string, agendaId: string) => {
    setLoadingData(true);
    try {
      switch (agendaType) {
        case 'goal':
          await loadGoals();
          break;
        case 'opportunity':
          await loadOpportunities();
          break;
        case 'project':
          await loadProjects();
          break;
        case 'issue':
          await loadIssues();
          break;
        case 'budget':
          await loadBudgetSubjects();
          break;
      }
      
      // 回显该议题已选的数据
      const agenda = agendas.find(a => a.id === agendaId);
      if (agenda) {
        setCurrentAgenda({
          ...currentAgenda,
          type: agendaType,
          relatedIds: agenda.relatedIds || [],
          relatedData: agenda.relatedData || []
        });
      }
    } catch (error) {
      console.error('加载业务数据失败:', error);
    } finally {
      setLoadingData(false);
    }
  };
  
  // 打开任务选择模态框（用于重新选择）
  const handleOpenTaskModalForReSelect = async (timeRange: 'current' | 'next', agendaId: string) => {
    let startDate: string;
    let endDate: string;
    let dateRange: { startDate: Date; endDate: Date };
    
    if (formData.type === '周工作例会') {
      dateRange = getNaturalWeekRange(timeRange);
      startDate = dateRange.startDate.toISOString().split('T')[0];
      endDate = dateRange.endDate.toISOString().split('T')[0];
      
      const formatDateRange = (start: Date, end: Date) => {
        const startMonth = start.getMonth() + 1;
        const startDay = start.getDate();
        const endMonth = end.getMonth() + 1;
        const endDay = end.getDate();
        
        if (startMonth === endMonth) {
          return `${startMonth}月${startDay}日-${endDay}日`;
        } else {
          return `${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        }
      };
      
      const dateRangeText = formatDateRange(dateRange.startDate, dateRange.endDate);
      setTaskModalTitle(
        timeRange === 'current' 
          ? `重新选择本周任务（${dateRangeText}）` 
          : `重新选择下周任务（${dateRangeText}）`
      );
    } else {
      dateRange = getNaturalMonthRange(timeRange);
      startDate = dateRange.startDate.toISOString().split('T')[0];
      endDate = dateRange.endDate.toISOString().split('T')[0];
      
      const month = dateRange.startDate.getMonth() + 1;
      const lastDay = dateRange.endDate.getDate();
      const dateRangeText = `${month}月1日-${lastDay}日`;
      
      setTaskModalTitle(
        timeRange === 'current' 
          ? `重新选择本月任务（${dateRangeText}）` 
          : `重新选择下月任务（${dateRangeText}）`
      );
    }
    
    setLoadingData(true);
    try {
      const currentUserStr = localStorage.getItem('current_user');
      if (!currentUserStr) {
        toastError('请先登录');
        return;
      }
      
      const currentUser = JSON.parse(currentUserStr);
      const currentUserId = currentUser.userId;
      
      const queryConditions: any = {
        isDeleted: { $ne: true }
      };
      
      if (currentUser.roles && currentUser.roles.includes('admin')) {
        // 管理员可以查看所有任务
      } else {
        queryConditions.$or = [
          { owner: currentUserId },
          { collaborators: currentUserId }
        ];
      }
      
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        const dateCondition = {
          $or: [
            { startDate: { $gte: startDateObj, $lte: endDateObj } },
            { endDate: { $gte: startDateObj, $lte: endDateObj } },
            {
              $and: [
                { startDate: { $lte: startDateObj } },
                { endDate: { $gte: endDateObj } }
              ]
            }
          ]
        };
        
        queryConditions.$and = queryConditions.$and || [];
        queryConditions.$and.push(dateCondition);
      }
      
      const tasksResult = await db.collection('tasks')
        .where(queryConditions)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();
      
      // 🔧 获取所有任务负责人的用户信息
      const ownerIds = [...new Set(tasksResult.data.map((task: any) => task.owner).filter(Boolean))];
      const usersResult = await db.collection('users')
        .where({
          _id: db.command.in(ownerIds)
        })
        .get();
      
      // 创建 ownerId -> userName 的映射
      const ownerMap = new Map(usersResult.data.map((user: any) => [user._id, user.name]));
      
      // 处理任务数据，将owner ID转换为姓名
      const tasks = tasksResult.data.map((task: any) => ({
        _id: task._id,
        name: task.name || task.title || '未命名任务',
        owner: ownerMap.get(task.owner) || '未知',
        ownerId: task.owner, // 保留原始ID用于筛选
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status || '未开始'
      }));
      
      setAvailableTasks(Array.isArray(tasks) ? tasks : []);
      
      // 回显该议题已选的任务
      const agenda = agendas.find(a => a.id === agendaId);
      setSelectedTaskIds(agenda?.relatedIds || []);
      
      setTaskOwnerFilter(''); // 🔧 重置负责人筛选
      setTaskTimeRange(timeRange);
      setShowTaskModal(true);
      
    } catch (error: any) {
      console.error('❌ 获取任务失败:', error);
      toastError('获取任务失败：' + (error.message || '未知错误'));
    }
    setLoadingData(false);
  };
  
  // 确认重新选择的关联内容
  const handleConfirmReSelect = (selectedIds: string[]) => {
    if (!reSelectingAgendaId) return;
    
    // 获取选中的数据详情
    const selectedData = relatedDataList.filter(item => selectedIds.includes(item._id));
    
    // 更新议题的关联数据
    setAgendas(prev => prev.map(agenda => {
      if (agenda.id === reSelectingAgendaId) {
        return {
          ...agenda,
          relatedIds: selectedIds,
          relatedData: selectedData
        };
      }
      return agenda;
    }));
    
    // 关闭模态框
    setReSelectingAgendaId(null);
    setReSelectModalType(null);
  };
  
  // 确认重新选择任务
  const handleConfirmReSelectTasks = () => {
    if (!reSelectingAgendaId) return;
    
    // 获取选中的任务详情
    const selectedData = availableTasks.filter(task => selectedTaskIds.includes(task._id));
    
    // 更新议题的关联数据
    setAgendas(prev => prev.map(agenda => {
      if (agenda.id === reSelectingAgendaId) {
        return {
          ...agenda,
          relatedIds: selectedTaskIds,
          relatedData: selectedData
        };
      }
      return agenda;
    }));
    
    // 关闭模态框
    setShowTaskModal(false);
    setReSelectingAgendaId(null);
    setReSelectModalType(null);
  };
  
  // 处理关联数据选择
  const handleRelatedDataChange = (dataId: string, checked: boolean) => {
    setCurrentAgenda(prev => {
      const newRelatedIds = checked
        ? [...prev.relatedIds, dataId]
        : prev.relatedIds.filter(id => id !== dataId);
      return { ...prev, relatedIds: newRelatedIds };
    });
  };

  // 将新的议题数据结构转换为云函数期望的旧格式
  const convertAgendasToLegacyFormat = (agendas: Agenda[]) => {
    const result = {
      // 关联业务数据字段
      relatedGoals: [] as string[],
      relatedTasks: [] as string[],
      relatedOpportunities: [] as string[],
      relatedProjects: [] as string[],
      relatedIssues: [] as string[],
      relatedBudgets: [] as string[],
      // 其它议题字段
      agendaTopic: '',
      agendaContent: ''
    };

    // 处理每个议题，按类型分类
    agendas.forEach(agenda => {
      if (agenda.type === 'other') {
        // 其它议题类型
        result.agendaTopic = agenda.title;
        result.agendaContent = agenda.content;
      } else {
        // 按议题类型将关联数据分配到对应字段
        agenda.relatedIds.forEach(id => {
          switch (agenda.type) {
            case 'goal':
              result.relatedGoals.push(id);
              break;
            case 'task':
              result.relatedTasks.push(id);
              break;
            case 'opportunity':
              result.relatedOpportunities.push(id);
              break;
            case 'project':
              result.relatedProjects.push(id);
              break;
            case 'issue':
              result.relatedIssues.push(id);
              break;
            case 'budget':
              result.relatedBudgets.push(id);
              break;
          }
        });
      }
    });

    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!formData.title || !formData.type || !formData.scheduledTime) {
      alert('请填写会议标题、类型和计划时间');
      return;
    }

    if (agendas.length === 0) {
      alert('请至少添加一个议题');
      return;
    }

    try {
      setLoading(true);
      
      // 将新的议题数据结构转换为云函数期望的格式
      const convertedData = convertAgendasToLegacyFormat(agendas);
      
      // 合并数据
      const submitData = {
        ...formData,
        ...convertedData,
        timeDimension, // 🔧 新增：时间维度字段
        agendas: agendas  // 🔧 新增：同时保存新的议题数组格式
      };
      
      console.log(isEditMode ? '更新的会议数据:' : '提交的会议数据:', submitData);
      console.log('会议类型:', submitData.type);
      console.log('时间维度:', submitData.timeDimension);
      console.log('议题数据:', submitData.agendas);
      
      const result = await callFunction({
        name: 'meeting-management',
        data: isEditMode ? {
          action: 'update',
          data: {
            _id: meeting!._id,
            ...submitData
          }
        } : {
          action: 'create',
          data: submitData
        }
      });

      if (result.result.success) {
        onSuccess();
      } else {
        alert((isEditMode ? '更新' : '创建') + '失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error((isEditMode ? '更新' : '创建') + '会议失败:', error);
      alert((isEditMode ? '更新' : '创建') + '失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取议题类型的图标
  const getAgendaIcon = (type: string) => {
    const agendaType = AGENDA_TYPES.find(t => t.value === type);
    return agendaType ? agendaType.icon : FileText;
  };

  // 获取议题类型的标签
  const getAgendaLabel = (type: string) => {
    const agendaType = AGENDA_TYPES.find(t => t.value === type);
    return agendaType ? agendaType.label : '未知类型';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* 弹窗头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEditMode ? '编辑会议' : '创建会议'}</h2>
              <p className="text-sm text-gray-500">{isEditMode ? '修改会议信息和议题' : '填写会议基本信息和议题'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 会议类型 - 放在最上方 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会议类型 <span className="text-red-500">*</span>
                  {isEditMode && <span className="ml-2 text-xs text-gray-500">（创建后不可修改）</span>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MEETING_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => !isEditMode && handleMeetingTypeChange(type.value)}
                      disabled={isEditMode}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : isEditMode 
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 会议标题 - 自动生成 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会议标题 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="会议标题会自动生成，也可手动修改"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 根据会议类型自动生成，您也可以手动修改
                </p>
              </div>

              {/* 会议时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  计划时间 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>

              {/* 预计时长 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预计时长（分钟）
                </label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                />
              </div>

              {/* 会议地点 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  会议地点
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如：会议室A / 线上会议"
                />
              </div>

              {/* 参会员工（可选） */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline w-4 h-4 mr-1" />
                  参会员工（可选）
                </label>
                <div className="space-y-2">
                  {/* 选择参会员工按钮 */}
                  <button
                    type="button"
                    onClick={() => setShowAttendeeSelector(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-600"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>选择参会员工</span>
                  </button>

                  {/* 已选择的参会员工列表 */}
                  {formData.attendees && formData.attendees.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          已选择 {formData.attendees.length} 位参会员工
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, attendees: [] });
                            setSelectedAttendeeIds([]);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          清空
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.attendees.map(attendeeName => {
                          const user = userList.find(u => u.name === attendeeName);
                          return (
                            <div
                              key={attendeeName}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm"
                            >
                              {user && <UserAvatar user={user} size="xs" />}
                              <span className="text-gray-900">{attendeeName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newAttendees = formData.attendees.filter(a => a !== attendeeName);
                                  setFormData({ ...formData, attendees: newAttendees });
                                  if (user) {
                                    setSelectedAttendeeIds(selectedAttendeeIds.filter(id => id !== user._id));
                                  }
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

              {/* 会议主持人（从参会人员中选择） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会议主持人
                </label>
                <select
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择主持人</option>
                  {formData.attendees.map((attendeeName) => (
                    <option key={attendeeName} value={attendeeName}>
                      {attendeeName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 默认从参会人员中选择
                </p>
              </div>

              {/* 会议记录人（从参会人员中选择） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会议记录人
                </label>
                <select
                  value={formData.recorder}
                  onChange={(e) => setFormData({ ...formData, recorder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择记录人</option>
                  {formData.attendees.map((attendeeName) => (
                    <option key={attendeeName} value={attendeeName}>
                      {attendeeName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 默认从参会人员中选择
                </p>
              </div>
            </div>
          </Card>

          {/* 议题管理 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              会议议题
            </h3>

            {/* 已添加的议题列表 */}
            {agendas.length > 0 && (
              <div className="mb-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">已添加的议题：</h4>
                {agendas.map((agenda, index) => {
                  const Icon = getAgendaIcon(agenda.type);
                  return (
                    <div
                      key={agenda.id}
                      className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {index + 1}. {agenda.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getAgendaLabel(agenda.type)} • {agenda.duration}分钟
                          </span>
                        </div>
                        {agenda.content && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{agenda.content}</p>
                        )}
                        {/* 🔧 新增：关联数据列表显示（可点击重新选择） */}
                        {agenda.relatedIds.length > 0 && agenda.relatedData && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1.5 font-medium flex items-center gap-1">
                              <span>关联的{getAgendaLabel(agenda.type)}（{agenda.relatedIds.length}条）:</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleReSelectContent(agenda.id, agenda.type);
                                }}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                                title="重新选择关联内容"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>重新选择</span>
                              </button>
                            </div>
                            <ul className="space-y-1 pl-4">
                              {agenda.relatedData.map((item, idx) => {
                                return (
                                  <li key={item._id || idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                                    <span className="text-gray-400 mt-0.5">•</span>
                                    <span className="flex-1">
                                      {item.name || item.customer || item.title || '未命名'}
                                      {item.owner && (
                                        <span className="text-gray-400 ml-1">
                                          ({item.owner})
                                        </span>
                                      )}
                                      {item.status && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          item.status === '已完成' || item.status === '已成交'
                                            ? 'bg-green-100 text-green-700'
                                            : item.status === '进行中'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.status}
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAgenda(agenda.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 添加议题按钮 */}
            {!showAgendaForm && (
              <Button
                type="button"
                onClick={() => setShowAgendaForm(true)}
                variant="outline"
                className="w-full border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加会议议题
              </Button>
            )}

            {/* 添加新议题表单 */}
            {showAgendaForm && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700">添加新议题：</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAgendaForm(false);
                      setCurrentAgenda({
                        id: '',
                        type: 'goal',
                        title: '',
                        content: '',
                        duration: 15,
                        relatedIds: []
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 议题类型选择 - 改为下拉列表 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    议题类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentAgenda.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const agendaTypeInfo = AGENDA_TYPES.find(t => t.value === newType);
                      
                      // 自动生成标题：
                      // 1. 任务汇报：根据时间维度生成（本周/下周/本月/下月 + 任务汇报）
                      // 2. 其他类型：直接使用议题类型名称（去掉emoji）
                      let autoTitle = '';
                      if (newType === 'task') {
                        const timePrefix = timeDimension === 'current' 
                          ? (formData.type === '周工作例会' ? '本周' : '本月')
                          : (formData.type === '周工作例会' ? '下周' : '下月');
                        autoTitle = `${timePrefix}任务汇报`;
                      } else if (agendaTypeInfo) {
                        // 去掉label中的emoji（如 "🎯 目标复盘" → "目标复盘"）
                        autoTitle = agendaTypeInfo.label.replace(/[\u{1F300}-\u{1F9FF}]\s*/gu, '').trim();
                      }
                      
                      setCurrentAgenda({ 
                        ...currentAgenda, 
                        type: newType, 
                        relatedIds: [],
                        title: autoTitle // 自动填充标题
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AGENDA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.module}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 时间维度选择 - 仅在选择任务汇报时显示 */}
                {currentAgenda.type === 'task' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      时间维度 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTimeDimension('current');
                          // 同步更新任务汇报标题
                          if (currentAgenda.type === 'task') {
                            const timePrefix = formData.type === '周工作例会' ? '本周' : '本月';
                            setCurrentAgenda({ ...currentAgenda, title: `${timePrefix}任务汇报` });
                          }
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          timeDimension === 'current'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="font-semibold">
                          ⏰ 本{formData.type === '周工作例会' ? '周' : '月'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          讨论本{formData.type === '周工作例会' ? '周' : '月'}的工作内容
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeDimension('next');
                          // 同步更新任务汇报标题
                          if (currentAgenda.type === 'task') {
                            const timePrefix = formData.type === '周工作例会' ? '下周' : '下月';
                            setCurrentAgenda({ ...currentAgenda, title: `${timePrefix}任务汇报` });
                          }
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          timeDimension === 'next'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold">
                          🚀 下{formData.type === '周工作例会' ? '周' : '月'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          讨论下{formData.type === '周工作例会' ? '周' : '月'}的工作计划
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              {/* 议题标题 - 自动生成 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  议题标题 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-gray-500">（自动生成）</span>
                </label>
                <Input
                  type="text"
                  value={currentAgenda.title}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="请选择议题类型，系统将自动生成标题"
                />
              </div>

              {/* 预计时长 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预计时长（分钟）
                </label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={currentAgenda.duration}
                  onChange={(e) => setCurrentAgenda({ ...currentAgenda, duration: parseInt(e.target.value) })}
                />
              </div>

              {/* 关联数据选择 */}
              {currentAgenda.type !== 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择关联数据 <span className="text-red-500">*</span>
                  </label>
                  
                  {/* 任务汇报：显示关联任务按钮（不再需要本周/下周选择） */}
                  {currentAgenda.type === 'task' && (
                    <div className="mb-3">
                      <Button
                        type="button"
                        onClick={() => handleOpenTaskModal(timeDimension)}
                        variant="default"
                        className="w-full"
                        disabled={loadingData}
                      >
                        {loadingData ? '加载中...' : `关联${timeDimension === 'current' ? '本' : '下'}${formData.type === '周工作例会' ? '周' : '月'}任务`}
                      </Button>
                    </div>
                  )}
                  
                  {/* 🔧 新增：商机分析：显示商机选择按钮 */}
                  {currentAgenda.type === 'opportunity' && (
                    <div className="mb-3">
                      <Button
                        type="button"
                        onClick={handleOpenOpportunityModal}
                        variant="default"
                        className="w-full"
                        disabled={loadingData}
                      >
                        {loadingData ? '加载中...' : '选择商机'}
                      </Button>
                    </div>
                  )}
                  
                  {/* 🔧 新增：项目进展：显示项目选择按钮 */}
                  {currentAgenda.type === 'project' && (
                    <div className="mb-3">
                      <Button
                        type="button"
                        onClick={handleOpenProjectModal}
                        variant="default"
                        className="w-full"
                        disabled={loadingData}
                      >
                        {loadingData ? '加载中...' : '选择项目'}
                      </Button>
                    </div>
                  )}
                  
                  {loadingData ? (
                    <div className="text-sm text-gray-500">加载中...</div>
                  ) : currentAgenda.type === 'task' && relatedDataList.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                      暂无可关联的数据
                    </div>
                  ) : (currentAgenda.type === 'task' || currentAgenda.type === 'opportunity' || currentAgenda.type === 'project') && relatedDataList.length > 0 ? (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        已选{currentAgenda.type === 'task' ? '任务' : currentAgenda.type === 'opportunity' ? '商机' : '项目'} ({relatedDataList.length})
                      </div>
                      {relatedDataList.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <span className="text-sm text-gray-700">
                            {currentAgenda.type === 'task' 
                              ? (item.name || item.title || '未命名')
                              : currentAgenda.type === 'opportunity'
                              ? (item.customer || '未知客户')
                              : (item.name || '未命名项目')}
                            {item.owner && <span className="text-gray-500 ml-2">({item.owner})</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newIds = currentAgenda.relatedIds.filter(id => id !== item._id);
                              setCurrentAgenda({ ...currentAgenda, relatedIds: newIds });
                              setRelatedDataList(relatedDataList.filter(t => t._id !== item._id));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : relatedDataList.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                      暂无可关联的数据
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 p-4 bg-gray-50 rounded-lg">
                      {relatedDataList.map((item) => (
                        <label
                          key={item._id}
                          className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={currentAgenda.relatedIds.includes(item._id)}
                            onChange={(e) => handleRelatedDataChange(item._id, e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">
                            {item.name || item.title || item.customer || '未命名'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 议题内容（"其他议题"类型） */}
              {currentAgenda.type === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    议题内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={currentAgenda.content}
                    onChange={(e) => setCurrentAgenda({ ...currentAgenda, content: e.target.value })}
                    placeholder="请输入议题内容..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* 添加按钮 */}
              <Button
                type="button"
                onClick={handleAddAgenda}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加到议题列表
              </Button>
            </div>
            )}
          </Card>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (isEditMode ? '更新中...' : '创建中...') : (isEditMode ? '更新会议' : '创建会议')}
            </Button>
          </div>
        </form>
      </div>

      {/* 参会员工选择器 */}
      {showAttendeeSelector && (
        <AttendeeSelector
          selectedIds={selectedAttendeeIds}
          excludeIds={[]} // 不排除任何人
          onConfirm={handleConfirmAttendees}
          onClose={() => setShowAttendeeSelector(false)}
        />
      )}

      {/* 任务选择模态框 */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{taskModalTitle}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTaskIds([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 🔧 新增：筛选条件区域 */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  任务负责人:
                </label>
                <select
                  value={taskOwnerFilter}
                  onChange={(e) => setTaskOwnerFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部负责人</option>
                  {/* 🔧 从 availableTasks 中提取唯一的负责人列表 */}
                  {[...new Set(availableTasks.map(t => t.owner).filter(Boolean))].map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // 🔧 根据筛选条件过滤任务列表
                const filteredTasks = availableTasks.filter(task => {
                  if (taskOwnerFilter && task.owner !== taskOwnerFilter) {
                    return false;
                  }
                  return true;
                });
                
                return filteredTasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {taskOwnerFilter ? '该负责人暂无任务' : '暂无可选任务'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                    <label
                      key={task._id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task._id)}
                        onChange={(e) => handleTaskToggle(task._id, e.target.checked)}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {task.name || task.title || '未命名任务'}
                        </div>
                        {task.owner && (
                          <div className="text-xs text-gray-500 mt-1">
                            负责人: {task.owner}
                          </div>
                        )}
                        {task.endDate && (
                          <div className="text-xs text-gray-500">
                            截止: {new Date(task.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                );
              })()}
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                已选择 {selectedTaskIds.length} 个任务
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTaskIds([]);
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmTasks}
                  disabled={selectedTaskIds.length === 0}
                >
                  确认选择
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 新增：商机选择模态框 */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">选择商机</h3>
              <button
                type="button"
                onClick={() => {
                  setShowOpportunityModal(false);
                  setSelectedOpportunityIds([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 筛选条件区域 */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  商机阶段:
                </label>
                <select
                  value={opportunityStageFilter}
                  onChange={(e) => setOpportunityStageFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部阶段</option>
                  {opportunityStages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 商机列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // 根据筛选条件过滤商机列表
                const filteredOpportunities = availableOpportunities.filter(opp => {
                  if (opportunityStageFilter && opp.stage !== opportunityStageFilter) {
                    return false;
                  }
                  return true;
                });
                
                return filteredOpportunities.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {opportunityStageFilter ? '该阶段暂无商机' : '暂无可选商机'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOpportunities.map((opp) => (
                      <label
                        key={opp._id}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOpportunityIds.includes(opp._id)}
                          onChange={(e) => handleOpportunityToggle(opp._id, e.target.checked)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {opp.customer}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>联系人: {opp.contact}</span>
                            <span>金额: {opp.amount}万元</span>
                            <span className={`px-2 py-0.5 rounded ${
                              opp.stage === '成交' ? 'bg-green-100 text-green-700' :
                              opp.stage === '商务谈判' ? 'bg-blue-100 text-blue-700' :
                              opp.stage === '方案咨询' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {opp.stage}
                            </span>
                          </div>
                          {opp.owner && (
                            <div className="text-xs text-gray-500 mt-1">
                              负责人: {opp.owner}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                已选择 {selectedOpportunityIds.length} 个商机
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOpportunityModal(false);
                    setSelectedOpportunityIds([]);
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmOpportunities}
                  disabled={selectedOpportunityIds.length === 0}
                >
                  确认选择
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 新增：项目选择模态框 */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">选择项目</h3>
              <button
                type="button"
                onClick={() => {
                  setShowProjectModal(false);
                  setSelectedProjectIds([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 筛选条件区域 */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  项目阶段:
                </label>
                <select
                  value={projectPhaseFilter}
                  onChange={(e) => setProjectPhaseFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部阶段</option>
                  {projectPhases.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // 根据筛选条件过滤项目列表
                const filteredProjects = availableProjects.filter(proj => {
                  if (projectPhaseFilter && proj.status !== projectPhaseFilter) {
                    return false;
                  }
                  return true;
                });
                
                return filteredProjects.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {projectPhaseFilter ? '该阶段暂无项目' : '暂无可选项目'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProjects.map((proj) => (
                      <label
                        key={proj._id}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(proj._id)}
                          onChange={(e) => handleProjectToggle(proj._id, e.target.checked)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {proj.name}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>客户: {proj.customer}</span>
                            <span>合同额: {proj.contractAmount}万元</span>
                            <span className={`px-2 py-0.5 rounded ${
                              proj.status === '已完成' ? 'bg-green-100 text-green-700' :
                              proj.status === '交付期' ? 'bg-blue-100 text-blue-700' :
                              proj.status === '制造期' ? 'bg-yellow-100 text-yellow-700' :
                              proj.status === '准备期' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {proj.status}
                            </span>
                          </div>
                          {proj.owner && (
                            <div className="text-xs text-gray-500 mt-1">
                              负责人: {proj.owner}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                已选择 {selectedProjectIds.length} 个项目
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowProjectModal(false);
                    setSelectedProjectIds([]);
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmProjects}
                  disabled={selectedProjectIds.length === 0}
                >
                  确认选择
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMeetingModal;
