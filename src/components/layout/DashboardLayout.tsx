import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

type UserProfile = {
  email: string;
  fullName: string;
  role?: string | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Placeholder until inbox/notifications are connected to Supabase
  const unreadCount = 0;

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

  useEffect(() => {
    const loadUser = async () => {
      setIsLoadingUser(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Failed to load profile:", error);
        }

        setUserProfile({
          email: user.email || "",
          fullName: profile?.full_name || "User",
          role: profile?.role || null,
        });
      } catch (error) {
        console.error("DashboardLayout user load error:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUserProfile(null);
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("user_id", session.user.id)
        .single();

      setUserProfile({
        email: session.user.email || "",
        fullName: profile?.full_name || "User",
        role: profile?.role || null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const navItems: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Projects", icon: FolderKanban, href: "/projects" },
      { label: "Tasks", icon: CheckSquare, href: "/tasks" },
      { label: "Calendar", icon: Calendar, href: "/calendar" },
      { label: "Chat", icon: MessageSquare, href: "/chat" },
      { label: "Inbox", icon: Bell, href: "/inbox", badge: unreadCount },
      { label: "Employees", icon: Users, href: "/employees" },
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
    [unreadCount]
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">TaskFlow</span>
        </div>

        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
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
                  <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-indigo-400" : ""}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="default" className="bg-indigo-600 text-white text-xs">
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

          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
            <DropdownMenuLabel className="text-slate-400">My Account</DropdownMenuLabel>
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
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

                  <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
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
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
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
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/inbox")}
              >
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full text-xs flex items-center justify-center text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
