# Git 配置说明

## 📋 配置信息

- **用户名**: baiyongping
- **邮箱**: baiypa@126.com

---

## 🚀 快速配置

我已经为你创建了自动配置脚本，请选择一种方式运行：

### 方法一：PowerShell 脚本（推荐）

在项目目录打开 PowerShell，运行：

```powershell
.\配置Git.ps1
```

### 方法二：批处理脚本

双击运行或在 CMD 中执行：

```cmd
.\配置Git.bat
```

这两个脚本都会自动配置：
- ✅ 用户名: baiyongping
- ✅ 邮箱: baiypa@126.com
- ✅ 默认分支名: main
- ✅ 换行符转换（Windows）
- ✅ 中文文件名支持
- ✅ 彩色输出

---

## 🔧 手动配置

如果你想手动配置，请在终端中运行以下命令：

### 基本配置

```bash
# 配置用户名
git config --global user.name "baiyongping"

# 配置邮箱
git config --global user.email "baiypa@126.com"
```

### 推荐配置

```bash
# 设置默认分支名为 main
git config --global init.defaultBranch main

# 设置自动换行符转换（Windows）
git config --global core.autocrlf true

# 设置中文文件名正确显示
git config --global core.quotepath false

# 启用彩色输出
git config --global color.ui auto
```

---

## ✅ 验证配置

配置完成后，运行以下命令验证：

```bash
# 查看用户名
git config --global user.name

# 查看邮箱
git config --global user.email

# 查看所有配置
git config --global --list
```

**预期输出**：
```
user.name=baiyongping
user.email=baiypa@126.com
init.defaultbranch=main
core.autocrlf=true
core.quotepath=false
color.ui=auto
```

---

## 📚 Git 快速入门

### 初始化仓库

```bash
# 在项目目录中初始化 Git 仓库
git init
```

### 基本工作流程

```bash
# 1. 查看当前状态
git status

# 2. 添加文件到暂存区
git add .                # 添加所有文件
git add 文件名           # 添加特定文件

# 3. 提交更改
git commit -m "提交说明"

# 4. 查看提交历史
git log
git log --oneline        # 简洁模式
```

### 分支操作

```bash
# 查看分支
git branch

# 创建分支
git branch dev

# 切换分支
git checkout dev

# 创建并切换分支
git checkout -b dev

# 合并分支
git checkout main
git merge dev

# 删除分支
git branch -d dev
```

### 远程仓库

```bash
# 添加远程仓库
git remote add origin <仓库地址>

# 查看远程仓库
git remote -v

# 推送到远程
git push -u origin main

# 从远程拉取
git pull origin main

# 克隆仓库
git clone <仓库地址>
```

---

## 🔍 常见问题

### Q: 如何修改配置？

重新运行配置命令即可覆盖：

```bash
git config --global user.name "新用户名"
git config --global user.email "新邮箱"
```

### Q: 如何查看配置文件位置？

```bash
# 查看全局配置文件路径
git config --global --list --show-origin
```

通常位于：`C:\Users\你的用户名\.gitconfig`

### Q: 如何删除某项配置？

```bash
git config --global --unset user.name
```

### Q: 配置只对当前项目生效怎么办？

去掉 `--global` 参数：

```bash
git config user.name "项目专用用户名"
git config user.email "项目专用邮箱"
```

---

## 📖 际华项目 Git 工作流建议

### 分支策略

```
main        # 主分支（生产环境）
├── dev     # 开发分支
│   ├── feature/任务管理    # 功能分支
│   ├── feature/商机管理    # 功能分支
│   └── bugfix/修复登录     # 修复分支
```

### 提交信息规范

```bash
# 功能开发
git commit -m "feat: 添加任务筛选功能"

# Bug 修复
git commit -m "fix: 修复登录验证问题"

# 文档更新
git commit -m "docs: 更新 API 文档"

# 样式调整
git commit -m "style: 调整任务卡片样式"

# 重构
git commit -m "refactor: 重构用户认证逻辑"

# 性能优化
git commit -m "perf: 优化数据库查询性能"

# 测试
git commit -m "test: 添加任务模块单元测试"
```

### 日常工作流程

```bash
# 1. 切换到开发分支
git checkout dev

# 2. 拉取最新代码
git pull origin dev

# 3. 创建功能分支
git checkout -b feature/新功能

# 4. 开发并提交
git add .
git commit -m "feat: 实现新功能"

# 5. 推送到远程
git push origin feature/新功能

# 6. 合并到 dev 分支（测试通过后）
git checkout dev
git merge feature/新功能

# 7. 推送 dev 分支
git push origin dev

# 8. 删除功能分支
git branch -d feature/新功能
```

---

## 🎓 进阶学习资源

- **官方文档**: https://git-scm.com/doc
- **Pro Git 中文版**: https://git-scm.com/book/zh/v2
- **Git 可视化学习**: https://learngitbranching.js.org/?locale=zh_CN
- **GitHub 技能**: https://skills.github.com

---

## ✅ 配置完成检查清单

- [ ] Git 已安装并可用（`git --version`）
- [ ] 用户名已配置（`git config --global user.name`）
- [ ] 邮箱已配置（`git config --global user.email`）
- [ ] 推荐配置已设置
- [ ] 验证配置成功
- [ ] 了解基本 Git 命令
- [ ] 了解项目工作流

---

**配置时间**: 2025-12-26  
**配置用户**: baiyongping  
**配置邮箱**: baiypa@126.com

🎉 **配置完成，开始使用 Git 进行版本控制吧！**
