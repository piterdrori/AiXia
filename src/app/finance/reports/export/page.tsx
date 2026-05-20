import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw } from "lucide-react";

import {
  AixiaAlert,
  AixiaButton,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaSection,
  AixiaSignalRow,
} from "@/components/aixia";
import { FinanceReportResultsTable } from "@/components/finance/reports/FinanceReportResultsTable";
import { FinanceReportParameterPanel } from "@/components/finance/reports/FinanceReportParameterPanel";
import { FINANCE_REPORT_CATALOG } from "@/lib/finance/reports/catalog";
import { downloadFinanceReportCsv } from "@/lib/finance/reports/exportCsv";
import type {
  FinanceReportParameterValues,
  FinanceReportResultRow,
} from "@/lib/finance/reports/types";
import { supabase } from "@/lib/supabase";

type ExportSectionKey =
  | "trial-balance"
  | "ar-aging"
  | "ap-aging"
  | "payroll"
  | "project";

type ExportSection = {
  key: ExportSectionKey;
  title: string;
  rpcName: string;
};

const EXPORT_SECTIONS: ExportSection[] = [
  { key: "trial-balance", title: "Trial Balance", rpcName: "finance_trial_balance" },
  { key: "ar-aging", title: "AR Aging", rpcName: "finance_ar_aging" },
  { key: "ap-aging", title: "AP Aging", rpcName: "finance_ap_aging" },
  { key: "payroll", title: "Payroll Summary", rpcName: "finance_payroll_summary" },
  { key: "project", title: "Project Financial View", rpcName: "finance_project_financial_view" },
];

const exportDefinition = FINANCE_REPORT_CATALOG.find((report) => report.key === "export")!;

export default function FinanceReportsExportPage() {
  const navigate = useNavigate();
  const [parameterValues, setParameterValues] = useState<FinanceReportParameterValues>({
    date_from: "",
    date_to: "",
  });
  const [sectionRows, setSectionRows] = useState<
    Partial<Record<ExportSectionKey, FinanceReportResultRow[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const loadSectionRows = useCallback(async () => {
    const results = await Promise.all(
      EXPORT_SECTIONS.map(async (section) => {
        const definition = FINANCE_REPORT_CATALOG.find((report) => report.key === section.key);
        if (!definition?.rpcName) {
          return [section.key, []] as const;
        }

        const { data, error } = await supabase.rpc(definition.rpcName);
        if (error) throw error;

        return [section.key, (data || []) as FinanceReportResultRow[]] as const;
      })
    );

    return Object.fromEntries(results) as Partial<
      Record<ExportSectionKey, FinanceReportResultRow[]>
    >;
  }, []);

  const runPreview = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      setSectionRows(await loadSectionRows());
      setLastGeneratedAt(new Date().toISOString());
    } catch (error) {
      console.error("Failed to load financial report pack preview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load financial report pack preview."
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadSectionRows]);

  const previewSummary = useMemo(() => {
    return EXPORT_SECTIONS.map((section) => ({
      label: section.title,
      value: formatCount(sectionRows[section.key]?.length ?? 0),
      tone: (sectionRows[section.key]?.length ?? 0) > 0 ? ("cyan" as const) : ("neutral" as const),
    }));
  }, [sectionRows]);

  const handleDownloadBundle = useCallback(async () => {
    setIsExporting(true);
    setPageError(null);

    try {
      const rows =
        Object.keys(sectionRows).length > 0 ? sectionRows : await loadSectionRows();

      if (Object.keys(sectionRows).length === 0) {
        setSectionRows(rows);
        setLastGeneratedAt(new Date().toISOString());
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const generatedAt = lastGeneratedAt ?? new Date().toISOString();

      for (const section of EXPORT_SECTIONS) {
        const definition = FINANCE_REPORT_CATALOG.find((report) => report.key === section.key);
        const data = rows[section.key] ?? [];

        if (!definition || data.length === 0) continue;

        downloadFinanceReportCsv(
          `finance-${section.key}-${stamp}`,
          definition.columns,
          data
        );
      }

      const summaryRows: FinanceReportResultRow[] = EXPORT_SECTIONS.map((section) => ({
        report_name: section.title,
        status: (rows[section.key]?.length ?? 0) > 0 ? "Exported" : "Empty",
        generated_at: generatedAt,
        row_count: rows[section.key]?.length ?? 0,
      }));

      downloadFinanceReportCsv(
        `finance-report-pack-summary-${stamp}`,
        exportDefinition.columns,
        summaryRows
      );
    } catch (error) {
      console.error("Failed to export financial report pack:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to export financial report pack."
      );
    } finally {
      setIsExporting(false);
    }
  }, [lastGeneratedAt, loadSectionRows, sectionRows]);

  return (
    <FinancePage className="aixia-finance-page">
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Reports"
        parentPath="/finance/reports"
        gradientTitle="Financial Reports"
        title="Financial Reports"
        subtitle="Export finance report packs to CSV"
        actions={
          <AixiaButton type="button" variant="secondary" onClick={() => navigate("/finance/reports")}>
            <ArrowLeft className="h-4 w-4" />
            Reports Hub
          </AixiaButton>
        }
      />

      <div className="aixia-command-scroll">
      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      <AixiaSection
        title="Report Pack Parameters"
icon={FileSpreadsheet}
      >
        <FinanceReportParameterPanel
          parameters={exportDefinition.parameters}
          values={parameterValues}
          isRunning={isLoading}
          onChange={(key, value) =>
            setParameterValues((current) => ({ ...current, [key]: value }))
          }
          onRun={() => void runPreview()}
          onExport={() => void handleDownloadBundle()}
          canExport={!isExporting}
        />
      </AixiaSection>

      {isLoading ? (
        <AixiaLoadingState
          title="Loading report pack preview"
/>
      ) : (
        <>
          <AixiaSection
            title="Pack Preview Summary"
icon={RefreshCw}
          >
            <div className="aixia-stack">
              {previewSummary.map((item) => (
                <AixiaSignalRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
          </AixiaSection>

          {EXPORT_SECTIONS.map((section) => {
            const definition = FINANCE_REPORT_CATALOG.find((report) => report.key === section.key);
            const rows = sectionRows[section.key] ?? [];

            if (!definition) return null;

            return (
              <AixiaSection
                key={section.key}
                title={section.title}
                description={`${formatCount(rows.length)} rows in preview`}
                icon={FileSpreadsheet}
              >
                <FinanceReportResultsTable
                  columns={definition.columns}
                  rows={rows.slice(0, 25)}
                  emptyTitle={`No ${section.title} rows`}
                  emptyDescription="Run the pack preview after finance records are posted."
                />
              </AixiaSection>
            );
          })}
        </>
      )}

      <AixiaSection
        title="Export Actions"
icon={Download}
      >
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isExporting || isLoading}
          onClick={() => void handleDownloadBundle()}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Preparing bundle…" : "Download full CSV bundle"}
        </AixiaButton>
      </AixiaSection>
      </div>
    </FinancePage>
  );
}

function formatCount(value: number) {
  return value.toLocaleString();
}
