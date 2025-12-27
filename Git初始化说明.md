# Git 仓库初始化说明

## 🎯 快速开始

### 方法一：PowerShell（推荐）

```powershell
.\快速初始化.ps1
```

### 方法二：批处理

双击运行或在命令行执行：
```cmd
.\初始化Git仓库.bat
```

### 方法三：手动执行

```bash
# 1. 初始化仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建初始提交
git commit -m "初始提交：际华协同办公平台基础框架"

# 4. 查看状态
git status
```

---

## 📋 初始化脚本功能

这些脚本会自动完成以下操作：

1. ✅ **检查 Git 环境**
   - 验证 Git 是否已安装
   - 显示 Git 版本信息

2. ✅ **初始化仓库**
   - 在当前目录创建 `.git` 目录
   - 设置默认分支为 `main`

3. ✅ **添加文件**
   - 扫描所有文件（`.gitignore` 已配置排除规则）
   - 添加到暂存区

4. ✅ **创建初始提交**
   - 提交所有文件
   - 使用规范的提交信息

5. ✅ **显示状态**
   - 查看仓库状态
   - 显示提交历史

---

## 🚀 初始化后的操作

### 查看仓库状态

```bash
git status
```

**输出示例：**
```
On branch main
nothing to commit, working tree clean
```

### 查看提交历史

```bash
# 简洁模式
git log --oneline

# 详细模式
git log
```

### 创建开发分支（推荐）

```bash
# 创建并切换到 dev 分支
git checkout -b dev

# 查看所有分支
git branch
```

---

## 📂 项目文件结构

初始化后，项目中会有以下 Git 相关文件：

```
d:\project\cowork12-21\
├── .git/                    # Git 仓库目录（自动创建）
├── .gitignore              # 忽略规则（已存在）✅
├── 配置Git.ps1             # Git 用户配置
├── 配置Git.bat             # Git 用户配置
├── 快速初始化.ps1          # 仓库初始化（新创建）
├── 初始化Git仓库.bat       # 仓库初始化（新创建）
├── Git配置说明.md          # Git 使用指南
└── Git初始化说明.md        # 本文档
```

---

## ⚙️ .gitignore 配置说明

项目已配置 `.gitignore` 文件，以下内容会被忽略：

### 日志文件
```
logs/
*.log
npm-debug.log*
```

### 依赖和构建
```
node_modules/
dist/
dist-ssr/
```

### 编辑器配置
```
.vscode/
.idea/
.DS_Store
```

### 环境变量
```
.env
.env.local
.env.production
```

---

## 🔗 添加远程仓库（可选）

### 使用 Gitee（码云）- 推荐

```bash
# 1. 在 Gitee 创建新仓库
# 访问：https://gitee.com/projects/new

# 2. 添加远程仓库
git remote add origin https://gitee.com/你的用户名/jihua-oa.git

# 3. 推送代码
git push -u origin main
```

### 使用 GitHub

```bash
# 1. 在 GitHub 创建新仓库
# 访问：https://github.com/new

# 2. 添加远程仓库
git remote add origin https://github.com/你的用户名/jihua-oa.git

# 3. 推送代码
git push -u origin main
```

### 使用自建 GitLab

```bash
# 公司内网 GitLab
git remote add origin http://gitlab.jihua.com/你的项目/jihua-oa.git
git push -u origin main
```

---

## 📖 常用 Git 命令

### 日常开发流程

```bash
# 1. 查看状态
git status

# 2. 添加修改的文件
git add .                    # 添加所有文件
git add src/App.tsx         # 添加单个文件

# 3. 提交更改
git commit -m "功能：添加用户登录功能"

# 4. 推送到远程（如果有）
git push origin main
```

### 分支操作

```bash
# 创建分支
git branch feature-login

# 切换分支
git checkout feature-login

# 创建并切换（推荐）
git checkout -b feature-login

# 查看所有分支
git branch

# 合并分支
git checkout main
git merge feature-login

# 删除分支
git branch -d feature-login
```

### 查看历史

```bash
# 查看提交历史
git log

# 简洁模式
git log --oneline

# 图形化显示
git log --graph --oneline --all

# 查看某个文件的历史
git log src/App.tsx
```

### 撤销操作

```bash
# 撤销工作区修改
git checkout -- src/App.tsx

# 撤销暂存区（保留工作区）
git reset HEAD src/App.tsx

# 撤销最后一次提交（保留更改）
git reset --soft HEAD^

# 撤销最后一次提交（丢弃更改）⚠️
git reset --hard HEAD^
```

---

## 🎓 际华项目工作流建议

### 分支策略

```
main（主分支）
  ├── dev（开发分支）
  │    ├── feature/任务管理（功能分支）
  │    ├── feature/商机跟进（功能分支）
  │    └── bugfix/修复登录（修复分支）
  └── hotfix（紧急修复分支）
```

### 提交信息规范

```bash
# 新功能
git commit -m "功能：添加任务管理模块"

# 修复 Bug
git commit -m "修复：解决登录状态丢失问题"

# 优化
git commit -m "优化：提升列表加载性能"

# 文档
git commit -m "文档：更新 API 接口说明"

# 样式
git commit -m "样式：调整任务卡片布局"

# 重构
git commit -m "重构：重构用户认证逻辑"
```

### 开发流程示例

```bash
# 1. 从 dev 分支创建功能分支
git checkout dev
git checkout -b feature/task-management

# 2. 开发功能...
# 编辑代码...

# 3. 提交更改
git add .
git commit -m "功能：完成任务列表展示"

# 4. 推送到远程
git push origin feature/task-management

# 5. 创建 Pull Request / Merge Request
# 在 Gitee/GitHub/GitLab 上操作

# 6. 合并到 dev
git checkout dev
git merge feature/task-management

# 7. 删除功能分支
git branch -d feature/task-management
```

---

## ✅ 初始化检查清单

完成以下检查确保 Git 仓库配置正确：

- [ ] **Git 已安装**
  ```bash
  git --version
  ```

- [ ] **用户配置完成**
  ```bash
  git config --global user.name
  git config --global user.email
  ```

- [ ] **仓库已初始化**
  ```bash
  git status  # 应显示 "On branch main"
  ```

- [ ] **已创建初始提交**
  ```bash
  git log  # 应显示提交历史
  ```

- [ ] **.gitignore 配置正确**
  ```bash
  # 检查 node_modules 是否被忽略
  git status  # 不应显示 node_modules/
  ```

---

## ❓ 常见问题

### Q1: 运行脚本时提示"无法加载文件"

**问题**：PowerShell 执行策略限制

**解决方案**：
```powershell
# 临时允许
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 或直接运行
powershell -ExecutionPolicy Bypass -File .\快速初始化.ps1
```

### Q2: 提示"不是内部或外部命令"

**问题**：Git 未添加到 PATH

**解决方案**：
1. 重启终端
2. 或重启电脑
3. 或手动添加到 PATH

### Q3: 提交时提示需要配置用户信息

**问题**：未配置 Git 用户名和邮箱

**解决方案**：
```bash
git config --global user.name "baiyongping"
git config --global user.email "baiypa@126.com"
```

或运行配置脚本：
```powershell
.\配置Git.ps1
```

### Q4: 如何查看哪些文件会被提交？

**查看暂存区文件**：
```bash
git status
```

**查看具体更改**：
```bash
git diff                # 工作区 vs 暂存区
git diff --cached       # 暂存区 vs 仓库
```

---

## 📚 相关文档

- **Git配置说明.md** - Git 详细使用指南
- **Git和GitHub的区别.md** - Git 与托管平台的区别
- **环境配置完成报告.md** - 完整的环境配置报告

---

## 🎉 完成！

现在你的 Git 仓库已经准备就绪，可以开始版本控制了！

**下一步建议**：
1. ✅ 熟悉基本 Git 命令
2. ✅ 创建开发分支 `dev`
3. ✅ 配置远程仓库（可选）
4. ✅ 开始开发工作

祝开发顺利！🚀
