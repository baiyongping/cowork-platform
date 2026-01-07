import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Trash2, Calendar, MapPin, Users, User, 
  Clock, Save, Download, CheckCircle, AlertCircle, X, FileCheck 
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Meeting, MeetingMinutes, WorkItem } from '@/types/meeting';
import { callFunction } from '@/lib/cloudbase';

interface MeetingMinutesEditorProps {
  meeting: Meeting;
  onSave?: (minutes: MeetingMinutes) => void;
  onClose?: () => void;
}

const MeetingMinutesEditor: React.FC<MeetingMinutesEditorProps> = ({
  meeting,
  onSave,
  onClose
}) => {
  // 🔧 防御性检查：确保meeting有效
  if (!meeting) {
    console.error('❌ MeetingMinutesEditor: meeting prop is undefined');
    return (
      <div className="p-4 text-center text-red-600">
        错误：会议数据无效
      </div>
    );
  }

  const [minutesData, setMinutesData] = useState<MeetingMinutes>({
    summary: '',
    lastWeekWorkSummary: [],
    thisWeekWorkPlan: [],
    conclusion: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // 🔧 新增：使用useState管理议题数据，确保议题结论更新能触发UI刷新
  const [agendas, setAgendas] = useState<any[]>(meeting.agendas || []);

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await callFunction({
          name: 'user-management',
          data: { action: 'list' }
        });
        if (res.result.success) {
          setAllUsers(res.result.data);
        }
      } catch (error) {
        console.error('加载用户失败:', error);
      }
    };
    loadUsers();
  }, []);

  // 格式化时间的辅助函数（包含年月日时分）
  const formatDateTime = (dateTime: any): string => {
    if (!dateTime) return '时间待定';
    
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return '时间待定';
      }
      // 🔧 统一格式：YYYY年MM月DD日 HH:mm
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('时间格式化错误:', error);
      return '时间待定';
    }
  };

  // 获取参会人员列表
  const getParticipants = (): string[] => {
    // 优先使用 participants 字段
    if (meeting.participants && meeting.participants.length > 0) {
      return meeting.participants;
    }
    
    // 其次使用 attendees 字段
    if (meeting.attendees && meeting.attendees.length > 0) {
      return meeting.attendees;
    }
    
    // 最后使用组织者作为默认值
    if (meeting.organizer) {
      return [meeting.organizer];
    }
    
    return [];
  };

  // 初始化会议纪要数据
  useEffect(() => {
    console.log('🔧 初始化会议纪要数据，meeting:', meeting);
    
    if (meeting.minutesData) {
      console.log('📝 使用现有的会议纪要数据:', meeting.minutesData);
      setMinutesData(meeting.minutesData);
    } else {
      const participants = getParticipants();
      const formattedTime = formatDateTime(meeting.startTime || meeting.scheduledTime);
      const location = meeting.location || '会议室';
      
      // 自动生成会议概述
      const participantsText = participants.length > 0 
        ? participants.join('、') 
        : '会议参与人员';
        
      const summary = `${formattedTime}，在${location}召开了主题为"${meeting.title}"的会议，会上对${participantsText}的重点工作完成情况进行了总结汇报，并对重点工作任务进行了详细安排与部署，旨在明确工作目标，提高工作效率，确保各项工作有序推进，具体如下：`;
      
      const defaultMinutesData = {
        summary,
        lastWeekWorkSummary: participants.map(p => ({
          person: p,
          items: [''],
          completionDate: new Date().toLocaleDateString('zh-CN'),
          status: '完成'
        })),
        thisWeekWorkPlan: participants.map(p => ({
          person: p,
          items: [''],
          completionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')
        })),
        conclusion: '本次管理周例会明确了各成员本周的重点工作任务，希望大家严格按照会议要求，认真落实各项工作，积极沟通协作，确保工作目标顺利达成。'
      };
      
      console.log('📝 使用默认会议纪要数据:', defaultMinutesData);
      setMinutesData(defaultMinutesData);
    }
  }, [meeting]);

  // 添加工作项
  const addWorkItem = (type: 'lastWeek' | 'thisWeek', person: string) => {
    setMinutesData(prev => {
      const key = type === 'lastWeek' ? 'lastWeekWorkSummary' : 'thisWeekWorkPlan';
      const items = prev[key] || [];
      const existingItem = items.find(item => item.person === person);
      
      if (existingItem) {
        existingItem.items.push('');
      } else {
        items.push({
          person,
          items: [''],
          completionDate: type === 'lastWeek' 
            ? new Date().toLocaleDateString('zh-CN')
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
          status: type === 'lastWeek' ? '完成' : undefined
        });
      }
      
      return { ...prev, [key]: [...items] };
    });
  };

  // 更新工作项
  const updateWorkItem = (
    type: 'lastWeek' | 'thisWeek',
    personIndex: number,
    itemIndex: number,
    value: string
  ) => {
    setMinutesData(prev => {
      const key = type === 'lastWeek' ? 'lastWeekWorkSummary' : 'thisWeekWorkPlan';
      const items = [...(prev[key] || [])];
      if (items[personIndex]) {
        items[personIndex].items[itemIndex] = value;
      }
      return { ...prev, [key]: items };
    });
  };

  // 更新工作项状态
  const updateWorkItemStatus = (personIndex: number, status: string) => {
    setMinutesData(prev => {
      const items = [...(prev.lastWeekWorkSummary || [])];
      if (items[personIndex]) {
        items[personIndex].status = status;
      }
      return { ...prev, lastWeekWorkSummary: items };
    });
  };

  // 删除工作项
  const removeWorkItem = (type: 'lastWeek' | 'thisWeek', personIndex: number, itemIndex: number) => {
    setMinutesData(prev => {
      const key = type === 'lastWeek' ? 'lastWeekWorkSummary' : 'thisWeekWorkPlan';
      const items = [...(prev[key] || [])];
      if (items[personIndex]) {
        items[personIndex].items.splice(itemIndex, 1);
        if (items[personIndex].items.length === 0) {
          items.splice(personIndex, 1);
        }
      }
      return { ...prev, [key]: items };
    });
  };

  // 🔧 保存为草稿
  const handleSaveDraft = async () => {
    console.log('🔵 开始保存草稿...');
    
    // 🔧 防御性检查：确保 meeting 有效
    if (!meeting || !meeting._id) {
      console.error('❌ meeting 对象无效:', meeting);
      alert('错误：会议数据无效，无法保存草稿');
      return;
    }
    
    setIsSaving(true);
    try {
      // 🔧 准备保存的数据
      const saveData = {
        ...minutesData,
        status: 'draft', // 🔧 标记为草稿
        generatedAt: new Date(),
        generatedBy: meeting.recorder || meeting.organizer
      };

      console.log('📝 保存草稿数据:', {
        meetingId: meeting._id,
        meetingTitle: meeting.title,
        minutesDataKeys: Object.keys(saveData),
        minutesDataSize: JSON.stringify(saveData).length,
        agendasCount: agendas?.length || 0
      });

      console.log('🔵 调用云函数...');
      const callData = {
        action: 'update',
        _id: meeting._id, // 🔧 使用 _id 字段
        minutesData: saveData,
        agendas: agendas // 包含议题结论
      };
      
      console.log('📤 云函数调用参数:', {
        functionName: 'meeting-management',
        dataKeys: Object.keys(callData),
        hasMeetingId: !!callData._id,
        hasMinutesData: !!callData.minutesData,
        hasAgendas: !!callData.agendas
      });
      
      const res = await callFunction({
        name: 'meeting-management',
        data: callData
      });

      console.log('📝 保存草稿响应:', res);
      console.log('📝 响应详情:', JSON.stringify(res, null, 2));
      console.log('📝 响应类型检查:', {
        hasRes: !!res,
        hasResult: !!res?.result,
        resultType: typeof res?.result,
        resultKeys: res?.result ? Object.keys(res.result) : [],
        hasSuccess: res?.result?.success,
        hasData: res?.result?.data,
        dataKeys: res?.result?.data ? Object.keys(res.result.data) : []
      });

      if (res.result && res.result.success) {
        alert('草稿已保存');
        onSave?.(saveData);
      } else {
        // 🔧 修复：兼容多种错误响应格式
        const errorMsg = res.result?.message || res.result?.error || res.error || '保存失败';
        console.error('❌ 云函数返回失败:', errorMsg, res);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ 保存草稿失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      alert(error.message || '保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 🔧 生成纪要（发布正式纪要）
  const handlePublish = async () => {
    // 确认发布
    if (!confirm('生成正式纪要后将不可再编辑，确认生成吗？')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'update',
          _id: meeting._id, // 🔧 使用 _id 字段
          minutesData: {
            ...minutesData,
            status: 'published', // 🔧 标记为已发布
            generatedAt: new Date(),
            generatedBy: meeting.recorder || meeting.organizer
          },
          agendas: agendas // 包含议题结论
        }
      });

      if (res.result.success) {
        alert('会议纪要已生成');
        onSave?.(minutesData);
        onClose?.(); // 生成后关闭编辑器
      }
    } catch (error: any) {
      console.error('生成纪要失败:', error);
      alert(error.message || '生成失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 保存会议纪要（旧逻辑，保留兼容性）
  const handleSave = async () => {
    await handleSaveDraft();
  };

  // 导出会议纪要（简单文本格式）- 保留用于其他地方可能的调用
  const handleExport = () => {
    const content = generateMinutesContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}_会议纪要.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔧 获取议题类型的中文名称
  const getAgendaTypeName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'goal': '目标复盘',
      'task': '任务汇报',
      'opportunity': '商机分析',
      'project': '项目进展',
      'issue': '问题解决',
      'budget': '预算决策',
      'other': '其他议题'
    };
    return typeMap[type] || type;
  };

  // 生成会议纪要文本内容
  const generateMinutesContent = (): string => {
    const participants = getParticipants();
    const formattedTime = formatDateTime(meeting.scheduledTime || meeting.startTime);
    const location = meeting.location || '会议室';
    
    let content = '会议纪要\n\n';
    
    // 基本信息
    content += `会议时间：${formattedTime}\n`;
    content += `会议地点：${location}\n`;
    content += `会议组织：${meeting.organizer}\n`;
    content += `参会人员：${participants.length > 0 ? participants.join('、') : '暂无记录'}\n`;
    if (meeting.recorder) {
      content += `会议纪要：${meeting.recorder}\n`;
    }
    content += `会议主题：${meeting.title}\n`;
    content += '\n' + '—'.repeat(50) + '\n\n';
    
    // 纪要内容
    content += '纪要内容：\n\n';
    content += `    ${minutesData.summary}\n\n`;
    
    // 🔧 新增：按议题分组展示关联数据（使用state中的agendas）
    if (agendas && Array.isArray(agendas) && agendas.length > 0) {
      agendas.forEach((agenda, index) => {
        const chineseNumber = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][index] || `${index + 1}`;
        content += `${chineseNumber}、${agenda.title}\n`;
        
        // 显示关联数据
        if (agenda.relatedData && agenda.relatedData.length > 0) {
          agenda.relatedData.forEach((item: any, idx: number) => {
            content += `${idx + 1}. `;
            
            // 根据议题类型显示不同的数据格式
            if (agenda.type === 'task') {
              content += `关联任务：${item.name || item.title || '未命名'}`;
              if (item.owner) {
                content += `（负责人：${item.owner}）`;
              }
              if (item.status) {
                content += `（状态：${item.status}）`;
              }
            } else if (agenda.type === 'opportunity') {
              content += `关联商机：${item.customer || '未知客户'}`;
              if (item.amount) {
                content += `（金额：¥${item.amount}万）`;
              }
              if (item.stage) {
                content += `（阶段：${item.stage}）`;
              }
            } else if (agenda.type === 'project') {
              content += `关联项目：${item.name || '未命名项目'}`;
              if (item.customer) {
                content += `（客户：${item.customer}）`;
              }
              if (item.status) {
                content += `（状态：${item.status}）`;
              }
            } else if (agenda.type === 'issue') {
              content += `关联问题：${item.title || '未命名'}`;
              if (item.status) {
                content += `（状态：${item.status}）`;
              }
            } else {
              content += `${item.name || item.title || item.customer || '未命名'}`;
            }
            content += '\n';
          });
        } else if (agenda.content) {
          // 其他议题：显示议题内容
          content += `${agenda.content}\n`;
        }
        
        // 显示议题结论（如果有）
        if (agenda.conclusion) {
          content += `议题结论：${agenda.conclusion}\n`;
        }
        
        content += '\n';
      });
    } else {
      // 兼容旧数据格式：上周工作总结和本周工作计划
      if (minutesData.lastWeekWorkSummary && minutesData.lastWeekWorkSummary.length > 0) {
        content += '一、上周工作总结\n\n';
        content += '| 姓名 | 重点完成事项 | 计划完成时间 | 完成情况 |\n';
        content += '|------|-------------|--------------|----------|\n';
        
        minutesData.lastWeekWorkSummary.forEach(item => {
          if (item.items.length > 0) {
            item.items.forEach((taskItem, index) => {
              if (taskItem.trim()) {
                content += `| ${index === 0 ? item.person : ''} | ${taskItem} | ${index === 0 ? item.completionDate || '' : ''} | ${index === 0 ? item.status || '' : ''} |\n`;
              }
            });
          }
        });
        content += '\n';
      }
      
      if (minutesData.thisWeekWorkPlan && minutesData.thisWeekWorkPlan.length > 0) {
        content += '二、本周工作计划\n\n';
        content += '| 姓名 | 重点完成事项 | 完成时间 |\n';
        content += '|------|-------------|----------|\n';
        
        minutesData.thisWeekWorkPlan.forEach(item => {
          if (item.items.length > 0) {
            item.items.forEach((taskItem, index) => {
              if (taskItem.trim()) {
                content += `| ${index === 0 ? item.person : ''} | ${taskItem} | ${index === 0 ? item.completionDate || '' : ''} |\n`;
              }
            });
          }
        });
        content += '\n';
      }
    }
    
    // 会议总结
    if (minutesData.conclusion) {
      content += `    ${minutesData.conclusion}\n\n`;
    }
    
    content += '    （以下无正文）\n\n';
    content += `    ${meeting.organizer}\n`;
    content += `    ${new Date().toLocaleDateString('zh-CN')}\n\n`;
    content += '—'.repeat(50) + '\n\n';
    content += `主送：${participants.length > 0 ? participants.join('、') : '暂无记录'}\n`;
    
    return content;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">会议纪要</h2>
              <p className="text-sm text-gray-500 mt-1">{meeting.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 🔧 生成纪要按钮（原导出按钮） */}
            <Button variant="outline" onClick={handlePublish}>
              <FileCheck className="w-4 h-4 mr-1" />
              生成纪要
            </Button>
            {/* 🔧 保存为草稿按钮（原保存按钮） */}
            <Button onClick={handleSaveDraft} disabled={isSaving}>
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? '保存中...' : '保存为草稿'}
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 会议基本信息 */}
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-gray-500">会议时间</div>
                  <div className="font-medium">{formatDateTime(meeting.scheduledTime || meeting.startTime)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-gray-500">会议地点</div>
                  <div className="font-medium">{meeting.location || '会议室'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-gray-500">参会人员</div>
                  <div className="font-medium">
                    {(() => {
                      const participants = getParticipants();
                      return participants.length > 0 ? participants.join('、') : '暂无记录';
                    })()}
                  </div>
                </div>
              </div>
              
              {meeting.recorder && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-gray-500">会议纪要</div>
                    <div className="font-medium">{meeting.recorder}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 纪要内容 */}
          <div>
            <label className="block text-sm font-medium mb-2">纪要内容</label>
            <textarea
              value={minutesData.summary || ''}
              onChange={(e) => setMinutesData(prev => ({ ...prev, summary: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={4}
              placeholder="输入会议概述..."
            />
          </div>

          {/* 🔧 新增：会议议题与关联数据展示 */}
          {agendas && Array.isArray(agendas) && agendas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">会议议题</h3>
              <div className="space-y-4">
                {agendas.map((agenda, index) => {
                  const chineseNumber = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][index] || `${index + 1}`;
                  return (
                    <Card key={agenda.id || index} className="p-4">
                      {/* 议题标题 */}
                      <h4 className="text-base font-semibold mb-3">
                        {chineseNumber}、{agenda.title}
                      </h4>

                      {/* 关联数据列表 */}
                      {agenda.relatedData && Array.isArray(agenda.relatedData) && agenda.relatedData.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-2">关联内容：</div>
                          <ul className="space-y-1 pl-4">
                            {agenda.relatedData.map((item: any, idx: number) => (
                              <li key={item._id || idx} className="text-sm text-gray-700 flex items-start gap-1.5">
                                <span className="text-gray-400 mt-0.5">{idx + 1}.</span>
                                <span className="flex-1">
                                  {agenda.type === 'task' && (
                                    <>
                                      {item.name || item.title || '未命名任务'}
                                      {item.owner && <span className="text-gray-500 ml-1">（负责人：{item.owner}）</span>}
                                      {item.status && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          item.status === '已完成'
                                            ? 'bg-green-100 text-green-700'
                                            : item.status === '进行中'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.status}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {agenda.type === 'opportunity' && (
                                    <>
                                      {item.customer || '未知客户'}
                                      {item.amount && <span className="text-gray-500 ml-1">（金额：¥{item.amount}万）</span>}
                                      {item.stage && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          item.stage === '成交' ? 'bg-green-100 text-green-700' :
                                          item.stage === '商务谈判' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.stage}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {agenda.type === 'project' && (
                                    <>
                                      {item.name || '未命名项目'}
                                      {item.customer && <span className="text-gray-500 ml-1">（客户：{item.customer}）</span>}
                                      {item.status && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          item.status === '已完成' ? 'bg-green-100 text-green-700' :
                                          item.status === '交付期' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.status}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {agenda.type === 'issue' && (
                                    <>
                                      {item.title || '未命名问题'}
                                      {item.status && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          item.status === '已解决' ? 'bg-green-100 text-green-700' :
                                          item.status === '处理中' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.status}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {!['task', 'opportunity', 'project', 'issue'].includes(agenda.type) && (
                                    <>{item.name || item.title || item.customer || '未命名'}</>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 其他议题显示内容 */}
                      {agenda.type === 'other' && agenda.content && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-2">议题内容：</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {agenda.content}
                          </div>
                        </div>
                      )}

                      {/* 🔧 议题结论编辑 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          议题结论：
                        </label>
                        <textarea
                          value={agenda.conclusion || ''}
                          onChange={(e) => {
                            // 🔧 使用setAgendas更新，触发React重新渲染
                            const newValue = e.target.value;
                            setAgendas(prev => {
                              const updated = [...prev];
                              if (updated[index]) {
                                updated[index] = {
                                  ...updated[index],
                                  conclusion: newValue
                                };
                              }
                              return updated;
                            });
                            // 🔧 添加调试日志
                            console.log(`议题结论已更新 - 议题${index}:`, newValue);
                          }}
                          className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
                          rows={3}
                          placeholder="输入本议题的结论..."
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 兼容旧格式：上周工作总结和本周工作计划 */}
          {(!agendas || agendas.length === 0) && (
            <>
              {/* 上周工作总结 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">一、上周工作总结</h3>
                </div>
                
                <div className="space-y-4">
                  {minutesData.lastWeekWorkSummary?.map((personWork, personIndex) => (
                    <Card key={personIndex} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{personWork.person}</span>
                        <span className="text-sm text-gray-500">
                          计划完成时间：{personWork.completionDate}
                        </span>
                        <select
                          value={personWork.status || '完成'}
                          onChange={(e) => updateWorkItemStatus(personIndex, e.target.value)}
                          className="ml-auto px-2 py-1 border rounded text-sm"
                        >
                          <option value="完成">完成</option>
                          <option value="未完成，延续">未完成，延续</option>
                          <option value="未完成">未完成</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        {personWork.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateWorkItem('lastWeek', personIndex, itemIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                              placeholder="输入工作事项..."
                            />
                            <button
                              onClick={() => removeWorkItem('lastWeek', personIndex, itemIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addWorkItem('lastWeek', personWork.person)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          添加事项
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 本周工作计划 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">二、本周工作计划</h3>
                </div>
                
                <div className="space-y-4">
                  {minutesData.thisWeekWorkPlan?.map((personWork, personIndex) => (
                    <Card key={personIndex} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{personWork.person}</span>
                        <span className="text-sm text-gray-500">
                          完成时间：{personWork.completionDate}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {personWork.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateWorkItem('thisWeek', personIndex, itemIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                              placeholder="输入工作事项..."
                            />
                            <button
                              onClick={() => removeWorkItem('thisWeek', personIndex, itemIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addWorkItem('thisWeek', personWork.person)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          添加事项
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 会议总结 */}
          <div>
            <label className="block text-sm font-medium mb-2">会议总结</label>
            <textarea
              value={minutesData.conclusion || ''}
              onChange={(e) => setMinutesData(prev => ({ ...prev, conclusion: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
              placeholder="输入会议总结..."
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MeetingMinutesEditor;
