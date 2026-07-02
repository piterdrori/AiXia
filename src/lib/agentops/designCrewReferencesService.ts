/**
 * DESIGN-1B / DESIGN-1D — read-only metadata for Design Crew & References tool pages.
 * Static status from DESIGN-1A; memory metadata alignment (DESIGN-1D) — no live recall.
 * No filesystem probes or ../reference/ imports.
 */

import {
  getToolRegistryChildren,
  getToolRegistryEntry,
  TOOLS_HUB_BASE_PATH,
  type ToolRegistryEntry,
} from "./tools/toolRegistry.js";

export const DESIGN_CREW_CATEGORY_ID = "design-crew-references";

export const DESIGN_CREW_HUB_PATH = `${TOOLS_HUB_BASE_PATH}/${DESIGN_CREW_CATEGORY_ID}`;

export const DESIGN_CREW_TOOL_ROUTE_SLUGS = {
  "design-shadcn-admin": "shadcn-admin",
  "design-tailadmin-react": "tailadmin-react",
  "design-tailadmin-multi": "tailadmin-multi-template",
  "design-aixia-global-sot": "aixia-global-source-of-truth",
  "design-visual-qa-rules": "visual-design-qa-rules",
} as const;

export type DesignCrewToolRegistryId = keyof typeof DESIGN_CREW_TOOL_ROUTE_SLUGS;

export type DesignCrewMemoryMetadataType =
  | "external_design_reference"
  | "internal_design_law"
  | "design_guardrail_rules";

export type DesignCrewMemoryAuthorityLevel =
  | "reference_only"
  | "final_design_law"
  | "guardrail_rules";

export type DesignCrewMemoryMetadata = {
  toolId: DesignCrewToolRegistryId;
  title: string;
  type: DesignCrewMemoryMetadataType;
  sourcePath: string;
  canonicalRoute: string;
  localAvailability: "yes" | "no";
  githubAvailability: "yes" | "no";
  vercelAvailability: "yes" | "no";
  supabaseAvailability: "metadata_only_later";
  aiRuntimeImportAllowed: false;
  agentUsagePolicy: string;
  forbiddenActions: string[];
  memoryStatus: "metadata_ready";
  memoryConnectionMode: "metadata_only";
  authorityLevel: DesignCrewMemoryAuthorityLevel;
  relatedMemoryToolId: string | null;
  stagingSupport: string;
  worksWhenLocalOff: string;
  notes: string;
};

export type DesignCrewStatusTone = "emerald" | "amber" | "rose" | "neutral" | "cyan" | "violet";

export type DesignCrewStatusItem = {
  label: string;
  value: string;
  tone: DesignCrewStatusTone;
};

export type DesignCrewToolPageConfig = {
  registryId: DesignCrewToolRegistryId;
  routeSlug: string;
  testId: string;
  title: string;
  subtitle: string;
  hubStatusLabel: string;
  hubActionLabel: string;
  hubSummary: string;
  availability: DesignCrewStatusItem[];
  safeUsage: string[];
  forbidden: string[];
  extraSections?: { title: string; items: string[] }[];
  linkSurfaces?: { label: string; path: string; navigable: boolean }[];
  safetyBanner: string;
};

export function getDesignCrewToolRouteSlug(registryId: string): string | null {
  return DESIGN_CREW_TOOL_ROUTE_SLUGS[registryId as DesignCrewToolRegistryId] ?? null;
}

export function getDesignCrewToolRoute(registryId: DesignCrewToolRegistryId): string {
  const slug = DESIGN_CREW_TOOL_ROUTE_SLUGS[registryId];
  return `${DESIGN_CREW_HUB_PATH}/${slug}`;
}

export function getDesignCrewToolByRouteSlug(routeSlug: string): ToolRegistryEntry | null {
  for (const child of getToolRegistryChildren(DESIGN_CREW_CATEGORY_ID)) {
    const expectedSlug = getDesignCrewToolRouteSlug(child.id);
    if (expectedSlug === routeSlug) return child;
    if (child.route?.endsWith(`/${routeSlug}`)) return child;
  }
  return null;
}

export function getDesignCrewToolPageConfig(routeSlug: string): DesignCrewToolPageConfig | null {
  const entry = getDesignCrewToolByRouteSlug(routeSlug);
  if (!entry) return null;
  return DESIGN_CREW_TOOL_PAGES[entry.id as DesignCrewToolRegistryId] ?? null;
}

const REFERENCE_SAFE = [
  "Inspect locally in Cursor as inspiration",
  "Translate approved ideas into src/components/aixia/ only",
  "Follow src/design-system/aixia-global/ for implementation law",
];

const REFERENCE_FORBIDDEN = [
  "Direct import from ../reference/",
  "Copy/paste external JSX or CSS into AiXia pages",
  "Install packages in AiXia root because of a reference repo",
  "Treat reference repos as AiXia design law",
  "Build reference repos from the website",
];

const REFERENCE_AVAILABILITY: DesignCrewStatusItem[] = [
  { label: "Local Cursor", value: "yes", tone: "emerald" },
  { label: "GitHub / Vercel", value: "no", tone: "rose" },
  { label: "AiXia runtime import", value: "forbidden", tone: "rose" },
];

const REFERENCE_SAFETY =
  "Reference-only design tool. Local Cursor only. No direct import. No source-of-truth mutation. No Supabase or AgentMemory writes. No auto-run.";

const EXTERNAL_REFERENCE_FORBIDDEN_ACTIONS = [
  "runtime_import_from_reference",
  "supabase_write",
  "agentmemory_write",
  "copy_paste_external_code",
  "install_packages_from_reference",
  "treat_reference_as_design_law",
];

const EXTERNAL_REFERENCE_MEMORY_BASE: Omit<
  DesignCrewMemoryMetadata,
  "toolId" | "title" | "sourcePath" | "canonicalRoute" | "notes"
> = {
  type: "external_design_reference",
  localAvailability: "yes",
  githubAvailability: "no",
  vercelAvailability: "no",
  supabaseAvailability: "metadata_only_later",
  aiRuntimeImportAllowed: false,
  agentUsagePolicy: "local_cursor_reference_only",
  forbiddenActions: EXTERNAL_REFERENCE_FORBIDDEN_ACTIONS,
  memoryStatus: "metadata_ready",
  memoryConnectionMode: "metadata_only",
  authorityLevel: "reference_only",
  relatedMemoryToolId: null,
  stagingSupport: "metadata_only",
  worksWhenLocalOff: "metadata_only",
};

/** DESIGN-1D — static Memory Hub metadata (no live recall, no Supabase writes). */
export const DESIGN_CREW_MEMORY_METADATA: Record<
  DesignCrewToolRegistryId,
  DesignCrewMemoryMetadata
> = {
  "design-shadcn-admin": {
    ...EXTERNAL_REFERENCE_MEMORY_BASE,
    toolId: "design-shadcn-admin",
    title: "shadcn-admin",
    sourcePath: "../reference/shadcn-admin/",
    canonicalRoute: "/system/agent-ops/tools/design-crew-references/shadcn-admin",
    notes:
      "Local Cursor reference only; not AiXia law; do not import into runtime.",
  },
  "design-tailadmin-react": {
    ...EXTERNAL_REFERENCE_MEMORY_BASE,
    toolId: "design-tailadmin-react",
    title: "TailAdmin React",
    sourcePath: "../reference/free-react-tailwind-admin-dashboard/",
    canonicalRoute: "/system/agent-ops/tools/design-crew-references/tailadmin-react",
    notes:
      "Local Cursor reference only; not AiXia law; do not import into runtime.",
  },
  "design-tailadmin-multi": {
    ...EXTERNAL_REFERENCE_MEMORY_BASE,
    toolId: "design-tailadmin-multi",
    title: "TailAdmin multi-template",
    sourcePath: "../reference/free-tailwind-admin-dashboard-template/",
    canonicalRoute:
      "/system/agent-ops/tools/design-crew-references/tailadmin-multi-template",
    notes:
      "Local Cursor reference only; not AiXia law; do not import into runtime. React subfolder only — do not port Vue/Angular/HTML variants.",
  },
  "design-aixia-global-sot": {
    toolId: "design-aixia-global-sot",
    title: "AiXia global source of truth",
    type: "internal_design_law",
    sourcePath: "src/design-system/aixia-global/",
    canonicalRoute:
      "/system/agent-ops/tools/design-crew-references/aixia-global-source-of-truth",
    localAvailability: "yes",
    githubAvailability: "yes",
    vercelAvailability: "yes",
    supabaseAvailability: "metadata_only_later",
    aiRuntimeImportAllowed: false,
    agentUsagePolicy: "follow_design_law_propose_changes_through_owner_only",
    forbiddenActions: [
      "page_local_design_standards",
      "silent_sot_edit",
      "hermes_memory_override_sot",
      "supabase_write",
      "agentmemory_write",
    ],
    memoryStatus: "metadata_ready",
    memoryConnectionMode: "metadata_only",
    authorityLevel: "final_design_law",
    relatedMemoryToolId: "gm-design-sot",
    stagingSupport: "repo_available",
    worksWhenLocalOff: "yes",
    notes:
      "aixia-global is stronger authority than Hermes memory; memory may propose improvements but cannot override source-of-truth files.",
  },
  "design-visual-qa-rules": {
    toolId: "design-visual-qa-rules",
    title: "visual/design QA rules",
    type: "design_guardrail_rules",
    sourcePath: "src/design-system/aixia-global/15-guardrail-rules.md",
    canonicalRoute:
      "/system/agent-ops/tools/design-crew-references/visual-design-qa-rules",
    localAvailability: "yes",
    githubAvailability: "yes",
    vercelAvailability: "yes",
    supabaseAvailability: "metadata_only_later",
    aiRuntimeImportAllowed: false,
    agentUsagePolicy: "read_rules_execute_elsewhere_owner_triggered",
    forbiddenActions: [
      "auto_run_guardrails_from_hub",
      "issue_creation_from_hub",
      "cursor_dispatch_from_hub",
      "supabase_write",
      "agentmemory_write",
    ],
    memoryStatus: "metadata_ready",
    memoryConnectionMode: "metadata_only",
    authorityLevel: "guardrail_rules",
    relatedMemoryToolId: "et-guardrails",
    stagingSupport: "repo_available_execution_elsewhere",
    worksWhenLocalOff: "metadata_yes_execution_requires_worker",
    notes:
      "Execution is owner-triggered elsewhere; this hub does not run guardrails.",
  },
};

export const DESIGN_CREW_MEMORY_METADATA_TOOL_IDS = Object.keys(
  DESIGN_CREW_MEMORY_METADATA,
) as DesignCrewToolRegistryId[];

export function getDesignCrewMemoryMetadata(
  toolId: DesignCrewToolRegistryId,
): DesignCrewMemoryMetadata {
  return DESIGN_CREW_MEMORY_METADATA[toolId];
}

export const DESIGN_CREW_TOOL_PAGES: Record<DesignCrewToolRegistryId, DesignCrewToolPageConfig> = {
  "design-shadcn-admin": {
    registryId: "design-shadcn-admin",
    routeSlug: "shadcn-admin",
    testId: "design-crew-shadcn-admin",
    title: "shadcn-admin",
    subtitle: "Local reference clone — admin dashboard inspiration for Cursor agents.",
    hubStatusLabel: "Local reference",
    hubActionLabel: "Open tool",
    hubSummary: "Reference-only · Local Cursor only",
    availability: REFERENCE_AVAILABILITY,
    safeUsage: REFERENCE_SAFE,
    forbidden: REFERENCE_FORBIDDEN,
    extraSections: [
      {
        title: "Reference details",
        items: [
          "Expected local path: ../reference/shadcn-admin/",
          "Local clone: yes (DESIGN-1A)",
          "node_modules: not installed",
          "Stack: React / Vite / shadcn/ui",
          "GitHub/Vercel: sibling clone is outside AiXia-github",
        ],
      },
    ],
    safetyBanner: REFERENCE_SAFETY,
  },
  "design-tailadmin-react": {
    registryId: "design-tailadmin-react",
    routeSlug: "tailadmin-react",
    testId: "design-crew-tailadmin-react",
    title: "TailAdmin React",
    subtitle: "Local reference clone — Tailwind dashboard inspiration for Cursor agents.",
    hubStatusLabel: "Reference-only",
    hubActionLabel: "Open tool",
    hubSummary: "Reference-only · Local Cursor only",
    availability: REFERENCE_AVAILABILITY,
    safeUsage: REFERENCE_SAFE,
    forbidden: REFERENCE_FORBIDDEN,
    extraSections: [
      {
        title: "Reference details",
        items: [
          "Expected local path: ../reference/free-react-tailwind-admin-dashboard/",
          "Local clone: yes (DESIGN-1A)",
          "node_modules: not installed",
          "Stack: React / Vite / Tailwind",
          "GitHub/Vercel: sibling clone is outside AiXia-github",
        ],
      },
    ],
    safetyBanner: REFERENCE_SAFETY,
  },
  "design-tailadmin-multi": {
    registryId: "design-tailadmin-multi",
    routeSlug: "tailadmin-multi-template",
    testId: "design-crew-tailadmin-multi",
    title: "TailAdmin multi-template",
    subtitle: "Multi-framework reference clone — React subfolder only for AiXia policy.",
    hubStatusLabel: "Local reference",
    hubActionLabel: "Open tool",
    hubSummary: "Reference-only · React subfolder policy",
    availability: REFERENCE_AVAILABILITY,
    safeUsage: [
      ...REFERENCE_SAFE,
      "Inspect React subfolder only: tailwind-admin-reactjs-free/package/",
    ],
    forbidden: [
      ...REFERENCE_FORBIDDEN,
      "Port Vue, Angular, or HTML variants into AiXia",
    ],
    extraSections: [
      {
        title: "Reference details",
        items: [
          "Expected local path: ../reference/free-tailwind-admin-dashboard-template/",
          "Local clone: yes (DESIGN-1A)",
          "Root package.json: no",
          "Stack: multi-framework",
          "AiXia policy: React subfolder only may be inspected",
        ],
      },
    ],
    safetyBanner: REFERENCE_SAFETY,
  },
  "design-aixia-global-sot": {
    registryId: "design-aixia-global-sot",
    routeSlug: "aixia-global-source-of-truth",
    testId: "design-crew-aixia-global-sot",
    title: "AiXia global source of truth",
    subtitle: "Final AiXia design law — read-only status reference (not Hermes memory).",
    hubStatusLabel: "Active law",
    hubActionLabel: "Open tool",
    hubSummary: "Read-only status · 17 owner files",
    availability: [
      { label: "Authority", value: "final AiXia design law", tone: "emerald" },
      { label: "Page-local standards", value: "blocked", tone: "rose" },
      { label: "Memory connection", value: "not in this phase", tone: "neutral" },
    ],
    safeUsage: [
      "Follow src/design-system/aixia-global/ during implementation",
      "Propose owner-file updates through Piter approval only",
      "Implement through shared AiXia components and CSS",
    ],
    forbidden: [
      "Create page-local design standards",
      "Create module-specific visual law",
      "Silently edit aixia-global owner files",
      "Treat Hermes memory as stronger than aixia-global",
    ],
    extraSections: [
      {
        title: "Source-of-truth status",
        items: [
          "Path: src/design-system/aixia-global/",
          "Owner files: 00–16 (17 files total)",
          "Key file: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md",
          "Implementation layer: src/components/aixia/ · src/styles/aixia-design-system.css",
        ],
      },
    ],
    safetyBanner:
      "Read-only design tool status. No Hermes/Global Memory duplication. No source-of-truth mutation from this page.",
  },
  "design-visual-qa-rules": {
    registryId: "design-visual-qa-rules",
    routeSlug: "visual-design-qa-rules",
    testId: "design-crew-visual-design-qa-rules",
    title: "visual/design QA rules",
    subtitle: "Design guardrail law reference — execution is owner-triggered elsewhere.",
    hubStatusLabel: "Rules active",
    hubActionLabel: "Open tool",
    hubSummary: "Execution elsewhere · No auto-run here",
    availability: [
      { label: "Rules", value: "exist", tone: "emerald" },
      { label: "Auto-run from this hub", value: "no", tone: "rose" },
      { label: "Execution", value: "owner-triggered elsewhere", tone: "cyan" },
    ],
    safeUsage: [
      "Read design guardrail law at src/design-system/aixia-global/15-guardrail-rules.md",
      "Run validation from Evidence Tools / Guardrails when owner triggers",
      "Use npm run build guardrails locally outside this page",
    ],
    forbidden: [
      "No auto-run from this page",
      "No issue creation from this page",
      "No CSS or source-of-truth mutation from this page",
      "No Cursor dispatch from this page",
      "No Supabase or AgentMemory writes from this page",
    ],
    extraSections: [
      {
        title: "Validation surfaces (elsewhere)",
        items: [
          "Design law file: src/design-system/aixia-global/15-guardrail-rules.md",
          "npm run build (guardrails gate)",
          "Evidence Tools / Guardrails (owner-triggered)",
          "qa:static-design-guardrails (read-only scan script)",
        ],
      },
    ],
    linkSurfaces: [
      {
        label: "Evidence Tools / Guardrails",
        path: "/system/agent-ops/tools/agent-brain-memory/evidence-tools/guardrails",
        navigable: true,
      },
    ],
    safetyBanner:
      "Rules reference only on this page. Does not duplicate Evidence Tools. No guardrail auto-run.",
  },
};

export function getDesignCrewHubCards() {
  const category = getToolRegistryEntry(DESIGN_CREW_CATEGORY_ID);
  if (!category) return [];

  return getToolRegistryChildren(DESIGN_CREW_CATEGORY_ID).map((tool) => {
    const config = DESIGN_CREW_TOOL_PAGES[tool.id as DesignCrewToolRegistryId];
    const route = getDesignCrewToolRoute(tool.id as DesignCrewToolRegistryId);
    return {
      id: tool.id,
      title: tool.title,
      description: tool.description,
      route,
      statusLabel: config?.hubStatusLabel ?? tool.status,
      actionLabel: config?.hubActionLabel ?? "Open",
      summary: config?.hubSummary ?? tool.configuredStatus,
    };
  });
}
