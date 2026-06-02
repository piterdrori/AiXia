import type { AgentOpsFinding, AgentOpsGeneratedFixPlan } from "@/lib/agentops";

const STRUCTURED_SECTIONS = [
  "TASK",
  "PURPOSE",
  "IMPORTANT",
  "STAGING ONLY",
  "CURRENT ISSUE",
  "READ FIRST",
  "DO NOT",
  "FILES LIKELY TO MODIFY",
  "IMPLEMENTATION PARTS",
  "VALIDATION",
  "REPORT",
  "FINAL CHECK",
] as const;

export type CursorPromptNormalizeContext = {
  rawPrompt: string;
  finding: AgentOpsFinding | null;
  fixPlan: AgentOpsGeneratedFixPlan | null;
  issueCode: string;
};

function hasStructuredCursorPrompt(prompt: string): boolean {
  const upper = prompt.toUpperCase();
  const required = ["TASK:", "PURPOSE:", "STAGING ONLY:", "READ FIRST:", "FINAL CHECK:"];
  return required.every((header) => upper.includes(header));
}

function extractLegacySection(prompt: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n(?:[A-Z][A-Z0-9 /\\-]+|\\#)\\s*:?\\s*\\n|$)`,
      "i",
    );
    const match = prompt.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "";
}

function bulletLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("-") ? line : `- ${line.replace(/^[-*]\s*/, "")}`))
    .join("\n");
}

function defaultDoNot(): string {
  return [
    "- Do not change unrelated logic",
    "- Do not change Supabase/RLS/schema unless explicitly approved",
    "- Do not redesign unrelated pages",
    "- Do not remove existing actions",
    "- Do not touch production/main",
    "- Do not break existing tests",
  ].join("\n");
}

function defaultValidation(extra: string[]): string {
  const base = ["- npm run build", "- npm run qa:validate-foundation"];
  const merged = [...base, ...extra.filter(Boolean)];
  return [...new Set(merged)].join("\n");
}

function defaultImplementationParts(strategy: string): string {
  return [
    "PART 1 — inspect/reproduce: Reproduce the issue on staging using READ FIRST artifacts; confirm actual vs expected before editing.",
    `PART 2 — fix root cause: ${strategy || "Apply minimal fix aligned with owner-approved intent."}`,
    "PART 3 — preserve existing behavior: Confirm unrelated roles, routes, and handlers remain correct.",
    "PART 4 — validation: Run all VALIDATION commands and capture results.",
    "PART 5 — report: Complete REPORT and FINAL CHECK before handoff back to AgentOps.",
  ].join("\n");
}

function defaultFinalCheck(): string {
  return [
    "1. Files created",
    "2. Files modified",
    "3. Root cause fixed",
    "4. Existing behavior preserved",
    "5. Supabase/RLS/schema changed: Yes/No",
    "6. Production/main touched: Yes/No",
    "7. Validation results",
    "8. Final status",
    "9. Next recommended step",
  ].join("\n");
}

export function normalizeCursorPrompt(context: CursorPromptNormalizeContext): string {
  const { rawPrompt, finding, fixPlan, issueCode } = context;
  const trimmed = rawPrompt.trim();
  if (!trimmed) return buildStructuredPromptFromContext(context, "");

  if (hasStructuredCursorPrompt(trimmed)) return trimmed;

  const taskBody =
    extractLegacySection(trimmed, ["TASK"]) ||
    (fixPlan ? `Implement fix for ${fixPlan.issueCode}: ${fixPlan.issueTitle}` : `Investigate and fix ${issueCode}`);

  const stagingBody =
    extractLegacySection(trimmed, ["STAGING ONLY", "STAGING-ONLY RULE"]) ||
    "Use staging/local only. Do not touch production/main Supabase, production/main GitHub, or production deployments.";

  const readFirstParts = [
    extractLegacySection(trimmed, ["READ FIRST"]),
    extractLegacySection(trimmed, ["SOURCE EVIDENCE", "EVIDENCE"]),
    extractLegacySection(trimmed, ["FILES TO INSPECT FIRST", "FILES TO INSPECT", "TARGET"]),
    extractLegacySection(trimmed, ["INVESTIGATION", "REQUIRED READING"]),
  ].filter(Boolean);

  const doNotBody =
    extractLegacySection(trimmed, ["DO NOT", "HARD DO-NOT-CHANGE RULES", "HARD DO NOT"]) || defaultDoNot();

  const validationBody =
    extractLegacySection(trimmed, ["VALIDATION", "VALIDATION COMMANDS"]) ||
    defaultValidation(fixPlan?.validationCommands ?? []);

  const strategy =
    extractLegacySection(trimmed, ["PREFERRED FIX STRATEGY", "PREFERRED FIX"]) ||
    fixPlan?.preferredFixStrategy ||
    finding?.recommended_fix_strategy ||
    "Apply minimal staging-safe fix after inspect confirms root cause.";

  const purpose =
    extractLegacySection(trimmed, ["PURPOSE", "CONTEXT"]) ||
    fixPlan?.whyItMatters ||
    fixPlan?.readableSummary ||
    finding?.problem ||
    "Resolve this AgentOps finding with minimal staging-safe changes.";

  const important =
    extractLegacySection(trimmed, ["IMPORTANT", "STOP CONDITION"]) ||
    "Manual-first AgentOps handoff. Inspect before changing when evidence is incomplete. Stop and report if schema/RLS or business-rule changes are required but not approved.";

  const legacyFinal =
    extractLegacySection(trimmed, ["FINAL CHECK", "REQUIRED FINAL CHECK FORMAT"]) || defaultFinalCheck();

  const legacyReport = extractLegacySection(trimmed, ["REPORT"]);
  const filesLikely =
    extractLegacySection(trimmed, ["FILES LIKELY TO MODIFY", "FILES TO MODIFY"]) ||
    extractLegacySection(trimmed, ["FILES TO INSPECT FIRST"]) ||
    "inspect first and report before modifying.";

  return buildStructuredPromptFromContext(context, trimmed, {
    taskBody,
    purpose,
    important,
    stagingBody,
    readFirst: readFirstParts.join("\n"),
    doNotBody: doNotBody.startsWith("-") ? doNotBody : bulletLines(doNotBody),
    filesLikely,
    strategy,
    validationBody: validationBody.startsWith("-") ? validationBody : bulletLines(validationBody),
    reportBody:
      legacyReport ||
      "Provide a short markdown or issue comment with files changed, root cause, fix applied, logic preserved, validation results, and remaining risks.",
    finalCheckBody: legacyFinal,
  });
}

type StructuredOverrides = {
  taskBody: string;
  purpose: string;
  important: string;
  stagingBody: string;
  readFirst: string;
  doNotBody: string;
  filesLikely: string;
  strategy: string;
  validationBody: string;
  reportBody: string;
  finalCheckBody: string;
};

function buildStructuredPromptFromContext(
  context: CursorPromptNormalizeContext,
  legacyRaw: string,
  overrides?: Partial<StructuredOverrides>,
): string {
  const { finding, fixPlan, issueCode } = context;
  const route = fixPlan?.affectedRoute ?? finding?.route ?? "—";
  const severity = fixPlan?.severity ?? finding?.severity ?? "—";
  const category = fixPlan?.issueCategory ?? finding?.category ?? "—";
  const evidence =
    finding?.evidence_summary ||
    fixPlan?.readableSummary ||
    (legacyRaw ? "See legacy prompt body and linked reports." : "No evidence summary yet — inspect READ FIRST before coding.");

  const currentIssue = [
    `- Issue code: ${issueCode}`,
    `- Route: ${route}`,
    `- Severity: ${severity}`,
    `- Category: ${category}`,
    `- Evidence: ${evidence}`,
    `- Actual: ${finding?.actual_result ?? "—"}`,
    `- Expected: ${finding?.expected_result ?? finding?.problem ?? "—"}`,
  ].join("\n");

  const o: StructuredOverrides = {
    taskBody:
      overrides?.taskBody ??
      (fixPlan ? `Fix ${fixPlan.issueCode}: ${fixPlan.issueTitle}` : `Investigate and fix ${issueCode} on staging.`),
    purpose: overrides?.purpose ?? fixPlan?.whyItMatters ?? finding?.problem ?? "Resolve this AgentOps finding safely on staging.",
    important:
      overrides?.important ??
      "Manual-first AgentOps handoff. Inspect before changing when evidence is incomplete.",
    stagingBody:
      overrides?.stagingBody ??
      "Use staging/local only. Do not touch production/main Supabase, production/main GitHub, or production deployments.",
    readFirst: overrides?.readFirst ?? "- qa-agent/README.md\n- Issue-linked reports under qa-agent/reports/",
    doNotBody: overrides?.doNotBody ?? defaultDoNot(),
    filesLikely: overrides?.filesLikely ?? "inspect first and report before modifying.",
    strategy: overrides?.strategy ?? fixPlan?.preferredFixStrategy ?? finding?.recommended_fix_strategy ?? "",
    validationBody: overrides?.validationBody ?? defaultValidation(fixPlan?.validationCommands ?? []),
    reportBody:
      overrides?.reportBody ??
      "Provide files changed, root cause, fix applied, logic preserved, validation results, and remaining risks.",
    finalCheckBody: overrides?.finalCheckBody ?? defaultFinalCheck(),
  };

  return STRUCTURED_SECTIONS.map((section) => {
    switch (section) {
      case "TASK":
        return `TASK:\n${o.taskBody}`;
      case "PURPOSE":
        return `PURPOSE:\n${o.purpose}`;
      case "IMPORTANT":
        return `IMPORTANT:\n${o.important}`;
      case "STAGING ONLY":
        return `STAGING ONLY:\n${o.stagingBody}`;
      case "CURRENT ISSUE":
        return `CURRENT ISSUE:\n${currentIssue}`;
      case "READ FIRST":
        return `READ FIRST:\n${o.readFirst.startsWith("-") ? o.readFirst : bulletLines(o.readFirst)}`;
      case "DO NOT":
        return `DO NOT:\n${o.doNotBody}`;
      case "FILES LIKELY TO MODIFY":
        return `FILES LIKELY TO MODIFY:\n${o.filesLikely.startsWith("-") ? o.filesLikely : o.filesLikely}`;
      case "IMPLEMENTATION PARTS":
        return `IMPLEMENTATION PARTS:\n${defaultImplementationParts(o.strategy)}`;
      case "VALIDATION":
        return `VALIDATION:\n${o.validationBody}`;
      case "REPORT":
        return `REPORT:\n${o.reportBody}`;
      case "FINAL CHECK":
        return `FINAL CHECK:\n${o.finalCheckBody}`;
      default:
        return "";
    }
  }).join("\n\n");
}

export { STRUCTURED_SECTIONS };
