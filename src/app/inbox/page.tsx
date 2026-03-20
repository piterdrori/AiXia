import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { createRequestTracker } from "@/lib/safeAsync";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  AlertCircle,
  CheckSquare,
  MessageSquare,
  Info,
  FolderKanban,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";

type NotificationType =
  | "MESSAGE"
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "COMMENT"
  | "FILE_UPLOAD"
  | "PROJECT_UPDATE";

type NotificationRow = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

const notificationIcons: Record<NotificationType, React.ElementType> = {
  MESSAGE: MessageSquare,
  TASK_ASSIGNED: CheckSquare,
  TASK_UPDATED: Info,
  COMMENT: MessageSquare,
  FILE_UPLOAD: FileText,
  PROJECT_UPDATE: FolderKanban,
};

const notificationColors: Record<NotificationType, string> = {
  MESSAGE: "bg-indigo-500/20 text-indigo-400",
  TASK_ASSIGNED: "bg-blue-500/20 text-blue-400",
  TASK_UPDATED: "bg-green-500/20 text-green-400",
  COMMENT: "bg-purple-500/20 text-purple-400",
  FILE_UPLOAD: "bg-amber-500/20 text-amber-400",
  PROJECT_UPDATE: "bg-slate-500/20 text-slate-300",
};

export default function InboxPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | NotificationType>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(
    async (
      userId: string,
      options?: {
        requestId?: number;
        setLoading?: boolean;
      }
    ) => {
      const requestId = options?.requestId ?? requestTracker.current.next();
      const shouldSetLoading = options?.setLoading ?? false;

      if (shouldSetLoading) {
        setIsLoading(true);
      }

      setError("");

      try {
        const { data, error: notificationsError } = await supabase
          .from("notifications")
          .select(
            "id, user_id, actor_user_id, type, title, message, link, is_read, entity_type, entity_id, created_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!requestTracker.current.isLatest(requestId)) return;

        if (notificationsError) {
          console.error("Load inbox notifications error:", notificationsError);
          setError(
            notificationsError.message ||
              t("inbox.errors.loadNotifications")
          );
          setNotifications([]);
          return;
        }

        setNotifications((data || []) as NotificationRow[]);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Fetch notifications error:", err);
        setError(t("inbox.errors.loadNotifications"));
        setNotifications([]);
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;
        if (shouldSetLoading) {
          setIsLoading(false);
        }
      }
    },
    [t]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const requestId = requestTracker.current.next();
      setIsLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (authError || !user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);
        await fetchNotifications(user.id, { requestId, setLoading: false });
      } catch (err) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Inbox init error:", err);
        setError(t("inbox.errors.loadInbox"));
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [fetchNotifications, navigate, t]);

  useEffect(() => {
    if (!currentUserId) return;

    const channelKey = `inbox:${currentUserId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            void fetchNotifications(currentUserId, { setLoading: false });
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [currentUserId, fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "ALL") return true;
      if (filter === "UNREAD") return !notification.is_read;
      return notification.type === filter;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const handleNotificationClick = async (notification: NotificationRow) => {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (err) {
      console.error("Notification click error:", err);
    }
  };

  const handleMarkOneRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    } catch (err) {
      console.error("Mark one read error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUserId) return;

    try {
      await markAllNotificationsRead(currentUserId);

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (deleteError) {
        console.error("Delete notification error:", deleteError);
        return;
      }

      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("inbox.header.title")}
          </h1>
          <p className="text-slate-400">
            {unreadCount > 0
              ? t("inbox.header.unreadCount", undefined, { total: unreadCount })
              : t("inbox.header.allCaughtUp")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {t("inbox.buttons.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={filter}
          onValueChange={(value) =>
            setFilter(value as "ALL" | "UNREAD" | NotificationType)
          }
        >
          <SelectTrigger className="w-48 bg-slate-900 border-slate-800 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder={t("inbox.filters.placeholder")} />
          </SelectTrigger>

          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">{t("inbox.filters.all")}</SelectItem>
            <SelectItem value="UNREAD">{t("inbox.filters.unread")}</SelectItem>
            <SelectItem value="MESSAGE">{t("inbox.filters.messages")}</SelectItem>
            <SelectItem value="TASK_ASSIGNED">
              {t("inbox.filters.taskAssigned")}
            </SelectItem>
            <SelectItem value="TASK_UPDATED">
              {t("inbox.filters.taskUpdated")}
            </SelectItem>
            <SelectItem value="COMMENT">
              {t("inbox.filters.comments")}
            </SelectItem>
            <SelectItem value="FILE_UPLOAD">
              {t("inbox.filters.fileUploads")}
            </SelectItem>
            <SelectItem value="PROJECT_UPDATE">
              {t("inbox.filters.projectUpdates")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="divide-y divide-slate-800">
              {isLoading ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {t("inbox.states.loading.title")}
                  </h3>
                  <p className="text-slate-500">
                    {t("inbox.states.loading.description")}
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {t("inbox.states.error.title")}
                  </h3>
                  <p className="text-slate-500">{error}</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {t("inbox.states.empty.title")}
                  </h3>
                  <p className="text-slate-500">
                    {filter === "ALL"
                      ? t("inbox.states.empty.all")
                      : t("inbox.states.empty.filtered")}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const colorClass =
                    notificationColors[notification.type] ||
                    "bg-slate-500/20 text-slate-400";

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        !notification.is_read ? "bg-indigo-900/5" : ""
                      }`}
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              className={`font-medium ${
                                !notification.is_read ? "text-white" : "text-slate-300"
                              }`}
                            >
                              {notification.title}
                            </h4>

                            {notification.message && (
                              <p className="text-slate-400 text-sm mt-1">
                                {notification.message}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            )}
                            <span className="text-slate-500 text-xs">
                              {format(new Date(notification.created_at), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleMarkOneRead(notification.id);
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
                            void handleDeleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
