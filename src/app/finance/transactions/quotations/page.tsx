"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  Receipt,
  BadgeCheck,
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
  updated_at?: string;
};

type QuotationMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "blue" | "emerald" | "amber" | "rose";
};

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

function getToneClasses(tone: QuotationMetricCard["tone"]) {
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

function MetricCard({ metric }: { metric: QuotationMetricCard }) {
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

function getQuotationStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
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
      return "border-white/20 bg-white/5 text-white/60";
    default:
      return "border-white/10 bg-white/10 text-white/75";
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

export default function FinanceQuotationsPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotations, setQuotations] = useState<FinanceQuotationRow[]>([]);
  const [search, setSearch] = useState("");

  const loadQuotations = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

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
            "updated_at",
          ].join(", ")
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      setQuotations([]);
    } finally {
      if (refreshMode) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadQuotations();
  }, [loadQuotations]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-quotations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotations" },
        () => void loadQuotations(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotation_line_items" },
        () => void loadQuotations(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadQuotations]);

  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return quotations;
    }

    return quotations.filter((quotation) => {
      return (
        (quotation.quotation_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.client_name_snapshot || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.company_name_snapshot || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.status || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [quotations, search]);

  const metricCards = useMemo<QuotationMetricCard[]>(() => {
    const activeQuotations = quotations.filter(
      (row) => row.status !== "archived"
    );

    const totalQuotations = activeQuotations.length;
    const draftQuotations = activeQuotations.filter(
      (row) => row.status === "draft"
    ).length;
    const acceptedQuotations = activeQuotations.filter(
      (row) => row.status === "accepted"
    );
    const convertedQuotations = activeQuotations.filter(
      (row) => row.status === "converted"
    ).length;

    const pipelineValue = acceptedQuotations.reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0
    );

    const pipelineCurrency = acceptedQuotations[0]?.currency_code || "USD";

    return [
      {
        key: "total",
        title: "Quotations",
        value: totalQuotations.toLocaleString(),
        subtitle: "Commercial offer records",
        icon: FileText,
        tone: "blue",
      },
      {
        key: "drafts",
        title: "Draft Quotations",
        value: draftQuotations.toLocaleString(),
        subtitle: "Offers still being prepared",
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "pipeline",
        title: "Accepted Value",
        value: formatFinanceMoney(pipelineValue, pipelineCurrency),
        subtitle: `${acceptedQuotations.length} accepted quotations awaiting PO`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "converted",
        title: "Converted",
        value: convertedQuotations.toLocaleString(),
        subtitle: "Moved forward into customer commitment",
        icon: BadgeCheck,
        tone: "rose",
      },
    ];
  }, [quotations]);

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
                    Quotations
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Quotations
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        Commercial offers before client PO, PI, invoice, and payment.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This module tracks draft, issued, accepted, rejected, expired,
                    and converted quotations. It is the first controlled document
                    in the incoming flow and provides the commercial basis before
                    customer commitment and PI issuance.
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
                  onClick={() => void loadQuotations(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
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
                    Quotation Registry
                  </Badge>

                  <CardTitle className="text-white">
                    Quotations List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Search and review quotation records, commercial status,
                    counterparty, dates, and total amount before downstream conversion.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search quotation number, client, company, or status"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {isLoading ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  Loading quotations...
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No quotations found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuotations.map((quotation) => {
                    const currencyCode = quotation.currency_code || "USD";


                                                              return (
                      <button
                        key={quotation.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/quotations/${quotation.id}`
                          )
                        }
                        className="group flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {quotation.quotation_number ||
                                (quotation.status === "draft"
                                  ? "Draft Quotation"
                                  : "Quotation")}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getQuotationStatusBadgeClasses(
                                quotation.status
                              )}`}
                            >
                              {getQuotationStatusLabel(quotation.status)}
                            </Badge>

                            <Badge className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/75 shadow-none">
                              {currencyCode}
                            </Badge>
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            {quotation.client_name_snapshot ||
                              quotation.company_name_snapshot ||
                              "Unknown"}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-4">
                            <div>
                              Issue:{" "}
                              {formatFinanceDate(quotation.issue_date)}
                            </div>

                            <div>
                              Valid Until:{" "}
                              {formatFinanceDate(quotation.valid_until)}
                            </div>

                            <div>
                              Total:{" "}
                              {formatFinanceMoney(
                                quotation.total_amount,
                                currencyCode
                              )}
                            </div>

                            <div>
                              Status:{" "}
                              {getQuotationStatusLabel(quotation.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="hidden text-xs text-white/30 transition-colors duration-200 group-hover:text-white/55 sm:block">
                            {formatFinanceDate(quotation.created_at)}
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
