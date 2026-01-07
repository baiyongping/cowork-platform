import React, { useRef } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Meeting, MeetingMinutes } from '../types/meeting';
import { Card } from './ui/card';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MeetingMinutesViewerProps {
  meeting: Meeting;
  onEdit: () => void;
}

/**
 * 会议纪要查看器
 * - 显示会议纪要详情内容
 * - 根据纪要状态显示不同按钮（草稿显示编辑，已发布显示导出PDF）
 */
const MeetingMinutesViewer: React.FC<MeetingMinutesViewerProps> = ({
  meeting,
  onEdit
}) => {
  const minutesData = meeting.minutesData;
  const isDraft = !minutesData?.status || minutesData.status === 'draft';
  const contentRef = useRef<HTMLDivElement>(null);

  // 导出PDF（使用html2canvas解决中文乱码问题）
  const handleExportPDF = async () => {
    console.log('开始导出PDF...');
    console.log('contentRef.current:', contentRef.current);
    
    if (!contentRef.current) {
      console.error('contentRef.current 为空');
      alert('内容尚未加载，请稍后再试');
      return;
    }
    
    let loadingMsg: HTMLElement | null = null;
    
    try {
      // 显示加载提示
      loadingMsg = document.createElement('div');
      loadingMsg.textContent = '正在生成PDF，请稍候...';
      loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px;background:#000;color:#fff;border-radius:8px;z-index:9999;';
      document.body.appendChild(loadingMsg);

      console.log('开始html2canvas转换...');
      
      // 临时移除可能包含 oklch 颜色的元素样式
      const originalStyles: Array<{ element: HTMLElement; style: string }> = [];
      const allElements = contentRef.current.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        
        // 检查是否有 oklch 颜色
        if (computedStyle.color?.includes('oklch') || 
            computedStyle.backgroundColor?.includes('oklch') ||
            computedStyle.borderColor?.includes('oklch')) {
          originalStyles.push({
            element: htmlEl,
            style: htmlEl.style.cssText
          });
          
          // 转换为兼容的颜色格式
          if (computedStyle.color?.includes('oklch')) {
            htmlEl.style.color = '#000000';
          }
          if (computedStyle.backgroundColor?.includes('oklch')) {
            htmlEl.style.backgroundColor = '#ffffff';
          }
          if (computedStyle.borderColor?.includes('oklch')) {
            htmlEl.style.borderColor = '#e5e7eb';
          }
        }
      });
      
      // 使用html2canvas将内容转换为canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // 提高清晰度
        useCORS: true,
        logging: false, // 关闭日志减少干扰
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 在克隆的文档中移除所有 oklch 颜色
          const clonedElements = clonedDoc.querySelectorAll('*');
          clonedElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const style = htmlEl.style;
            
            // 替换 oklch 颜色为标准颜色
            if (style.color?.includes('oklch')) {
              style.color = '#000000';
            }
            if (style.backgroundColor?.includes('oklch')) {
              style.backgroundColor = '#ffffff';
            }
            if (style.borderColor?.includes('oklch')) {
              style.borderColor = '#e5e7eb';
            }
          });
        }
      });
      
      // 恢复原始样式
      originalStyles.forEach(({ element, style }) => {
        element.style.cssText = style;
      });

      console.log('Canvas生成成功, 尺寸:', canvas.width, 'x', canvas.height);

      // 创建PDF
      const imgWidth = 210; // A4宽度(mm)
      const pageHeight = 297; // A4高度(mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      console.log('创建PDF文档...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // 添加图片到PDF
      const imgData = canvas.toDataURL('image/png');
      console.log('添加图片到PDF...');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果内容超过一页，分页处理
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 保存PDF
      const filename = `${meeting.title}-会议纪要.pdf`;
      console.log('保存PDF:', filename);
      pdf.save(filename);
      
      console.log('PDF导出成功！');
    } catch (error) {
      console.error('导出PDF失败，详细错误:', error);
      console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
      alert(`导出PDF失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      // 移除加载提示
      if (loadingMsg && document.body.contains(loadingMsg)) {
        document.body.removeChild(loadingMsg);
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">会议纪要</h3>
        {isDraft && meeting.status === '已结束' ? (
          <Button size="sm" onClick={onEdit}>
            <span>编辑</span>
          </Button>
        ) : !isDraft && (
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-1" />
            导出PDF
          </Button>
        )}
      </div>

      {!minutesData ? (
        <div className="text-center py-12 text-gray-500">
          暂无会议纪要，结束会议后将自动生成
        </div>
      ) : (
        <div ref={contentRef} className="space-y-6" style={{ padding: '20px', backgroundColor: 'white' }}>
          {/* 会议概述 */}
          {minutesData.summary && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-900">会议概述：</h4>
              <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {minutesData.summary}
              </div>
            </div>
          )}

          {/* 议题讨论详情 */}
          {minutesData.agendaDetails && minutesData.agendaDetails.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 text-gray-900">议题讨论详情：</h4>
              <div className="space-y-4">
                {minutesData.agendaDetails.map((agenda: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">
                        {index + 1}. {agenda.title}
                      </h5>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {agenda.type}
                      </span>
                    </div>
                    {agenda.description && (
                      <div className="text-sm text-gray-600 mb-2">
                        议题描述：{agenda.description}
                      </div>
                    )}
                    <div className="text-sm bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-blue-900">结论：</span>
                      <span className="text-blue-800">{agenda.conclusion || '无'}</span>
                    </div>
                    {agenda.relatedCount > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        关联内容：{agenda.relatedCount} 项
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 会议元数据 */}
          {(minutesData.meetingTime || minutesData.meetingLocation || minutesData.host) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 text-gray-900">会议信息：</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {minutesData.meetingTime && (
                  <div>
                    <span className="font-medium">会议时间：</span>
                    {minutesData.meetingTime}
                  </div>
                )}
                {minutesData.meetingLocation && (
                  <div>
                    <span className="font-medium">会议地点：</span>
                    {minutesData.meetingLocation}
                  </div>
                )}
                {minutesData.host && (
                  <div>
                    <span className="font-medium">会议主持：</span>
                    {minutesData.host}
                  </div>
                )}
                {minutesData.recorder && (
                  <div>
                    <span className="font-medium">会议记录：</span>
                    {minutesData.recorder}
                  </div>
                )}
              </div>
              {minutesData.attendees && minutesData.attendees.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">参会人员：</span>
                  {minutesData.attendees.join('、')}
                </div>
              )}
            </div>
          )}

          {/* 生成信息 */}
          {(minutesData.generatedAt || minutesData.generatedBy) && (
            <div className="text-xs text-gray-400 text-center border-t pt-3">
              {minutesData.generatedAt && (
                <span>生成时间：{new Date(minutesData.generatedAt).toLocaleString('zh-CN')}</span>
              )}
              {minutesData.generatedBy && (
                <span className="ml-4">操作人：{minutesData.generatedBy}</span>
              )}
            </div>
          )}

          {/* 🔧 按议题展示关联数据 */}
          {meeting.agendas && Array.isArray(meeting.agendas) && meeting.agendas.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">会议议题</h4>
              <div className="space-y-6">
                {meeting.agendas.map((agenda: any, index: number) => {
                  // 获取议题标题
                  const agendaTitle = agenda.title || agenda.topic || `议题 ${index + 1}`;
                  
                  // 获取议题类型
                  const agendaTypeMap: Record<string, string> = {
                    'goal': '目标复盘',
                    'task': '任务汇报',
                    'opportunity': '商机分析',
                    'project': '项目进展',
                    'issue': '问题解决',
                    'budget': '预算决策',
                    'other': '其他议题'
                  };
                  const agendaType = agendaTypeMap[agenda.type] || agenda.type;

                  // 中文数字序号
                  const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
                  const numberPrefix = chineseNumbers[index] || `${index + 1}`;

                  return (
                    <div key={agenda.id || index} className="border-l-4 border-blue-500 pl-4">
                      <h5 className="font-semibold text-gray-900 mb-2">
                        {numberPrefix}、{agendaTitle} ({agendaType})
                      </h5>
                      
                      {/* 议题内容 */}
                      {agenda.content && (
                        <div className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded">
                          {agenda.content}
                        </div>
                      )}

                      {/* 议题结论 */}
                      {agenda.conclusion && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">议题结论：</div>
                          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                            {agenda.conclusion}
                          </div>
                        </div>
                      )}

                      {/* 关联数据 - 这里可以添加关联数据的详细展示 */}
                      {agenda.relatedIds && agenda.relatedIds.length > 0 && (
                        <div className="text-xs text-gray-500">
                          关联数据：{agenda.relatedIds.length} 项
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🔧 兼容旧格式：上周工作总结和本周工作计划 */}
          {(!meeting.agendas || meeting.agendas.length === 0) && (
            <>
              {/* 上周工作总结 */}
              {minutesData.lastWeekWorkSummary && minutesData.lastWeekWorkSummary.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">一、上周工作总结</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-4 py-2 text-left">人员</th>
                          <th className="border px-4 py-2 text-left">重点完成事项</th>
                          <th className="border px-4 py-2 text-center">完成情况</th>
                        </tr>
                      </thead>
                      <tbody>
                        {minutesData.lastWeekWorkSummary.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border px-4 py-2">{item.person}</td>
                            <td className="border px-4 py-2">
                              <ul className="list-disc list-inside space-y-1">
                                {item.items.map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="border px-4 py-2 text-center">{item.status || '已完成'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 本周工作计划 */}
              {minutesData.thisWeekWorkPlan && minutesData.thisWeekWorkPlan.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">二、本周工作计划</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-4 py-2 text-left">人员</th>
                          <th className="border px-4 py-2 text-left">重点工作</th>
                          <th className="border px-4 py-2 text-center">计划完成时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {minutesData.thisWeekWorkPlan.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border px-4 py-2">{item.person}</td>
                            <td className="border px-4 py-2">
                              <ul className="list-disc list-inside space-y-1">
                                {item.items.map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="border px-4 py-2 text-center">{item.completionDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default MeetingMinutesViewer;
