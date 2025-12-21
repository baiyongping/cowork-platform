/**
 * 任务模型
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '任务标题不能为空'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['development', 'sales', 'project', 'daily'],
    default: 'daily'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // 人员相关
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '负责人不能为空']
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creatorName: {
    type: String,
    default: ''
  },
  collaboratorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 日期
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // 关联
  opportunityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // 其他
  tags: [String],
  attachments: [{
    name: String,
    url: String,
    size: Number,
    uploadTime: Date
  }],
  
  // 软删除
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 索引
taskSchema.index({ ownerId: 1, status: 1 });
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Task', taskSchema);
