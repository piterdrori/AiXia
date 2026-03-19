import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Bell,
  Users,
  Settings,
  Menu,
  X,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

type UserProfile = {
  userId: string;
  email: string;
  fullName: string;
  role?: string | null;
  avatarUrl?: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

type ProjectRow = {
  id: string;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  due_date: string | null;
  created_by: string | null;
  project_id: string | null;
  assignee_id: string | null;
};

type CalendarEventRow = {
  id: string;
  start_date: string;
  created_by: string | null;
  project_id: string | null;
};

type CachedLayoutState = {
  userProfile: UserProfile | null;
  notifications: NotificationRow[];
  cachedAt: number;
};

const LAYOUT_CACHE_KEY = "taskflow.dashboardLayout.cache";
const CACHE_TTL_MS = 60 * 1000;

function readLayoutCache(): CachedLayoutState | null {
  try {
    const raw = sessionStorage.getItem(LAYOUT_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedLayoutState;
    if (!parsed?.cachedAt) return null;

    const isExpired = Date.now() - parsed.cachedAt > CACHE_TTL_MS;
    if (isExpired) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeLayoutCache(
  userProfile: UserProfile | null,
  notifications: NotificationRow[]
) {
  try {
    const payload: CachedLayoutState = {
      userProfile,
      notifications,
      cachedAt: Date.now(),
    };

    sessionStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
}

function clearLayoutCache() {
  try {
    sessionStorage.removeItem(LAYOUT_CACHE_KEY);
  } catch {
    // ignore cache errors
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const cached = readLayoutCache();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    cached?.userProfile || null
  );
  const [isLoadingUser, setIsLoadingUser] = useState(!cached?.userProfile);

  const [notifications, setNotifications] = useState<NotificationRow[]>(
    cached?.notifications || []
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const [calendarTodayCount, setCalendarTodayCount] = useState(0);
  const [chatUnreadCount] = useState(0);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const loadUserRequestIdRef = useRef(0);
  const loadNotificationsRequestIdRef = useRef(0);
  const loadCalendarBadgeRequestIdRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setSidebarOpen(true);
      }

      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadNotifications = async (
    userId: string,
    profileForCache?: UserProfile | null
  ) => {
    const requestId = ++loadNotificationsRequestIdRef.current;
    setIsLoadingNotifications(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, user_id, actor_user_id, type, title, message, link, is_read, entity_type, entity_id, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (requestId !== loadNotificationsRequestIdRef.current) return;

      if (error) {
        console.error("Failed to load notifications:", error);
        return;
      }

      const nextNotifications = (data || []) as NotificationRow[];
      setNotifications(nextNotifications);
      writeLayoutCache(profileForCache ?? userProfile, nextNotifications);
    } catch (error) {
      if (requestId !== loadNotificationsRequestIdRef.current) return;
      console.error("Load notifications error:", error);
    } finally {
      if (requestId !== loadNotificationsRequestIdRef.current) return;
      setIsLoadingNotifications(false);
    }
  };

  const loadCalendarBadge = async (userId: string, role?: string | null) => {
    const requestId = ++loadCalendarBadgeRequestIdRef.current;

    try {
      const today = new Date().toISOString().slice(0, 10);

      const [
        { data: allProjects, error: projectsError },
        { data: allProjectMembers, error: membersError },
        { data: allTasks, error: tasksError },
        { data: allEvents, error: eventsError },
      ] = await Promise.all([
        supabase.from("projects").select("id, created_by"),
        supabase.from("project_members").select("project_id, user_id"),
        supabase
          .from("tasks")
          .select("id, due_date, created_by, project_id, assignee_id")
          .eq("due_date", today),
        supabase
          .from("calendar_events")
          .select("id, start_date, created_by, project_id")
          .eq("start_date", today),
      ]);

      if (requestId !== loadCalendarBadgeRequestIdRef.current) return;

      if (projectsError || membersError || tasksError || eventsError) {
        console.error(
          "Calendar badge load error:",
          projectsError || membersError || tasksError || eventsError
        );
        return;
      }

      const projects = (allProjects || []) as ProjectRow[];
      const projectMembers = (allProjectMembers || []) as ProjectMemberRow[];
      const todayTasks = (allTasks || []) as TaskRow[];
      const todayEvents = (allEvents || []) as CalendarEventRow[];

      const visibleProjectIds =
        role === "admin"
          ? new Set(projects.map((project) => project.id))
          : new Set(
              projects
                .filter(
                  (project) =>
                    project.created_by === userId ||
                    projectMembers.some(
                      (member) =>
                        member.project_id === project.id &&
                        member.user_id === userId
                    )
                )
                .map((project) => project.id)
            );

      const visibleTasks =
        role === "admin"
          ? todayTasks
          : todayTasks.filter((task) => {
              const isCreator = task.created_by === userId;
              const isAssignee = task.assignee_id === userId;
              const isInsideVisibleProject =
                !!task.project_id && visibleProjectIds.has(task.project_id);

              return isCreator || isAssignee || isInsideVisibleProject;
            });

      const visibleEvents =
        role === "admin"
          ? todayEvents
          : todayEvents.filter((event) => {
              const isCreator = event.created_by === userId;
              const isInsideVisibleProject =
                !!event.project_id && visibleProjectIds.has(event.project_id);

              return isCreator || isInsideVisibleProject;
            });

      setCalendarTodayCount(visibleTasks.length + visibleEvents.length);
    } catch (error) {
      if (requestId !== loadCalendarBadgeRequestIdRef.current) return;
      console.error("Load calendar badge error:", error);
    }
  };

  const loadUser = async () => {
    const requestId = ++loadUserRequestIdRef.current;
    setIsLoadingUser(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (requestId !== loadUserRequestIdRef.current) return;

      if (sessionError || !session?.user) {
        setUserProfile(null);
        setNotifications([]);
        setCalendarTodayCount(0);
        clearLayoutCache();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("user_id", session.user.id)
        .single();

      if (requestId !== loadUserRequestIdRef.current) return;

      if (profileError) {
        console.error("Failed to load profile:", profileError);
      }

      const loadedUser: UserProfile = {
        userId: session.user.id,
        email: session.user.email || "",
        fullName: profile?.full_name || "User",
        role: profile?.role || null,
        avatarUrl: profile?.avatar_url || null,
      };

      setUserProfile(loadedUser);
      writeLayoutCache(loadedUser, notifications);

      await Promise.all([
        loadNotifications(session.user.id, loadedUser),
        loadCalendarBadge(session.user.id, loadedUser.role || null),
      ]);
    } catch (error) {
      if (requestId !== loadUserRequestIdRef.current) return;
      console.error("DashboardLayout user load error:", error);
    } finally {
      if (requestId !== loadUserRequestIdRef.current) return;
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!cached?.userProfile) {
      void loadUser();
    } else {
      setIsLoadingUser(false);
      void loadNotifications(cached.userProfile.userId, cached.userProfile);
      void loadCalendarBadge(
        cached.userProfile.userId,
        cached.userProfile.role || null
      );
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!mounted) return;

        if (!session?.user) {
          setUserProfile(null);
          setNotifications([]);
          setCalendarTodayCount(0);
          clearLayoutCache();
          return;
        }

        void loadUser();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userProfile?.userId) return;

    const channelKey = `notifications:${userProfile.userId}`;

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
            filter: `user_id=eq.${userProfile.userId}`,
          },
          (payload) => {
            setNotifications((prev) => {
              let next = prev;

              if (payload.eventType === "INSERT") {
                next = [payload.new as NotificationRow, ...prev];
              } else if (payload.eventType === "UPDATE") {
                next = prev.map((notification) =>
                  notification.id === (payload.new as NotificationRow).id
                    ? (payload.new as NotificationRow)
                    : notification
                );
              } else if (payload.eventType === "DELETE") {
                const deletedId = (payload.old as { id?: string } | null)?.id;
                next = prev.filter((notification) => notification.id !== deletedId);
              }

              writeLayoutCache(userProfile, next);
              return next;
            });

            void loadNotifications(userProfile.userId, userProfile);
            void loadCalendarBadge(userProfile.userId, userProfile.role || null);
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [userProfile?.userId, userProfile?.role]);

  useEffect(() => {
    if (notificationsOpen && userProfile?.userId) {
      void loadNotifications(userProfile.userId, userProfile);
    }
  }, [notificationsOpen, userProfile?.userId]);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: t("common.dashboard", "Dashboard"),
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        label: t("common.projects", "Projects"),
        icon: FolderKanban,
        href: "/projects",
      },
      {
        label: t("common.tasks", "Tasks"),
        icon: CheckSquare,
        href: "/tasks",
      },
      {
        label: t("common.calendar", "Calendar"),
        icon: Calendar,
        href: "/calendar",
        badge: calendarTodayCount || undefined,
      },
      {
        label: t("common.chat", "Chat"),
        icon: MessageSquare,
        href: "/chat",
        badge: chatUnreadCount || undefined,
      },
      {
        label: t("common.inbox", "Inbox"),
        icon: Bell,
        href: "/inbox",
        badge: unreadCount || undefined,
      },
      {
        label: t("common.employees", "Employees"),
        icon: Users,
        href: "/employees",
      },
      {
        label: t("common.settings", "Settings"),
        icon: Settings,
        href: "/settings",
      },
    ],
    [calendarTodayCount, chatUnreadCount, unreadCount, t]
  );

  const handleLogout = async () => {
    clearLayoutCache();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  const userInitials =
    userProfile?.fullName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase() || "U";

  const handleNotificationClick = async (notification: NotificationRow) => {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);

        const nextNotifications = notifications.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        );

        setNotifications(nextNotifications);
        writeLayoutCache(userProfile, nextNotifications);
      }

      setNotificationsOpen(false);

      if (notification.link) {
        navigate(notification.link);
      } else {
        navigate("/inbox");
      }
    } catch (error) {
      console.error("Notification click error:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userProfile?.userId) return;

    try {
      await markAllNotificationsRead(userProfile.userId);

      const nextNotifications = notifications.map((item) => ({
        ...item,
        is_read: true,
      }));

      setNotifications(nextNotifications);
      writeLayoutCache(userProfile, nextNotifications);
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="relative flex items-center justify-center border-b border-border px-4 py-5">
        <img
          src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
          alt="AiXia Logo"
          className="h-40 w-auto object-contain"
        />

        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-3 top-3"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    navigate(item.href);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                    isActive(item.href)
                      ? "border border-primary/30 bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 ${isActive(item.href) ? "text-primary" : ""}`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>

                  {item.badge ? (
                    <Badge
                      variant="default"
                      className={
                        item.href === "/inbox"
                          ? "bg-red-600 text-xs text-white"
                          : "bg-primary text-xs text-primary-foreground"
                      }
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  ) : null}
                </button>
              </TooltipTrigger>

              {!sidebarOpen && !isMobile && (
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      <div className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium text-foreground">
                  {isLoadingUser
                    ? t("common.loading", "Loading...")
                    : userProfile?.fullName || t("common.user", "User")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {userProfile?.email || ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 border-border bg-popover"
          >
            <DropdownMenuLabel className="text-muted-foreground">
              {t("common.myAccount", "My Account")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="text-foreground focus:bg-muted focus:text-foreground"
            >
              <Settings className="mr-2 h-4 w-4" />
              {t("common.settings", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 focus:bg-muted focus:text-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.signOut", "Logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!isMobile && (
        <aside
          className={`fixed left-0 top-0 z-40 h-full border-r border-border bg-card/95 backdrop-blur-xl transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          {sidebarOpen ? (
            <SidebarContent />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex justify-center border-b border-border p-4">
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <nav className="flex-1 space-y-1 p-2">
                <TooltipProvider delayDuration={0}>
                  {navItems.map((item) => (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(item.href)}
                          className={`relative flex w-full items-center justify-center rounded-lg p-2.5 transition-all duration-200 ${
                            isActive(item.href)
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />

                          {item.badge ? (
                            <span
                              className={`absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full px-1 text-[10px] text-white ${
                                item.href === "/inbox" ? "bg-red-600" : "bg-primary"
                              }`}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          ) : null}
                        </button>
                      </TooltipTrigger>

                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </nav>

              <div className="border-t border-border p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex w-full justify-center rounded-lg p-2 transition-colors hover:bg-muted">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 border-border bg-popover"
                  >
                    <DropdownMenuLabel className="text-muted-foreground">
                      {userProfile?.fullName || t("common.user", "User")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => navigate("/settings")}
                      className="text-foreground focus:bg-muted"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {t("common.settings", "Settings")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 focus:bg-muted"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("common.signOut", "Logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </aside>
      )}

      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card/95 backdrop-blur-xl">
            <SidebarContent />
          </aside>
        </>
      )}

      <main
        className={`flex-1 transition-all duration-300 ${
          !isMobile && sidebarOpen ? "ml-64" : !isMobile ? "ml-16" : ""
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}

              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                >
                  {sidebarOpen ? (
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              )}

              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("common.searchPlaceholder", "Search...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-96 border-border bg-popover p-0"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <DropdownMenuLabel className="p-0 text-foreground">
                      Notifications
                    </DropdownMenuLabel>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:opacity-80"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className="flex cursor-pointer flex-col items-start gap-1 px-4 py-3 focus:bg-muted"
                        >
                          <div className="flex w-full items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className={`truncate text-sm ${
                                  notification.is_read
                                    ? "text-muted-foreground"
                                    : "font-medium text-foreground"
                                }`}
                              >
                                {notification.title}
                              </p>

                              {notification.message && (
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {notification.message}
                                </p>
                              )}
                            </div>

                            {!notification.is_read && (
                              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(notification.created_at), "MMM d, h:mm a")}
                          </p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/inbox");
                    }}
                    className="justify-center text-foreground focus:bg-muted"
                  >
                    Open Inbox
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
