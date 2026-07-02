/**
 * Cursor-ready fix prompt generation for runtime-detected issues.
 */

import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import type { StagingScanFinding } from "./stagingScanTypes";

export function generateRuntimeFixPrompt(
  finding: StagingScanFinding,
  agent: AgentOpsRuntimeAgentRow,
  stagingUrl: string,
): string {
  return [
    "## What is broken",
    finding.issue,
    "",
    "## Where it is broken",
    `Page URL: ${finding.page_url}`,
    `Staging base: ${stagingUrl}`,
    `Agent: ${agent.name} (${agent.role})`,
    "",
    "## Why it is broken (snapshot evidence)",
    `- severity=${finding.severity}`,
    `- scan_mode=${String(finding.evidence.scan_mode ?? "unknown")}`,
    `- http_status=${String(finding.evidence.http_status ?? "unknown")}`,
    `- load_time_ms=${String(finding.evidence.load_time_ms ?? "unknown")}`,
    `- scanned_at=${String(finding.evidence.scanned_at ?? "unknown")}`,
    finding.evidence.screenshot_path
      ? `- screenshot_path=${String(finding.evidence.screenshot_path)}`
      : "- screenshot_path=none",
    "",
    "## Exact steps to fix (code-level)",
    `1. Open \`${finding.page_url}\` on staging and reproduce the reported gap.`,
    "2. Fix using shared AiXia components/CSS — no page-local visual systems.",
    "3. Confirm the issue no longer appears on the next agent observation cycle.",
    "",
    "## Safety rules",
    "- Staging only — do not modify production configuration.",
    "- Do NOT modify kernel execution (`agentOpsExecutionKernel`).",
    "- Do NOT auto-execute fixes from the runtime engine.",
    "- Read-only QA reporting — owner approves fixes manually.",
  ].join("\n");
}

export function mapScanSeverityToIssueSeverity(
  severity: StagingScanFinding["severity"],
): "low" | "medium" | "high" | "critical" {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function buildIssueTitle(finding: StagingScanFinding): string {
  const summary = finding.issue.trim();
  if (summary.length <= 120) return summary;
  return `${summary.slice(0, 117)}...`;
}

export function buildIssueDescription(
  finding: StagingScanFinding,
  agent: AgentOpsRuntimeAgentRow,
): string {
  return [
    finding.issue,
    "",
    `Detected by agent "${agent.name}" (${agent.role}) during a Playwright staging scan.`,
    `Page: ${finding.page_url}`,
    `Severity signal: ${finding.severity}`,
  ].join("\n");
}
