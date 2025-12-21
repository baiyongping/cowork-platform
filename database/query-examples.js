/**
 * MongoDB 常用查询示例
 * 际华定制协同办公管理平台
 */

const { ObjectId } = require('mongodb');

// ============================================
// 用户相关查询
// ============================================

/**
 * 根据用户名查询用户
 */
async function findUserByUsername(db, username) {
  return await db.collection('users').findOne(
    { username: username },
    { projection: { password: 0 } } // 排除密码字段
  );
}

/**
 * 查询部门的所有成员
 */
async function findDepartmentMembers(db, departmentId) {
  return await db.collection('users').find({
    departmentId: new ObjectId(departmentId),
    status: '在职',
    isActive: true
  }).toArray();
}

/**
 * 查询具有某个角色的所有用户
 */
async function findUsersByRole(db, roleCode) {
  const role = await db.collection('roles').findOne({ code: roleCode });
  if (!role) return [];
  
  return await db.collection('users').find({
    roleIds: role._id
  }).toArray();
}

// ============================================
// 任务相关查询
// ============================================

/**
 * 查询用户的待办任务
 */
async function findUserPendingTasks(db, userId) {
  return await db.collection('tasks').find({
    $or: [
      { ownerId: new ObjectId(userId) },
      { collaboratorIds: new ObjectId(userId) }
    ],
    status: { $in: ['未开始', '进行中'] },
    deletedAt: null
  })
  .sort({ endDate: 1 })
  .toArray();
}

/**
 * 查询即将逾期的任务（3天内）
 */
async function findUpcomingDeadlineTasks(db, userId) {
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  
  return await db.collection('tasks').find({
    ownerId: new ObjectId(userId),
    status: { $in: ['未开始', '进行中'] },
    endDate: { $lte: threeDaysLater },
    deletedAt: null
  })
  .sort({ endDate: 1 })
  .toArray();
}

/**
 * 统计任务完成情况
 */
async function getTaskStatistics(db, userId) {
  return await db.collection('tasks').aggregate([
    {
      $match: {
        ownerId: new ObjectId(userId),
        deletedAt: null
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]).toArray();
}

/**
 * 查询关联商机的任务
 */
async function findTasksByOpportunity(db, opportunityId) {
  return await db.collection('tasks').find({
    opportunityId: new ObjectId(opportunityId),
    type: '商机跟进',
    deletedAt: null
  })
  .sort({ createdAt: -1 })
  .toArray();
}

// ============================================
// 商机相关查询
// ============================================

/**
 * 查询用户负责的商机
 */
async function findUserOpportunities(db, userId, stage = null) {
  const query = {
    salesManagerId: new ObjectId(userId),
    status: '进行中',
    deletedAt: null
  };
  
  if (stage) {
    query.stage = stage;
  }
  
  return await db.collection('opportunities').find(query)
    .sort({ expectedCloseDate: 1 })
    .toArray();
}

/**
 * 商机漏斗统计
 */
async function getOpportunityFunnelStats(db, userIds = null) {
  const matchStage = {
    status: '进行中',
    deletedAt: null
  };
  
  if (userIds) {
    matchStage.salesManagerId = { $in: userIds.map(id => new ObjectId(id)) };
  }
  
  return await db.collection('opportunities').aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalAmount: { $sum: '$expectedRevenue' },
        avgProbability: { $avg: '$probability' }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();
}

/**
 * 查询即将到期的商机（预计成交日期在30天内）
 */
async function findUpcomingOpportunities(db, userId) {
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  
  return await db.collection('opportunities').find({
    salesManagerId: new ObjectId(userId),
    status: '进行中',
    expectedCloseDate: { $lte: thirtyDaysLater },
    deletedAt: null
  })
  .sort({ expectedCloseDate: 1 })
  .toArray();
}

/**
 * 商机转化率统计
 */
async function getOpportunityConversionRate(db, startDate, endDate) {
  return await db.collection('opportunities').aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        converted: {
          $sum: { $cond: ['$isConverted', 1, 0] }
        },
        failed: {
          $sum: { $cond: ['$isFailed', 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        converted: 1,
        failed: 1,
        conversionRate: {
          $multiply: [
            { $divide: ['$converted', '$total'] },
            100
          ]
        }
      }
    }
  ]).toArray();
}

// ============================================
// 项目相关查询
// ============================================

/**
 * 查询用户负责的项目
 */
async function findUserProjects(db, userId, status = null) {
  const query = {
    managerId: new ObjectId(userId),
    deletedAt: null
  };
  
  if (status) {
    query.status = status;
  }
  
  return await db.collection('projects').find(query)
    .sort({ deliveryDate: 1 })
    .toArray();
}

/**
 * 查询项目详情（包含任务统计）
 */
async function getProjectDetails(db, projectId) {
  const result = await db.collection('projects').aggregate([
    { $match: { _id: new ObjectId(projectId) } },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'projectId',
        as: 'tasks'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'managerId',
        foreignField: '_id',
        as: 'manager'
      }
    },
    {
      $addFields: {
        manager: { $arrayElemAt: ['$manager', 0] },
        taskCount: { $size: '$tasks' },
        completedTaskCount: {
          $size: {
            $filter: {
              input: '$tasks',
              cond: { $eq: ['$$this.status', '已完成'] }
            }
          }
        }
      }
    },
    {
      $project: {
        'manager.password': 0,
        'tasks.description': 0
      }
    }
  ]).toArray();
  
  return result[0];
}

/**
 * 项目阶段统计
 */
async function getProjectStageStatistics(db) {
  return await db.collection('projects').aggregate([
    {
      $match: {
        status: { $nin: ['已完成', '暂停'] },
        deletedAt: null
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]).toArray();
}

// ============================================
// 目标相关查询
// ============================================

/**
 * 查询年度目标
 */
async function getAnnualGoals(db, year, type = null) {
  const query = { year: year };
  if (type) {
    query.type = type;
  }
  
  return await db.collection('goals').find(query).toArray();
}

/**
 * 查询季度目标
 */
async function getQuarterlyGoals(db, year, quarter) {
  return await db.collection('goals').findOne({
    year: year,
    quarter: quarter
  });
}

/**
 * 更新目标实际完成值
 */
async function updateGoalActual(db, goalId, actualData) {
  return await db.collection('goals').updateOne(
    { _id: new ObjectId(goalId) },
    {
      $set: {
        ...actualData,
        updatedAt: new Date()
      }
    }
  );
}

// ============================================
// 策略与措施查询
// ============================================

/**
 * 查询年度策略
 */
async function getAnnualStrategies(db, year) {
  return await db.collection('strategies').find({ year: year })
    .sort({ weight: -1 })
    .toArray();
}

/**
 * 查询季度措施（带策略信息）
 */
async function getQuarterlyMeasures(db, year, quarter) {
  return await db.collection('measures').aggregate([
    {
      $match: { year: year, quarter: quarter }
    },
    {
      $lookup: {
        from: 'strategies',
        localField: 'strategyId',
        foreignField: '_id',
        as: 'strategy'
      }
    },
    {
      $addFields: {
        strategy: { $arrayElemAt: ['$strategy', 0] }
      }
    }
  ]).toArray();
}

// ============================================
// 评论相关查询
// ============================================

/**
 * 查询对象的评论列表
 */
async function getComments(db, targetId, targetType) {
  return await db.collection('comments').find({
    targetId: new ObjectId(targetId),
    targetType: targetType,
    deletedAt: null
  })
  .sort({ createdAt: -1 })
  .toArray();
}

/**
 * 添加评论
 */
async function addComment(db, commentData) {
  const result = await db.collection('comments').insertOne({
    ...commentData,
    likeCount: 0,
    likedBy: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // 更新目标对象的评论数
  await db.collection(getCollectionName(commentData.targetType)).updateOne(
    { _id: new ObjectId(commentData.targetId) },
    { $inc: { commentCount: 1 } }
  );
  
  return result;
}

// ============================================
// 通知相关查询
// ============================================

/**
 * 查询用户未读通知
 */
async function getUnreadNotifications(db, userId, limit = 20) {
  return await db.collection('notifications').find({
    userId: new ObjectId(userId),
    isRead: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .toArray();
}

/**
 * 标记通知为已读
 */
async function markNotificationAsRead(db, notificationId) {
  return await db.collection('notifications').updateOne(
    { _id: new ObjectId(notificationId) },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
}

/**
 * 创建通知
 */
async function createNotification(db, notificationData) {
  return await db.collection('notifications').insertOne({
    ...notificationData,
    isRead: false,
    createdAt: new Date()
  });
}

// ============================================
// 操作日志查询
// ============================================

/**
 * 查询操作日志
 */
async function getOperationLogs(db, filters = {}, page = 1, pageSize = 50) {
  const query = {};
  
  if (filters.userId) {
    query.userId = new ObjectId(filters.userId);
  }
  if (filters.module) {
    query.module = filters.module;
  }
  if (filters.action) {
    query.action = filters.action;
  }
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: filters.startDate,
      $lte: filters.endDate
    };
  }
  
  const total = await db.collection('operation_logs').countDocuments(query);
  const logs = await db.collection('operation_logs')
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  
  return {
    total,
    page,
    pageSize,
    logs
  };
}

/**
 * 记录操作日志
 */
async function logOperation(db, logData) {
  return await db.collection('operation_logs').insertOne({
    ...logData,
    createdAt: new Date()
  });
}

// ============================================
// 系统配置查询
// ============================================

/**
 * 获取系统配置
 */
async function getSystemConfig(db, key) {
  const config = await db.collection('system_configs').findOne({ key: key });
  return config ? config.value : null;
}

/**
 * 更新系统配置
 */
async function updateSystemConfig(db, key, value) {
  return await db.collection('system_configs').updateOne(
    { key: key },
    {
      $set: {
        value: value,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * 获取分类配置
 */
async function getConfigsByCategory(db, category) {
  return await db.collection('system_configs')
    .find({ category: category })
    .sort({ sort: 1 })
    .toArray();
}

// ============================================
// 辅助函数
// ============================================

function getCollectionName(targetType) {
  const mapping = {
    'task': 'tasks',
    'opportunity': 'opportunities',
    'project': 'projects',
    'goal': 'goals'
  };
  return mapping[targetType] || targetType + 's';
}

// ============================================
// 导出函数
// ============================================

module.exports = {
  // 用户
  findUserByUsername,
  findDepartmentMembers,
  findUsersByRole,
  
  // 任务
  findUserPendingTasks,
  findUpcomingDeadlineTasks,
  getTaskStatistics,
  findTasksByOpportunity,
  
  // 商机
  findUserOpportunities,
  getOpportunityFunnelStats,
  findUpcomingOpportunities,
  getOpportunityConversionRate,
  
  // 项目
  findUserProjects,
  getProjectDetails,
  getProjectStageStatistics,
  
  // 目标
  getAnnualGoals,
  getQuarterlyGoals,
  updateGoalActual,
  
  // 策略措施
  getAnnualStrategies,
  getQuarterlyMeasures,
  
  // 评论
  getComments,
  addComment,
  
  // 通知
  getUnreadNotifications,
  markNotificationAsRead,
  createNotification,
  
  // 日志
  getOperationLogs,
  logOperation,
  
  // 配置
  getSystemConfig,
  updateSystemConfig,
  getConfigsByCategory
};
