"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
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
import { getPaymentsReceived } from "@/lib/finance/paymentsReceived";

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
  client_name: string | null;
  invoice_number: string | null;
  payment_currency_code?: string | null;
  invoice_currency_code?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
};

type PaymentMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "blue" | "emerald" | "amber" | "rose";
};

function getToneClasses(tone: PaymentMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap:
          "border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.18)]",
        accent: "bg-amber-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap:
          "border-rose-400/20 bg-rose-500/10 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.18)]",
        accent: "bg-rose-400",
      };
    case "blue":
    default:
      return {
        glow: "from-sky-500/20 via-sky-400/10 to-transparent",
        iconWrap:
          "border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
        accent: "bg-sky-400",
      };
  }
}

function MetricCard({ metric }: { metric: PaymentMetricCard }) {
  const tone = getToneClasses(metric.tone);
  const Icon = metric.icon;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />
      <div className="relative flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {metric.title}
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-sm text-white/55">{metric.subtitle}</div>
          <div className={`h-2 w-2 rounded-full ${tone.accent}`} />
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

  return "border-white/10 bg-white/10 text-white/75";
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

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentReceivedListRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

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

  const loadPayments = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const rows = (await getPaymentsReceived()) as PaymentReceivedListRow[];
      setPayments(rows);
    } catch (error) {
      console.error("Failed to load payments received:", error);
      setPayments([]);
    } finally {
      if (refreshMode) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadPayments()]);
  }, [loadPayments, loadPermissions]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payments-received-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadPayments(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_record_attachments" },
        () => void loadPayments(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadPayments(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPayments]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreatePaymentsReceived = !!permissions?.createFinanceRecords;

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
        (payment.client_name || "").toLowerCase().includes(normalizedSearch) ||
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

  const metricCards = useMemo<PaymentMetricCard[]>(() => {
    const totalPayments = payments.length;
    const draftPayments = payments.filter((row) => row.status === "draft").length;
    const confirmedPayments = payments.filter(
      (row) => row.status === "confirmed"
    );
    const cancelledPayments = payments.filter(
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
        tone: "blue",
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
        value: formatFinanceMoney(totalConverted, "USD"),
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
        tone: "rose",
      },
    ];
  }, [payments]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Payments received
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <Receipt className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Payments Received
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        Manual proof-based confirmation of incoming client
                        payments.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This module tracks external client payments after invoice
                    issuance, stores manual evidence, supports multi-currency
                    settlement, and only confirmed payment records affect invoice
                    balances.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadPayments(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                {canCreatePaymentsReceived ? (
                  <Button
                    onClick={() =>
                      navigate("/finance/transactions/payments-received/new")
                    }
                    className="h-11 rounded-2xl px-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Payment
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                    Payment Registry
                  </Badge>

                  <CardTitle className="text-white">
                    Payments Received List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Search and open payment records, review invoice linkage,
                    collection status, settlement currency, converted value, and
                    payment date.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reference, invoice, client, or currency"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {isLoading ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  Loading payments received...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No payments received found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => {
                    const displayConvertedAmount =
                      payment.converted_amount ?? payment.amount ?? 0;

                    return (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/payments-received/${payment.id}`
                          )
                        }
                        className="group flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {payment.reference_number || "Payment Record"}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getPaymentStatusBadgeClasses(
                                payment.status
                              )}`}
                            >
                              {getPaymentStatusLabel(payment.status)}
                            </Badge>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getCurrencyBadgeClasses(
                                payment.payment_currency_code,
                                payment.invoice_currency_code
                              )}`}
                            >
                              {getCurrencyBadgeLabel(
                                payment.payment_currency_code,
                                payment.invoice_currency_code
                              )}
                            </Badge>
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            {payment.client_name || "—"}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-5">
                            <div>
                              Invoice: {payment.invoice_number || "—"}
                            </div>
                            <div>
                              Paid:{" "}
                              {formatFinanceMoney(
                                payment.amount,
                                payment.payment_currency_code || "USD"
                              )}
                            </div>
                            <div>
                              Converted:{" "}
                              {formatFinanceMoney(
                                displayConvertedAmount,
                                payment.invoice_currency_code || "USD"
                              )}
                            </div>
                            <div>
                              Date: {formatFinanceDate(payment.payment_date)}
                            </div>
                            <div>
                              FX Source: {payment.exchange_rate_source || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="hidden text-xs text-white/30 transition-colors duration-200 group-hover:text-white/55 sm:block">
                            {formatFinanceDate(payment.payment_date)}
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
