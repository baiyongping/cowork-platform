import { useState, useEffect } from 'react';
import { X, Search, RotateCcw, Trash2, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { db } from '../lib/cloudbase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { showError, showSuccess } from '../utils/ui-feedback';

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
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  agendas?: any[];
}

interface MeetingRecycleBinProps {
  onClose: () => void;
  onRestore: () => void;
}

export default function MeetingRecycleBin({ onClose, onRestore }: MeetingRecycleBinProps) {
  const [deletedMeetings, setDeletedMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadDeletedMeetings();
  }, []);

  useEffect(() => {
    // 根据关键词过滤
    if (keyword.trim()) {
      const filtered = deletedMeetings.filter(meeting =>
        (meeting.title && meeting.title.toLowerCase().includes(keyword.toLowerCase())) ||
        (meeting.type && meeting.type.toLowerCase().includes(keyword.toLowerCase())) ||
        (meeting.organizer && meeting.organizer.toLowerCase().includes(keyword.toLowerCase()))
      );
      setFilteredMeetings(filtered);
    } else {
      setFilteredMeetings(deletedMeetings);
    }
  }, [keyword, deletedMeetings]);

  const loadDeletedMeetings = async () => {
    try {
      setLoading(true);

      // 查询已删除的会议
      const result = await db.collection('meetings')
        .where({
          isDeleted: true
        })
        .orderBy('deletedAt', 'desc')
        .get();

      setDeletedMeetings(result.data as Meeting[]);
    } catch (error) {
      console.error('加载回收站会议失败:', error);
      showError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 恢复会议
  const handleRestore = async (meetingId: string) => {
    try {
      setLoading(true);

      await db.collection('meetings')
        .doc(meetingId)
        .update({
          isDeleted: false,
          deletedAt: db.command.remove(),
          deletedBy: db.command.remove()
        });

      showSuccess('会议已恢复');
      loadDeletedMeetings();
      onRestore();
    } catch (error) {
      console.error('恢复会议失败:', error);
      showError('恢复失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 彻底删除会议
  const handlePermanentDelete = async (meetingId: string) => {
    if (!window.confirm('确定要彻底删除此会议吗？此操作无法恢复！')) {
      return;
    }

    try {
      setLoading(true);

      await db.collection('meetings')
        .doc(meetingId)
        .remove();

      showSuccess('会议已彻底删除');
      loadDeletedMeetings();
      onRestore();
    } catch (error) {
      console.error('删除会议失败:', error);
      showError('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      '未开始': 'bg-gray-100 text-gray-800',
      '进行中': 'bg-blue-100 text-blue-800',
      '已结束': 'bg-green-100 text-green-800',
      '已取消': 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-red-500 to-orange-600 px-6 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">会议回收站</h2>
              <p className="text-sm text-white/90">
                已删除的会议将在这里保留30天，之后将被永久删除
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索会议标题、类型或组织者..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              加载中...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {keyword ? '没有找到相关会议' : '回收站为空'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 标题和类型 */}
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {meeting.title}
                        </h3>
                        <Badge variant="outline">{meeting.type}</Badge>
                        <Badge className={getStatusColor(meeting.status)}>
                          {meeting.status}
                        </Badge>
                      </div>

                      {/* 会议信息 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{formatDate(meeting.scheduledTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{meeting.duration} 分钟</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{meeting.location}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{meeting.attendees?.length || 0} 人参会</span>
                        </div>
                      </div>

                      {/* 删除信息 */}
                      {meeting.deletedAt && (
                        <div className="mt-3 text-xs text-gray-500">
                          删除时间: {formatDate(meeting.deletedAt)}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(meeting._id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        恢复
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePermanentDelete(meeting._id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        彻底删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>共 {filteredMeetings.length} 个已删除会议</span>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
