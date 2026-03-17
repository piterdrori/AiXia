import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(
    Boolean(cached?.notifications)
  );

  const [calendarTodayCount, setCalendarTodayCount] = useState(0);
  const [chatUnreadCount] = useState(0);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const loadNotifications = async (userId: string, force = false) => {
    const requestId = ++loadNotificationsRequestIdRef.current;

    if (!force && hasLoadedNotifications) return;

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
      setHasLoadedNotifications(true);
      writeLayoutCache(userProfile, nextNotifications);
    } catch (error) {
      if (requestId !== loadNotificationsRequestIdRef.current) return;
      console.error("Load notifications error:", error);
    } finally {
      if (requestId !== loadNotificationsRequestIdRef.current) return;
      setIsLoadingNotifications(false);
    }
  };

  const loadCalendarBadge = async (
    userId: string,
    role?: string | null
  ) => {
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
                        member.project_id === project.id && member.user_id === userId
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
        setHasLoadedNotifications(false);
        setCalendarTodayCount(0);
        clearLayoutCache();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
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
      };

      setUserProfile(loadedUser);
      writeLayoutCache(loadedUser, notifications);

      void loadCalendarBadge(session.user.id, loadedUser.role || null);
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
      if (cached.userProfile?.userId) {
        void loadCalendarBadge(
          cached.userProfile.userId,
          cached.userProfile.role || null
        );
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!mounted) return;

        if (!session?.user) {
          setUserProfile(null);
          setNotifications([]);
          setHasLoadedNotifications(false);
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
          () => {
            void loadNotifications(userProfile.userId, true);
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
      void loadNotifications(userProfile.userId, true);
    }
  }, [notificationsOpen, userProfile?.userId]);

  const navItems: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Projects", icon: FolderKanban, href: "/projects" },
      { label: "Tasks", icon: CheckSquare, href: "/tasks" },
      { label: "Calendar", icon: Calendar, href: "/calendar", badge: calendarTodayCount },
      { label: "Chat", icon: MessageSquare, href: "/chat", badge: chatUnreadCount || undefined },
      { label: "Inbox", icon: Bell, href: "/inbox", badge: unreadCount },
      { label: "Employees", icon: Users, href: "/employees" },
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
    [calendarTodayCount, chatUnreadCount, unreadCount]
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
      .map((n) => n[0])
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
      <div className="relative flex items-center justify-center border-b border-slate-800 px-4 py-5">
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
      <X className="w-5 h-5 text-slate-400" />
    </Button>
  )}
</div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    navigate(item.href);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${isActive(item.href) ? "text-indigo-400" : ""}`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <Badge
                      variant="default"
                      className="bg-indigo-600 text-white text-xs"
                    >
                      {item.badge}
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

      <div className="p-4 border-t border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-indigo-600 text-white text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {isLoadingUser ? "Loading..." : userProfile?.fullName || "User"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userProfile?.email || ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-900 border-slate-800"
          >
            <DropdownMenuLabel className="text-slate-400">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="text-slate-300 focus:bg-slate-800 focus:text-slate-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:bg-slate-800 focus:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {!isMobile && (
        <aside
          className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 z-40 transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
{sidebarOpen ? (
  <SidebarContent />
) : (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-slate-800 flex justify-center">
     <img
  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
  alt="AiXia Logo"
  className="block w-full max-w-[44px] h-auto object-contain"
 />
    </div>

              <nav className="flex-1 p-2 space-y-1">
                <TooltipProvider delayDuration={0}>
                  {navItems.map((item) => (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(item.href)}
                          className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
                            isActive(item.href)
                              ? "bg-indigo-600/20 text-indigo-400"
                              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </nav>

              <div className="p-2 border-t border-slate-800">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex justify-center p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-indigo-600 text-white text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-slate-900 border-slate-800"
                  >
                    <DropdownMenuLabel className="text-slate-400">
                      {userProfile?.fullName || "User"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem
                      onClick={() => navigate("/settings")}
                      className="text-slate-300 focus:bg-slate-800"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-400 focus:bg-slate-800"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
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
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 z-50">
            <SidebarContent />
          </aside>
        </>
      )}

      <main
        className={`flex-1 transition-all duration-300 ${
       !isMobile && sidebarOpen ? "ml-64" : !isMobile ? "ml-16" : ""
        }`}
      >
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="w-5 h-5 text-slate-400" />
                </Button>
              )}

              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                >
                  {sidebarOpen ? (
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </Button>
              )}

              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500"
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
                    <Bell className="w-5 h-5 text-slate-400" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-indigo-600 rounded-full text-[10px] flex items-center justify-center text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-96 bg-slate-900 border-slate-800 p-0"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <DropdownMenuLabel className="p-0 text-slate-200">
                      Notifications
                    </DropdownMenuLabel>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <DropdownMenuSeparator className="bg-slate-800" />

                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className="flex flex-col items-start gap-1 px-4 py-3 cursor-pointer focus:bg-slate-800"
                        >
                          <div className="flex items-start justify-between w-full gap-3">
                            <div className="min-w-0">
                              <p
                                className={`text-sm truncate ${
                                  notification.is_read
                                    ? "text-slate-300"
                                    : "text-white font-medium"
                                }`}
                              >
                                {notification.title}
                              </p>

                              {notification.message && (
                                <p className="text-xs text-slate-500 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                            </div>

                            {!notification.is_read && (
                              <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600">
                            {format(
                              new Date(notification.created_at),
                              "MMM d, h:mm a"
                            )}
                          </p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>

                  <DropdownMenuSeparator className="bg-slate-800" />

                  <DropdownMenuItem
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/inbox");
                    }}
                    className="justify-center text-slate-300 focus:bg-slate-800"
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
