import {
  AixiaEmptyState,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import type {
  FinanceReportColumnDefinition,
  FinanceReportResultRow,
} from "@/lib/finance/reports/types";
import { FileBarChart2 } from "lucide-react";

function formatReportCellValue(
  value: unknown,
  format: FinanceReportColumnDefinition["format"]
) {
  if (value === null || value === undefined || value === "") return "—";

  if (format === "money") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (format === "count") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  }

  if (format === "date") {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return String(value);
}

type FinanceReportResultsTableProps = {
  columns: FinanceReportColumnDefinition[];
  rows: FinanceReportResultRow[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function FinanceReportResultsTable({
  columns,
  rows,
  emptyTitle = "No report rows found",
  emptyDescription = "Run the report to load results.",
}: FinanceReportResultsTableProps) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={FileBarChart2}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <AixiaTableShell variant="registry" minWidthClassName="min-w-[960px]">
      <thead className="aixia-table-head">
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={column.align === "right" ? "text-right" : ""}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`report-row-${index}`} className="aixia-table-row">
            {columns.map((column) => (
              <AixiaTableTextCell
                key={`${column.key}-${index}`}
                width="md"
                primary={formatReportCellValue(row[column.key], column.format)}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );
}
