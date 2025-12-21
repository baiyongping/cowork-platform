# 际华定制协同办公管理平台 - 后端API

## 项目介绍

这是际华定制协同办公管理平台的后端API服务，基于 Node.js + Express + MongoDB 构建，提供完整的RESTful API接口。

## 技术栈

- **Node.js** v18+
- **Express** - Web框架
- **MongoDB** - 数据库（腾讯云文档数据库）
- **Mongoose** - MongoDB ODM
- **JWT** - 身份认证
- **bcryptjs** - 密码加密

## 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   └── database.js  # 数据库配置
│   ├── controllers/     # 控制器
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── taskController.js
│   ├── middleware/      # 中间件
│   │   ├── auth.js      # 认证中间件
│   │   └── errorHandler.js  # 错误处理
│   ├── models/          # 数据模型
│   │   ├── User.js
│   │   └── Task.js
│   ├── routes/          # 路由
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── tasks.js
│   ├── utils/           # 工具函数
│   │   └── logger.js    # 日志工具
│   └── index.js         # 入口文件
├── logs/                # 日志目录
├── uploads/             # 上传文件目录
├── .env                 # 环境变量（不提交到Git）
├── .env.example         # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，填入真实配置
vim .env
```

必需配置项：
- `MONGODB_URI` - 腾讯云MongoDB连接字符串
- `JWT_SECRET` - JWT密钥（生产环境请使用强密钥）
- `CORS_ORIGIN` - 前端地址

### 3. 启动服务

```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

服务启动后访问：
- API地址：`http://localhost:3000/api`
- 健康检查：`http://localhost:3000/health`

## API文档

### 认证相关 `/api/auth`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录 | Public |
| POST | `/auth/register` | 用户注册 | Admin |
| POST | `/auth/logout` | 用户登出 | Private |
| GET | `/auth/me` | 获取当前用户信息 | Private |
| PUT | `/auth/password` | 修改密码 | Private |
| POST | `/auth/refresh` | 刷新Token | Public |

### 用户管理 `/api/users`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/users` | 获取用户列表 | Private |
| GET | `/users/:id` | 获取用户详情 | Private |
| PUT | `/users/:id` | 更新用户信息 | Admin |
| DELETE | `/users/:id` | 删除用户 | Admin |
| GET | `/users/department/:id` | 获取部门成员 | Private |

### 任务管理 `/api/tasks`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/tasks` | 获取任务列表 | Private |
| GET | `/tasks/:id` | 获取任务详情 | Private |
| POST | `/tasks` | 创建任务 | Private |
| PUT | `/tasks/:id` | 更新任务 | Private |
| DELETE | `/tasks/:id` | 删除任务 | Private |
| GET | `/tasks/my/pending` | 获取我的待办 | Private |
| GET | `/tasks/my/completed` | 获取我的已完成 | Private |
| GET | `/tasks/statistics/overview` | 获取任务统计 | Private |
| POST | `/tasks/:id/collaborators` | 添加协同人 | Private |
| DELETE | `/tasks/:id/collaborators/:userId` | 移除协同人 | Private |

## 请求示例

### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "name": "系统管理员",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresIn": "7d"
  }
}
```

### 创建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试任务",
    "level": "个人级",
    "type": "日常工作",
    "status": "未开始",
    "progress": 0,
    "startDate": "2025-12-07",
    "endDate": "2025-12-14",
    "description": "这是一个测试任务"
  }'
```

## 错误处理

统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误信息",
  "error": "错误类型",
  "errors": [] // 详细错误（可选）
}
```

常见HTTP状态码：
- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 资源冲突
- `500` - 服务器错误

## 开发指南

### 添加新的API接口

1. **创建模型** - `src/models/YourModel.js`
2. **创建控制器** - `src/controllers/yourController.js`
3. **创建路由** - `src/routes/your.js`
4. **注册路由** - 在 `src/routes/index.js` 中注册

### 数据验证

使用 `express-validator` 进行数据验证：

```javascript
const { body } = require('express-validator');

const validator = [
  body('name').trim().notEmpty().withMessage('名称不能为空'),
  body('email').isEmail().withMessage('邮箱格式不正确')
];

router.post('/', validator, asyncHandler(controller.create));
```

### 错误处理

使用 `asyncHandler` 包装异步函数：

```javascript
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

exports.yourFunction = asyncHandler(async (req, res) => {
  // 抛出自定义错误
  throw new ApiError(400, '错误信息', 'ErrorType');
});
```

### 日志记录

```javascript
const logger = require('../utils/logger');

logger.info('信息日志', { meta: 'data' });
logger.warn('警告日志');
logger.error('错误日志', error);
logger.debug('调试日志');
```

## 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 部署

### 使用PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start src/index.js --name jihua-oa-api

# 查看日志
pm2 logs jihua-oa-api

# 重启服务
pm2 restart jihua-oa-api

# 停止服务
pm2 stop jihua-oa-api
```

### Docker部署

```bash
# 构建镜像
docker build -t jihua-oa-api .

# 运行容器
docker run -d -p 3000:3000 --env-file .env jihua-oa-api
```

## 性能优化

1. **数据库索引** - 已在模型中定义索引
2. **查询优化** - 使用 `populate` 和 `select` 优化查询
3. **缓存策略** - 可使用Redis缓存热点数据
4. **分页查询** - 所有列表接口支持分页
5. **压缩响应** - 使用 `compression` 中间件

## 安全措施

1. **JWT认证** - 所有私有接口需要Token
2. **密码加密** - 使用bcrypt加密密码
3. **CORS配置** - 限制跨域访问
4. **Helmet** - 设置安全HTTP头
5. **参数验证** - 所有输入参数验证
6. **SQL注入防护** - Mongoose自动防护
7. **XSS防护** - 输入输出过滤

## 常见问题

### Q1: 数据库连接失败

检查：
1. MongoDB连接字符串是否正确
2. 网络是否通畅
3. 数据库账号密码是否正确
4. 安全组是否允许访问

### Q2: Token验证失败

检查：
1. Token是否过期
2. JWT_SECRET是否一致
3. Token格式是否正确（Bearer xxx）

### Q3: 权限不足

检查：
1. 用户角色是否正确
2. 路由权限配置是否正确
3. 角色权限表是否正确配置

## 技术支持

如有问题，请联系开发团队或查看项目文档。

## License

MIT
