import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";
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
  RefreshCw,
  Inbox,
  Calendar,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationRows,
  type NotificationRow,
  type NotificationType,
} from "@/lib/notifications";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";
import { useLanguage } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { AixiaButton, AixiaCommandMetrics, AixiaHero, AixiaPage } from "@/components/aixia";
import { Card, CardContent } from "@/components/ui/card";
import { PageError } from "@/components/ui/PageError";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import "@/styles/inbox/inbox-visual.css";

type InboxFilter = "ALL" | "UNREAD" | NotificationType;

const notificationIcons: Record<string, ElementType> = {
  MESSAGE: MessageSquare,
  TASK_ASSIGNED: CheckSquare,
  TASK_UPDATED: Info,
  COMMENT: MessageSquare,
  MENTION: MessageSquare,
  FILE_UPLOAD: FileText,
  PROJECT_UPDATE: FolderKanban,
  REMINDER: Bell,
};

const notificationColors: Record<string, string> = {
  MESSAGE: "bg-indigo-500/20 text-indigo-400",
  TASK_ASSIGNED: "bg-blue-500/20 text-blue-400",
  TASK_UPDATED: "bg-green-500/20 text-green-400",
  COMMENT: "bg-purple-500/20 text-purple-400",
  MENTION: "bg-pink-500/20 text-pink-400",
  FILE_UPLOAD: "bg-amber-500/20 text-amber-400",
  PROJECT_UPDATE: "bg-slate-500/20 text-slate-300",
  REMINDER: "bg-yellow-500/20 text-yellow-400",
};

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

function InboxListSkeleton() {
  return (
    <div className="aixia-inbox-skeleton-list" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="aixia-inbox-skeleton-row">
          <div className="aixia-projects-skeleton-bar h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="aixia-projects-skeleton-bar h-4 w-2/3" />
            <div className="aixia-projects-skeleton-bar h-3 w-full" />
            <div className="aixia-projects-skeleton-bar h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("ALL");

  const inboxRequest = useRequest<boolean>();
  const inboxRequestRef = useRef(inboxRequest);

  useEffect(() => {
    inboxRequestRef.current = inboxRequest;
  }, [inboxRequest]);

  const getTypeLabel = useCallback(
    (type: string) => {
      switch (type) {
        case "MESSAGE":
          return t("inbox.filters.messages");
        case "TASK_ASSIGNED":
          return t("inbox.filters.taskAssigned");
        case "TASK_UPDATED":
          return t("inbox.filters.taskUpdated");
        case "COMMENT":
          return t("inbox.filters.comments");
        case "MENTION":
          return t("inbox.filters.mentions");
        case "FILE_UPLOAD":
          return t("inbox.filters.fileUploads");
        case "PROJECT_UPDATE":
          return t("inbox.filters.projectUpdates");
        case "REMINDER":
          return t("inbox.filters.reminders");
        default:
          return type.replace(/_/g, " ");
      }
    },
    [t]
  );

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

        setNotifications(normalizeNotificationRows(data));

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

  const handleRefresh = useCallback(() => {
    if (!currentUserId) return;
    void fetchNotifications(currentUserId, { setLoading: true });
  }, [currentUserId, fetchNotifications]);

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

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const todayCount = useMemo(
    () =>
      notifications.filter((notification) => {
        try {
          return isToday(parseISO(notification.created_at));
        } catch {
          return false;
        }
      }).length,
    [notifications]
  );

  const inboxMetricItems = useMemo(
    () => [
      {
        key: "unread",
        title: t("inbox.metrics.unread", "Unread"),
        value: String(unreadCount),
        icon: Bell,
        tone: "rose" as const,
      },
      {
        key: "total",
        title: t("inbox.metrics.total", "Total"),
        value: String(notifications.length),
        icon: Inbox,
        tone: "indigo" as const,
      },
      {
        key: "today",
        title: t("inbox.metrics.today", "Today"),
        value: String(todayCount),
        icon: Calendar,
        tone: "emerald" as const,
      },
    ],
    [unreadCount, notifications.length, todayCount, t]
  );

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

  const isLoading = inboxRequest.status === "loading";
  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-inbox-page"
    >
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        gradientTitle="INBOX"
        title={t("inbox.header.title", "Inbox")}
        subtitle={t(
          "inbox.header.subtitle",
          "Notifications and alerts from across your workspace"
        )}
        actions={
          <>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading
                ? t("inbox.actions.refreshing", "Refreshing...")
                : t("inbox.actions.refresh", "Refresh")}
            </AixiaButton>

            {unreadCount > 0 ? (
              <AixiaButton
                type="button"
                className="h-9"
                onClick={() => void handleMarkAllRead()}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {t("inbox.buttons.markAllRead")}
              </AixiaButton>
            ) : null}
          </>
        }
      >
        <AixiaCommandMetrics items={inboxMetricItems} />

        <div className="aixia-command-toolbar">
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as InboxFilter)}
          >
            <SelectTrigger className="aixia-inbox-filter-trigger aixia-projects-select-trigger">
              <Filter className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder={t("inbox.filters.placeholder")} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className="aixia-projects-select-content"
            >
              <SelectItem value="ALL">{t("inbox.filters.all")}</SelectItem>
              <SelectItem value="UNREAD">{t("inbox.filters.unread")}</SelectItem>
              <SelectItem value="MESSAGE">
                {t("inbox.filters.messages")}
              </SelectItem>
              <SelectItem value="TASK_ASSIGNED">
                {t("inbox.filters.taskAssigned")}
              </SelectItem>
              <SelectItem value="TASK_UPDATED">
                {t("inbox.filters.taskUpdated")}
              </SelectItem>
              <SelectItem value="COMMENT">
                {t("inbox.filters.comments")}
              </SelectItem>
              <SelectItem value="MENTION">
                {t("inbox.filters.mentions", "Mentions")}
              </SelectItem>
              <SelectItem value="FILE_UPLOAD">
                {t("inbox.filters.fileUploads")}
              </SelectItem>
              <SelectItem value="PROJECT_UPDATE">
                {t("inbox.filters.projectUpdates")}
              </SelectItem>
              <SelectItem value="REMINDER">
                {t("inbox.filters.reminders", "Reminders")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PageError message={inboxRequest.error || ""} />
      </AixiaHero>

        <div className="aixia-command-scroll">
          <Card className="aixia-dash-panel aixia-dash-glass aixia-inbox-panel">
            <CardContent className="aixia-inbox-panel-body p-0">
              {isLoading && notifications.length === 0 ? (
                <InboxListSkeleton />
              ) : inboxRequest.status === "error" ? (
                <div className="aixia-inbox-state">
                  <AlertCircle className="mb-2 h-12 w-12 text-red-500" />
                  <h3 className="aixia-dash-panel-title m-0">
                    {t("inbox.states.error.title")}
                  </h3>
                  <p className="aixia-dash-list-row-meta">{inboxRequest.error}</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="aixia-inbox-empty">
                  <Bell className="mb-2 h-12 w-12 opacity-40" />
                  <h3 className="aixia-dash-panel-title m-0">
                    {t("inbox.states.empty.title")}
                  </h3>
                  <p className="aixia-dash-list-row-meta">
                    {filter === "ALL"
                      ? t("inbox.states.empty.all")
                      : t("inbox.states.empty.filtered")}
                  </p>
                </div>
              ) : (
                <div className="aixia-inbox-list">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type] || Bell;
                    const colorClass =
                      notificationColors[notification.type] ||
                      "bg-slate-500/20 text-slate-400";

                    return (
                      <div
                        key={notification.id}
                        className={`aixia-inbox-row ${
                          !notification.is_read ? "aixia-inbox-row--unread" : ""
                        }`}
                        onClick={() => void handleNotificationClick(notification)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleNotificationClick(notification);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className={`aixia-inbox-row-icon ${colorClass}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="aixia-inbox-row-main">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4
                                className={`aixia-dash-list-row-title text-sm ${
                                  !notification.is_read ? "" : "opacity-80"
                                }`}
                              >
                                {notification.title}
                              </h4>
                              {notification.message && (
                                <p className="mt-1 text-sm aixia-dash-list-row-meta line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <span className="aixia-inbox-type-pill">
                                {getTypeLabel(notification.type)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {!notification.is_read && (
                                <span
                                  className="h-2 w-2 rounded-full bg-indigo-500"
                                  aria-hidden
                                />
                              )}
                              <span className="text-xs aixia-dash-list-row-meta whitespace-nowrap">
                                {formatNotificationDate(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="aixia-inbox-row-actions">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t("inbox.buttons.markAllRead")}
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
                            className="h-8 w-8 text-red-400/80 hover:text-red-300"
                            aria-label="Delete"
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
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </AixiaPage>
  );
}
