/**
 * 路由总入口
 */

const express = require('express');
const router = express.Router();

// 导入子路由
const authRoutes = require('./auth');
const userRoutes = require('./users');
const taskRoutes = require('./tasks');
// const opportunityRoutes = require('./opportunities');
// const projectRoutes = require('./projects');
// const goalRoutes = require('./goals');
// const systemRoutes = require('./system');

// API信息
router.get('/', (req, res) => {
  res.json({
    name: '际华定制协同办公管理平台 API',
    version: '1.0.0',
    description: '为际华定制协同办公管理平台提供RESTful API服务',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tasks: '/api/tasks',
      opportunities: '/api/opportunities',
      projects: '/api/projects',
      goals: '/api/goals',
      system: '/api/system'
    },
    documentation: '/api/docs',
    health: '/health'
  });
});

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
// router.use('/opportunities', opportunityRoutes);
// router.use('/projects', projectRoutes);
// router.use('/goals', goalRoutes);
// router.use('/system', systemRoutes);

module.exports = router;
