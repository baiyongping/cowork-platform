// 云函数：成果目标管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  console.log('🎯 成果目标管理 - 操作:', action, '数据:', data);

  try {
    switch (action) {
      case 'calculateCompletion':
        return await calculateCompletion(data, wxContext);
      case 'recalculateAll':
        return await recalculateAll(data, wxContext);
      default:
        throw new Error(`未知操作: ${action}`);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error);
    return {
      success: false,
      code: 'ERROR',
      message: error.message
    };
  }
};

// 计算单个成果目标的完成度（基于关联的成果任务）
async function calculateCompletion(data, wxContext) {
  const { outcomeGoalId } = data;

  if (!outcomeGoalId) {
    throw new Error('缺少成果目标ID');
  }

  console.log('📊 计算成果目标完成度:', outcomeGoalId);

  // 查询关联的成果任务
  const tasksResult = await db.collection('tasks')
    .where({
      type: '成果任务',
      relatedTo: outcomeGoalId,
      isDeleted: _.neq(true)
    })
    .get();

  const tasks = tasksResult.data || [];

  console.log('📦 找到关联任务数量:', tasks.length);

  // 如果没有关联任务，完成度为0
  if (tasks.length === 0) {
    await db.collection('outcome_goals')
      .doc(outcomeGoalId)
      .update({
        data: {
          progress: 0,
          linkedTaskCount: 0,
          updatedAt: new Date()
        }
      });

    console.log('✅ 成果目标完成度已更新为 0% (无关联任务)');

    return {
      success: true,
      code: 'SUCCESS',
      data: { 
        progress: 0,
        linkedTaskCount: 0
      }
    };
  }

  // 计算平均完成度
  const totalProgress = tasks.reduce((sum, task) => {
    return sum + (task.progress || 0);
  }, 0);

  const progress = Math.round(totalProgress / tasks.length);

  console.log('📊 计算结果:', {
    任务数量: tasks.length,
    总进度: totalProgress,
    平均进度: progress
  });

  // 更新成果目标完成度
  await db.collection('outcome_goals')
    .doc(outcomeGoalId)
    .update({
      data: {
        progress,
        linkedTaskCount: tasks.length,
        updatedAt: new Date()
      }
    });

  console.log(`✅ 成果目标完成度已更新为 ${progress}%`);

  return {
    success: true,
    code: 'SUCCESS',
    data: { 
      progress,
      linkedTaskCount: tasks.length
    }
  };
}

// 重新计算所有成果目标的完成度
async function recalculateAll(data, wxContext) {
  const { year } = data;

  if (!year) {
    throw new Error('缺少年份参数');
  }

  console.log('🔄 重新计算所有成果目标完成度 - 年份:', year);

  // 查询所有成果目标
  const outcomeGoalsResult = await db.collection('outcome_goals')
    .where({ year })
    .get();

  const outcomeGoals = outcomeGoalsResult.data || [];

  console.log('📦 找到成果目标数量:', outcomeGoals.length);

  // 逐个计算
  const results = [];
  for (const goal of outcomeGoals) {
    try {
      const result = await calculateCompletion({ outcomeGoalId: goal._id }, wxContext);
      results.push({
        id: goal._id,
        content: goal.content,
        success: result.success,
        progress: result.data?.progress || 0
      });
    } catch (error) {
      console.error(`❌ 计算成果目标 ${goal._id} 失败:`, error);
      results.push({
        id: goal._id,
        content: goal.content,
        success: false,
        error: error.message
      });
    }
  }

  console.log('✅ 批量计算完成:', results);

  return {
    success: true,
    code: 'SUCCESS',
    data: {
      total: outcomeGoals.length,
      results
    }
  };
}
