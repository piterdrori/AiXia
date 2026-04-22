"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  RefreshCw,
  FileBadge2,
  BadgeCheck,
  Layers3,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FinanceQuotationRow = {
  id: string;
  quotation_number: string | null;
  status: string;
  issue_date: string;
  valid_until: string | null;
  total_amount: number | string | null;
  currency_code: string | null;
  client_name_snapshot: string | null;
  company_name_snapshot: string | null;
  created_at: string;
};

type QuotationMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof FileText;
  tone: "emerald" | "blue" | "violet" | "cyan";
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatMoney(
  value: number | string | null | undefined,
  currencyCode = "USD"
) {
  const numeric = toNumber(value);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDateLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getToneClasses(
  tone: QuotationMetricCard["tone"]
): {
  glow: string;
  iconWrap: string;
  accent: string;
} {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        accent: "bg-emerald-400",
      };
    case "blue":
      return {
        glow: "from-sky-500/20 via-sky-400/10 to-transparent",
        iconWrap:
          "border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
        accent: "bg-sky-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap:
          "border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_30px_rgba(139,92,246,0.18)]",
        accent: "bg-violet-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap:
          "border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.18)]",
        accent: "bg-cyan-400",
      };
  }
}

function getQuotationStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/8 text-white/70";
    case "issued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "expired":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "archived":
      return "border-white/10 bg-white/5 text-white/55";
    default:
      return "border-white/10 bg-white/8 text-white/70";
  }
}

function getQuotationStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "issued":
      return "Issued";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    case "converted":
      return "Converted";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function QuotationMetric({
  metric,
}: {
  metric: QuotationMetricCard;
}) {
  const Icon = metric.icon;
  const tone = getToneClasses(metric.tone);

  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
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

export default function FinanceQuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<FinanceQuotationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuotations = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("finance_quotations")
        .select(
          [
            "id",
            "quotation_number",
            "status",
            "issue_date",
            "valid_until",
            "total_amount",
            "currency_code",
            "client_name_snapshot",
            "company_name_snapshot",
            "created_at",
          ].join(", ")
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      setQuotations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuotations();
  }, [loadQuotations]);

  const summary = useMemo(() => {
    return quotations.reduce(
      (acc, row) => {
        acc.totalValue += toNumber(row.total_amount);

        if (row.status === "draft") acc.draftCount += 1;
        if (row.status === "converted") acc.convertedCount += 1;
        if (row.status === "accepted") acc.acceptedCount += 1;

        return acc;
      },
      {
        totalValue: 0,
        draftCount: 0,
        convertedCount: 0,
        acceptedCount: 0,
      }
    );
  }, [quotations]);

  const metricCards = useMemo<QuotationMetricCard[]>(() => {
    return [
      {
        key: "records",
        title: "Quotation Records",
        value: isLoading ? "—" : quotations.length.toLocaleString(),
        subtitle: "Commercial offers currently tracked",
        icon: FileText,
        tone: "emerald",
      },
      {
        key: "draft",
        title: "Draft Quotations",
        value: isLoading ? "—" : summary.draftCount.toLocaleString(),
        subtitle: "Items not yet converted downstream",
        icon: FileBadge2,
        tone: "blue",
      },
      {
        key: "converted",
        title: "Converted",
        value: isLoading ? "—" : summary.convertedCount.toLocaleString(),
        subtitle: "Moved forward into customer commitment",
        icon: ArrowRight,
        tone: "violet",
      },
      {
        key: "total-value",
        title: "Total Value",
        value: isLoading ? "—" : formatMoney(summary.totalValue, "USD"),
        subtitle: "Current quotation portfolio value",
        icon: Layers3,
        tone: "cyan",
      },
    ];
  }, [isLoading, quotations.length, summary]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1680px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200">
                Incoming · Quotations
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Quotations
              </h1>

              <div className="mt-2 max-w-3xl text-sm text-white/45">
                Commercial offers sent to customers before client PO, proforma,
                invoice, and payment collection.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
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
                onClick={() => void loadQuotations()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                  Quotation Analytics
                </Badge>
                <CardTitle className="text-white">
                  Quotations Overview
                </CardTitle>
                <CardDescription className="text-white/45">
                  Top-level visibility for the first step of the incoming flow.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((metric) => (
                  <QuotationMetric key={metric.key} metric={metric} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="min-h-0 flex-1">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                    Quotations List
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Current quotation records from the incoming flow.
                  </CardDescription>
                </div>

                <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70 shadow-none">
                  Live data
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {isLoading ? (
                <div className="p-6 text-sm text-white/50">
                  Loading quotations...
                </div>
              ) : quotations.length === 0 ? (
                <div className="p-6 text-sm text-white/50">
                  No quotations found yet.
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <div className="space-y-3">
                    {quotations.map((quotation, index) => (
                      <button
                        key={quotation.id}
                        type="button"
                        className="group flex w-full items-start justify-between gap-4 rounded-[20px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/75">
                            <span className="text-xs font-semibold text-white/70">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getQuotationStatusBadgeClasses(
                                  quotation.status
                                )}`}
                              >
                                {getQuotationStatusLabel(quotation.status)}
                              </Badge>

                              <div className="truncate text-sm font-medium text-white sm:text-[15px]">
                                {quotation.quotation_number || "Quotation"}
                              </div>
                            </div>

                            <div className="text-sm leading-6 text-white/48">
                              Client: {quotation.client_name_snapshot || "—"} ·
                              Company: {quotation.company_name_snapshot || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="text-right">
                            <div className="text-sm font-medium text-white">
                              {formatMoney(
                                quotation.total_amount,
                                quotation.currency_code || "USD"
                              )}
                            </div>
                            <div className="mt-1 text-xs text-white/35">
                              Issue {formatDateLabel(quotation.issue_date)} ·
                              Valid {formatDateLabel(quotation.valid_until)}
                            </div>
                          </div>

                          <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
