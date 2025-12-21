/**
 * 离职人员数据交接云函数
 * 功能：
 * 1. 更新用户离职状态
 * 2. 转移数据权限（owner和collaborators）
 * 3. 记录交接操作日志
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { fromUserId, toUserId, leftAt } = event;

  console.log('📦 [数据交接] 开始执行', {
    fromUserId,
    toUserId,
    leftAt
  });

  try {
    // 1. 验证参数
    if (!fromUserId || !toUserId) {
      throw new Error('缺少必需参数: fromUserId 或 toUserId');
    }

    // 2. 验证交接对象状态（必须是在职）
    const toUserResult = await db.collection('users').doc(toUserId).get();
    if (!toUserResult.data) {
      throw new Error('交接对象不存在');
    }
    const toUser = toUserResult.data;
    if (toUser.status === '离职') {
      throw new Error('交接对象已离职，无法接收数据');
    }

    // 3. 更新离职用户状态
    console.log('🔄 [数据交接] 更新离职用户状态');
    await db.collection('users').doc(fromUserId).update({
      data: {
        status: '离职',
        handoverTo: toUserId,
        leftAt: new Date(leftAt),
        updatedAt: new Date()
      }
    });

    // 4. 数据权限转移
    const collections = ['tasks', 'opportunities', 'projects'];
    const transferResults = [];

    for (const collectionName of collections) {
      console.log(`🔄 [数据交接] 处理集合: ${collectionName}`);
      
      // 4.1 转移owner权限
      const ownerUpdateResult = await db.collection(collectionName)
        .where({
          owner: fromUserId
        })
        .update({
          data: {
            owner: toUserId,
            updatedAt: new Date()
          }
        });

      console.log(`  - 转移owner: ${ownerUpdateResult.stats.updated} 条`);

      // 4.2 转移collaborators权限
      // 查询包含离职用户的协同人记录
      const collaboratorDocs = await db.collection(collectionName)
        .where({
          collaborators: _.elemMatch(_.eq(fromUserId))
        })
        .get();

      let collaboratorUpdateCount = 0;
      if (collaboratorDocs.data && collaboratorDocs.data.length > 0) {
        for (const doc of collaboratorDocs.data) {
          // 替换协同人列表中的离职用户
          const newCollaborators = doc.collaborators
            .filter(id => id !== fromUserId)
            .concat(toUserId);
          
          // 去重
          const uniqueCollaborators = [...new Set(newCollaborators)];

          await db.collection(collectionName).doc(doc._id).update({
            data: {
              collaborators: uniqueCollaborators,
              updatedAt: new Date()
            }
          });
          collaboratorUpdateCount++;
        }
      }

      console.log(`  - 转移collaborators: ${collaboratorUpdateCount} 条`);

      transferResults.push({
        collection: collectionName,
        ownerTransferred: ownerUpdateResult.stats.updated,
        collaboratorTransferred: collaboratorUpdateCount
      });
    }

    // 5. 记录操作日志
    console.log('📝 [数据交接] 记录操作日志');
    await db.collection('operation_logs').add({
      data: {
        userId: fromUserId,
        module: '员工管理',
        action: '数据交接',
        content: `离职用户 ${fromUserId} 的数据已交接给 ${toUserId}`,
        metadata: {
          fromUserId,
          toUserId,
          leftAt: new Date(leftAt),
          transferResults
        },
        ipAddress: 'cloud-function',
        createdAt: new Date()
      }
    });

    // 6. 记录交接历史（用于可能的回滚）
    await db.collection('handover_history').add({
      data: {
        fromUserId,
        toUserId,
        leftAt: new Date(leftAt),
        transferResults,
        createdAt: new Date()
      }
    });

    console.log('✅ [数据交接] 完成', { transferResults });

    return {
      success: true,
      message: '数据交接成功',
      transferResults
    };

  } catch (error) {
    console.error('❌ [数据交接] 失败:', error);
    return {
      success: false,
      message: error.message || '数据交接失败',
      error: error.toString()
    };
  }
};
