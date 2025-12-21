/**
 * API测试脚本
 * 用于测试所有已开发的API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testTaskId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${message}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// API测试函数
async function testHealthCheck() {
  logSection('1. 健康检查');
  try {
    const response = await axios.get('http://localhost:3000/health');
    logSuccess('健康检查通过');
    logInfo(`状态: ${response.data.status}`);
    logInfo(`环境: ${response.data.environment}`);
    return true;
  } catch (error) {
    logError('健康检查失败: ' + error.message);
    return false;
  }
}

async function testLogin() {
  logSection('2. 用户登录');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.data.token;
    logSuccess('登录成功');
    logInfo(`用户: ${response.data.data.user.name}`);
    logInfo(`职位: ${response.data.data.user.position || '无'}`);
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError('登录失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testGetCurrentUser() {
  logSection('3. 获取当前用户信息');
  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('获取用户信息成功');
    logInfo(`姓名: ${response.data.data.name}`);
    logInfo(`职位: ${response.data.data.position || '无'}`);
    logInfo(`邮箱: ${response.data.data.email || '无'}`);
    return true;
  } catch (error) {
    logError('获取用户信息失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testGetUserList() {
  logSection('4. 获取用户列表');
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 10 }
    });
    
    logSuccess('获取用户列表成功');
    logInfo(`总数: ${response.data.data.pagination.total}`);
    logInfo(`当前页: ${response.data.data.pagination.page}/${response.data.data.pagination.pages}`);
    response.data.data.users.forEach((user, index) => {
      logInfo(`  ${index + 1}. ${user.name} (${user.username}) - ${user.position || '无职位'}`);
    });
    return true;
  } catch (error) {
    logError('获取用户列表失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testCreateTask() {
  logSection('5. 创建任务');
  try {
    const response = await axios.post(`${BASE_URL}/tasks`, {
      title: '测试任务-API自动化测试',
      description: '这是一个通过API测试脚本创建的测试任务',
      type: 'development',
      priority: 'high',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['测试', 'API', '自动化']
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    testTaskId = response.data.data._id;
    logSuccess('创建任务成功');
    logInfo(`任务ID: ${testTaskId}`);
    logInfo(`标题: ${response.data.data.title}`);
    logInfo(`类型: ${response.data.data.type}`);
    logInfo(`优先级: ${response.data.data.priority}`);
    return true;
  } catch (error) {
    logError('创建任务失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testGetTaskList() {
  logSection('6. 获取任务列表');
  try {
    const response = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 10 }
    });
    
    logSuccess('获取任务列表成功');
    logInfo(`总数: ${response.data.data.pagination.total}`);
    response.data.data.tasks.forEach((task, index) => {
      logInfo(`  ${index + 1}. ${task.title} [${task.status}] - ${task.priority}`);
    });
    return true;
  } catch (error) {
    logError('获取任务列表失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testGetTaskDetail() {
  logSection('7. 获取任务详情');
  try {
    const response = await axios.get(`${BASE_URL}/tasks/${testTaskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('获取任务详情成功');
    logInfo(`标题: ${response.data.data.title}`);
    logInfo(`描述: ${response.data.data.description}`);
    logInfo(`状态: ${response.data.data.status}`);
    logInfo(`标签: ${response.data.data.tags ? response.data.data.tags.join(', ') : '无'}`);
    return true;
  } catch (error) {
    logError('获取任务详情失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testUpdateTask() {
  logSection('8. 更新任务');
  try {
    const response = await axios.put(`${BASE_URL}/tasks/${testTaskId}`, {
      status: 'in_progress',
      progress: 50
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('更新任务成功');
    logInfo(`状态: ${response.data.data.status}`);
    logInfo(`进度: ${response.data.data.progress}%`);
    return true;
  } catch (error) {
    logError('更新任务失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testGetMyTasks() {
  logSection('9. 获取我的任务');
  try {
    const response = await axios.get(`${BASE_URL}/tasks/my/pending`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('获取我的待办任务成功');
    logInfo(`待办任务数: ${response.data.data.length}`);
    return true;
  } catch (error) {
    logError('获取我的任务失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testTaskStats() {
  logSection('10. 获取任务统计');
  try {
    const response = await axios.get(`${BASE_URL}/tasks/stats/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('获取任务统计成功');
    logInfo(`总任务数: ${response.data.data.total}`);
    logInfo(`进行中: ${response.data.data.byStatus?.in_progress || 0}`);
    logInfo(`已完成: ${response.data.data.byStatus?.completed || 0}`);
    return true;
  } catch (error) {
    logError('获取任务统计失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testDeleteTask() {
  logSection('11. 删除任务');
  try {
    const response = await axios.delete(`${BASE_URL}/tasks/${testTaskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    logSuccess('删除任务成功');
    logInfo('任务已被软删除');
    return true;
  } catch (error) {
    logError('删除任务失败: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('\n🧪 开始API接口测试...', 'cyan');
  log(`测试时间: ${new Date().toLocaleString('zh-CN')}`, 'cyan');
  
  const tests = [
    testHealthCheck,
    testLogin,
    testGetCurrentUser,
    testGetUserList,
    testCreateTask,
    testGetTaskList,
    testGetTaskDetail,
    testUpdateTask,
    testGetMyTasks,
    testTaskStats,
    testDeleteTask
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
      await delay(500); // 测试间隔
    } catch (error) {
      failed++;
      logError(`测试异常: ${error.message}`);
    }
  }
  
  // 总结
  logSection('测试结果汇总');
  log(`总测试数: ${tests.length}`, 'blue');
  log(`通过: ${passed}`, 'green');
  log(`失败: ${failed}`, 'red');
  log(`成功率: ${((passed / tests.length) * 100).toFixed(2)}%`, 'yellow');
  
  if (failed === 0) {
    log('\n🎉 所有测试通过！', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查错误信息', 'yellow');
  }
}

// 执行测试
runAllTests().catch(error => {
  logError(`测试执行失败: ${error.message}`);
  process.exit(1);
});
