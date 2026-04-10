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

import { LanguageProvider, useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/translations";
import { ClockProvider } from "@/lib/clock/provider";
import {
  canAccessRoute,
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
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
import ProjectReportDetailPage from "@/app/projects/[id]/reports/[reportId]/page";
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
import FinancePage from "@/app/finance/page";
import FinanceClientsPage from "@/app/finance/clients/page";
import FinanceVendorsPage from "@/app/finance/vendors/page";
import FinanceBankAccountsPage from "@/app/finance/bank-accounts/page";
import FinancePaymentMethodsPage from "@/app/finance/payment-methods/page";
import FinanceExpenseCategoriesPage from "@/app/finance/expense-categories/page";
import FinanceRevenueCategoriesPage from "@/app/finance/revenue-categories/page";
import FinanceMasterDataPage from "@/app/finance/master-data/page";
import FinanceTransactionsPage from "@/app/finance/transactions/page";
import FinanceInvoicesPage from "@/app/finance/invoices/page";
import FinanceNewInvoicePage from "@/app/finance/invoices/new/page";
import FinanceInvoiceDetailPage from "@/app/finance/invoices/[id]/page";
import FinanceBillsPage from "@/app/finance/bills/page";
import BillDetailPage from "@/app/finance/bills/[id]/page";
import FinancePaymentsMadePage from "@/app/finance/payments-made/page";

import FinanceExpensesPage from "@/app/finance/expenses/page";
import FinanceNewExpensePage from "@/app/finance/expenses/new/page";
import FinanceExpenseDetailPage from "@/app/finance/expenses/[id]/page";

import FinanceReimbursementsPage from "@/app/finance/reimbursements/page";
import FinanceReimbursementDetailPage from "@/app/finance/reimbursements/[id]/page";

import FinanceApprovalsPage from "@/app/finance/approvals/page";
import FinancePayrollPage from "@/app/finance/payroll/page";
import FinancePayrollProfilesPage from "@/app/finance/payroll/profiles/page";
import FinancePayrollPeriodsPage from "@/app/finance/payroll/periods/page";
import FinancePayrollRunsPage from "@/app/finance/payroll/runs/page";
import FinancePayrollRunDetailPage from "@/app/finance/payroll/runs/[id]/page";
import FinanceLedgerPage from "@/app/finance/ledger/page";
import FinanceLedgerAccountsPage from "@/app/finance/ledger/accounts/page";
import FinanceLedgerAccountDetailPage from "@/app/finance/ledger/accounts/[id]/page";
import FinanceLedgerPeriodsPage from "@/app/finance/ledger/periods/page";
import FinanceLedgerJournalsPage from "@/app/finance/ledger/journals/page";
import FinanceLedgerJournalDetailPage from "@/app/finance/ledger/journals/[id]/page";

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
  role?: Role | null;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type AccessSnapshot = {
  accessState: AccessState;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>>;
};

type AuthAccessContextValue = {
  isBootstrapping: boolean;
  accessState: AccessState;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>>;
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

async function getAccessState(): Promise<AccessSnapshot> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      return {
        accessState: "unauthenticated",
        role: null,
        permissions: {},
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status, profile_completed, role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Failed to load access profile:", profileError);
      return {
        accessState: "unauthenticated",
        role: null,
        permissions: {},
      };
    }

    const typedProfile = profile as ProfileAccessRow;

    let accessState: AccessState;

    switch (typedProfile.status) {
      case "pending_verification":
        accessState = "pending_verification";
        break;

      case "pending_profile":
        accessState = "needs_profile";
        break;

      case "pending_approval":
        accessState = "pending_approval";
        break;

      case "rejected":
        accessState = "rejected";
        break;

      case "active":
        accessState = typedProfile.profile_completed ? "ready" : "needs_profile";
        break;

      default:
        accessState = "unauthenticated";
        break;
    }

    return {
      accessState,
      role: typedProfile.role || null,
      permissions: typedProfile.permissions || {},
    };
  } catch (error) {
    console.error("getAccessState error:", error);
    return {
      accessState: "unauthenticated",
      role: null,
      permissions: {},
    };
  }
}

function AuthAccessProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [accessState, setAccessState] = useState<AccessState>("unauthenticated");
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<Permission, boolean>>>({});
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const refreshAccessState = async () => {
    const requestId = ++requestIdRef.current;

    try {
      const snapshot = await getAccessState();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setAccessState(snapshot.accessState);
      setRole(snapshot.role);
      setPermissions(snapshot.permissions);
    } catch (error) {
      console.error("refreshAccessState error:", error);

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setAccessState("unauthenticated");
      setRole(null);
      setPermissions({});
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
      role,
      permissions,
      refreshAccessState,
    }),
    [isBootstrapping, accessState, role, permissions]
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

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const { isBootstrapping, accessState, role, permissions, refreshAccessState } = useAuthAccess();

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupProfileSubscription = async () => {
      if (accessState !== "ready") {
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!mounted || !user?.id) return;

      channel = supabase
        .channel(`profile-permissions-listener-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!mounted) return;
            void refreshAccessState();
          }
        )
        .subscribe();
    };

    void setupProfileSubscription();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [accessState, refreshAccessState]);

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

  if (accessState === "ready") {
    if (!role) {
      return <Navigate to="/dashboard" replace />;
    }

    const effectivePermissions = getEffectivePermissions(role, permissions);

if (!canAccessRoute(role, location.pathname, effectivePermissions)) {
  return <Navigate to="/dashboard" replace />;
}
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
        path="/projects/:id/reports/:reportId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectReportDetailPage />
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

           <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinancePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
  path="/finance/master-data"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceTransactionsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

            <Route
        path="/finance/clients"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceClientsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

            <Route
        path="/finance/vendors"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceVendorsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
  path="/finance/bank-accounts"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceBankAccountsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/payment-methods"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaymentMethodsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/expense-categories"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseCategoriesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/revenue-categories"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceRevenueCategoriesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/invoices"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceInvoicesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/invoices/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewInvoicePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/invoices/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceInvoiceDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/bills"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceBillsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/bills/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <BillDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payments-made"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaymentsMadePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expenses"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpensesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expenses/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewExpensePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expenses/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/reimbursements"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReimbursementsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/reimbursements/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReimbursementDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/approvals"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceApprovalsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/payroll/profiles"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollProfilesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/payroll/periods"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollPeriodsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/payroll/runs"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollRunsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/payroll/runs/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollRunDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger/accounts"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerAccountsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger/accounts/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerAccountDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger/periods"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerPeriodsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger/journals"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerJournalsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/ledger/journals/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceLedgerJournalDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { setLanguage } = useLanguage();
  const mediaQueryListenerRef = useRef<((event: MediaQueryListEvent) => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let mediaQuery: MediaQueryList | null = null;

    const root = document.documentElement;

    const resolveTheme = (theme: string | null | undefined) => {
      if (theme === "light" || theme === "dark") return theme;

      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      return prefersDark ? "dark" : "light";
    };

    const applyRootSettings = (settings?: {
      theme?: string | null;
      accent_color?: string | null;
      font_size?: string | null;
      compact_mode?: boolean | null;
      language?: string | null;
    }) => {
      const themePreference = settings?.theme || "dark";
      const resolvedTheme = resolveTheme(themePreference);
      const accent = settings?.accent_color || "blue";
      const fontSize = settings?.font_size || "medium";

      root.setAttribute("data-theme-preference", themePreference);
      root.setAttribute("data-theme", resolvedTheme);
      root.setAttribute("data-accent", accent);
      root.setAttribute("data-font-size", fontSize);

      if (settings?.compact_mode) {
        root.classList.add("compact");
      } else {
        root.classList.remove("compact");
      }

      const profileLanguage =
        settings?.language === "zh" ||
        settings?.language === "ru" ||
        settings?.language === "en"
          ? (settings.language as Language)
          : "en";

      setLanguage(profileLanguage);
    };

    const applyDefaultSettings = () => {
      applyRootSettings({
        theme: "dark",
        accent_color: "blue",
        font_size: "medium",
        compact_mode: false,
        language: "en",
      });
    };

    const loadAndSubscribe = async () => {
            try {
        applyDefaultSettings();

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!mounted) return;

        if (!user) {
          setSettingsLoaded(true);
          return;
        }

        const userId = user.id;

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("theme, accent_color, font_size, compact_mode, language")
          .eq("user_id", userId)
          .single();

        if (!mounted) return;

        if (error) {
          console.error("Failed to load appearance settings:", error);
          setSettingsLoaded(true);
          return;
        }

        applyRootSettings(profileData || undefined);

        mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        mediaQueryListenerRef.current = () => {
  const currentPreference =
    root.getAttribute("data-theme-preference") || "dark";

  if (currentPreference === "system") {
    root.setAttribute("data-theme", resolveTheme("system"));
  }
};

        if (typeof mediaQuery.addEventListener === "function") {
          mediaQuery.addEventListener("change", mediaQueryListenerRef.current!);
        } else {
          mediaQuery.addListener(mediaQueryListenerRef.current!);
        }

        profileChannel = supabase
          .channel(`user-theme-settings-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!mounted) return;

              const nextProfile = payload.new as {
                theme?: string | null;
                accent_color?: string | null;
                font_size?: string | null;
                compact_mode?: boolean | null;
                language?: string | null;
              };

              applyRootSettings(nextProfile);
            }
          )
          .subscribe();

        setSettingsLoaded(true);
      } catch (error) {
        console.error("Failed to apply user settings:", error);
        if (!mounted) return;
        applyDefaultSettings();
        setSettingsLoaded(true);
      }
    };

    void loadAndSubscribe();

    return () => {
      mounted = false;

      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }

      if (mediaQuery && mediaQueryListenerRef.current) {
  if (typeof mediaQuery.removeEventListener === "function") {
    mediaQuery.removeEventListener("change", mediaQueryListenerRef.current);
  } else {
    mediaQuery.removeListener(mediaQueryListenerRef.current);
  }
}
    };
  }, [setLanguage]);

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

function App() {
  return (
    <LanguageProvider>
      <ClockProvider>
        <AppContent />
      </ClockProvider>
    </LanguageProvider>
  );
}

export default App;
