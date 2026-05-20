import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
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
import ProjectTaskFieldsPage from "@/app/projects/[id]/task-fields/page";
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
import MailPage from "@/app/mail/page";
import EmployeesPage from "@/app/employees/page";
import EmployeeDetailPage from "@/app/employees/[id]/page";
import EmployeePermissionsPage from "@/app/employees/[id]/permissions/page";
import SettingsPage from "@/app/settings/page";
import AIKnowledgeBankPage from "@/app/ai-management/knowledge/page";
import FinancePage from "@/app/finance/page";
import FinanceMasterDataClientsPage from "@/app/finance/master-data/clients/page";
import FinanceMasterDataVendorsPage from "@/app/finance/master-data/vendors/page";
import FinancePaymentMethodsPage from "@/app/finance/master-data/payment-methods/page";
import FinanceExpenseCategoriesPage from "@/app/finance/master-data/expense-categories/page";
import FinanceRevenueCategoriesPage from "@/app/finance/master-data/revenue-categories/page";
import FinanceItemsPage from "@/app/finance/master-data/items/page";
import FinanceMasterDataCurrenciesPage from "@/app/finance/master-data/currencies/page";
import FinanceProjectsPage from "@/app/finance/master-data/projects/page";
import FinanceEmployeesPage from "@/app/finance/master-data/employees/page";
import FinanceMasterDataPage from "@/app/finance/master-data/page";
import FinanceMasterDataClientCreatePage from "@/app/finance/master-data/clients/new/page";
import FinanceMasterDataClientDetailPage from "@/app/finance/master-data/clients/[id]/page";
import FinanceMasterDataVendorCreatePage from "@/app/finance/master-data/vendors/new/page";
import FinanceMasterDataVendorDetailPage from "@/app/finance/master-data/vendors/[id]/page";
import FinanceMasterDataCompaniesPage from "@/app/finance/master-data/companies/page";
import FinanceMasterDataCompanyCreatePage from "@/app/finance/master-data/companies/new/page";
import FinanceMasterDataCompanyDetailPage from "@/app/finance/master-data/companies/[id]/page";
import FinanceMasterDataVendorBankAccountsPage from "@/app/finance/master-data/vendor-bank-accounts/page";
import FinanceMasterDataVendorBankAccountCreatePage from "@/app/finance/master-data/vendor-bank-accounts/new/page";
import FinanceMasterDataVendorBankAccountDetailPage from "@/app/finance/master-data/vendor-bank-accounts/[id]/page";
import FinanceMasterDataBankAccountsPage from "@/app/finance/master-data/bank-accounts/page";
import FinanceMasterDataBankAccountCreatePage from "@/app/finance/master-data/bank-accounts/new/page";
import FinanceMasterDataBankAccountDetailPage from "@/app/finance/master-data/bank-accounts/[id]/page";
import FinancePaymentTermsPage from "@/app/finance/master-data/payment-terms/page";
import FinanceShippingTermsPage from "@/app/finance/master-data/shipping-terms/page";
import FinanceUnitsOfMeasurePage from "@/app/finance/master-data/units-of-measure/page";
import FinanceTaxCodesPage from "@/app/finance/master-data/tax-codes/page";
import FinanceNumberingSequencesPage from "@/app/finance/master-data/numbering-sequences/page";
import FinanceTransactionsPage from "@/app/finance/transactions/page";
import FinanceCustomerPosPage from "@/app/finance/transactions/customer-pos/page";
import FinanceNewCustomerPoPage from "@/app/finance/transactions/customer-pos/new/page";
import FinanceCustomerPoDetailPage from "@/app/finance/transactions/customer-pos/[id]/page";
import FinanceReportsPage from "@/app/finance/reports/page";
import FinanceReportRunnerPage from "@/app/finance/reports/[reportKey]/page";
import FinanceReportsExportPage from "@/app/finance/reports/export/page";
import FinanceInvoicesPage from "@/app/finance/transactions/invoices/page";
import FinanceNewInvoicePage from "@/app/finance/transactions/invoices/new/page";
import FinanceInvoiceDetailPage from "@/app/finance/transactions/invoices/[id]/page";
import FinanceQuotationsPage from "@/app/finance/transactions/quotations/page";
import FinanceNewQuotationPage from "@/app/finance/transactions/quotations/new/page";
import FinanceQuotationDetailPage from "@/app/finance/transactions/quotations/[id]/page";
import FinanceProformaInvoiceDetailPage from "@/app/finance/transactions/proforma-invoices/[id]/page";
import FinanceVendorQuotationsPage from "@/app/finance/transactions/vendor-quotations/page";
import FinanceNewVendorQuotationPage from "@/app/finance/transactions/vendor-quotations/new/page";
import FinanceVendorQuotationDetailPage from "@/app/finance/transactions/vendor-quotations/[id]/page";
import FinancePurchaseOrdersPage from "@/app/finance/transactions/purchase-orders/page";
import FinanceNewPurchaseOrderPage from "@/app/finance/transactions/purchase-orders/new/page";
import FinancePurchaseOrderDetailPage from "@/app/finance/transactions/purchase-orders/[id]/page";
import FinanceBillsPage from "@/app/finance/transactions/bills/page";
import FinanceNewBillPage from "@/app/finance/transactions/bills/new/page";
import BillDetailPage from "@/app/finance/transactions/bills/[id]/page";
import FinancePaymentsMadePage from "@/app/finance/transactions/payments-made/page";
import FinanceNewPaymentMadePage from "@/app/finance/transactions/payments-made/new/page";
import PaymentMadeDetailPage from "@/app/finance/transactions/payments-made/[id]/page";

import FinanceExpensePaymentsMadePage from "@/app/finance/transactions/expenses-payments-made/page";
import FinanceExpenseReviewPage from "@/app/finance/transactions/expense-review/page";
import FinanceExpensePaymentReviewPage from "@/app/finance/transactions/expense-review/[id]/page";
import FinanceExpenseFundingPage from "@/app/finance/transactions/expense-funding/page";
import FinanceExpenseFundingBatchNewPage from "@/app/finance/transactions/expense-funding/new/page";
import FinanceExpenseFundingBatchDetailPage from "@/app/finance/transactions/expense-funding/[id]/page";
import FinanceExpensePaymentsPage from "@/app/finance/transactions/expense-payments/page";
import FinanceNewExpensePaymentMadePage from "@/app/finance/transactions/expense-payments/new/page";
import ExpensePaymentMadeDetailPage from "@/app/finance/transactions/expense-payments/[id]/page";
import PaymentsReceivedPage from "@/app/finance/transactions/payments-received/page";
import PaymentReceivedDetailPage from "@/app/finance/transactions/payments-received/[id]/page";
import NewPaymentReceivedPage from "@/app/finance/transactions/payments-received/new/page";

import FinancePaycheckRequestsPage from "@/app/finance/transactions/paycheck-requests/page";
import FinanceNewPaycheckRequestPage from "@/app/finance/transactions/paycheck-requests/new/page";
import FinancePaycheckRequestDetailPage from "@/app/finance/transactions/paycheck-requests/[id]/page";
import FinanceTransactionPayrollPage from "@/app/finance/transactions/payroll/page";
import FinanceNewTransactionPayrollPage from "@/app/finance/transactions/payroll/new/page";
import FinanceTransactionPayrollDetailPage from "@/app/finance/transactions/payroll/[id]/page";
import FinancePayrollReviewDetailPage from "@/app/finance/transactions/payroll/review/[id]/page";
import FinancePayrollFundingBatchNewPage from "@/app/finance/transactions/payroll/funding-batches/new/page";
import FinancePayrollFundingBatchDetailPage from "@/app/finance/transactions/payroll/funding-batches/[id]/page";

import FinanceExpensesPage from "@/app/finance/transactions/expenses/page";
import FinanceExpenseProcessPage from "@/app/finance/transactions/expenses/process/page";
import FinanceExpenseProcessDetailPage from "@/app/finance/transactions/expenses/process/[id]/page";
import FinanceExpenseDetailPage from "@/app/finance/transactions/expenses/[id]/page";

import FinanceAccessApprovalsPage from "@/app/finance/access-approvals/page";
import FinanceAccessApprovalUserDetailPage from "@/app/finance/access-approvals/[userId]/page";

import AIManagementPage from "@/app/ai-management/page";
import AICacheReviewPage from "@/app/ai-management/cache-review/page";
import AIApprovedAnswersPage from "@/app/ai-management/approved-answers/page";
import AICoreSettingsPage from "@/app/ai-management/core-settings/page";
import AIActivityLogsPage from "@/app/ai-management/activity/page";
import AIGuardrailsPage from "@/app/ai-management/guardrails/page";
import AIMemoryPage from "@/app/ai-management/memory/page";
import AICharacterPage from "@/app/ai-management/character/page";
import AIStateOfMindPage from "@/app/ai-management/state-of-mind/page";
import AIVoicePage from "@/app/ai-management/voice/page";
import AIAnimationPage from "@/app/ai-management/animation/page";

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
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsBootstrapping(false);
      }
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

function RedirectProformaNew() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("document_type", "proforma");
  return (
    <Navigate
      to={`/finance/transactions/invoices/new?${params.toString()}`}
      replace
    />
  );
}

function LegacyExpenseReviewRedirect() {
  const { id } = useParams();
  return (
    <Navigate
      to={`/finance/transactions/expense-review/${id ?? ""}`}
      replace
    />
  );
}

function LegacyExpenseFundingBatchRedirect() {
  const { id } = useParams();
  return (
    <Navigate
      to={`/finance/transactions/expense-funding/${id ?? ""}`}
      replace
    />
  );
}

function LegacyExpensePaymentRedirect() {
  const { id } = useParams();
  return (
    <Navigate
      to={`/finance/transactions/expense-payments/${id ?? ""}`}
      replace
    />
  );
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
        path="/projects/:id/task-fields"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectTaskFieldsPage />
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
        path="/mail"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MailPage />
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
        path="/ai-management"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AIManagementPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

         <Route
        path="/ai-management/knowledge"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AIKnowledgeBankPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
  path="/ai-management/cache-review"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AICacheReviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/approved-answers"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIApprovedAnswersPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

          <Route
  path="/ai-management/core-settings"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AICoreSettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/activity"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIActivityLogsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/guardrails"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIGuardrailsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/memory"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIMemoryPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/character"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AICharacterPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-management/state-of-mind"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIStateOfMindPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/ai-management/voice"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIVoicePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/ai-management/animation"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AIAnimationPage />
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
  path="/finance/master-data/projects"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceProjectsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/employees"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceEmployeesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
        path="/finance/master-data/clients/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataClientCreatePage />
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
  path="/finance/transactions/customer-pos"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceCustomerPosPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

            <Route
  path="/finance/transactions/customer-pos/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewCustomerPoPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions/customer-pos/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceCustomerPoDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/reports"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/trial-balance"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/ar-aging"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/ap-aging"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/ledger"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/categories"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/payroll"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/project"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/export"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportsExportPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/reports/:reportKey"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceReportRunnerPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/settings"
  element={<Navigate to="/finance/access-approvals" replace />}
/>

              <Route
        path="/finance/master-data/clients"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataClientsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

            <Route
        path="/finance/master-data/clients/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataClientDetailPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

              <Route
        path="/finance/master-data/vendors"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataVendorsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

            <Route
        path="/finance/master-data/companies"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataCompaniesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

            <Route
        path="/finance/master-data/vendors/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataVendorCreatePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

            <Route
        path="/finance/master-data/companies/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceMasterDataCompanyCreatePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
  path="/finance/master-data/vendors/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataVendorDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/companies/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataCompanyDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/payment-methods"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaymentMethodsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/expense-categories"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseCategoriesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/revenue-categories"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceRevenueCategoriesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/items"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceItemsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/currencies"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataCurrenciesPage />
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
  path="/finance/transactions/quotations"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceQuotationsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>
          <Route
  path="/finance/transactions/quotations/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewQuotationPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions/quotations/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceQuotationDetailPage />
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
  path="/finance/transactions/proforma-invoices"
  element={<Navigate to="/finance/transactions/invoices" replace />}
/>

<Route
  path="/finance/transactions/proforma-invoices/new"
  element={<RedirectProformaNew />}
/>

<Route
  path="/finance/transactions/proforma-invoices/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceProformaInvoiceDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/vendor-quotations"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceVendorQuotationsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/vendor-quotations/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewVendorQuotationPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/vendor-quotations/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceVendorQuotationDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/purchase-orders"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePurchaseOrdersPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/purchase-orders/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewPurchaseOrderPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/purchase-orders/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePurchaseOrderDetailPage />
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
  path="/finance/transactions/bills/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewBillPage />
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
  path="/finance/transactions/payments-made/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewPaymentMadePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payments-made/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <PaymentMadeDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-review"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseReviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-review/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpensePaymentReviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-funding"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseFundingPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-funding/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseFundingBatchNewPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-funding/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseFundingBatchDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-payments"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpensePaymentsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-payments/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewExpensePaymentMadePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expense-payments/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <ExpensePaymentMadeDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expenses-payments-made"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpensePaymentsMadePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions/expenses-payments-made/process-book-template"
  element={<Navigate to="/finance/transactions/expense-review" replace />}
/>

<Route
  path="/finance/transactions/expenses-payments-made/new"
  element={<Navigate to="/finance/transactions/expense-payments/new" replace />}
/>

<Route
  path="/finance/transactions/expenses-payments-made/review/:id"
  element={<LegacyExpenseReviewRedirect />}
/>

<Route
  path="/finance/transactions/expenses-payments-made/funding-batches/new"
  element={<Navigate to="/finance/transactions/expense-funding/new" replace />}
/>

<Route
  path="/finance/transactions/expenses-payments-made/funding-batches/:id"
  element={<LegacyExpenseFundingBatchRedirect />}
/>

<Route
  path="/finance/transactions/expenses-payments-made/:id"
  element={<LegacyExpensePaymentRedirect />}
/>

      <Route
  path="/finance/transactions/payments-received"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <PaymentsReceivedPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions/payments-received/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <NewPaymentReceivedPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/transactions/payments-received/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <PaymentReceivedDetailPage />
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
  element={<Navigate to="/finance/transactions/expenses/process" replace />}
/>

<Route
  path="/finance/transactions/expenses/process/form"
  element={<Navigate to="/finance/transactions/expenses/process" replace />}
/>

<Route
  path="/finance/transactions/expenses/process"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseProcessPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/expenses/process/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceExpenseProcessDetailPage />
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
  path="/finance/access-approvals"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceAccessApprovalsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/access-approvals/:userId"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceAccessApprovalUserDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/paycheck-requests"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaycheckRequestsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/paycheck-requests/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewPaycheckRequestPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/paycheck-requests/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaycheckRequestDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceTransactionPayrollPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNewTransactionPayrollPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll/review/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollReviewDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll/funding-batches/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollFundingBatchNewPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll/funding-batches/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePayrollFundingBatchDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/transactions/payroll/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceTransactionPayrollDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/vendor-bank-accounts"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataVendorBankAccountsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/vendor-bank-accounts/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataVendorBankAccountCreatePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/vendor-bank-accounts/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataVendorBankAccountDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/bank-accounts"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataBankAccountsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/bank-accounts/new"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataBankAccountCreatePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/finance/master-data/bank-accounts/:id"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceMasterDataBankAccountDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/payment-terms"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinancePaymentTermsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/shipping-terms"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceShippingTermsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/units-of-measure"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceUnitsOfMeasurePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/tax-codes"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceTaxCodesPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

      <Route
  path="/finance/master-data/numbering-sequences"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceNumberingSequencesPage />
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
