"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
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

      setQuotations((data ?? []) as FinanceQuotationRow[]);
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
        acc.total += Number(row.total_amount ?? 0);

        if (row.status === "draft") acc.draft += 1;
        if (row.status === "converted") acc.converted += 1;
        if (row.status === "accepted") acc.accepted += 1;

        return acc;
      },
      {
        total: 0,
        draft: 0,
        converted: 0,
        accepted: 0,
      }
    );
  }, [quotations]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1680px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

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

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Records
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {isLoading ? "—" : quotations.length.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Draft
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {isLoading ? "—" : summary.draft.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Converted
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {isLoading ? "—" : summary.converted.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Total Value
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {isLoading ? "—" : formatFinanceMoney(summary.total, "USD")}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="min-h-0 flex-1">
          <Card className="h-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <FileText className="h-4 w-4 text-emerald-300" />
                Quotations List
              </CardTitle>
              <CardDescription className="text-white/45">
                Current quotation records from the incoming flow.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {isLoading ? (
                <div className="p-6 text-sm text-white/50">Loading quotations...</div>
              ) : quotations.length === 0 ? (
                <div className="p-6 text-sm text-white/50">
                  No quotations found yet.
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <div className="space-y-3">
                    {quotations.map((quotation, index) => (
                      <div
                        key={quotation.id}
                        className="flex items-start justify-between gap-4 rounded-[20px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-3"
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
                              Client: {quotation.client_name_snapshot || "—"} · Company:{" "}
                              {quotation.company_name_snapshot || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-medium text-white">
                            {formatFinanceMoney(
                              quotation.total_amount,
                              quotation.currency_code || "USD"
                            )}
                          </div>
                          <div className="mt-1 text-xs text-white/35">
                            Issue {formatFinanceDate(quotation.issue_date)} · Valid{" "}
                            {formatFinanceDate(quotation.valid_until)}
                          </div>
                        </div>
                      </div>
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
