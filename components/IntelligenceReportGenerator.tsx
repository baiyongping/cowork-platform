import { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { db } from '../lib/cloudbase';
import type { CustomerIntelligence, IntelligenceReport } from '../types/customer-intelligence';
import { getIntelligenceTypeName } from '../types/customer-intelligence';

interface IntelligenceReportGeneratorProps {
  customerName: string;
  opportunityId?: string;
  customerId?: string;
  intelligenceList: CustomerIntelligence[];
  currentUserId: string;
  currentUserName?: string;
}

export default function IntelligenceReportGenerator({
  customerName,
  opportunityId,
  customerId,
  intelligenceList,
  currentUserId,
  currentUserName
}: IntelligenceReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<IntelligenceReport | null>(null);

  // 生成情报报告
  const handleGenerateReport = async () => {
    if (intelligenceList.length === 0) {
      alert('没有可用的情报数据');
      return;
    }

    setIsGenerating(true);

    try {
      // 按类型分组情报
      const groupedByType: Record<string, CustomerIntelligence[]> = {};
      intelligenceList.forEach(intel => {
        if (!groupedByType[intel.type]) {
          groupedByType[intel.type] = [];
        }
        groupedByType[intel.type].push(intel);
      });

      // 生成报告章节
      const sections = Object.entries(groupedByType).map(([type, items]) => {
        const content = items.map((item, idx) => {
          return `### ${idx + 1}. ${item.title}\n\n${item.summary || item.content}\n\n` +
                 `**关键词**: ${(item.keywords || []).join(', ')}\n` +
                 `**可靠度**: ${item.reliability || 0}分\n` +
                 (item.sourceUrl ? `**来源**: ${item.sourceUrl}\n` : '');
        }).join('\n\n---\n\n');

        return {
          title: getIntelligenceTypeName(type as any),
          type: type as any,
          content,
          intelligenceIds: items.map(item => item._id)
        };
      });

      // 生成总体摘要
      const summary = `本报告汇总了关于${customerName}的${intelligenceList.length}条情报信息，` +
                     `涵盖${sections.length}个方面。情报收集时间：${new Date().toLocaleDateString('zh-CN')}。`;

      // 生成完整报告
      const reportTitle = `${customerName} - 客户情报分析报告`;
      
      const reportMarkdown = `# ${reportTitle}\n\n` +
                            `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n` +
                            `**生成人**: ${currentUserName || '系统'}\n\n` +
                            `---\n\n` +
                            `## 报告摘要\n\n${summary}\n\n` +
                            `---\n\n` +
                            sections.map((section, idx) => {
                              return `## ${idx + 1}. ${section.title}\n\n${section.content}`;
                            }).join('\n\n---\n\n');

      // 保存报告到数据库
      const reportData: Partial<IntelligenceReport> = {
        customerId,
        opportunityId,
        customerName,
        title: reportTitle,
        summary,
        intelligenceIds: intelligenceList.map(item => item._id),
        sections,
        generatedBy: currentUserId,
        generatedByName: currentUserName,
        format: 'markdown',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('intelligence_reports').add({
        data: reportData
      });

      console.log('报告生成成功:', result);

      // 保存生成的报告
      setGeneratedReport({
        _id: result._id,
        ...reportData
      } as IntelligenceReport);

      // 下载Markdown文件
      downloadMarkdown(reportMarkdown, `${customerName}_情报报告_${Date.now()}.md`);

    } catch (error: any) {
      console.error('生成报告失败:', error);
      alert(`生成报告失败: ${error.message || '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 下载Markdown文件
  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出为HTML
  const handleExportHtml = () => {
    if (!generatedReport) {
      alert('请先生成报告');
      return;
    }

    // 构建HTML内容
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${generatedReport.title}</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #1a56db;
      border-bottom: 3px solid #1a56db;
      padding-bottom: 10px;
    }
    h2 {
      color: #1a56db;
      margin-top: 30px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    h3 {
      color: #374151;
      margin-top: 20px;
    }
    .meta {
      background-color: #f9fafb;
      padding: 15px;
      border-left: 4px solid #1a56db;
      margin: 20px 0;
    }
    .summary {
      background-color: #eff6ff;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .section {
      margin: 30px 0;
    }
    .divider {
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    .intelligence-item {
      background-color: #f9fafb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
      border-left: 3px solid #9ca3af;
    }
    .keywords {
      color: #6b7280;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .reliability {
      color: #059669;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>${generatedReport.title}</h1>
  
  <div class="meta">
    <p><strong>生成时间</strong>: ${new Date(generatedReport.createdAt).toLocaleString('zh-CN')}</p>
    <p><strong>生成人</strong>: ${generatedReport.generatedByName || '系统'}</p>
  </div>

  <div class="summary">
    <h2>报告摘要</h2>
    <p>${generatedReport.summary}</p>
  </div>

  <div class="divider"></div>

  ${generatedReport.sections.map((section, idx) => `
    <div class="section">
      <h2>${idx + 1}. ${section.title}</h2>
      ${section.content.split('\n\n---\n\n').map(item => `
        <div class="intelligence-item">
          ${item.replace(/###/g, '<h3>').replace(/\*\*/g, '<strong>').replace(/\n/g, '<br>')}
        </div>
      `).join('')}
    </div>
  `).join('<div class="divider"></div>')}
</body>
</html>
    `;

    // 下载HTML文件
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customerName}_情报报告_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          生成情报报告
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          基于已采集的 <strong className="text-blue-600">{intelligenceList.length}</strong> 条情报，
          为 <strong className="text-blue-600">{customerName}</strong> 生成综合分析报告。
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || intelligenceList.length === 0}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : generatedReport ? (
              <>
                <CheckCircle className="w-4 h-4" />
                重新生成报告
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                生成Markdown报告
              </>
            )}
          </Button>

          {generatedReport && (
            <Button
              onClick={handleExportHtml}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出HTML
            </Button>
          )}
        </div>

        {generatedReport && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            报告已生成并保存，Markdown文件已下载到本地
          </div>
        )}
      </CardContent>
    </Card>
  );
}
