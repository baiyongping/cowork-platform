# 例会管理模块 - 数据库设计文档

**版本**: v3.0  
**更新日期**: 2025-01-26

---

## 1. meetings 集合

### 1.1 字段定义

```typescript
interface Meeting {
  _id: string;                    // 会议ID (自动生成)
  title: string;                   // 会议标题 (必填, max: 100)
  type: MeetingType;               // 会议类型 (必填)
  status: MeetingStatus;           // 会议状态 (必填)
  startTime: Date;                 // 开始时间 (必填)
  endTime: Date;                   // 结束时间 (必填)
  location?: string;               // 会议地点 (可选, max: 100)
  isOnline: boolean;               // 是否线上会议 (必填)
  meetingLink?: string;            // 线上会议链接 (可选, max: 200)
  host: string;                    // 主持人ID (必填)
  participants: string[];          // 参会人员ID数组 (必填, min: 1)
  recorder?: string;               // 记录人ID (可选)
  
  // 会议议题 (v3.0 新增)
  agendaItems: MeetingAgendaItem[]; // 议题列表 (必填, min: 1)
  
  minutes?: string;                // 会议纪要 (可选)
  attachments?: string[];          // 附件URL数组 (可选)
  
  // 问题关联
  relatedIssues?: string[];        // 关联问题ID数组 (自动同步)
  
  // 元数据
  isDeleted?: boolean;             // 是否已删除 (软删除)
  deletedAt?: Date;                // 删除时间
  createdBy: string;               // 创建人ID (必填)
  createdAt: Date;                 // 创建时间 (自动生成)
  updatedAt: Date;                 // 更新时间 (自动更新)
}

// 会议议题
interface MeetingAgendaItem {
  id: string;                    // 议题ID (必填)
  title: string;                 // 议题标题 (必填, max: 100)
  type: AgendaType;              // 议题类型 (必填)
  order: number;                 // 议题顺序 (必填)
  
  // 汇报人 (必填, min: 1)
  presenters: string[];          // 汇报人ID数组
  
  // 根据议题类型关联不同业务对象
  relatedGoalIds?: string[];           // 关联季度目标ID (目标复盘)
  relatedGoalMeasureIds?: string[];    // 关联季度措施ID (目标复盘)
  
  relatedTeamTasks?: {                 // 团队任务汇报 (自动生成)
    thisWeek?: string[];               // 本周团队任务ID (周例会)
    nextWeek?: string[];               // 下周团队任务ID (周例会)
    thisMonth?: string[];              // 本月团队任务ID (月度例会)
    nextMonth?: string[];              // 下月团队任务ID (月度例会)
  };
  
  relatedOpportunityIds?: string[];    // 关联商机ID (商机分析)
  relatedProjectIds?: string[];        // 关联项目ID (项目分析)
  relatedIssueIds?: string[];          // 关联问题ID (问题解决)
  
  content?: string;                    // 议题内容 (其他议题, max: 1000)
  
  // 会议结论和新建任务
  conclusion?: string;                 // 会议结论 (可选, max: 1000)
  newTaskIds?: string[];               // 新建任务ID数组 (可选)
}

// 议题类型
type AgendaType = 
  | '目标复盘'        // 关联季度目标 + 季度措施
  | '团队任务汇报'    // 自动生成本周/本月 + 下周/下月团队任务列表
  | '商机分析'        // 关联商机
  | '项目分析'        // 关联项目
  | '问题解决'        // 关联问题
  | '其他议题';      // 自由文本

// 会议类型
type MeetingType = 
  | '周例会'
  | '月度例会'
  | '季度例会'
  | '专题会议'
  | '临时会议'
  | '项目评审会'
  | '目标复盘会';

// 会议状态
type MeetingStatus = 
  | '待召开'   // 会议创建，还未开始
  | '进行中'   // 会议正在进行
  | '已结束'   // 会议已结束，待整理纪要
  | '已完成'   // 纪要已整理完成
  | '已取消';  // 会议取消
```

### 1.2 索引设计

| 索引名称 | 字段 | 类型 | 用途 |
|---------|------|------|------|
| idx_startTime | startTime | 降序 | 按时间排序查询 |
| idx_status_startTime | status + startTime | 复合 | 按状态筛选 + 时间排序 |
| idx_host_startTime | host + startTime | 复合 | 查询某人主持的会议 |
| idx_participants_startTime | participants + startTime | 复合 | 查询某人参与的会议 |
| idx_isDeleted_startTime | isDeleted + startTime | 复合 | 过滤已删除会议 |
| idx_createdAt | createdAt | 降序 | 按创建时间排序 |
| idx_agendaItems_presenters | agendaItems.presenters | 数组 | 查询某人汇报的议题 |
| idx_agendaItems_type | agendaItems.type | 数组 | 按议题类型筛选 |

### 1.3 数据约束

#### 必填字段
- `title`: 会议标题
- `type`: 会议类型
- `status`: 会议状态
- `startTime`: 开始时间
- `endTime`: 结束时间
- `isOnline`: 是否线上会议
- `host`: 主持人ID
- `participants`: 参会人员ID数组 (至少1人)
- `agendaItems`: 议题列表 (至少1个议题)
- `createdBy`: 创建人ID

#### 字段验证规则
```javascript
// 时间验证
endTime > startTime

// 会议方式验证
if (isOnline) {
  meetingLink: required, max: 200
} else {
  location: required, max: 100
}

// 议题验证
agendaItems.length >= 1

// 每个议题的验证
for (let item of agendaItems) {
  // 基础字段
  item.title: required, max: 100
  item.type: required
  item.presenters.length >= 1
  
  // 根据议题类型验证
  if (item.type === '其他议题') {
    item.content: required, max: 1000
  }
}
```

---

## 2. 团队任务自动生成规则

### 2.1 周例会

**本周团队任务**:
```javascript
{
  level: '团队级',
  $or: [
    { startDate: { $gte: thisWeekStart, $lte: thisWeekEnd } },
    { endDate: { $gte: thisWeekStart, $lte: thisWeekEnd } }
  ]
}
```

**下周团队任务**:
```javascript
{
  level: '团队级',
  $or: [
    { startDate: { $gte: nextWeekStart, $lte: nextWeekEnd } },
    { endDate: { $gte: nextWeekStart, $lte: nextWeekEnd } }
  ]
}
```

### 2.2 月度例会

**本月团队任务**:
```javascript
{
  level: '团队级',
  $or: [
    { startDate: { $gte: thisMonthStart, $lte: thisMonthEnd } },
    { endDate: { $gte: thisMonthStart, $lte: thisMonthEnd } }
  ]
}
```

**下月团队任务**:
```javascript
{
  level: '团队级',
  $or: [
    { startDate: { $gte: nextMonthStart, $lte: nextMonthEnd } },
    { endDate: { $gte: nextMonthStart, $lte: nextMonthEnd } }
  ]
}
```

---

## 3. 数据迁移说明

### 3.1 从v2.0到v3.0的迁移

v3.0版本引入了议题化管理，需要将旧版本的会议数据迁移到新结构。

**迁移脚本**:
```javascript
// 迁移旧版本数据
const oldMeetings = await db.collection('meetings')
  .where({ agendaItems: _.exists(false) })
  .get();

for (let meeting of oldMeetings.data) {
  // 创建默认议题
  const defaultAgendaItem = {
    id: 'agenda-default',
    title: '会议内容',
    type: '其他议题',
    order: 1,
    presenters: [meeting.host],
    content: meeting.minutes || '',
    conclusion: '',
    newTaskIds: []
  };
  
  // 更新会议
  await db.collection('meetings').doc(meeting._id).update({
    data: {
      agendaItems: [defaultAgendaItem]
    }
  });
}
```

---

## 4. 性能优化建议

### 4.1 查询优化

1. **使用索引**: 所有查询必须命中至少一个索引
2. **限制返回字段**: 使用 `field()` 只返回需要的字段
3. **分页查询**: 使用 `skip()` 和 `limit()` 进行分页
4. **避免深度查询**: agendaItems 数组不宜过大 (建议 < 20个议题)

### 4.2 写入优化

1. **批量写入**: 使用事务批量创建会议和任务
2. **异步更新**: 关联业务数据异步更新，不阻塞主流程

---

## 5. 备份和恢复

### 5.1 备份策略

- 每天凌晨2点自动备份
- 保留最近30天的备份
- 重要会议数据实时备份

### 5.2 恢复策略

```javascript
// 恢复已删除的会议
await db.collection('meetings').doc(meetingId).update({
  data: {
    isDeleted: false,
    deletedAt: null
  }
});
```

---

**文档版本**: v3.0  
**最后更新**: 2025-01-26
