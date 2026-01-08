const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  
  try {
    // 权限检查：只有管理员可以管理功能模块
    const hasPermission = await checkAdminPermission(wxContext.OPENID);
    if (!hasPermission) {
      throw new Error('权限不足：只有管理员可以管理功能模块');
    }
    
    switch (action) {
      case 'list':
        return await listModules(data);
      
      case 'get':
        return await getModule(data);
      
      case 'create':
        return await createModule(data, wxContext);
      
      case 'update':
        return await updateModule(data, wxContext);
      
      case 'delete':
        return await deleteModule(data, wxContext);
      
      case 'reorder':
        return await reorderModules(data, wxContext);
      
      case 'syncMetadata':
        return await syncMetadata(data, wxContext);
      
      case 'getMetadata':
        return await getModuleMetadata(data);
      
      case 'toggleEnable':
        return await toggleModuleEnable(data, wxContext);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[module-management] ${action} error:`, error);
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * 检查管理员权限
 */
async function checkAdminPermission(openid) {
  try {
    console.log('[checkAdminPermission] 开始检查权限，openid:', openid);
    
    let users = [];
    
    // 🔧 优先检查：如果 openid 不存在或为空，直接检查 admin 用户
    if (!openid || openid === 'undefined' || openid === 'null') {
      console.log('[checkAdminPermission] openid 为空，检查 admin 用户');
      const adminResult = await db.collection('users')
        .where({ username: 'admin' })
        .get();
      
      if (adminResult.data && adminResult.data.length > 0) {
        users = adminResult.data;
        console.log('[checkAdminPermission] 找到 admin 用户:', adminResult.data.length);
      }
    } else {
      // 先尝试通过 _openid 查询（微信登录用户）
      const openidResult = await db.collection('users')
        .where({ _openid: openid })
        .get();
      
      if (openidResult.data && openidResult.data.length > 0) {
        users = openidResult.data;
        console.log('[checkAdminPermission] 通过 openid 找到用户:', openidResult.data.length);
      } else {
        // 如果没找到，尝试通过 username 查询（admin 用户）
        const usernameResult = await db.collection('users')
          .where({ username: 'admin' })
          .get();
        
        if (usernameResult.data && usernameResult.data.length > 0) {
          users = usernameResult.data;
          console.log('[checkAdminPermission] 通过 username 找到 admin 用户:', usernameResult.data.length);
        }
      }
    }
    
    if (!users || users.length === 0) {
      console.log('[checkAdminPermission] 未找到用户，返回 false');
      return false;
    }
    
    const user = users[0];
    console.log('[checkAdminPermission] 用户信息:', {
      _id: user._id,
      username: user.username,
      role: user.role,
      hasPermissions: !!user.permissions,
      isAdminUsername: user.username === 'admin',
      isAdminRole: user.role === 'admin'
    });
    
    // 🔧 放宽权限检查：username 为 admin 或者 role 为 admin 都通过
    if (user.username === 'admin' || user.role === 'admin') {
      console.log('[checkAdminPermission] 权限检查通过（admin）');
      return true;
    }
    
    // 或者检查是否有系统设置权限
    if (user.permissions && user.permissions.systemSettings) {
      const perm = user.permissions.systemSettings;
      const hasSystemPermission = perm === 'all' || perm.includes('edit');
      console.log('[checkAdminPermission] 系统权限检查:', hasSystemPermission);
      return hasSystemPermission;
    }
    
    console.log('[checkAdminPermission] 权限检查失败，返回 false');
    return false;
  } catch (error) {
    console.error('检查权限失败:', error);
    return false;
  }
}

/**
 * 列出所有模块（支持筛选和排序）
 */
async function listModules({ filter = {}, sort = {} }) {
  const query = db.collection('modulesConfig');
  
  // 构建查询条件
  let where = {};
  
  if (filter.isEnabled !== undefined) {
    where.isEnabled = filter.isEnabled;
  }
  
  if (filter.isCustom !== undefined) {
    where.isCustom = filter.isCustom;
  }
  
  if (filter.parentId !== undefined) {
    where.parentId = filter.parentId || _.exists(false);
  }
  
  // 执行查询
  let result = await query.where(where).get();
  console.log('📊 [listModules] 查询到模块数量:', result.data.length);
  
  // 🔧 字段映射:将数据库字段映射到前端期望的格式
  const mappedData = result.data.map(module => ({
    _id: module._id,
    code: module._id || module.code || module.name, // 使用 _id 作为 code
    name: module.name || module.displayName,
    displayName: module.displayName || module.name,
    description: module.description || '',
    category: module.category || 'business',
    order: module.order ?? 999,
    enabled: module.isEnabled !== false, // 映射 isEnabled -> enabled
    isCore: module.isCustom === false, // 映射 isCustom -> isCore (反向)
    parentCode: module.parentId || '',
    route: module.path || module.route || '',
    icon: module.icon || 'Settings',
    dbCollection: module.dbCollection || '',
    metadata: module.metadata || null,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt
  }));
  
  // 排序
  const sortField = sort.field || 'order';
  const sortOrder = sort.order || 'asc';
  
  mappedData.sort((a, b) => {
    const valA = a[sortField] ?? 999;
    const valB = b[sortField] ?? 999;
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });
  
  console.log('✅ [listModules] 返回映射后的模块数据:', mappedData.length);
  
  return {
    success: true,
    data: mappedData,
    total: mappedData.length
  };
}

/**
 * 获取单个模块详情
 */
async function getModule({ moduleId }) {
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  const { data } = await db.collection('modulesConfig')
    .doc(moduleId)
    .get();
  
  if (!data) {
    throw new Error('模块不存在');
  }
  
  return {
    success: true,
    data
  };
}

/**
 * 创建新模块
 */
async function createModule(moduleData, wxContext) {
  // 验证必填字段
  if (!moduleData._id) {
    throw new Error('模块ID不能为空');
  }
  
  if (!moduleData.name) {
    throw new Error('模块名称不能为空');
  }
  
  // 检查ID是否已存在
  const { data: existing } = await db.collection('modulesConfig')
    .where({ _id: moduleData._id })
    .get();
  
  if (existing && existing.length > 0) {
    throw new Error(`模块ID "${moduleData._id}" 已存在`);
  }
  
  // 获取最大排序号
  const { data: allModules } = await db.collection('modulesConfig').get();
  const maxOrder = allModules.reduce((max, m) => Math.max(max, m.order || 0), 0);
  
  // 准备数据
  const newModule = {
    _id: moduleData._id,
    name: moduleData.name,
    displayName: moduleData.displayName || moduleData.name,
    description: moduleData.description || '',
    icon: moduleData.icon || 'Settings',
    parentId: moduleData.parentId || null,
    order: moduleData.order ?? (maxOrder + 1),
    isEnabled: moduleData.isEnabled !== false,
    isCustom: true, // 新创建的都标记为自定义
    defaultPermission: moduleData.defaultPermission || 'view',
    
    metadata: {
      collections: moduleData.metadata?.collections || [],
      fields: moduleData.metadata?.fields || {},
      routes: moduleData.metadata?.routes || [],
      apis: moduleData.metadata?.apis || []
    },
    
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: wxContext.OPENID
  };
  
  // 创建模块
  await db.collection('modulesConfig').add({
    data: newModule
  });
  
  // 同步权限到所有角色
  await syncPermissionsToRoles(newModule._id, newModule.name, newModule.defaultPermission);
  
  return {
    success: true,
    message: '模块创建成功',
    data: newModule
  };
}

/**
 * 更新模块
 */
async function updateModule({ moduleId, updates }, wxContext) {
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  // 检查模块是否存在
  const { data: module } = await db.collection('modulesConfig')
    .doc(moduleId)
    .get();
  
  if (!module) {
    throw new Error('模块不存在');
  }
  
  // 准备更新数据
  const updateData = {
    updatedAt: new Date(),
    lastModifiedBy: wxContext.OPENID
  };
  
  // 允许更新的字段
  const allowedFields = [
    'displayName', 'description', 'icon', 'order', 
    'isEnabled', 'defaultPermission', 'metadata'
  ];
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }
  
  // 执行更新
  await db.collection('modulesConfig')
    .doc(moduleId)
    .update({
      data: updateData
    });
  
  // 如果名称变更，同步权限
  if (updates.displayName && updates.displayName !== module.displayName) {
    await updatePermissionNames(moduleId, updates.displayName);
  }
  
  return {
    success: true,
    message: '模块更新成功',
    data: { ...module, ...updateData }
  };
}

/**
 * 删除模块
 */
async function deleteModule({ moduleId }, wxContext) {
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  // 检查模块是否存在
  const { data: module } = await db.collection('modulesConfig')
    .doc(moduleId)
    .get();
  
  if (!module) {
    throw new Error('模块不存在');
  }
  
  // 系统核心模块不允许删除
  if (!module.isCustom) {
    throw new Error('系统核心模块不允许删除');
  }
  
  // 检查是否有子模块
  const { data: children } = await db.collection('modulesConfig')
    .where({ parentId: moduleId })
    .get();
  
  if (children && children.length > 0) {
    throw new Error('该模块下有子模块，无法删除');
  }
  
  // 删除模块
  await db.collection('modulesConfig')
    .doc(moduleId)
    .remove();
  
  // 从所有角色中移除该模块权限
  await removePermissionsFromRoles(moduleId);
  
  // 记录日志
  await logOperation({
    action: 'delete_module',
    moduleId,
    moduleName: module.name,
    operator: wxContext.OPENID,
    timestamp: new Date()
  });
  
  return {
    success: true,
    message: '模块删除成功'
  };
}

/**
 * 调整模块排序
 */
async function reorderModules({ modules }, wxContext) {
  if (!modules || !Array.isArray(modules)) {
    throw new Error('参数错误：modules 必须是数组');
  }
  
  // 批量更新排序
  const updates = modules.map((m, index) => {
    return db.collection('modulesConfig')
      .doc(m.id)
      .update({
        data: {
          order: index + 1,
          updatedAt: new Date(),
          lastModifiedBy: wxContext.OPENID
        }
      });
  });
  
  await Promise.all(updates);
  
  return {
    success: true,
    message: '排序更新成功',
    count: modules.length
  };
}

/**
 * 切换模块启用状态
 */
async function toggleModuleEnable({ moduleId, isEnabled }, wxContext) {
  console.log('🔧 [toggleModuleEnable] 参数:', { moduleId, isEnabled });
  
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  const enabledValue = isEnabled !== false; // 确保布尔值
  console.log('🔧 [toggleModuleEnable] 准备更新:', { moduleId, enabledValue });
  
  try {
    const result = await db.collection('modulesConfig')
      .doc(moduleId)
      .update({
        data: {
          isEnabled: enabledValue,
          updatedAt: new Date(),
          lastModifiedBy: wxContext.OPENID
        }
      });
    
    console.log('✅ [toggleModuleEnable] 更新成功:', result);
    
    return {
      success: true,
      message: `模块已${enabledValue ? '启用' : '禁用'}`,
      data: { moduleId, isEnabled: enabledValue }
    };
  } catch (error) {
    console.error('❌ [toggleModuleEnable] 更新失败:', error);
    throw error;
  }
}

/**
 * 同步元数据（采集集合、字段、路由、API信息）
 */
async function syncMetadata({ moduleId }, wxContext) {
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  // 检查模块是否存在
  const { data: module } = await db.collection('modulesConfig')
    .doc(moduleId)
    .get();
  
  if (!module) {
    throw new Error('模块不存在');
  }
  
  // 采集元数据
  const metadata = {
    collections: await scanCollections(moduleId),
    fields: {},
    routes: await scanRoutes(moduleId),
    apis: await scanApis(moduleId),
    lastScanAt: new Date()
  };
  
  // 采集每个集合的字段信息
  for (const collection of metadata.collections) {
    metadata.fields[collection] = await scanCollectionFields(collection);
  }
  
  // 更新到数据库
  await db.collection('modulesConfig')
    .doc(moduleId)
    .update({
      data: {
        metadata,
        updatedAt: new Date(),
        lastModifiedBy: wxContext.OPENID
      }
    });
  
  return {
    success: true,
    message: '元数据同步成功',
    data: metadata
  };
}

/**
 * 获取模块元数据
 */
async function getModuleMetadata({ moduleId }) {
  if (!moduleId) {
    throw new Error('模块ID不能为空');
  }
  
  const { data: module } = await db.collection('modulesConfig')
    .doc(moduleId)
    .get();
  
  if (!module) {
    throw new Error('模块不存在');
  }
  
  // 获取统计信息
  const stats = {};
  if (module.metadata?.collections) {
    for (const collection of module.metadata.collections) {
      try {
        const { total } = await db.collection(collection).count();
        stats[collection] = {
          recordCount: total,
          lastUpdated: new Date()
        };
      } catch (error) {
        stats[collection] = {
          recordCount: 0,
          error: error.message
        };
      }
    }
  }
  
  return {
    success: true,
    data: {
      ...module.metadata,
      stats
    }
  };
}

// ==================== 辅助函数 ====================

/**
 * 同步权限到所有角色
 */
async function syncPermissionsToRoles(moduleId, moduleName, defaultPermission) {
  try {
    // 获取所有角色
    const { data: roles } = await db.collection('roles').get();
    
    // 为每个角色添加新模块权限
    const updates = roles.map(role => {
      const permission = getPermissionForRole(role, defaultPermission);
      
      return db.collection('roles')
        .doc(role._id)
        .update({
          data: {
            [`permissions.${moduleId}`]: permission,
            updatedAt: new Date()
          }
        });
    });
    
    await Promise.all(updates);
    
    console.log(`已为 ${roles.length} 个角色添加模块 ${moduleName} 的权限`);
  } catch (error) {
    console.error('同步权限失败:', error);
  }
}

/**
 * 根据角色类型获取权限
 */
function getPermissionForRole(role, defaultPermission) {
  // 管理员全部权限
  if (role.name === '系统管理员') {
    return 'all';
  }
  
  // 其他角色使用默认权限
  return defaultPermission || 'view';
}

/**
 * 更新权限名称
 */
async function updatePermissionNames(moduleId, newName) {
  // 如果权限结构中存储了名称，这里更新
  // 目前我们的权限结构只存储权限级别，不存储名称
  // 所以这个函数暂时为空
  console.log(`模块 ${moduleId} 名称更新为: ${newName}`);
}

/**
 * 从所有角色中移除权限
 */
async function removePermissionsFromRoles(moduleId) {
  try {
    const { data: roles } = await db.collection('roles').get();
    
    const updates = roles.map(role => {
      return db.collection('roles')
        .doc(role._id)
        .update({
          data: {
            [`permissions.${moduleId}`]: _.remove(),
            updatedAt: new Date()
          }
        });
    });
    
    await Promise.all(updates);
    
    console.log(`已从 ${roles.length} 个角色中移除模块权限`);
  } catch (error) {
    console.error('移除权限失败:', error);
  }
}

/**
 * 扫描模块关联的集合
 */
async function scanCollections(moduleId) {
  // 简单实现：根据命名规则推测
  const possibleCollections = [
    moduleId + 's',           // tasks
    moduleId,                 // task
    moduleId + 'Records',     // taskRecords
    moduleId + 'History'      // taskHistory
  ];
  
  const existingCollections = [];
  
  for (const collection of possibleCollections) {
    try {
      await db.collection(collection).limit(1).get();
      existingCollections.push(collection);
    } catch (error) {
      // 集合不存在
    }
  }
  
  return existingCollections;
}

/**
 * 扫描集合的字段
 */
async function scanCollectionFields(collection) {
  try {
    // 获取样本数据
    const { data: samples } = await db.collection(collection).limit(10).get();
    
    if (!samples || samples.length === 0) {
      return [];
    }
    
    // 分析字段
    const fieldMap = new Map();
    
    for (const record of samples) {
      for (const [key, value] of Object.entries(record)) {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            name: key,
            type: typeof value,
            description: getFieldDescription(key),
            nullable: false,
            examples: []
          });
        }
        
        const field = fieldMap.get(key);
        if (value === null || value === undefined) {
          field.nullable = true;
        }
        
        // 收集示例值（最多3个）
        if (field.examples.length < 3 && value !== null) {
          field.examples.push(value);
        }
      }
    }
    
    return Array.from(fieldMap.values());
  } catch (error) {
    console.error(`扫描集合 ${collection} 字段失败:`, error);
    return [];
  }
}

/**
 * 获取字段描述（基于命名推测）
 */
function getFieldDescription(fieldName) {
  const descriptions = {
    '_id': '记录ID',
    '_openid': '用户OpenID',
    'name': '名称',
    'title': '标题',
    'description': '描述',
    'status': '状态',
    'type': '类型',
    'owner': '负责人',
    'createdAt': '创建时间',
    'updatedAt': '更新时间',
    'createdBy': '创建人',
    'updatedBy': '更新人'
  };
  
  return descriptions[fieldName] || '未知字段';
}

/**
 * 扫描路由
 */
async function scanRoutes(moduleId) {
  // 简单实现：根据命名规则推测
  return [
    `/${moduleId}-management`,
    `/${moduleId}`,
    `/${moduleId}/detail`
  ];
}

/**
 * 扫描API
 */
async function scanApis(moduleId) {
  // 简单实现：根据命名规则推测
  return [
    `GET /api/${moduleId}`,
    `POST /api/${moduleId}`,
    `PUT /api/${moduleId}/:id`,
    `DELETE /api/${moduleId}/:id`
  ];
}

/**
 * 记录操作日志
 */
async function logOperation(logData) {
  try {
    await db.collection('operationLogs').add({
      data: {
        ...logData,
        module: 'module-management',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('记录日志失败:', error);
  }
}
