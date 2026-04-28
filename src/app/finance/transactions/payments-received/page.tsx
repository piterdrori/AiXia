"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  Eye,
  FileCheck2,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

import {
  getPaymentsReceived,
  getPaymentsReceivedArchiveList,
  archivePaymentReceived,
  softDeletePaymentReceived,
  restorePaymentReceived,
  permanentlyDeletePaymentReceived,
} from "@/lib/finance/paymentsReceived";

import { getIssuedInvoicesList } from "@/lib/finance/invoicesIssued";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type PaymentReceivedListRow = {
  id: string;
  amount: number;
  converted_amount?: number | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  counterparty_name: string | null;
  client_name: string | null;
  invoice_number: string | null;
  payment_currency_code?: string | null;
  invoice_currency_code?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
};

type OpenInvoiceRow = {
  id: string;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  status: string;
  payment_status: string | null;
  counterparty_name_snapshot?: string | null;
  client_name_snapshot?: string | null;
  client_name?: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  currency_code: string | null;
};

type PaymentMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type PaymentSortKey =
  | "reference_number"
  | "client"
  | "invoice_number"
  | "amount"
  | "converted_amount"
  | "payment_date"
  | "status"
  | "currency";

type OpenInvoiceSortKey =
  | "invoice_number"
  | "client"
  | "due_date"
  | "total_amount"
  | "paid_amount"
  | "balance_due"
  | "currency_code";

type SortDirection = "asc" | "desc";

function getToneClasses(tone: PaymentMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        value: "text-emerald-100",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        value: "text-amber-100",
        accent: "bg-amber-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
        accent: "bg-violet-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
        accent: "bg-rose-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        value: "text-cyan-100",
        accent: "bg-cyan-400",
      };
  }
}

function MetricCard({ metric }: { metric: PaymentMetricCard }) {
  const tone = getToneClasses(metric.tone);
  const Icon = metric.icon;

  return (
    <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {metric.title}
            </div>
            <div
              className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${tone.value}`}
            >
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
            {metric.subtitle}
          </div>
          <div className={`h-2 w-2 shrink-0 rounded-full ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}

function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFinanceMoney(
  amount: number | string | null | undefined,
  currencyCode = "USD"
) {
  const numeric = Number(amount ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function getPaymentStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "draft":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "cancelled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "draft":
      return "Draft";
    case "cancelled":
      return "Cancelled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getCurrencyBadgeClasses(
  paymentCurrencyCode?: string | null,
  invoiceCurrencyCode?: string | null
) {
  if (
    paymentCurrencyCode &&
    invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode
  ) {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-slate-400/20 bg-white/[0.06] text-slate-300";
}

function getCurrencyBadgeLabel(
  paymentCurrencyCode?: string | null,
  invoiceCurrencyCode?: string | null
) {
  if (
    paymentCurrencyCode &&
    invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode
  ) {
    return `${paymentCurrencyCode} → ${invoiceCurrencyCode}`;
  }

  return paymentCurrencyCode || invoiceCurrencyCode || "Currency";
}

function getPaymentClientName(payment: PaymentReceivedListRow) {
  return payment.counterparty_name || payment.client_name || "—";
}

function getOpenInvoiceClientName(invoice: OpenInvoiceRow) {
  return (
    invoice.counterparty_name_snapshot ||
    invoice.client_name_snapshot ||
    invoice.client_name ||
    "—"
  );
}

function getPaymentSortValue(payment: PaymentReceivedListRow, key: PaymentSortKey) {
  switch (key) {
    case "reference_number":
      return (payment.reference_number || "Payment Record").toLowerCase();
    case "client":
      return getPaymentClientName(payment).toLowerCase();
    case "invoice_number":
      return (payment.invoice_number || "").toLowerCase();
    case "amount":
      return Number(payment.amount ?? 0);
    case "converted_amount":
      return Number(payment.converted_amount ?? payment.amount ?? 0);
    case "payment_date":
      return payment.payment_date ? new Date(payment.payment_date).getTime() : 0;
    case "status":
      return String(payment.status || "").toLowerCase();
    case "currency":
      return getCurrencyBadgeLabel(
        payment.payment_currency_code,
        payment.invoice_currency_code
      ).toLowerCase();
    default:
      return "";
  }
}

function getOpenInvoiceSortValue(invoice: OpenInvoiceRow, key: OpenInvoiceSortKey) {
  switch (key) {
    case "invoice_number":
      return (invoice.invoice_number || "Invoice").toLowerCase();
    case "client":
      return getOpenInvoiceClientName(invoice).toLowerCase();
    case "due_date":
      return invoice.due_date ? new Date(invoice.due_date).getTime() : 0;
    case "total_amount":
      return Number(invoice.total_amount ?? 0);
    case "paid_amount":
      return Number(invoice.paid_amount ?? 0);
    case "balance_due":
      return Number(invoice.balance_due ?? 0);
    case "currency_code":
      return String(invoice.currency_code || "").toLowerCase();
    default:
      return "";
  }
}

function PaymentSortHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: PaymentSortKey;
  activeSortKey: PaymentSortKey;
  sortDirection: SortDirection;
  onSort: (key: PaymentSortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:text-slate-300 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      } ${isActive ? "text-slate-300" : "text-slate-500"}`}
    >
      <span>{label}</span>
      <span className="text-[10px]">
        {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

function OpenInvoiceSortHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: OpenInvoiceSortKey;
  activeSortKey: OpenInvoiceSortKey;
  sortDirection: SortDirection;
  onSort: (key: OpenInvoiceSortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:text-slate-300 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      } ${isActive ? "text-slate-300" : "text-slate-500"}`}
    >
      <span>{label}</span>
      <span className="text-[10px]">
        {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentReceivedListRow[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [openInvoicesSearch, setOpenInvoicesSearch] = useState("");

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [archivedPayments, setArchivedPayments] = useState<
    PaymentReceivedListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [paymentSortKey, setPaymentSortKey] =
    useState<PaymentSortKey>("payment_date");
  const [paymentSortDirection, setPaymentSortDirection] =
    useState<SortDirection>("desc");
  const [openInvoiceSortKey, setOpenInvoiceSortKey] =
    useState<OpenInvoiceSortKey>("due_date");
  const [openInvoiceSortDirection, setOpenInvoiceSortDirection] =
    useState<SortDirection>("asc");

  const loadPermissions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load payments received permissions:", error);
      return;
    }

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setIsLoading((current) => current || payments.length === 0);

    try {
      const [paymentRows, invoiceRows] = await Promise.all([
        getPaymentsReceived(),
        getIssuedInvoicesList(),
      ]);

      const openInvoiceRows = invoiceRows.filter((invoice) => {
        return (
          invoice.status === "issued" &&
          Number(invoice.balance_due ?? 0) > 0
        );
      });

      setPayments((paymentRows || []) as PaymentReceivedListRow[]);
      setOpenInvoices(openInvoiceRows as OpenInvoiceRow[]);
    } catch (error) {
      console.error("Failed to load payments received:", error);
      setPayments([]);
      setOpenInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [payments.length]);

  const loadArchivedPayments = useCallback(async () => {
    setIsArchiveLoading(true);

    try {
      const rows = (await getPaymentsReceivedArchiveList()) as PaymentReceivedListRow[];
      setArchivedPayments(rows);
    } catch (error) {
      console.error("Failed to load archived payments:", error);
      setArchivedPayments([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadPayments()]);
  }, [loadPayments, loadPermissions]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedPayments();
  }, [isArchiveModalOpen, loadArchivedPayments]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payments-received-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => {
          void loadPayments();
          if (isArchiveModalOpen) {
            void loadArchivedPayments();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_record_attachments" },
        () => void loadPayments()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadPayments()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayments();
      if (isArchiveModalOpen) {
        void loadArchivedPayments();
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPayments, isArchiveModalOpen, loadArchivedPayments]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreatePaymentsReceived = !!permissions?.createFinanceRecords;

  const handleArchive = async (id: string) => {
    await archivePaymentReceived(id);

    await Promise.all([
      loadPayments(),
      isArchiveModalOpen ? loadArchivedPayments() : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    await softDeletePaymentReceived(id);

    await Promise.all([
      loadPayments(),
      isArchiveModalOpen ? loadArchivedPayments() : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    await restorePaymentReceived(id);
    await Promise.all([loadPayments(), loadArchivedPayments()]);
  };

  const handleHardDelete = async (id: string) => {
    await permanentlyDeletePaymentReceived(id);
    await Promise.all([loadPayments(), loadArchivedPayments()]);
  };

  const handlePaymentSort = (key: PaymentSortKey) => {
    if (paymentSortKey === key) {
      setPaymentSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
      return;
    }

    setPaymentSortKey(key);
    setPaymentSortDirection(key === "payment_date" ? "desc" : "asc");
  };

  const handleOpenInvoiceSort = (key: OpenInvoiceSortKey) => {
    if (openInvoiceSortKey === key) {
      setOpenInvoiceSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
      return;
    }

    setOpenInvoiceSortKey(key);
    setOpenInvoiceSortDirection(key === "due_date" ? "asc" : "desc");
  };

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return payments;
    }

    return payments.filter((payment) => {
      return (
        (payment.reference_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (payment.invoice_number || "").toLowerCase().includes(normalizedSearch) ||
        getPaymentClientName(payment).toLowerCase().includes(normalizedSearch) ||
        (payment.status || "").toLowerCase().includes(normalizedSearch) ||
        (payment.payment_currency_code || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (payment.invoice_currency_code || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [payments, search]);

  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((first, second) => {
      const firstValue = getPaymentSortValue(first, paymentSortKey);
      const secondValue = getPaymentSortValue(second, paymentSortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return paymentSortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return paymentSortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [filteredPayments, paymentSortDirection, paymentSortKey]);

  const visibleOpenInvoices = useMemo(() => {
    const normalizedSearch = openInvoicesSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return openInvoices;
    }

    return openInvoices.filter((invoice) => {
      return (
        (invoice.invoice_number || "").toLowerCase().includes(normalizedSearch) ||
        getOpenInvoiceClientName(invoice).toLowerCase().includes(normalizedSearch) ||
        (invoice.currency_code || "").toLowerCase().includes(normalizedSearch) ||
        String(invoice.status || "").toLowerCase().includes(normalizedSearch) ||
        String(invoice.payment_status || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [openInvoices, openInvoicesSearch]);

  const sortedOpenInvoices = useMemo(() => {
    return [...visibleOpenInvoices].sort((first, second) => {
      const firstValue = getOpenInvoiceSortValue(first, openInvoiceSortKey);
      const secondValue = getOpenInvoiceSortValue(second, openInvoiceSortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return openInvoiceSortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return openInvoiceSortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [openInvoiceSortDirection, openInvoiceSortKey, visibleOpenInvoices]);

  const visibleArchivedPayments = useMemo(() => {
    return archivedPayments.filter((payment) => String(payment.status) === archiveTab);
  }, [archivedPayments, archiveTab]);

  const sortedVisibleArchivedPayments = useMemo(() => {
    return [...visibleArchivedPayments].sort((first, second) => {
      const firstDate = first.payment_date ? new Date(first.payment_date).getTime() : 0;
      const secondDate = second.payment_date
        ? new Date(second.payment_date).getTime()
        : 0;

      return secondDate - firstDate;
    });
  }, [visibleArchivedPayments]);

  const metricCards = useMemo<PaymentMetricCard[]>(() => {
    const activePayments = payments.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
    const totalPayments = activePayments.length;
    const draftPayments = activePayments.filter((row) => row.status === "draft").length;
    const confirmedPayments = activePayments.filter(
      (row) => row.status === "confirmed"
    );
    const cancelledPayments = activePayments.filter(
      (row) => row.status === "cancelled"
    ).length;

    const totalConverted = confirmedPayments.reduce(
      (sum, row) => sum + Number(row.converted_amount ?? row.amount ?? 0),
      0
    );

    const multiCurrencyPayments = confirmedPayments.filter(
      (row) =>
        row.payment_currency_code &&
        row.invoice_currency_code &&
        row.payment_currency_code !== row.invoice_currency_code
    ).length;

    return [
      {
        key: "total",
        title: "Payments Received",
        value: totalPayments.toLocaleString(),
        subtitle: "Manual collection records",
        icon: Receipt,
        tone: "cyan",
      },
      {
        key: "drafts",
        title: "Draft Payments",
        value: draftPayments.toLocaleString(),
        subtitle: "Awaiting proof and confirmation",
        icon: FileCheck2,
        tone: "amber",
      },
      {
        key: "confirmed",
        title: "Confirmed Inflows",
        value: totalConverted.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        subtitle: `${confirmedPayments.length} confirmed payment records`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "multi-currency",
        title: "Multi-Currency",
        value: multiCurrencyPayments.toLocaleString(),
        subtitle: `${cancelledPayments} cancelled payment records`,
        icon: BadgeCheck,
        tone: "violet",
      },
    ];
  }, [payments]);

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Payment Registry
                </Badge>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Receipt className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      Payments Received
                    </h1>
                    <div className="mt-1 text-sm text-slate-500">
                      Manual proof-based confirmation of incoming client payments.
                    </div>
                  </div>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Payments Received tracks external client collections after invoice
                  issuance, stores evidence, supports multi-currency settlement, and
                  keeps archived and deleted records outside the active registry.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Confirmed affects balance
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Draft → Confirmed
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Auto-refresh enabled
                  </span>
                </div>
              </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active Records
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {payments.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes archived and deleted payment records.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Open Invoices
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {openInvoices.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Issued invoices with remaining balance.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canCreatePaymentsReceived ? (
                <Button
                  onClick={() =>
                    navigate("/finance/transactions/payments-received/new")
                  }
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={() => {
                  setArchiveTab("archived");
                  setIsArchiveModalOpen(true);
                }}
                className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>

        <section>
          <Card className={activeSectionClass}>
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="inline-flex w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Open Invoices
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Invoices Waiting for Payment
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Open issued invoices with remaining balance. Click an invoice
                    row to open the invoice document.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={openInvoicesSearch}
                    onChange={(event) => setOpenInvoicesSearch(event.target.value)}
                    placeholder="Search open invoices..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-amber-400/30 focus:bg-black/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto">
                  <table className="w-full min-w-[1180px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <OpenInvoiceSortHeader
                            label="Invoice No."
                            sortKey="invoice_number"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <OpenInvoiceSortHeader
                            label="Client"
                            sortKey="client"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <OpenInvoiceSortHeader
                            label="Due Date"
                            sortKey="due_date"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <OpenInvoiceSortHeader
                            label="Total"
                            sortKey="total_amount"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <OpenInvoiceSortHeader
                            label="Paid"
                            sortKey="paid_amount"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <OpenInvoiceSortHeader
                            label="Balance"
                            sortKey="balance_due"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <OpenInvoiceSortHeader
                            label="Currency"
                            sortKey="currency_code"
                            activeSortKey={openInvoiceSortKey}
                            sortDirection={openInvoiceSortDirection}
                            onSort={handleOpenInvoiceSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            Loading open invoices...
                          </td>
                        </tr>
                      ) : sortedOpenInvoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            No open invoices found.
                          </td>
                        </tr>
                      ) : (
                        sortedOpenInvoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            onClick={() =>
                              navigate(`/finance/transactions/invoices/${invoice.id}`)
                            }
                            className="cursor-pointer text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-5 py-4 font-semibold text-white">
                              {invoice.invoice_number || "Invoice"}
                            </td>

                            <td className="px-5 py-4">
                              {getOpenInvoiceClientName(invoice)}
                            </td>

                            <td className="px-5 py-4">
                              {formatFinanceDate(invoice.due_date)}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {formatFinanceMoney(
                                invoice.total_amount,
                                invoice.currency_code || "USD"
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {formatFinanceMoney(
                                invoice.paid_amount,
                                invoice.currency_code || "USD"
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {formatFinanceMoney(
                                invoice.balance_due,
                                invoice.currency_code || "USD"
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <Badge className="rounded-full border border-slate-400/20 bg-white/[0.06] px-3 py-1 text-xs text-slate-300 shadow-none">
                                {invoice.currency_code || "USD"}
                              </Badge>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(
                                      `/finance/transactions/invoices/${invoice.id}`
                                    );
                                  }}
                                  className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className={activeSectionClass}>
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Active Payments
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payments Received Registry
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Manage active payment records, open details, archive old
                    records, delete inactive records, and review settlement currency.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reference, invoice, client, status..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="max-h-[720px] overflow-y-auto">
                  <table className="w-full min-w-[1240px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Reference"
                            sortKey="reference_number"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Client"
                            sortKey="client"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Invoice"
                            sortKey="invoice_number"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <PaymentSortHeader
                            label="Paid"
                            sortKey="amount"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <PaymentSortHeader
                            label="Converted"
                            sortKey="converted_amount"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Date"
                            sortKey="payment_date"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Status"
                            sortKey="status"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <PaymentSortHeader
                            label="Currency"
                            sortKey="currency"
                            activeSortKey={paymentSortKey}
                            sortDirection={paymentSortDirection}
                            onSort={handlePaymentSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          FX Source
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            Loading payments received...
                          </td>
                        </tr>
                      ) : sortedPayments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            No payments received found.
                          </td>
                        </tr>
                      ) : (
                        sortedPayments.map((payment) => {
                          const displayConvertedAmount =
                            payment.converted_amount ?? payment.amount ?? 0;

                          return (
                            <tr
                              key={payment.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {payment.reference_number || "Payment Record"}
                              </td>

                              <td className="px-5 py-4">
                                {getPaymentClientName(payment)}
                              </td>

                              <td className="px-5 py-4">
                                {payment.invoice_number || "—"}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  payment.amount,
                                  payment.payment_currency_code || "USD"
                                )}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  displayConvertedAmount,
                                  payment.invoice_currency_code || "USD"
                                )}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(payment.payment_date)}
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                                    payment.status
                                  )}`}
                                >
                                  {getPaymentStatusLabel(payment.status)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getCurrencyBadgeClasses(
                                    payment.payment_currency_code,
                                    payment.invoice_currency_code
                                  )}`}
                                >
                                  {getCurrencyBadgeLabel(
                                    payment.payment_currency_code,
                                    payment.invoice_currency_code
                                  )}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {payment.exchange_rate_source || "—"}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/payments-received/${payment.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleArchive(payment.id)}
                                    className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleDelete(payment.id)}
                                    className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {isArchiveModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Payments Received Archive
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Archived records can be restored. Deleted records can be
                    restored or permanently deleted.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setArchiveTab("archived")}
                  className={`rounded-xl px-4 py-2 text-sm transition ${
                    archiveTab === "archived"
                      ? "bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  Archived
                </button>

                <button
                  type="button"
                  onClick={() => setArchiveTab("deleted")}
                  className={`rounded-xl px-4 py-2 text-sm transition ${
                    archiveTab === "deleted"
                      ? "bg-rose-500/15 text-rose-200"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  Deleted
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                {isArchiveLoading ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    Loading archived payments...
                  </div>
                ) : sortedVisibleArchivedPayments.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    No {archiveTab} payments found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1120px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Reference
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Client
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Invoice
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Paid
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Converted
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Date
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Status
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Currency
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {sortedVisibleArchivedPayments.map((payment) => {
                            const displayConvertedAmount =
                              payment.converted_amount ?? payment.amount ?? 0;

                            return (
                              <tr
                                key={payment.id}
                                className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                              >
                                <td className="px-5 py-4 font-semibold text-white">
                                  {payment.reference_number || "Payment Record"}
                                </td>

                                <td className="px-5 py-4">
                                  {getPaymentClientName(payment)}
                                </td>

                                <td className="px-5 py-4">
                                  {payment.invoice_number || "—"}
                                </td>

                                <td className="px-5 py-4 text-right font-semibold text-white">
                                  {formatFinanceMoney(
                                    payment.amount,
                                    payment.payment_currency_code || "USD"
                                  )}
                                </td>

                                <td className="px-5 py-4 text-right font-semibold text-white">
                                  {formatFinanceMoney(
                                    displayConvertedAmount,
                                    payment.invoice_currency_code || "USD"
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  {formatFinanceDate(payment.payment_date)}
                                </td>

                                <td className="px-5 py-4">
                                  <Badge
                                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                                      payment.status
                                    )}`}
                                  >
                                    {getPaymentStatusLabel(payment.status)}
                                  </Badge>
                                </td>

                                <td className="px-5 py-4">
                                  <Badge
                                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getCurrencyBadgeClasses(
                                      payment.payment_currency_code,
                                      payment.invoice_currency_code
                                    )}`}
                                  >
                                    {getCurrencyBadgeLabel(
                                      payment.payment_currency_code,
                                      payment.invoice_currency_code
                                    )}
                                  </Badge>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        navigate(
                                          `/finance/transactions/payments-received/${payment.id}`
                                        )
                                      }
                                      className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      variant="outline"
                                      onClick={() => void handleRestore(payment.id)}
                                      className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>

                                    {archiveTab === "deleted" ? (
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          void handleHardDelete(payment.id)
                                        }
                                        className="h-9 rounded-2xl border-rose-500/30 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
