/**
 * 批量更新集合字段云函数
 * Version: v2.1.1
 * Date: 2025-12-15
 * 用途: 为users/tasks/opportunities/projects集合批量添加缺失字段
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'all' } = event;
  
  console.log('开始批量更新集合字段...');
  const results = [];
  
  try {
    // 1. 更新 users 集合
    if (action === 'all' || action === 'users') {
      console.log('正在更新 users 集合...');
      const usersResult = await db.collection('users')
        .where({
          _: _.or([
            { isExecutive: _.exists(false) },
            { team: _.exists(false) }
          ])
        })
        .update({
          data: {
            isExecutive: false,
            team: ''
          }
        });
      
      results.push({
        collection: 'users',
        updated: usersResult.stats.updated,
        message: `users集合更新成功, 影响 ${usersResult.stats.updated} 条记录`
      });
      console.log(`users集合更新完成: ${usersResult.stats.updated} 条`);
    }
    
    // 2. 更新 tasks 集合
    if (action === 'all' || action === 'tasks') {
      console.log('正在更新 tasks 集合...');
      const tasksResult = await db.collection('tasks')
        .where({
          _: _.or([
            { isEditLocked: _.exists(false) },
            { team: _.exists(false) }
          ])
        })
        .update({
          data: {
            isEditLocked: false,
            team: ''
          }
        });
      
      results.push({
        collection: 'tasks',
        updated: tasksResult.stats.updated,
        message: `tasks集合更新成功, 影响 ${tasksResult.stats.updated} 条记录`
      });
      console.log(`tasks集合更新完成: ${tasksResult.stats.updated} 条`);
    }
    
    // 3. 更新 opportunities 集合
    if (action === 'all' || action === 'opportunities') {
      console.log('正在更新 opportunities 集合...');
      const opportunitiesResult = await db.collection('opportunities')
        .where({
          _: _.or([
            { isEditLocked: _.exists(false) },
            { team: _.exists(false) }
          ])
        })
        .update({
          data: {
            isEditLocked: false,
            team: ''
          }
        });
      
      results.push({
        collection: 'opportunities',
        updated: opportunitiesResult.stats.updated,
        message: `opportunities集合更新成功, 影响 ${opportunitiesResult.stats.updated} 条记录`
      });
      console.log(`opportunities集合更新完成: ${opportunitiesResult.stats.updated} 条`);
    }
    
    // 4. 更新 projects 集合
    if (action === 'all' || action === 'projects') {
      console.log('正在更新 projects 集合...');
      const projectsResult = await db.collection('projects')
        .where({
          _: _.or([
            { isEditLocked: _.exists(false) },
            { team: _.exists(false) }
          ])
        })
        .update({
          data: {
            isEditLocked: false,
            team: ''
          }
        });
      
      results.push({
        collection: 'projects',
        updated: projectsResult.stats.updated,
        message: `projects集合更新成功, 影响 ${projectsResult.stats.updated} 条记录`
      });
      console.log(`projects集合更新完成: ${projectsResult.stats.updated} 条`);
    }
    
    console.log('批量更新完成:', results);
    
    return {
      success: true,
      results,
      summary: `成功更新 ${results.length} 个集合, 共影响 ${results.reduce((sum, r) => sum + r.updated, 0)} 条记录`
    };
    
  } catch (error) {
    console.error('批量更新失败:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
};
