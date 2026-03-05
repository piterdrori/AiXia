import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthedLayout({ children }: { children: React.ReactNode }) {
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
  }, [restoreSession]);

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<AuthedLayout><DashboardPage /></AuthedLayout>} />

        {/* Projects */}
        <Route path="/projects" element={<AuthedLayout><ProjectsPage /></AuthedLayout>} />
        <Route path="/projects/new" element={<AuthedLayout><ProjectNewPage /></AuthedLayout>} />
        <Route path="/projects/:id" element={<AuthedLayout><ProjectDetailPage /></AuthedLayout>} />
        <Route path="/projects/:id/edit" element={<AuthedLayout><ProjectEditPage /></AuthedLayout>} />

        {/* Tasks */}
        <Route path="/tasks" element={<AuthedLayout><TasksPage /></AuthedLayout>} />
        <Route path="/tasks/new" element={<AuthedLayout><TaskNewPage /></AuthedLayout>} />
        <Route path="/tasks/:id" element={<AuthedLayout><TaskDetailPage /></AuthedLayout>} />
        <Route path="/tasks/:id/edit" element={<AuthedLayout><TaskEditPage /></AuthedLayout>} />

        {/* Calendar */}
        <Route path="/calendar" element={<AuthedLayout><CalendarPage /></AuthedLayout>} />
        <Route path="/calendar/day/:date" element={<AuthedLayout><CalendarDayPage /></AuthedLayout>} />
        <Route path="/calendar/new" element={<AuthedLayout><CalendarNewPage /></AuthedLayout>} />
        <Route path="/calendar/:id/edit" element={<AuthedLayout><CalendarEditPage /></AuthedLayout>} />

        {/* Chat */}
        <Route path="/chat" element={<AuthedLayout><ChatPage /></AuthedLayout>} />
        <Route path="/chat/:id" element={<AuthedLayout><ChatPage /></AuthedLayout>} />

        {/* Inbox */}
        <Route path="/inbox" element={<AuthedLayout><InboxPage /></AuthedLayout>} />

        {/* Employees */}
        <Route path="/employees" element={<AuthedLayout><EmployeesPage /></AuthedLayout>} />
        <Route path="/employees/:id" element={<AuthedLayout><EmployeeDetailPage /></AuthedLayout>} />
        <Route path="/employees/:id/permissions" element={<AuthedLayout><EmployeePermissionsPage /></AuthedLayout>} />

        {/* Settings */}
        <Route path="/settings" element={<AuthedLayout><SettingsPage /></AuthedLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </Router>
  );
}
