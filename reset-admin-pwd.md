# Admin密码重置说明

## 问题
本地登录admin账号一直提示"用户名或密码错误"

## 原因
数据库中admin的密码哈希值与本地计算的不一致

## 解决方案

### 方法1: 通过CloudBase控制台直接修改

1. **打开CloudBase控制台**:
   https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/users

2. **找到admin用户**:
   - 在users集合中找到username为"admin"的记录
   - _id: `8656c024693651ee06c4065f157cd4d4`

3. **修改password字段**:
   - 点击编辑按钮
   - 将password字段值改为:
   ```
   3798eee73d3dda0851e731edd250a51d691389eca398a1de76cb0471c8fec692
   ```
   - 保存

4. **测试登录**:
   - 用户名: `admin`
   - 密码: `admin123`

### 方法2: 通过MCP工具更新 (推荐)

让AI助手执行以下命令来更新密码。

## 当前密码信息

- **用户名**: admin
- **密码**: admin123
- **正确的哈希值**: `3798eee73d3dda0851e731edd250a51d691389eca398a1de76cb0471c8fec692`
- **加密算法**: SHA-256(password + SECRET_KEY)
- **SECRET_KEY**: `jihua-oa-platform-secret-key-2025`
