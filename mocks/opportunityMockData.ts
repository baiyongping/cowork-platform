// Mock数据 - 用于UI演示和离线开发

export const mockOpportunity = {
  _id: 'mock-opportunity-001',
  name: '拓展中国石油天然气销售渠道商机',
  customer: '中国石油天然气集团公司',
  estimatedAmount: 500000,
  stage: '商务谈判',
  level: '重要',
  probability: 75,
  expectedCloseDate: '2025-06',
  isPublic: true,
  owner: 'mock-user-001',
  ownerName: '张三',
  collaborators: ['mock-user-002', 'mock-user-003'],
  collaboratorNames: ['李四', '王五'],
  team: '销售一部',
  description: `客户对防护服的质量要求较高，需要提供样品测试。

已安排下周二进行样品演示，届时将展示我们最新的防护服产品线。

重点关注:
1. 产品质量认证文件准备
2. 价格方案优化
3. 交付周期承诺

下一步行动:
- 准备产品样品 (3套)
- 制作演示PPT
- 邀请技术专家参与讲解`,
  requirements: [
    {
      _id: 'req-001',
      productModel: '防护服-A型 (标准款)',
      quantity: 1000,
      unitPrice: 50,
      amount: 50000
    },
    {
      _id: 'req-002',
      productModel: '防护服-B型 (加强款)',
      quantity: 500,
      unitPrice: 80,
      amount: 40000
    },
    {
      _id: 'req-003',
      productModel: '防护面罩-C型',
      quantity: 800,
      unitPrice: 30,
      amount: 24000
    }
  ],
  createdAt: new Date('2025-11-15T08:30:00'),
  updatedAt: new Date('2025-12-10T15:45:00'),
  createdBy: 'mock-user-001',
  projectId: null
};

export const mockOpportunityStages = [
  '跟进线索',
  '方案咨询',
  '商务谈判',
  '合同评审',
  '成交',
  '取消',
  '失败'
];

export const mockOpportunityLevels = [
  'A级',
  'B级',
  'C级'
];

export const mockFollowUpTasks = [
  {
    _id: 'task-001',
    name: '拜访客户采购部门',
    description: '与采购经理李经理会面,了解采购需求和预算情况',
    status: '已完成',
    progress: 100,
    level: '团队级',
    type: '商机跟进',
    startDate: new Date('2025-12-05'),
    endDate: new Date('2025-12-05'),
    owner: 'mock-user-001',
    ownerName: '张三',
    relatedTo: 'mock-opportunity-001',
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-05')
  },
  {
    _id: 'task-002',
    name: '提交产品报价方案',
    description: '准备详细的产品报价单,包括产品规格、价格、交付周期等',
    status: '进行中',
    progress: 60,
    level: '团队级',
    type: '商机跟进',
    startDate: new Date('2025-12-10'),
    endDate: new Date('2025-12-15'),
    owner: 'mock-user-001',
    ownerName: '张三',
    relatedTo: 'mock-opportunity-001',
    createdAt: new Date('2025-12-08'),
    updatedAt: new Date('2025-12-13')
  },
  {
    _id: 'task-003',
    name: '商务合同谈判',
    description: '与客户法务部门讨论合同条款,确定付款方式和交付条件',
    status: '未开始',
    progress: 0,
    level: '团队级',
    type: '商机跟进',
    startDate: new Date('2025-12-18'),
    endDate: new Date('2025-12-20'),
    owner: 'mock-user-001',
    ownerName: '张三',
    relatedTo: 'mock-opportunity-001',
    createdAt: new Date('2025-12-10'),
    updatedAt: new Date('2025-12-10')
  }
];

// 多个商机Mock数据 (用于列表展示)
export const mockOpportunities = [
  mockOpportunity,
  {
    _id: 'mock-opportunity-002',
    name: '中国石化防护装备采购项目',
    customer: '中国石化集团',
    estimatedAmount: 800000,
    stage: '方案咨询',
    level: '重要',
    probability: 60,
    expectedCloseDate: '2025-07',
    isPublic: true,
    owner: 'mock-user-002',
    ownerName: '李四',
    collaboratorNames: ['张三'],
    description: '大型防护装备采购项目,需要提供全套解决方案',
    requirements: [],
    createdAt: new Date('2025-11-20'),
    updatedAt: new Date('2025-12-08'),
    projectId: null
  },
  {
    _id: 'mock-opportunity-003',
    name: '华润医药防护用品供应商机',
    customer: '华润医药有限公司',
    estimatedAmount: 350000,
    stage: '跟进线索',
    level: '一般',
    probability: 40,
    expectedCloseDate: '2025-08',
    isPublic: false,
    owner: 'mock-user-003',
    ownerName: '王五',
    collaboratorNames: [],
    description: '医药行业防护用品供应商机,竞争激烈',
    requirements: [],
    createdAt: new Date('2025-11-25'),
    updatedAt: new Date('2025-12-05'),
    projectId: null
  },
  {
    _id: 'mock-opportunity-004',
    name: '万科集团建筑工地防护装备项目',
    customer: '万科集团',
    estimatedAmount: 1200000,
    stage: '成交',
    level: '重要',
    probability: 100,
    expectedCloseDate: '2025-05',
    isPublic: true,
    owner: 'mock-user-001',
    ownerName: '张三',
    collaboratorNames: ['李四', '王五'],
    description: '已成交的大型项目,正在准备合同签署',
    requirements: [],
    createdAt: new Date('2025-10-15'),
    updatedAt: new Date('2025-12-01'),
    projectId: 'mock-project-001'
  }
];

// 用户Mock数据
export const mockUsers = [
  {
    _id: 'mock-user-001',
    username: 'zhangsan',
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'admin',
    department: '销售部',
    approvalStatus: 'approved'
  },
  {
    _id: 'mock-user-002',
    username: 'lisi',
    name: '李四',
    email: 'lisi@example.com',
    role: '', // v2.2.0: 不再使用user角色
    roles: [], // v2.2.0: Mock用户无角色
    department: '销售部',
    approvalStatus: 'approved'
  },
  {
    _id: 'mock-user-003',
    username: 'wangwu',
    name: '王五',
    email: 'wangwu@example.com',
    role: '', // v2.2.0: 不再使用user角色
    roles: [], // v2.2.0: Mock用户无角色
    department: '销售部',
    approvalStatus: 'approved'
  }
];

// 当前登录用户
export const mockCurrentUser = mockUsers[0];

// 导出所有Mock数据
export default {
  opportunity: mockOpportunity,
  opportunities: mockOpportunities,
  stages: mockOpportunityStages,
  levels: mockOpportunityLevels,
  followUpTasks: mockFollowUpTasks,
  users: mockUsers,
  currentUser: mockCurrentUser
};
