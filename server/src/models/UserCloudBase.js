/**
 * 用户模型 - CloudBase版本
 * 与前端共享CloudBase数据库
 */

const { db } = require('../config/cloudbase');
const bcrypt = require('bcryptjs');

class UserCloudBase {
  constructor() {
    this.collectionName = 'users';
  }

  /**
   * 获取集合引用
   */
  getCollection() {
    return db.collection(this.collectionName);
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    try {
      const res = await this.getCollection()
        .where({ username })
        .limit(1)
        .get();
      
      return res.data.length > 0 ? res.data[0] : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找用户
   */
  async findById(userId) {
    try {
      const res = await this.getCollection()
        .doc(userId)
        .get();
      
      return res.data.length > 0 ? res.data[0] : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone) {
    try {
      const res = await this.getCollection()
        .where({ phone })
        .limit(1)
        .get();
      
      return res.data.length > 0 ? res.data[0] : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async create(userData) {
    try {
      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const now = new Date();
      const userDoc = {
        username: userData.username,
        password: hashedPassword,
        name: userData.name || userData.username,
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || '',
        position: userData.position || '',
        departmentId: userData.departmentId || null,
        roleIds: userData.roleIds || [],
        status: '在职',
        isActive: true,
        approvalStatus: userData.approvalStatus || 'approved', // 默认已审核
        approvedBy: userData.approvedBy || null,
        approvedAt: userData.approvedAt || null,
        rejectReason: null,
        needChangePassword: false,
        lastLoginTime: null,
        createdAt: now,
        updatedAt: now
      };

      const res = await this.getCollection().add(userDoc);
      
      return {
        _id: res.id,
        ...userDoc
      };
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async update(userId, updateData) {
    try {
      // 如果更新密码，需要加密
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }

      updateData.updatedAt = new Date();

      const res = await this.getCollection()
        .doc(userId)
        .update(updateData);
      
      return res;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLoginTime(userId) {
    try {
      await this.getCollection()
        .doc(userId)
        .update({
          lastLoginTime: new Date()
        });
    } catch (error) {
      console.error('更新登录时间失败:', error);
      // 不抛出错误，避免影响登录流程
    }
  }

  /**
   * 比较密码
   */
  async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('密码比较失败:', error);
      return false;
    }
  }

  /**
   * 查询用户列表
   */
  async findAll(query = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      let queryBuilder = this.getCollection().where(query);
      
      // 排序
      queryBuilder = queryBuilder.orderBy(sortBy, sortOrder);
      
      // 分页
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      
      const res = await queryBuilder.get();
      const total = await this.count(query);
      
      return {
        data: res.data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('查询用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 统计用户数量
   */
  async count(query = {}) {
    try {
      const res = await this.getCollection()
        .where(query)
        .count();
      
      return res.total;
    } catch (error) {
      console.error('统计用户数量失败:', error);
      return 0;
    }
  }

  /**
   * 删除用户（软删除 - 设置为不活跃）
   */
  async softDelete(userId) {
    try {
      await this.update(userId, {
        isActive: false,
        status: '离职',
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 物理删除用户
   */
  async hardDelete(userId) {
    try {
      await this.getCollection()
        .doc(userId)
        .remove();
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }
}

module.exports = new UserCloudBase();
