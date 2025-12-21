-- ============================================
-- 权限系统数据库Schema扩展
-- Version: v2.1.0
-- Date: 2025-12-15
-- ============================================

-- 1. 扩展 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS isExecutive BOOLEAN DEFAULT FALSE COMMENT '是否为高管';
ALTER TABLE users ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT '' COMMENT '所属团队';

-- 2. 扩展 tasks 表
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT '' COMMENT '所属团队';

-- 3. 扩展 opportunities 表
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT '' COMMENT '所属团队';

-- 4. 扩展 projects 表
ALTER TABLE projects ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT '' COMMENT '所属团队';

-- 5. 创建 role_permissions 表
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleId VARCHAR(50) NOT NULL UNIQUE COMMENT '角色ID',
  roleName VARCHAR(100) NOT NULL COMMENT '角色名称',
  permissions JSON NOT NULL COMMENT '权限配置JSON',
  description TEXT COMMENT '角色描述',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_roleId (roleId)
) COMMENT='角色权限表';

-- 6. 创建目标管理相关表

-- 6.1 销售目标表
CREATE TABLE IF NOT EXISTS sales_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goalName VARCHAR(200) NOT NULL COMMENT '目标名称',
  targetAmount DECIMAL(15,2) NOT NULL COMMENT '目标金额',
  currentAmount DECIMAL(15,2) DEFAULT 0 COMMENT '当前完成金额',
  progress INT DEFAULT 0 COMMENT '完成进度(%)',
  startDate DATE NOT NULL COMMENT '开始日期',
  endDate DATE NOT NULL COMMENT '结束日期',
  status ENUM('进行中', '已完成', '延期', '取消') DEFAULT '进行中',
  ownerId INT NOT NULL COMMENT '负责人ID',
  team VARCHAR(100) DEFAULT '' COMMENT '所属团队',
  level ENUM('公司级', '团队级', '个人级') NOT NULL,
  description TEXT COMMENT '目标描述',
  isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑',
  createdBy INT NOT NULL COMMENT '创建人ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_owner (ownerId),
  INDEX idx_team (team),
  INDEX idx_level (level),
  INDEX idx_status (status)
) COMMENT='销售目标表';

-- 6.2 商机目标表
CREATE TABLE IF NOT EXISTS opportunity_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goalName VARCHAR(200) NOT NULL COMMENT '目标名称',
  targetCount INT NOT NULL COMMENT '目标数量',
  currentCount INT DEFAULT 0 COMMENT '当前完成数量',
  progress INT DEFAULT 0 COMMENT '完成进度(%)',
  startDate DATE NOT NULL COMMENT '开始日期',
  endDate DATE NOT NULL COMMENT '结束日期',
  status ENUM('进行中', '已完成', '延期', '取消') DEFAULT '进行中',
  ownerId INT NOT NULL COMMENT '负责人ID',
  team VARCHAR(100) DEFAULT '' COMMENT '所属团队',
  level ENUM('公司级', '团队级', '个人级') NOT NULL,
  description TEXT COMMENT '目标描述',
  isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑',
  createdBy INT NOT NULL COMMENT '创建人ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_owner (ownerId),
  INDEX idx_team (team),
  INDEX idx_level (level),
  INDEX idx_status (status)
) COMMENT='商机目标表';

-- 6.3 经营策略表
CREATE TABLE IF NOT EXISTS business_strategies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategyName VARCHAR(200) NOT NULL COMMENT '策略名称',
  strategyType ENUM('市场拓展', '产品创新', '成本控制', '团队建设', '其他') NOT NULL,
  priority ENUM('高', '中', '低') DEFAULT '中',
  status ENUM('规划中', '执行中', '已完成', '暂停', '取消') DEFAULT '规划中',
  startDate DATE NOT NULL COMMENT '开始日期',
  endDate DATE NOT NULL COMMENT '结束日期',
  ownerId INT NOT NULL COMMENT '负责人ID',
  team VARCHAR(100) DEFAULT '' COMMENT '所属团队',
  level ENUM('公司级', '团队级', '个人级') NOT NULL,
  description TEXT COMMENT '策略描述',
  expectedResult TEXT COMMENT '预期结果',
  actualResult TEXT COMMENT '实际结果',
  isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑',
  createdBy INT NOT NULL COMMENT '创建人ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_owner (ownerId),
  INDEX idx_team (team),
  INDEX idx_level (level),
  INDEX idx_status (status)
) COMMENT='经营策略表';

-- 6.4 执行力地图表
CREATE TABLE IF NOT EXISTS execution_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskName VARCHAR(200) NOT NULL COMMENT '任务名称',
  taskType ENUM('战略任务', '运营任务', '项目任务', '日常任务') NOT NULL,
  priority ENUM('高', '中', '低') DEFAULT '中',
  status ENUM('未开始', '进行中', '已完成', '延期', '取消') DEFAULT '未开始',
  progress INT DEFAULT 0 COMMENT '完成进度(%)',
  startDate DATE NOT NULL COMMENT '开始日期',
  endDate DATE NOT NULL COMMENT '结束日期',
  ownerId INT NOT NULL COMMENT '负责人ID',
  team VARCHAR(100) DEFAULT '' COMMENT '所属团队',
  level ENUM('公司级', '团队级', '个人级') NOT NULL,
  relatedStrategyId INT COMMENT '关联策略ID',
  description TEXT COMMENT '任务描述',
  isEditLocked BOOLEAN DEFAULT FALSE COMMENT '是否禁止编辑',
  createdBy INT NOT NULL COMMENT '创建人ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_owner (ownerId),
  INDEX idx_team (team),
  INDEX idx_level (level),
  INDEX idx_status (status),
  FOREIGN KEY (relatedStrategyId) REFERENCES business_strategies(id) ON DELETE SET NULL
) COMMENT='执行力地图表';
