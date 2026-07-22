/**
 * Role-first AgentOps detector packs.
 * Each canonical agent only promotes findings in its skill categories.
 */

import { CANONICAL_AGENTS } from "../canonicalAgents";
import { getBrowserQaPerspective } from "../browserQa/browserQaAgentPerspective";

export type RoleFindingCategory =
  | "design"
  | "functional"
  | "navigation"
  | "performance"
  | "observability"
  | "system"
  | "runtime"
  | "config"
  | "memory"
  | "issue_lifecycle"
  | "evolution"
  | "chat_ux"
  | "analytics"
  | "repairability"
  | "ux"
  | "ui";

export type AgentRoleDetectorPack = {
  agentSlug: string;
  ownedCategories: readonly RoleFindingCategory[];
  /** Detector ids this agent may emit */
  allowedDetectorIds: readonly string[];
  improvementKinds: readonly string[];
  shouldPromoteIssues: boolean;
  findingLens: string;
  improvementLens: string;
};

const PACKS: Record<string, Omit<AgentRoleDetectorPack, "agentSlug" | "shouldPromoteIssues" | "findingLens" | "improvementLens">> = {
  "design-agent": {
    ownedCategories: ["design", "ui", "ux"],
    allowedDetectorIds: [
      "design_missing_h1",
      "design_sparse_main",
      "design_empty_main",
      "design_hydration_stall",
      "design_improvement_hierarchy",
      "design_improvement_spacing",
      "design_shared_component_gap",
    ],
    improvementKinds: [
      "visual hierarchy",
      "spacing",
      "layout rhythm",
      "shared-component alignment",
      "responsive behavior",
    ],
  },
  "qa-agent": {
    ownedCategories: ["functional", "navigation"],
    allowedDetectorIds: [
      "qa_page_load_failure",
      "qa_http_error",
      "qa_broken_link",
      "qa_disabled_controls",
      "qa_api_error_copy",
      "qa_empty_body",
      "qa_coverage_gap",
    ],
    improvementKinds: ["test coverage", "regression checks", "evidence quality"],
  },
  "system-agent": {
    ownedCategories: ["system", "navigation"],
    allowedDetectorIds: [
      "system_module_missing",
      "system_empty_body",
      "system_blocked_route",
      "system_shell_failure",
    ],
    improvementKinds: ["module readiness", "operator visibility"],
  },
  "logs-agent": {
    ownedCategories: ["observability", "functional"],
    allowedDetectorIds: [
      "logs_console_errors",
      "logs_failed_network",
      "logs_missing_telemetry",
      "logs_api_error_copy",
    ],
    improvementKinds: ["observability", "traceability"],
  },
  "runtime-agent": {
    ownedCategories: ["runtime"],
    allowedDetectorIds: [
      "runtime_execution_visibility",
      "runtime_schedule_gap",
      "runtime_worker_signal",
    ],
    improvementKinds: ["schedule clarity", "execution visibility"],
  },
  "config-agent": {
    ownedCategories: ["config"],
    allowedDetectorIds: [
      "config_risk_signal",
      "config_safety_gate",
      "config_env_gap",
    ],
    improvementKinds: ["config safety", "environment clarity"],
  },
  "issue-agent": {
    ownedCategories: ["issue_lifecycle", "functional"],
    allowedDetectorIds: [
      "issue_evidence_incomplete",
      "issue_dedupe_candidate",
      "issue_lifecycle_gap",
    ],
    improvementKinds: ["triage", "dedupe", "verification criteria"],
  },
  "fix-agent": {
    ownedCategories: ["repairability", "functional"],
    allowedDetectorIds: [
      "fix_handoff_incomplete",
      "fix_repro_unclear",
      "fix_page_load_failure",
    ],
    improvementKinds: ["fix handoff quality", "repro steps"],
  },
  "memory-agent": {
    ownedCategories: ["memory"],
    allowedDetectorIds: [
      "memory_surface_gap",
      "memory_hermes_visibility",
      "memory_hygiene_signal",
    ],
    improvementKinds: ["memory hygiene", "recall clarity"],
  },
  "evolution-agent": {
    ownedCategories: ["evolution"],
    allowedDetectorIds: [
      "evolution_recurring_pattern",
      "evolution_improvement_opportunity",
      "evolution_regression_signal",
    ],
    improvementKinds: ["pattern learning", "future risk"],
  },
  "chat-agent": {
    ownedCategories: ["chat_ux", "ux"],
    allowedDetectorIds: [
      "chat_messenger_gap",
      "chat_composer_clarity",
      "chat_empty_thread",
    ],
    improvementKinds: ["conversation UX", "messenger clarity"],
  },
  "analytics-agent": {
    ownedCategories: ["analytics"],
    allowedDetectorIds: [
      "analytics_surface_gap",
      "analytics_metric_missing",
      "analytics_report_empty",
    ],
    improvementKinds: ["metrics readiness", "report clarity"],
  },
};

export function getAgentRoleDetectorPack(agentSlug: string): AgentRoleDetectorPack {
  const slug = agentSlug.trim().toLowerCase();
  const base = PACKS[slug];
  const perspective = getBrowserQaPerspective(slug);
  if (!base) {
    return {
      agentSlug: slug,
      ownedCategories: ["functional", "navigation"],
      allowedDetectorIds: ["qa_page_load_failure", "qa_http_error", "qa_broken_link"],
      improvementKinds: perspective.focusAreas,
      shouldPromoteIssues: perspective.shouldPromoteIssues,
      findingLens: perspective.findingLens,
      improvementLens: perspective.improvementLens,
    };
  }
  return {
    agentSlug: slug,
    ...base,
    shouldPromoteIssues: perspective.shouldPromoteIssues,
    findingLens: perspective.findingLens,
    improvementLens: perspective.improvementLens,
  };
}

export function listAgentRoleDetectorPacks(): AgentRoleDetectorPack[] {
  return CANONICAL_AGENTS.map((agent) => getAgentRoleDetectorPack(agent.id));
}

/**
 * Map legacy scanner category/issue text → role finding category + detector id.
 */
export function classifyFindingForAgentPack(input: {
  agentSlug: string;
  category?: string | null;
  issue: string;
}): { allowed: boolean; detectorId: string; roleCategory: RoleFindingCategory } {
  const pack = getAgentRoleDetectorPack(input.agentSlug);
  const issue = input.issue.toLowerCase();
  const category = (input.category ?? "").toLowerCase();

  let detectorId = "qa_http_error";
  let roleCategory: RoleFindingCategory = "functional";

  if (/slow page load/.test(issue)) {
    detectorId = "perf_slow_load";
    roleCategory = "performance";
  } else if (/missing primary page header|no h1/.test(issue)) {
    detectorId = "design_missing_h1";
    roleCategory = "design";
  } else if (/empty main|sparse|uninitialized/.test(issue)) {
    detectorId =
      pack.agentSlug === "design-agent" ? "design_sparse_main" : "qa_empty_body";
    roleCategory = pack.agentSlug === "design-agent" ? "design" : "functional";
  } else if (/hydration stall/.test(issue)) {
    detectorId = "design_hydration_stall";
    roleCategory = "design";
  } else if (/failed to load|http\s*[45]\d\d|page failed/.test(issue)) {
    detectorId =
      pack.agentSlug === "fix-agent" ? "fix_page_load_failure" : "qa_page_load_failure";
    roleCategory = "functional";
  } else if (/linked route probe|broken link|#|javascript:void/.test(issue)) {
    detectorId = "qa_broken_link";
    roleCategory = "navigation";
  } else if (/disabled button/.test(issue)) {
    detectorId = "qa_disabled_controls";
    roleCategory = "functional";
  } else if (/console|network|failed request|telemetry/.test(issue)) {
    detectorId = "logs_console_errors";
    roleCategory = "observability";
  } else if (category === "ui" || category === "ux") {
    detectorId = "design_improvement_hierarchy";
    roleCategory = category === "ui" ? "ui" : "ux";
  } else if (category === "functional") {
    detectorId = "qa_http_error";
    roleCategory = "functional";
  } else if (category === "navigation") {
    detectorId = "qa_broken_link";
    roleCategory = "navigation";
  }

  const allowed =
    pack.allowedDetectorIds.includes(detectorId) ||
    pack.ownedCategories.includes(roleCategory);

  // Performance slow-load is never owned by design-agent under role-first law.
  if (detectorId === "perf_slow_load" && pack.agentSlug === "design-agent") {
    return { allowed: false, detectorId, roleCategory };
  }
  // Design-only detectors must not promote for non-design agents.
  if (detectorId.startsWith("design_") && pack.agentSlug !== "design-agent") {
    return { allowed: false, detectorId, roleCategory };
  }

  return { allowed, detectorId, roleCategory };
}

export function filterFindingsForAgentRole<T extends { issue: string; evidence?: Record<string, unknown> }>(
  agentSlug: string,
  findings: T[],
): T[] {
  const pack = getAgentRoleDetectorPack(agentSlug);
  if (!pack.shouldPromoteIssues) {
    // Evolution-style agents keep observations but do not promote product issues.
    // Still return improvement-shaped findings tagged as non-promoting.
    return findings.filter((finding) => {
      const classified = classifyFindingForAgentPack({
        agentSlug,
        category:
          typeof finding.evidence?.category === "string"
            ? finding.evidence.category
            : null,
        issue: finding.issue,
      });
      return classified.allowed && classified.roleCategory === "evolution";
    });
  }

  return findings.filter((finding) => {
    const classified = classifyFindingForAgentPack({
      agentSlug,
      category:
        typeof finding.evidence?.category === "string"
          ? finding.evidence.category
          : null,
      issue: finding.issue,
    });
    return classified.allowed;
  });
}
