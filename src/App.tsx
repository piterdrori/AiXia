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

type Status = "active" | "pending" | "inactive" | "denied";

type AccessState =
  | "unauthenticated"
  | "pending"
  | "denied"
  | "inactive"
  | "needs_profile"
  | "ready";

type ProfileAccessRow = {
  status: Status | null;
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

    if (sessionError || !session) return "unauthenticated";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status, profile_completed")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || !profile) return "unauthenticated";

    const typedProfile = profile as ProfileAccessRow;

    if (typedProfile.status === "pending") return "pending";
    if (typedProfile.status === "denied") return "denied";
    if (typedProfile.status !== "active") return "inactive";
    if (!typedProfile.profile_completed) return "needs_profile";

    return "ready";
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
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setAccessState(nextState);
    } catch (error) {
      console.error("refreshAccessState error:", error);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setAccessState("unauthenticated");
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
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

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isBootstrapping, accessState } = useAuthAccess();

  if (isBootstrapping) return <FullScreenLoader />;

  if (accessState === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (
    accessState === "pending" ||
    accessState === "denied" ||
    accessState === "inactive"
  ) {
    return <Navigate to="/login" replace />;
  }

  if (accessState === "needs_profile" && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (accessState === "ready" && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isBootstrapping, accessState } = useAuthAccess();

  if (isBootstrapping) return <FullScreenLoader />;

  if (accessState === "ready") {
    return <Navigate to="/dashboard" replace />;
  }

  if (accessState === "needs_profile") {
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
  return (
    <Router>
      <AuthAccessProvider>
        <AppRoutes />
        <Toaster />
      </AuthAccessProvider>
    </Router>
  );
}

export default App;
