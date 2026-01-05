import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Edit, Trash2, Plus, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import { callFunction } from '@/lib/cloudbase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Meeting {
  _id: string;
  title: string;
  type: string;
  status: string;
  scheduledTime: Date;
  duration: number;
  location: string;
  attendees: string[];
  organizer: string;
  description: string;
  minutes?: string;
  // 关联业务数据（兼容旧数据）
  relatedGoals?: string[];
  relatedTasks?: string[];
  relatedOpportunities?: string[];
  relatedProjects?: string[];
  relatedIssues?: string[];
  relatedBudgets?: string[];
  // 其它议题字段（兼容旧数据）
  agendaTopic?: string;
  agendaContent?: string;
  // 新的议题数据结构
  agendas?: Array<{
    id: string;
    type: string;
    title: string;
    content?: string;
    duration: number;
    relatedIds: string[];
  }>;
}

interface MeetingDetailModalProps {
  meeting: Meeting;
  onClose: () => void;
  onUpdate: () => void;
  onEdit?: () => void;
}

const STATUS_OPTIONS = [
  { value: '未开始', label: '未开始', color: 'bg-gray-100 text-gray-800' },
  { value: '进行中', label: '进行中', color: 'bg-blue-100 text-blue-800' },
  { value: '已结束', label: '已结束', color: 'bg-green-100 text-green-800' },
  { value: '已取消', label: '已取消', color: 'bg-red-100 text-red-800' }
];

const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting: initialMeeting,
  onClose,
  onUpdate,
  onEdit
}) => {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState<'info' | 'related' | 'minutes'>('info');
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesContent, setMinutesContent] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
  };

  const getStatusColor = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const getAgendaTypeLabel = (type: string) => {
    const agendaTypes = {
      'goal': '目标复盘',
      'task': '任务汇报',
      'opportunity': '商机分析',
      'project': '项目进展',
      'issue': '问题解决',
      'budget': '预算决策',
      'other': '其他议题'
    };
    return agendaTypes[type as keyof typeof agendaTypes] || type;
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'updateStatus',
          data: {
            meetingId: meeting._id,
            status: newStatus
          }
        }
      });

      if (result.result.success) {
        setMeeting({ ...meeting, status: newStatus });
        onUpdate();
      } else {
        alert('更新失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error('更新状态失败:', error);
      alert('更新失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinutes = async () => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'updateMinutes',
          data: {
            meetingId: meeting._id,
            minutes: minutesContent
          }
        }
      });

      if (result.result.success) {
        setMeeting({ ...meeting, minutes: minutesContent });
        setEditingMinutes(false);
        onUpdate();
      } else {
        alert('保存失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error('保存纪要失败:', error);
      alert('保存失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToRecycleBin = async () => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'moveToRecycleBin',
          data: {
            meetingId: meeting._id
          }
        }
      });

      if (result.result.success) {
        alert('已放入回收站');
        onClose();
        onUpdate();
      } else {
        alert('操作失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error('放入回收站失败:', error);
      alert('操作失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{meeting.title}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  {meeting.type}
                </Badge>
                <Badge className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </Badge>
                <span className="text-sm text-white/90">
                  {formatDate(meeting.scheduledTime)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex space-x-6 px-6">
            {[
              { key: 'info', label: '基本信息', icon: FileText },
              { key: 'related', label: '议题内容', icon: CheckCircle },
              { key: 'minutes', label: '会议纪要', icon: FileText }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`
                  py-3 px-2 border-b-2 transition-colors flex items-center space-x-2
                  ${activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 基本信息 */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">会议信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">计划时间</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(meeting.scheduledTime)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">会议时长</div>
                      <div className="text-sm font-medium text-gray-900">
                        {meeting.duration} 分钟
                      </div>
                    </div>
                  </div>

                  {meeting.location && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">会议地点</div>
                        <div className="text-sm font-medium text-gray-900">
                          {meeting.location}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">参会人员</div>
                      <div className="text-sm font-medium text-gray-900">
                        {meeting.attendees.length} 人
                      </div>
                    </div>
                  </div>

                  {meeting.description && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-500 mb-2">会议描述</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {meeting.description}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">会议状态</h3>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      disabled={loading || meeting.status === status.value}
                      className={`
                        px-4 py-2 rounded-lg transition-all
                        ${meeting.status === status.value
                          ? status.color + ' ring-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">参会人员</h3>
                <div className="flex flex-wrap gap-2">
                  {meeting.attendees.map((attendee, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {attendee}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 关联内容 */}
          {activeTab === 'related' && (
            <div className="space-y-4">
              {['周工作例会', '月度工作例会'].includes(meeting.type) ? (
                // 新的会议类型显示议题信息
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">会议议题</h3>
                  {meeting.agendas && meeting.agendas.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.agendas.map((agenda: any, index: number) => (
                        <div key={agenda.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900">
                              {index + 1}. {agenda.title}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getAgendaTypeLabel(agenda.type)}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            预计时长: {agenda.duration}分钟
                          </div>
                          {agenda.content && (
                            <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                              {agenda.content}
                            </div>
                          )}
                          {agenda.relatedIds && agenda.relatedIds.length > 0 && (
                            <div className="text-xs text-gray-500 mt-2">
                              关联数据: {agenda.relatedIds.length} 项
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      暂无议题信息
                    </div>
                  )}
                </Card>
              ) : meeting.type === '其它议题' ? (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">会议议题</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-2">议题标题</div>
                      <div className="text-sm text-gray-900">{meeting.agendaTopic || '无'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-2">议题内容</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {meeting.agendaContent || '无'}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <>
                  {meeting.relatedGoals && meeting.relatedGoals.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联目标</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedGoals.map((goalId) => (
                          <Badge key={goalId} variant="outline">
                            {goalId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {meeting.relatedTasks && meeting.relatedTasks.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联任务</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedTasks.map((taskId) => (
                          <Badge key={taskId} variant="outline">
                            {taskId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {meeting.relatedOpportunities && meeting.relatedOpportunities.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联商机</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedOpportunities.map((oppId) => (
                          <Badge key={oppId} variant="outline">
                            {oppId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {meeting.relatedProjects && meeting.relatedProjects.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联项目</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedProjects.map((projectId) => (
                          <Badge key={projectId} variant="outline">
                            {projectId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {meeting.relatedIssues && meeting.relatedIssues.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联问题</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedIssues.map((issueId) => (
                          <Badge key={issueId} variant="outline">
                            {issueId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {meeting.relatedBudgets && meeting.relatedBudgets.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">关联预算</h3>
                      <div className="flex flex-wrap gap-2">
                        {meeting.relatedBudgets.map((budgetId) => (
                          <Badge key={budgetId} variant="outline">
                            {budgetId}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {meeting.type !== '其它议题' && 
                !meeting.relatedGoals?.length && 
                !meeting.relatedTasks?.length && 
                !meeting.relatedOpportunities?.length && 
                !meeting.relatedProjects?.length && 
                !meeting.relatedIssues?.length && 
                !meeting.relatedBudgets?.length && (
                <div className="text-center py-12 text-gray-500">
                  暂无关联内容
                </div>
              )}
            </div>
          )}

          {/* 会议纪要 */}
          {activeTab === 'minutes' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">会议纪要</h3>
                {!editingMinutes ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingMinutes(true);
                      setMinutesContent(meeting.minutes || '');
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMinutes(false);
                        setMinutesContent('');
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveMinutes}
                      disabled={loading}
                    >
                      保存
                    </Button>
                  </div>
                )}
              </div>
              {editingMinutes ? (
                <textarea
                  value={minutesContent}
                  onChange={(e) => setMinutesContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="请输入会议纪要内容..."
                />
              ) : (
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {meeting.minutes || '暂无会议纪要'}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('确定要将此会议放入回收站吗？')) {
                  handleMoveToRecycleBin();
                }
              }}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              放入回收站
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            {onEdit && (
              <Button onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" />
                编辑会议
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailModal;
