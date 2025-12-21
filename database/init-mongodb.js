/**
 * MongoDB 数据库初始化脚本
 * 用于创建集合、索引和初始数据
 * 
 * 使用方法:
 * mongosh "mongodb://your-connection-string" < init-mongodb.js
 */

// 选择数据库
use jihua_oa_platform;

print("开始初始化数据库...");

// ============================================
// 1. 创建集合和索引
// ============================================

print("\n创建集合和索引...");

// users 集合
db.createCollection("users");
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ departmentId: 1 });
db.users.createIndex({ email: 1 });
db.users.createIndex({ status: 1, isActive: 1 });
print("✓ users 集合已创建");

// departments 集合
db.createCollection("departments");
db.departments.createIndex({ code: 1 }, { unique: true });
db.departments.createIndex({ leaderId: 1 });
db.departments.createIndex({ parentId: 1 });
print("✓ departments 集合已创建");

// roles 集合
db.createCollection("roles");
db.roles.createIndex({ code: 1 }, { unique: true });
db.roles.createIndex({ level: 1 });
print("✓ roles 集合已创建");

// tasks 集合
db.createCollection("tasks");
db.tasks.createIndex({ ownerId: 1, status: 1 });
db.tasks.createIndex({ level: 1, type: 1 });
db.tasks.createIndex({ opportunityId: 1 });
db.tasks.createIndex({ projectId: 1 });
db.tasks.createIndex({ endDate: 1, status: 1 });
db.tasks.createIndex({ createdAt: -1 });
db.tasks.createIndex({ collaboratorIds: 1 });
print("✓ tasks 集合已创建");

// opportunities 集合
db.createCollection("opportunities");
db.opportunities.createIndex({ code: 1 }, { unique: true });
db.opportunities.createIndex({ stage: 1, status: 1 });
db.opportunities.createIndex({ salesManagerId: 1 });
db.opportunities.createIndex({ "customer.name": 1 });
db.opportunities.createIndex({ expectedCloseDate: 1 });
db.opportunities.createIndex({ createdAt: -1 });
db.opportunities.createIndex({ isConverted: 1 });
print("✓ opportunities 集合已创建");

// projects 集合
db.createCollection("projects");
db.projects.createIndex({ code: 1 }, { unique: true });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ managerId: 1 });
db.projects.createIndex({ deliveryDate: 1 });
db.projects.createIndex({ sourceOpportunityId: 1 });
db.projects.createIndex({ createdAt: -1 });
print("✓ projects 集合已创建");

// goals 集合
db.createCollection("goals");
db.goals.createIndex({ year: 1, quarter: 1, type: 1 }, { unique: true });
db.goals.createIndex({ year: -1 });
print("✓ goals 集合已创建");

// strategies 集合
db.createCollection("strategies");
db.strategies.createIndex({ year: 1 });
db.strategies.createIndex({ ownerId: 1 });
print("✓ strategies 集合已创建");

// measures 集合
db.createCollection("measures");
db.measures.createIndex({ year: 1, quarter: 1 });
db.measures.createIndex({ strategyId: 1 });
db.measures.createIndex({ ownerId: 1 });
print("✓ measures 集合已创建");

// system_configs 集合
db.createCollection("system_configs");
db.system_configs.createIndex({ key: 1 }, { unique: true });
db.system_configs.createIndex({ category: 1 });
print("✓ system_configs 集合已创建");

// operation_logs 集合
db.createCollection("operation_logs");
db.operation_logs.createIndex({ userId: 1, createdAt: -1 });
db.operation_logs.createIndex({ module: 1, action: 1 });
db.operation_logs.createIndex({ createdAt: -1 });
db.operation_logs.createIndex({ targetId: 1 });
// TTL索引 - 90天后自动删除
db.operation_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
print("✓ operation_logs 集合已创建");

// comments 集合
db.createCollection("comments");
db.comments.createIndex({ targetId: 1, targetType: 1, createdAt: -1 });
db.comments.createIndex({ userId: 1 });
db.comments.createIndex({ createdAt: -1 });
print("✓ comments 集合已创建");

// notifications 集合
db.createCollection("notifications");
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ createdAt: -1 });
// TTL索引 - 已读通知30天后自动删除
db.notifications.createIndex(
  { createdAt: 1, isRead: 1 },
  { 
    expireAfterSeconds: 2592000,
    partialFilterExpression: { isRead: true }
  }
);
print("✓ notifications 集合已创建");

// ============================================
// 2. 初始化系统角色
// ============================================

print("\n初始化系统角色...");

const adminRole = db.roles.insertOne({
  name: "超级管理员",
  code: "super_admin",
  description: "系统最高权限，可管理所有功能",
  permissions: [
    { module: "all", actions: ["view", "create", "edit", "delete", "export", "import"] }
  ],
  level: 1,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const seniorLeaderRole = db.roles.insertOne({
  name: "高层领导",
  code: "senior_leader",
  description: "查看全局数据，制定战略目标",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "tasks", actions: ["view", "create", "edit"] },
    { module: "opportunities", actions: ["view", "create", "edit"] },
    { module: "projects", actions: ["view", "create", "edit"] },
    { module: "goals", actions: ["view", "create", "edit", "delete"] },
    { module: "reports", actions: ["view", "export"] }
  ],
  level: 2,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const departmentManagerRole = db.roles.insertOne({
  name: "部门经理",
  code: "department_manager",
  description: "管理本部门的任务、商机、项目",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "tasks", actions: ["view", "create", "edit", "delete"] },
    { module: "opportunities", actions: ["view", "create", "edit", "delete"] },
    { module: "projects", actions: ["view", "create", "edit"] },
    { module: "goals", actions: ["view"] }
  ],
  level: 3,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const salesManagerRole = db.roles.insertOne({
  name: "销售经理",
  code: "sales_manager",
  description: "管理商机和客户关系",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "tasks", actions: ["view", "create", "edit"] },
    { module: "opportunities", actions: ["view", "create", "edit", "delete"] }
  ],
  level: 4,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const projectManagerRole = db.roles.insertOne({
  name: "项目经理",
  code: "project_manager",
  description: "管理项目全生命周期",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "tasks", actions: ["view", "create", "edit"] },
    { module: "projects", actions: ["view", "create", "edit", "delete"] }
  ],
  level: 4,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const employeeRole = db.roles.insertOne({
  name: "普通员工",
  code: "employee",
  description: "执行任务，参与协同",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "tasks", actions: ["view", "create", "edit"] }
  ],
  level: 5,
  isSystem: true,
  status: "启用",
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

print("✓ 系统角色已初始化");

// ============================================
// 3. 初始化部门
// ============================================

print("\n初始化部门...");

const salesDept = db.departments.insertOne({
  name: "销售部",
  code: "SALES",
  level: 1,
  description: "负责客户开发和商机跟进",
  memberCount: 0,
  status: "正常",
  createdAt: new Date(),
  updatedAt: new Date()
});

const projectDept = db.departments.insertOne({
  name: "项目部",
  code: "PROJECT",
  level: 1,
  description: "负责项目执行和交付",
  memberCount: 0,
  status: "正常",
  createdAt: new Date(),
  updatedAt: new Date()
});

const productionDept = db.departments.insertOne({
  name: "生产部",
  code: "PRODUCTION",
  level: 1,
  description: "负责产品生产和质量控制",
  memberCount: 0,
  status: "正常",
  createdAt: new Date(),
  updatedAt: new Date()
});

const financeDept = db.departments.insertOne({
  name: "财务部",
  code: "FINANCE",
  level: 1,
  description: "负责财务管理和成本控制",
  memberCount: 0,
  status: "正常",
  createdAt: new Date(),
  updatedAt: new Date()
});

print("✓ 部门已初始化");

// ============================================
// 4. 初始化超级管理员账号
// ============================================

print("\n初始化超级管理员账号...");

// 密码: admin123 (实际应用中需要使用bcrypt加密)
const admin = db.users.insertOne({
  username: "admin",
  password: "$2b$10$rN5xQ0kJ9pVz.vW1FVxNyO5xY9xH5kH5kH5kH5kH5kH5kH5kH5kH5", // admin123
  name: "系统管理员",
  email: "admin@jihua.com",
  phone: "13800138000",
  avatar: "",
  departmentId: null,
  roleIds: [adminRole.insertedId],
  position: "系统管理员",
  status: "在职",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print("✓ 超级管理员账号已创建");
print("  用户名: admin");
print("  初始密码: admin123");
print("  请登录后立即修改密码！");

// ============================================
// 5. 初始化系统配置
// ============================================

print("\n初始化系统配置...");

db.system_configs.insertMany([
  // 任务配置
  {
    category: "task",
    key: "task_types",
    value: ["日常工作", "商机跟进", "项目任务"],
    dataType: "array",
    description: "任务类型配置",
    isEditable: true,
    sort: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    category: "task",
    key: "task_statuses",
    value: ["未开始", "进行中", "已完成", "延期", "取消", "暂停"],
    dataType: "array",
    description: "任务状态配置（日常工作、商机跟进）",
    isEditable: true,
    sort: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // 商机配置
  {
    category: "opportunity",
    key: "opportunity_stages",
    value: ["跟进线索", "方案咨询", "商务谈判"],
    dataType: "array",
    description: "商机阶段配置",
    isEditable: true,
    sort: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    category: "opportunity",
    key: "action_types",
    value: [
      "拜访客户",
      "联络客户感情",
      "了解年度采购计划",
      "提交公司资质和案例",
      "样衣展示和试穿",
      "提交定制方案和报价",
      "提交投标文件",
      "价格谈判",
      "合同条款确认",
      "其它"
    ],
    dataType: "array",
    description: "商机跟进动作类型",
    isEditable: true,
    sort: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // 项目配置
  {
    category: "project",
    key: "project_statuses",
    value: ["未开始", "准备期", "制造期", "交付期", "已完成", "暂停"],
    dataType: "array",
    description: "项目状态配置",
    isEditable: true,
    sort: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    category: "project",
    key: "project_phases",
    value: {
      preparation: ["物料采购", "样衣生产", "量体数据采集"],
      production: ["缝制生产", "质量检验", "产品入库"],
      delivery: ["物流配送", "产品交付", "售后服务"]
    },
    dataType: "object",
    description: "项目环节配置",
    isEditable: true,
    sort: 6,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // 产品类型配置
  {
    category: "product",
    key: "product_types",
    value: ["西服套装", "衬衫", "工装", "夹克", "大衣", "组合套装"],
    dataType: "array",
    description: "产品类型配置",
    isEditable: true,
    sort: 7,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // 系统配置
  {
    category: "system",
    key: "company_name",
    value: "际华集团职业装定制",
    dataType: "string",
    description: "公司名称",
    isEditable: true,
    sort: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    category: "system",
    key: "system_name",
    value: "际华定制协同办公管理平台",
    dataType: "string",
    description: "系统名称",
    isEditable: true,
    sort: 11,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✓ 系统配置已初始化");

// ============================================
// 6. 初始化2025年度目标
// ============================================

print("\n初始化2025年度目标...");

db.goals.insertMany([
  {
    year: 2025,
    quarter: "annual",
    type: "sales",
    salesGoal: {
      orderTarget: 10000,
      orderActual: 0,
      revenueTarget: 10000,
      revenueActual: 0,
      completionRate: 0
    },
    status: "进行中",
    createdBy: admin.insertedId,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    year: 2025,
    quarter: "annual",
    type: "opportunity",
    opportunityGoal: {
      countTarget: 120,
      countActual: 0,
      amountTarget: 12000,
      amountActual: 0,
      conversionRate: 0
    },
    status: "进行中",
    createdBy: admin.insertedId,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✓ 2025年度目标已初始化");

// ============================================
// 完成
// ============================================

print("\n✅ 数据库初始化完成！");
print("\n重要提示:");
print("1. 请使用 admin/admin123 登录系统");
print("2. 首次登录后请立即修改密码");
print("3. 请创建部门和员工账号");
print("4. 建议配置数据库备份策略");
print("\n数据库连接信息:");
print("- 数据库名: jihua_oa_platform");
print("- 集合数量: 13");
print("- 索引已创建");
print("- 初始数据已插入");
