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
import CalendarNewPage from "@/app/calendar/new/page";
import CalendarEditPage from "@/app/calendar/[id]/edit/page";
import CalendarDayPage from "@/app/calendar/day/page";

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

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullscreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Public Route
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullscreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function App() {
  const restoreSession = useStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const wrap = (page: React.ReactNode) => (
    <ProtectedRoute>
      <DashboardLayout>{page}</DashboardLayout>
    </ProtectedRoute>
  );

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Dashboard */}
        <Route path="/dashboard" element={wrap(<DashboardPage />)} />

        {/* Projects */}
        <Route path="/projects" element={wrap(<ProjectsPage />)} />
        <Route path="/projects/new" element={wrap(<ProjectNewPage />)} />
        <Route path="/projects/:id" element={wrap(<ProjectDetailPage />)} />
        <Route path="/projects/:id/edit" element={wrap(<ProjectEditPage />)} />

        {/* Tasks */}
        <Route path="/tasks" element={wrap(<TasksPage />)} />
        <Route path="/tasks/new" element={wrap(<TaskNewPage />)} />
        <Route path="/tasks/:id" element={wrap(<TaskDetailPage />)} />
        <Route path="/tasks/:id/edit" element={wrap(<TaskEditPage />)} />

        {/* Calendar */}
        <Route path="/calendar" element={wrap(<CalendarPage />)} />
        <Route path="/calendar/day" element={wrap(<CalendarDayPage />)} />
        <Route path="/calendar/new" element={wrap(<CalendarNewPage />)} />
        <Route path="/calendar/:id/edit" element={wrap(<CalendarEditPage />)} />

        {/* Chat */}
        <Route path="/chat" element={wrap(<ChatPage />)} />
        <Route path="/chat/:id" element={wrap(<ChatPage />)} />

        {/* Inbox */}
        <Route path="/inbox" element={wrap(<InboxPage />)} />

        {/* Employees */}
        <Route path="/employees" element={wrap(<EmployeesPage />)} />
        <Route path="/employees/:id" element={wrap(<EmployeeDetailPage />)} />
        <Route path="/employees/:id/permissions" element={wrap(<EmployeePermissionsPage />)} />

        {/* Settings */}
        <Route path="/settings" element={wrap(<SettingsPage />)} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </Router>
  );
}

export default App;
