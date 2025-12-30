import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Filter, X, Calendar, Tag, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { app, db } from '@/lib/cloudbase';
import { MESSAGE_TYPE_CONFIG, type Message } from './message/types';
import { useNotificationStore } from '@/lib/notification-store';
import { showConfirm } from '@/utils/ui-feedback';

type PageType = 'dashboard' | 'tasks' | 'opportunities' | 'projects' | 'goals' | 'settings' | 'account';

interface MessageCenterProps {
  onClose?: () => void;
  onNavigate?: (page: PageType, itemId?: string) => void;  // 🔧 添加 itemId 参数
}

export const MessageCenter: React.FC<MessageCenterProps> = ({ onClose, onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  
  // 🔔 引入全局通知状态
  const { setUnreadCount } = useNotificationStore();

  const loadMessages = async () => {
    setLoading(true);
    try {
      // 🔧 获取当前用户ID
      const currentUserStr = localStorage.getItem('current_user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).userId : '';
      
      console.log('📧 [MessageCenter] 加载消息, userId:', currentUserId);
      
      const result = await app.callFunction({
        name: 'message-list',
        data: { 
          page: 1, 
          limit: 50,
          userId: currentUserId  // 🔧 传递 userId
        }
      });
      
      console.log('📧 [MessageCenter] 云函数返回:', result);
      
      if (result.result?.success) {
        const loadedMessages = result.result.data.items || [];
        console.log('📧 [MessageCenter] 加载到的消息:', loadedMessages);
        setMessages(loadedMessages);
        
        // 🔔 更新全局未读消息数
        const unreadCount = loadedMessages.filter((msg: Message) => !msg.isRead).length;
        console.log('🔔 [MessageCenter] 更新未读数:', unreadCount);
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // 筛选消息
  const filteredMessages = messages.filter(msg => {
    // 🔍 未读筛选
    if (showUnreadOnly && msg.isRead) return false;
    
    // 🔍 类型筛选
    if (selectedType !== 'all') {
      // 根据选择的类型匹配消息
      switch (selectedType) {
        case 'task':
          // 任务：所有 type=task 的消息
          if (msg.type !== 'task') return false;
          break;
        case 'opportunity':
          // 商机动态：type=opportunity
          if (msg.type !== 'opportunity') return false;
          break;
        case 'project':
          // 项目动态：type=project
          if (msg.type !== 'project') return false;
          break;
        default:
          return false;
      }
    }
    
    return true;
  });

  // 标记单条消息为已读
  const handleMarkRead = async (messageId: string) => {
    try {
      // 🔧 获取当前用户ID
      const currentUserStr = localStorage.getItem('current_user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).userId : '';
      
      const result = await app.callFunction({
        name: 'message-read',
        data: { 
          messageId,
          userId: currentUserId  // 🔧 传递 userId
        }
      });
      
      if (result.result?.success) {
        const updatedMessages = messages.map(msg => 
          msg._id === messageId ? { ...msg, isRead: true, readAt: new Date() } : msg
        );
        setMessages(updatedMessages);
        
        // 🔔 更新全局未读消息数
        const unreadCount = updatedMessages.filter(msg => !msg.isRead).length;
        console.log('🔔 [MessageCenter] 标记已读后更新未读数:', unreadCount);
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 全部标记已读
  const handleMarkAllRead = async () => {
    try {
      // 🔧 获取当前用户ID
      const currentUserStr = localStorage.getItem('current_user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).userId : '';
      
      const result = await app.callFunction({
        name: 'message-read',
        data: { 
          markAll: true,
          userId: currentUserId  // 🔧 传递 userId
        }
      });
      
      if (result.result?.success) {
        const updatedMessages = messages.map(msg => ({ ...msg, isRead: true, readAt: new Date() }));
        setMessages(updatedMessages);
        
        // 🔔 全部标记已读后未读数为0
        console.log('🔔 [MessageCenter] 全部标记已读，未读数归零');
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('全部标记已读失败:', error);
    }
  };

  // 删除单条消息
  const handleDelete = async (messageId: string) => {
    if (!showConfirm('确定要删除这条消息吗？')) return;
    
    try {
      // 🔧 获取当前用户ID
      const currentUserStr = localStorage.getItem('current_user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).userId : '';
      
      const result = await app.callFunction({
        name: 'message-delete',
        data: { 
          messageId,
          userId: currentUserId  // 🔧 传递 userId
        }
      });
      
      if (result.result?.success) {
        const deletedMsg = messages.find(msg => msg._id === messageId);
        const updatedMessages = messages.filter(msg => msg._id !== messageId);
        setMessages(updatedMessages);
        selectedMessages.delete(messageId);
        setSelectedMessages(new Set(selectedMessages));
        
        // 🔔 如果删除的是未读消息，更新未读数
        if (deletedMsg && !deletedMsg.isRead) {
          const unreadCount = updatedMessages.filter(msg => !msg.isRead).length;
          console.log('🔔 [MessageCenter] 删除未读消息后更新未读数:', unreadCount);
          setUnreadCount(unreadCount);
        }
      }
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  };

  // 批量删除消息
  const handleBatchDelete = async () => {
    if (selectedMessages.size === 0) return;
    if (!showConfirm(`确定要删除选中的 ${selectedMessages.size} 条消息吗？`)) return;
    
    try {
      // 🔧 获取当前用户ID
      const currentUserStr = localStorage.getItem('current_user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).userId : '';
      
      const result = await app.callFunction({
        name: 'message-delete',
        data: { 
          messageIds: Array.from(selectedMessages),
          userId: currentUserId  // 🔧 传递 userId
        }
      });
      
      if (result.result?.success) {
        const updatedMessages = messages.filter(msg => !selectedMessages.has(msg._id));
        setMessages(updatedMessages);
        setSelectedMessages(new Set());
        
        // 🔔 批量删除后重新计算未读数
        const unreadCount = updatedMessages.filter(msg => !msg.isRead).length;
        console.log('🔔 [MessageCenter] 批量删除后更新未读数:', unreadCount);
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('批量删除消息失败:', error);
    }
  };

  // 切换消息选择
  const toggleMessageSelect = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredMessages.map(msg => msg._id)));
    }
  };

  // 点击消息跳转
  const handleMessageClick = async (msg: Message) => {
    console.log('📧 [MessageCenter] 点击消息:', { type: msg.type, relatedId: msg.relatedId });
    
    // 标记为已读
    if (!msg.isRead) {
      await handleMarkRead(msg._id);
    }

    // 根据消息类型跳转并打开详情
    if (msg.relatedId && onNavigate) {
      console.log('📧 [MessageCenter] 调用 onNavigate:', msg.type, msg.relatedId);
      switch (msg.type) {
        case 'task':
          onNavigate('tasks', msg.relatedId);  // 🔧 传递任务ID
          break;
        case 'opportunity':
          onNavigate('opportunities', msg.relatedId);  // 🔧 传递商机ID
          break;
        case 'project':
          onNavigate('projects', msg.relatedId);  // 🔧 传递项目ID
          break;
        case 'goal':
          onNavigate('goals', msg.relatedId);  // 🔧 传递目标ID
          break;
      }
      
      // 跳转后关闭消息中心
      onClose?.();
    }
  };

  // 格式化时间
  const formatTime = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const unreadCount = messages.filter(msg => !msg.isRead).length;
  
  // 🔧 根据筛选逻辑计算每个类型的消息数量
  const typeOptions = [
    { value: 'all', label: '全部', count: messages.length },
    { 
      value: 'task', 
      label: '任务', 
      count: messages.filter(m => m.type === 'task').length 
    },
    { 
      value: 'opportunity', 
      label: '商机', 
      count: messages.filter(m => m.type === 'opportunity').length 
    },
    { 
      value: 'project', 
      label: '项目', 
      count: messages.filter(m => m.type === 'project').length 
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">消息中心</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} 条未读
              </Badge>
            )}
          </div>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 批量操作 */}
            {selectedMessages.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除 ({selectedMessages.size})
                </Button>
                <div className="w-px h-4 bg-gray-300" />
              </>
            )}
            
            {/* 全部标记已读 */}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                全部已读
              </Button>
            )}
            
            {/* 只看未读 */}
            <Button
              variant={showUnreadOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              <Filter className="h-4 w-4 mr-1" />
              只看未读
            </Button>
          </div>

          {/* 全选 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedMessages.size === filteredMessages.length && filteredMessages.length > 0
              ? '取消全选'
              : '全选'
            }
          </Button>
        </div>
      </div>

      {/* 类型筛选 */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {typeOptions.map(option => (
            <Button
              key={option.value}
              variant={selectedType === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(option.value)}
              className="whitespace-nowrap"
            >
              {option.label}
              {option.count > 0 && (
                <Badge
                  variant={selectedType === option.value ? 'secondary' : 'outline'}
                  className="ml-1"
                >
                  {option.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {showUnreadOnly ? '暂无未读消息' : '暂无消息'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((msg) => {
              const typeConfig = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.system;
              const isSelected = selectedMessages.has(msg._id);
              
              return (
                <Card
                  key={msg._id}
                  className={`
                    p-4 cursor-pointer transition-all
                    ${!msg.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    hover:shadow-md
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* 选择框 */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMessageSelect(msg._id);
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />

                    {/* 消息图标 */}
                    <div
                      className={`
                        mt-0.5 p-2 rounded-lg
                        ${typeConfig.color.replace('text-', 'bg-').replace('600', '100')}
                      `}
                    >
                      {React.createElement(typeConfig.icon, {
                        className: `h-5 w-5 ${typeConfig.color}`
                      })}
                    </div>

                    {/* 消息内容 */}
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleMessageClick(msg)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-medium ${!msg.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {msg.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(msg.createdAt)}
                          </span>
                          {msg.relatedId && (
                            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {msg.content}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {typeConfig.label}
                        </Badge>
                        {!msg.isRead && (
                          <Badge variant="destructive" className="text-xs">
                            未读
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!msg.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(msg._id);
                          }}
                          title="标记已读"
                        >
                          <CheckCheck className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(msg._id);
                        }}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
