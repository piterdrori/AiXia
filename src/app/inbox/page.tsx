import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  AlertCircle,
  Calendar,
  User,
  CheckSquare,
  MessageSquare,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import type { NotificationType } from '@/types';

const notificationIcons: Record<NotificationType, React.ElementType> = {
  TASK_ASSIGNED: CheckSquare,
  DUE_SOON: Calendar,
  OVERDUE: AlertCircle,
  PROJECT_INVITATION: User,
  MENTION: MessageSquare,
  STATUS_CHANGE: Info,
  SYSTEM: Info,
};

const notificationColors: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'bg-blue-500/20 text-blue-400',
  DUE_SOON: 'bg-amber-500/20 text-amber-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  PROJECT_INVITATION: 'bg-purple-500/20 text-purple-400',
  MENTION: 'bg-indigo-500/20 text-indigo-400',
  STATUS_CHANGE: 'bg-green-500/20 text-green-400',
  SYSTEM: 'bg-slate-500/20 text-slate-400',
};

export default function InboxPage() {
  const navigate = useNavigate();
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification,
    refreshData,
  } = useStore();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | NotificationType>('ALL');

  useEffect(() => {
    refreshData();
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'TASK_ASSIGNED':
      case 'DUE_SOON':
      case 'OVERDUE':
      case 'STATUS_CHANGE':
        if (notification.metadata?.taskId) {
          navigate(`/tasks/${notification.metadata.taskId}`);
        }
        break;
      case 'PROJECT_INVITATION':
        if (notification.metadata?.projectId) {
          navigate(`/projects/${notification.metadata.projectId}`);
        }
        break;
      case 'MENTION':
        if (notification.metadata?.taskId) {
          navigate(`/tasks/${notification.metadata.taskId}`);
        } else if (notification.metadata?.projectId) {
          navigate(`/projects/${notification.metadata.projectId}`);
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <p className="text-slate-400">
            {unreadCount > 0 
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={markAllNotificationsAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-800 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">All Notifications</SelectItem>
            <SelectItem value="UNREAD">Unread</SelectItem>
            <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
            <SelectItem value="DUE_SOON">Due Soon</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="PROJECT_INVITATION">Project Invite</SelectItem>
            <SelectItem value="MENTION">Mention</SelectItem>
            <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="divide-y divide-slate-800">
              {filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-indigo-900/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${notificationColors[notification.type]}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={`font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-slate-400 text-sm mt-1">{notification.message}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                          <span className="text-slate-500 text-xs">
                            {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationAsRead(notification.id);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                  <p className="text-slate-500">
                    {filter === 'ALL' 
                      ? "You're all caught up!"
                      : 'No notifications match your filter'
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
