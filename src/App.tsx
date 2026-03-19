import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "@/app/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
import DashboardPage from "@/app/dashboard/page";
import ProjectsPage from "@/app/projects/page";
import ProjectDetailPage from "@/app/projects/[id]/page";
import ProjectNewPage from "@/app/projects/new/page";
import ProjectEditPage from "@/app/projects/[id]/edit/page";
import TasksPage from "@/app/tasks/page";
import TaskDetailPage from "@/app/tasks/[id]/page";
import TaskNewPage from "@/app/tasks/new/page";
import TaskEditPage from "@/app/tasks/[id]/edit/page";
import CalendarPage from "@/app/calendar/page";
import CalendarNewPage from "@/app/calendar/new/page";
import CalendarEditPage from "@/app/calendar/[id]/edit/page";
import CalendarDayPage from "@/app/calendar/day/page";
import ChatPage from "@/app/chat/page";
import InboxPage from "@/app/inbox/page";
import EmployeesPage from "@/app/employees/page";
import EmployeeDetailPage from "@/app/employees/[id]/page";
import EmployeePermissionsPage from "@/app/employees/[id]/permissions/page";
import SettingsPage from "@/app/settings/page";
import OnboardingPage from "@/app/onboarding/page";
import DashboardLayout from "@/components/layout/DashboardLayout";

type ProfileStatus =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected";

type AccessState =
  | "unauthenticated"
  | "pending_verification"
  | "needs_profile"
  | "pending_approval"
  | "rejected"
  | "ready";

type ProfileAccessRow = {
  status: ProfileStatus | null;
  profile_completed?: boolean | null;
};

type AuthAccessContextValue = {
  isBootstrapping: boolean;
  accessState: AccessState;
  refreshAccessState: () => Promise<void>;
};

const AuthAccessContext = createContext<AuthAccessContextValue | null>(null);

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
    </div>
  );
}

async function getAccessState(): Promise<AccessState> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return "unauthenticated";
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status, profile_completed")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Failed to load access profile:", profileError);
      return "unauthenticated";
    }

    const typedProfile = profile as ProfileAccessRow;

    switch (typedProfile.status) {
      case "pending_verification":
        return "pending_verification";

      case "pending_profile":
        return "needs_profile";

      case "pending_approval":
        return "pending_approval";

      case "rejected":
        return "rejected";

      case "active":
        return typedProfile.profile_completed ? "ready" : "needs_profile";

      default:
        return "unauthenticated";
    }
  } catch (error) {
    console.error("getAccessState error:", error);
    return "unauthenticated";
  }
}

function AuthAccessProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [accessState, setAccessState] = useState<AccessState>("unauthenticated");
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const refreshAccessState = async () => {
    const requestId = ++requestIdRef.current;

    try {
      const nextState = await getAccessState();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setAccessState(nextState);
    } catch (error) {
      console.error("refreshAccessState error:", error);

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setAccessState("unauthenticated");
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void refreshAccessState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        void refreshAccessState();
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthAccessContextValue>(
    () => ({
      isBootstrapping,
      accessState,
      refreshAccessState,
    }),
    [isBootstrapping, accessState]
  );

  return (
    <AuthAccessContext.Provider value={value}>
      {children}
    </AuthAccessContext.Provider>
  );
}

function useAuthAccess() {
  const context = useContext(AuthAccessContext);

  if (!context) {
    throw new Error("useAuthAccess must be used inside AuthAccessProvider");
  }

  return context;
}

function SessionTimeoutManager() {
  const { accessState, isBootstrapping } = useAuthAccess();
  const location = useLocation();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isBootstrapping) return;

    const isAuthenticated =
      accessState !== "unauthenticated" &&
      accessState !== "pending_approval" &&
      accessState !== "rejected";

    if (!isAuthenticated) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const logout = async () => {
      await supabase.auth.signOut();
      window.location.replace("/login");
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        void logout();
      }, 2 * 60 * 60 * 1000);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
      "click",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer);
    });

    document.addEventListener("visibilitychange", resetTimer);

    resetTimer();

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });

      document.removeEventListener("visibilitychange", resetTimer);
    };
  }, [accessState, isBootstrapping, location.pathname]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isBootstrapping, accessState } = useAuthAccess();

  if (isBootstrapping) {
    return <FullScreenLoader />;
  }

  if (accessState === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (accessState === "pending_approval" || accessState === "rejected") {
    return <Navigate to="/login" replace />;
  }

  if (
    (accessState === "pending_verification" || accessState === "needs_profile") &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (accessState === "ready" && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isBootstrapping, accessState } = useAuthAccess();
  const location = useLocation();

  if (isBootstrapping) {
    return <FullScreenLoader />;
  }

  const allowAuthenticatedPublicPaths = [
    "/reset-password",
    "/forgot-password",
  ];

  const isAllowedAuthenticatedPublicPath = allowAuthenticatedPublicPaths.includes(
    location.pathname
  );

  if (accessState === "ready" && !isAllowedAuthenticatedPublicPath) {
    return <Navigate to="/dashboard" replace />;
  }

  if (accessState === "needs_profile" && !isAllowedAuthenticatedPublicPath) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      <Route
  path="/forgot-password"
  element={
    <PublicRoute>
      <ForgotPasswordPage />
    </PublicRoute>
  }
/>

<Route
  path="/reset-password"
  element={
    <PublicRoute>
      <ResetPasswordPage />
    </PublicRoute>
  }
/>
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectNewPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectDetailPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectEditPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TasksPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TaskNewPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TaskDetailPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TaskEditPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CalendarPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CalendarNewPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/day/:date"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CalendarDayPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CalendarEditPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ChatPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ChatPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <InboxPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <EmployeesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <EmployeeDetailPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id/permissions"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <EmployeePermissionsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const applyUserSettings = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const root = document.documentElement;

        // default values before login or if profile settings are missing
        root.setAttribute("data-theme", "dark");
        root.setAttribute("data-accent", "indigo");
        root.setAttribute("data-font-size", "medium");
        root.classList.remove("compact");

        if (!session?.user) {
          setSettingsLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("theme, accent_color, font_size, compact_mode")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Failed to load appearance settings:", error);
          setSettingsLoaded(true);
          return;
        }

        root.setAttribute("data-theme", data?.theme || "dark");
        root.setAttribute("data-accent", data?.accent_color || "indigo");
        root.setAttribute("data-font-size", data?.font_size || "medium");

        if (data?.compact_mode) {
          root.classList.add("compact");
        } else {
          root.classList.remove("compact");
        }
      } catch (error) {
        console.error("Failed to apply user settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    void applyUserSettings();
  }, []);

  if (!settingsLoaded) {
    return <FullScreenLoader />;
  }

  return (
    <Router>
      <AuthAccessProvider>
        <SessionTimeoutManager />
        <AppRoutes />
        <Toaster />
      </AuthAccessProvider>
    </Router>
  );
}

export default App;
