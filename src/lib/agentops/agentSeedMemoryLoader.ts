/**
 * Seed memory loader — baseline cognition from qa-agent memory files + manifests.
 */

import { getAgentOpsAgentManifest } from "@/lib/agentops/agentIdentityLoader";
import {
  buildIdentityDefinitionSeedItems,
  getAgentIdentityDefinition,
} from "@/lib/agentops/agents/agentIdentityDefinitions";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  classifyMemory,
  type ClassifiedMemoryType,
} from "@/lib/agentops/hermes/memoryClassifier";

import globalSeedMarkdown from "../../../qa-agent/hermes/AIXIA_AGENTMEMORY_INITIAL_SEED.md?raw";
import designRulesMemoryMarkdown from "../../../qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md?raw";

export interface AgentSeedMemoryItem {
  id: string;
  type: ClassifiedMemoryType;
  content: string;
  source: "seed_file";
  agentKey: string;
  created_at?: string;
}

export type LoadAgentSeedMemoryParams = {
  agentId: string;
  agentName?: string;
  role?: string;
  canonicalId?: string;
};

const QA_AGENT_MEMORY_GLOB = import.meta.glob<string>(
  ["../../../qa-agent/agent-memory/*.memory.md", "../../../qa-agent/agents/*/memory.md"],
  { eager: true, query: "?raw", import: "default" },
);

const MEMORY_NOTE_SECTION_TYPE: Record<string, ClassifiedMemoryType> = {
  instruction: "rule",
  fix_instruction: "rule",
  test_instruction: "rule",
  preference: "preference",
  blocked_behavior: "behavior",
  focus: "behavior",
  correction: "fact",
  feature_idea: "fact",
  memory_update: "fact",
};

const CANONICAL_TO_QA_AGENT_KEY: Record<string, string> = Object.fromEntries(
  CANONICAL_AGENTS.map((entry) => [entry.id, entry.id]),
);

const GLOBAL_SEED_AGENT_KEYS = new Set([
  "agentops-owner",
  "memory-agent",
  "system-agent",
  "design-agent",
  "evolution-agent",
  "memory-agent",
]);

const DESIGN_SEED_CANONICAL_IDS = new Set(["design-agent", "qa-agent", "fix-agent"]);

function normalizeKey(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function isMeaningfulLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 8) return false;
  const lower = trimmed.toLowerCase();
  if (lower === "- no entries." || lower === "no entries.") return false;
  if (lower.startsWith("no ") && lower.includes("recorded yet")) return false;
  if (lower.includes("to be defined by piter")) return false;
  if (lower.startsWith("* no secrets")) return false;
  if (lower.startsWith(">")) return false;
  if (trimmed.startsWith("#")) return false;
  if (trimmed.startsWith("<!--")) return false;
  return true;
}

function stripListPrefix(line: string): string {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function seedId(agentKey: string, suffix: string): string {
  return `seed:${agentKey}:${suffix}`;
}

function pushUniqueItem(
  items: AgentSeedMemoryItem[],
  seen: Set<string>,
  item: AgentSeedMemoryItem,
): void {
  const key = item.content.toLowerCase().trim().replace(/\s+/g, " ");
  if (!key || seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

function parseMemoryNoteSections(markdown: string, agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const sectionRegex = /^###\s+([a-z_]+)\s*$/gim;
  const matches = [...markdown.matchAll(sectionRegex)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const sectionName = match[1]?.toLowerCase();
    if (!sectionName) continue;

    const type = MEMORY_NOTE_SECTION_TYPE[sectionName] ?? classifyMemory({ content: sectionName });
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    const body = markdown.slice(start, end);

    for (const rawLine of body.split("\n")) {
      const line = stripListPrefix(rawLine);
      if (!isMeaningfulLine(line)) continue;
      pushUniqueItem(out, seen, {
        id: seedId(agentKey, `${sectionName}-${out.length}`),
        type,
        content: line,
        source: "seed_file",
        agentKey,
      });
    }
  }
}

function parseIdentityFacts(markdown: string, agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const identityMatch = markdown.match(/## Agent Identity([\s\S]*?)(?:\n## |\n---|$)/i);
  if (!identityMatch) return;

  for (const rawLine of identityMatch[1].split("\n")) {
    const line = stripListPrefix(rawLine);
    if (!isMeaningfulLine(line)) continue;
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `identity-${out.length}`),
      type: "fact",
      content: line,
      source: "seed_file",
      agentKey,
    });
  }
}

function parseCurrentFocus(markdown: string, agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const focusMatch = markdown.match(/## Current Focus\s*\n+([^\n#]+)/i);
  const focus = focusMatch?.[1]?.trim();
  if (!focus || !isMeaningfulLine(focus)) return;
  pushUniqueItem(out, seen, {
    id: seedId(agentKey, "current-focus"),
    type: "behavior",
    content: `Current focus: ${focus}`,
    source: "seed_file",
    agentKey,
  });
}

function parseGlobalSeedEntries(agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const seedRegex = /^###\s+SEED-[A-Z]\s+—\s+(.+?)\s*\n+([\s\S]*?)(?=^###\s+SEED-|\n## |\Z)/gim;
  for (const match of globalSeedMarkdown.matchAll(seedRegex)) {
    const title = match[1]?.trim() ?? "Seed";
    const body = match[2]?.trim().replace(/\n+/g, " ");
    if (!body || !isMeaningfulLine(body)) continue;
    const content = `${title}: ${body}`;
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `global-${title.toLowerCase().replace(/\s+/g, "-")}`),
      type: classifyMemory({ content }),
      content,
      source: "seed_file",
      agentKey,
    });
  }
}

function parseDesignRulesMemory(agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const numberedRuleRegex = /^\d+\.\s+(.+)$/gm;
  for (const match of designRulesMemoryMarkdown.matchAll(numberedRuleRegex)) {
    const line = match[1]?.trim();
    if (!line || !isMeaningfulLine(line)) continue;
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `design-rule-${out.length}`),
      type: classifyMemory({ content: line }),
      content: line,
      source: "seed_file",
      agentKey,
    });
  }
}

function parseIdentityDefinitionSeed(
  canonicalId: string,
  agentKey: string,
  seen: Set<string>,
  out: AgentSeedMemoryItem[],
): void {
  const identity = getAgentIdentityDefinition(canonicalId);
  if (!identity) return;

  for (const fact of buildIdentityDefinitionSeedItems(identity)) {
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `identity-${out.length}`),
      type: "rule",
      content: fact,
      source: "seed_file",
      agentKey,
    });
  }
}

function parseManifestSeed(agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  if (getAgentIdentityDefinition(agentKey)) return;

  const manifest = getAgentOpsAgentManifest(agentKey);
  if (!manifest) return;

  const manifestFacts = [
    `Agent specialty: ${manifest.qaSpecialty}`,
    `Agent purpose: ${manifest.purpose}`,
    `Allowed modules: ${manifest.allowedModules.join(", ")}`,
    manifest.blockedModules.length
      ? `Blocked modules: ${manifest.blockedModules.join(", ")}`
      : "Blocked modules: none",
    manifest.agentOpsOwnerAccess ? "AgentOps owner access: yes" : "AgentOps owner access: no",
  ];

  for (const fact of manifestFacts) {
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `manifest-${out.length}`),
      type: "fact",
      content: fact,
      source: "seed_file",
      agentKey,
    });
  }
}

function parseCanonicalRoleSeed(canonicalId: string, agentKey: string, seen: Set<string>, out: AgentSeedMemoryItem[]): void {
  const canonical = CANONICAL_AGENTS.find((entry) => entry.id === canonicalId);
  if (!canonical) return;

  pushUniqueItem(out, seen, {
    id: seedId(agentKey, `canonical-role`),
    type: "fact",
    content: `Canonical agent role: ${canonical.name} (${canonical.role}).`,
    source: "seed_file",
    agentKey,
  });

  if (canonical.scope?.length) {
    pushUniqueItem(out, seen, {
      id: seedId(agentKey, `canonical-scope`),
      type: "behavior",
      content: `Operational scope: ${canonical.scope.join(", ")}.`,
      source: "seed_file",
      agentKey,
    });
  }
}

function readAgentMemoryFile(agentKey: string): string | null {
  const legacyPath = `../../../qa-agent/agent-memory/${agentKey}.memory.md`;
  const folderPath = `../../../qa-agent/agents/${agentKey}/memory.md`;
  return QA_AGENT_MEMORY_GLOB[legacyPath] ?? QA_AGENT_MEMORY_GLOB[folderPath] ?? null;
}

function resolveAgentSeedKey(params: LoadAgentSeedMemoryParams): string | null {
  const directCanonical =
    params.canonicalId ??
    CANONICAL_AGENTS.find((entry) => normalizeKey(entry.id) === normalizeKey(params.agentId))?.id ??
    null;

  if (directCanonical && getAgentIdentityDefinition(directCanonical)) {
    return directCanonical;
  }

  const candidates = [
    params.canonicalId,
    params.agentId,
    params.agentName,
    params.role,
    params.canonicalId ? CANONICAL_TO_QA_AGENT_KEY[params.canonicalId] : null,
    params.agentId ? CANONICAL_TO_QA_AGENT_KEY[params.agentId] : null,
  ]
    .map((value) => normalizeKey(value))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (getAgentOpsAgentManifest(candidate)) return candidate;
    if (readAgentMemoryFile(candidate)) return candidate;
    if (CANONICAL_AGENTS.some((entry) => entry.id === candidate)) {
      return CANONICAL_TO_QA_AGENT_KEY[candidate] ?? candidate;
    }
  }

  for (const canonical of CANONICAL_AGENTS) {
    if (normalizeKey(params.agentName) === normalizeKey(canonical.name)) {
      return CANONICAL_TO_QA_AGENT_KEY[canonical.id] ?? canonical.id;
    }
    if (normalizeKey(params.role) === normalizeKey(canonical.role)) {
      return CANONICAL_TO_QA_AGENT_KEY[canonical.id] ?? canonical.id;
    }
  }

  return null;
}

export function resolveCanonicalIdFromTools(tools: string[] | undefined | null): string | null {
  for (const tool of tools ?? []) {
    if (typeof tool === "string" && tool.startsWith("canonical:")) {
      return tool.slice("canonical:".length);
    }
  }
  return null;
}

export async function loadAgentSeedMemory(params: LoadAgentSeedMemoryParams): Promise<AgentSeedMemoryItem[]> {
  const agentKey = resolveAgentSeedKey(params);
  if (!agentKey) return [];

  const seen = new Set<string>();
  const items: AgentSeedMemoryItem[] = [];
  const canonicalId =
    params.canonicalId ??
    CANONICAL_AGENTS.find((entry) => entry.id === normalizeKey(params.agentId))?.id ??
    null;

  const memoryMarkdown = readAgentMemoryFile(agentKey);
  if (memoryMarkdown && memoryMarkdown.trim().length > 24) {
    parseIdentityFacts(memoryMarkdown, agentKey, seen, items);
    parseCurrentFocus(memoryMarkdown, agentKey, seen, items);
    parseMemoryNoteSections(memoryMarkdown, agentKey, seen, items);
  }

  parseManifestSeed(agentKey, seen, items);

  if (canonicalId) {
    parseIdentityDefinitionSeed(canonicalId, agentKey, seen, items);
    parseCanonicalRoleSeed(canonicalId, agentKey, seen, items);
  }

  const includeGlobalSeed =
    GLOBAL_SEED_AGENT_KEYS.has(agentKey) ||
    GLOBAL_SEED_AGENT_KEYS.has(normalizeKey(canonicalId)) ||
    normalizeKey(params.role) === "memory" ||
    normalizeKey(params.role) === "scanner";

  if (includeGlobalSeed) {
    parseGlobalSeedEntries(agentKey, seen, items);
  }

  if (canonicalId && DESIGN_SEED_CANONICAL_IDS.has(canonicalId)) {
    parseDesignRulesMemory(agentKey, seen, items);
  }

  return items;
}
