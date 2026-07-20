export type BrowserQaFindingSeverity = "low" | "medium" | "high" | "critical";

export type BrowserQaFinding = {
  severity: BrowserQaFindingSeverity;
  type: string;
  title: string;
  description: string;
  evidence?: string;
};

export type BrowserQaExecutionType = "real_browser" | "simulation" | "failed";

export type BrowserQaAuthMethod = "storage_state" | "supabase_session" | "none";

export type BrowserQaAuthState = {
  attempted: boolean;
  authenticated: boolean;
  method: BrowserQaAuthMethod;
  redirectedToLogin: boolean;
  loginUrl?: string;
  error?: string;
};

export type BrowserQaPageIdentityEvidence = {
  passed: boolean;
  route: string;
  matchedHeading?: string;
  matchedSubtitle?: string;
  matchedSignals: string[];
  missingSignals: string[];
};

export type BrowserQaReadinessEvidence = {
  waitedForSpa: boolean;
  ready: boolean;
  timeoutMs: number;
  matchedSignals: string[];
  missingSignals: string[];
  bodyTextLength: number;
  retryUsed: boolean;
  reloadUsed: boolean;
};

export type BrowserQaRunResult = {
  realBrowserUsed: boolean;
  executionType: BrowserQaExecutionType;
  targetUrl: string;
  finalUrl?: string;
  title?: string;
  status?: number | null;
  auth: BrowserQaAuthState;
  findings: BrowserQaFinding[];
  suggestions: string[];
  readiness?: BrowserQaReadinessEvidence;
  evidence: {
    screenshotPath?: string;
    consoleErrors: string[];
    failedRequests: string[];
    scannedLinks: string[];
    visibleTextSample?: string;
    pageIdentity?: BrowserQaPageIdentityEvidence;
    readiness?: BrowserQaReadinessEvidence;
  };
  error?: string;
};

export function createDefaultBrowserQaAuthState(
  overrides: Partial<BrowserQaAuthState> = {},
): BrowserQaAuthState {
  return {
    attempted: false,
    authenticated: false,
    method: "none",
    redirectedToLogin: false,
    ...overrides,
  };
}

export function isFullyAuthenticatedBrowserQaResult(result: BrowserQaRunResult): boolean {
  return (
    result.realBrowserUsed &&
    result.auth.authenticated &&
    !result.auth.redirectedToLogin &&
    result.executionType === "real_browser"
  );
}

export function formatBrowserQaError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
