/**
 * AgentOps monitoring runtime wiring verification — Phase 2.
 * Usage: npx tsx scripts/agentops-monitoring-runtime-wiring-verify.ts
 */
import { encodeScheduleTool } from "../src/lib/agentops/agentScheduleConfig";
import { canonicalAgentToolTag } from "../src/lib/agentops/canonicalAgents";
import type { AgentOpsRuntimeAgentRow } from "../src/lib/agentops/db/agentOpsRuntimeTypes";
import {
  getAgentMonitoringEligibility,
  getAgentMonitoringMode,
  isAgentDueForScheduledRun,
} from "../src/lib/agentops/runtime/agentOpsMonitoringEligibility";
import {
  assertMonitoringActionAllowed,
  listCanonicalAgentSlugs,
} from "../src/lib/agentops/runtime/agentOpsMonitoringPolicy";
import {
  MONITORING_CONFIG_DEFAULTS,
  type AgentOpsMonitoringRuntimeConfig,
} from "../src/lib/agentops/runtime/agentOpsMonitoringRuntimeConfig";
import { assertStagingScanUrl, resolveMonitoringProductionGuardReport } from "../src/lib/agentops/runtime/stagingScanUrlGuard";
import { buildMonitoringScheduledRunReport } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduledReport";
import { buildMonitoringRunIndexRecord } from "../src/lib/agentops/runtime/agentOpsMonitoringRunIndex";
import {
  canCreateMonitoringIssueDraft,
  buildMonitoringIssueDraftCandidate,
} from "../src/lib/agentops/runtime/agentOpsMonitoringIssueDraftPolicy";
import { extractIssueDraftCandidatesFromReport } from "../src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts";
import {
  isPromotionAllowed,
  validatePromotionPreconditions,
} from "../src/lib/agentops/runtime/agentOpsMonitoringIssuePromotionPolicy";
import { buildAgentOpsIssueFromDraft } from "../src/lib/agentops/runtime/agentOpsMonitoringIssuePromotion";
import type { MonitoringIssueDraftRow } from "../src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts";
import { resolveOwnerWriteGate } from "../src/lib/agentops/runtime/agentOpsMonitoringOwnerWriteGate";

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function baseConfig(overrides: Partial<AgentOpsMonitoringRuntimeConfig> = {}): AgentOpsMonitoringRuntimeConfig {
  return {
    level: 0,
    scheduledEnabled: false,
    continuousEnabled: false,
    targetBaseUrl: "http://127.0.0.1:5173",
    defaultIntervalMinutes: 60,
    continuousCooldownSeconds: 15,
    maxAgentsPerTick: 2,
    maxRoutesPerAgent: 4,
    dryRunRequested: true,
    dryRun: true,
    ownerWriteApproved: false,
    effectiveDryRun: true,
    writesBlockedReason: "dry-run mode — mutations disabled",
    valid: true,
    fallbackReasons: [],
    ...overrides,
  };
}

function mockAgent(input: {
  slug: string;
  mode?: "scheduled" | "continuous";
  enableSchedule?: boolean;
  status?: "active" | "paused" | "blocked";
  intervalMinutes?: number;
}): AgentOpsRuntimeAgentRow {
  const schedule = encodeScheduleTool({
    enableSchedule: input.enableSchedule ?? false,
    scheduleType: input.mode === "scheduled" ? "interval" : "manual",
    intervalMinutes: input.intervalMinutes ?? 60,
    cronPreset: null,
    allowedWorkTypes: ["browser_qa"],
  });
  return {
    id: `id-${input.slug}`,
    name: input.slug,
    role: "testing",
    scope: ["/dashboard"],
    mode: input.mode ?? "scheduled",
    status: input.status ?? "active",
    tools: [canonicalAgentToolTag(input.slug), schedule],
    environment: "staging",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function verifySafeDefaults(): void {
  if (MONITORING_CONFIG_DEFAULTS.level !== 0) fail("Default level must be 0");
  if (MONITORING_CONFIG_DEFAULTS.scheduledEnabled) fail("Default scheduled must be false");
  if (MONITORING_CONFIG_DEFAULTS.continuousEnabled) fail("Default continuous must be false");
  if (!MONITORING_CONFIG_DEFAULTS.dryRun) fail("Default dryRun must be true");
  if (MONITORING_CONFIG_DEFAULTS.maxAgentsPerTick > 5) {
    fail("maxAgentsPerTick default should be a small safe value");
  }
}

function verifyLevel0BlocksAutomatic(): void {
  const config = baseConfig();
  const agent = mockAgent({ slug: "qa-agent", mode: "scheduled", enableSchedule: true });
  const scheduled = getAgentMonitoringEligibility(agent, new Date(), config, {
    tickKind: "scheduled",
  });
  if (scheduled.eligible) fail("Level 0 should block scheduled eligibility");
  if (scheduled.reason !== "env_disabled") {
    fail(`Level 0 scheduled reason expected env_disabled, got ${scheduled.reason}`);
  }

  const continuousAgent = mockAgent({ slug: "qa-agent", mode: "continuous" });
  const continuous = getAgentMonitoringEligibility(continuousAgent, new Date(), config, {
    tickKind: "continuous",
  });
  if (continuous.eligible) fail("Level 0 should block continuous eligibility");
}

function verifyLevel1ScheduledEligibility(): void {
  const config = baseConfig({ level: 1, scheduledEnabled: true });
  const eligibleAgent = mockAgent({ slug: "qa-agent", mode: "scheduled", enableSchedule: true });
  const result = getAgentMonitoringEligibility(eligibleAgent, new Date(), config, {
    tickKind: "scheduled",
    lastRunAt: null,
  });
  if (!result.eligible) {
    fail(`Level 1 qa-agent scheduled should be eligible: ${result.reason} ${result.detail}`);
  }

  const disabledSchedule = mockAgent({ slug: "qa-agent", mode: "scheduled", enableSchedule: false });
  const disabled = getAgentMonitoringEligibility(disabledSchedule, new Date(), config, {
    tickKind: "scheduled",
  });
  if (disabled.eligible) fail("enableSchedule false should block scheduled run");
  if (disabled.reason !== "schedule_disabled") {
    fail(`Expected schedule_disabled, got ${disabled.reason}`);
  }

  const policyBlock = mockAgent({ slug: "system-agent", mode: "scheduled", enableSchedule: true });
  const blocked = getAgentMonitoringEligibility(policyBlock, new Date(), config, {
    tickKind: "scheduled",
  });
  if (blocked.eligible) fail("system-agent should be policy-blocked for scheduled");
  if (blocked.reason !== "policy_disallows") {
    fail(`Expected policy_disallows, got ${blocked.reason}`);
  }
}

function verifyLevel2ContinuousEligibility(): void {
  const config = baseConfig({ level: 2, continuousEnabled: true });
  const agent = mockAgent({ slug: "qa-agent", mode: "continuous" });
  const result = getAgentMonitoringEligibility(agent, new Date(), config, {
    tickKind: "continuous",
    lastRunAt: null,
  });
  if (!result.eligible) {
    fail(`Level 2 qa-agent continuous should be eligible: ${result.reason}`);
  }

  const level1 = baseConfig({ level: 1, continuousEnabled: true });
  const blocked = getAgentMonitoringEligibility(agent, new Date(), level1, {
    tickKind: "continuous",
  });
  if (blocked.eligible) fail("Continuous should require level >= 2");
}

function verifyLevel4Forbidden(): void {
  for (const slug of listCanonicalAgentSlugs()) {
    for (const action of ["apply_fix", "deploy"] as const) {
      const decision = assertMonitoringActionAllowed(action, { agentSlug: slug });
      if (decision.allowed) fail(`${slug} allowed forbidden action ${action}`);
    }
  }
}

function verifyProductionBlocked(): void {
  const guard = assertStagingScanUrl("https://aixia.app/dashboard");
  if (guard.ok) fail("Production URL must be rejected");

  const config = baseConfig({ targetBaseUrl: "https://aixia.app" });
  const agent = mockAgent({ slug: "qa-agent" });
  const result = getAgentMonitoringEligibility(agent, new Date(), config, {
    tickKind: "manual",
  });
  if (result.eligible) fail("Production target should block eligibility");
  if (result.reason !== "production_blocked") {
    fail(`Expected production_blocked, got ${result.reason}`);
  }

  const stagingReport = resolveMonitoringProductionGuardReport("https://ai-xia-staging.vercel.app");
  if (!stagingReport.productionBlocked) {
    fail("Monitoring report productionBlocked must be true for approved staging target");
  }
  if (!stagingReport.productionGuardActive) {
    fail("Monitoring report productionGuardActive must be true");
  }

  const built = buildMonitoringScheduledRunReport({
    runId: "wiring-verify",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    monitoringConfig: baseConfig({ level: 1, scheduledEnabled: true }),
    ownerGate: resolveOwnerWriteGate(true),
    tick: {
      config: null,
      agents: [],
      skipped: [],
      cycles: [],
      errors: [],
      tickKind: "scheduled",
      dryRun: true,
    },
    targetBaseUrl: "https://ai-xia-staging.vercel.app",
  });
  if (!built.productionBlocked) {
    fail("buildMonitoringScheduledRunReport productionBlocked must be true for staging dry-run");
  }

  const indexRecord = buildMonitoringRunIndexRecord(built, { source: "wiring-verify" });
  if (!indexRecord.dry_run || !indexRecord.production_blocked) {
    fail("buildMonitoringRunIndexRecord must preserve dry_run and production_blocked");
  }
}

function verifyAllTwelveDeterministic(): void {
  const now = new Date();
  const config = baseConfig({ level: 1, scheduledEnabled: true });
  for (const slug of listCanonicalAgentSlugs()) {
    const agent = mockAgent({
      slug,
      mode: slug === "qa-agent" || slug === "design-agent" ? "continuous" : "scheduled",
      enableSchedule: slug !== "chat-agent",
    });
    const mode = getAgentMonitoringMode(agent);
    if (typeof mode !== "string") fail(`${slug} mode not deterministic`);

    const scheduled = getAgentMonitoringEligibility(agent, now, config, { tickKind: "scheduled" });
    const manual = getAgentMonitoringEligibility(agent, now, config, { tickKind: "manual" });
    if (typeof scheduled.reason !== "string") fail(`${slug} scheduled reason missing`);
    if (!manual.eligible) fail(`${slug} manual tick should always be eligible when active`);
  }
}

function verifyIntervalDue(): void {
  const now = new Date("2026-06-16T12:00:00.000Z");
  const last = new Date("2026-06-16T10:00:00.000Z");
  if (!isAgentDueForScheduledRun(last, now, 60)) {
    fail("120 minutes elapsed should be due for 60m interval");
  }
  if (isAgentDueForScheduledRun(last, new Date("2026-06-16T10:30:00.000Z"), 60)) {
    fail("30 minutes elapsed should not be due for 60m interval");
  }
}

function verifyDryRunDefault(): void {
  const config = baseConfig();
  if (!config.dryRun) fail("Dry run must default true in wiring config helper");
}

function verifyManualTickSafeAtLevel0(): void {
  const config = baseConfig();
  const agent = mockAgent({ slug: "qa-agent" });
  const manual = getAgentMonitoringEligibility(agent, new Date(), config, { tickKind: "manual" });
  if (!manual.eligible) fail("Manual tick must work at level 0");
}

function verifyIssueDraftPolicy(): void {
  const ownerGate = resolveOwnerWriteGate({ effectiveDryRun: true, ownerWriteApproved: false });
  const report = buildMonitoringScheduledRunReport({
    runId: "draft-policy-test",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    monitoringConfig: baseConfig({ level: 1, scheduledEnabled: true }),
    ownerGate,
    tick: {
      config: null,
      agents: [],
      cycles: [],
      skipped: [],
      errors: [],
      tickKind: "scheduled",
      dryRun: true,
    },
    targetBaseUrl: "https://ai-xia-staging.vercel.app",
  });
  report.productionBlocked = true;
  report.agentsRun = [
    {
      agentId: "a",
      agentSlug: "qa-agent",
      agentName: "QA Agent",
      routesScanned: ["/dashboard"],
      findingsCount: 1,
      findings: [
        {
          page_url: "/dashboard",
          issue: "Hydration stall detected",
          severity: "medium",
          evidence: {
            scan_mode: "playwright",
            route: "/dashboard",
            absolute_url: "https://ai-xia-staging.vercel.app/dashboard",
          },
        },
      ],
      issuesCreated: 0,
      issuesBlockedByPolicy: 1,
      memoryProposals: 0,
      errors: [],
    },
  ];

  const finding = report.agentsRun[0].findings![0];
  const policyError = canCreateMonitoringIssueDraft({
    report,
    finding,
    agentSlug: "qa-agent",
  });
  if (policyError) fail(`Draft policy should allow evidence-backed dry-run finding: ${policyError}`);

  const candidate = buildMonitoringIssueDraftCandidate(finding, { report, agentSlug: "qa-agent" });
  if (!candidate.duplicateKey) fail("Draft candidate must include duplicateKey");

  const candidates = extractIssueDraftCandidatesFromReport(report);
  if (candidates.length !== 1) fail(`Expected 1 draft candidate, got ${candidates.length}`);
}

function mockApprovedDraft(
  overrides: Partial<MonitoringIssueDraftRow> = {},
): MonitoringIssueDraftRow {
  return {
    id: "draft-test-id",
    monitoring_run_id: null,
    run_id: "run-test",
    github_run_id: "12345",
    source: "monitoring_dry_run",
    status: "owner_approved",
    agent_slug: "qa-agent",
    module: "dashboard",
    route: "/dashboard",
    issue_type: "monitoring_finding",
    severity: "medium",
    title: "[Monitoring draft] Test finding",
    summary: "Dry-run monitoring finding on /dashboard.",
    evidence: { scan_mode: "playwright", route: "/dashboard" },
    browser_qa_evidence: {
      scan_mode: "playwright",
      route: "/dashboard",
      absolute_url: "https://ai-xia-staging.vercel.app/dashboard",
    },
    suggested_fix_prompt: "Review evidence",
    confidence: 0.65,
    duplicate_key: "abc123",
    duplicate_of: null,
    owner_decision_by: "owner",
    owner_decision_at: new Date().toISOString(),
    promoted_issue_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function verifyIssuePromotionPolicy(): void {
  const ownerContext = {
    ownerId: "owner",
    explicitOwnerClick: true,
    supabaseProjectRef: "ydppcpbxrvvardeslzrk",
    pipelineContext: "owner_ui" as const,
  };

  const approved = mockApprovedDraft();
  if (!isPromotionAllowed(approved, ownerContext)) {
    fail(`Approved draft should allow promotion: ${validatePromotionPreconditions(approved, ownerContext)}`);
  }

  const draftStatus = mockApprovedDraft({ status: "draft" });
  if (isPromotionAllowed(draftStatus, ownerContext)) {
    fail("Draft status must block promotion");
  }

  const autoContext = { ...ownerContext, explicitOwnerClick: false };
  if (isPromotionAllowed(approved, autoContext)) {
    fail("Non-explicit owner click must block promotion");
  }

  const pipelineAuto = { ...ownerContext, pipelineContext: "automatic" as const };
  if (isPromotionAllowed(approved, pipelineAuto)) {
    fail("Automatic pipeline context must block promotion");
  }

  const prodRef = { ...ownerContext, supabaseProjectRef: "production-ref" };
  if (isPromotionAllowed(approved, prodRef)) {
    fail("Production Supabase ref must block promotion");
  }

  const issueInput = buildAgentOpsIssueFromDraft(approved, "agent-uuid");
  if (issueInput.status !== "open") fail("Promoted issue status must be open");
  if (issueInput.evidence.source !== "monitoring_issue_draft") {
    fail("Promoted issue evidence.source must be monitoring_issue_draft");
  }
  if (issueInput.evidence.source_draft_id !== approved.id) {
    fail("Promoted issue must store source_draft_id in evidence");
  }
}

function main(): void {
  verifySafeDefaults();
  verifyLevel0BlocksAutomatic();
  verifyLevel1ScheduledEligibility();
  verifyLevel2ContinuousEligibility();
  verifyLevel4Forbidden();
  verifyProductionBlocked();
  verifyAllTwelveDeterministic();
  verifyIntervalDue();
  verifyDryRunDefault();
  verifyManualTickSafeAtLevel0();
  verifyIssueDraftPolicy();
  verifyIssuePromotionPolicy();

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING RUNTIME WIRING VERIFY — FAILED");
    for (const message of failures) console.error(`  ✗ ${message}`);
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING RUNTIME WIRING VERIFY — PASSED");
  console.log(`  default level: ${MONITORING_CONFIG_DEFAULTS.level}`);
  console.log(`  default dryRun: ${MONITORING_CONFIG_DEFAULTS.dryRun}`);
  console.log(`  agents checked: ${listCanonicalAgentSlugs().length}`);
}

main();
