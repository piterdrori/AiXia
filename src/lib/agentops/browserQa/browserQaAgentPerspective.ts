/**
 * Role-specific Browser QA interpretation lenses for all 12 canonical agents.
 */

export type BrowserQaAgentPerspective = {
  title: string;
  focusAreas: string[];
  findingLens: string;
  improvementLens: string;
  reportSections: string[];
  shouldPromoteIssues: boolean;
  shouldAddRoleNarrative: boolean;
};

const PERSPECTIVES: Record<string, BrowserQaAgentPerspective> = {
  "system-agent": {
    title: "System Health Review",
    focusAreas: [
      "module readiness",
      "runtime/system status",
      "blocked routes",
      "infrastructure signals",
      "cross-module visibility",
    ],
    findingLens: "Interpret scan evidence for overall AgentOps system health and module readiness.",
    improvementLens: "Recommend operator-visible system health improvements only.",
    reportSections: [
      "Browser QA Evidence",
      "System Health Analysis",
      "Module Readiness",
      "Infrastructure Blockers",
      "Next System Checks",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "memory-agent": {
    title: "Memory & Behavior Review",
    focusAreas: [
      "memory behavior",
      "rule persistence",
      "Hermes state",
      "long-term behavior patterns",
      "operating rule visibility",
    ],
    findingLens: "Interpret scan evidence for memory coordination and behavior persistence risks.",
    improvementLens: "Recommend memory/behavior workflow improvements grounded in scan evidence.",
    reportSections: [
      "Browser QA Evidence",
      "Memory Behavior Analysis",
      "Hermes Coordination Notes",
      "Persistence Risks",
      "Next Memory Actions",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "issue-agent": {
    title: "Issue Lifecycle Review",
    focusAreas: [
      "severity",
      "dedupe key",
      "issue type",
      "evidence completeness",
      "ready-for-fix status",
      "verification criteria",
    ],
    findingLens: "Translate scan findings into issue lifecycle candidates with classification metadata.",
    improvementLens: "Recommend issue triage, dedupe, and handoff improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Issue Candidates",
      "Classification",
      "Dedupe Keys",
      "Ready-for-Fix Status",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "evolution-agent": {
    title: "Evolution & Pattern Review",
    focusAreas: [
      "recurring patterns",
      "regressions",
      "improvement opportunities",
      "future risk",
      "learning signals",
    ],
    findingLens: "Interpret scan evidence for recurring patterns and regression risk.",
    improvementLens: "Recommend evolutionary improvements and guardrails.",
    reportSections: [
      "Browser QA Evidence",
      "Pattern Analysis",
      "Regression Signals",
      "Improvement Opportunities",
      "Future Risk Notes",
    ],
    shouldPromoteIssues: false,
    shouldAddRoleNarrative: true,
  },
  "fix-agent": {
    title: "Fixability Review",
    focusAreas: [
      "implementation risk",
      "likely affected components/files",
      "validation requirements",
      "safe Cursor handoff",
      "do-not-touch boundaries",
    ],
    findingLens: "Use scan evidence to assess fixability, scope, and implementation risk — never apply code.",
    improvementLens: "Recommend safe fix-plan direction and validation steps.",
    reportSections: [
      "Browser QA Evidence",
      "Fixability Analysis",
      "Likely Files / Components",
      "Safe Fix Plan Direction",
      "Validation Steps",
      "Risks / Guardrails",
    ],
    shouldPromoteIssues: false,
    shouldAddRoleNarrative: true,
  },
  "qa-agent": {
    title: "QA Evidence Review",
    focusAreas: [
      "behavior tested",
      "what was not tested",
      "console/network evidence",
      "coverage gaps",
      "next QA plan",
    ],
    findingLens: "Summarize what was tested, what was not, and evidence quality.",
    improvementLens: "Recommend next QA coverage and deeper test steps.",
    reportSections: [
      "Browser QA Evidence",
      "Checks Performed",
      "Coverage Gaps",
      "Limitations",
      "Next QA Plan",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "design-agent": {
    title: "Design Review",
    focusAreas: [
      "visual hierarchy",
      "spacing",
      "layout rhythm",
      "card clarity",
      "status badge semantics",
      "readability",
      "responsive behavior",
    ],
    findingLens: "Critique UI consistency, hierarchy, spacing, and usability from scan evidence.",
    improvementLens: "Recommend design-system-aligned UI improvements only.",
    reportSections: [
      "Browser QA Evidence",
      "Design Critique",
      "Strengths",
      "Ranked Improvements",
      "Do Not Change",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "runtime-agent": {
    title: "Runtime Execution Review",
    focusAreas: [
      "scheduled/continuous execution",
      "worker status",
      "run timing",
      "tool pipeline readiness",
      "runtime badges",
    ],
    findingLens: "Interpret scan evidence for runtime/scheduling readiness and execution visibility.",
    improvementLens: "Recommend runtime visibility and scheduling clarity improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Runtime Readiness",
      "Scheduling Visibility",
      "Execution Gaps",
      "Next Runtime Checks",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "logs-agent": {
    title: "Logs / Observability Review",
    focusAreas: [
      "console errors",
      "failed requests",
      "missing telemetry",
      "unclear traceability",
      "log/action gaps",
    ],
    findingLens: "Evaluate console/network/log visibility from scan evidence.",
    improvementLens: "Recommend observability and traceability improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Console / Network Review",
      "Observability Gaps",
      "Traceability Notes",
      "Next Log Checks",
    ],
    shouldPromoteIssues: true,
    shouldAddRoleNarrative: true,
  },
  "config-agent": {
    title: "Config & Safety Review",
    focusAreas: [
      "environment safety",
      "flags/settings clarity",
      "auth/config state",
      "guardrails visibility",
      "unsafe change risks",
    ],
    findingLens: "Interpret scan evidence for config/auth visibility and safe-change boundaries.",
    improvementLens: "Recommend config clarity and guardrail visibility improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Config State Analysis",
      "Safe vs Unsafe Changes",
      "Auth/Config Visibility",
      "Next Config Checks",
    ],
    shouldPromoteIssues: false,
    shouldAddRoleNarrative: true,
  },
  "chat-agent": {
    title: "Chat UX Review",
    focusAreas: [
      "chat UX",
      "input behavior",
      "message persistence",
      "source/provider labeling",
      "composer usability",
    ],
    findingLens: "Evaluate chat-related UX signals visible on the scanned page.",
    improvementLens: "Recommend chat UX and labeling improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Chat UX Analysis",
      "Input / Labeling Notes",
      "Persistence Signals",
      "Next Chat Checks",
    ],
    shouldPromoteIssues: false,
    shouldAddRoleNarrative: true,
  },
  "analytics-agent": {
    title: "Analytics / KPI Review",
    focusAreas: [
      "visible metrics",
      "missing KPIs",
      "trend visibility",
      "counts",
      "freshness indicators",
    ],
    findingLens: "Interpret scan evidence for metrics/KPI visibility and measurement gaps.",
    improvementLens: "Recommend analytics visibility and KPI coverage improvements.",
    reportSections: [
      "Browser QA Evidence",
      "Visible Metrics",
      "Missing KPIs",
      "Freshness / Count Gaps",
      "Next Analytics Checks",
    ],
    shouldPromoteIssues: false,
    shouldAddRoleNarrative: true,
  },
};

const DEFAULT_PERSPECTIVE: BrowserQaAgentPerspective = {
  title: "Role Review",
  focusAreas: ["scan evidence", "page behavior", "operator clarity"],
  findingLens: "Interpret Browser QA evidence from this agent's assigned role.",
  improvementLens: "Recommend role-aligned next actions.",
  reportSections: ["Browser QA Evidence", "Role Analysis", "Next Actions"],
  shouldPromoteIssues: false,
  shouldAddRoleNarrative: true,
};

export function getBrowserQaPerspective(canonicalAgentId: string): BrowserQaAgentPerspective {
  return PERSPECTIVES[canonicalAgentId.trim().toLowerCase()] ?? DEFAULT_PERSPECTIVE;
}

export function buildRolePerspectiveFollowUpInstructions(
  canonicalAgentId: string,
  report: string,
  targetUrl: string | null,
): string {
  const perspective = getBrowserQaPerspective(canonicalAgentId);
  return [
    "You have a successful authenticated Browser QA scan for follow-up analysis.",
    `Target URL: ${targetUrl ?? "unknown"}`,
    "",
    "Raw Browser QA report (context only — do NOT repeat this full report in your answer):",
    report,
    "",
    `Role perspective: ${perspective.title}`,
    `Focus areas: ${perspective.focusAreas.join(", ")}`,
    `Finding lens: ${perspective.findingLens}`,
    `Improvement lens: ${perspective.improvementLens}`,
    "",
    "Output requirements:",
    `- Produce ONLY the role-specific sections listed below.`,
    `- Do NOT paste or repeat the full Browser QA report.`,
    `- Reference evidence by field names (auth, SPA readiness, findings, screenshot, etc.).`,
    `- Be honest about limits of what the scan did not test.`,
    `- Sections to include: ${perspective.reportSections.join(" · ")}`,
    perspective.title === "Design Review"
      ? "- Note what should NOT be changed on Control Cockpit (no heavy dashboard, no clutter, no raw tables)."
      : "",
    perspective.title === "Fixability Review"
      ? "- Do NOT claim code was applied. Provide fix-planning perspective only."
      : "",
    perspective.title === "Issue Lifecycle Review"
      ? "- Include severity, dedupe keys, evidence requirements, and ready-for-fix criteria when relevant."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
