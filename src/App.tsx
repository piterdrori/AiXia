import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";

// Pages
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
import CalendarDayPage from "@/app/calendar/day/page";
import CalendarNewPage from "@/app/calendar/new/page";
import CalendarEditPage from "@/app/calendar/[id]/edit/page";
import ChatPage from "@/app/chat/page";
import InboxPage from "@/app/inbox/page";
import EmployeesPage from "@/app/employees/page";
import EmployeeDetailPage from "@/app/employees/[id]/page";
import EmployeePermissionsPage from "@/app/employees/[id]/permissions/page";
import SettingsPage from "@/app/settings/page";

// Layout
import DashboardLayout from "@/components/layout/DashboardLayout";

function FullscreenLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullscreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullscreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  const { restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />

        {/* Projects */}
        <Route path="/projects" element={<ProtectedRoute><DashboardLayout><ProjectsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><DashboardLayout><ProjectNewPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><DashboardLayout><ProjectDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/projects/:id/edit" element={<ProtectedRoute><DashboardLayout><ProjectEditPage /></DashboardLayout></ProtectedRoute>} />

        {/* Tasks */}
        <Route path="/tasks" element={<ProtectedRoute><DashboardLayout><TasksPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks/new" element={<ProtectedRoute><DashboardLayout><TaskNewPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><DashboardLayout><TaskDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks/:id/edit" element={<ProtectedRoute><DashboardLayout><TaskEditPage /></DashboardLayout></ProtectedRoute>} />

        {/* Calendar */}
        <Route path="/calendar" element={<ProtectedRoute><DashboardLayout><CalendarPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/calendar/day" element={<ProtectedRoute><DashboardLayout><CalendarDayPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/calendar/new" element={<ProtectedRoute><DashboardLayout><CalendarNewPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/calendar/:id/edit" element={<ProtectedRoute><DashboardLayout><CalendarEditPage /></DashboardLayout></ProtectedRoute>} />

        {/* Chat */}
        <Route path="/chat" element={<ProtectedRoute><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />

        {/* Inbox */}
        <Route path="/inbox" element={<ProtectedRoute><DashboardLayout><InboxPage /></DashboardLayout></ProtectedRoute>} />

        {/* Employees */}
        <Route path="/employees" element={<ProtectedRoute><DashboardLayout><EmployeesPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/employees/:id" element={<ProtectedRoute><DashboardLayout><EmployeeDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/employees/:id/permissions" element={<ProtectedRoute><DashboardLayout><EmployeePermissionsPage /></DashboardLayout></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </Router>
  );
}
