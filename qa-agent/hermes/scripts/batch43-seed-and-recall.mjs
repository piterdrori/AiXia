#!/usr/bin/env node
/**
 * Batch 43 — seed and recall test via AgentMemory standalone local mode.
 * Uses documented fallback when full iii-engine server is unavailable.
 * No secrets. Staging persist file under qa-agent/hermes/.agentmemory-local/
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const PERSIST = join(ROOT, "qa-agent", "hermes", ".agentmemory-local", "aixia-batch43-standalone.json");

function findStandaloneModule() {
  const candidates = [
    join(ROOT, "node_modules", "@agentmemory", "agentmemory", "dist", "standalone.mjs"),
  ];
  const npxRoot = join(homedir(), "AppData", "Local", "npm-cache", "_npx");
  if (existsSync(npxRoot)) {
    for (const dir of readdirSync(npxRoot)) {
      candidates.push(
        join(npxRoot, dir, "node_modules", "@agentmemory", "agentmemory", "dist", "standalone.mjs"),
      );
    }
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Could not locate @agentmemory/agentmemory dist/standalone.mjs — run npx -y @agentmemory/agentmemory@latest --version first",
  );
}

const SEED_ENTRIES = [
  {
    type: "fact",
    concepts: ["authority", "aixia-global", "source-of-truth"],
    content:
      "AiXia active design source of truth is src/design-system/aixia-global/ owner files 00 through 16 only. ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES. Memory mirrors law but does not override law.",
  },
  {
    type: "fact",
    concepts: ["conflict", "aixia-global", "owner-wins"],
    content:
      "If AgentMemory or Hermes memory conflicts with any file in src/design-system/aixia-global/, the owner file wins. aixia-global wins on conflict. Memory must cite owner path and be corrected or deleted on conflict.",
  },
  {
    type: "rule",
    concepts: ["silent-refresh", "scroll", "filters", "modals"],
    content:
      "Silent refresh is mandatory: no page jump, scroll reset, filter reset, sort reset, tab reset, modal close, form edit loss, section collapse, chat interruption, or visible full-page reload after initial load. Preserve user state; update affected data in place only unless Piter approves otherwise. Owners: 11-scroll-responsive-standard.md, 13-module-wrapper-rules.md, 14-page-migration-rules.md, 15-guardrail-rules.md.",
  },
  {
    type: "status",
    concepts: ["paused", "page-migration", "agentops-history"],
    content:
      "Page migrations remain PAUSED. AgentOps History migration is NOT approved now. Do not migrate pages unless Piter explicitly approves after cleanup gates. Batch 9 finance proofs paused. Command-surface context paused. CSS split paused. Archive delete paused.",
  },
  {
    type: "plan",
    concepts: ["next-batch", "batch-44", "hermes-manifest"],
    content:
      "After Hermes AgentMemory local test track, next step is Batch 44 Hermes manifest and qa-agent memory mirror refresh pointing to aixia-global. Return to design cleanup sequence from Batch 40/41. Do NOT jump to page migration.",
  },
  {
    type: "rule",
    concepts: ["design-law", "owner-files", "no-memory-only-law"],
    content:
      "New design rules must NOT be stored only in memory. Write new or changed design law only into the correct aixia-global owner file 01-16 per 00-README-SOURCE-OF-TRUTH.md section 0.2.",
  },
  {
    type: "rule",
    concepts: ["no-local-design", "shared-components"],
    content:
      "No page-local visual systems for repeated patterns. Extend shared components in src/components/aixia and shared CSS first. Pages consume only.",
  },
  {
    type: "status",
    concepts: ["AIXIA_STANDARD", "batch-41", "legacy-reference"],
    content:
      "AIXIA_STANDARD.md is thinned legacy implementation reference only after Batch 41. Not active design law. Not archive-ready until Hermes manifest, memory mirrors, dependency checks, stable validation, and Piter approval.",
  },
  {
    type: "fact",
    concepts: ["hermes", "operational-memory"],
    content:
      "Hermes is operational memory and agent coordination for AiXia, not a competing law source. Read aixia-global first. Do not invent design rules or silently migrate pages.",
  },
  {
    type: "rule",
    concepts: ["code-instructions", "exact-replacements"],
    content:
      "Code instructions must name exact file paths and exact full replacement blocks. No vague anchors. Inspect owner files and target files before editing.",
  },
];

const RECALL_TESTS = [
  {
    id: 1,
    query: "active AiXia design source of truth",
    mustInclude: ["aixia-global", "00", "16"],
  },
  {
    id: 2,
    query: "memory conflicts aixia-global",
    mustInclude: ["wins", "aixia-global"],
  },
  {
    id: 3,
    query: "silent refresh rule",
    mustInclude: ["scroll", "filter", "modal", "preserve"],
  },
  {
    id: 4,
    query: "migrate AgentOps History",
    mustInclude: ["paused", "not"],
  },
  {
    id: 5,
    query: "next step after Hermes AgentMemory track",
    mustInclude: ["batch 44", "design cleanup"],
  },
  {
    id: 6,
    query: "design rules stored only memory",
    mustInclude: ["owner", "not", "aixia-global"],
  },
];

function parseResultText(result) {
  const text = result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  mkdirSync(dirname(PERSIST), { recursive: true });
  if (existsSync(PERSIST)) rmSync(PERSIST);

  process.env.STANDALONE_PERSIST_PATH = PERSIST;
  process.env.AGENTMEMORY_URL = "";
  delete process.env.AGENTMEMORY_FORCE_PROXY;

  const standalonePath = findStandaloneModule();
  const { handleToolCall } = await import(pathToFileURL(standalonePath).href);

  console.log("AgentMemory Batch 43 seed/recall");
  console.log("standalone:", standalonePath);
  console.log("persist:", PERSIST);
  console.log("");

  const seedResults = [];
  for (const entry of SEED_ENTRIES) {
    const result = await handleToolCall("memory_save", entry);
    const parsed = parseResultText(result);
    seedResults.push({ saved: parsed.saved ?? parsed, type: entry.type });
    console.log("seeded:", parsed.saved ?? parsed);
  }

  console.log("");
  console.log("Recall tests:");
  const recallResults = [];

  for (const test of RECALL_TESTS) {
    const result = await handleToolCall("memory_smart_search", {
      query: test.query,
      limit: 5,
    });
    const parsed = parseResultText(result);
    const blob = JSON.stringify(parsed).toLowerCase();
    const pass = test.mustInclude.every((needle) => blob.includes(needle.toLowerCase()));
    recallResults.push({
      id: test.id,
      query: test.query,
      pass,
      topTitles: (parsed.results ?? []).slice(0, 2).map((r) => r.title ?? r.content?.slice?.(0, 80)),
    });
    console.log(`${pass ? "PASS" : "FAIL"} #${test.id}: ${test.query}`);
  }

  const exportResult = await handleToolCall("memory_export", {});
  const exported = parseResultText(exportResult);
  const memoryCount = Array.isArray(exported.memories) ? exported.memories.length : 0;

  console.log("");
  console.log("Summary:");
  console.log("  memories seeded:", seedResults.length);
  console.log("  memories exported:", memoryCount);
  console.log("  recall passed:", recallResults.filter((r) => r.pass).length, "/", recallResults.length);
  console.log("  persist file:", PERSIST);

  const outPath = join(ROOT, "qa-agent", "hermes", "batch43-recall-results.json");
  const payload = {
    at: new Date().toISOString(),
    persistPath: PERSIST,
    standaloneModule: standalonePath,
    seedCount: seedResults.length,
    memoryCount,
    recallResults,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("  results json:", outPath);

  if (recallResults.some((r) => !r.pass)) process.exitCode = 1;
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
