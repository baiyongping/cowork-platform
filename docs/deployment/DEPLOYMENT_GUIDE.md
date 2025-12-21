# 际华定制协同办公管理平台 - 部署指南

> v1.1.0 生产环境部署完整指南

---

## 📋 部署概览

### 部署信息

- **版本**: v1.1.0
- **部署日期**: 2025-12-09
- **部署方式**: Docker + Nginx
- **服务器平台**: 腾讯云 Lighthouse

---

## 🌐 访问信息

### 生产环境访问地址

**主域名**: http://152.136.183.181:8888

> ⚠️ **首次访问提示**: 建议配置自定义域名并启用 HTTPS

### 默认管理员账号

- **用户名**: `admin`
- **密码**: `admin123`

> 🔐 **安全警告**: 首次登录后请立即修改默认密码！

---

## 🏗️ 部署架构

```
用户浏览器
    ↓
腾讯云 Lighthouse 服务器 (152.136.183.181:8888)
    ↓
Docker 容器 (jihua-oa)
    ↓
Nginx Alpine (端口 80)
    ↓
React 静态文件 (/usr/share/nginx/html/)
    ↓
CloudBase 后端服务
    ├─ 数据库 (MongoDB)
    ├─ 认证服务
    ├─ 云存储
    └─ 静态托管
```

---

## 🖥️ 服务器信息

### 服务器配置

| 项目 | 详情 |
|-----|------|
| **实例ID** | lhins-pnt984h2 |
| **实例名称** | OpenCloudOS8-Docker26-Tbot |
| **地域** | ap-beijing（北京） |
| **公网IP** | 152.136.183.181 |
| **操作系统** | OpenCloudOS 8 |
| **Docker版本** | 26.x |
| **状态** | RUNNING（运行中） |

### Docker 容器信息

| 项目 | 详情 |
|-----|------|
| **容器名称** | jihua-oa |
| **镜像** | jihua-oa-platform:v1.1.0 |
| **基础镜像** | nginx:alpine |
| **端口映射** | 8888:80 |
| **重启策略** | always（自动重启） |
| **容器ID** | 104d9e3a2334 |

### 防火墙配置

- ✅ 已开放端口: 8888 (TCP)
- ✅ 协议: TCP
- ✅ 来源: 所有IP (0.0.0.0/0)

---

## 📦 部署流程详解

### 1. 准备阶段

#### 构建生产版本
```bash
cd e:\cowork
npm run build
```

构建产物位于 `dist/` 目录。

#### 创建 Docker 配置

**Dockerfile**:
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
- SPA 路由支持（try_files）
- Gzip 压缩
- 静态资源缓存
- 安全头部配置

### 2. 上传阶段

使用 Lighthouse 集成工具上传项目到服务器：
- 目标路径: `/root/cowork_20251209224730`
- 包含文件: dist/, Dockerfile, nginx.conf, .dockerignore

### 3. 部署阶段

#### 构建 Docker 镜像
```bash
docker build -t jihua-oa-platform:v1.1.0 .
```

#### 运行容器
```bash
docker run -d \
  --name jihua-oa \
  --restart=always \
  -p 8888:80 \
  jihua-oa-platform:v1.1.0
```

### 4. 验证阶段

#### 检查容器状态
```bash
docker ps | grep jihua-oa
```

#### 测试服务可用性
```bash
curl -I http://localhost:8888
```

预期响应: HTTP 200 OK

---

## 🔧 日常运维

### 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 查看容器日志
docker logs jihua-oa

# 实时查看日志
docker logs -f jihua-oa
```

### 重启服务

```bash
# 重启容器
docker restart jihua-oa

# 停止容器
docker stop jihua-oa

# 启动容器
docker start jihua-oa
```

### 更新部署

#### 方式1：快速更新（仅更新代码）

```bash
# 1. 本地构建新版本
npm run build

# 2. 上传 dist/ 到服务器
# （使用 deploy_project_preparation 工具）

# 3. 进入项目目录
cd /root/cowork_20251209224730

# 4. 重新构建镜像
docker build -t jihua-oa-platform:v1.1.1 .

# 5. 停止并删除旧容器
docker stop jihua-oa
docker rm jihua-oa

# 6. 运行新容器
docker run -d --name jihua-oa --restart=always -p 8888:80 jihua-oa-platform:v1.1.1
```

#### 方式2：完整更新（包含配置）

重复完整部署流程。

### 清理旧镜像

```bash
# 查看所有镜像
docker images

# 删除未使用的镜像
docker image prune -a

# 删除特定镜像
docker rmi jihua-oa-platform:v1.0.0
```

---

## 📊 监控与日志

### 容器资源使用

```bash
# 查看容器资源使用情况
docker stats jihua-oa

# 查看容器详细信息
docker inspect jihua-oa
```

### 日志管理

```bash
# 查看最近50行日志
docker logs --tail 50 jihua-oa

# 查看实时日志
docker logs -f jihua-oa

# 查看带时间戳的日志
docker logs -t jihua-oa

# 查看特定时间段的日志
docker logs --since "2025-12-09T00:00:00" jihua-oa
```

### Nginx 访问日志

Nginx 日志位于容器内 `/var/log/nginx/`:
- access.log - 访问日志
- error.log - 错误日志

查看方法:
```bash
docker exec jihua-oa tail -f /var/log/nginx/access.log
docker exec jihua-oa tail -f /var/log/nginx/error.log
```

---

## 🔒 安全配置

### 已实施的安全措施

1. **Nginx 安全头部**
   - X-Frame-Options: SAMEORIGIN（防止点击劫持）
   - X-Content-Type-Options: nosniff（防止MIME类型嗅探）
   - X-XSS-Protection: 1; mode=block（XSS防护）
   - Referrer-Policy: no-referrer-when-downgrade（引用策略）

2. **Docker 容器隔离**
   - 容器运行在独立的网络命名空间
   - 只暴露必要的端口（8888）

3. **用户认证**
   - 注册审核机制
   - 密码哈希存储
   - Token认证

### 建议的安全增强

#### 1. 配置 HTTPS

**使用 Let's Encrypt 免费证书**:

```bash
# 安装 Certbot
yum install -y certbot

# 申请证书（需要域名）
certbot certonly --standalone -d your-domain.com

# 更新 Nginx 配置（添加 SSL）
# 重新构建和部署容器
```

#### 2. 配置自定义域名

在域名服务商配置 A 记录：
```
your-domain.com  →  152.136.183.181
```

#### 3. 限制访问来源

如果只允许特定IP访问，可在防火墙规则中配置：
```bash
# 删除现有的8888端口规则
# 添加新规则，只允许特定IP访问
```

#### 4. 定期更新

```bash
# 更新基础镜像
docker pull nginx:alpine

# 重新构建应用镜像
docker build -t jihua-oa-platform:latest .
```

---

## 🚨 故障排查

### 常见问题

#### 1. 容器无法启动

**症状**: `docker ps` 看不到容器

**排查步骤**:
```bash
# 查看所有容器（包括停止的）
docker ps -a

# 查看容器日志
docker logs jihua-oa

# 检查端口占用
netstat -tuln | grep 8888
```

**可能原因**:
- 端口已被占用
- 配置文件错误
- 镜像构建失败

#### 2. 页面无法访问

**症状**: 浏览器访问超时或拒绝连接

**排查步骤**:
```bash
# 检查容器是否运行
docker ps | grep jihua-oa

# 检查防火墙
firewall-cmd --list-ports

# 测试本地访问
curl http://localhost:8888

# 测试外网访问（从服务器外部）
curl http://152.136.183.181:8888
```

**可能原因**:
- 容器未运行
- 防火墙未开放端口
- 安全组配置问题

#### 3. 页面空白或404

**症状**: 能访问但页面空白或显示404

**排查步骤**:
```bash
# 检查 Nginx 配置
docker exec jihua-oa cat /etc/nginx/conf.d/default.conf

# 检查静态文件
docker exec jihua-oa ls -la /usr/share/nginx/html/

# 查看 Nginx 错误日志
docker exec jihua-oa tail -f /var/log/nginx/error.log
```

**可能原因**:
- 静态文件未正确复制
- Nginx 配置错误
- SPA 路由配置问题

#### 4. 容器频繁重启

**症状**: `docker ps` 显示容器不断重启

**排查步骤**:
```bash
# 查看容器状态
docker ps -a

# 查看重启次数
docker inspect jihua-oa | grep RestartCount

# 查看详细日志
docker logs --tail 100 jihua-oa
```

**可能原因**:
- 应用崩溃
- 配置错误
- 资源不足

---

## 📈 性能优化

### Nginx 优化

在 `nginx.conf` 中已配置：

1. **Gzip 压缩**
   - 减少传输数据量
   - 支持多种文件类型

2. **静态资源缓存**
   - 1年缓存期
   - Cache-Control: public, immutable

3. **文件类型优化**
   - 针对不同文件类型设置不同策略

### Docker 优化

```bash
# 清理未使用的资源
docker system prune -a

# 限制容器资源使用
docker update --memory=512m --cpus=1 jihua-oa
```

### 网络优化

```bash
# 使用 CDN 加速静态资源
# 配置在 CloudBase 静态托管
```

---

## 🔄 回滚策略

### 快速回滚

保留旧版本镜像，可快速回滚：

```bash
# 停止当前版本
docker stop jihua-oa
docker rm jihua-oa

# 运行旧版本
docker run -d --name jihua-oa --restart=always -p 8888:80 jihua-oa-platform:v1.0.0
```

### 备份策略

定期备份：
1. **代码备份**: Git 仓库
2. **数据库备份**: CloudBase 自动备份
3. **镜像备份**: 推送到私有镜像仓库

---

## 📞 技术支持

### 联系方式

- **服务器管理**: Lighthouse 控制台
- **应用管理**: CloudBase 控制台
- **问题反馈**: GitHub Issues

### 相关文档

- [README.md](./README.md) - 项目完整文档
- [RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md) - 版本发布说明
- [数据库结构设计文档.md](./database/数据库结构设计文档.md) - 数据库文档

---

## ✅ 部署检查清单

部署完成后，请逐项检查：

### 基础功能
- [ ] 能正常访问首页
- [ ] 登录功能正常
- [ ] 注册功能正常
- [ ] 忘记密码功能正常

### 核心模块
- [ ] 工作台数据正常显示
- [ ] 任务管理功能正常
- [ ] 商机管理功能正常
- [ ] 项目管理功能正常
- [ ] 目标管理功能正常
- [ ] 员工管理功能正常
- [ ] 部门管理功能正常
- [ ] 系统设置功能正常

### 安全检查
- [ ] 修改默认管理员密码
- [ ] 验证用户权限控制
- [ ] 测试操作日志记录
- [ ] 检查安全头部配置

### 性能检查
- [ ] 页面加载速度
- [ ] 静态资源加载
- [ ] 数据库查询速度
- [ ] 容器资源使用

---

**部署团队**: 际华定制协同办公平台开发组  
**部署日期**: 2025-12-09  
**版本**: v1.1.0  
**服务器**: 腾讯云 Lighthouse (ap-beijing)  
**访问地址**: http://152.136.183.181:8888
