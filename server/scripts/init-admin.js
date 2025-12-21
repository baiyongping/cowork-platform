/**
 * 初始化管理员账户脚本
 * 用于创建或更新admin用户的status字段
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// 用户Schema（简化版）
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  phone: String,
  avatar: String,
  status: {
    type: String,
    enum: ['在职', '离职', '休假'],
    default: '在职'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: String,
  lastLoginTime: Date
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function initAdmin() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jihua_oa_platform';
    console.log('连接数据库:', mongoUri);
    
    await mongoose.connect(mongoUri);
    
    console.log('数据库连接成功');

    // 查找admin用户
    let admin = await User.findOne({ username: 'admin' });

    if (admin) {
      // 更新现有admin用户
      console.log('找到admin用户，正在更新...');
      admin.status = '在职';
      admin.isActive = true;
      admin.name = admin.name || '系统管理员';
      admin.email = admin.email || 'admin@jihua.com';
      await admin.save();
      console.log('✅ admin用户更新成功');
      console.log('状态:', admin.status);
      console.log('激活:', admin.isActive);
    } else {
      // 创建新admin用户
      console.log('未找到admin用户，正在创建...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      admin = await User.create({
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        email: 'admin@jihua.com',
        phone: '13800138000',
        status: '在职',
        isActive: true,
        position: '管理员'
      });
      
      console.log('✅ admin用户创建成功');
      console.log('用户名: admin');
      console.log('密码: admin123');
    }

    // 显示用户信息
    console.log('\n当前admin用户信息:');
    console.log('ID:', admin._id);
    console.log('用户名:', admin.username);
    console.log('姓名:', admin.name);
    console.log('状态:', admin.status);
    console.log('激活:', admin.isActive);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  }
}

// 运行脚本
initAdmin();
