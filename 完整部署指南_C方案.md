# 际华定制协同办公系统 - 完整部署指南（C方案）

## 📋 方案概述

**C方案：一键自动化部署** - 最简单、最快速的部署方案

- ⏱️ **预计时间**: 30分钟
- 🎯 **适合人群**: 所有用户（强烈推荐）
- 🚀 **特点**: 全自动化，一键完成所有配置

---

## 🎯 已完成工作

✅ **服务器准备**
- IP: 152.136.183.181
- 系统: OpenCloudOS 8.10
- 网络: 延迟11ms，连接正常

✅ **域名配置**
- 域名: jihuadz.xin
- DNS解析: 已生效
- 解析到: 152.136.183.181

---

## 🚀 三步完成部署

### 第一步：服务器环境配置（5-10分钟）

#### 1.1 上传部署脚本到服务器

**方式A：使用 SCP（推荐）**
```bash
scp E:\cowork\一键部署脚本.sh root@152.136.183.181:/root/
```

**方式B：使用腾讯云控制台**
1. 登录腾讯云控制台
2. 找到轻量应用服务器
3. 点击"文件传输"
4. 上传 `一键部署脚本.sh` 到 `/root/` 目录

**方式C：手动复制粘贴**
```bash
# SSH 登录服务器
ssh root@152.136.183.181

# 创建脚本文件
cat > /root/一键部署脚本.sh << 'EOF'
# 复制 E:\cowork\一键部署脚本.sh 的全部内容粘贴到这里
EOF

# 添加执行权限
chmod +x /root/一键部署脚本.sh
```

#### 1.2 执行部署脚本

```bash
# SSH 登录服务器（如果还没登录）
ssh root@152.136.183.181

# 执行脚本
bash /root/一键部署脚本.sh
```

**脚本会自动完成：**
- ✅ 更新系统软件包
- ✅ 安装 Nginx Web 服务器
- ✅ 配置防火墙规则（开放80/443端口）
- ✅ 创建 Web 目录 `/var/www/jihua/`
- ✅ 配置 Nginx 虚拟主机（支持域名访问）
- ✅ 安装 SSL 证书工具（Certbot）
- ✅ 创建临时测试页面
- ✅ 启动 Nginx 服务

**预期输出：**
```
================================================
环境配置完成！
================================================

📋 配置摘要:
  - Web 服务器: Nginx (运行中 ✅)
  - Web 目录: /var/www/jihua
  - 域名: jihuadz.xin
  - HTTP 访问: http://jihuadz.xin
```

#### 1.3 验证环境

在浏览器访问：`http://jihuadz.xin`

**看到测试页面即表示成功！**

---

### 第二步：构建并上传项目（10-15分钟）

#### 2.1 本地构建项目

**Windows 用户（双击即可）：**
```
双击运行: E:\cowork\本地构建上传脚本.bat
```

脚本会自动：
1. 检查 Node.js 环境
2. 询问是否安装依赖（首次选"是"）
3. 清理旧的构建文件
4. 执行 `npm run build`
5. 显示构建结果
6. 询问是否立即上传

**Linux/Mac 用户：**
```bash
cd E:/cowork  # 或您的项目路径

# 安装依赖（首次需要）
npm install

# 构建项目
npm run build

# 上传文件
scp -r dist/* root@152.136.183.181:/var/www/jihua/
```

#### 2.2 上传到服务器

**使用自动化脚本上传（推荐）：**
- 运行 `本地构建上传脚本.bat` 时选择"是（开始上传）"
- 输入服务器密码
- 等待上传完成

**手动上传（备选）：**

**方式A：SCP 命令行**
```bash
cd E:\cowork
scp -r dist/* root@152.136.183.181:/var/www/jihua/
```

**方式B：WinSCP 图形界面**
1. 下载安装 WinSCP
2. 连接到 152.136.183.181
3. 本地路径: `E:\cowork\dist\`
4. 远程路径: `/var/www/jihua/`
5. 拖拽上传所有文件

**方式C：腾讯云控制台**
1. 登录腾讯云控制台
2. 使用文件传输功能
3. 上传 `dist` 目录下的所有文件

#### 2.3 设置文件权限

```bash
# SSH 登录服务器
ssh root@152.136.183.181

# 设置权限
chown -R nginx:nginx /var/www/jihua/
chmod -R 755 /var/www/jihua/
```

**或使用自动化脚本（已包含权限设置）**

---

### 第三步：申请 SSL 证书（5分钟，可选但强烈推荐）

#### 3.1 上传 SSL 证书申请脚本

```bash
scp E:\cowork\SSL证书申请脚本.sh root@152.136.183.181:/root/
```

#### 3.2 执行 SSL 证书申请

```bash
# SSH 登录服务器
ssh root@152.136.183.181

# 添加执行权限
chmod +x /root/SSL证书申请脚本.sh

# 执行脚本
bash /root/SSL证书申请脚本.sh
```

**脚本会自动：**
- ✅ 检查 Certbot 安装
- ✅ 验证域名解析
- ✅ 申请 Let's Encrypt 免费证书
- ✅ 自动配置 Nginx HTTPS
- ✅ 设置 HTTP 自动重定向到 HTTPS
- ✅ 配置证书自动续期（90天有效期）

**或手动执行一条命令：**
```bash
certbot --nginx -d jihuadz.xin -d www.jihuadz.xin \
  --non-interactive --agree-tos \
  --email admin@jihuadz.xin \
  --redirect
```

#### 3.3 验证 HTTPS

浏览器访问：`https://jihuadz.xin`

**看到绿色锁图标即表示成功！**

---

## 🎉 部署完成！

### 🌐 访问系统

**生产环境地址：**
- HTTP: http://jihuadz.xin
- HTTPS: https://jihuadz.xin（推荐）

**管理员账号：**
- 用户名: `admin`
- 密码: `admin123`

⚠️ **重要**: 首次登录后请立即修改密码！

---

## 📦 脚本文件清单

本次创建的自动化脚本文件：

| 文件名 | 用途 | 执行位置 |
|-------|------|---------|
| `一键部署脚本.sh` | 服务器环境配置 | 服务器 |
| `本地构建上传脚本.bat` | 本地构建+上传 | 本地Windows |
| `SSL证书申请脚本.sh` | SSL证书申请 | 服务器 |
| `完整部署指南_C方案.md` | 本文档 | 本地查看 |

---

## ✅ 部署检查清单

完成部署后，请逐项检查：

### 服务器环境
- [ ] Nginx 服务运行正常
- [ ] 防火墙开放 80/443 端口
- [ ] Web 目录创建成功（/var/www/jihua）
- [ ] 域名配置正确

### 应用部署
- [ ] 项目构建成功（dist 目录生成）
- [ ] 文件上传完成
- [ ] 文件权限设置正确
- [ ] HTTP 访问正常

### SSL 证书（可选）
- [ ] Certbot 安装成功
- [ ] SSL 证书申请成功
- [ ] HTTPS 访问正常
- [ ] HTTP 自动重定向
- [ ] 证书自动续期配置

### 功能测试
- [ ] 能够访问登录页面
- [ ] 能够正常登录
- [ ] 任务列表显示正常
- [ ] 商机管理功能正常
- [ ] 项目管理功能正常

---

## 🔧 常用管理命令

### Nginx 管理
```bash
# 启动 Nginx
systemctl start nginx

# 停止 Nginx
systemctl stop nginx

# 重启 Nginx
systemctl restart nginx

# 重新加载配置（不中断服务）
systemctl reload nginx

# 查看状态
systemctl status nginx

# 测试配置文件
nginx -t

# 查看错误日志
tail -f /var/log/nginx/jihua_error.log

# 查看访问日志
tail -f /var/log/nginx/jihua_access.log
```

### SSL 证书管理
```bash
# 查看证书信息
certbot certificates

# 手动续期
certbot renew

# 测试自动续期
certbot renew --dry-run

# 撤销证书
certbot revoke --cert-path /etc/letsencrypt/live/jihuadz.xin/cert.pem

# 删除证书
certbot delete --cert-name jihuadz.xin
```

### 系统维护
```bash
# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看 CPU 使用
top

# 查看进程
ps aux | grep nginx

# 清理日志
find /var/log/nginx/ -name "*.log" -mtime +30 -delete
```

---

## 🔍 故障排查

### 问题1: 无法访问 http://jihuadz.xin

**可能原因及解决方法：**

1. **DNS 未生效**
   ```bash
   # 检查 DNS 解析
   nslookup jihuadz.xin
   
   # 如果解析错误，等待 DNS 更新（最多24小时）
   ```

2. **Nginx 未运行**
   ```bash
   # 检查 Nginx 状态
   systemctl status nginx
   
   # 如果未运行，启动 Nginx
   systemctl start nginx
   ```

3. **防火墙阻止**
   ```bash
   # 检查防火墙规则
   firewall-cmd --list-all
   
   # 开放端口
   firewall-cmd --permanent --add-service=http
   firewall-cmd --permanent --add-service=https
   firewall-cmd --reload
   ```

4. **配置文件错误**
   ```bash
   # 测试配置
   nginx -t
   
   # 查看错误日志
   tail -n 50 /var/log/nginx/error.log
   ```

### 问题2: SSL 证书申请失败

**可能原因及解决方法：**

1. **域名未备案（中国大陆服务器）**
   - 完成 ICP 备案后再申请

2. **80 端口无法访问**
   ```bash
   # 测试 HTTP 访问
   curl -I http://jihuadz.xin
   
   # 确保返回 200 状态码
   ```

3. **Certbot 配置问题**
   ```bash
   # 查看 Certbot 日志
   tail -n 100 /var/log/letsencrypt/letsencrypt.log
   
   # 重新安装 Certbot
   dnf reinstall -y certbot python3-certbot-nginx
   ```

### 问题3: 页面显示异常

**可能原因及解决方法：**

1. **文件上传不完整**
   ```bash
   # 检查文件数量
   ls -la /var/www/jihua/
   
   # 重新上传
   scp -r dist/* root@152.136.183.181:/var/www/jihua/
   ```

2. **文件权限问题**
   ```bash
   # 设置正确权限
   chown -R nginx:nginx /var/www/jihua/
   chmod -R 755 /var/www/jihua/
   ```

3. **浏览器缓存**
   - 按 `Ctrl + F5` 强制刷新
   - 或清除浏览器缓存

### 问题4: CloudBase 连接失败

**检查 CloudBase 配置：**

1. **检查环境ID配置**
   ```bash
   # 查看前端配置
   grep -r "envId" /var/www/jihua/assets/*.js
   ```

2. **检查安全域名**
   - 登录 CloudBase 控制台
   - 环境设置 → 安全配置 → 安全域名
   - 添加: `jihuadz.xin` 和 `www.jihuadz.xin`

3. **检查浏览器控制台**
   - F12 打开开发者工具
   - 查看 Console 和 Network 选项卡
   - 查找错误信息

---

## 📊 性能优化建议

### 1. 启用 Gzip 压缩（已配置）
配置文件中已启用，可查看效果：
```bash
curl -H "Accept-Encoding: gzip" -I https://jihuadz.xin
# 应该看到 Content-Encoding: gzip
```

### 2. 配置浏览器缓存（已配置）
静态资源已设置 30 天缓存

### 3. 使用 CDN（可选）
- 腾讯云 CDN
- CloudFlare CDN
- 阿里云 CDN

### 4. 数据库优化
- 使用 CloudBase 索引
- 合理设计数据结构
- 避免大量数据查询

---

## 🔐 安全加固建议

### 1. SSH 安全
```bash
# 修改 SSH 端口（可选）
vi /etc/ssh/sshd_config
# 修改: Port 22 -> Port 2222

# 禁用 root 登录（推荐）
PermitRootLogin no

# 仅允许密钥登录
PasswordAuthentication no

# 重启 SSH
systemctl restart sshd
```

### 2. 安装 Fail2Ban
```bash
# 安装
dnf install -y fail2ban

# 启动
systemctl enable --now fail2ban

# 查看状态
fail2ban-client status
```

### 3. 定期更新
```bash
# 更新系统
dnf update -y

# 自动安全更新
dnf install -y dnf-automatic
systemctl enable --now dnf-automatic.timer
```

### 4. 配置 HTTPS 安全头（推荐）
已在 Nginx 配置中添加：
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

---

## 📞 获取帮助

### 官方文档
- CloudBase: https://docs.cloudbase.net/
- Nginx: http://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/

### 日志查看
```bash
# Nginx 错误日志
tail -f /var/log/nginx/jihua_error.log

# Nginx 访问日志
tail -f /var/log/nginx/jihua_access.log

# 系统日志
journalctl -xe

# SSL 证书日志
tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 🎯 下一步建议

部署完成后，建议：

1. **✅ 修改管理员密码**（首要任务）
2. **✅ 配置系统参数**（公司信息、默认值等）
3. **✅ 创建用户账号**（为团队成员创建账号）
4. **✅ 数据备份策略**（定期备份重要数据）
5. **✅ 监控告警**（设置服务器和应用监控）

---

## 📝 部署记录

请记录以下信息，便于后续维护：

**服务器信息：**
- IP: 152.136.183.181
- 系统: OpenCloudOS 8.10
- SSH 端口: 22
- Root 密码: ____________

**域名信息：**
- 主域名: jihuadz.xin
- www域名: www.jihuadz.xin
- DNS 服务商: ____________
- 解析生效时间: 2025-12-14

**应用信息：**
- Web 目录: /var/www/jihua
- Nginx 配置: /etc/nginx/conf.d/jihuadz.conf
- 部署时间: ____________
- 版本: v1.0.0

**SSL 证书：**
- 证书类型: Let's Encrypt
- 申请时间: ____________
- 到期时间: ____________ (90天后)
- 自动续期: 已配置 ✅

**CloudBase 环境：**
- 环境ID: ____________
- 环境名称: ____________

---

## 🎉 恭喜！

您已成功使用 **C方案（一键自动化部署）** 完成了系统部署！

**享受际华定制协同办公系统带来的高效办公体验吧！** 🚀

---

*文档版本: v1.0*  
*最后更新: 2025-12-14*
