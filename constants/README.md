# CloudBase 配置常量

本目录包含项目中所有CloudBase相关的配置常量，避免硬编码，提高可维护性。

## 文件说明

### `cloudbase.ts`

集中管理CloudBase配置，包括:

- **环境ID**: `CLOUDBASE_ENV_ID`
- **云存储配置**: `CLOUDBASE_STORAGE`
- **控制台地址**: `CLOUDBASE_CONSOLE`

## 使用示例

### 1. 导入配置

```typescript
import { 
  CLOUDBASE_ENV_ID, 
  CLOUDBASE_STORAGE,
  getStoragePublicURL 
} from '../constants/cloudbase';
```

### 2. 使用环境ID

```typescript
// ✅ 推荐
import { CLOUDBASE_ENV_ID } from '../constants/cloudbase';
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || CLOUDBASE_ENV_ID;

// ❌ 避免
const ENV_ID = 'jihua-oa-dev-3goht9irae4d949f'; // 硬编码
```

### 3. 构造云存储URL

```typescript
// ✅ 推荐 - 使用工具函数
import { getStoragePublicURL } from '../constants/cloudbase';
const imageURL = getStoragePublicURL('avatars/user_123.jpg');
// 结果: https://6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la/avatars/user_123.jpg

// ❌ 避免 - 手动拼接URL
const imageURL = `https://6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la/avatars/user_123.jpg`;
```

### 4. 验证云存储URL

```typescript
import { isValidStorageURL } from '../constants/cloudbase';

const url = 'https://6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la/avatars/user_123.jpg';
if (isValidStorageURL(url)) {
  console.log('✅ 有效的云存储URL');
}
```

### 5. 提取FileID

```typescript
import { extractFileID } from '../constants/cloudbase';

const url = 'https://6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la/avatars/user_123.jpg';
const fileID = extractFileID(url);
// 结果: 'avatars/user_123.jpg'
```

### 6. 获取云存储路径

```typescript
import { getStoragePath } from '../constants/cloudbase';

const avatarPath = getStoragePath('AVATARS', 'user_123.jpg');
// 结果: 'avatars/user_123.jpg'

const docPath = getStoragePath('DOCUMENTS', 'report.pdf');
// 结果: 'documents/report.pdf'
```

### 7. 打开控制台

```typescript
import { CLOUDBASE_CONSOLE } from '../constants/cloudbase';

// 打开数据库控制台
window.open(CLOUDBASE_CONSOLE.DATABASE, '_blank');

// 打开云存储控制台
window.open(CLOUDBASE_CONSOLE.STORAGE, '_blank');
```

## 配置值

### 当前环境 (开发环境)

```typescript
环境ID: jihua-oa-dev-3goht9irae4d949f
云存储域名: 6a69-jihua-oa-dev-3goht9irae4d949f-1301818329.tcb.qcloud.la
Bucket: 6a69-jihua-oa-dev-3goht9irae4d949f-1301818329
```

### 云存储路径规范

```typescript
avatars/      - 用户头像
attachments/  - 任务附件
logos/        - 公司Logo
documents/    - 文档资料
```

## 环境切换

当需要切换到生产环境时，只需修改 `cloudbase.ts` 中的配置:

```typescript
// 修改前 (开发环境)
export const CLOUDBASE_ENV_ID = 'jihua-oa-dev-3goht9irae4d949f';

// 修改后 (生产环境)
export const CLOUDBASE_ENV_ID = 'cowork-9gg9oocb516be5fb';
```

所有使用这些配置的代码会自动使用新的环境。

## 最佳实践

### ✅ 推荐做法

1. **使用工具函数**: 始终使用 `getStoragePublicURL()` 等工具函数
2. **导入配置**: 从配置文件导入常量，不要硬编码
3. **类型安全**: 使用 `as const` 确保类型推断
4. **路径规范**: 使用 `getStoragePath()` 构造标准路径

### ❌ 避免的做法

1. **硬编码URL**: 直接写死域名和路径
2. **重复代码**: 在多处重复相同的URL构造逻辑
3. **字符串拼接**: 手动拼接URL，容易出错
4. **魔法数字**: 使用未定义的字符串常量

## 注意事项

1. **环境变量优先**: 代码会先读取环境变量 `VITE_CLOUDBASE_ENV_ID`，如果不存在才使用配置文件中的默认值
2. **类型安全**: 所有配置都使用 TypeScript 的类型系统，避免运行时错误
3. **不可变**: 配置对象使用 `as const`，确保配置不会被意外修改
4. **工具函数**: 提供完整的工具函数库，覆盖常见使用场景

## 相关文件

- `lib/cloudbase.ts` - CloudBase SDK初始化
- `cloudbaserc.json` - CloudBase项目配置
- `.env` - 环境变量配置

## 更新日志

- 2025-12-30: 创建配置文件，统一管理CloudBase配置
- 优化URL构造逻辑，避免硬编码
- 添加工具函数库，提高代码复用性
