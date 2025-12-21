// 数据库调试工具
import { db } from './cloudbase';

export async function debugQueryAllUsers() {
  try {
    console.log('🐛 [调试] 开始查询所有用户...');
    const result = await db.collection('users').get();
    
    console.log('='.repeat(80));
    console.log('🐛 [调试] 数据库查询结果');
    console.log('='.repeat(80));
    console.log('📊 查询到的用户数量:', result.data?.length || 0);
    
    if (!result.data || result.data.length === 0) {
      console.log('❌ 数据库中没有用户数据');
      alert('❌ 数据库中没有用户数据！');
      return;
    }
    
    // 统计各状态数量
    const pending = result.data.filter((u: any) => u.approvalStatus === 'pending');
    const approved = result.data.filter((u: any) => u.approvalStatus === 'approved');
    const rejected = result.data.filter((u: any) => u.approvalStatus === 'rejected');
    
    console.log('\n📈 状态统计:');
    console.log('- 待审核(pending):', pending.length);
    console.log('- 已审核(approved):', approved.length);
    console.log('- 已拒绝(rejected):', rejected.length);
    
    console.log('\n👥 所有用户详细信息:');
    result.data.forEach((user: any, index: number) => {
      console.log(`\n--- 用户 ${index + 1} ---`);
      console.log('用户名:', user.username);
      console.log('姓名:', user.name);
      console.log('手机号:', user.phone);
      console.log('审核状态:', user.approvalStatus, '(类型:', typeof user.approvalStatus, ')');
      console.log('创建时间:', user.createdAt);
      console.log('_id:', user._id);
      console.log('完整对象:', user);
    });
    
    console.log('='.repeat(80));
    
    alert(`✅ 调试完成！\n\n共查询到 ${result.data.length} 个用户\n- 待审核: ${pending.length}\n- 已审核: ${approved.length}\n- 已拒绝: ${rejected.length}\n\n详细信息已输出到控制台（F12查看）`);
    
    return result.data;
  } catch (error: any) {
    console.error('❌ 调试查询失败:', error);
    alert(`❌ 查询失败: ${error.message}`);
    return null;
  }
}

// 暴露到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugQueryAllUsers = debugQueryAllUsers;
}
