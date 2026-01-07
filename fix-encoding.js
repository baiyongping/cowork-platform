const fs = require('fs');

const file = 'd:/project/cowork12-21/components/pages/GoalManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('原始文件包含的handleSaveSafeguard函数:', (content.match(/const handleSaveSafeguard = async/g) || []).length);

// 定义要保留的第一个函数
const functionPattern = `  const handleSaveSafeguard = async \\(data: Partial<SafeguardMeasure>\\) => {
    try {
      setLoading\\(true\\);
      
      if \\(editingSafeguard\\) {
        // 更新
        const updateRes = await db\\.collection\\('safeguard_measures'\\)\\.doc\\(editingSafeguard\\._id\\)\\.update\\({
          content: data\\.content,
          owner: data\\.owner,
          ownerId: data\\.ownerId,
          deadline: data\\.deadline,
          updatedAt: new Date\\(\\),
        }\\);
        
        if \\(updateRes\\.code\\) {
          console\\.error\\('❌ 更新保障措施失败:', updateRes\\.code, updateRes\\.message\\);
          showError\\('更新失败：' \\+ updateRes\\.message\\);
          return;
        }
        showSuccess\\('保障措施更新成功'\\);
      } else {
        // 新增
        const result = await db\\.collection\\('safeguard_measures'\\)\\.add\\({
          strategyId: currentStrategyId,
          year: selectedYear,
          content: data\\.content,
          owner: data\\.owner,
          ownerId: data\\.ownerId,
          deadline: data\\.deadline,
          completionRate: 0, // 初始为0
          status: '未开始',
          createdBy: currentUser\\._id,
          createdAt: new Date\\(\\),
          updatedAt: new Date\\(\\),
          isDeleted: false,
        }\\);
        
        if \\(result\\.code\\) {
          console\\.error\\('❌ 新增保障措施失败:', result\\.code, result\\.message\\);
          showError\\('新增失败：' \\+ result\\.message\\);
          return;
        }
        showSuccess\\('保障措施创建成功'\\);
      }
      
      // 关闭模态框并重置状态
      setShowSafeguardModal\\(false\\);
      setEditingSafeguard\\(null\\);
      setCurrentStrategyId\\(''\\);
      
      // TODO: 重新加载保障措施数据（如果需要在列表中显示）
    } catch \\(error\\) {
      console\\.error\\('保存保障措施失败:', error\\);
      showError\\('保存失败，请重试'\\);
    } finally {
      setLoading\\(false\\);
    }
  };`;

// 创建正则表达式,匹配所有重复(第2个开始)
const regex = new RegExp('\\n\\n' + functionPattern, 'g');

// 计算匹配次数
const matches = content.match(regex);
console.log('找到重复函数:', matches ? matches.length : 0);

// 删除所有重复(保留第一个)
content = content.replace(regex, '');

console.log('处理后包含的handleSaveSafeguard函数:', (content.match(/const handleSaveSafeguard = async/g) || []).length);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ 文件已更新');
