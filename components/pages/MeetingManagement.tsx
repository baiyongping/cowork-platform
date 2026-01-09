import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Filter, Search, Clock, Users, MapPin, FileText, Trash2, Play } from 'lucide-react';
import { callFunction } from '../../lib/cloudbase';
import CreateMeetingModal from '../CreateMeetingModal';
import MeetingDetailModal from '../MeetingDetailModal';
import MeetingRecycleBin from '../MeetingRecycleBin';
import MeetingSessionModal from '../MeetingSessionModal';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { LoadingDots } from '../ui/loading';

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
  createdAt: Date;
}

const MEETING_TYPES = [
  { value: 'all', label: '全部类型' },
  { value: '周工作例会', label: '周工作例会' },
  { value: '月度工作例会', label: '月度工作例会' },
  { value: '目标复盘', label: '目标复盘' },
  { value: '任务汇报', label: '任务汇报' },
  { value: '商机分析', label: '商机分析' },
  { value: '项目分析', label: '项目分析' },
  { value: '问题解决', label: '问题解决' },
  { value: '预算决策', label: '预算决策' },
  { value: '其它议题', label: '其它议题' }
];

const MEETING_STATUSES = [
  { value: 'all', label: '全部状态' },
  { value: '未开始', label: '未开始', color: 'bg-gray-100 text-gray-800' },
  { value: '进行中', label: '进行中', color: 'bg-blue-100 text-blue-800' },
  { value: '已结束', label: '已结束', color: 'bg-green-100 text-green-800' },
  { value: '已取消', label: '已取消', color: 'bg-red-100 text-red-800' }
];

const MeetingManagement: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    keyword: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionMeeting, setSessionMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
  }, [filters, pagination.page]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'query',
          data: {
            type: filters.type === 'all' ? undefined : filters.type,
            status: filters.status === 'all' ? undefined : filters.status,
            keyword: filters.keyword || undefined,
            page: pagination.page,
            limit: pagination.limit
          }
        }
      });

      if (result.result.success) {
        setMeetings(result.result.data.items);
        setPagination(prev => ({
          ...prev,
          total: result.result.data.total
        }));
      }
    } catch (error) {
      console.error('加载会议列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadMeetings();
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const handleEditMeeting = () => {
    setEditingMeeting(selectedMeeting);
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  // 召开会议
  const handleStartMeeting = async (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击

    try {
      // 1. 更新会议状态为"进行中"
      const result = await callFunction({
        name: 'meeting-management',
        data: {
          action: 'update',
          data: {
            _id: meeting._id,
            status: '进行中'
          }
        }
      });

      if (result.result.success) {
        // 2. 打开会议进行窗口
        setSessionMeeting({
          ...meeting,
          status: '进行中'
        });
        setShowSessionModal(true);
        
        // 3. 刷新列表
        loadMeetings();
      } else {
        alert('召开会议失败：' + result.result.error);
      }
    } catch (error: any) {
      console.error('召开会议失败:', error);
      alert('召开会议失败：' + error.message);
    }
  };

  // 会议结束后的回调
  const handleMeetingFinished = () => {
    setShowSessionModal(false);
    setSessionMeeting(null);
    loadMeetings();
  };

  const getStatusColor = (status: string) => {
    const statusConfig = MEETING_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: Date) => {
    // 🔧 统一格式：YYYY年MM月DD日 HH:mm
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">例会管理</h1>
                <p className="text-sm text-gray-500">Meeting Management</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRecycleBin(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                回收站
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建会议
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 会议类型筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会议类型
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MEETING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 会议状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会议状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MEETING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 关键词搜索 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关键词搜索
              </label>
              <form onSubmit={handleSearch} className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="搜索会议标题..."
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  className="flex-1"
                />
                <Button type="submit" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 会议列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <LoadingDots text="加载会议列表..." />
        ) : meetings.length === 0 ? (
          <EmptyState
            icon="custom"
            title="暂无会议"
            description="还没有创建任何会议，点击上方按钮创建第一个会议吧"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting._id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => handleMeetingClick(meeting)}
              >
                <div className="p-6">
                  {/* 会议头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {meeting.type}
                        </Badge>
                        <Badge className={getStatusColor(meeting.status)}>
                          {meeting.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 会议信息 */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{formatDate(meeting.scheduledTime)}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{meeting.attendees.length} 人参会</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    {(() => {
                      // 🔧 安全处理：如果type未定义，跳过
                      if (!meeting.type) {
                        return null;
                      }

                      // 周工作例会、月度工作例会：显示议题数量
                      if (['周工作例会', '月度工作例会'].includes(meeting.type)) {
                        const agendaCount = Array.isArray(meeting.agendas) ? meeting.agendas.length : 0;
                        return (
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{agendaCount} 个议题</span>
                          </div>
                        );
                      }
                      
                      // 其它议题：显示议题标题
                      if (meeting.type === '其它议题') {
                        return meeting.agendaTopic ? (
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="line-clamp-1">{meeting.agendaTopic}</span>
                          </div>
                        ) : null;
                      }
                      
                      // 其他类型（目标复盘、任务汇报等）：显示关联项数量
                      const relatedCount = [
                        meeting.relatedGoals?.length,
                        meeting.relatedTasks?.length,
                        meeting.relatedOpportunities?.length,
                        meeting.relatedProjects?.length,
                        meeting.relatedIssues?.length,
                        meeting.relatedBudgets?.length
                      ].reduce((sum, count) => sum + (count || 0), 0);
                      
                      return (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{relatedCount} 个关联项</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 会议描述 */}
                  {meeting.description && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {meeting.description}
                      </p>
                    </div>
                  )}

                  {/* 召开会议/进入会议按钮 */}
                  {meeting.status === '未开始' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Button
                        onClick={(e) => handleStartMeeting(meeting, e)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        召开会议
                      </Button>
                    </div>
                  )}
                  {meeting.status === '进行中' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionMeeting(meeting);
                          setShowSessionModal(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        进入会议
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 分页 */}
        {!loading && meetings.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {pagination.total} 个会议，当前第 {pagination.page} 页
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 创建会议弹窗 */}
      {showCreateModal && (
        <CreateMeetingModal
          meeting={editingMeeting || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMeeting(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingMeeting(null);
            loadMeetings();
          }}
        />
      )}

      {/* 会议详情弹窗 */}
      {showDetailModal && selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMeeting(null);
          }}
          onUpdate={() => loadMeetings()}
          onEdit={handleEditMeeting}
        />
      )}

      {/* 回收站弹窗 */}
      {showRecycleBin && (
        <MeetingRecycleBin
          onClose={() => setShowRecycleBin(false)}
          onRestore={() => loadMeetings()}
        />
      )}

      {/* 会议进行窗口 */}
      {showSessionModal && sessionMeeting && (
        <MeetingSessionModal
          meeting={sessionMeeting}
          onClose={() => {
            setShowSessionModal(false);
            setSessionMeeting(null);
          }}
          onFinish={handleMeetingFinished}
        />
      )}
    </div>
  );
};

export default MeetingManagement;
