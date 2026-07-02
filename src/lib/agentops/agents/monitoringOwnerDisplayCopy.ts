/** Owner-friendly copy for scheduled monitoring UI — Phase 4. */

export const MONITORING_OWNER_DISPLAY = {
  sectionTitle: "Scheduled monitoring",
  sectionDescription:
    "Owner view of whether agents can automatically inspect the website on staging. Not cloud-active.",

  monitoringLevelPrepared: "Level 1 prepared — scheduled monitoring",
  monitoringLevelManual: "Level 0 — manual only",

  activationNotCloud: "Not cloud-active",
  activationLocalDryRun: "Local dry-run available",
  activationWaiting: "Waiting for owner command",

  writeModeDryRun: "Dry-run by default",
  writeModeOwnerApproval: "Manual/live writes require owner approval env",

  targetStagingOnly: "Local/staging only",

  continuousPrepared: "Prepared, not active",

  safetyProductionBlocked: "Production blocked",
  safetyAutoFixBlocked: "Auto-fix/deploy blocked",
  safetyMemoryProposal: "Memory proposal-only",
  safetyEvidenceRequired: "Evidence required for issue creation",

  eligibleSummary: "{count} eligible for scheduled monitoring",
  noEligibleAgents: "No agents currently eligible for scheduled monitoring",

  lastRunNone: "No monitoring run recorded yet",
  lastRunAt: "Last run",

  runDryRunNow: "Run dry-run now",
  openLastReport: "Open last report",
  refreshStatus: "Refresh status",

  runningDryRun: "Running scheduled dry-run…",
  dryRunComplete: "Dry-run complete",
  dryRunFailed: "Dry-run could not complete",

  reportPanelTitle: "Last monitoring report",
  eligibilityTitle: "Agent eligibility",
  safetyTitle: "Safety summary",

  cloudBlockedDetail: "Cloud cron and continuous loops are not enabled from this UI.",
  liveWritesBlockedDetail: "Live issue/memory writes are not exposed in the product UI.",
} as const;

export function formatEligibleSummary(count: number): string {
  if (count === 0) return MONITORING_OWNER_DISPLAY.noEligibleAgents;
  return MONITORING_OWNER_DISPLAY.eligibleSummary.replace("{count}", String(count));
}
