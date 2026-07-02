import { supabase } from "@/lib/supabase";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsRuntimeIssueRow,
} from "../db/agentOpsRuntimeTypes";
import type { AgentOpsFinding } from "../types";
import type { AgentOpsReadResult } from "../types";
import {
  compareProductIssuesBySeverity,
  findingDedupeKey,
  isActiveProductIssue,
  isHistoryClosedIssue,
  isHistoryFixedIssue,
  mapFindingToProductIssue,
  mapRuntimeIssueToProductIssue,
  runtimeDedupeKey,
  runtimeIssueDisplayCode,
} from "./productIssueMappers";
import type {
  ProductIssue,
  ProductIssueByCodeResult,
  ProductIssueCounters,
  ProductIssuesBundle,
} from "./productIssueTypes";

function ok<T>(data: T): AgentOpsReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsReadResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function buildCounters(all: ProductIssue[]): ProductIssueCounters {
  const today = startOfToday();
  const weekStart = startOfWeek();
  let fixedToday = 0;
  let fixedThisWeek = 0;
  let totalFixed = 0;
  let stillOpen = 0;
  let waitingVerification = 0;

  for (const issue of all) {
    const updated = issue.updatedAt ? new Date(issue.updatedAt) : new Date(issue.createdAt);
    if (issue.normalizedStatus === "verified") {
      totalFixed += 1;
      if (updated >= today) fixedToday += 1;
      if (updated >= weekStart) fixedThisWeek += 1;
    }
    if (issue.normalizedStatus === "fixed") {
      totalFixed += 1;
    }
    if (
      issue.normalizedStatus === "open" ||
      issue.normalizedStatus === "in_progress"
    ) {
      stillOpen += 1;
    }
    if (issue.normalizedStatus === "pending_verification") {
      waitingVerification += 1;
      stillOpen += 1;
    }
  }

  return { fixedToday, fixedThisWeek, totalFixed, stillOpen, waitingVerification };
}

async function loadAgentNameMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("id, name")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT);
  for (const row of data ?? []) {
    if (row.id && row.name) map.set(row.id, row.name);
  }
  return map;
}

async function loadFindings(): Promise<AgentOpsFinding[]> {
  const { data, error } = await supabase
    .from("agentops_findings")
    .select("*")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as AgentOpsFinding[];
}

async function loadRuntimeIssues(): Promise<AgentOpsRuntimeIssueRow[]> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as AgentOpsRuntimeIssueRow[];
}

function mergeProductIssues(
  findings: AgentOpsFinding[],
  runtimeIssues: AgentOpsRuntimeIssueRow[],
  agentNames: Map<string, string>,
): ProductIssue[] {
  const merged: ProductIssue[] = [];
  const dedupeKeys = new Set<string>();

  for (const finding of findings) {
    const product = mapFindingToProductIssue(finding, agentNames);
    dedupeKeys.add(findingDedupeKey(finding));
    merged.push(product);
  }

  for (const runtime of runtimeIssues) {
    const key = runtimeDedupeKey(runtime);
    if (dedupeKeys.has(key)) continue;
    dedupeKeys.add(key);
    merged.push(mapRuntimeIssueToProductIssue(runtime, agentNames));
  }

  return merged.sort(compareProductIssuesBySeverity);
}

export async function getAgentOpsProductIssues(): Promise<AgentOpsReadResult<ProductIssuesBundle>> {
  try {
    const [findings, runtimeIssues, agentNames] = await Promise.all([
      loadFindings(),
      loadRuntimeIssues(),
      loadAgentNameMap(),
    ]);

    const all = mergeProductIssues(findings, runtimeIssues, agentNames);
    const active = all.filter(isActiveProductIssue).sort(compareProductIssuesBySeverity);
    const historyFixed = all.filter(isHistoryFixedIssue).sort(compareProductIssuesBySeverity);
    const historyClosed = all.filter(isHistoryClosedIssue).sort(compareProductIssuesBySeverity);
    const counters = buildCounters(all);

    return ok({ active, historyFixed, historyClosed, counters });
  } catch (error) {
    return fail(error);
  }
}

async function findRuntimeByDisplayCode(issueCode: string): Promise<AgentOpsRuntimeIssueRow | null> {
  if (!issueCode.startsWith("BQA-")) return null;
  const short = issueCode.slice(4).toLowerCase();
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .limit(500);
  if (error) throw new Error(error.message);
  const match = (data ?? []).find((row) =>
    row.id.replace(/-/g, "").toLowerCase().startsWith(short),
  );
  return (match as AgentOpsRuntimeIssueRow | undefined) ?? null;
}

export async function getProductIssueByCode(
  issueCode: string,
): Promise<AgentOpsReadResult<ProductIssueByCodeResult | null>> {
  try {
    const trimmed = issueCode.trim();
    if (!trimmed) return ok(null);

    const agentNames = await loadAgentNameMap();

    const { data: findingRow, error: findingError } = await supabase
      .from("agentops_findings")
      .select("*")
      .eq("issue_code", trimmed)
      .maybeSingle();
    if (findingError) throw new Error(findingError.message);

    if (findingRow) {
      const product = mapFindingToProductIssue(findingRow as AgentOpsFinding, agentNames);
      return ok({
        productIssue: product,
        findingId: product.findingId ?? null,
        runtimeIssueId: null,
        mode: "finding",
      });
    }

    const runtime =
      (await findRuntimeByDisplayCode(trimmed)) ??
      (await (async () => {
        const { data } = await supabase
          .from(AGENTOPS_RUNTIME_TABLES.issues)
          .select("*")
          .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
          .eq("id", trimmed)
          .maybeSingle();
        return (data as AgentOpsRuntimeIssueRow | null) ?? null;
      })());

    if (!runtime) return ok(null);

    const product = mapRuntimeIssueToProductIssue(runtime, agentNames);
    if (product.issueCode !== trimmed && runtimeIssueDisplayCode(runtime) !== trimmed) {
      return ok(null);
    }

    return ok({
      productIssue: product,
      findingId: null,
      runtimeIssueId: runtime.id,
      mode: "bridged_runtime",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function getRuntimeIssueById(
  issueId: string,
): Promise<AgentOpsReadResult<AgentOpsRuntimeIssueRow | null>> {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(issueId)) {
    return ok(null);
  }
  try {
    const { data, error } = await supabase
      .from(AGENTOPS_RUNTIME_TABLES.issues)
      .select("*")
      .eq("id", issueId)
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return ok((data as AgentOpsRuntimeIssueRow | null) ?? null);
  } catch (error) {
    return fail(error);
  }
}
