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

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Public Route component (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  const { restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public */}
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

        {/* Protected (Dashboard Layout) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />

        {/* Projects */}
        <Route
          path="/projects"
          element={
            <ProtectedLayout>
              <ProjectsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/projects/new"
          element={
            <ProtectedLayout>
              <ProjectNewPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedLayout>
              <ProjectDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProtectedLayout>
              <ProjectEditPage />
            </ProtectedLayout>
          }
        />

        {/* Tasks */}
        <Route
          path="/tasks"
          element={
            <ProtectedLayout>
              <TasksPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/tasks/new"
          element={
            <ProtectedLayout>
              <TaskNewPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <ProtectedLayout>
              <TaskDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/tasks/:id/edit"
          element={
            <ProtectedLayout>
              <TaskEditPage />
            </ProtectedLayout>
          }
        />

        {/* Calendar */}
        <Route
          path="/calendar"
          element={
            <ProtectedLayout>
              <CalendarPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/calendar/day/:date"
          element={
            <ProtectedLayout>
              <CalendarDayPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/calendar/new"
          element={
            <ProtectedLayout>
              <CalendarNewPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/calendar/:id/edit"
          element={
            <ProtectedLayout>
              <CalendarEditPage />
            </ProtectedLayout>
          }
        />

        {/* Chat */}
        <Route
          path="/chat"
          element={
            <ProtectedLayout>
              <ChatPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/chat/:id"
          element={
            <ProtectedLayout>
              <ChatPage />
            </ProtectedLayout>
          }
        />

        {/* Inbox */}
        <Route
          path="/inbox"
          element={
            <ProtectedLayout>
              <InboxPage />
            </ProtectedLayout>
          }
        />

        {/* Employees */}
        <Route
          path="/employees"
          element={
            <ProtectedLayout>
              <EmployeesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedLayout>
              <EmployeeDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/employees/:id/permissions"
          element={
            <ProtectedLayout>
              <EmployeePermissionsPage />
            </ProtectedLayout>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <SettingsPage />
            </ProtectedLayout>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </Router>
  );
}
