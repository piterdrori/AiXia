import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileBarChart2, ShieldCheck } from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaSection,
} from "@/components/aixia";
import { FinanceReportParameterPanel } from "@/components/finance/reports/FinanceReportParameterPanel";
import { FinanceReportResultsTable } from "@/components/finance/reports/FinanceReportResultsTable";
import { getFinanceReportDefinition } from "@/lib/finance/reports/catalog";
import { downloadFinanceReportCsv } from "@/lib/finance/reports/exportCsv";
import type {
  FinanceReportParameterValues,
  FinanceReportResultRow,
} from "@/lib/finance/reports/types";
import { supabase } from "@/lib/supabase";

function buildDefaultParameterValues(
  parameters: { key: string }[]
): FinanceReportParameterValues {
  return parameters.reduce<FinanceReportParameterValues>((accumulator, parameter) => {
    accumulator[parameter.key] = "";
    return accumulator;
  }, {});
}

async function loadLedgerRows(): Promise<FinanceReportResultRow[]> {
  const { data, error } = await supabase
    .from("finance_journal_lines")
    .select(
      `
        id,
        debit,
        credit,
        description,
        finance_journal_entries (
          entry_date,
          entry_number
        ),
        finance_accounts (
          account_code
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => {
    const entry = row.finance_journal_entries as
      | { entry_date?: string; entry_number?: string }
      | null
      | undefined;
    const account = row.finance_accounts as { account_code?: string } | null | undefined;

    return {
      entry_date: entry?.entry_date ?? null,
      entry_number: entry?.entry_number ?? "—",
      account_code: account?.account_code ?? "—",
      description: row.description ?? "—",
      debit: row.debit ?? 0,
      credit: row.credit ?? 0,
    };
  });
}

async function loadCategoryRows(): Promise<FinanceReportResultRow[]> {
  const [revenueResult, expenseResult] = await Promise.all([
    supabase.rpc("finance_revenue_by_category"),
    supabase.rpc("finance_expense_by_category"),
  ]);

  if (revenueResult.error) throw revenueResult.error;
  if (expenseResult.error) throw expenseResult.error;

  const revenueRows = ((revenueResult.data || []) as Record<string, unknown>[]).map(
    (row) => ({
      category_name: row.category_name ?? "Unmapped Revenue Category",
      category_code: row.category_code ?? "—",
      source_type: "Revenue",
      total_amount: row.total_revenue ?? 0,
    })
  );

  const expenseRows = ((expenseResult.data || []) as Record<string, unknown>[]).map(
    (row) => ({
      category_name: row.category_name ?? "Unmapped Expense Category",
      category_code: row.category_code ?? "—",
      source_type: row.source_type ?? "Expense",
      total_amount: row.total_amount ?? 0,
    })
  );

  return [...revenueRows, ...expenseRows];
}

export default function FinanceReportRunnerPage() {
  const navigate = useNavigate();
  const { reportKey = "" } = useParams();
  const report = useMemo(() => getFinanceReportDefinition(reportKey), [reportKey]);

  const [parameterValues, setParameterValues] = useState<FinanceReportParameterValues>({});
  const [rows, setRows] = useState<FinanceReportResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    setParameterValues(buildDefaultParameterValues(report.parameters));
  }, [report]);

  const runReport = useCallback(async () => {
    if (!report) return;

    setIsRunning(true);
    setPageError(null);

    try {
      if (report.key === "export") {
        setRows([
          {
            report_name: "Financial Reports Export Center",
            status: "Planned",
            generated_at: new Date().toISOString(),
          },
        ]);
        return;
      }

      if (report.key === "ledger") {
        const ledgerRows = await loadLedgerRows();
        setRows(ledgerRows);
        return;
      }

      if (report.key === "categories") {
        const categoryRows = await loadCategoryRows();
        setRows(categoryRows);
        return;
      }

      if (report.key === "cash-movement") {
        const { data, error } = await supabase.rpc("finance_reports_overview");
        if (error) throw error;

        const overview = ((data || [])[0] || {}) as Record<string, unknown>;
        setRows([
          {
            metric: "Payments In This Period",
            amount: overview.payments_in_this_period ?? 0,
          },
          {
            metric: "Payments Out This Period",
            amount: overview.payments_out_this_period ?? 0,
          },
          {
            metric: "Net Cash Movement",
            amount: overview.cash_movement_this_period ?? 0,
          },
        ]);
        return;
      }

      if (!report.rpcName) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase.rpc(report.rpcName);
      if (error) throw error;

      setRows((data || []) as FinanceReportResultRow[]);
    } catch (error) {
      console.error(`Failed to run finance report ${report.key}:`, error);
      setPageError(
        error instanceof Error ? error.message : "Failed to run finance report."
      );
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  }, [report]);

  useEffect(() => {
    if (!report) {
      setIsLoading(false);
      return;
    }

    void runReport();
  }, [report, runReport]);

  const handleExport = useCallback(() => {
    if (!report || rows.length === 0) return;
    downloadFinanceReportCsv(`${report.key}-report`, report.columns, rows);
  }, [report, rows]);

  if (!report) {
    return (
      <FinancePage>
        <AixiaAlert tone="error">Report not found.</AixiaAlert>
        <AixiaButton type="button" variant="secondary" onClick={() => navigate("/finance/reports")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </AixiaButton>
      </FinancePage>
    );
  }

  if (isLoading) {
    return <AixiaLoadingState title={`Loading ${report.title}`} />;
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Reports"
        parentPath="/finance/reports"
        gradientTitle={report.title}
        title={report.title}
        subtitle={report.description}
        actions={
          <AixiaButton type="button" variant="secondary" onClick={() => navigate("/finance/reports")}>
            <ArrowLeft className="h-4 w-4" />
            Reports Hub
          </AixiaButton>
        }
      />

      <div className="aixia-command-scroll">
        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

        <AixiaAccessRule title="Read-only report rule" description="Report results are loaded from live finance reporting functions." icon={ShieldCheck}>
          Report results are loaded from live finance reporting functions. No records can be
          created, edited, posted, approved, or deleted from this page.
        </AixiaAccessRule>

        <AixiaSection
          title="Parameters"
          icon={FileBarChart2}
          badge={<AixiaBadge tone="neutral">{report.readOnly ? "Read-only" : "Editable"}</AixiaBadge>}
        >
          <FinanceReportParameterPanel
            parameters={report.parameters}
            values={parameterValues}
            isRunning={isRunning}
            onChange={(key, value) =>
              setParameterValues((current) => ({ ...current, [key]: value }))
            }
            onRun={() => void runReport()}
            onExport={handleExport}
            canExport={rows.length > 0}
          />
        </AixiaSection>

        <AixiaSection
          title="Results"
          description={`${formatCount(rows.length)} rows loaded`}
          icon={FileBarChart2}
        >
          <FinanceReportResultsTable
            columns={report.columns}
            rows={rows}
            emptyTitle={`No ${report.title} rows found`}
            emptyDescription="Run the report again after records are posted."
          />
        </AixiaSection>
      </div>
    </FinancePage>
  );
}

function formatCount(value: number) {
  return value.toLocaleString();
}
