/**
 * Phase 5D — promote owner-approved monitoring issue drafts to live agentops_issues.
 * Owner-click only; staging Supabase only; no automatic promotion.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createIssue, logAgentAction } from "../db/agentOpsRuntimeRepository";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsIssueSeverity,
  type AgentOpsRuntimeIssueRow,
  type CreateAgentOpsRuntimeIssueInput,
} from "../db/agentOpsRuntimeTypes";
import { runtimeIssueDisplayCode } from "../issues/productIssueMappers";
import {
  getMonitoringIssueDraft,
  ISSUE_DRAFTS_TABLE,
  type MonitoringIssueDraftRow,
} from "./agentOpsMonitoringIssueDrafts";
import {
  assertStagingSupabaseForPromotion,
  type MonitoringIssuePromotionOwnerContext,
  validatePromotionPreconditions,
} from "./agentOpsMonitoringIssuePromotionPolicy";

export type MonitoringIssuePromotionResult = {
  ok: boolean;
  issueId: string | null;
  issueDisplayCode: string | null;
  alreadyPromoted: boolean;
  duplicateBlocked: boolean;
  error: string | null;
};

function normalizePageUrl(pageUrl: string): string {
  const trimmed = pageUrl.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function isDuplicateIssueError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint") ||
    normalized.includes("idx_agentops_issues_open_dedupe")
  );
}

function normalizeSeverity(value: string): AgentOpsIssueSeverity {
  const v = value.toLowerCase();
  if (v === "critical" || v === "high" || v === "low" || v === "medium") {
    return v;
  }
  return "medium";
}

export function buildAgentOpsIssueFromDraft(
  draft: MonitoringIssueDraftRow,
  agentId: string,
): CreateAgentOpsRuntimeIssueInput {
  const route = normalizePageUrl(draft.route ?? draft.module ?? "/");
  const pageUrl = `${route}#monitoring-draft:${draft.id}`;

  const evidence: Record<string, unknown> = {
    ...draft.evidence,
    browser_qa: draft.browser_qa_evidence,
    source: "monitoring_issue_draft",
    source_draft_id: draft.id,
    source_run_id: draft.run_id,
    github_run_id: draft.github_run_id,
    issue_type: draft.issue_type,
    module: draft.module,
    route: draft.route,
    agent_slug: draft.agent_slug,
    duplicate_key: draft.duplicate_key,
    owner_decision_by: draft.owner_decision_by,
    promoted_at: new Date().toISOString(),
  };

  return {
    title: draft.title.trim(),
    description: draft.summary.trim(),
    severity: normalizeSeverity(draft.severity),
    agent_id: agentId,
    page_url: pageUrl,
    evidence,
    fix_prompt: draft.suggested_fix_prompt,
    status: "open",
  };
}

export { validatePromotionPreconditions };

async function resolveAgentIdBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("id, name, tools")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT);

  if (error || !data) return null;

  for (const agent of data) {
    const tools = (agent.tools ?? []) as string[];
    if (tools.includes(`canonical:${slug}`)) return agent.id as string;
    const normalizedName =
      typeof agent.name === "string"
        ? agent.name.trim().toLowerCase().replace(/\s+/g, "-")
        : "";
    if (normalizedName === slug) return agent.id as string;
  }

  return null;
}

async function findIssueBySourceDraftId(
  client: SupabaseClient,
  draftId: string,
): Promise<AgentOpsRuntimeIssueRow | null> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .contains("evidence", { source_draft_id: draftId })
    .maybeSingle();

  if (error || !data) return null;
  return data as AgentOpsRuntimeIssueRow;
}

async function findPromotedIssueForDuplicateKey(
  client: SupabaseClient,
  duplicateKey: string,
  excludeDraftId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .select("promoted_issue_id")
    .eq("duplicate_key", duplicateKey)
    .eq("status", "promoted")
    .not("promoted_issue_id", "is", null)
    .neq("id", excludeDraftId)
    .limit(1)
    .maybeSingle();

  if (error || !data?.promoted_issue_id) return null;
  return data.promoted_issue_id as string;
}

export async function markDraftPromoted(
  client: SupabaseClient,
  draftId: string,
  issueId: string,
  ownerContext: MonitoringIssuePromotionOwnerContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .update({
      status: "promoted",
      promoted_issue_id: issueId,
      owner_decision_by: ownerContext.ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function promoteMonitoringDraftToIssue(
  client: SupabaseClient,
  draftId: string,
  ownerContext: MonitoringIssuePromotionOwnerContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitoringIssuePromotionResult> {
  const stagingError = assertStagingSupabaseForPromotion(env);
  if (stagingError) {
    return {
      ok: false,
      issueId: null,
      issueDisplayCode: null,
      alreadyPromoted: false,
      duplicateBlocked: false,
      error: stagingError,
    };
  }

  const draftResult = await getMonitoringIssueDraft(client, draftId);
  if (!draftResult.ok) {
    return {
      ok: false,
      issueId: null,
      issueDisplayCode: null,
      alreadyPromoted: false,
      duplicateBlocked: false,
      error: draftResult.error,
    };
  }

  const draft = draftResult.row;

  if (draft.promoted_issue_id) {
    return {
      ok: true,
      issueId: draft.promoted_issue_id,
      issueDisplayCode: runtimeIssueDisplayCode({
        id: draft.promoted_issue_id,
      } as AgentOpsRuntimeIssueRow),
      alreadyPromoted: true,
      duplicateBlocked: true,
      error: null,
    };
  }

  const policyError = validatePromotionPreconditions(draft, ownerContext);
  if (policyError) {
    return {
      ok: false,
      issueId: null,
      issueDisplayCode: null,
      alreadyPromoted: draft.status === "promoted",
      duplicateBlocked: false,
      error: policyError,
    };
  }

  const existingByDraft = await findIssueBySourceDraftId(client, draftId);
  if (existingByDraft) {
    await markDraftPromoted(client, draftId, existingByDraft.id, ownerContext);
    return {
      ok: true,
      issueId: existingByDraft.id,
      issueDisplayCode: runtimeIssueDisplayCode(existingByDraft),
      alreadyPromoted: true,
      duplicateBlocked: true,
      error: null,
    };
  }

  const duplicateIssueId = await findPromotedIssueForDuplicateKey(
    client,
    draft.duplicate_key,
    draftId,
  );
  if (duplicateIssueId) {
    await markDraftPromoted(client, draftId, duplicateIssueId, ownerContext);
    return {
      ok: true,
      issueId: duplicateIssueId,
      issueDisplayCode: runtimeIssueDisplayCode({
        id: duplicateIssueId,
      } as AgentOpsRuntimeIssueRow),
      alreadyPromoted: false,
      duplicateBlocked: true,
      error: null,
    };
  }

  const agentId = await resolveAgentIdBySlug(client, draft.agent_slug);
  if (!agentId) {
    return {
      ok: false,
      issueId: null,
      issueDisplayCode: null,
      alreadyPromoted: false,
      duplicateBlocked: false,
      error: `No staging agent found for slug ${draft.agent_slug}.`,
    };
  }

  const issueInput = buildAgentOpsIssueFromDraft(draft, agentId);
  const issueResult = await createIssue(client, issueInput);

  if (issueResult.error) {
    if (isDuplicateIssueError(issueResult.error)) {
      const openMatch = await client
        .from(AGENTOPS_RUNTIME_TABLES.issues)
        .select("*")
        .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
        .eq("agent_id", agentId)
        .in("status", ["open", "in_progress"])
        .eq("page_url", issueInput.page_url)
        .maybeSingle();

      if (openMatch.data) {
        const existing = openMatch.data as AgentOpsRuntimeIssueRow;
        await markDraftPromoted(client, draftId, existing.id, ownerContext);
        return {
          ok: true,
          issueId: existing.id,
          issueDisplayCode: runtimeIssueDisplayCode(existing),
          alreadyPromoted: false,
          duplicateBlocked: true,
          error: null,
        };
      }
    }

    return {
      ok: false,
      issueId: null,
      issueDisplayCode: null,
      alreadyPromoted: false,
      duplicateBlocked: false,
      error: issueResult.error,
    };
  }

  const issue = issueResult.data!;
  await markDraftPromoted(client, draftId, issue.id, ownerContext);

  await logAgentAction(client, {
    agent_id: agentId,
    action: "issue_detected",
    payload: {
      source: "monitoring_issue_draft_promotion",
      draft_id: draftId,
      issue_id: issue.id,
      owner_id: ownerContext.ownerId,
    },
  });

  return {
    ok: true,
    issueId: issue.id,
    issueDisplayCode: runtimeIssueDisplayCode(issue),
    alreadyPromoted: false,
    duplicateBlocked: false,
    error: null,
  };
}
