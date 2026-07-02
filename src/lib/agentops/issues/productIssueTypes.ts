export type ProductIssueSeverity = "critical" | "high" | "medium" | "low";

export type ProductIssueSource = "finding" | "browser_qa_issue" | "runtime_issue";

export type ProductIssueNormalizedStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "pending_verification"
  | "closed";

export type ProductIssue = {
  id?: string;
  issueCode: string;
  title: string;
  reportingAgent: string;
  module: string;
  route: string;
  severity: ProductIssueSeverity;
  status: string;
  normalizedStatus: ProductIssueNormalizedStatus;
  shortReason: string;
  source: ProductIssueSource;
  evidenceSummary: string;
  createdAt: string;
  updatedAt?: string;
  fixPrompt?: string;
  rawSourceId?: string;
  findingId?: string;
  runtimeIssueId?: string;
  priorityScore?: number;
};

export type ProductIssueCounters = {
  fixedToday: number;
  fixedThisWeek: number;
  totalFixed: number;
  stillOpen: number;
  waitingVerification: number;
};

export type ProductIssuesBundle = {
  active: ProductIssue[];
  historyFixed: ProductIssue[];
  historyClosed: ProductIssue[];
  counters: ProductIssueCounters;
};

export type ProductIssueByCodeResult = {
  productIssue: ProductIssue;
  findingId: string | null;
  runtimeIssueId: string | null;
  mode: "finding" | "bridged_runtime";
};
