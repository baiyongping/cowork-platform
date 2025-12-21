const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function quickTest() {
  try {
    console.log('\n🧪 快速API测试\n');
    
    // 1. 健康检查
    console.log('1️⃣  健康检查...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ 健康检查通过:', health.data.status);
    
    // 2. 登录
    console.log('\n2️⃣  用户登录...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    console.log('✅ 登录成功');
    console.log('   用户:', loginRes.data.data.user.name);
    console.log('   Token:', token.substring(0, 30) + '...');
    
    // 3. 获取当前用户信息
    console.log('\n3️⃣  获取当前用户信息...');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 获取成功');
    console.log('   ID:', meRes.data.data.id);
    console.log('   姓名:', meRes.data.data.name);
    console.log('   邮箱:', meRes.data.data.email);
    
    // 4. 获取用户列表
    console.log('\n4️⃣  获取用户列表...');
    const usersRes = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 10 }
    });
    console.log('✅ 获取成功');
    console.log('   总用户数:', usersRes.data.data.pagination.total);
    console.log('   用户列表:');
    usersRes.data.data.users.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.name} (@${u.username})`);
    });
    
    // 5. 创建任务
    console.log('\n5️⃣  创建任务...');
    const taskRes = await axios.post(`${BASE_URL}/tasks`, {
      title: '测试任务',
      description: '这是一个测试任务',
      type: 'development',
      priority: 'high',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const taskId = taskRes.data.data._id;
    console.log('✅ 创建成功');
    console.log('   任务ID:', taskId);
    console.log('   标题:', taskRes.data.data.title);
    
    // 6. 获取任务列表
    console.log('\n6️⃣  获取任务列表...');
    const tasksRes = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 获取成功');
    console.log('   总任务数:', tasksRes.data.data.pagination.total);
    
    // 7. 获取任务详情
    console.log('\n7️⃣  获取任务详情...');
    const taskDetailRes = await axios.get(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 获取成功');
    console.log('   标题:', taskDetailRes.data.data.title);
    console.log('   状态:', taskDetailRes.data.data.status);
    
    // 8. 更新任务
    console.log('\n8️⃣  更新任务...');
    const updateRes = await axios.put(`${BASE_URL}/tasks/${taskId}`, {
      status: 'in_progress',
      progress: 50
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 更新成功');
    console.log('   状态:', updateRes.data.data.status);
    console.log('   进度:', updateRes.data.data.progress + '%');
    
    // 9. 任务统计
    console.log('\n9️⃣  获取任务统计...');
    const statsRes = await axios.get(`${BASE_URL}/tasks/statistics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 获取成功');
    console.log('   总任务数:', statsRes.data.data.total);
    
    console.log('\n✅ 所有测试通过！\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error('   错误:', error.response?.data?.message || error.message);
    console.error('   路径:', error.config?.url);
    process.exit(1);
  }
}

quickTest();
