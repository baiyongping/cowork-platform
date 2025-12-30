# 蓝绿部署说明文档

## 部署架构

```
┌─────────────────────────────────────────┐
│         Nginx (反向代理)                 │
│      端口: 3443 (HTTPS)                 │
│      IP: 152.136.183.181                │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ↓                 ↓
 Blue 容器         Green 容器
 端口: 3001         端口: 3002
 (当前运行)         (待部署)
```

## 当前状态

**运行中的容器：**
- **名称**: jihua-dev-blue
- **端口**: 3001
- **镜像**: jihua-dev:latest
- **状态**: 运行中 ✓

**访问地址：**
- **开发环境**: https://152.136.183.181:3443
- **配置文件**: `/etc/nginx/conf.d/jihua-dev.conf`

## 蓝绿部署流程

### 1. 本地构建
```bash
npm run build
```

### 2. 上传到服务器
使用 Lighthouse MCP 工具：
```javascript
deploy_project_preparation({
  FolderPath: "d:\\project\\cowork12-21\\dist",
  InstanceId: "lhins-pnt984h2",
  Region: "ap-beijing",
  ProjectName: "jihua-dev-new"
})
```

### 3. 服务器端部署

#### 3.1 准备文件
```bash
cd /root/dist_XXXXXX  # 替换为实际路径
mkdir -p dist
mv assets dist/
mv index.html dist/
mv logo.png dist/

# 上传 Dockerfile 和 nginx.conf（或从本地复制）
```

#### 3.2 构建 Docker 镜像
```bash
VERSION=$(date +%Y%m%d-%H%M%S)
docker build -t jihua-dev:$VERSION -t jihua-dev:latest .
```

#### 3.3 决定新容器端口（自动切换）
```bash
# 检查当前运行的容器
CURRENT=$(docker ps --filter 'name=jihua-dev' --format '{{.Names}}:{{.Ports}}' | head -1)

# 如果当前是 Blue (3001)，则部署 Green (3002)
# 如果当前是 Green (3002)，则部署 Blue (3001)
if echo "$CURRENT" | grep -q '3001'; then
    NEW_PORT=3002
    NEW_NAME="jihua-dev-green"
else
    NEW_PORT=3001
    NEW_NAME="jihua-dev-blue"
fi
```

#### 3.4 启动新容器
```bash
# 停止并删除旧的同名容器
docker stop $NEW_NAME 2>/dev/null || true
docker rm $NEW_NAME 2>/dev/null || true

# 启动新容器
docker run -d \
    --name $NEW_NAME \
    -p $NEW_PORT:80 \
    --restart unless-stopped \
    jihua-dev:latest

# 等待容器就绪
sleep 3

# 健康检查
curl -sf http://localhost:$NEW_PORT
```

#### 3.5 更新 Nginx 配置
```bash
# 备份当前配置
cp /etc/nginx/conf.d/jihua-dev.conf /etc/nginx/conf.d/jihua-dev.conf.backup.$(date +%Y%m%d-%H%M%S)

# 更新配置（修改 proxy_pass 端口）
sed -i "s/proxy_pass http:\/\/localhost:[0-9]*;/proxy_pass http:\/\/localhost:$NEW_PORT;/g" \
    /etc/nginx/conf.d/jihua-dev.conf

# 测试并重载
nginx -t && nginx -s reload
```

#### 3.6 停止旧容器
```bash
docker stop <OLD_CONTAINER_NAME>
# 注意：不要删除旧容器，保留以便回滚
```

## 快速回滚

如果新版本有问题，立即回滚：

```bash
# 1. 找到旧容器
OLD_CONTAINER=$(docker ps -a --filter 'name=jihua-dev' --filter 'status=exited' --format '{{.Names}}' | head -1)
OLD_PORT=$(docker port $OLD_CONTAINER 2>/dev/null | grep -o '300[0-9]' | head -1)

# 2. 启动旧容器
docker start $OLD_CONTAINER

# 3. 更新 Nginx 配置
sed -i "s/proxy_pass http:\/\/localhost:[0-9]*;/proxy_pass http:\/\/localhost:$OLD_PORT;/g" \
    /etc/nginx/conf.d/jihua-dev.conf

# 4. 重载 Nginx
nginx -s reload

# 5. 停止新容器
docker stop <NEW_CONTAINER_NAME>
```

**预计回滚时间：< 30 秒**

## 优势说明

### 零停机部署
- ✅ 新容器启动并测试通过后才切换流量
- ✅ 旧容器保持运行直到确认新版本正常
- ✅ 用户感知不到服务中断

### 快速回滚
- ✅ 旧容器停止但未删除
- ✅ 一条命令即可启动旧容器
- ✅ 30 秒内完成回滚

### 资源隔离
- ✅ 每个版本独立运行在自己的容器中
- ✅ 互不影响
- ✅ 便于问题排查

## 容器管理命令

### 查看运行中的容器
```bash
docker ps --filter 'name=jihua-dev' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### 查看所有容器（包括停止的）
```bash
docker ps -a --filter 'name=jihua-dev'
```

### 查看容器日志
```bash
docker logs jihua-dev-blue -f
docker logs jihua-dev-green -f
```

### 进入容器
```bash
docker exec -it jihua-dev-blue sh
```

### 清理旧镜像
```bash
# 查看镜像
docker images | grep jihua-dev

# 删除指定镜像
docker rmi jihua-dev:20241230-130837

# 清理未使用的镜像
docker image prune
```

## 监控建议

### 1. 容器健康检查
```bash
# 添加到 crontab
*/5 * * * * curl -sf http://localhost:3001 || echo "Blue container down" | mail -s "Alert" admin@example.com
```

### 2. 查看资源使用
```bash
docker stats jihua-dev-blue
```

### 3. 磁盘空间监控
```bash
df -h
docker system df
```

## 安全注意事项

1. **备份配置文件**
   - 每次更新前自动备份 Nginx 配置
   - 保留最近 5 次备份

2. **容器保留策略**
   - 保留最近 2 个版本的容器
   - 定期清理旧版本

3. **日志管理**
   - 定期归档容器日志
   - 避免磁盘空间耗尽

## 问题排查

### Q: 部署后页面不更新？
**A**: 
1. 检查 Nginx 是否指向新端口
2. 清除浏览器缓存（Ctrl + F5）
3. 检查新容器是否正常运行

### Q: Nginx 重载失败？
**A**: 
```bash
nginx -t  # 查看配置错误
journalctl -u nginx -n 50  # 查看 Nginx 日志
```

### Q: 容器启动失败？
**A**: 
```bash
docker logs jihua-dev-blue --tail 50
docker inspect jihua-dev-blue
```

## 版本记录

| 日期 | 版本 | 容器 | 端口 | 备注 |
|------|------|------|------|------|
| 2024-12-30 | 20241230-130837 | jihua-dev-blue | 3001 | 初次蓝绿部署 ✓ |

---

**最后更新**: 2024-12-30  
**维护人员**: 系统管理员
