/**
 * Compact read-only Hermes context prompt formatter (A2-runtime).
 * Pure text — no Supabase, no LLM calls.
 */

export type HermesReadOnlyContextSection = {
  sectionId: string;
  title: string;
  entries: string[];
  safetyNote?: string;
};

const RUNTIME_MODE_LINES = [
  "Advisory runtime only",
  "Coordinator not fully active",
  "No memory writes",
  "No source-of-truth writes",
  "No registry writes",
  "No AgentMemory writes",
  "No tool execution",
];

const RESPONSE_GUARDRAILS = [
  "Never claim memory, source-of-truth, registry, or AgentMemory was updated.",
  "Never claim tools were executed or MCP tasks ran.",
  "Never claim the Hermes coordinator is fully active.",
  "You may state advisory runtime can answer using read-only context; writes require approval.",
];

export function formatHermesReadOnlyContextPrompt(sections: HermesReadOnlyContextSection[]): string {
  const lines: string[] = [
    "AIXIA HERMES READ-ONLY CONTEXT PREVIEW",
    "",
    "Mode:",
    ...RUNTIME_MODE_LINES.map((line) => `- ${line}`),
    "",
    "Response guardrails:",
    ...RESPONSE_GUARDRAILS.map((line) => `- ${line}`),
    "",
    "Context sections:",
  ];

  for (const section of sections) {
    lines.push("");
    lines.push(`## ${section.title} (${section.sectionId})`);
    if (section.safetyNote) {
      lines.push(`Note: ${section.safetyNote}`);
    }
    for (const entry of section.entries) {
      lines.push(`- ${entry}`);
    }
  }

  return lines.join("\n");
}
