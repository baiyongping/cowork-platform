/**
 * 批量替换项目中的 alert() 和 confirm() 为新的对话框系统
 * 
 * 使用方法:
 * node scripts/replace-dialogs.js
 */

const fs = require('fs');
const path = require('path');

// 需要处理的文件列表
const filesToProcess = [
  // 已完成
  // 'components/TaskManagementPage.tsx',
  // 'components/UserApprovalPage.tsx',
  
  // 待处理 - 按优先级排序
  'components/EmployeeTrash.tsx',
  'components/EmployeeDetailModal.tsx',
  'components/GoalManagement.tsx',
  'components/TaskDetailModal.tsx',
  'components/ProjectDetailModal.tsx',
  'components/OpportunityDetailModal.tsx',
  'components/IssueDetailModal.tsx',
  'components/TaskRecycleBinDetail.tsx',
  'components/OpportunityRecycleBinDetail.tsx',
  'components/IssueRecycleBin.tsx',
  'components/CreateProjectModal.tsx',
  'components/CreateOpportunityModal.tsx',
  'components/CreateOpportunityFollowUpModal.tsx',
  'components/OpportunityRequirements.tsx',
  'components/OpportunityRecycleBin.tsx',
  'components/AttachmentUploader.tsx',
  'components/AttachmentViewer.tsx',
  'components/AssetBudgetItems.tsx',
  'components/CollaboratorSelector.tsx',
  'components/CreateIssueModal.tsx',
  'components/CreateOpportunityTaskModal.tsx',
  'components/CreateProjectFromOpportunityModal.tsx',
  'components/CreateProjectTaskModal.tsx',
  'components/CreateTaskModal.tsx',
  'components/EditIssueModal.tsx',
  'components/EditOpportunityModal.tsx',
  'components/EditProjectModal.tsx',
  'components/EditTaskModal.tsx',
  'components/IssueManagementPage.tsx',
  'components/LoginPage.tsx',
  'components/MessageCenter.tsx',
  'components/ProjectTaskList.tsx',
  'components/VerificationCodeModal.tsx',
  'components/pages/AssetBudgetManagement.tsx',
  'components/pages/OpportunityManagement.tsx',
  'components/pages/ProjectManagement.tsx',
  'components/pages/PurchaseBatchDetail.tsx'
];

// 替换规则
const replacements = [
  // alert 替换规则
  {
    pattern: /alert\(['"`](.+?)['"`]\);?/g,
    replacement: (match, p1) => {
      // 判断消息类型
      if (p1.includes('成功') || p1.includes('✅')) {
        return `await showSuccess('${p1.replace(/✅\s*/, '')}');`;
      } else if (p1.includes('失败') || p1.includes('错误') || p1.includes('❌')) {
        return `await showError('${p1.replace(/❌\s*/, '')}');`;
      } else if (p1.includes('警告') || p1.includes('⚠️') || p1.includes('无法') || p1.includes('不能')) {
        return `await showWarning('${p1.replace(/⚠️\s*/, '')}');`;
      } else {
        return `await showAlert('${p1}', 'info');`;
      }
    }
  },
  
  // confirm 替换规则
  {
    pattern: /const\s+(\w+)\s*=\s*confirm\((['"`])(.+?)\2\);?/g,
    replacement: 'const $1 = await showConfirm(\'$3\');'
  },
  {
    pattern: /if\s*\(confirm\((['"`])(.+?)\1\)\)/g,
    replacement: 'if (await showConfirm(\'$2\'))'
  }
];

// 确保导入语句存在
function ensureImports(content) {
  const importLine = "import { showAlert, showConfirm, showSuccess, showError, showWarning, toastSuccess, toastError } from '../lib/dialog-utils';";
  
  // 检查是否已经导入
  if (content.includes('dialog-utils')) {
    return content;
  }
  
  // 找到第一个 import 语句的位置
  const firstImportMatch = content.match(/^import\s+/m);
  if (firstImportMatch) {
    const insertPosition = firstImportMatch.index;
    return content.slice(0, insertPosition) + importLine + '\n' + content.slice(insertPosition);
  }
  
  // 如果没有找到 import，添加到文件开头
  return importLine + '\n' + content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  跳过不存在的文件: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // 检查是否包含 alert 或 confirm
    const hasAlert = /\balert\s*\(/.test(content);
    const hasConfirm = /\bconfirm\s*\(/.test(content);
    
    if (!hasAlert && !hasConfirm) {
      console.log(`✓ 跳过（无需处理）: ${filePath}`);
      return;
    }
    
    // 应用替换规则
    let changeCount = 0;
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changeCount += matches.length;
        if (typeof replacement === 'function') {
          content = content.replace(pattern, replacement);
        } else {
          content = content.replace(pattern, replacement);
        }
      }
    });
    
    // 确保导入语句
    if (changeCount > 0) {
      content = ensureImports(content);
    }
    
    // 如果内容有变化，写回文件
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ 已处理 (${changeCount}处): ${filePath}`);
    } else {
      console.log(`✓ 无变化: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath}`, error.message);
  }
}

// 主函数
function main() {
  console.log('🚀 开始批量替换对话框...\n');
  
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  filesToProcess.forEach(file => {
    try {
      processFile(file);
      processedCount++;
    } catch (error) {
      errorCount++;
    }
  });
  
  console.log('\n📊 处理完成！');
  console.log(`   处理文件: ${processedCount}`);
  console.log(`   跳过文件: ${skippedCount}`);
  console.log(`   错误数量: ${errorCount}`);
}

// 运行
main();