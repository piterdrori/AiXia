import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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

import { supabase } from "@/lib/supabase";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";
import { useLanguage } from "@/lib/i18n";
import { initNotificationSound } from "@/lib/sound";

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

const notificationIcons: Record<NotificationType, ElementType> = {
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

function isValidNotificationType(value: string): value is NotificationType {
  return (
    value === "MESSAGE" ||
    value === "TASK_ASSIGNED" ||
    value === "TASK_UPDATED" ||
    value === "COMMENT" ||
    value === "FILE_UPLOAD" ||
    value === "PROJECT_UPDATE"
  );
}

function formatNotificationDate(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return format(date, "MMM d, HH:mm");
  } catch {
    return "—";
  }
}

export default function InboxPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | NotificationType>("ALL");

    const inboxRequest = useRequest<boolean>();
  const inboxRequestRef = useRef(inboxRequest);

  useEffect(() => {
    inboxRequestRef.current = inboxRequest;
  }, [inboxRequest]);

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
        inboxRequestRef.current.setState((prev) => ({
          ...prev,
          status: "loading",
          error: null,
        }));
      }

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
                    inboxRequestRef.current.setState((prev) => ({
            ...prev,
            status: "error",
            error:
              notificationsError.message || t("inbox.errors.loadNotifications"),
          }));
          setNotifications([]);
          return;
        }

        const safeNotifications = ((data || []) as NotificationRow[]).filter(
          (item) =>
            !!item &&
            typeof item.id === "string" &&
            typeof item.user_id === "string" &&
            typeof item.title === "string" &&
            typeof item.created_at === "string" &&
            typeof item.is_read === "boolean" &&
            typeof item.type === "string" &&
            isValidNotificationType(item.type)
        );

        setNotifications(safeNotifications);

        if (shouldSetLoading) {
          inboxRequestRef.current.setState((prev) => ({
            ...prev,
            status: "success",
            error: null,
          }));
        }
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Fetch notifications error:", err);
        inboxRequestRef.current.setState((prev) => ({
          ...prev,
          status: "error",
          error: t("inbox.errors.loadNotifications"),
        }));
        setNotifications([]);
      }
    },
    [t]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const requestId = requestTracker.current.next();

      inboxRequestRef.current.setState((prev) => ({
        ...prev,
        status: "loading",
        error: null,
      }));

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

        await fetchNotifications(user.id, {
          requestId,
          setLoading: false,
        });

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        inboxRequestRef.current.setState((prev) => ({
          ...prev,
          status: "success",
          error: null,
        }));
      } catch (err) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Inbox init error:", err);
        inboxRequestRef.current.setState((prev) => ({
          ...prev,
          status: "error",
          error: t("inbox.errors.loadInbox"),
        }));
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [fetchNotifications, navigate, t]);

    useEffect(() => {
    initNotificationSound();
  }, []);

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

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

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

      setNotifications((prev) =>
        prev.filter((item) => item.id !== notificationId)
      );
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              <CheckCheck className="mr-2 h-4 w-4" />
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
          <SelectTrigger className="w-48 border-slate-800 bg-slate-900 text-white">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("inbox.filters.placeholder")} />
          </SelectTrigger>

          <SelectContent className="border-slate-800 bg-slate-900">
            <SelectItem value="ALL">{t("inbox.filters.all")}</SelectItem>
            <SelectItem value="UNREAD">{t("inbox.filters.unread")}</SelectItem>
            <SelectItem value="MESSAGE">{t("inbox.filters.messages")}</SelectItem>
            <SelectItem value="TASK_ASSIGNED">
              {t("inbox.filters.taskAssigned")}
            </SelectItem>
            <SelectItem value="TASK_UPDATED">
              {t("inbox.filters.taskUpdated")}
            </SelectItem>
            <SelectItem value="COMMENT">{t("inbox.filters.comments")}</SelectItem>
            <SelectItem value="FILE_UPLOAD">
              {t("inbox.filters.fileUploads")}
            </SelectItem>
            <SelectItem value="PROJECT_UPDATE">
              {t("inbox.filters.projectUpdates")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="divide-y divide-slate-800">
              {inboxRequest.status === "loading" ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">
                    {t("inbox.states.loading.title")}
                  </h3>
                  <p className="text-slate-500">
                    {t("inbox.states.loading.description")}
                  </p>
                </div>
              ) : inboxRequest.status === "error" ? (
                <div className="py-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <h3 className="mb-2 text-lg font-medium text-white">
                    {t("inbox.states.error.title")}
                  </h3>
                  <p className="text-slate-500">{inboxRequest.error}</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">
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
                      className={`flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-slate-800/50 ${
                        !notification.is_read ? "bg-indigo-900/5" : ""
                      }`}
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4
                              className={`font-medium ${
                                !notification.is_read
                                  ? "text-white"
                                  : "text-slate-300"
                              }`}
                            >
                              {notification.title}
                            </h4>

                            {notification.message && (
                              <p className="mt-1 text-sm text-slate-400">
                                {notification.message}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-2">
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-indigo-500" />
                            )}
                            <span className="text-xs text-slate-500">
                              {formatNotificationDate(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1">
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
                            <Check className="h-4 w-4" />
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
                          <Trash2 className="h-4 w-4" />
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
