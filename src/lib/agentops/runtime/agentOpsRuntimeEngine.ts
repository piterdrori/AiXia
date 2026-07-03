/**

 * AgentOps autonomous runtime engine — staging-only scan → issue → memory → log cycle.

 * Phase 2: eligibility-aware scheduled/continuous wiring; loops off unless env-enabled.

 */



import type { SupabaseClient } from "@supabase/supabase-js";



import {

  createIssue,

  getRuntimeSystemConfig,

  listActiveAgents,

  logAgentAction,

  storeMemory,

} from "../db/agentOpsRuntimeRepository";

import type {

  AgentOpsRuntimeAgentRow,

  AgentOpsRuntimeSystemConfigRow,

} from "../db/agentOpsRuntimeTypes";

import {

  buildIssueDescription,

  buildIssueTitle,

  generateRuntimeFixPrompt,

  mapScanSeverityToIssueSeverity,

} from "./generateRuntimeFixPrompt";

import {

  getAgentMonitoringEligibility,

  type AgentMonitoringEligibility,

} from "./agentOpsMonitoringEligibility";

import { logMonitoringEvent } from "./agentOpsMonitoringLogger";
import { sanitizeFindingEvidence } from "./agentOpsMonitoringIssueDraftPolicy";

import {

  assertMonitoringActionAllowed,

  resolveAgentSlugFromRow,

  type MonitoringMode,

} from "./agentOpsMonitoringPolicy";

import {

  isContinuousMonitoringActive,

  isScheduledMonitoringActive,

  loadAgentOpsMonitoringRuntimeConfig,

  type AgentOpsMonitoringRuntimeConfig,

} from "./agentOpsMonitoringRuntimeConfig";

import { scanStagingWebsite, type StagingScanFinding } from "./scanStagingWebsite";
import { resolveScopedRoutes } from "./stagingScanTypes";



/** Manual = owner-commanded tick; scheduled/continuous = automatic loop ticks. */

export type AgentOpsRuntimeTickKind = "manual" | "scheduled" | "continuous";



export type AgentOpsRuntimeEngineOptions = {

  continuousDelayMs?: number;

  scheduledIntervalMs?: number;

  stagingUrl?: string;

  shouldStop?: () => boolean;

  onCycleComplete?: (result: AgentOpsRuntimeCycleResult) => void;

  tickKind?: AgentOpsRuntimeTickKind;

  dryRun?: boolean;

  monitoringConfig?: AgentOpsMonitoringRuntimeConfig;

};



export type AgentOpsRuntimeCycleResult = {

  agentId: string;

  agentName: string;

  agentSlug: string;

  startedAt: string;

  finishedAt: string;

  findingsCount: number;

  issuesCreated: number;

  issuesSkipped: number;

  issuesBlockedByPolicy: number;

  memoryProposals: number;

  dryRun: boolean;

  routesScanned: string[];

  findings?: StagingScanFinding[];

  monitoringMode: MonitoringMode;

  eligibility?: AgentMonitoringEligibility;

  errors: string[];

};



export type AgentOpsRuntimeTickResult = {

  config: AgentOpsRuntimeSystemConfigRow | null;

  agents: AgentOpsRuntimeAgentRow[];

  cycles: AgentOpsRuntimeCycleResult[];

  skipped: Array<{ agentId: string; agentSlug: string; reason: string; detail: string }>;

  errors: string[];

  tickKind: AgentOpsRuntimeTickKind;

  dryRun: boolean;

};



export type AgentOpsRuntimeCycleOptions = Pick<

  AgentOpsRuntimeEngineOptions,

  "stagingUrl" | "dryRun" | "monitoringConfig" | "tickKind"

> & {

  monitoringMode?: MonitoringMode;

};



const DEFAULT_STAGING_URL = "http://127.0.0.1:5173";

const DEFAULT_SCHEDULED_POLL_MS = 60_000;



function sleep(ms: number): Promise<void> {

  return new Promise((resolve) => {

    setTimeout(resolve, ms);

  });

}



function isDuplicateIssueError(message: string): boolean {

  const normalized = message.toLowerCase();

  return (

    normalized.includes("duplicate key") ||

    normalized.includes("unique constraint") ||

    normalized.includes("idx_agentops_issues_open_dedupe")

  );

}



function resolveMonitoringMode(tickKind: AgentOpsRuntimeTickKind): MonitoringMode {

  if (tickKind === "scheduled") return "scheduled";

  if (tickKind === "continuous") return "continuous";

  return "manual";

}



function resolveStagingUrl(

  dbConfig: AgentOpsRuntimeSystemConfigRow | null,

  monitoringConfig: AgentOpsMonitoringRuntimeConfig,

  override?: string,

): string {

  return (

    override?.trim() ||

    dbConfig?.staging_url?.trim() ||

    monitoringConfig.targetBaseUrl ||

    DEFAULT_STAGING_URL

  );

}



function logConfigLoaded(monitoringConfig: AgentOpsMonitoringRuntimeConfig): void {

  logMonitoringEvent("config_loaded", {

    level: monitoringConfig.level,

    scheduledEnabled: monitoringConfig.scheduledEnabled,

    continuousEnabled: monitoringConfig.continuousEnabled,

    dryRun: monitoringConfig.dryRunRequested,
    effectiveDryRun: monitoringConfig.effectiveDryRun,
    writesBlockedReason: monitoringConfig.writesBlockedReason,

    targetUrl: monitoringConfig.targetBaseUrl,

    maxAgentsPerTick: monitoringConfig.maxAgentsPerTick,

    maxRoutesPerAgent: monitoringConfig.maxRoutesPerAgent,

    fallbackReasons: monitoringConfig.fallbackReasons,

  });

}



async function persistFinding(

  client: SupabaseClient,

  agent: AgentOpsRuntimeAgentRow,

  finding: StagingScanFinding,

  stagingUrl: string,

  monitoringMode: MonitoringMode,

  dryRun: boolean,

): Promise<{ created: boolean; blockedByPolicy: boolean; error: string | null }> {

  const agentSlug = resolveAgentSlugFromRow(agent);



  if (dryRun) {

    logMonitoringEvent("dry_run_would_mutate", {

      agentSlug,

      action: "create_issue_draft",

      page_url: finding.page_url,

      severity: finding.severity,

    });

    return { created: false, blockedByPolicy: true, error: null };

  }



  const issueGate = assertMonitoringActionAllowed("create_issue_draft", {

    agentSlug,

    stagingUrl,

    evidence: finding.evidence,

    monitoringMode,

  });

  if (!issueGate.allowed) {

    return { created: false, blockedByPolicy: true, error: null };

  }



  const fixPrompt = generateRuntimeFixPrompt(finding, agent, stagingUrl);

  const issueResult = await createIssue(client, {

    title: buildIssueTitle(finding),

    description: buildIssueDescription(finding, agent),

    severity: mapScanSeverityToIssueSeverity(finding.severity),

    agent_id: agent.id,

    page_url: finding.page_url,

    evidence: finding.evidence,

    fix_prompt: fixPrompt,

  });



  if (issueResult.error) {

    if (isDuplicateIssueError(issueResult.error)) {

      return { created: false, blockedByPolicy: false, error: null };

    }

    return { created: false, blockedByPolicy: false, error: issueResult.error };

  }



  await logAgentAction(client, {

    agent_id: agent.id,

    action: "issue_detected",

    payload: {

      issue_id: issueResult.data?.id ?? null,

      page_url: finding.page_url,

      severity: finding.severity,

      title: buildIssueTitle(finding),

    },

  });



  return { created: true, blockedByPolicy: false, error: null };

}



/** Run one full cycle for a single agent. */

export async function runAgentCycle(

  client: SupabaseClient,

  agent: AgentOpsRuntimeAgentRow,

  dbConfig: AgentOpsRuntimeSystemConfigRow | null,

  options: AgentOpsRuntimeCycleOptions = {},

): Promise<AgentOpsRuntimeCycleResult> {

  const monitoringConfig = options.monitoringConfig ?? loadAgentOpsMonitoringRuntimeConfig();

  const tickKind = options.tickKind ?? "manual";

  const monitoringMode = options.monitoringMode ?? resolveMonitoringMode(tickKind);

  const dryRun = options.dryRun ?? monitoringConfig.effectiveDryRun;
  const routesScanned = resolveScopedRoutes(agent).slice(0, monitoringConfig.maxRoutesPerAgent);

  const startedAt = new Date().toISOString();

  const stagingUrl = resolveStagingUrl(dbConfig, monitoringConfig, options.stagingUrl);

  const errors: string[] = [];

  let issuesCreated = 0;

  let issuesSkipped = 0;

  let issuesBlockedByPolicy = 0;

  let memoryProposals = 0;

  const agentSlug = resolveAgentSlugFromRow(agent);



  const eligibility = getAgentMonitoringEligibility(agent, new Date(), monitoringConfig, {

    tickKind,

    stagingUrlOverride: stagingUrl,

  });



  logMonitoringEvent("eligibility_checked", {

    agentSlug,

    tickKind,

    eligible: eligibility.eligible,

    reason: eligibility.reason,

    detail: eligibility.detail,

    mode: eligibility.mode,

  });



  if (!eligibility.eligible && tickKind !== "manual") {

    return {

      agentId: agent.id,

      agentName: agent.name,

      agentSlug,

      startedAt,

      finishedAt: new Date().toISOString(),

      findingsCount: 0,

      issuesCreated: 0,

      issuesSkipped: 0,

      issuesBlockedByPolicy: 0,

      memoryProposals: 0,

      dryRun,

      routesScanned: [],

      monitoringMode,

      eligibility,

      errors: [eligibility.detail],

    };

  }



  const scanGate = assertMonitoringActionAllowed("scan_staging", {

    agentSlug,

    stagingUrl,

    monitoringMode,

  });

  if (!scanGate.allowed) {

    errors.push(`Monitoring policy blocked scan: ${scanGate.reason}`);

    return {

      agentId: agent.id,

      agentName: agent.name,

      agentSlug,

      startedAt,

      finishedAt: new Date().toISOString(),

      findingsCount: 0,

      issuesCreated: 0,

      issuesSkipped: 0,

      issuesBlockedByPolicy: 0,

      memoryProposals: 0,

      dryRun,

      routesScanned: [],

      monitoringMode,

      eligibility,

      errors,

    };

  }



  logMonitoringEvent("run_started", {

    agentSlug,

    tickKind,

    dryRun,

    targetUrl: stagingUrl,

    monitoringMode,

  });



  const scanLog = await logAgentAction(client, {

    agent_id: agent.id,

    action: "scan",

    payload: {

      staging_url: stagingUrl,

      mode: agent.mode,

      scope: agent.scope,

      tools: agent.tools,

      tick_kind: tickKind,

      dry_run: dryRun,

    },

  });

  if (scanLog.error) errors.push(scanLog.error);



  let findings: StagingScanFinding[] = [];



  try {

    findings = await scanStagingWebsite(agent, stagingUrl, {

      maxRoutes: monitoringConfig.maxRoutesPerAgent,

    });

  } catch (error) {

    const message = error instanceof Error ? error.message : String(error);

    errors.push(`Playwright scan failed: ${message}`);

  }



  for (const finding of findings) {

    const persisted = await persistFinding(

      client,

      agent,

      finding,

      stagingUrl,

      monitoringMode,

      dryRun,

    );

    if (persisted.error) {

      errors.push(persisted.error);

      continue;

    }

    if (persisted.blockedByPolicy) {

      issuesBlockedByPolicy += 1;

      continue;

    }

    if (persisted.created) issuesCreated += 1;

    else issuesSkipped += 1;

  }



  const memorySummary = {

    summary: `Cycle scanned ${findings.length} finding(s); created ${issuesCreated} issue(s); skipped ${issuesSkipped} duplicate(s); blocked ${issuesBlockedByPolicy} by policy/dry-run.`,

    findings_count: findings.length,

    issues_created: issuesCreated,

    issues_skipped: issuesSkipped,

    issues_blocked_by_policy: issuesBlockedByPolicy,

    staging_url: stagingUrl,

    dry_run: dryRun,

    tick_kind: tickKind,

    completed_at: new Date().toISOString(),

  };



  if (!dryRun) {

    const memoryGate = assertMonitoringActionAllowed("update_memory", {

      agentSlug,

      memoryApproved: false,

      monitoringMode,

    });

    if (memoryGate.allowed) {

      const memoryResult = await storeMemory(client, {

        scope: "agent",

        agent_id: agent.id,

        content: memorySummary,

        source: "agent",

        approved: false,

      });

      if (memoryResult.error) errors.push(memoryResult.error);

      else memoryProposals = 1;

    }

  } else {

    logMonitoringEvent("dry_run_would_mutate", {

      agentSlug,

      action: "update_memory",

      findings_count: findings.length,

      issues_would_block: issuesBlockedByPolicy,

    });

  }



  const finishedAt = new Date().toISOString();

  const cycleResult: AgentOpsRuntimeCycleResult = {

    agentId: agent.id,

    agentName: agent.name,

    agentSlug,

    startedAt,

    finishedAt,

    findingsCount: findings.length,

    issuesCreated,

    issuesSkipped,

    issuesBlockedByPolicy,

    memoryProposals,

    dryRun,

    routesScanned,

    findings: findings.map((finding) => ({
      ...finding,
      evidence: sanitizeFindingEvidence(finding.evidence),
    })),

    monitoringMode,

    eligibility,

    errors,

  };



  logMonitoringEvent("run_completed", {

    agentSlug,

    tickKind,

    dryRun,

    findingsCount: findings.length,

    issuesCreated,

    issuesSkipped,

    issuesBlockedByPolicy,

    memoryProposals,

  });



  const completeLog = await logAgentAction(client, {

    agent_id: agent.id,

    action: "cycle_complete",

    payload: {

      ...memorySummary,

      errors,

    },

  });

  if (completeLog.error) errors.push(completeLog.error);



  return cycleResult;

}



async function runMonitoringTick(

  client: SupabaseClient,

  options: AgentOpsRuntimeEngineOptions,

  tickKind: AgentOpsRuntimeTickKind,

): Promise<AgentOpsRuntimeTickResult> {

  const monitoringConfig = options.monitoringConfig ?? loadAgentOpsMonitoringRuntimeConfig();

  logConfigLoaded(monitoringConfig);

  const dryRun = options.dryRun ?? monitoringConfig.effectiveDryRun;



  logMonitoringEvent("tick_started", { tickKind, dryRun, level: monitoringConfig.level });



  const agentsResult = await listActiveAgents(client);

  if (agentsResult.error || !agentsResult.data) {

    return {

      config: null,

      agents: [],

      cycles: [],

      skipped: [],

      errors: [agentsResult.error ?? "Failed to load active agents."],

      tickKind,

      dryRun,

    };

  }



  const configResult = await getRuntimeSystemConfig(client);

  if (configResult.error) {

    return {

      config: null,

      agents: agentsResult.data,

      cycles: [],

      skipped: [],

      errors: [configResult.error],

      tickKind,

      dryRun,

    };

  }



  const dbConfig = configResult.data;

  const cycles: AgentOpsRuntimeCycleResult[] = [];

  const skipped: AgentOpsRuntimeTickResult["skipped"] = [];

  const errors: string[] = [];

  const now = new Date();



  const candidates = agentsResult.data.filter((agent) => agent.status === "active");

  const eligibleAgents: Array<{

    agent: AgentOpsRuntimeAgentRow;

    eligibility: AgentMonitoringEligibility;

  }> = [];



  for (const agent of candidates) {

    const eligibility = getAgentMonitoringEligibility(agent, now, monitoringConfig, {

      tickKind,

      stagingUrlOverride: options.stagingUrl,

    });



    if (tickKind === "manual" || eligibility.eligible) {

      eligibleAgents.push({ agent, eligibility });

    } else {

      skipped.push({

        agentId: agent.id,

        agentSlug: eligibility.agentSlug,

        reason: eligibility.reason,

        detail: eligibility.detail,

      });

      logMonitoringEvent("agent_skipped", {

        agentSlug: eligibility.agentSlug,

        reason: eligibility.reason,

        detail: eligibility.detail,

        tickKind,

      });

    }

  }



  const runList =

    tickKind === "manual"

      ? eligibleAgents

      : eligibleAgents.slice(0, monitoringConfig.maxAgentsPerTick);



  for (const { agent, eligibility } of runList) {

    const cycle = await runAgentCycle(client, agent, dbConfig, {

      stagingUrl: options.stagingUrl,

      dryRun,

      monitoringConfig,

      tickKind,

      monitoringMode: resolveMonitoringMode(tickKind),

    });

    cycle.eligibility = eligibility;

    cycles.push(cycle);

    errors.push(...cycle.errors);

    options.onCycleComplete?.(cycle);

  }



  logMonitoringEvent("tick_completed", {

    tickKind,

    dryRun,

    cycles: cycles.length,

    skipped: skipped.length,

  });



  return {

    config: dbConfig,

    agents: agentsResult.data,

    cycles,

    skipped,

    errors,

    tickKind,

    dryRun,

  };

}



/**

 * Owner-commanded manual tick — works at Level 0.

 * Scans active agents; issue/memory mutations obey policy + dry-run.

 */

export async function runRuntimeTick(

  client: SupabaseClient,

  options: AgentOpsRuntimeEngineOptions = {},

): Promise<AgentOpsRuntimeTickResult> {

  return runMonitoringTick(client, { ...options, tickKind: "manual" }, "manual");

}



/** Scheduled monitoring tick — eligibility + max agents per tick. */

export async function runScheduledMonitoringTick(

  client: SupabaseClient,

  options: AgentOpsRuntimeEngineOptions = {},

): Promise<AgentOpsRuntimeTickResult> {

  return runMonitoringTick(client, { ...options, tickKind: "scheduled" }, "scheduled");

}



/** Scheduled agents: poll eligibility on interval until stopped. Not auto-started. */

export async function runScheduledLoop(

  client: SupabaseClient,

  options: AgentOpsRuntimeEngineOptions = {},

): Promise<void> {

  const monitoringConfig = options.monitoringConfig ?? loadAgentOpsMonitoringRuntimeConfig();

  logConfigLoaded(monitoringConfig);



  if (!isScheduledMonitoringActive(monitoringConfig)) {

    logMonitoringEvent("loop_blocked", {

      loop: "scheduled",

      level: monitoringConfig.level,

      scheduledEnabled: monitoringConfig.scheduledEnabled,

    });

    console.error(

      "[agentops-runtime] scheduled loop blocked: prepared but not active (see AGENTOPS_MONITORING_RUNTIME_CONTRACT.md).",

    );

    return;

  }



  const pollMs = options.scheduledIntervalMs ?? DEFAULT_SCHEDULED_POLL_MS;

  const shouldStop = options.shouldStop ?? (() => false);

  const lastRunByAgent = new Map<string, Date>();



  while (!shouldStop()) {

    const agentsResult = await listActiveAgents(client);

    if (agentsResult.error) {

      console.error("[agentops-runtime] scheduled loop agent load failed:", agentsResult.error);

    } else {

      const now = new Date();

      const dueAgents: AgentOpsRuntimeAgentRow[] = [];



      for (const agent of agentsResult.data ?? []) {

        const eligibility = getAgentMonitoringEligibility(agent, now, monitoringConfig, {

          tickKind: "scheduled",

          lastRunAt: lastRunByAgent.get(agent.id) ?? null,

          stagingUrlOverride: options.stagingUrl,

        });

        if (eligibility.eligible) {

          dueAgents.push(agent);

        } else {

          logMonitoringEvent("agent_skipped", {

            agentSlug: eligibility.agentSlug,

            reason: eligibility.reason,

            detail: eligibility.detail,

            loop: "scheduled",

          });

        }

      }



      const batch = dueAgents.slice(0, monitoringConfig.maxAgentsPerTick);

      const configResult = await getRuntimeSystemConfig(client);

      const dbConfig = configResult.data ?? null;

      const dryRun = options.dryRun ?? monitoringConfig.effectiveDryRun;



      for (const agent of batch) {

        const cycle = await runAgentCycle(client, agent, dbConfig, {

          stagingUrl: options.stagingUrl,

          dryRun,

          monitoringConfig,

          tickKind: "scheduled",

          monitoringMode: "scheduled",

        });

        lastRunByAgent.set(agent.id, now);

        options.onCycleComplete?.(cycle);

        if (cycle.errors.length > 0) {

          console.error(

            `[agentops-runtime] scheduled cycle errors (${agent.name}):`,

            cycle.errors,

          );

        }

      }

    }



    await sleep(pollMs);

  }

}



/** Continuous agent loop — cooldown-throttled; not auto-started. */

export async function runContinuousLoop(

  client: SupabaseClient,

  agent: AgentOpsRuntimeAgentRow,

  options: AgentOpsRuntimeEngineOptions = {},

): Promise<void> {

  const monitoringConfig = options.monitoringConfig ?? loadAgentOpsMonitoringRuntimeConfig();



  if (!isContinuousMonitoringActive(monitoringConfig)) {

    logMonitoringEvent("loop_blocked", {

      loop: "continuous",

      agentSlug: resolveAgentSlugFromRow(agent),

      level: monitoringConfig.level,

      continuousEnabled: monitoringConfig.continuousEnabled,

    });

    console.error(

      `[agentops-runtime] continuous loop blocked for ${agent.name}: prepared but not active.`,

    );

    return;

  }



  const cooldownMs = monitoringConfig.continuousCooldownSeconds * 1_000;

  const shouldStop = options.shouldStop ?? (() => false);

  let lastRunAt: Date | null = null;



  while (!shouldStop()) {

    const now = new Date();

    const eligibility = getAgentMonitoringEligibility(agent, now, monitoringConfig, {

      tickKind: "continuous",

      lastRunAt,

      stagingUrlOverride: options.stagingUrl,

    });



    if (!eligibility.eligible) {

      logMonitoringEvent("agent_skipped", {

        agentSlug: eligibility.agentSlug,

        reason: eligibility.reason,

        detail: eligibility.detail,

        loop: "continuous",

      });

    } else {

      const configResult = await getRuntimeSystemConfig(client);

      const cycle = await runAgentCycle(client, agent, configResult.data ?? null, {

        stagingUrl: options.stagingUrl,

        dryRun: options.dryRun ?? monitoringConfig.effectiveDryRun,

        monitoringConfig,

        tickKind: "continuous",

        monitoringMode: "continuous",

      });

      lastRunAt = now;

      options.onCycleComplete?.(cycle);

      if (cycle.errors.length > 0) {

        console.error(`[agentops-runtime] continuous cycle errors (${agent.name}):`, cycle.errors);

      }

    }



    await sleep(cooldownMs);

  }

}


