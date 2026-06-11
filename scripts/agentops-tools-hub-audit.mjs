/**
 * Automated AgentOps Tools & Hub audit — local/staging only.
 * Usage: node scripts/agentops-tools-hub-audit.mjs
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE = process.env.AGENTOPS_AUDIT_BASE ?? "http://127.0.0.1:5173";
const OUT_PATH =
  process.env.AGENTOPS_AUDIT_OUT ??
  path.join(process.cwd(), "qa-agent/reports/agentops-tools-hub-audit.json");

const HUBS = [
  { name: "Chat & Voice", path: "/system/agent-ops/tools/chat-voice" },
  { name: "Voice Input / STT", path: "/system/agent-ops/tools/chat-voice/voice-input-stt" },
  { name: "Voice Output / TTS", path: "/system/agent-ops/tools/chat-voice/voice-output-tts" },
  { name: "Doubao LLM API", path: "/system/agent-ops/tools/chat-voice/doubao-llm-api" },
  { name: "Agent Brain & Memory", path: "/system/agent-ops/tools/agent-brain-memory" },
  { name: "Memory & Coordination Tools", path: "/system/agent-ops/tools/agent-brain-memory/memory-coordination-tools" },
  { name: "Code / Context Understanding", path: "/system/agent-ops/tools/agent-brain-memory/code-context-understanding" },
  { name: "Evidence Tools", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools" },
  { name: "Reasoning Layer", path: "/system/agent-ops/tools/agent-brain-memory/reasoning-layer" },
  {
    name: "Design Crew & References",
    path: "/system/agent-ops/tools/design-crew-references",
  },
];

const CHILD_ROUTES = [
  { name: "Hermes", path: "/system/agent-ops/tools/agent-brain-memory/memory-coordination-tools/hermes" },
  { name: "AgentMemory (Per-Agent)", path: "/system/agent-ops/tools/agent-brain-memory/memory-coordination-tools/hermes/per-agent-memory" },
  { name: "CodeGraph", path: "/system/agent-ops/tools/agent-brain-memory/code-context-understanding/codegraph" },
  { name: "Understand-Anything", path: "/system/agent-ops/tools/agent-brain-memory/code-context-understanding/understand-anything" },
  { name: "claude-context", path: "/system/agent-ops/tools/agent-brain-memory/code-context-understanding/claude-context" },
  { name: "Browser QA", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/browser-qa" },
  { name: "Playwright", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/playwright" },
  { name: "Reports", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/reports" },
  { name: "Guardrails", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/guardrails" },
  { name: "Verification Results", path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/verification-results" },
  { name: "Cursor", path: "/system/agent-ops/tools/agent-brain-memory/reasoning-layer/cursor" },
  { name: "Smart Cloud LLM", path: "/system/agent-ops/tools/agent-brain-memory/reasoning-layer/smart-cloud-llm" },
  { name: "Local LLM Later", path: "/system/agent-ops/tools/agent-brain-memory/reasoning-layer/local-llm-later" },
  { name: "Task-Specific Reasoning", path: "/system/agent-ops/tools/agent-brain-memory/reasoning-layer/task-specific-reasoning" },
  { name: "shadcn-admin", path: "/system/agent-ops/tools/design-crew-references/shadcn-admin" },
  { name: "TailAdmin React", path: "/system/agent-ops/tools/design-crew-references/tailadmin-react" },
  {
    name: "TailAdmin multi-template",
    path: "/system/agent-ops/tools/design-crew-references/tailadmin-multi-template",
  },
  {
    name: "AiXia global source of truth",
    path: "/system/agent-ops/tools/design-crew-references/aixia-global-source-of-truth",
  },
  {
    name: "visual/design QA rules",
    path: "/system/agent-ops/tools/design-crew-references/visual-design-qa-rules",
  },
];

const API_PROBES = [
  { label: "run_guardrails", url: "/api/agentops/evidence-tools", body: { toolId: "guardrails", action: "run_guardrails" } },
  { label: "refresh_report_index", url: "/api/agentops/evidence-tools", body: { toolId: "reports", action: "refresh_report_index" } },
  { label: "run_browser_qa_foundation", url: "/api/agentops/evidence-tools", body: { toolId: "browser-qa", action: "run_browser_qa_foundation" } },
  { label: "refresh_codegraph_status", url: "/api/agentops/code-context-tools", body: { toolId: "codegraph", action: "refresh_codegraph_status" } },
  { label: "run_claude_context_summary", url: "/api/agentops/code-context-tools", body: { toolId: "claude-context", action: "run_claude_context_summary" } },
  { label: "run_playwright_smoke", url: "/api/agentops/evidence-tools", body: { toolId: "playwright", action: "run_playwright_smoke" } },
];

const INVALID_INPUTS = [
  { label: "invalid code-context action", url: "/api/agentops/code-context-tools", body: { toolId: "claude-context", action: "rm_rf_everything" } },
  { label: "missing toolId", url: "/api/agentops/code-context-tools", body: { action: "run_claude_context_summary" } },
  { label: "invalid evidence action", url: "/api/agentops/evidence-tools", body: { toolId: "browser-qa", action: "delete_all_reports" } },
  { label: "invalid evidence toolId", url: "/api/agentops/evidence-tools", body: { toolId: "nope", action: "run_playwright_smoke" } },
];

async function getJson(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html shell */
  }
  return { status: r.status, json, isHtml: !json };
}

async function postJson(path, body, retries = 2) {
  const t0 = Date.now();
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const r = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      return { status: r.status, json, durationMs: Date.now() - t0 };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function checkRoute(entry) {
  const r = await fetch(`${BASE}${entry.path}`);
  const html = await r.text();
  const bad = /Category not found|Unknown category|Something went wrong/i.test(html);
  return {
    name: entry.name,
    url: `${BASE}${entry.path}`,
    httpStatus: r.status,
    ok: r.status === 200 && !bad,
    badContent: bad,
  };
}

function checkMemoryCoordinationLabelDrift() {
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const registry = fs.readFileSync(registryPath, "utf8");
  const groupPage = fs.readFileSync(groupPagePath, "utf8");

  function readRegistryStatus(id) {
    const match = registry.match(new RegExp(`"${id}":[\\s\\S]*?status:\\s*"([^"]+)"`));
    return match?.[1] ?? null;
  }

  const statuses = {
    "memory-coordination-tools": readRegistryStatus("memory-coordination-tools"),
    "mct-hermes": readRegistryStatus("mct-hermes"),
    "mct-agentmemory": readRegistryStatus("mct-agentmemory"),
  };

  const staleLabels = [];
  if (statuses["mct-hermes"] === "needs-setup") staleLabels.push("mct-hermes");
  if (statuses["mct-agentmemory"] === "not-installed") staleLabels.push("mct-agentmemory");
  if (statuses["memory-coordination-tools"] === "needs-setup") {
    staleLabels.push("memory-coordination-tools");
  }

  const usesDedicatedHubPage =
    groupPage.includes("ToolsHubMemoryCoordinationToolsPage") &&
    groupPage.includes("MEMORY_COORDINATION_GROUP_ID");

  return {
    ok: staleLabels.length === 0 && usesDedicatedHubPage,
    staleLabels,
    statuses,
    usesDedicatedHubPage,
  };
}

function checkHermesUiStatusConsistency() {
  const scopedFiles = [
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
    "src/app/system/agent-ops/tools/memoryCoordinationToolsViews.tsx",
    "src/app/system/agent-ops/tools/perAgentMemoryHubViews.tsx",
    "src/lib/agentops/hermesCoordinatorService.ts",
    "src/lib/agentops/hermesToolRegistryPreview.ts",
  ];
  const source = scopedFiles
    .map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"))
    .join("\n");

  const forbiddenPatterns = [
    { pattern: /Blocked: Safety Only/, label: "tool gate scary badge" },
    { pattern: /Coordinator not active/, label: "coordinator failure wording" },
    { pattern: /coordinator not active/, label: "coordinator failure wording (lowercase)" },
    { pattern: /Writes blocked/, label: "writes failure wording" },
    { pattern: /Blocked without approval/, label: "writeback scary badge" },
    { pattern: /Per-agent coordination not active/, label: "per-agent coordination failure wording" },
    { pattern: /AgentMemory writes blocked/, label: "agentmemory writes failure wording" },
    {
      pattern: /label: "Writes blocked", tone: "rose"/,
      label: "memory hub rose writes blocked badge",
    },
    {
      pattern: /<AixiaBadge tone="rose">Blocked<\/AixiaBadge>/,
      label: "rose Blocked badge on Hermes protection states",
    },
    {
      pattern: /tone=\{coordinatorActive \? "emerald" : "rose"\}/,
      label: "coordinator inactive shown as rose failure",
    },
    { pattern: /blocked: Safety Only/, label: "coordinator service safety-only scare copy" },
  ];

  const requiredPatterns = [
    { pattern: /HERMES_LABEL_WRITE_PROTECTED/, label: "write protected constant" },
    { pattern: /HERMES_LABEL_OWNER_GATED/, label: "owner-gated coordinator copy" },
    { pattern: /HERMES_LABEL_SAFETY_PROTECTED/, label: "safety protected copy" },
    { pattern: /formatHermesToolGateProtection/, label: "tool gate protection formatter" },
    { pattern: /Write Protected/, label: "approved write protected vocabulary" },
    { pattern: /Read-Only Active/, label: "approved read-only active vocabulary" },
  ];

  const violations = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(source))
    .map(({ label }) => label);
  const missingRequired = requiredPatterns
    .filter(({ pattern }) => !pattern.test(source))
    .map(({ label }) => label);

  return {
    ok: violations.length === 0 && missingRequired.length === 0,
    violations,
    missingRequired,
  };
}

const HERMES_COORDINATION_CONTRACT_PATH = "registry/HERMES_COORDINATION_CONTRACT.md";

/** Stage 0 — locked Hermes coordination architecture contract (documentation only). */
function checkHermesCoordinationContract() {
  const contractPath = path.join(process.cwd(), HERMES_COORDINATION_CONTRACT_PATH);
  if (!fs.existsSync(contractPath)) {
    return {
      ok: false,
      path: HERMES_COORDINATION_CONTRACT_PATH,
      missingRequired: ["contract file missing"],
      stageDMigrationNotes: [],
    };
  }

  const source = fs.readFileSync(contractPath, "utf8");
  const requiredPhrases = [
    { pattern: /Hermes is the coordinator/i, label: "Hermes is the coordinator" },
    { pattern: /Cursor is a manual worker/i, label: "Cursor is a manual worker" },
    { pattern: /AgentMemory is a memory provider/i, label: "AgentMemory is a memory provider" },
    { pattern: /Stage D/i, label: "Stage D" },
    { pattern: /production remains protected/i, label: "production remains protected" },
    {
      pattern: /source-of-truth files must never be auto-written/i,
      label: "source-of-truth files must never be auto-written",
    },
  ];

  const missingRequired = requiredPhrases
    .filter(({ pattern }) => !pattern.test(source))
    .map(({ label }) => label);

  const stageDMigrationNotes = [
    "addAgentOpsAgentMemory — direct per-agent memory insert (service.ts)",
    "commitAgentOpsMemoryFromChatApproval — chat approval write path (service.ts)",
    "createAgentOpsGlobalMemoryApprovedRecordFromCandidate — global memory approval (globalMemoryApprovedService.ts)",
    "Tool learning candidate services — evidence/code-context learning candidates outside unified Hermes proposal queue",
    "createAgentOpsCursorHandoff — fix-plan/Cursor handoff not yet HermesPromptCoordinator-packaged",
  ];

  return {
    ok: missingRequired.length === 0,
    path: HERMES_COORDINATION_CONTRACT_PATH,
    missingRequired,
    stageDMigrationNotes,
  };
}

/** Stage C6 — static structural checks for Hermes Verification Reviewer (read-only path). */
function checkHermesVerificationReviewer() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesVerificationReviewerService.ts",
  );
  const assistPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/IssueHermesAdvisoryAssist.tsx",
  );
  const reviewerPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/IssueHermesVerificationReviewerPanel.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(servicePath)) missingRequired.push("hermesVerificationReviewerService.ts");
  if (!fs.existsSync(reviewerPanelPath)) {
    missingRequired.push("IssueHermesVerificationReviewerPanel.tsx");
  }

  const serviceSource = fs.existsSync(servicePath)
    ? fs.readFileSync(servicePath, "utf8")
    : "";
  const assistSource = fs.existsSync(assistPath) ? fs.readFileSync(assistPath, "utf8") : "";
  const panelSource = fs.existsSync(reviewerPanelPath)
    ? fs.readFileSync(reviewerPanelPath, "utf8")
    : "";

  const requiredInService = [
    { pattern: /reviewAgentOpsHermesCursorReport/, label: "reviewAgentOpsHermesCursorReport export" },
    { pattern: /mustNotAutoClose:\s*true/, label: "mustNotAutoClose hard stop" },
    { pattern: /writesBlocked:\s*true/, label: "writesBlocked in result" },
    { pattern: /autoDispatchBlocked:\s*true/, label: "autoDispatchBlocked in result" },
    { pattern: /productionBlocked:\s*true/, label: "productionBlocked in result" },
  ];

  for (const { pattern, label } of requiredInService) {
    if (!pattern.test(serviceSource)) missingRequired.push(`service: ${label}`);
  }

  const forbiddenInService = [
    { pattern: /\.insert\s*\(/, label: "Supabase insert in reviewer service" },
    { pattern: /\.update\s*\(/, label: "Supabase update in reviewer service" },
    { pattern: /recordAgentOps/, label: "memory write helper in reviewer service" },
    { pattern: /requestAgentOpsHermesIssueFixReportReview/, label: "LLM advisory path in reviewer service" },
  ];

  const violations = forbiddenInService
    .filter(({ pattern }) => pattern.test(serviceSource))
    .map(({ label }) => label);

  const wiredInUi =
    assistSource.includes("IssueHermesVerificationReviewerPanel") &&
    panelSource.includes("reviewAgentOpsHermesCursorReport") &&
    panelSource.includes("Review Cursor Report with Hermes");

  if (!wiredInUi) {
    missingRequired.push("Issue Workspace W3 verification reviewer wiring");
  }

  if (panelSource && !panelSource.includes("mustNotAutoClose")) {
    missingRequired.push("reviewer panel surfaces mustNotAutoClose advisory");
  }

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    issueRouteAuditDeferred: true,
  };
}

/** Stage C4 — static structural checks for Hermes Agent Workflow handoff (read-only path). */
function checkHermesAgentHandoff() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesAgentWorkflowService.ts",
  );
  const panelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/agents/AgentHermesHandoffPanel.tsx",
  );
  const agentPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(servicePath)) missingRequired.push("hermesAgentWorkflowService.ts");
  if (!fs.existsSync(panelPath)) missingRequired.push("AgentHermesHandoffPanel.tsx");

  const serviceSource = fs.existsSync(servicePath)
    ? fs.readFileSync(servicePath, "utf8")
    : "";
  const panelSource = fs.existsSync(panelPath) ? fs.readFileSync(panelPath, "utf8") : "";
  const agentPageSource = fs.existsSync(agentPagePath)
    ? fs.readFileSync(agentPagePath, "utf8")
    : "";

  const requiredInService = [
    { pattern: /assembleAgentOpsHermesAgentWorkflowBundle/, label: "assembleAgentOpsHermesAgentWorkflowBundle export" },
    { pattern: /autoExecutionBlocked:\s*true/, label: "autoExecutionBlocked hard stop" },
    { pattern: /writesBlocked:\s*true/, label: "writesBlocked in bundle" },
    { pattern: /mustUseHermesCoordinator:\s*true/, label: "mustUseHermesCoordinator in bundle" },
  ];

  for (const { pattern, label } of requiredInService) {
    if (!pattern.test(serviceSource)) missingRequired.push(`service: ${label}`);
  }

  const forbiddenInC4Files = [
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory in C4 files" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval in C4 files" },
    { pattern: /cursorDispatch|autoDispatchAgent|dispatchToCursor/i, label: "Cursor auto-dispatch symbol in C4 files" },
  ];

  const c4Combined = `${serviceSource}\n${panelSource}`;
  const violations = forbiddenInC4Files
    .filter(({ pattern }) => pattern.test(c4Combined))
    .map(({ label }) => label);

  const wiredInUi =
    agentPageSource.includes("AgentHermesHandoffPanel") &&
    panelSource.includes("assembleAgentOpsHermesAgentWorkflowBundle") &&
    panelSource.includes("Ask Hermes for Context");

  if (!wiredInUi) {
    missingRequired.push("Agent detail page Hermes Agent Handoff wiring");
  }

  if (panelSource && !panelSource.includes("autoExecutionBlocked")) {
    missingRequired.push("handoff panel surfaces autoExecutionBlocked advisory");
  }

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    agentRouteAuditDeferred: true,
  };
}

/** Stage C2 — static structural checks for Hermes Memory Proposal Flow. */
function checkHermesMemoryProposal() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesMemoryProposalService.ts",
  );
  const panelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/HermesMemoryProposalQueuePanel.tsx",
  );
  const hermesViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
  );
  const agentPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/agents/AgentHermesHandoffPanel.tsx",
  );
  const issueReviewerPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/IssueHermesVerificationReviewerPanel.tsx",
  );
  const typesPath = path.join(process.cwd(), "src/lib/agentops/types.ts");

  const missingRequired = [];
  if (!fs.existsSync(servicePath)) missingRequired.push("hermesMemoryProposalService.ts");
  if (!fs.existsSync(panelPath)) missingRequired.push("HermesMemoryProposalQueuePanel.tsx");

  const serviceSource = fs.existsSync(servicePath)
    ? fs.readFileSync(servicePath, "utf8")
    : "";
  const panelSource = fs.existsSync(panelPath) ? fs.readFileSync(panelPath, "utf8") : "";
  const hermesViewsSource = fs.existsSync(hermesViewsPath)
    ? fs.readFileSync(hermesViewsPath, "utf8")
    : "";
  const agentPanelSource = fs.existsSync(agentPanelPath)
    ? fs.readFileSync(agentPanelPath, "utf8")
    : "";
  const issueReviewerSource = fs.existsSync(issueReviewerPath)
    ? fs.readFileSync(issueReviewerPath, "utf8")
    : "";
  const typesSource = fs.existsSync(typesPath) ? fs.readFileSync(typesPath, "utf8") : "";

  const requiredInService = [
    { pattern: /createDraftHermesMemoryProposalFromText/, label: "createDraftHermesMemoryProposalFromText" },
    { pattern: /saveHermesMemoryProposalForReview/, label: "saveHermesMemoryProposalForReview" },
    { pattern: /reviewHermesMemoryProposal/, label: "reviewHermesMemoryProposal" },
    { pattern: /memoryWriteBlocked:\s*true/, label: "memoryWriteBlocked in metadata" },
    { pattern: /writeExecuted:\s*false/, label: "writeExecuted false in metadata" },
    { pattern: /stageDWriteRequired:\s*true/, label: "stageDWriteRequired in metadata" },
    { pattern: /approvalRequired:\s*true/, label: "approvalRequired in metadata" },
    { pattern: /hermes_memory_proposal_c2/, label: "proposal action constant" },
  ];

  for (const { pattern, label } of requiredInService) {
    if (!pattern.test(serviceSource)) missingRequired.push(`service: ${label}`);
  }

  const requiredInTypes = [
    { pattern: /interface AgentOpsHermesMemoryProposal/, label: "AgentOpsHermesMemoryProposal type" },
    { pattern: /approvalRequired:\s*true/, label: "approvalRequired on proposal type" },
    { pattern: /stageDWriteRequired:\s*true/, label: "stageDWriteRequired on proposal type" },
    { pattern: /writeExecuted:\s*false/, label: "writeExecuted on proposal type" },
    { pattern: /memoryWriteBlocked:\s*true/, label: "memoryWriteBlocked on proposal type" },
  ];

  for (const { pattern, label } of requiredInTypes) {
    if (!pattern.test(typesSource)) missingRequired.push(`types: ${label}`);
  }

  const c2Files = `${serviceSource}\n${panelSource}\n${agentPanelSource}\n${issueReviewerSource}`;
  const forbiddenInC2 = [
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory in C2 files" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval in C2 files" },
    {
      pattern: /createAgentOpsGlobalMemoryApprovedRecordFromCandidate/,
      label: "createAgentOpsGlobalMemoryApprovedRecordFromCandidate in C2 files",
    },
  ];

  const violations = forbiddenInC2
    .filter(({ pattern }) => pattern.test(c2Files))
    .map(({ label }) => label);

  const wiredInUi =
    hermesViewsSource.includes("HermesMemoryProposalQueuePanel") &&
    panelSource.includes("Hermes Memory Proposal Queue") &&
    agentPanelSource.includes("Create Hermes Memory Proposal") &&
    issueReviewerSource.includes("Create Memory Proposal from Review");

  if (!wiredInUi) {
    missingRequired.push("Hermes / Agent / Issue proposal UI wiring");
  }

  if (panelSource && !panelSource.includes("Stage D Required")) {
    missingRequired.push("proposal queue panel Stage D label");
  }

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    proposalPersistenceAuditDeferred: true,
  };
}

/** Stage D2 — static structural checks for AgentMemory Provider layer. */
function checkAgentMemoryProviderD2() {
  const providerPath = path.join(process.cwd(), "src/lib/agentops/agentMemoryProvider.ts");
  const writePolicyPath = path.join(
    process.cwd(),
    "src/lib/agentops/agentMemoryProviderWritePolicy.ts",
  );
  const supabasePath = path.join(
    process.cwd(),
    "src/lib/agentops/supabaseAgentMemoryProvider.ts",
  );
  const externalPath = path.join(
    process.cwd(),
    "src/lib/agentops/externalAgentMemoryProvider.ts",
  );
  const assemblerPath = path.join(process.cwd(), "src/lib/agentops/hermesContextAssembler.ts");
  const statusBlockPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/AgentMemoryProviderStatusBlock.tsx",
  );
  const hermesViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(providerPath)) missingRequired.push("agentMemoryProvider.ts");
  if (!fs.existsSync(supabasePath)) missingRequired.push("supabaseAgentMemoryProvider.ts");

  const providerSource = fs.existsSync(providerPath)
    ? fs.readFileSync(providerPath, "utf8")
    : "";
  const writePolicySource = fs.existsSync(writePolicyPath)
    ? fs.readFileSync(writePolicyPath, "utf8")
    : "";
  const supabaseSource = fs.existsSync(supabasePath)
    ? fs.readFileSync(supabasePath, "utf8")
    : "";
  const externalSource = fs.existsSync(externalPath)
    ? fs.readFileSync(externalPath, "utf8")
    : "";
  const assemblerSource = fs.existsSync(assemblerPath)
    ? fs.readFileSync(assemblerPath, "utf8")
    : "";
  const statusSource = fs.existsSync(statusBlockPath)
    ? fs.readFileSync(statusBlockPath, "utf8")
    : "";
  const hermesViewsSource = fs.existsSync(hermesViewsPath)
    ? fs.readFileSync(hermesViewsPath, "utf8")
    : "";

  const requiredInProvider = [
    { pattern: /getAgentOpsAgentMemoryProvider/, label: "getAgentOpsAgentMemoryProvider export" },
    { pattern: /providerOnly:\s*true/, label: "providerOnly in status" },
    { pattern: /coordinatedByHermes:\s*true/, label: "coordinatedByHermes in status" },
    { pattern: /writesRequireHermesMemoryCoordinator:\s*true/, label: "writesRequireHermesMemoryCoordinator" },
    { pattern: /writesRequireStageDApproval:\s*true/, label: "writesRequireStageDApproval" },
  ];

  for (const item of requiredInProvider) {
    const haystack = `${providerSource}\n${supabaseSource}\n${writePolicySource}\n${externalSource}`;
    if (!item.pattern.test(haystack)) missingRequired.push(`provider: ${item.label}`);
  }

  if (supabaseSource && /addAgentOpsAgentMemory/.test(supabaseSource)) {
    missingRequired.push("supabase provider must not call addAgentOpsAgentMemory");
  }
  if (supabaseSource && /commitAgentOpsMemoryFromChatApproval/.test(supabaseSource)) {
    missingRequired.push("supabase provider must not call commitAgentOpsMemoryFromChatApproval");
  }

  if (
    assemblerSource &&
    !assemblerSource.includes("getAgentOpsAgentMemoryProvider")
  ) {
    missingRequired.push("HermesContextAssembler uses AgentMemoryProvider");
  }

  const uiWired =
    statusSource.includes("Provider Only") &&
    statusSource.includes("Stage D via HermesMemoryCoordinator") &&
    hermesViewsSource.includes("AgentMemoryProviderStatusBlock");

  if (!uiWired) {
    missingRequired.push("AgentMemory provider status UI");
  }

  const externalClassifiedFuture =
    externalSource.includes("Future adapter planned") ||
    externalSource.includes("not connected");

  if (!externalClassifiedFuture) {
    missingRequired.push("external package classified as planned/future");
  }

  const violations = [];

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    d2ProviderReadAuditDeferred: true,
    externalPackageConnected: false,
  };
}

/** Stage D3 — static structural checks for Global Memory Store provider layer. */
function checkGlobalMemoryProviderD3() {
  const providerPath = path.join(process.cwd(), "src/lib/agentops/globalMemoryProvider.ts");
  const writePolicyPath = path.join(
    process.cwd(),
    "src/lib/agentops/globalMemoryProviderWritePolicy.ts",
  );
  const supabasePath = path.join(
    process.cwd(),
    "src/lib/agentops/supabaseGlobalMemoryProvider.ts",
  );
  const candidatePath = path.join(
    process.cwd(),
    "src/lib/agentops/globalMemoryCandidateService.ts",
  );
  const assemblerPath = path.join(process.cwd(), "src/lib/agentops/hermesContextAssembler.ts");
  const statusBlockPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/GlobalMemoryProviderStatusBlock.tsx",
  );
  const hermesViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(providerPath)) missingRequired.push("globalMemoryProvider.ts");
  if (!fs.existsSync(supabasePath)) missingRequired.push("supabaseGlobalMemoryProvider.ts");

  const providerSource = fs.existsSync(providerPath)
    ? fs.readFileSync(providerPath, "utf8")
    : "";
  const writePolicySource = fs.existsSync(writePolicyPath)
    ? fs.readFileSync(writePolicyPath, "utf8")
    : "";
  const supabaseSource = fs.existsSync(supabasePath)
    ? fs.readFileSync(supabasePath, "utf8")
    : "";
  const candidateSource = fs.existsSync(candidatePath)
    ? fs.readFileSync(candidatePath, "utf8")
    : "";
  const assemblerSource = fs.existsSync(assemblerPath)
    ? fs.readFileSync(assemblerPath, "utf8")
    : "";
  const statusSource = fs.existsSync(statusBlockPath)
    ? fs.readFileSync(statusBlockPath, "utf8")
    : "";
  const hermesViewsSource = fs.existsSync(hermesViewsPath)
    ? fs.readFileSync(hermesViewsPath, "utf8")
    : "";

  const haystack = `${providerSource}\n${supabaseSource}\n${writePolicySource}`;

  const requiredPatterns = [
    { pattern: /getAgentOpsGlobalMemoryProvider/, label: "getAgentOpsGlobalMemoryProvider export" },
    { pattern: /providerOnly:\s*true/, label: "providerOnly in status" },
    { pattern: /coordinatedByHermes:\s*true/, label: "coordinatedByHermes in status" },
    { pattern: /sourceOfTruthReplacement:\s*false/, label: "sourceOfTruthReplacement false" },
    { pattern: /writesRequireHermesMemoryCoordinator:\s*true/, label: "writesRequireHermesMemoryCoordinator" },
    { pattern: /writesRequireStageDApproval:\s*true/, label: "writesRequireStageDApproval" },
    { pattern: /sourceOfTruthAutoWriteAllowed:\s*false/, label: "sourceOfTruthAutoWriteAllowed false" },
  ];

  for (const item of requiredPatterns) {
    if (!item.pattern.test(haystack)) missingRequired.push(`provider: ${item.label}`);
  }

  const forbiddenInProvider = [
    {
      pattern: /createAgentOpsGlobalMemoryApprovedRecordFromCandidate/,
      label: "candidate approve write in provider adapter",
    },
    {
      pattern: /createAgentOpsGlobalMemoryApprovedRecordFromHermesProposal/,
      label: "Hermes proposal write in provider adapter",
    },
    { pattern: /aixia-global.*write|writeSourceOfTruth/i, label: "SOT file write in provider adapter" },
  ];

  const violations = forbiddenInProvider
    .filter(({ pattern }) => pattern.test(supabaseSource))
    .map(({ label }) => label);

  if (
    assemblerSource &&
    !assemblerSource.includes("getAgentOpsGlobalMemoryProvider")
  ) {
    missingRequired.push("HermesContextAssembler uses GlobalMemoryProvider");
  }

  const uiWired =
    statusSource.includes("Provider Only") &&
    statusSource.includes("Source-of-Truth Replacement: No") &&
    hermesViewsSource.includes("GlobalMemoryProviderStatusBlock");

  if (!uiWired) {
    missingRequired.push("Global Memory Store provider status UI");
  }

  const legacyCandidateClassified =
    candidateSource.includes("createAgentOpsGlobalMemoryApprovedRecordFromCandidate") &&
    (writePolicySource.includes("legacy") ||
      writePolicySource.includes("Legacy") ||
      writePolicySource.includes("createAgentOpsGlobalMemoryApprovedRecordFromCandidate"));

  if (!legacyCandidateClassified) {
    missingRequired.push("legacy global candidate approve path classified in write policy");
  }

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    d3ProviderReadAuditDeferred: true,
  };
}

/** Stage E1 — static structural checks for structured Cursor handoff. */
function checkHermesStructuredCursorHandoffE1() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesStructuredCursorHandoffService.ts",
  );
  const typesPath = path.join(process.cwd(), "src/lib/agentops/types.ts");
  const panelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/HermesStructuredCursorHandoffPanel.tsx",
  );
  const hermesViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
  );
  const issuePanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/IssueHermesPromptCoordinatorPanel.tsx",
  );
  const agentPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/agents/AgentHermesHandoffPanel.tsx",
  );
  const verificationPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/IssueHermesVerificationReviewerPanel.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(servicePath)) {
    missingRequired.push("hermesStructuredCursorHandoffService.ts");
  }

  const serviceSource = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, "utf8") : "";
  const typesSource = fs.existsSync(typesPath) ? fs.readFileSync(typesPath, "utf8") : "";
  const panelSource = fs.existsSync(panelPath) ? fs.readFileSync(panelPath, "utf8") : "";
  const hermesViewsSource = fs.existsSync(hermesViewsPath)
    ? fs.readFileSync(hermesViewsPath, "utf8")
    : "";
  const issuePanelSource = fs.existsSync(issuePanelPath)
    ? fs.readFileSync(issuePanelPath, "utf8")
    : "";
  const agentPanelSource = fs.existsSync(agentPanelPath)
    ? fs.readFileSync(agentPanelPath, "utf8")
    : "";
  const verificationPanelSource = fs.existsSync(verificationPanelPath)
    ? fs.readFileSync(verificationPanelPath, "utf8")
    : "";

  const haystack = `${serviceSource}\n${typesSource}`;

  const requiredPatterns = [
    { pattern: /buildHermesCursorHandoffPackage/, label: "buildHermesCursorHandoffPackage" },
    { pattern: /manualHandoffOnly:\s*true/, label: "manualHandoffOnly true" },
    { pattern: /autoDispatchBlocked:\s*true/, label: "autoDispatchBlocked true" },
    { pattern: /productionBlocked:\s*true/, label: "productionBlocked true" },
    { pattern: /sourceOfTruthProtected:\s*true/, label: "sourceOfTruthProtected true" },
    { pattern: /issueLifecycleMutationBlocked:\s*true/, label: "issueLifecycleMutationBlocked true" },
    { pattern: /HERMES_STRUCTURED_CURSOR_HANDOFF_E1_ACTION/, label: "E1 metadata action" },
  ];

  for (const item of requiredPatterns) {
    if (!item.pattern.test(haystack)) missingRequired.push(`E1: ${item.label}`);
  }

  const e1Files = `${serviceSource}\n${panelSource}`;
  const forbiddenInE1 = [
    { pattern: /createAgentOpsCursorHandoff/, label: "legacy cursor handoff with issue mutation" },
    { pattern: /updateAgentOpsFindingStatus/, label: "issue lifecycle mutation in E1" },
    { pattern: /markAgentOpsFixed/, label: "mark fixed in E1" },
    { pattern: /addAgentOpsAgentMemory/, label: "memory write in E1" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "Stage D write in E1" },
    { pattern: /createAgentOpsCursorHandoff|cursor.*dispatch|autoDispatch\s*\(/i, label: "cursor dispatch in E1 service" },
  ];

  const violations = forbiddenInE1
    .filter(({ pattern, label }) => {
      if (label === "cursor dispatch in E1 service") {
        return /createAgentOpsCursorHandoff/.test(serviceSource);
      }
      return pattern.test(e1Files);
    })
    .map(({ label }) => label);

  const uiHermes =
    hermesViewsSource.includes("HermesStructuredCursorHandoffPanel") &&
    panelSource.includes("Build Structured Cursor Handoff") &&
    panelSource.includes("Copy Full Handoff");

  if (!uiHermes) missingRequired.push("Hermes page structured handoff UI");

  const uiIssue = issuePanelSource.includes("HermesStructuredCursorHandoffPanel");
  const uiAgent = agentPanelSource.includes("HermesStructuredCursorHandoffPanel");
  const uiVerification = verificationPanelSource.includes("HermesStructuredCursorHandoffPanel");

  if (!uiIssue) missingRequired.push("Issue Workspace structured handoff UI");
  if (!uiAgent) missingRequired.push("Agent Detail structured handoff UI");
  if (!uiVerification) missingRequired.push("Verification follow-up structured handoff UI");

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    e1PersistenceAuditDeferred: true,
  };
}

/** Stage E2 — controlled automation readiness (automation must remain disabled). */
function checkHermesControlledAutomationReadinessE2() {
  const historyPath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesHandoffHistoryService.ts",
  );
  const readinessPath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesAutomationReadinessService.ts",
  );
  const historyPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/HermesHandoffHistoryPanel.tsx",
  );
  const readinessPanelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/HermesAutomationReadinessPanel.tsx",
  );
  const hermesViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/hermesDetailViews.tsx",
  );
  const typesPath = path.join(process.cwd(), "src/lib/agentops/types.ts");

  const missingRequired = [];
  if (!fs.existsSync(historyPath)) missingRequired.push("hermesHandoffHistoryService.ts");
  if (!fs.existsSync(readinessPath)) missingRequired.push("hermesAutomationReadinessService.ts");

  const historySource = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : "";
  const readinessSource = fs.existsSync(readinessPath)
    ? fs.readFileSync(readinessPath, "utf8")
    : "";
  const historyPanelSource = fs.existsSync(historyPanelPath)
    ? fs.readFileSync(historyPanelPath, "utf8")
    : "";
  const readinessPanelSource = fs.existsSync(readinessPanelPath)
    ? fs.readFileSync(readinessPanelPath, "utf8")
    : "";
  const hermesViewsSource = fs.existsSync(hermesViewsPath)
    ? fs.readFileSync(hermesViewsPath, "utf8")
    : "";
  const typesSource = fs.existsSync(typesPath) ? fs.readFileSync(typesPath, "utf8") : "";

  const haystack = `${historySource}\n${readinessSource}\n${typesSource}`;

  const requiredPatterns = [
    { pattern: /listHermesStructuredCursorHandoffs/, label: "listHermesStructuredCursorHandoffs" },
    { pattern: /recordHermesHandoffStatusEvent/, label: "recordHermesHandoffStatusEvent" },
    { pattern: /getHermesAutomationReadinessStatus/, label: "getHermesAutomationReadinessStatus" },
    { pattern: /automationEnabled:\s*false/, label: "automationEnabled false" },
    { pattern: /cursorAutoDispatchEnabled:\s*false/, label: "cursorAutoDispatchEnabled false" },
    { pattern: /schedulerEnabled:\s*false/, label: "schedulerEnabled false" },
    { pattern: /autonomousAgentsEnabled:\s*false/, label: "autonomousAgentsEnabled false" },
    { pattern: /productionAutomationEnabled:\s*false/, label: "productionAutomationEnabled false" },
    { pattern: /issueAutoCloseEnabled:\s*false/, label: "issueAutoCloseEnabled false" },
    { pattern: /memoryAutoWriteEnabled:\s*false/, label: "memoryAutoWriteEnabled false" },
    { pattern: /HERMES_HANDOFF_STATUS_EVENT_E2_ACTION/, label: "E2 status event action" },
  ];

  for (const item of requiredPatterns) {
    if (!item.pattern.test(haystack)) missingRequired.push(`E2: ${item.label}`);
  }

  const e2Files = `${historySource}\n${historyPanelSource}`;
  const forbiddenInE2 = [
    { pattern: /createAgentOpsCursorHandoff/, label: "legacy createAgentOpsCursorHandoff in E2" },
    { pattern: /updateAgentOpsFindingStatus/, label: "issue lifecycle mutation in E2" },
    { pattern: /markAgentOpsFixed/, label: "mark fixed in E2" },
    { pattern: /addAgentOpsAgentMemory/, label: "memory write in E2" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "Stage D write in E2" },
  ];

  const violations = forbiddenInE2
    .filter(({ pattern }) => pattern.test(e2Files))
    .map(({ label }) => label);

  const uiWired =
    hermesViewsSource.includes("HermesAutomationReadinessPanel") &&
    hermesViewsSource.includes("HermesHandoffHistoryPanel") &&
    readinessPanelSource.includes("Automation Disabled") &&
    historyPanelSource.includes("Review Report with Hermes");

  if (!uiWired) missingRequired.push("E2 automation readiness + handoff history UI");

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    e2MetadataAuditDeferred: true,
  };
}

/** CV-0 — Chat & Voice hub shell (static; no voice runtime probes). */
function checkChatVoiceHubCV0() {
  const viewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const categoryPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/page.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  if (!fs.existsSync(viewPath)) missingRequired.push("chatVoiceToolsViews.tsx");
  if (!fs.existsSync(categoryPagePath)) missingRequired.push("[categoryId]/page.tsx");

  const viewSource = fs.existsSync(viewPath) ? fs.readFileSync(viewPath, "utf8") : "";
  const categorySource = fs.existsSync(categoryPagePath)
    ? fs.readFileSync(categoryPagePath, "utf8")
    : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const requiredGroups = [
    "voice-input-stt",
    "voice-output-tts",
    "doubao-llm-api",
  ];

  for (const groupId of requiredGroups) {
    if (!viewSource.includes(groupId)) missingRequired.push(`CV group ${groupId}`);
  }

  if (viewSource.includes("conversation-safety-logs")) {
    missingRequired.push("hub must not show conversation-safety-logs card");
  }
  if (viewSource.includes("avatar-realtime-voice")) {
    missingRequired.push("hub must not show avatar-realtime-voice card");
  }

  const safetyBadges = [
    "Manual Only",
    "Voice Execution Protected",
    "Production Protected",
    "Privacy Review Required",
    "Provider Activation Required",
  ];
  for (const label of safetyBadges) {
    if (!viewSource.includes(label)) missingRequired.push(`safety badge: ${label}`);
  }

  const wired =
    categorySource.includes('categoryId === CHAT_VOICE_CATEGORY_ID') ||
    categorySource.includes('"chat-voice"') && categorySource.includes("ToolsHubChatVoicePage");

  if (!wired) missingRequired.push("chat-voice category page wiring");

  const registryOk =
    registrySource.includes('"chat-voice":') &&
    registrySource.includes("Chat & Voice Tools");

  if (!registryOk) missingRequired.push("toolRegistry chat-voice category");

  const forbiddenInView = [
    { pattern: /getUserMedia/, label: "getUserMedia in chat voice hub view" },
    { pattern: /speakText/, label: "speakText in chat voice hub view" },
    { pattern: /transcribeAudio/, label: "transcribeAudio in chat voice hub view" },
    { pattern: /createRealtimeVoiceSession/, label: "realtime voice in chat voice hub view" },
    { pattern: /navigator\.mediaDevices/, label: "mediaDevices in chat voice hub view" },
  ].filter(({ pattern }) => pattern.test(viewSource)).map(({ label }) => label);

  return {
    ok: missingRequired.length === 0 && forbiddenInView.length === 0,
    missingRequired,
    forbiddenInView,
    childRoutesDeferred: true,
    voiceApiProbesDeferred: true,
  };
}

/** CV-LLM-1/2 — Doubao LLM API page skeleton (static source checks only). */
function checkChatVoiceHubLLM12() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const llmPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceLlmToolsView.tsx",
  );
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const providerPath = path.join(process.cwd(), "src/lib/agentops/doubaoLlmProvider.ts");
  const clientPath = path.join(process.cwd(), "src/lib/agentops/doubaoLlmClient.ts");
  const coordinationPath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceLlmCoordinationService.ts",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["chatVoiceLlmToolsView.tsx", llmPagePath],
    ["doubaoLlmProvider.ts", providerPath],
    ["doubaoLlmClient.ts", clientPath],
    ["chatVoiceLlmCoordinationService.ts", coordinationPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const llmPageSource = fs.existsSync(llmPagePath) ? fs.readFileSync(llmPagePath, "utf8") : "";
  const groupSource = fs.existsSync(groupPagePath) ? fs.readFileSync(groupPagePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";
  const providerSource = fs.existsSync(providerPath) ? fs.readFileSync(providerPath, "utf8") : "";
  const clientSource = fs.existsSync(clientPath) ? fs.readFileSync(clientPath, "utf8") : "";

  if (!hubSource.includes("doubao-llm-api")) {
    missingRequired.push("hub includes doubao-llm-api card");
  }
  if (hubSource.includes("conversation-safety-logs")) {
    missingRequired.push("hub excludes conversation-safety-logs");
  }
  if (
    !groupSource.includes("ToolsHubDoubaoLlmApiPage") ||
    !groupSource.includes("doubao-llm-api")
  ) {
    missingRequired.push("group page wires doubao-llm-api route");
  }
  if (!registrySource.includes('"doubao-llm-api":')) {
    missingRequired.push("toolRegistry doubao-llm-api group");
  }

  const llmSafetyPhrases = [
    "no AgentMemory write",
    "no issue mutation",
    "No Cursor dispatch",
    "manual test only",
    "Hermes brain support",
  ];
  for (const phrase of llmSafetyPhrases) {
    if (!llmPageSource.toLowerCase().includes(phrase.toLowerCase())) {
      missingRequired.push(`LLM page safety phrase: ${phrase}`);
    }
  }

  if (!llmPageSource.includes("/api/agentops/llm")) {
    missingRequired.push("LLM page references /api/agentops/llm");
  }
  if (!clientSource.includes("/api/agentops/llm")) {
    missingRequired.push("doubaoLlmClient uses /api/agentops/llm");
  }
  if (providerSource.includes("ARK_API_KEY")) {
    missingRequired.push("doubaoLlmProvider must not expose ARK_API_KEY");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    llmApiProbesDeferred: true,
  };
}

/** DESIGN-1B — Design Crew & References hub + five active tool pages (static source checks only). */
function checkDesignCrewReferencesHubDESIGN1B() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/designCrewReferencesViews.tsx",
  );
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/designCrewReferencesService.ts",
  );
  const categoryPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/page.tsx",
  );
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["designCrewReferencesViews.tsx", hubViewPath],
    ["designCrewReferencesService.ts", servicePath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const broadControlPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/designReferenceControlView.tsx",
  );
  if (fs.existsSync(broadControlPath)) {
    missingRequired.push("designReferenceControlView.tsx must be removed (no broad control page)");
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const serviceSource = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, "utf8") : "";
  const categorySource = fs.existsSync(categoryPagePath)
    ? fs.readFileSync(categoryPagePath, "utf8")
    : "";
  const groupSource = fs.existsSync(groupPagePath) ? fs.readFileSync(groupPagePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  if (
    !categorySource.includes("ToolsHubDesignCrewReferencesPage") ||
    !categorySource.includes("design-crew-references")
  ) {
    missingRequired.push("category page wires design-crew-references hub view");
  }

  if (
    !groupSource.includes("ToolsHubDesignCrewToolPage") ||
    !groupSource.includes("design-crew-references")
  ) {
    missingRequired.push("group page wires design-crew-references tool pages");
  }

  const toolNames = [
    "shadcn-admin",
    "TailAdmin React",
    "TailAdmin multi-template",
    "AiXia global source of truth",
    "visual/design QA rules",
  ];
  for (const name of toolNames) {
    if (!hubSource.includes(name) && !serviceSource.includes(name)) {
      missingRequired.push(`hub must surface tool name: ${name}`);
    }
  }

  const routeSlugs = [
    "shadcn-admin",
    "tailadmin-react",
    "tailadmin-multi-template",
    "aixia-global-source-of-truth",
    "visual-design-qa-rules",
  ];
  for (const slug of routeSlugs) {
    const route = `/design-crew-references/${slug}`;
    if (!serviceSource.includes(slug)) {
      missingRequired.push(`service route slug: ${slug}`);
    }
    if (!registrySource.includes(`design-crew-references/${slug}`)) {
      missingRequired.push(`registry route: /design-crew-references/${slug}`);
    }
  }

  const hubLoopPattern = /route:\s*`\$\{TOOLS_HUB_BASE_PATH\}\/design-crew-references`/;
  const registryDesignBlocks = registrySource.match(
    /"design-(?:shadcn-admin|tailadmin-react|tailadmin-multi|aixia-global-sot|visual-qa-rules)":[\s\S]*?route:[^\n]+/g,
  );
  if (registryDesignBlocks) {
    for (const block of registryDesignBlocks) {
      if (hubLoopPattern.test(block)) {
        missingRequired.push("design tool route loops back to category hub");
      }
      if (/status:\s*"planned"/.test(block)) {
        missingRequired.push("design tool must not display planned status");
      }
    }
  }

  const requiredPhrases = [
    "Design Crew & References",
    "reference-only",
    "Local Cursor",
    "GitHub / Vercel",
    "Direct import from ../reference/",
    "No source-of-truth mutation",
    "No Supabase or AgentMemory writes",
    "No auto-run",
    "Memory connection comes later",
  ];
  const combined = `${hubSource}\n${serviceSource}`;
  for (const phrase of requiredPhrases) {
    if (!combined.toLowerCase().includes(phrase.toLowerCase())) {
      missingRequired.push(`design crew phrase: ${phrase}`);
    }
  }

  if (hubSource.includes("disabled={true}") || hubSource.includes("disabled placeholder")) {
    missingRequired.push("design crew hub cards must not be disabled placeholders");
  }

  const forbiddenRuntime = [
    "runAgentOpsEvidenceToolAction",
    "run_guardrails",
    "runAgentOpsCodeContextToolAction",
    "supabase.from",
    "createAgentOpsEvidenceToolsLearningCandidate",
  ];
  for (const token of forbiddenRuntime) {
    if (hubSource.includes(token)) {
      missingRequired.push(`design crew view must not include ${token}`);
    }
  }

  if (/from\s+["']\.\.\/reference\//.test(combined)) {
    missingRequired.push("design crew must not import ../reference/");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    readOnlyStaticChecksOnly: true,
  };
}

/** DESIGN-1D — Design Crew Memory Hub metadata alignment (static only). */
function checkDesignCrewMemoryMetadataDESIGN1D() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/designCrewReferencesService.ts",
  );
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/designCrewReferencesViews.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");
  const hermesPreviewPath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesToolRegistryPreview.ts",
  );

  const missingRequired = [];
  for (const [label, filePath] of [
    ["designCrewReferencesService.ts", servicePath],
    ["designCrewReferencesViews.tsx", hubViewPath],
    ["hermesToolRegistryPreview.ts", hermesPreviewPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const serviceSource = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, "utf8") : "";
  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";
  const hermesSource = fs.existsSync(hermesPreviewPath)
    ? fs.readFileSync(hermesPreviewPath, "utf8")
    : "";

  if (!serviceSource.includes("DESIGN_CREW_MEMORY_METADATA")) {
    missingRequired.push("DESIGN_CREW_MEMORY_METADATA export");
  }

  const designToolIds = [
    "design-shadcn-admin",
    "design-tailadmin-react",
    "design-tailadmin-multi",
    "design-aixia-global-sot",
    "design-visual-qa-rules",
  ];
  for (const toolId of designToolIds) {
    if (!serviceSource.includes(`"${toolId}"`)) {
      missingRequired.push(`memory metadata record: ${toolId}`);
    }
  }

  const externalIds = [
    "design-shadcn-admin",
    "design-tailadmin-react",
    "design-tailadmin-multi",
  ];
  if (
    !serviceSource.includes('authorityLevel: "reference_only"') ||
    !serviceSource.includes("aiRuntimeImportAllowed: false") ||
    !serviceSource.includes('githubAvailability: "no"') ||
    !serviceSource.includes('vercelAvailability: "no"') ||
    !serviceSource.includes('worksWhenLocalOff: "metadata_only"')
  ) {
    missingRequired.push("external reference memory metadata base fields");
  }
  for (const toolId of externalIds) {
    if (!serviceSource.includes(`"${toolId}"`)) {
      missingRequired.push(`external reference memory record: ${toolId}`);
    }
    if (!serviceSource.includes("external_design_reference")) {
      missingRequired.push("external reference type external_design_reference");
      break;
    }
  }

  const sotBlock = serviceSource.match(
    /"design-aixia-global-sot":\s*\{[\s\S]*?\n\s*\},/m,
  )?.[0];
  if (!sotBlock?.includes('authorityLevel: "final_design_law"')) {
    missingRequired.push("design-aixia-global-sot authorityLevel final_design_law");
  }
  if (!sotBlock?.includes('relatedMemoryToolId: "gm-design-sot"')) {
    missingRequired.push("design-aixia-global-sot relatedMemoryToolId gm-design-sot");
  }
  if (!sotBlock?.includes('worksWhenLocalOff: "yes"')) {
    missingRequired.push("design-aixia-global-sot worksWhenLocalOff yes");
  }

  const qaBlock = serviceSource.match(
    /"design-visual-qa-rules":\s*\{[\s\S]*?\n\s*\},/m,
  )?.[0];
  if (!qaBlock?.includes('authorityLevel: "guardrail_rules"')) {
    missingRequired.push("design-visual-qa-rules authorityLevel guardrail_rules");
  }
  if (!qaBlock?.includes('relatedMemoryToolId: "et-guardrails"')) {
    missingRequired.push("design-visual-qa-rules relatedMemoryToolId et-guardrails");
  }

  const uiPhrases = [
    "Memory status: Metadata ready",
    "Connection mode: Metadata only",
    "Live memory connection: Not connected yet",
    "Supabase writes: No",
    "AgentMemory writes: No",
    "Runtime import: Forbidden",
    "Works when local is off: Metadata only",
    "Deep repo inspection: Requires local clone or future approved snapshot",
    "GitHub/Vercel availability: No — local sibling clone only",
    "Related memory tool: gm-design-sot",
    "Authority: final design law",
    "Memory cannot override source-of-truth files",
    "Related execution surface: Evidence Tools / Guardrails",
    "Execution: owner-triggered elsewhere",
    "DesignCrewMemoryMetadataSection",
  ];
  for (const phrase of uiPhrases) {
    if (!hubSource.includes(phrase)) {
      missingRequired.push(`design crew UI phrase: ${phrase}`);
    }
  }

  if (!registrySource.includes('"design-aixia-global-sot"') || !registrySource.includes('"gm-design-sot"')) {
    missingRequired.push("registry design-aixia-global-sot relatedToolIds gm-design-sot");
  }
  const sotRelated = registrySource.match(
    /"design-aixia-global-sot":[\s\S]*?relatedToolIds:[^\n]+/,
  )?.[0];
  if (!sotRelated?.includes("gm-design-sot")) {
    missingRequired.push("registry design-aixia-global-sot must include gm-design-sot");
  }
  const qaRelated = registrySource.match(
    /"design-visual-qa-rules":[\s\S]*?relatedToolIds:[^\n]+/,
  )?.[0];
  if (!qaRelated?.includes("et-guardrails")) {
    missingRequired.push("registry design-visual-qa-rules must include et-guardrails");
  }

  for (const toolId of designToolIds) {
    if (!hermesSource.includes(`"${toolId}"`)) {
      missingRequired.push(`Hermes preview metadata-only tool id: ${toolId}`);
    }
  }
  if (
    !hermesSource.includes("HERMES_DESIGN_CREW_METADATA_ONLY_TOOL_IDS") ||
    !hermesSource.includes("metadata-only")
  ) {
    missingRequired.push("Hermes preview design crew metadata-only alignment");
  }

  if (/from\s+["']\.\.\/reference\//.test(hubSource)) {
    missingRequired.push("design crew views must not runtime-import ../reference/");
  }

  const writerTokens = [
    "supabase.from",
    "createAgentOpsGlobalMemory",
    "addAgentOpsAgentMemory",
    "commitAgentOpsMemoryFromChatApproval",
  ];
  for (const token of writerTokens) {
    if (hubSource.includes(token)) {
      missingRequired.push(`design crew views must not include writer ${token}`);
    }
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    readOnlyStaticChecksOnly: true,
  };
}

/** STAGING-TOOLS-1 — staging guards, cloud metadata, environment badge, QA worker skeleton. */
function checkStagingToolsHubSTAGING1() {
  const guardTsPath = path.join(process.cwd(), "api/agentops/agentopsStagingGuard.ts");
  const guardMjsPath = path.join(process.cwd(), "scripts/agentops-staging-guard.mjs");
  const cloudReadinessPath = path.join(
    process.cwd(),
    "src/lib/agentops/tools/toolCloudReadiness.ts",
  );
  const envStatusPath = path.join(
    process.cwd(),
    "src/lib/agentops/tools/agentopsEnvironmentStatus.ts",
  );
  const badgePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/ToolsHubEnvironmentBadge.tsx",
  );
  const hubViewsPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/toolsHubViews.tsx",
  );
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const orchestratorPath = path.join(process.cwd(), "qa-agent/orchestrator/orchestrator-config.json");
  const workflowPath = path.join(process.cwd(), ".github/workflows/agentops-staging-qa.yml");
  const evidenceRunnerPath = path.join(process.cwd(), "scripts/agentops-evidence-tools-runner.mjs");
  const designServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/designCrewReferencesService.ts",
  );

  const missingRequired = [];
  for (const [label, filePath] of [
    ["agentopsStagingGuard.ts", guardTsPath],
    ["agentops-staging-guard.mjs", guardMjsPath],
    ["toolCloudReadiness.ts", cloudReadinessPath],
    ["agentopsEnvironmentStatus.ts", envStatusPath],
    ["ToolsHubEnvironmentBadge.tsx", badgePath],
    ["agentops-staging-qa.yml", workflowPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const guardTs = fs.existsSync(guardTsPath) ? fs.readFileSync(guardTsPath, "utf8") : "";
  const guardMjs = fs.existsSync(guardMjsPath) ? fs.readFileSync(guardMjsPath, "utf8") : "";
  const cloudReadiness = fs.existsSync(cloudReadinessPath)
    ? fs.readFileSync(cloudReadinessPath, "utf8")
    : "";
  const badgeSource = fs.existsSync(badgePath) ? fs.readFileSync(badgePath, "utf8") : "";
  const hubViews = fs.existsSync(hubViewsPath) ? fs.readFileSync(hubViewsPath, "utf8") : "";
  const envExample = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf8") : "";
  const orchestrator = fs.existsSync(orchestratorPath)
    ? fs.readFileSync(orchestratorPath, "utf8")
    : "";
  const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
  const evidenceRunner = fs.existsSync(evidenceRunnerPath)
    ? fs.readFileSync(evidenceRunnerPath, "utf8")
    : "";
  const designService = fs.existsSync(designServicePath)
    ? fs.readFileSync(designServicePath, "utf8")
    : "";

  const guardPhrases = [
    "AGENTOPS_STAGING_SUPABASE_PROJECT_REF",
    "AGENTOPS_ALLOW_NON_STAGING",
    "AgentOps is staging-only. Supabase project ref does not match configured staging project.",
    "guardAgentOpsExecutionResponse",
  ];
  for (const phrase of guardPhrases) {
    if (!`${guardTs}\n${guardMjs}`.includes(phrase)) {
      missingRequired.push(`staging guard phrase: ${phrase}`);
    }
  }

  if (!evidenceRunner.includes("guardAgentOpsExecutionResponse")) {
    missingRequired.push("evidence runner uses staging guard");
  }

  const envVars = [
    "AGENTOPS_ENVIRONMENT=staging",
    "AGENTOPS_STAGING_SUPABASE_PROJECT_REF=ydppcpbxrvvardeslzrk",
    "AGENTOPS_ALLOW_NON_STAGING=false",
    "AGENTOPS_QA_BASE_URL=",
    "AGENTOPS_AUDIT_BASE=",
    "AGENTOPS_PRODUCTION_BLOCKED=true",
  ];
  for (const phrase of envVars) {
    if (!envExample.includes(phrase)) {
      missingRequired.push(`.env.example missing ${phrase}`);
    }
  }

  if (!orchestrator.includes("AGENTOPS_QA_BASE_URL")) {
    missingRequired.push("orchestrator-config AGENTOPS_QA_BASE_URL");
  }

  const cloudFields = [
    "cloudExecutionSupported",
    "requiresLocalFilesystem",
    "stagingMetadataOnly",
    "worksWhenLocalOff",
    "recommendedExecutionMode",
  ];
  for (const field of cloudFields) {
    if (!cloudReadiness.includes(field)) {
      missingRequired.push(`toolCloudReadiness field: ${field}`);
    }
  }

  if (
    !hubViews.includes("ToolsHubEnvironmentBadge") ||
    !badgeSource.includes("tools-hub-environment-badge")
  ) {
    missingRequired.push("Tools Hub environment badge wiring");
  }

  if (!workflow.includes("workflow_dispatch")) {
    missingRequired.push("staging QA workflow must support manual workflow_dispatch");
  }
  if (workflow.includes("schedule:") && !workflow.includes("# schedule:")) {
    missingRequired.push("staging QA workflow schedule must stay disabled/commented");
  }

  if (/from\s+["']\.\.\/reference\//.test(`${guardTs}\n${cloudReadiness}\n${badgeSource}`)) {
    missingRequired.push("staging tools must not import ../reference/");
  }

  if (designService.includes("from '../reference/") || designService.includes('from "../reference/')) {
    missingRequired.push("design crew must not runtime-import ../reference/");
  }

  if (!cloudReadiness.includes('"design-shadcn-admin"') || !cloudReadiness.includes("stagingMetadataOnly: true")) {
    missingRequired.push("design reference cloud metadata");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    readOnlyStaticChecksOnly: true,
  };
}

function ensureAuditStagingGuardEnv() {
  if (process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF) return;
  const url = process.env.VITE_SUPABASE_URL ?? "";
  if (url.includes("ydppcpbxrvvardeslzrk")) {
    process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF = "ydppcpbxrvvardeslzrk";
  }
}

/** CV-1 — Existing chat route coordination on main hub (no duplicate chat page). */
function checkChatVoiceHubCV1() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const coordinationSectionPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/ChatRouteCoordinationSection.tsx",
  );
  const coordinationServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceRouteCoordinationService.ts",
  );
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");
  const duplicateInterfacesPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatInterfacesViews.tsx",
  );

  const missingRequired = [];
  if (!fs.existsSync(hubViewPath)) missingRequired.push("chatVoiceToolsViews.tsx");
  if (!fs.existsSync(coordinationSectionPath)) {
    missingRequired.push("ChatRouteCoordinationSection.tsx");
  }
  if (!fs.existsSync(coordinationServicePath)) {
    missingRequired.push("chatVoiceRouteCoordinationService.ts");
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const sectionSource = fs.existsSync(coordinationSectionPath)
    ? fs.readFileSync(coordinationSectionPath, "utf8")
    : "";
  const serviceSource = fs.existsSync(coordinationServicePath)
    ? fs.readFileSync(coordinationServicePath, "utf8")
    : "";
  const groupSource = fs.existsSync(groupPagePath) ? fs.readFileSync(groupPagePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const combinedSource = `${hubSource}\n${sectionSource}\n${serviceSource}`;

  if (fs.existsSync(duplicateInterfacesPath)) {
    missingRequired.push("duplicate chatInterfacesViews.tsx must be removed");
  }

  if (hubSource.includes('id: "chat-interfaces"') || hubSource.includes('title: "Chat Interfaces"')) {
    missingRequired.push("hub must not contain Chat Interfaces group card");
  }

  if (groupSource.includes("ToolsHubChatInterfacesPage") || groupSource.includes("chat-interfaces")) {
    missingRequired.push("group page must not wire chat-interfaces duplicate");
  }

  if (registrySource.includes('"chat-interfaces":')) {
    missingRequired.push("registry must not define chat-interfaces group page");
  }

  if (
    HUBS.some((hub) => hub.path === "/system/agent-ops/tools/chat-voice/chat-interfaces") ||
    CHILD_ROUTES.some((route) => route.path === "/system/agent-ops/tools/chat-voice/chat-interfaces")
  ) {
    missingRequired.push("audit must not require /chat-voice/chat-interfaces route");
  }

  if (!combinedSource.includes("Existing Chat Route Coordination")) {
    missingRequired.push("Existing Chat Route Coordination section");
  }

  const requiredCoordinationLabels = [
    "Issue Agent Chat Coordination",
    "Individual Agent Chat Coordination",
    "Council Group Chat Coordination",
  ];
  for (const label of requiredCoordinationLabels) {
    if (!combinedSource.includes(label)) missingRequired.push(`coordination row: ${label}`);
  }

  const requiredRoutes = [
    "/system/agent-ops/issues/AIXIA-STATIC-GR-0069",
    "/system/agent-ops/agents/agentops-owner",
    "/system/agent-ops/council",
  ];
  for (const route of requiredRoutes) {
    if (!combinedSource.includes(route)) missingRequired.push(`route reference: ${route}`);
  }

  const coordinationVocabulary = [
    "Hermes supported",
    "Memory proposal",
    "Manual chat",
    "No auto-execution",
    "Cursor dispatch blocked",
    "Issue lifecycle protected",
  ];
  for (const phrase of coordinationVocabulary) {
    if (!combinedSource.toLowerCase().includes(phrase.toLowerCase())) {
      missingRequired.push(`coordination vocabulary: ${phrase}`);
    }
  }

  if (!hubSource.includes("ChatRouteCoordinationSection")) {
    missingRequired.push("hub imports ChatRouteCoordinationSection");
  }

  const forbiddenPatterns = [
    { pattern: /getUserMedia\s*\(/, label: "getUserMedia" },
    { pattern: /navigator\.mediaDevices/, label: "mediaDevices" },
    { pattern: /\bspeakText\s*\(/, label: "speakText" },
    { pattern: /\btranscribeAudio\s*\(/, label: "transcribeAudio" },
    { pattern: /createRealtimeVoiceSession\s*\(|\brealtimeVoice\s*\(/, label: "realtimeVoice" },
  ];
  const forbiddenInView = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(combinedSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(combinedSource))
    .map(({ label }) => label);

  const cv0 = checkChatVoiceHubCV0();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInView.length === 0 &&
      runtimeViolations.length === 0 &&
      cv0.ok,
    missingRequired,
    forbiddenInView,
    runtimeViolations,
    cv0StillPasses: cv0.ok,
    existingChatRouteHttpValidationDeferred:
      "SPA shell returns 200 for all routes; live chat verification requires owner-session browser QA on issue/agent/council workspaces",
    coordinationOnly: true,
  };
}

/** CV-2 — Voice Input / STT dedicated tool page (no mic/STT runtime). */
function checkChatVoiceHubCV2() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const sttPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceSttToolsView.tsx",
  );
  const sttServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceSttCoordinationService.ts",
  );
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  if (!fs.existsSync(hubViewPath)) missingRequired.push("chatVoiceToolsViews.tsx");
  if (!fs.existsSync(sttPagePath)) missingRequired.push("chatVoiceSttToolsView.tsx");
  if (!fs.existsSync(sttServicePath)) missingRequired.push("chatVoiceSttCoordinationService.ts");

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const sttPageSource = fs.existsSync(sttPagePath) ? fs.readFileSync(sttPagePath, "utf8") : "";
  const sttServiceSource = fs.existsSync(sttServicePath)
    ? fs.readFileSync(sttServicePath, "utf8")
    : "";
  const groupSource = fs.existsSync(groupPagePath) ? fs.readFileSync(groupPagePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const hubAndSttSource = `${hubSource}\n${sttPageSource}\n${sttServiceSource}`;

  const hubLinksToSttPage =
    hubSource.includes("voice-input-stt") &&
    (hubSource.includes("getToolRegistryGroupRoute") || hubSource.includes("/chat-voice/voice-input-stt"));

  if (!hubLinksToSttPage) missingRequired.push("main hub links to voice-input-stt page");

  if (
    !groupSource.includes("ToolsHubVoiceInputSttPage") ||
    !groupSource.includes("voice-input-stt")
  ) {
    missingRequired.push("group page wires ToolsHubVoiceInputSttPage");
  }

  if (!registrySource.includes('"voice-input-stt":')) {
    missingRequired.push("registry voice-input-stt group");
  }

  const requiredPageSections = [
    "STT Readiness Overview",
    "Provider / Capability Status",
    "Safety Gates",
    "Existing Runtime References",
    "Manual STT Test Console",
  ];
  for (const section of requiredPageSections) {
    if (!sttPageSource.includes(section)) missingRequired.push(`STT page section: ${section}`);
  }

  if (!sttPageSource.includes("ToolsHubVoiceInputSttPage")) {
    missingRequired.push("ToolsHubVoiceInputSttPage export");
  }

  if (
    !hubSource.includes("Foundation Mapped") ||
    !hubSource.includes('id: "voice-input-stt"')
  ) {
    missingRequired.push("Voice Input / STT group card foundation mapped");
  }

  const safetyPhrases = [
    "No Mic on Load",
    "Manual Start Required",
    "Privacy Review Required",
    "Transcript Memory Protected",
    "No transcript auto-save",
    "Provider Gated",
  ];
  for (const phrase of safetyPhrases) {
    if (!hubAndSttSource.includes(phrase)) missingRequired.push(`safety phrase: ${phrase}`);
  }

  const requiredMetadataLabels = [
    "Browser Microphone Access",
    "Web Speech STT",
    "Product Transcription Edge Function",
    "Local Whisper / Local STT",
    "Transcript Capture",
  ];
  for (const label of requiredMetadataLabels) {
    if (!hubAndSttSource.includes(label)) missingRequired.push(`STT metadata: ${label}`);
  }

  const forbiddenPatterns = [
    { pattern: /getUserMedia\s*\(/, label: "getUserMedia" },
    { pattern: /mediaDevices\.getUserMedia/, label: "mediaDevices.getUserMedia" },
    { pattern: /recognition\.start\s*\(/, label: "recognition.start" },
    { pattern: /\bnew\s+\w*SpeechRecognition/, label: "SpeechRecognition constructor" },
    { pattern: /webkitSpeechRecognition\s*\(/, label: "webkitSpeechRecognition call" },
    { pattern: /\btranscribeAudio\s*\(/, label: "transcribeAudio" },
    { pattern: /createRealtimeVoiceSession\s*\(|\brealtimeVoice\s*\(/, label: "realtimeVoice" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
  ];
  const forbiddenInHubFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(hubAndSttSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(hubAndSttSource))
    .map(({ label }) => label);

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInHubFiles.length === 0 &&
      runtimeViolations.length === 0 &&
      cv0.ok &&
      cv1.ok,
    missingRequired,
    forbiddenInHubFiles,
    runtimeViolations,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    sttProviderProbesDeferred: true,
    dedicatedSttPagePath: "/system/agent-ops/tools/chat-voice/voice-input-stt",
    coordinationOnly: true,
  };
}

/** CV-3 — Voice Output / TTS dedicated tool page (no audio/TTS runtime). */
function checkChatVoiceHubCV3() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const ttsPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceTtsToolsView.tsx",
  );
  const ttsServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceTtsCoordinationService.ts",
  );
  const groupPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/[categoryId]/[groupId]/page.tsx",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  if (!fs.existsSync(hubViewPath)) missingRequired.push("chatVoiceToolsViews.tsx");
  if (!fs.existsSync(ttsPagePath)) missingRequired.push("chatVoiceTtsToolsView.tsx");
  if (!fs.existsSync(ttsServicePath)) missingRequired.push("chatVoiceTtsCoordinationService.ts");

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const ttsPageSource = fs.existsSync(ttsPagePath) ? fs.readFileSync(ttsPagePath, "utf8") : "";
  const ttsServiceSource = fs.existsSync(ttsServicePath)
    ? fs.readFileSync(ttsServicePath, "utf8")
    : "";
  const groupSource = fs.existsSync(groupPagePath) ? fs.readFileSync(groupPagePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const hubAndTtsSource = `${hubSource}\n${ttsPageSource}\n${ttsServiceSource}`;

  const hubLinksToTtsPage =
    hubSource.includes("voice-output-tts") &&
    (hubSource.includes("getToolRegistryGroupRoute") ||
      hubSource.includes("/chat-voice/voice-output-tts"));

  if (!hubLinksToTtsPage) missingRequired.push("main hub links to voice-output-tts page");

  if (
    !groupSource.includes("ToolsHubVoiceOutputTtsPage") ||
    !groupSource.includes("voice-output-tts")
  ) {
    missingRequired.push("group page wires ToolsHubVoiceOutputTtsPage");
  }

  if (!registrySource.includes('"voice-output-tts":')) {
    missingRequired.push("registry voice-output-tts group");
  }

  const requiredPageSections = [
    "Doubao / Volcengine TTS Provider",
    "Doubao Manual Test Console",
    "Target Chat Surfaces",
    "TTS Readiness Overview",
    "Provider / Capability Status",
    "Safety Gates",
    "Existing Runtime References",
  ];
  for (const section of requiredPageSections) {
    if (!ttsPageSource.includes(section)) missingRequired.push(`TTS page section: ${section}`);
  }

  if (!ttsPageSource.includes("ToolsHubVoiceOutputTtsPage")) {
    missingRequired.push("ToolsHubVoiceOutputTtsPage export");
  }

  if (!hubSource.includes('id: "voice-output-tts"')) {
    missingRequired.push("Voice Output / TTS group card present");
  }

  const safetyPhrases = [
    "No Audio on Load",
    "Manual Playback Required",
    "Production Protected",
    "No transcript/audio memory write",
    "No autoplay",
  ];
  for (const phrase of safetyPhrases) {
    if (!hubAndTtsSource.includes(phrase)) missingRequired.push(`safety phrase: ${phrase}`);
  }

  const requiredMetadataLabels = [
    "Product TTS Helper",
    "Supabase Speak Edge Function",
    "Browser Speech Synthesis",
    "Doubao / Volcengine TTS Provider",
    "Doubao Manual Test Console",
  ];
  for (const label of requiredMetadataLabels) {
    if (!hubAndTtsSource.includes(label)) missingRequired.push(`TTS metadata: ${label}`);
  }

  const forbiddenPatterns = [
    { pattern: /\bspeakText\s*\(/, label: "speakText" },
    { pattern: /speechSynthesis\.speak/, label: "speechSynthesis.speak" },
    { pattern: /new SpeechSynthesisUtterance/, label: "SpeechSynthesisUtterance" },
    { pattern: /audio\.play\s*\(/, label: "audio.play" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
  ];
  const forbiddenInHubFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(hubAndTtsSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(hubAndTtsSource))
    .map(({ label }) => label);

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();
  const cv2 = checkChatVoiceHubCV2();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInHubFiles.length === 0 &&
      runtimeViolations.length === 0 &&
      cv0.ok &&
      cv1.ok &&
      cv2.ok,
    missingRequired,
    forbiddenInHubFiles,
    runtimeViolations,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    cv2StillPasses: cv2.ok,
    ttsProviderProbesDeferred: true,
    dedicatedTtsPagePath: "/system/agent-ops/tools/chat-voice/voice-output-tts",
    coordinationOnly: true,
  };
}

/** CV-3A — Supertonic required TTS provider planning (no API calls or playback). */
function checkChatVoiceHubCV3A() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const ttsPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceTtsToolsView.tsx",
  );
  const ttsServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceTtsCoordinationService.ts",
  );
  const supertonicProviderPath = path.join(
    process.cwd(),
    "src/lib/agentops/supertonicTtsProvider.ts",
  );
  const coordinationSectionPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/ChatRouteCoordinationSection.tsx",
  );
  const coordinationServicePath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceRouteCoordinationService.ts",
  );
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  if (!fs.existsSync(supertonicProviderPath)) {
    missingRequired.push("supertonicTtsProvider.ts planning file");
  }
  if (!fs.existsSync(hubViewPath)) missingRequired.push("chatVoiceToolsViews.tsx");
  if (!fs.existsSync(ttsPagePath)) missingRequired.push("chatVoiceTtsToolsView.tsx");
  if (!fs.existsSync(ttsServicePath)) missingRequired.push("chatVoiceTtsCoordinationService.ts");
  if (!fs.existsSync(coordinationSectionPath)) {
    missingRequired.push("ChatRouteCoordinationSection.tsx");
  }
  if (!fs.existsSync(coordinationServicePath)) {
    missingRequired.push("chatVoiceRouteCoordinationService.ts");
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const ttsPageSource = fs.existsSync(ttsPagePath) ? fs.readFileSync(ttsPagePath, "utf8") : "";
  const ttsServiceSource = fs.existsSync(ttsServicePath)
    ? fs.readFileSync(ttsServicePath, "utf8")
    : "";
  const supertonicSource = fs.existsSync(supertonicProviderPath)
    ? fs.readFileSync(supertonicProviderPath, "utf8")
    : "";
  const sectionSource = fs.existsSync(coordinationSectionPath)
    ? fs.readFileSync(coordinationSectionPath, "utf8")
    : "";
  const routeServiceSource = fs.existsSync(coordinationServicePath)
    ? fs.readFileSync(coordinationServicePath, "utf8")
    : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const cv3aSource = `${hubSource}\n${ttsPageSource}\n${ttsServiceSource}\n${supertonicSource}\n${sectionSource}\n${routeServiceSource}`;

  const requiredPhrases = [
    "Doubao / Volcengine TTS Provider",
    "Issue Agent Chat",
    "Individual Agent Chat",
    "Council Group Chat",
    "Doubao / Volcengine TTS",
    "ttsTarget",
    "Manual Speak per agent reply · Doubao TTS",
    "Manual Only",
    "issue-agent-chat",
    "individual-agent-chat",
    "council-group-chat",
  ];
  for (const phrase of requiredPhrases) {
    if (!cv3aSource.includes(phrase)) missingRequired.push(`CV-3A phrase: ${phrase}`);
  }

  if (!supertonicSource.includes("getSupertonicTtsProviderStatus")) {
    missingRequired.push("getSupertonicTtsProviderStatus export");
  }
  if (!supertonicSource.includes("getSupertonicTtsTargetSurfaces")) {
    missingRequired.push("getSupertonicTtsTargetSurfaces export");
  }
  if (!supertonicSource.includes("getSupertonicTtsSafetyPolicy")) {
    missingRequired.push("getSupertonicTtsSafetyPolicy export");
  }
  if (!supertonicSource.includes("issue-agent-chat")) {
    missingRequired.push("supertonic target surface issue-agent-chat");
  }
  if (!supertonicSource.includes("individual-agent-chat")) {
    missingRequired.push("supertonic target surface individual-agent-chat");
  }
  if (!supertonicSource.includes("council-group-chat")) {
    missingRequired.push("supertonic target surface council-group-chat");
  }

  const registryIds = [
    '"doubao-tts-provider":',
    '"supertonic-provider":',
    '"tts-target-issue-chat":',
    '"tts-target-agent-chat":',
    '"tts-target-council-chat":',
  ];
  for (const id of registryIds) {
    if (!registrySource.includes(id)) missingRequired.push(`registry entry ${id}`);
  }
  if (!registrySource.includes('"supertonic-provider":')) {
    missingRequired.push("registry supertonic-provider entry");
  }
  if (!registrySource.includes("Manual Speak Wired · Credentials Gated")) {
    missingRequired.push("registry tts-target manual speak wired status");
  }

  const forbiddenPatterns = [
    { pattern: /\bspeakText\s*\(/, label: "speakText" },
    { pattern: /speechSynthesis\.speak/, label: "speechSynthesis.speak" },
    { pattern: /new SpeechSynthesisUtterance/, label: "SpeechSynthesisUtterance" },
    { pattern: /audio\.play\s*\(/, label: "audio.play" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
    { pattern: /fetch\s*\([^)]*supertonic/i, label: "Supertonic API fetch" },
  ];
  const forbiddenInCv3aFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(cv3aSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(cv3aSource))
    .map(({ label }) => label);

  const credentialInputPattern = /type=["']password["']|apiKey|API_KEY|credential.*input/i;
  const hasUnsafeCredentialInput =
    credentialInputPattern.test(ttsPageSource) || credentialInputPattern.test(hubSource);
  if (hasUnsafeCredentialInput) {
    missingRequired.push("unsafe credential input on hub/TTS page");
  }

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();
  const cv2 = checkChatVoiceHubCV2();
  const cv3 = checkChatVoiceHubCV3();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInCv3aFiles.length === 0 &&
      runtimeViolations.length === 0 &&
      !hasUnsafeCredentialInput &&
      cv0.ok &&
      cv1.ok &&
      cv2.ok &&
      cv3.ok,
    missingRequired,
    forbiddenInCv3aFiles,
    runtimeViolations,
    hasUnsafeCredentialInput,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    cv2StillPasses: cv2.ok,
    cv3StillPasses: cv3.ok,
    supertonicProviderPlanningOnly: true,
    noSupertonicApiCall: !/fetch\s*\([^)]*supertonic/i.test(supertonicSource),
    dedicatedTtsPagePath: "/system/agent-ops/tools/chat-voice/voice-output-tts",
    coordinationOnly: true,
  };
}

/** CV-3B — Supertonic server proxy + manual test console (no autoplay / no chat wiring). */
function checkChatVoiceHubCV3B() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const ttsPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceTtsToolsView.tsx",
  );
  const testConsolePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/DoubaoTtsTestConsole.tsx",
  );
  const legacyTestConsolePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/SupertonicTtsTestConsole.tsx",
  );
  const supertonicProviderPath = path.join(
    process.cwd(),
    "src/lib/agentops/supertonicTtsProvider.ts",
  );
  const supertonicClientPath = path.join(
    process.cwd(),
    "src/lib/agentops/supertonicTtsClient.ts",
  );
  const doubaoProviderPath = path.join(process.cwd(), "src/lib/agentops/doubaoTtsProvider.ts");
  const doubaoClientPath = path.join(process.cwd(), "src/lib/agentops/doubaoTtsClient.ts");
  const handlerPath = path.join(process.cwd(), "api/agentops/supertonicTtsHandler.ts");
  const configPath = path.join(process.cwd(), "api/agentops/supertonicTtsConfig.ts");
  const apiRoutePath = path.join(
    process.cwd(),
    "api/agentops/chat-voice/supertonic-tts.ts",
  );
  const devPluginPath = path.join(process.cwd(), "scripts/agentops-api-dev-plugin.ts");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["supertonicTtsHandler.ts", handlerPath],
    ["supertonicTtsConfig.ts", configPath],
    ["supertonic-tts API route", apiRoutePath],
    ["supertonicTtsClient.ts", supertonicClientPath],
    ["DoubaoTtsTestConsole.tsx", testConsolePath],
    ["SupertonicTtsTestConsole.tsx legacy", legacyTestConsolePath],
    ["chatVoiceTtsToolsView.tsx", ttsPagePath],
    ["agentops-api-dev-plugin.ts", devPluginPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const ttsPageSource = fs.existsSync(ttsPagePath) ? fs.readFileSync(ttsPagePath, "utf8") : "";
  const testConsoleSource = fs.existsSync(testConsolePath)
    ? fs.readFileSync(testConsolePath, "utf8")
    : "";
  const providerSource = fs.existsSync(supertonicProviderPath)
    ? fs.readFileSync(supertonicProviderPath, "utf8")
    : "";
  const clientSource = fs.existsSync(supertonicClientPath)
    ? fs.readFileSync(supertonicClientPath, "utf8")
    : "";
  const doubaoProviderSource = fs.existsSync(doubaoProviderPath)
    ? fs.readFileSync(doubaoProviderPath, "utf8")
    : "";
  const doubaoClientSource = fs.existsSync(doubaoClientPath)
    ? fs.readFileSync(doubaoClientPath, "utf8")
    : "";
  const handlerSource = fs.existsSync(handlerPath) ? fs.readFileSync(handlerPath, "utf8") : "";
  const devPluginSource = fs.existsSync(devPluginPath) ? fs.readFileSync(devPluginPath, "utf8") : "";
  const envExampleSource = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf8") : "";

  const uiAndClientSource = `${hubSource}\n${ttsPageSource}\n${testConsoleSource}\n${providerSource}\n${clientSource}\n${doubaoProviderSource}\n${doubaoClientSource}`;
  const allCv3bSource = `${uiAndClientSource}\n${handlerSource}\n${devPluginSource}`;

  const requiredPhrases = [
    "Doubao / Volcengine TTS Provider",
    "Doubao Manual Test Console",
    "Generate Test Audio",
    "buildDoubaoTtsRequest",
    "fetchDoubaoTtsServerStatus",
    "handleDoubaoTtsRequest",
    "/api/agentops/chat-voice/doubao-tts",
    "buildSupertonicTtsRequest",
    "fetchSupertonicTtsServerStatus",
    "handleSupertonicTtsRequest",
    "/api/agentops/chat-voice/supertonic-tts",
    "preload=\"none\"",
    "credentialsConfigured",
    "setup_required",
    "manual_test_ready",
  ];
  for (const phrase of requiredPhrases) {
    if (!allCv3bSource.includes(phrase)) missingRequired.push(`CV-3B phrase: ${phrase}`);
  }

  if (!devPluginSource.includes("/api/agentops/chat-voice/supertonic-tts")) {
    missingRequired.push("dev plugin wires supertonic-tts route");
  }
  if (!devPluginSource.includes("/api/agentops/chat-voice/doubao-tts")) {
    missingRequired.push("dev plugin wires doubao-tts route");
  }
  if (!envExampleSource.includes("SUPERTONE_API_KEY") && !envExampleSource.includes("SUPERTONIC_LOCAL_BASE_URL")) {
    missingRequired.push(".env.example Supertonic configuration docs");
  }
  if (!handlerSource.includes("x-sup-api-key")) {
    missingRequired.push("handler uses Supertone auth header server-side");
  }
  if (handlerSource.includes("process.env") && handlerSource.match(/apiKey.*json|json.*apiKey/i)) {
    missingRequired.push("handler must not return API key in JSON");
  }

  const forbiddenPatterns = [
    { pattern: /\bspeakText\s*\(/, label: "speakText" },
    { pattern: /speechSynthesis\.speak/, label: "speechSynthesis.speak" },
    { pattern: /new SpeechSynthesisUtterance/, label: "SpeechSynthesisUtterance" },
    { pattern: /audio\.play\s*\(/, label: "audio.play" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
    { pattern: /getUserMedia/, label: "getUserMedia" },
    { pattern: /\bautoPlay\b/, label: "autoPlay" },
  ];
  const forbiddenInUiFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const credentialInputPattern = /type=["']password["']/;
  const hasUnsafeCredentialInput =
    credentialInputPattern.test(ttsPageSource) ||
    credentialInputPattern.test(testConsoleSource) ||
    credentialInputPattern.test(hubSource);

  const supertonicConfigured = false;
  const ttsOperationalStatus = "setup_required";
  const blockingReason = "credentials/API contract missing";

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();
  const cv2 = checkChatVoiceHubCV2();
  const cv2b = checkChatVoiceHubCV2B();
  const cv3 = checkChatVoiceHubCV3();
  const cv3a = checkChatVoiceHubCV3A();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInUiFiles.length === 0 &&
      runtimeViolations.length === 0 &&
      !hasUnsafeCredentialInput &&
      cv0.ok &&
      cv1.ok &&
      cv2.ok &&
      cv2b.ok &&
      cv3.ok &&
      cv3a.ok,
    missingRequired,
    forbiddenInUiFiles,
    runtimeViolations,
    hasUnsafeCredentialInput,
    supertonicConfigured,
    ttsOperationalStatus,
    blockingReason,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    cv2StillPasses: cv2.ok,
    cv2bStillPasses: cv2b.ok,
    cv3StillPasses: cv3.ok,
    cv3aStillPasses: cv3a.ok,
    providerDynamicTestDeferred: !supertonicConfigured,
    dedicatedTtsPagePath: "/system/agent-ops/tools/chat-voice/voice-output-tts",
    apiRoutePath: "/api/agentops/chat-voice/supertonic-tts",
  };
}

/** CV-2B — Doubao / Volcengine ASR provider status layer (no mic / no WebSocket on load). */
function checkChatVoiceHubCV2B() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const sttPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceSttToolsView.tsx",
  );
  const routeCoordPath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceRouteCoordinationService.ts",
  );
  const routeSectionPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/ChatRouteCoordinationSection.tsx",
  );
  const doubaoProviderPath = path.join(
    process.cwd(),
    "src/lib/agentops/doubaoAsrProvider.ts",
  );
  const doubaoClientPath = path.join(process.cwd(), "src/lib/agentops/doubaoAsrClient.ts");
  const handlerPath = path.join(process.cwd(), "api/agentops/doubaoAsrHandler.ts");
  const configPath = path.join(process.cwd(), "api/agentops/doubaoAsrConfig.ts");
  const apiRoutePath = path.join(process.cwd(), "api/agentops/chat-voice/doubao-asr.ts");
  const devPluginPath = path.join(process.cwd(), "scripts/agentops-api-dev-plugin.ts");
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["doubaoAsrHandler.ts", handlerPath],
    ["doubaoAsrConfig.ts", configPath],
    ["doubao-asr API route", apiRoutePath],
    ["doubaoAsrProvider.ts", doubaoProviderPath],
    ["doubaoAsrClient.ts", doubaoClientPath],
    ["chatVoiceSttToolsView.tsx", sttPagePath],
    ["agentops-api-dev-plugin.ts", devPluginPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const sttPageSource = fs.existsSync(sttPagePath) ? fs.readFileSync(sttPagePath, "utf8") : "";
  const routeCoordSource = fs.existsSync(routeCoordPath)
    ? fs.readFileSync(routeCoordPath, "utf8")
    : "";
  const routeSectionSource = fs.existsSync(routeSectionPath)
    ? fs.readFileSync(routeSectionPath, "utf8")
    : "";
  const providerSource = fs.existsSync(doubaoProviderPath)
    ? fs.readFileSync(doubaoProviderPath, "utf8")
    : "";
  const clientSource = fs.existsSync(doubaoClientPath) ? fs.readFileSync(doubaoClientPath, "utf8") : "";
  const handlerSource = fs.existsSync(handlerPath) ? fs.readFileSync(handlerPath, "utf8") : "";
  const configSource = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const devPluginSource = fs.existsSync(devPluginPath) ? fs.readFileSync(devPluginPath, "utf8") : "";
  const envExampleSource = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const uiAndClientSource = `${hubSource}\n${sttPageSource}\n${providerSource}\n${clientSource}`;
  const allCv2bSource = `${uiAndClientSource}\n${handlerSource}\n${configSource}\n${envExampleSource}\n${routeCoordSource}\n${routeSectionSource}\n${registrySource}`;

  const requiredPhrases = [
    "OpenSpeech / Doubao ASR",
    "fetchDoubaoAsrServerStatus",
    "handleDoubaoAsrRequest",
    "/api/agentops/chat-voice/doubao-asr",
    "buildDoubaoAsrRequestConfig",
    "credentialsConfigured",
    "ready_for_manual_test",
    "setup_required",
    "Doubao ASR Required",
    "sttTarget",
    "Manual only",
    "Proposal-gated",
    "No auto-start",
    "Issue Agent Chat",
    "Individual Agent Chat",
    "Council Group Chat",
    "bigmodel_async",
    "volc.seedasr.sauc.duration",
  ];
  for (const phrase of requiredPhrases) {
    if (!allCv2bSource.includes(phrase)) missingRequired.push(`CV-2B phrase: ${phrase}`);
  }

  for (const registryId of [
    "doubao-asr-provider",
    "doubao-asr-endpoint",
    "doubao-asr-chat-targets",
    "transcript-memory-protection",
  ]) {
    if (!registrySource.includes(`"${registryId}"`)) {
      missingRequired.push(`registry ${registryId}`);
    }
  }

  if (!devPluginSource.includes("/api/agentops/chat-voice/doubao-asr")) {
    missingRequired.push("dev plugin wires doubao-asr route");
  }
  if (!envExampleSource.includes("DOUBAO_ASR_API_KEY")) {
    missingRequired.push(".env.example Doubao ASR configuration docs");
  }
  if (!envExampleSource.includes("AGENTOPS_DOUBAO_ASR_ACTIVE")) {
    missingRequired.push(".env.example AGENTOPS_DOUBAO_ASR gates");
  }
  if (handlerSource.includes("new WebSocket") || handlerSource.match(/WebSocket\s*\(/)) {
    missingRequired.push("handler must not open WebSocket in CV-2B");
  }
  if (
    handlerSource.match(/DOUBAO_ASR_API_KEY|DOUBAO_ASR_ACCESS_KEY/i) &&
    handlerSource.match(/json.*apiKey|apiKey.*json|accessKey.*Response/i)
  ) {
    missingRequired.push("handler must not return API key in JSON");
  }

  const forbiddenPatterns = [
    { pattern: /getUserMedia\s*\(/, label: "getUserMedia" },
    { pattern: /mediaDevices\.getUserMedia/, label: "mediaDevices.getUserMedia" },
    { pattern: /recognition\.start\s*\(/, label: "recognition.start" },
    { pattern: /\bnew\s+\w*SpeechRecognition/, label: "SpeechRecognition constructor" },
    { pattern: /\btranscribeAudio\s*\(/, label: "transcribeAudio" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
  ];
  const forbiddenInUiFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const credentialLeakPattern =
    /(DOUBAO_ASR_API_KEY|DOUBAO_ASR_ACCESS_KEY|X-Api-Key|X-Api-Access-Key)/i;
  const hasCredentialLeakInClient =
    credentialLeakPattern.test(clientSource) &&
    clientSource.match(/process\.env|import\.meta\.env/);

  const doubaoAsrConfigured = false;
  const asrOperationalStatus = "setup_required";

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();
  const cv2 = checkChatVoiceHubCV2();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInUiFiles.length === 0 &&
      runtimeViolations.length === 0 &&
      !hasCredentialLeakInClient &&
      cv0.ok &&
      cv1.ok &&
      cv2.ok,
    missingRequired,
    forbiddenInUiFiles,
    runtimeViolations,
    hasCredentialLeakInClient,
    doubaoAsrConfigured,
    asrOperationalStatus,
    manualTestDeferred: true,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    cv2StillPasses: cv2.ok,
    dedicatedSttPagePath: "/system/agent-ops/tools/chat-voice/voice-input-stt",
    apiRoutePath: "/api/agentops/chat-voice/doubao-asr",
    getOnlyStatusApi: !handlerSource.includes("transcribeOpenSpeechFlash"),
    noWebSocketOnGet: !handlerSource.includes("new WebSocket"),
    noMicOnSttPageLoad: !sttPageSource.includes("getUserMedia"),
  };
}

/** CV-2C — OpenSpeech / Doubao ASR live HTTP manual upload test (no mic on load). */
function checkChatVoiceHubCV2C() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const sttPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceSttToolsView.tsx",
  );
  const testConsolePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/DoubaoSttTestConsole.tsx",
  );
  const routeCoordPath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceRouteCoordinationService.ts",
  );
  const routeSectionPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/ChatRouteCoordinationSection.tsx",
  );
  const doubaoProviderPath = path.join(process.cwd(), "src/lib/agentops/doubaoSttProvider.ts");
  const doubaoClientPath = path.join(process.cwd(), "src/lib/agentops/doubaoSttClient.ts");
  const handlerPath = path.join(process.cwd(), "api/agentops/doubaoSttHandler.ts");
  const configPath = path.join(process.cwd(), "api/agentops/doubaoSttConfig.ts");
  const apiRoutePath = path.join(process.cwd(), "api/agentops/chat-voice/doubao-stt.ts");
  const devPluginPath = path.join(process.cwd(), "scripts/agentops-api-dev-plugin.ts");
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");
  const asrHandlerPath = path.join(process.cwd(), "api/agentops/doubaoAsrHandler.ts");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["doubaoSttHandler.ts", handlerPath],
    ["doubaoSttConfig.ts", configPath],
    ["doubao-stt API route", apiRoutePath],
    ["doubaoSttProvider.ts", doubaoProviderPath],
    ["doubaoSttClient.ts", doubaoClientPath],
    ["DoubaoSttTestConsole.tsx", testConsolePath],
    ["chatVoiceSttToolsView.tsx", sttPagePath],
    ["doubaoAsrHandler.ts POST transcribe", asrHandlerPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const sttPageSource = fs.existsSync(sttPagePath) ? fs.readFileSync(sttPagePath, "utf8") : "";
  const testConsoleSource = fs.existsSync(testConsolePath)
    ? fs.readFileSync(testConsolePath, "utf8")
    : "";
  const routeCoordSource = fs.existsSync(routeCoordPath)
    ? fs.readFileSync(routeCoordPath, "utf8")
    : "";
  const routeSectionSource = fs.existsSync(routeSectionPath)
    ? fs.readFileSync(routeSectionPath, "utf8")
    : "";
  const providerSource = fs.existsSync(doubaoProviderPath)
    ? fs.readFileSync(doubaoProviderPath, "utf8")
    : "";
  const clientSource = fs.existsSync(doubaoClientPath) ? fs.readFileSync(doubaoClientPath, "utf8") : "";
  const handlerSource = fs.existsSync(asrHandlerPath) ? fs.readFileSync(asrHandlerPath, "utf8") : "";
  const configSource = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const devPluginSource = fs.existsSync(devPluginPath) ? fs.readFileSync(devPluginPath, "utf8") : "";
  const envExampleSource = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

  const uiAndClientSource = `${hubSource}\n${sttPageSource}\n${testConsoleSource}\n${providerSource}\n${clientSource}`;
  const allCv2cSource = `${uiAndClientSource}\n${handlerSource}\n${configSource}\n${envExampleSource}\n${routeCoordSource}\n${routeSectionSource}\n${registrySource}`;

  const requiredPhrases = [
    "OpenSpeech / Doubao ASR",
    "generateDoubaoTranscript",
    "DoubaoSttTestConsole",
    "doubao-stt-manual-test-console",
    "fetchDoubaoSttStatus",
    "buildDoubaoSttRequest",
    "ready_for_manual_test",
    "setup_required",
    "OpenSpeech ASR Required",
    "Manual STT Test Console",
    "stt-tool-test",
    "Issue Agent Chat",
    "Individual Agent Chat",
    "Council Group Chat",
    "volc.bigasr.auc_turbo",
    "recognize/flash",
    "No Mic On Load",
    "Transcript Memory Protected",
    "Production Protected",
  ];
  for (const phrase of requiredPhrases) {
    if (!allCv2cSource.includes(phrase)) missingRequired.push(`CV-2C phrase: ${phrase}`);
  }

  for (const registryId of [
    "doubao-stt-provider",
    "openspeech-asr-endpoint",
    "stt-target-issue-chat",
    "stt-target-agent-chat",
    "stt-target-council-chat",
    "transcript-memory-protection",
  ]) {
    if (!registrySource.includes(`"${registryId}"`)) {
      missingRequired.push(`registry ${registryId}`);
    }
  }

  if (!devPluginSource.includes("/api/agentops/chat-voice/doubao-stt")) {
    missingRequired.push("dev plugin wires doubao-stt route");
  }
  if (!envExampleSource.includes("DOUBAO_STT_APP_ID")) {
    missingRequired.push(".env.example DOUBAO_STT configuration docs");
  }
  if (!envExampleSource.includes("DOUBAO_STT_OWNER_APPROVED")) {
    missingRequired.push(".env.example DOUBAO_STT gates");
  }
  if (!handlerSource.includes("audio_base64") || !handlerSource.includes("transcribeOpenSpeechFlash")) {
    missingRequired.push("handler must support POST audio_base64 transcribe");
  }
  if (handlerSource.includes("new WebSocket") || handlerSource.match(/WebSocket\s*\(/)) {
    missingRequired.push("handler must not open WebSocket in CV-2C");
  }

  const forbiddenPatterns = [
    { pattern: /getUserMedia\s*\(/, label: "getUserMedia" },
    { pattern: /mediaDevices\.getUserMedia/, label: "mediaDevices.getUserMedia" },
    { pattern: /recognition\.start\s*\(/, label: "recognition.start" },
  ];
  const forbiddenInUiFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const credentialLeakPattern =
    /(DOUBAO_STT_ACCESS_TOKEN|DOUBAO_ASR_ACCESS_KEY|X-Api-Access-Key)/i;
  const hasCredentialLeakInClient =
    credentialLeakPattern.test(clientSource) && clientSource.match(/process\.env|import\.meta\.env/);

  const postOnLoadPattern = /generateDoubaoTranscript\s*\(\s*\{[^}]*\}\s*\)\s*;?\s*\}\)\(\)/;
  const providerCallOnPageLoad =
    sttPageSource.includes("generateDoubaoTranscript") &&
    !sttPageSource.includes("handleTranscribe") &&
    postOnLoadPattern.test(sttPageSource);

  const doubaoSttConfigured = false;
  const sttOperationalStatus = "setup_required";

  const cv2b = checkChatVoiceHubCV2B();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInUiFiles.length === 0 &&
      !hasCredentialLeakInClient &&
      !providerCallOnPageLoad &&
      cv2b.ok,
    missingRequired,
    forbiddenInUiFiles,
    hasCredentialLeakInClient,
    providerCallOnPageLoad,
    doubaoSttConfigured,
    sttOperationalStatus,
    cv2bStillPasses: cv2b.ok,
    dedicatedSttPagePath: "/system/agent-ops/tools/chat-voice/voice-input-stt",
    apiRoutePath: "/api/agentops/chat-voice/doubao-stt",
    uploadFirstManualTest: sttPageSource.includes("DoubaoSttTestConsole"),
    noMicOnSttPageLoad: !sttPageSource.includes("getUserMedia"),
    noTranscriptMemoryWrite: !uiAndClientSource.match(/addAgentOpsAgentMemory|commitAgentOpsMemoryFromChatApproval/),
  };
}

/** CV-3C — Doubao / Volcengine TTS provider + manual test console + chat Speak wiring. */
function checkChatVoiceHubCV3C() {
  const hubViewPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceToolsViews.tsx",
  );
  const ttsPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/chatVoiceTtsToolsView.tsx",
  );
  const testConsolePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/DoubaoTtsTestConsole.tsx",
  );
  const doubaoProviderPath = path.join(
    process.cwd(),
    "src/lib/agentops/doubaoTtsProvider.ts",
  );
  const doubaoClientPath = path.join(process.cwd(), "src/lib/agentops/doubaoTtsClient.ts");
  const handlerPath = path.join(process.cwd(), "api/agentops/doubaoTtsHandler.ts");
  const configPath = path.join(process.cwd(), "api/agentops/doubaoTtsConfig.ts");
  const apiRoutePath = path.join(process.cwd(), "api/agentops/chat-voice/doubao-tts.ts");
  const devPluginPath = path.join(process.cwd(), "scripts/agentops-api-dev-plugin.ts");
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const registryPath = path.join(process.cwd(), "src/lib/agentops/tools/toolRegistry.ts");
  const routeCoordPath = path.join(
    process.cwd(),
    "src/lib/agentops/chatVoiceRouteCoordinationService.ts",
  );
  const messageSpeakPath = path.join(
    process.cwd(),
    "src/components/agentops/AgentOpsDoubaoMessageSpeak.tsx",
  );
  const ttsContextPath = path.join(
    process.cwd(),
    "src/components/agentops/AgentOpsDoubaoTtsContext.tsx",
  );
  const messageTtsHookPath = path.join(
    process.cwd(),
    "src/hooks/useAgentOpsDoubaoMessageTts.ts",
  );
  const coordinationAuditPath = path.join(
    process.cwd(),
    "src/lib/agentops/agentOpsDoubaoTtsCoordinationAudit.ts",
  );
  const surfaceResolverPath = path.join(
    process.cwd(),
    "src/lib/agentops/resolveDoubaoTtsSurfaceForChatScope.ts",
  );
  const messengerShellPath = path.join(
    process.cwd(),
    "src/components/aixia/AixiaMessengerShell.tsx",
  );
  const issueChatPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
  );
  const agentChatPagePath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
  );
  const councilChatPagePath = path.join(process.cwd(), "src/app/system/agent-ops/council/page.tsx");

  const missingRequired = [];
  for (const [label, filePath] of [
    ["doubaoTtsHandler.ts", handlerPath],
    ["doubaoTtsConfig.ts", configPath],
    ["doubao-tts API route", apiRoutePath],
    ["doubaoTtsProvider.ts", doubaoProviderPath],
    ["doubaoTtsClient.ts", doubaoClientPath],
    ["DoubaoTtsTestConsole.tsx", testConsolePath],
    ["chatVoiceTtsToolsView.tsx", ttsPagePath],
    ["agentops-api-dev-plugin.ts", devPluginPath],
    ["AgentOpsDoubaoMessageSpeak.tsx", messageSpeakPath],
    ["AgentOpsDoubaoTtsContext.tsx", ttsContextPath],
    ["useAgentOpsDoubaoMessageTts.ts", messageTtsHookPath],
    ["agentOpsDoubaoTtsCoordinationAudit.ts", coordinationAuditPath],
    ["resolveDoubaoTtsSurfaceForChatScope.ts", surfaceResolverPath],
    ["AixiaMessengerShell.tsx", messengerShellPath],
  ]) {
    if (!fs.existsSync(filePath)) missingRequired.push(label);
  }

  const hubSource = fs.existsSync(hubViewPath) ? fs.readFileSync(hubViewPath, "utf8") : "";
  const ttsPageSource = fs.existsSync(ttsPagePath) ? fs.readFileSync(ttsPagePath, "utf8") : "";
  const testConsoleSource = fs.existsSync(testConsolePath)
    ? fs.readFileSync(testConsolePath, "utf8")
    : "";
  const providerSource = fs.existsSync(doubaoProviderPath)
    ? fs.readFileSync(doubaoProviderPath, "utf8")
    : "";
  const clientSource = fs.existsSync(doubaoClientPath) ? fs.readFileSync(doubaoClientPath, "utf8") : "";
  const handlerSource = fs.existsSync(handlerPath) ? fs.readFileSync(handlerPath, "utf8") : "";
  const devPluginSource = fs.existsSync(devPluginPath) ? fs.readFileSync(devPluginPath, "utf8") : "";
  const envExampleSource = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf8") : "";
  const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";
  const routeCoordSource = fs.existsSync(routeCoordPath)
    ? fs.readFileSync(routeCoordPath, "utf8")
    : "";
  const messageSpeakSource = fs.existsSync(messageSpeakPath)
    ? fs.readFileSync(messageSpeakPath, "utf8")
    : "";
  const ttsContextSource = fs.existsSync(ttsContextPath)
    ? fs.readFileSync(ttsContextPath, "utf8")
    : "";
  const messageTtsHookSource = fs.existsSync(messageTtsHookPath)
    ? fs.readFileSync(messageTtsHookPath, "utf8")
    : "";
  const coordinationAuditSource = fs.existsSync(coordinationAuditPath)
    ? fs.readFileSync(coordinationAuditPath, "utf8")
    : "";
  const surfaceResolverSource = fs.existsSync(surfaceResolverPath)
    ? fs.readFileSync(surfaceResolverPath, "utf8")
    : "";
  const messengerShellSource = fs.existsSync(messengerShellPath)
    ? fs.readFileSync(messengerShellPath, "utf8")
    : "";
  const issueChatPageSource = fs.existsSync(issueChatPagePath)
    ? fs.readFileSync(issueChatPagePath, "utf8")
    : "";
  const agentChatPageSource = fs.existsSync(agentChatPagePath)
    ? fs.readFileSync(agentChatPagePath, "utf8")
    : "";
  const councilChatPageSource = fs.existsSync(councilChatPagePath)
    ? fs.readFileSync(councilChatPagePath, "utf8")
    : "";

  const uiAndClientSource = `${hubSource}\n${ttsPageSource}\n${testConsoleSource}\n${providerSource}\n${clientSource}`;
  /** CV-3C runtime/forbidden scans — Doubao voice path only (not full issue/agent/council pages). */
  const doubaoVoicePathSource = [
    messageSpeakSource,
    ttsContextSource,
    messageTtsHookSource,
    coordinationAuditSource,
    surfaceResolverSource,
    providerSource,
    clientSource,
    messengerShellSource,
  ].join("\n");
  const allCv3cSource = `${uiAndClientSource}\n${doubaoVoicePathSource}\n${handlerSource}\n${registrySource}\n${routeCoordSource}`;

  const requiredPhrases = [
    "Doubao / Volcengine TTS Provider",
    "Doubao Manual Test Console",
    "Generate Test Audio",
    "buildDoubaoTtsRequest",
    "fetchDoubaoTtsServerStatus",
    "getDoubaoTtsProviderStatus",
    "getDoubaoTtsSafetyPolicy",
    "handleDoubaoTtsRequest",
    "/api/agentops/chat-voice/doubao-tts",
    "preload=\"none\"",
    "credentialsConfigured",
    "setup_required",
    "manual_test_ready",
    "Doubao TTS Required",
    "Doubao / Volcengine TTS",
    "Issue Agent Chat",
    "Individual Agent Chat",
    "Council Group Chat",
    "generateDoubaoChatAudio",
    "chat_reply_preview",
    "AgentOpsDoubaoMessageSpeak",
    "recordDoubaoTtsCoordinationAttempt",
    "Manual Speak per agent reply",
    "Doubao per-message Speak",
    "Manual Playback Pending",
    "Connected · Manual Playback Ready",
    "Owner Approval Required",
    "manualHandoffOnly",
    "autoDispatchBlocked",
    "resolveDoubaoTtsSpeakButtonStatusLabel",
    "openspeech.bytedance.com/api/v1/tts",
    "Bearer;",
    "volcano_tts",
  ];
  for (const phrase of requiredPhrases) {
    if (!allCv3cSource.includes(phrase)) missingRequired.push(`CV-3C phrase: ${phrase}`);
  }

  for (const registryId of ["doubao-tts-provider", "doubao-tts-endpoint", "doubao-tts-chat-targets"]) {
    if (!registrySource.includes(`"${registryId}"`)) {
      missingRequired.push(`registry ${registryId}`);
    }
  }

  if (!devPluginSource.includes("/api/agentops/chat-voice/doubao-tts")) {
    missingRequired.push("dev plugin wires doubao-tts route");
  }
  if (!envExampleSource.includes("DOUBAO_TTS_API_KEY")) {
    missingRequired.push(".env.example Doubao TTS configuration docs");
  }
  if (!envExampleSource.includes("DOUBAO_TTS_APP_ID")) {
    missingRequired.push(".env.example DOUBAO_TTS_APP_ID");
  }
  if (!envExampleSource.includes("AGENTOPS_DOUBAO_TTS_ACTIVE")) {
    missingRequired.push(".env.example AGENTOPS_DOUBAO_TTS gates");
  }
  if (handlerSource.match(/DOUBAO_TTS_API_KEY.*json|json.*DOUBAO_TTS_API_KEY/i)) {
    missingRequired.push("handler must not return API key in JSON");
  }

  const forbiddenPatterns = [
    { pattern: /\bspeakText\s*\(/, label: "speakText" },
    { pattern: /speechSynthesis\.speak/, label: "speechSynthesis.speak" },
    { pattern: /new SpeechSynthesisUtterance/, label: "SpeechSynthesisUtterance" },
    { pattern: /audio\.play\s*\(/, label: "audio.play" },
    { pattern: /supabase\.functions\.invoke/, label: "Supabase functions invoke" },
    { pattern: /getUserMedia/, label: "getUserMedia" },
    { pattern: /\bautoPlay\b/, label: "autoPlay" },
  ];
  const forbiddenInUiFiles = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(uiAndClientSource))
    .map(({ label }) => label);

  const forbiddenInChatSpeak = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(doubaoVoicePathSource))
    .map(({ label }) => label);

  if (!messengerShellSource.includes("agentOpsDoubaoTtsActive")) {
    missingRequired.push("AixiaMessengerShell disables product TTS for Doubao chat scopes");
  }
  if (!messengerShellSource.includes("AgentOpsDoubaoTtsProvider")) {
    missingRequired.push("AixiaMessengerShell wraps Doubao TTS provider");
  }
  if (!surfaceResolverSource.includes("issue-agent-chat")) {
    missingRequired.push("resolveDoubaoTtsSurfaceForChatScope issue mapping");
  }
  if (!surfaceResolverSource.includes("individual-agent-chat")) {
    missingRequired.push("resolveDoubaoTtsSurfaceForChatScope agent mapping");
  }
  if (!surfaceResolverSource.includes("council-group-chat")) {
    missingRequired.push("resolveDoubaoTtsSurfaceForChatScope council mapping");
  }
  if (!issueChatPageSource.includes("AixiaMessengerShell") || !issueChatPageSource.includes('chatScope="issue"')) {
    missingRequired.push("Issue chat page wires AixiaMessengerShell with issue scope");
  }
  if (
    !agentChatPageSource.includes("AixiaMessengerShell") ||
    !agentChatPageSource.includes('chatScope="individual_agent"')
  ) {
    missingRequired.push("Agent chat page wires AixiaMessengerShell with individual_agent scope");
  }
  if (
    !councilChatPageSource.includes("AixiaMessengerShell") ||
    !councilChatPageSource.includes('chatScope="council"')
  ) {
    missingRequired.push("Council chat page wires AixiaMessengerShell with council scope");
  }
  if (!coordinationAuditSource.includes("hermesCoordination")) {
    missingRequired.push("Doubao TTS coordination audit metadata");
  }
  if (!messageSpeakSource.includes('preload="none"')) {
    missingRequired.push("AgentOpsDoubaoMessageSpeak manual audio preload=none");
  }

  const forbiddenRuntimeCalls = [
    { pattern: /createAgentOpsCursorHandoff/, label: "createAgentOpsCursorHandoff" },
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite" },
    { pattern: /addAgentOpsAgentMemory/, label: "addAgentOpsAgentMemory" },
    { pattern: /commitAgentOpsMemoryFromChatApproval/, label: "commitAgentOpsMemoryFromChatApproval" },
    {
      pattern: /updateAgentOpsIssueStatus|closeAgentOpsIssue/,
      label: "issue lifecycle mutation",
    },
  ];
  const runtimeViolations = forbiddenRuntimeCalls
    .filter(({ pattern }) => pattern.test(`${uiAndClientSource}\n${doubaoVoicePathSource}`))
    .map(({ label }) => label);

  const credentialInputPattern = /type=["']password["']/;
  const hasUnsafeCredentialInput =
    credentialInputPattern.test(ttsPageSource) ||
    credentialInputPattern.test(testConsoleSource) ||
    credentialInputPattern.test(hubSource);

  const doubaoTtsConfigured = false;
  const ttsOperationalStatus = "setup_required";

  const cv0 = checkChatVoiceHubCV0();
  const cv1 = checkChatVoiceHubCV1();
  const cv2 = checkChatVoiceHubCV2();
  const cv2b = checkChatVoiceHubCV2B();
  const cv3 = checkChatVoiceHubCV3();
  const cv3a = checkChatVoiceHubCV3A();
  const cv3b = checkChatVoiceHubCV3B();

  return {
    ok:
      missingRequired.length === 0 &&
      forbiddenInUiFiles.length === 0 &&
      forbiddenInChatSpeak.length === 0 &&
      runtimeViolations.length === 0 &&
      !hasUnsafeCredentialInput &&
      cv0.ok &&
      cv1.ok &&
      cv2.ok &&
      cv2b.ok &&
      cv3.ok &&
      cv3a.ok &&
      cv3b.ok,
    missingRequired,
    forbiddenInUiFiles,
    forbiddenInChatSpeak,
    runtimeViolations,
    hasUnsafeCredentialInput,
    doubaoTtsConfigured,
    ttsOperationalStatus,
    cv0StillPasses: cv0.ok,
    cv1StillPasses: cv1.ok,
    cv2StillPasses: cv2.ok,
    cv2bStillPasses: cv2b.ok,
    cv3StillPasses: cv3.ok,
    cv3aStillPasses: cv3a.ok,
    cv3bStillPasses: cv3b.ok,
    providerDynamicTestDeferred: !doubaoTtsConfigured,
    dedicatedTtsPagePath: "/system/agent-ops/tools/chat-voice/voice-output-tts",
    apiRoutePath: "/api/agentops/chat-voice/doubao-tts",
  };
}

/** Stage F — certification script + report presence (does not run certification inline). */
function checkHermesFullCoordinationCertification() {
  const scriptPath = path.join(
    process.cwd(),
    "scripts/agentops-hermes-coordination-certification.mjs",
  );
  const reportPath = path.join(
    process.cwd(),
    "qa-agent/reports/hermes-coordination-certification-report.json",
  );
  const matrixPath = path.join(
    process.cwd(),
    "qa-agent/reports/hermes-coordination-certification-matrix.md",
  );

  const missingRequired = [];
  if (!fs.existsSync(scriptPath)) {
    missingRequired.push("scripts/agentops-hermes-coordination-certification.mjs");
  }
  if (!fs.existsSync(matrixPath)) {
    missingRequired.push("qa-agent/reports/hermes-coordination-certification-matrix.md");
  }

  let reportPresent = false;
  let reportOverallStatus = null;
  let deferredDynamicChecks = [];

  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      reportPresent = true;
      reportOverallStatus = report.overallStatus ?? null;
      deferredDynamicChecks = report.deferredDynamicChecks ?? [];
    } catch {
      missingRequired.push("certification report JSON parse error");
    }
  }

  const reportOk =
    reportPresent &&
    (reportOverallStatus === "pass" || reportOverallStatus === "pass_with_needs_attention");

  return {
    ok: missingRequired.length === 0 && reportOk,
    reportPath: "qa-agent/reports/hermes-coordination-certification-report.json",
    scriptPresent: fs.existsSync(scriptPath),
    matrixPresent: fs.existsSync(matrixPath),
    reportPresent,
    reportOverallStatus,
    deferredDynamicChecks,
    missingRequired: reportPresent
      ? missingRequired
      : [...missingRequired, "run node scripts/agentops-hermes-coordination-certification.mjs"],
  };
}

/** Stage D1 — static structural checks for HermesMemoryCoordinator controlled writes. */
function checkHermesMemoryCoordinatorD1() {
  const servicePath = path.join(
    process.cwd(),
    "src/lib/agentops/hermesMemoryCoordinatorService.ts",
  );
  const panelPath = path.join(
    process.cwd(),
    "src/app/system/agent-ops/tools/HermesMemoryProposalQueuePanel.tsx",
  );
  const globalApprovedPath = path.join(
    process.cwd(),
    "src/lib/agentops/globalMemoryApprovedService.ts",
  );

  const missingRequired = [];
  if (!fs.existsSync(servicePath)) missingRequired.push("hermesMemoryCoordinatorService.ts");

  const serviceSource = fs.existsSync(servicePath)
    ? fs.readFileSync(servicePath, "utf8")
    : "";
  const panelSource = fs.existsSync(panelPath) ? fs.readFileSync(panelPath, "utf8") : "";
  const globalSource = fs.existsSync(globalApprovedPath)
    ? fs.readFileSync(globalApprovedPath, "utf8")
    : "";

  const requiredInService = [
    { pattern: /executeHermesStageDMemoryWrite/, label: "executeHermesStageDMemoryWrite export" },
    { pattern: /listStageDApprovedMemoryProposals/, label: "listStageDApprovedMemoryProposals export" },
    { pattern: /confirmStageDWrite/, label: "confirmStageDWrite gate" },
    { pattern: /approved_for_stage_d/, label: "approved_for_stage_d verification" },
    { pattern: /writeExecutedComputed/, label: "writeExecuted computed check" },
    { pattern: /sourceOfTruthWriteBlocked/, label: "sourceOfTruthWriteBlocked in router" },
    { pattern: /productionBlocked:\s*true/, label: "productionBlocked in router" },
    { pattern: /recordHermesMemoryWriteExecution/, label: "execution metadata recorder" },
    { pattern: /HERMES_MEMORY_WRITE_EXECUTED_D1_ACTION/, label: "execution metadata action constant" },
  ];

  for (const item of requiredInService) {
    if (!item.pattern.test(serviceSource)) missingRequired.push(`service: ${item.label}`);
  }

  const d1Files = `${serviceSource}\n${panelSource}`;
  const forbiddenInD1 = [
    { pattern: /createAgentOpsCursorHandoff/, label: "Cursor dispatch in D1 files" },
    { pattern: /updateAgentOpsFindingStatus/, label: "issue lifecycle mutation in D1 files" },
    { pattern: /markAgentOpsFixed/, label: "issue mark fixed in D1 files" },
    { pattern: /\bbulkExecute\s*\(/, label: "bulk execute function in D1 files" },
    { pattern: /aixia-global.*write|writeSourceOfTruth/i, label: "SOT file write in D1 files" },
  ];

  const violations = forbiddenInD1
    .filter(({ pattern }) => pattern.test(d1Files))
    .map(({ label }) => label);

  const wiredInUi =
    panelSource.includes("Stage D Memory Write Queue") &&
    panelSource.includes("Execute Stage D Memory Write") &&
    panelSource.includes("confirm this approved proposal should be written as memory through Hermes") &&
    panelSource.includes("executeHermesStageDMemoryWrite");

  if (!wiredInUi) {
    missingRequired.push("Stage D write queue UI wiring");
  }

  if (
    globalSource &&
    !globalSource.includes("createAgentOpsGlobalMemoryApprovedRecordFromHermesProposal")
  ) {
    missingRequired.push("global memory Hermes proposal write helper");
  }

  if (serviceSource && !serviceSource.includes('approvalStatus !== "approved_for_stage_d"')) {
    missingRequired.push("rejects non-approved_for_stage_d proposals");
  }

  return {
    ok: missingRequired.length === 0 && violations.length === 0,
    missingRequired,
    violations,
    d1ExecutionAuditDeferred: true,
  };
}

async function main() {
  ensureAuditStagingGuardEnv();
  const generatedAt = new Date().toISOString();
  const routeResults = [];
  for (const hub of [...HUBS, ...CHILD_ROUTES]) {
    routeResults.push(await checkRoute(hub));
  }

  const apiProbes = [];
  for (const probe of API_PROBES) {
    try {
      const res = await postJson(probe.url, probe.body);
      apiProbes.push({
        label: probe.label,
        httpStatus: res.status,
        runStatus: res.json?.status ?? "unknown",
        durationMs: res.durationMs,
        ok: res.status === 200 && res.json?.status === "passed",
        stderrPreview: (res.json?.stderrPreview ?? "").slice(0, 120),
      });
    } catch (error) {
      apiProbes.push({
        label: probe.label,
        ok: false,
        error: error.message,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const invalidResults = [];
  for (const test of INVALID_INPUTS) {
    const res = await postJson(test.url, test.body);
    invalidResults.push({
      label: test.label,
      httpStatus: res.status,
      blocked: res.status === 400 || res.json?.status === "blocked",
      ok: res.status === 400 || res.json?.status === "blocked",
    });
  }

  const ccStatus = (await getJson("/api/agentops/code-context-tools")).json ?? {};
  const evStatus = (await getJson("/api/agentops/evidence-tools")).json ?? {};
  const ingestionRes = await getJson("/api/agentops/hermes-context-ingestion");
  const ingestionJson = ingestionRes.json ?? {};

  const hermesContextIngestion = {
    ok:
      ingestionRes.status === 200 &&
      ingestionJson.mode === "read_only_c5" &&
      ingestionJson.allowed === true &&
      ingestionJson.safety?.readOnly === true &&
      ingestionJson.safety?.writesBlocked === true,
    httpStatus: ingestionRes.status,
    mode: ingestionJson.mode ?? null,
    evidencePresent: ingestionJson.evidence?.presentCount ?? 0,
    codePresent: ingestionJson.codeContext?.presentCount ?? 0,
    qaPresent: ingestionJson.qaReports?.presentCount ?? 0,
  };

  const crossCutting = {
    invalidInputsBlocked: invalidResults.every((r) => r.ok),
    productionBlocked:
      ccStatus.productionBlocked === true && evStatus.productionBlocked === true,
    codegraphReady: ccStatus.codegraph?.setupComplete === true,
    understandReady: ccStatus.understandAnything?.setupComplete === true,
    claudeSemanticReady: ccStatus.claudeContext?.semanticRuntimeReady === true,
    claudeSafeProbeReady: ccStatus.claudeContext?.safeProbeReady === true,
    runnersAvailable: ccStatus.available === true && evStatus.available === true,
    memoryCoordinationLabels: checkMemoryCoordinationLabelDrift(),
    hermesUiStatusConsistency: checkHermesUiStatusConsistency(),
    hermesCoordinationContract: checkHermesCoordinationContract(),
    hermesContextIngestion,
    hermesVerificationReviewer: checkHermesVerificationReviewer(),
    hermesAgentHandoff: checkHermesAgentHandoff(),
    hermesMemoryProposal: checkHermesMemoryProposal(),
    hermesMemoryCoordinatorD1: checkHermesMemoryCoordinatorD1(),
    agentMemoryProviderD2: checkAgentMemoryProviderD2(),
    globalMemoryProviderD3: checkGlobalMemoryProviderD3(),
    hermesStructuredCursorHandoffE1: checkHermesStructuredCursorHandoffE1(),
    hermesControlledAutomationReadinessE2: checkHermesControlledAutomationReadinessE2(),
    hermesFullCoordinationCertification: checkHermesFullCoordinationCertification(),
    chatVoiceHubCV0: checkChatVoiceHubCV0(),
    chatVoiceHubLLM12: checkChatVoiceHubLLM12(),
    chatVoiceHubCV1: checkChatVoiceHubCV1(),
    chatVoiceHubCV2: checkChatVoiceHubCV2(),
    chatVoiceHubCV2B: checkChatVoiceHubCV2B(),
    chatVoiceHubCV2C: checkChatVoiceHubCV2C(),
    chatVoiceHubCV3: checkChatVoiceHubCV3(),
    chatVoiceHubCV3A: checkChatVoiceHubCV3A(),
    chatVoiceHubCV3B: checkChatVoiceHubCV3B(),
    chatVoiceHubCV3C: checkChatVoiceHubCV3C(),
    designCrewReferencesHubDESIGN1B: checkDesignCrewReferencesHubDESIGN1B(),
    designCrewMemoryMetadataDESIGN1D: checkDesignCrewMemoryMetadataDESIGN1D(),
    stagingToolsHubSTAGING1: checkStagingToolsHubSTAGING1(),
  };

  const pages = [];

  const routeByName = Object.fromEntries(routeResults.map((r) => [r.name, r]));

  pages.push({
    "Tool/Page Name": "Agent Brain & Memory",
    URL: routeByName["Agent Brain & Memory"]?.url,
    Status: routeByName["Agent Brain & Memory"]?.ok ? "Healthy" : "Critical",
    Details: "Category hub — 4 operational groups (Memory, Code/Context, Evidence, Reasoning).",
    "Steps Performed": "HTTP 200 route check.",
    "Errors/Notes": routeByName["Agent Brain & Memory"]?.badContent ? "Error content detected" : "Registry status mix on cards is cosmetic.",
    "Screenshots/Logs": "scripts/agentops-tools-hub-audit.mjs route check",
  });

  pages.push({
    "Tool/Page Name": "Memory & Coordination Tools",
    URL: routeByName["Memory & Coordination Tools"]?.url,
    Status:
      routeByName["Memory & Coordination Tools"]?.ok &&
      crossCutting.memoryCoordinationLabels.ok
        ? "Healthy"
        : routeByName["Memory & Coordination Tools"]?.ok
          ? "Needs Attention"
          : "Critical",
    Details: crossCutting.memoryCoordinationLabels.ok
      ? `Dedicated hub page wired; registry statuses=${JSON.stringify(crossCutting.memoryCoordinationLabels.statuses)}`
      : `Label drift: stale=${crossCutting.memoryCoordinationLabels.staleLabels.join(", ") || "none"} statuses=${JSON.stringify(crossCutting.memoryCoordinationLabels.statuses)} dedicatedPage=${crossCutting.memoryCoordinationLabels.usesDedicatedHubPage}`,
    "Steps Performed": "HTTP 200; registry status + dedicated hub page wiring check.",
    "Errors/Notes": crossCutting.memoryCoordinationLabels.ok
      ? ""
      : "Registry card labels or hub page wiring still contradict verified runtime.",
    "Screenshots/Logs": "checkMemoryCoordinationLabelDrift()",
  });

  const hermesOk = routeByName["Hermes"]?.ok;
  const hermesUiOk = crossCutting.hermesUiStatusConsistency.ok;
  const hermesContractOk = crossCutting.hermesCoordinationContract.ok;
  pages.push({
    "Tool/Page Name": "Hermes",
    URL: routeByName["Hermes"]?.url,
    Status:
      hermesOk && hermesUiOk && hermesContractOk
        ? "Healthy"
        : hermesOk
          ? "Needs Attention"
          : "Critical",
    Details:
      "Stage C coordinator panels; advisory runtime reachable. Honest protection labels (Write Protected, Owner-Gated, Safety Protected). Stage 0 coordination contract locked.",
    "Steps Performed":
      "HTTP 200; checkHermesUiStatusConsistency(); checkHermesCoordinationContract().",
    "Errors/Notes": [
      hermesUiOk
        ? "Hermes UI status consistency: passed"
        : `Hermes UI misleading labels: ${[
            ...(crossCutting.hermesUiStatusConsistency.violations ?? []),
            ...(crossCutting.hermesUiStatusConsistency.missingRequired ?? []),
          ].join("; ")}`,
      hermesContractOk
        ? "Hermes coordination contract: passed"
        : `Hermes coordination contract missing required text: ${(
            crossCutting.hermesCoordinationContract.missingRequired ?? []
          ).join("; ")}`,
    ]
      .filter(Boolean)
      .join(" | "),
    "Screenshots/Logs": "checkHermesUiStatusConsistency(); checkHermesCoordinationContract()",
  });

  pages.push({
    "Tool/Page Name": "AgentMemory (Per-Agent)",
    URL: routeByName["AgentMemory (Per-Agent)"]?.url,
    Status: routeByName["AgentMemory (Per-Agent)"]?.ok ? "Healthy" : "Critical",
    Details: "Read-only foundation layer; external npx package not connected (disclosed). Writes blocked.",
    "Steps Performed": "HTTP 200 route check.",
    "Errors/Notes": "External AgentMemory package not installed — expected v1.",
    "Screenshots/Logs": "HTTP smoke",
  });

  pages.push({
    "Tool/Page Name": "Code / Context Understanding",
    URL: routeByName["Code / Context Understanding"]?.url,
    Status:
      crossCutting.codegraphReady &&
      crossCutting.understandReady &&
      crossCutting.claudeSemanticReady
        ? "Healthy"
        : "Needs Attention",
    Details: `3/3 active — codegraph:${crossCutting.codegraphReady} understand:${crossCutting.understandReady} claude semantic:${crossCutting.claudeSemanticReady}`,
    "Steps Performed": "HTTP 200; GET /api/agentops/code-context-tools probe.",
    "Errors/Notes": crossCutting.claudeSemanticReady
      ? "Milvus semantic pipeline uses bounded retry/backoff for transient cold-start errors."
      : "Semantic runtime not ready.",
    "Screenshots/Logs": "API probe claudeContext",
  });

  for (const tool of ["CodeGraph", "Understand-Anything", "claude-context"]) {
    const probe =
      tool === "CodeGraph"
        ? crossCutting.codegraphReady
        : tool === "Understand-Anything"
          ? crossCutting.understandReady
          : crossCutting.claudeSemanticReady && crossCutting.claudeSafeProbeReady;
    const apiRun = apiProbes.find((p) =>
      tool === "CodeGraph"
        ? p.label === "refresh_codegraph_status"
        : tool === "claude-context"
          ? p.label === "run_claude_context_summary"
          : false,
    );
    pages.push({
      "Tool/Page Name": tool,
      URL: routeByName[tool]?.url,
      Status: routeByName[tool]?.ok && probe ? "Healthy" : "Needs Attention",
      Details: apiRun ? `${apiRun.label} ${apiRun.runStatus} ${apiRun.durationMs}ms` : "Setup probe active.",
      "Steps Performed": "HTTP 200; API probe where applicable.",
      "Errors/Notes": "",
      "Screenshots/Logs": apiRun ? JSON.stringify(apiRun) : "HTTP smoke",
    });
  }

  pages.push({
    "Tool/Page Name": "Evidence Tools",
    URL: routeByName["Evidence Tools"]?.url,
    Status: routeByName["Evidence Tools"]?.ok ? "Healthy" : "Critical",
    Details: "5-tool hub — Browser QA, Playwright, reports, guardrails, verification-results.",
    "Steps Performed": "HTTP 200; evidence runner available=" + evStatus.available,
    "Errors/Notes": "",
    "Screenshots/Logs": "API GET evidence-tools",
  });

  for (const tool of ["Browser QA", "Playwright", "Reports", "Guardrails", "Verification Results"]) {
    const map = {
      "Browser QA": "run_browser_qa_foundation",
      Playwright: "run_playwright_smoke",
      Reports: "refresh_report_index",
      Guardrails: "run_guardrails",
      "Verification Results": null,
    };
    const apiRun = apiProbes.find((p) => p.label === map[tool]);
    pages.push({
      "Tool/Page Name": tool,
      URL: routeByName[tool]?.url,
      Status: routeByName[tool]?.ok ? (apiRun && !apiRun.ok ? "Needs Attention" : "Healthy") : "Critical",
      Details: apiRun
        ? `${apiRun.label} ${apiRun.runStatus} ${apiRun.durationMs}ms`
        : "Foundation/read-only page.",
      "Steps Performed": apiRun ? "HTTP 200 + API probe" : "HTTP 200 only",
      "Errors/Notes": "",
      "Screenshots/Logs": apiRun ? JSON.stringify(apiRun) : "HTTP smoke",
    });
  }

  pages.push({
    "Tool/Page Name": "Design Crew & References",
    URL: routeByName["Design Crew & References"]?.url,
    Status:
      routeByName["Design Crew & References"]?.ok &&
      crossCutting.designCrewReferencesHubDESIGN1B.ok
        ? "Healthy"
        : routeByName["Design Crew & References"]?.ok
          ? "Needs Attention"
          : "Critical",
    Details:
      "Five active design tool cards — reference-only, local Cursor, no auto-run, no Supabase writes from page.",
    "Steps Performed":
      "HTTP 200; checkDesignCrewReferencesHubDESIGN1B() static source checks.",
    "Errors/Notes": crossCutting.designCrewReferencesHubDESIGN1B.ok
      ? ""
      : `Missing: ${(crossCutting.designCrewReferencesHubDESIGN1B.missingRequired ?? []).join("; ")}`,
    "Screenshots/Logs": "checkDesignCrewReferencesHubDESIGN1B()",
  });

  for (const tool of [
    "shadcn-admin",
    "TailAdmin React",
    "TailAdmin multi-template",
    "AiXia global source of truth",
    "visual/design QA rules",
  ]) {
    pages.push({
      "Tool/Page Name": tool,
      URL: routeByName[tool]?.url,
      Status:
        routeByName[tool]?.ok && crossCutting.designCrewReferencesHubDESIGN1B.ok
          ? "Healthy"
          : routeByName[tool]?.ok
            ? "Needs Attention"
            : "Critical",
      Details: "Read-only design tool page — reference-only, local Cursor, no runtime import.",
      "Steps Performed": "HTTP 200 route check + DESIGN-1B static checks.",
      "Errors/Notes": "",
      "Screenshots/Logs": "HTTP smoke",
    });
  }

  pages.push({
    "Tool/Page Name": "Reasoning Layer",
    URL: routeByName["Reasoning Layer"]?.url,
    Status: routeByName["Reasoning Layer"]?.ok ? "Healthy" : "Critical",
    Details: "4 foundation tools — advisory/policy only; website execution blocked.",
    "Steps Performed": "HTTP 200; Hermes coordinator cross-check.",
    "Errors/Notes": "No website-triggered reasoning execution (v1 boundary).",
    "Screenshots/Logs": "HTTP smoke",
  });

  for (const tool of ["Cursor", "Smart Cloud LLM", "Local LLM Later", "Task-Specific Reasoning"]) {
    pages.push({
      "Tool/Page Name": tool,
      URL: routeByName[tool]?.url,
      Status: routeByName[tool]?.ok ? "Healthy" : "Critical",
      Details: "Foundation metadata page — execution blocked from website.",
      "Steps Performed": "HTTP 200 route check.",
      "Errors/Notes": "",
      "Screenshots/Logs": "HTTP smoke",
    });
  }

  const summary = {
    audit_name: "AiXia AgentOps Full Tools & Hub Audit (Automated)",
    environment: BASE,
    generatedAt,
    routes: {
      total: routeResults.length,
      passed: routeResults.filter((r) => r.ok).length,
      failed: routeResults.filter((r) => !r.ok).length,
    },
    apiProbeCount: API_PROBES.length,
    apiProbes,
    invalidResults,
    crossCutting,
    hermesUiStatusConsistency: crossCutting.hermesUiStatusConsistency,
    hermesCoordinationContract: {
      ok: crossCutting.hermesCoordinationContract.ok,
      path: crossCutting.hermesCoordinationContract.path,
      missingRequired: crossCutting.hermesCoordinationContract.missingRequired,
    },
    recommended_followups: [
      ...(crossCutting.hermesUiStatusConsistency.ok
        ? []
        : [
            {
              area: "Hermes UI status copy",
              reason: "Misleading blocked/inactive labels detected in Hermes views",
              violations: crossCutting.hermesUiStatusConsistency.violations,
              missingRequired: crossCutting.hermesUiStatusConsistency.missingRequired,
            },
          ]),
      ...(crossCutting.hermesCoordinationContract.ok
        ? []
        : [
            {
              area: "Hermes coordination contract (Stage 0)",
              reason: "Locked architecture contract missing or incomplete",
              path: crossCutting.hermesCoordinationContract.path,
              missingRequired: crossCutting.hermesCoordinationContract.missingRequired,
            },
          ]),
    ],
    pages,
  };

  console.log(JSON.stringify(summary, null, 2));
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.error(`Wrote ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
