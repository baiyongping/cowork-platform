/**
 * 用户管理云函数
 * 提供用户密码重置等管理功能
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  const app = cloudbase.init({
    env: cloudbase.SYMBOL_CURRENT_ENV
  });
  
  const db = app.database();
  const auth = app.auth();

  // ✅ 支持两种调用方式：
  // 1. { action: 'xxx', userId, ... } - 直接调用
  // 2. { action: 'xxx', data: { userId, ... } } - 包装调用
  const action = event.action || event.data?.action;
  const { userId, newPassword, password } = event.data || event;

  try {
    // 验证操作类型
    if (!action) {
      return {
        success: false,
        message: '缺少action参数'
      };
    }

    // 密码加密功能（用于前端加密回退）
    if (action === 'hashPassword') {
      if (!password) {
        return {
          success: false,
          message: '缺少password参数'
        };
      }

      const crypto = require('crypto');
      const SECRET_KEY = 'jihua-oa-platform-secret-key-2025'; // ✅ 修复：与前端保持完全一致
      const hash = crypto.createHash('sha256');
      hash.update(password + SECRET_KEY);
      const hashedPassword = hash.digest('hex');

      return {
        success: true,
        hash: hashedPassword
      };
    }

    // Admin密码重置功能(无需userId)
    if (action === 'resetAdminPassword') {
      if (!newPassword) {
        return {
          success: false,
          message: '缺少newPassword参数'
        };
      }

      try {
        // 查找admin用户
        const adminResult = await db.collection('users')
          .where({ username: 'admin' })
          .get();

        if (!adminResult.data || adminResult.data.length === 0) {
          return {
            success: false,
            message: 'admin用户不存在'
          };
        }

        const adminUser = adminResult.data[0];
        const userId = adminUser._id;

        // 使用SHA-256加密
        const crypto = require('crypto');
        const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';
        const hash = crypto.createHash('sha256');
        hash.update(newPassword + SECRET_KEY);
        const hashedPassword = hash.digest('hex');

        console.log('🔐 重置admin密码:', {
          userId,
          oldHash: adminUser.password.substring(0, 16) + '...',
          newHash: hashedPassword.substring(0, 16) + '...'
        });

        // 更新数据库
        await db.collection('users').doc(userId).update({
          password: hashedPassword,
          updatedAt: new Date()
        });

        console.log('✅ admin密码重置成功');

        return {
          success: true,
          message: 'admin密码重置成功',
          data: {
            userId,
            username: 'admin',
            newPasswordHash: hashedPassword
          }
        };
      } catch (error) {
        console.error('❌ admin密码重置失败:', error);
        return {
          success: false,
          message: '密码重置失败: ' + error.message
        };
      }
    }

    // 获取用户权限（多角色权限并集）
    if (action === 'getUserPermissions') {
      if (!userId) {
        return {
          success: false,
          message: '缺少userId参数'
        };
      }

      try {
        // 1. 查询用户信息
        const userResult = await db.collection('users').doc(userId).get();
        if (!userResult.data || userResult.data.length === 0) {
          return {
            success: false,
            message: '用户不存在'
          };
        }

        const user = userResult.data[0];
        
        // 2. 获取用户的所有角色（优先使用roles数组，兼容旧的role字段）
        let userRoles = [];
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          userRoles = user.roles;
        } else if (user.role) {
          userRoles = [user.role];
        } else {
          // 没有角色，返回空权限
          return {
            success: true,
            data: {
              userId: userId,
              roles: [],
              permissions: {}
            }
          };
        }

        console.log('👤 用户角色:', {
          userId,
          username: user.username,
          roles: userRoles
        });

        // 3. 查询所有角色的权限配置
        const rolePermissionsResult = await db.collection('role_permissions')
          .where({
            role: db.command.in(userRoles)
          })
          .get();

        if (!rolePermissionsResult.data || rolePermissionsResult.data.length === 0) {
          console.warn('⚠️ 未找到角色权限配置:', userRoles);
          return {
            success: true,
            data: {
              userId: userId,
              roles: userRoles,
              permissions: {}
            }
          };
        }

        // 4. 合并所有角色的权限（取并集）
        const mergedPermissions = {};
        
        rolePermissionsResult.data.forEach(roleConfig => {
          const rolePermissions = roleConfig.permissions || {};
          
          // 遍历该角色的所有模块权限
          Object.keys(rolePermissions).forEach(module => {
            if (!mergedPermissions[module]) {
              // 如果模块还不存在，直接添加
              mergedPermissions[module] = { ...rolePermissions[module] };
            } else {
              // 如果模块已存在，合并权限（取并集，即只要有一个角色有权限就有权限）
              const existingPerms = mergedPermissions[module];
              const newPerms = rolePermissions[module];
              
              Object.keys(newPerms).forEach(action => {
                // 取并集：只要有一个为true就为true
                existingPerms[action] = existingPerms[action] || newPerms[action];
              });
            }
          });
        });

        console.log('✅ 权限并集计算完成:', {
          userId,
          rolesCount: userRoles.length,
          modulesCount: Object.keys(mergedPermissions).length
        });

        return {
          success: true,
          data: {
            userId: userId,
            username: user.username,
            roles: userRoles,
            rolesDetail: rolePermissionsResult.data.map(r => ({ role: r.role, name: r.name })),
            permissions: mergedPermissions,
            calculatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('❌ 获取用户权限失败:', error);
        return {
          success: false,
          message: '获取权限失败: ' + error.message
        };
      }
    }

    // 密码重置功能
    if (action === 'resetPassword') {
      if (!userId) {
        return {
          success: false,
          message: '缺少userId参数'
        };
      }

      if (!newPassword) {
        return {
          success: false,
          message: '缺少newPassword参数'
        };
      }

      // 查询用户信息
      const userResult = await db.collection('users').doc(userId).get();
      if (!userResult.data || userResult.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      const user = userResult.data[0];
      const username = user.username;

      if (!username) {
        return {
          success: false,
          message: '用户名不存在'
        };
      }

      try {
        // 🔧 使用与前端登录相同的SHA-256加密方式
        const crypto = require('crypto');
        const SECRET_KEY = 'jihua-oa-platform-secret-key-2025'; // ✅ 修复：与前端保持完全一致
        
        // SHA-256加密
        const hash = crypto.createHash('sha256');
        hash.update(newPassword + SECRET_KEY);
        const hashedPassword = hash.digest('hex');
        
        // 直接更新数据库中的密码
        await db.collection('users').doc(userId).update({
          password: hashedPassword,
          updatedAt: new Date()
        });

        console.log(`✅ 密码重置成功: 用户 ${username} (ID: ${userId})`);

        return {
          success: true,
          message: '密码重置成功',
          data: {
            userId: userId,
            username: username
          }
        };
      } catch (error) {
        console.error('❌ 密码重置失败:', error);
        return {
          success: false,
          message: '密码重置失败: ' + error.message
        };
      }
    }

    // 软删除用户功能（放入回收站）
    if (action === 'softDelete') {
      if (!userId) {
        return {
          success: false,
          message: '缺少userId参数'
        };
      }

      try {
        // 1. 检查用户是否存在
        const userResult = await db.collection('users').doc(userId).get();
        if (!userResult.data || userResult.data.length === 0) {
          return {
            success: false,
            message: '用户不存在'
          };
        }

        const user = userResult.data[0];

        // 2. 防止删除admin用户
        if (user.username === 'admin') {
          return {
            success: false,
            message: '不能删除admin用户'
          };
        }

        // 3. 软删除：标记为已删除
        await db.collection('users').doc(userId).update({
          deleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        });

        console.log('✅ 用户软删除成功（已放入回收站）:', {
          userId,
          username: user.username,
          name: user.name
        });

        // 4. 记录操作日志
        await db.collection('operation_logs').add({
          userId: userId,
          module: '员工管理',
          action: '放入回收站',
          content: `将员工 ${user.name}(@${user.username}) 放入回收站`,
          ipAddress: context.SOURCE_IP || 'unknown',
          createdAt: new Date()
        });

        return {
          success: true,
          message: `用户 ${user.name} (@${user.username}) 已放入回收站`,
          data: {
            userId,
            username: user.username,
            name: user.name,
            deletedAt: new Date()
          }
        };
      } catch (error) {
        console.error('❌ 软删除用户失败:', error);
        return {
          success: false,
          message: '软删除失败: ' + error.message
        };
      }
    }

    // 删除用户功能
    if (action === 'delete') {
      if (!userId) {
        return {
          success: false,
          message: '缺少userId参数'
        };
      }

      try {
        // 1. 检查用户是否存在
        const userResult = await db.collection('users').doc(userId).get();
        if (!userResult.data || userResult.data.length === 0) {
          return {
            success: false,
            message: '用户不存在'
          };
        }

        const user = userResult.data[0];

        // 2. 防止删除admin用户
        if (user.username === 'admin') {
          return {
            success: false,
            message: '不能删除admin用户'
          };
        }

        // 3. 删除用户
        await db.collection('users').doc(userId).remove();

        console.log('✅ 用户删除成功:', {
          userId,
          username: user.username,
          name: user.name
        });

        return {
          success: true,
          message: `用户 ${user.name} (@${user.username}) 已删除`,
          data: {
            userId,
            username: user.username,
            name: user.name
          }
        };
      } catch (error) {
        console.error('❌ 删除用户失败:', error);
        return {
          success: false,
          message: '删除用户失败: ' + error.message
        };
      }
    }

    // 🔥 修改密码功能（用户自己修改）
    if (action === 'updatePassword') {
      try {
        const requestData = event.data || event;
        const { oldPassword, newPassword, userId } = requestData;
        
        console.log('📝 收到密码修改请求:', { userId: userId ? 'provided' : 'missing', hasOldPwd: !!oldPassword, hasNewPwd: !!newPassword });
        
        // 参数验证
        if (!oldPassword || !newPassword) {
          return { success: false, error: '缺少必要参数' };
        }
        
        if (!userId) {
          return { success: false, error: '缺少用户ID' };
        }
        
        // 1. 查询用户
        const userResult = await db.collection('users')
          .doc(userId)
          .get();
        
        if (!userResult.data || userResult.data.length === 0) {
          return { success: false, error: '用户不存在' };
        }
        
        const user = userResult.data[0];
        
        // 使用SHA-256加密验证旧密码
        const crypto = require('crypto');
        const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';
        const oldHash = crypto.createHash('sha256');
        oldHash.update(oldPassword + SECRET_KEY);
        const oldPasswordHash = oldHash.digest('hex');
        
        console.log('🔐 密码验证:', {
          username: user.username,
          storedHash: user.password.substring(0, 8) + '...',
          providedHash: oldPasswordHash.substring(0, 8) + '...',
          match: user.password === oldPasswordHash
        });
        
        if (user.password !== oldPasswordHash) {
          return { success: false, error: '原密码错误' };
        }
        
        // 2. 加密新密码
        const newHash = crypto.createHash('sha256');
        newHash.update(newPassword + SECRET_KEY);
        const newPasswordHash = newHash.digest('hex');
        
        // 3. 更新密码
        const updateResult = await db.collection('users')
          .doc(userId)
          .update({
            password: newPasswordHash,
            updatedAt: new Date()
          });
        
        console.log('✅ 密码修改成功:', {
          userId: user._id,
          username: user.username,
          updated: updateResult.updated
        });
        
        return { 
          success: true, 
          message: '密码修改成功',
          updated: updateResult.updated 
        };
        
      } catch (error) {
        console.error('❌ 修改密码错误:', error);
        return { 
          success: false, 
          error: error.message || '密码修改失败' 
        };
      }
    }

    // 🆕 更新用户个人信息（用户自己修改）
    if (action === 'updateProfile') {
      try {
        // 从 event 中获取数据（支持 event.data 和直接在 event 上的情况）
        const requestData = event.data || event;
        const { field, value, userId: webUserId } = requestData;
        
        console.log('📝 收到更新请求:', { field, value, webUserId });
        
        if (!field) {
          return { success: false, error: '缺少field参数' };
        }
        
        // 获取用户ID（支持Web和小程序）
        let userId;
        let useDocId = false; // 标记是否使用doc()方法
        
        if (webUserId) {
          // Web环境：直接使用传入的userId（_id字段）
          userId = webUserId;
          useDocId = true;
          console.log('🌐 Web环境 - 用户ID:', userId);
        } else {
          // 小程序环境：使用_openid
          const wxContext = auth.getWXContext();
          userId = wxContext.OPENID;
          console.log('📱 小程序环境 - OpenID:', userId);
        }
        
        if (!userId) {
          return { success: false, error: '未授权用户' };
        }
        
        // 验证用户是否存在
        let userResult;
        if (useDocId) {
          userResult = await db.collection('users').doc(userId).get();
          if (!userResult.data || userResult.data.length === 0) {
            return { success: false, error: '用户不存在' };
          }
        } else {
          userResult = await db.collection('users')
            .where({ _openid: userId })
            .get();
          if (userResult.data.length === 0) {
            return { success: false, error: '用户不存在' };
          }
        }
        
        const user = useDocId ? userResult.data[0] : userResult.data[0];
        
        // 手机号验证
        if (field === 'phone') {
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(value)) {
            return { success: false, error: '手机号格式不正确(11位数字,以1开头)' };
          }
        }
        
        // 更新字段
        let updateResult;
        if (useDocId) {
          updateResult = await db.collection('users')
            .doc(userId)
            .update({
              [field]: value,
              updatedAt: new Date()
            });
        } else {
          updateResult = await db.collection('users')
            .where({ _openid: userId })
            .update({
              [field]: value,
              updatedAt: new Date()
            });
        }
        
        console.log('✅ 个人信息更新成功:', {
          userId: user._id,
          username: user.username,
          field,
          value,
          updated: updateResult.updated
        });
        
        return { 
          success: true, 
          message: '信息更新成功',
          updated: updateResult.updated,
          data: {
            userId: user._id,
            field,
            value
          }
        };
        
      } catch (error) {
        console.error('❌ 更新个人信息错误:', error);
        return { 
          success: false, 
          error: error.message || '信息更新失败' 
        };
      }
    }

    // 🆕 获取所有用户列表
    if (action === 'getUsers') {
      try {
        console.log('📋 查询所有用户列表...');
        
        // 使用云函数的管理员权限查询所有用户（包括未审核和已删除的）
        const result = await db.collection('users')
          .orderBy('createdAt', 'desc')
          .get();
        
        console.log('✅ 用户列表查询成功:', {
          total: result.data.length,
          active: result.data.filter(u => u.status === 'active' && !u.deleted).length,
          pending: result.data.filter(u => u.status === 'pending').length,
          deleted: result.data.filter(u => u.deleted).length
        });
        
        return {
          success: true,
          data: result.data
        };
      } catch (error) {
        console.error('❌ 查询用户列表失败:', error);
        return {
          success: false,
          message: '查询用户列表失败: ' + error.message
        };
      }
    }

    return {
      success: false,
      message: '未知的操作类型: ' + action
    };
  } catch (error) {
    console.error('❌ 云函数执行失败:', error);
    return {
      success: false,
      message: '操作失败: ' + error.message
    };
  }
};
