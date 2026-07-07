/** Owner-friendly copy for scheduled monitoring UI — Phase 4 + 5G. */

export const MONITORING_OWNER_DISPLAY = {
  sectionTitle: "Scheduled monitoring",
  sectionDescription:
    "Staging-only scheduled cloud monitoring (dry-run). Operational scans every 6 hours; weekly improvement review Sunday 02:00 UTC.",

  monitoringLevelPrepared: "Level 1 — scheduled monitoring active",
  monitoringLevelManual: "Level 0 — manual only",

  activationNotCloud: "Not cloud-active",
  activationLocalDryRun: "Scheduled cloud monitoring active",
  activationWaiting: "Waiting for owner command",

  writeModeDryRun: "Dry-run / proposals only",
  writeModeOwnerApproval: "Manual/live writes require owner approval env",

  targetStagingOnly: "Staging only",

  continuousPrepared: "Disabled",
  continuousDisabled: "Disabled",

  scheduleActive: "Active",
  scheduleOperational: "Operational scan: every 6 hours",
  scheduleWeekly: "Weekly improvement review: Sunday 02:00 UTC",

  safetyProductionBlocked: "Production blocked",
  safetyAutoFixBlocked: "Auto-fix/deploy blocked",
  safetyMemoryProposal: "Memory proposal-only (owner apply required)",
  safetyEvidenceRequired: "Evidence required for drafts and proposals",

  eligibleSummary: "{count} eligible for scheduled monitoring",
  noEligibleAgents: "No agents currently eligible for scheduled monitoring",

  lastRunNone: "No monitoring run recorded yet",
  lastRunAt: "Last run",
  lastOperationalRun: "Last operational run",
  lastWeeklyReview: "Last weekly review",
  nextOperationalRun: "Next expected operational run",
  nextWeeklyReview: "Next weekly review",

  runDryRunNow: "Run operational check now (GitHub Actions)",
  runWeeklyReviewNow: "Run weekly improvement review now (GitHub Actions)",
  openLastReport: "View latest monitoring report",
  reviewIssueDrafts: "Review issue drafts",
  reviewMemoryProposals: "Review memory proposals",
  refreshStatus: "Refresh status",

  runningDryRun: "Opening GitHub Actions…",
  dryRunComplete: "Dry-run complete",
  dryRunFailed: "Dry-run could not complete",

  reportPanelTitle: "Last monitoring report",
  eligibilityTitle: "Agent eligibility",
  safetyTitle: "Safety summary",
  scheduleTitle: "Schedule status",

  cloudBlockedDetail:
    "Continuous monitoring remains disabled. Cron runs are staging dry-run only with owner gates after detection.",
  liveWritesBlockedDetail:
    "Live issues and active memory require separate owner-click promotion/apply.",
} as const;

export function formatEligibleSummary(count: number): string {
  if (count === 0) return MONITORING_OWNER_DISPLAY.noEligibleAgents;
  return MONITORING_OWNER_DISPLAY.eligibleSummary.replace("{count}", String(count));
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
