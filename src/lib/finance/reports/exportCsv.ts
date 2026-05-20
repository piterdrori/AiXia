import type { FinanceReportColumnDefinition, FinanceReportResultRow } from "./types";

function escapeCsvValue(value: unknown) {
  const stringValue =
    value === null || value === undefined ? "" : String(value).replaceAll('"', '""');

  return `"${stringValue}"`;
}

function formatCellValue(
  value: unknown,
  format: FinanceReportColumnDefinition["format"]
) {
  if (value === null || value === undefined) return "";

  if (format === "money" || format === "count") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : String(value);
  }

  return String(value);
}

export function buildFinanceReportCsv(
  columns: FinanceReportColumnDefinition[],
  rows: FinanceReportResultRow[]
) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) =>
          escapeCsvValue(formatCellValue(row[column.key], column.format))
        )
        .join(",")
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function downloadFinanceReportCsv(
  filename: string,
  columns: FinanceReportColumnDefinition[],
  rows: FinanceReportResultRow[]
) {
  const csv = buildFinanceReportCsv(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
