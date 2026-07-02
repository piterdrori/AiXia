import {
  type AgentBrainMemoryItem,
  type AgentBrainState,
} from "@/lib/agentops/agentMemoryHydrator";
import { normalizeDisplayString } from "@/lib/agentops/usl";

const MAX_INSIGHT_LINES = 8;
const MAX_CURRENT_MEMORY_LINES = 16;

function memoryItemText(item: AgentBrainMemoryItem): string {
  return normalizeDisplayString(item.content).trim();
}

/** Flat bullet lines for block 1 — rules first, then other stored memory. */
export function buildCurrentMemoryBullets(brain: AgentBrainState): string[] {
  const ordered: AgentBrainMemoryItem[] = [
    ...brain.rules,
    ...brain.facts,
    ...brain.preferences,
    ...brain.behavior,
  ];

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const item of ordered) {
    const text = memoryItemText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    lines.push(text);
    if (lines.length >= MAX_CURRENT_MEMORY_LINES) break;
  }

  return lines;
}

/** Flat observation lines for block 2 — system observations, traces, recent chat signals. */
export function buildMemoryInsightLines(brain: AgentBrainState): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const pushLine = (raw: string) => {
    const text = normalizeDisplayString(raw).trim();
    if (!text || seen.has(text) || lines.length >= MAX_INSIGHT_LINES) return;
    seen.add(text);
    lines.push(text);
  };

  for (const observation of brain.systemObservations) {
    pushLine(observation.summary);
  }

  for (const trace of brain.reasoning) {
    const snippet = trace.decisionOutput || trace.intent;
    if (snippet) pushLine(snippet);
  }

  for (const entry of [...brain.chat].reverse()) {
    const message = entry.message.trim();
    if (!message) continue;
    const prefix = entry.role === "user" ? "Observed chat" : "Observed reply";
    pushLine(`${prefix}: ${message.slice(0, 140)}${message.length > 140 ? "…" : ""}`);
  }

  return lines;
}

export function hasCurrentMemory(brain: AgentBrainState): boolean {
  return buildCurrentMemoryBullets(brain).length > 0;
}

export function hasMemoryInsights(brain: AgentBrainState): boolean {
  return buildMemoryInsightLines(brain).length > 0;
}
