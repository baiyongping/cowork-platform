import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';
import { callFunction, db } from '../lib/cloudbase';
import { toastError, toastSuccess } from '../lib/dialog-utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Meeting, Agenda } from '../types/meeting';
import TaskDetailModal from './TaskDetailModal';
import OpportunityDetailModal from './OpportunityDetailModal';
import ProjectDetailModal from './ProjectDetailModal';
import IssueDetailModal from './IssueDetailModal';

interface MeetingSessionModalProps {
  meeting: Meeting;
  onClose: () => void;
  onFinish: () => void; // 结束会议后的回调
}

interface AgendaConclusionState {
  [agendaId: string]: string;
}

const MeetingSessionModal: React.FC<MeetingSessionModalProps> = ({
  meeting,
  onClose,
  onFinish
}) => {
  const [expandedAgendaId, setExpandedAgendaId] = useState<string | null>(null);
  const [agendaConclusions, setAgendaConclusions] = useState<AgendaConclusionState>({});
  const [relatedDataMap, setRelatedDataMap] = useState<Record<string, any[]>>({});
  const [loadingRelatedData, setLoadingRelatedData] = useState<Record<string, boolean>>({});
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [detailModalType, setDetailModalType] = useState<string>('');
  const [finishing, setFinishing] = useState(false);
  
  // 防抖计时器
  const [saveTimers, setSaveTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // 初始化议题结论
  useEffect(() => {
    const initialConclusions: AgendaConclusionState = {};
    meeting.agendas?.forEach(agenda => {
      initialConclusions[agenda.id] = agenda.conclusion || '';
    });
    setAgendaConclusions(initialConclusions);
  }, [meeting]);

  // 加载关联数据（支持强制刷新）
  const loadRelatedData = async (agenda: Agenda, forceRefresh = false) => {
    const agendaType = agenda.type;
    const agendaId = agenda.id;

    if (relatedDataMap[agendaId] && !forceRefresh) {
      return; // 已加载过且不强制刷新
    }

    setLoadingRelatedData(prev => ({ ...prev, [agendaId]: true }));

    try {
      let collectionName = '';
      let relatedIds: string[] = [];

      // 根据议题类型确定集合名称和关联ID（支持英文简写和中文全称）
      switch (agendaType) {
        case 'goal':
        case '目标复盘':
          collectionName = 'goals';
          relatedIds = agenda.relatedIds || agenda.relatedGoals || [];
          break;
        case 'task':
        case '任务汇报':
          collectionName = 'tasks';
          relatedIds = agenda.relatedIds || agenda.relatedTasks || [];
          break;
        case 'opportunity':
        case '商机分析':
          collectionName = 'opportunities';
          relatedIds = agenda.relatedIds || agenda.relatedOpportunities || [];
          break;
        case 'project':
        case '项目进展':
          collectionName = 'projects';
          relatedIds = agenda.relatedIds || agenda.relatedProjects || [];
          break;
        case 'issue':
        case '问题解决':
          collectionName = 'issueRecords';
          relatedIds = agenda.relatedIds || agenda.relatedIssues || [];
          break;
        case 'budget':
        case '预算决策':
          collectionName = 'budgetSubjects';
          relatedIds = agenda.relatedIds || agenda.relatedBudgets || [];
          break;
        case 'other':
        case '其他议题':
        default:
          // 其他议题没有关联数据
          setRelatedDataMap(prev => ({ ...prev, [agendaId]: [] }));
          setLoadingRelatedData(prev => ({ ...prev, [agendaId]: false }));
          return;
      }

      console.log('加载关联数据:', {
        agendaId,
        agendaType,
        collectionName,
        relatedIds
      });

      if (!relatedIds.length) {
        setRelatedDataMap(prev => ({ ...prev, [agendaId]: [] }));
        setLoadingRelatedData(prev => ({ ...prev, [agendaId]: false }));
        return;
      }

      // 查询关联数据
      const result = await db.collection(collectionName)
        .where({
          _id: db.command.in(relatedIds)
        })
        .get();

      console.log('关联数据查询结果:', {
        agendaId,
        collectionName,
        resultCount: result.data.length,
        data: result.data
      });

      // 填充用户信息（对于任务、商机、项目、问题等有owner字段的数据）
      const dataWithUsers = await Promise.all(
        result.data.map(async (item: any) => {
          if (item.owner) {
            try {
              // 查询用户信息
              const userResult = await db.collection('users')
                .where({ _id: item.owner })
                .get();
              
              if (userResult.data && userResult.data.length > 0) {
                return {
                  ...item,
                  owner: userResult.data[0]
                };
              }
            } catch (err) {
              console.error('查询用户信息失败:', err);
            }
          }
          return item;
        })
      );

      setRelatedDataMap(prev => ({ ...prev, [agendaId]: dataWithUsers }));
    } catch (error: any) {
      console.error('加载关联数据失败:', error);
      toastError('加载关联数据失败');
    } finally {
      setLoadingRelatedData(prev => ({ ...prev, [agendaId]: false }));
    }
  };

  // 展开/收起议题
  const toggleAgenda = (agendaId: string) => {
    if (expandedAgendaId === agendaId) {
      setExpandedAgendaId(null);
    } else {
      setExpandedAgendaId(agendaId);
      const agenda = meeting.agendas?.find(a => a.id === agendaId);
      // 只要不是"其他议题"，都尝试加载关联数据
      if (agenda && agenda.type !== '其他议题') {
        loadRelatedData(agenda);
      }
    }
  };

  // 更新议题结论（实时保存到state和数据库，带防抖）
  const updateConclusion = async (agendaId: string, conclusion: string) => {
    // 1. 更新本地state（立即响应）
    setAgendaConclusions(prev => ({
      ...prev,
      [agendaId]: conclusion
    }));

    // 2. 清除之前的定时器
    if (saveTimers[agendaId]) {
      clearTimeout(saveTimers[agendaId]);
    }

    // 3. 设置新的定时器（3秒后保存）
    const newTimer = setTimeout(async () => {
      try {
        // 更新议题的结论字段
        const updatedAgendas = meeting.agendas?.map(agenda => 
          agenda.id === agendaId 
            ? { ...agenda, conclusion }
            : agenda
        );

        // 调用云函数保存
        await callFunction({
          name: 'meeting-management',
          data: {
            action: 'update',
            data: {
              _id: meeting._id,
              agendas: updatedAgendas
            }
          }
        });

        console.log('✅ 议题结论已自动保存:', { 
          agendaId, 
          conclusionPreview: conclusion.substring(0, 50) + (conclusion.length > 50 ? '...' : '')
        });
      } catch (error: any) {
        console.error('❌ 自动保存议题结论失败:', error);
        toastError('自动保存失败，请手动保存');
      }
    }, 3000); // 3秒防抖

    // 4. 更新计时器记录
    setSaveTimers(prev => ({
      ...prev,
      [agendaId]: newTimer
    }));
  };

  // 刷新当前展开议题的关联数据
  const refreshCurrentAgendaData = async () => {
    if (!expandedAgendaId) return;
    
    const agenda = meeting.agendas?.find(a => a.id === expandedAgendaId);
    if (agenda && agenda.type !== '其他议题') {
      console.log('🔄 刷新议题关联数据:', agenda.title);
      await loadRelatedData(agenda, true); // 强制刷新
    }
  };

  // 结束会议并生成会议纪要
  const handleFinishMeeting = async () => {
    if (finishing) return;

    // 确认对话框
    if (!confirm('确认结束会议吗？\n\n会议状态将变为"已结束"，所有议题结论将被保存为会议纪要。')) {
      return;
    }

    try {
      setFinishing(true);

      // 1. 更新所有议题的结论
      const updatedAgendas = meeting.agendas?.map(agenda => ({
        ...agenda,
        conclusion: agendaConclusions[agenda.id] || ''
      }));

      // 2. 生成会议纪要内容
      const minutesData = {
        // 会议概述（基于议题结论生成）
        summary: generateMeetingSummary(updatedAgendas || []),
        
        // 议题讨论详情
        agendaDetails: updatedAgendas?.map(agenda => ({
          title: agenda.title,
          type: agenda.type,
          description: agenda.description || '',
          conclusion: agenda.conclusion || '无',
          relatedCount: agenda.relatedIds?.length || 0
        })) || [],
        
        // 会议元数据
        meetingTitle: meeting.title,
        meetingTime: new Date(meeting.scheduledTime).toLocaleString('zh-CN'),
        meetingLocation: meeting.location || '未指定',
        host: meeting.host || '未指定',
        recorder: meeting.recorder || '未指定',
        attendees: meeting.attendees || [],
        
        // 生成信息
        status: 'published',
        generatedAt: new Date(),
        generatedBy: '系统自动生成'
      };

      // 3. 更新会议状态为"已结束"并保存纪要
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'update',
          data: {
            _id: meeting._id,
            status: '已结束',
            agendas: updatedAgendas,
            minutesData: minutesData
          }
        }
      });

      if (result.result.success) {
        toastSuccess('会议已结束，会议纪要已自动生成');
        onFinish();
        onClose();
      } else {
        toastError('结束会议失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error('结束会议失败:', error);
      toastError('结束会议失败：' + error.message);
    } finally {
      setFinishing(false);
    }
  };

  // 生成会议概述
  const generateMeetingSummary = (agendas: Agenda[]): string => {
    const meetingDate = new Date(meeting.scheduledTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });

    const attendeesList = meeting.attendees?.join('、') || '全体成员';
    const location = meeting.location || '会议室';

    let summary = `${meetingDate}，${attendeesList}在${location}召开了"${meeting.title}"。`;
    
    if (meeting.host) {
      summary += `会议由${meeting.host}主持。`;
    }

    // 汇总议题
    if (agendas.length > 0) {
      summary += `\n\n会议共讨论了${agendas.length}项议题：\n`;
      agendas.forEach((agenda, index) => {
        const agendaInfo = getAgendaInfo(agenda.type);
        summary += `\n${index + 1}. ${agendaInfo.label}：${agenda.title}`;
        if (agenda.conclusion) {
          summary += `\n   结论：${agenda.conclusion}`;
        }
      });
    }

    return summary;
  };

  // 查看关联内容详情
  const viewDetailItem = (item: any, type: string) => {
    // 将中文类型转换为英文key
    const typeKeyMap: Record<string, string> = {
      '目标复盘': 'goal',
      '任务汇报': 'task',
      '商机分析': 'opportunity',
      '项目进展': 'project',
      '问题解决': 'issue',
      '预算决策': 'budget',
      // 英文key保持不变
      'goal': 'goal',
      'task': 'task',
      'opportunity': 'opportunity',
      'project': 'project',
      'issue': 'issue',
      'budget': 'budget'
    };
    
    const typeKey = typeKeyMap[type] || type;
    console.log('打开详情:', { type, typeKey, item });
    
    setSelectedDetailItem(item);
    setDetailModalType(typeKey);
  };

  // 获取议题类型的图标和标签（支持英文简写和中文全称）
  const getAgendaInfo = (type: string) => {
    const typeMap: Record<string, { label: string; emoji: string; color: string }> = {
      'goal': { label: '目标复盘', emoji: '🎯', color: 'text-purple-600' },
      '目标复盘': { label: '目标复盘', emoji: '🎯', color: 'text-purple-600' },
      'task': { label: '任务汇报', emoji: '✅', color: 'text-blue-600' },
      '任务汇报': { label: '任务汇报', emoji: '✅', color: 'text-blue-600' },
      'opportunity': { label: '商机分析', emoji: '💼', color: 'text-green-600' },
      '商机分析': { label: '商机分析', emoji: '💼', color: 'text-green-600' },
      'project': { label: '项目进展', emoji: '📁', color: 'text-orange-600' },
      '项目进展': { label: '项目进展', emoji: '📁', color: 'text-orange-600' },
      'issue': { label: '问题解决', emoji: '⚠️', color: 'text-red-600' },
      '问题解决': { label: '问题解决', emoji: '⚠️', color: 'text-red-600' },
      'budget': { label: '预算决策', emoji: '💰', color: 'text-yellow-600' },
      '预算决策': { label: '预算决策', emoji: '💰', color: 'text-yellow-600' },
      'other': { label: '其他议题', emoji: '📝', color: 'text-gray-600' },
      '其他议题': { label: '其他议题', emoji: '📝', color: 'text-gray-600' }
    };
    return typeMap[type] || typeMap['other'] || { label: '未知类型', emoji: '❓', color: 'text-gray-600' };
  };

  // 渲染关联数据项（支持英文简写和中文全称）
  const renderRelatedItem = (item: any, type: string) => {
    const getDisplayName = () => {
      switch (type) {
        case 'goal':
        case '目标复盘':
          return item.name || '未命名目标';
        case 'task':
        case '任务汇报':
          return item.name || '未命名任务';
        case 'opportunity':
        case '商机分析':
          return item.customer || '未命名商机';
        case 'project':
        case '项目进展':
          return item.name || '未命名项目';
        case 'issue':
        case '问题解决':
          return item.description || '未命名问题';
        case 'budget':
        case '预算决策':
          return item.name || '未命名预算';
        default:
          return '未命名';
      }
    };

    const getStatusColor = (status: string) => {
      if (['已完成', '已成交', '已解决'].includes(status)) {
        return 'bg-green-100 text-green-700';
      } else if (['进行中', '谈判中'].includes(status)) {
        return 'bg-blue-100 text-blue-700';
      } else {
        return 'bg-gray-100 text-gray-600';
      }
    };

    return (
      <div
        key={item._id}
        onClick={() => viewDetailItem(item, type)}
        className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-medium text-gray-900 text-sm">{getDisplayName()}</div>
            {item.owner && (
              <div className="text-xs text-gray-500 mt-1">
                负责人：{typeof item.owner === 'object' && item.owner.name ? item.owner.name : item.owner}
              </div>
            )}
          </div>
          {item.status && (
            <span className={`ml-2 px-2 py-0.5 rounded text-xs whitespace-nowrap ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 全屏遮罩层 */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>📅 {new Date(meeting.scheduledTime).toLocaleString('zh-CN')}</span>
                <span>📍 {meeting.location || '未指定'}</span>
                {meeting.host && <span>👤 主持人：{meeting.host}</span>}
                {meeting.recorder && <span>✍️ 记录人：{meeting.recorder}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 议题列表 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {meeting.agendas && meeting.agendas.length > 0 ? (
              meeting.agendas.map((agenda, index) => {
                const agendaInfo = getAgendaInfo(agenda.type);
                const isExpanded = expandedAgendaId === agenda.id;
                const relatedData = relatedDataMap[agenda.id] || [];
                const isLoadingData = loadingRelatedData[agenda.id];

                return (
                  <Card key={agenda.id} className="overflow-hidden">
                    {/* 议题头部 */}
                    <div
                      onClick={() => toggleAgenda(agenda.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl ${agendaInfo.color}`}>
                          {agendaInfo.emoji}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {index + 1}. {agenda.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agendaInfo.label}
                            {agenda.duration && ` · ${agenda.duration}分钟`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agenda.conclusion && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ 已填写结论
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* 展开的议题内容 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                        {/* 议题描述 */}
                        {agenda.description && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">议题描述</div>
                            <div className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                              {agenda.description}
                            </div>
                          </div>
                        )}

                        {/* 关联内容列表 */}
                        {agenda.type !== '其他议题' && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              关联内容
                              {relatedData.length > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  （共 {relatedData.length} 项，点击查看详情）
                                </span>
                              )}
                            </div>
                            {isLoadingData ? (
                              <div className="text-sm text-gray-500 bg-white p-3 rounded-lg text-center">
                                加载中...
                              </div>
                            ) : relatedData.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {relatedData.map(item => renderRelatedItem(item, agenda.type))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 bg-white p-3 rounded-lg text-center">
                                暂无关联内容
                              </div>
                            )}
                          </div>
                        )}

                        {/* 议题结论输入 */}
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Edit2 className="w-4 h-4 mr-1" />
                            议题结论
                            <span className="ml-2 text-xs text-gray-500">
                              （由会议记录人填写）
                            </span>
                          </div>
                          <textarea
                            value={agendaConclusions[agenda.id] || ''}
                            onChange={(e) => updateConclusion(agenda.id, e.target.value)}
                            placeholder="请填写本议题的讨论结论、决议或后续行动..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-12">
                暂无会议议题
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 提示：展开议题可查看关联内容详情和填写结论
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                暂时退出
              </Button>
              <Button
                type="button"
                onClick={handleFinishMeeting}
                disabled={finishing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {finishing ? '结束中...' : '✓ 结束会议'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 详情查看弹窗 - 根据类型渲染对应的详情组件 */}
      {selectedDetailItem && detailModalType === 'task' && (
        <TaskDetailModal
          task={selectedDetailItem}
          onClose={() => {
            setSelectedDetailItem(null);
            setDetailModalType('');
          }}
          onEdit={() => {
            // 任务编辑功能
            console.log('编辑任务:', selectedDetailItem);
          }}
          onDelete={() => {
            setSelectedDetailItem(null);
            setDetailModalType('');
            refreshCurrentAgendaData(); // 刷新关联数据
          }}
          onSave={async () => {
            // 任务保存后，刷新关联数据
            console.log('✅ 任务保存成功，刷新关联数据');
            await refreshCurrentAgendaData();
          }}
        />
      )}
      {selectedDetailItem && detailModalType === 'opportunity' && (
        <OpportunityDetailModal
          opportunity={selectedDetailItem}
          onClose={() => {
            setSelectedDetailItem(null);
            setDetailModalType('');
          }}
          onSuccess={async () => {
            // 商机更新后，刷新关联数据
            console.log('✅ 商机更新成功，刷新关联数据');
            await refreshCurrentAgendaData();
          }}
        />
      )}
      {selectedDetailItem && detailModalType === 'project' && (
        <ProjectDetailModal
          project={selectedDetailItem}
          onClose={() => {
            setSelectedDetailItem(null);
            setDetailModalType('');
          }}
          onSuccess={async () => {
            // 项目更新后，刷新关联数据
            console.log('✅ 项目更新成功，刷新关联数据');
            await refreshCurrentAgendaData();
          }}
        />
      )}
      {selectedDetailItem && detailModalType === 'issue' && (
        <IssueDetailModal
          issue={selectedDetailItem}
          onClose={() => {
            setSelectedDetailItem(null);
            setDetailModalType('');
          }}
          onSuccess={async () => {
            // 问题更新后，刷新关联数据
            console.log('✅ 问题更新成功，刷新关联数据');
            await refreshCurrentAgendaData();
          }}
        />
      )}
      {/* 目标详情暂时使用通用详情展示（待创建 GoalDetailModal） */}
      {selectedDetailItem && detailModalType === 'goal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">目标详情</h3>
              <button
                onClick={() => {
                  setSelectedDetailItem(null);
                  setDetailModalType('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标名称</label>
                <p className="text-gray-900">{selectedDetailItem.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标级别</label>
                <p className="text-gray-900">{selectedDetailItem.level || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标描述</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedDetailItem.description || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MeetingSessionModal;
