export type FinanceReportKey =
  | "trial-balance"
  | "ar-aging"
  | "ap-aging"
  | "ledger"
  | "categories"
  | "payroll"
  | "project"
  | "export"
  | "incoming-money"
  | "supplier-procurement"
  | "expenses"
  | "cash-movement";

export type FinanceReportParameterType = "date" | "text" | "select";

export type FinanceReportParameterDefinition = {
  key: string;
  label: string;
  type: FinanceReportParameterType;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type FinanceReportColumnDefinition = {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: "text" | "money" | "date" | "count";
};

export type FinanceReportDefinition = {
  key: FinanceReportKey;
  title: string;
  description: string;
  route: string;
  rpcName?: string;
  rpcNames?: string[];
  parameters: FinanceReportParameterDefinition[];
  columns: FinanceReportColumnDefinition[];
  readOnly: boolean;
  statusLabel: string;
};

export type FinanceReportParameterValues = Record<string, string>;

export type FinanceReportResultRow = Record<string, unknown>;
