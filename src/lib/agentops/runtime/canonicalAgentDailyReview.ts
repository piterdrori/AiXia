/**
 * Phase 5H — canonical 12-agent daily website review registry (code source of truth).
 */

import { AGENT_IDENTITY_DEFINITIONS } from "../agents/agentIdentityDefinitions";
import { AGENT_HUMAN_ROLE, AGENT_RESPONSIBILITY_SUMMARY } from "../agents/productAgentDisplay";
import { getBrowserQaPerspective } from "../browserQa/browserQaAgentPerspective";
import { CANONICAL_AGENTS, EXPECTED_AGENT_COUNT } from "../canonicalAgents";

export const AGENT_USERNAME_PREFIX = "@aixia.";

export type DailyFindingKind = "ERROR" | "IMPROVEMENT" | "NEW_FEATURE" | "OBSERVATION" | "NO_FINDING";

export type CanonicalAgentDailyReviewProfile = {
  agentSlug: string;
  displayName: string;
  username: string;
  jobTitle: string;
  jobDescription: string;
  primaryResponsibility: string;
  secondaryResponsibility: string;
  routeModules: string[];
  errorCategories: string[];
  improvementCategories: string[];
  canProposeFeatures: boolean;
  perspectiveTitle: string;
  forbiddenActions: string[];
};

const MODULE_ROUTES: Record<string, string[]> = {
  "agent-ops": [
    "/system/agent-ops",
    "/system/agent-ops/agents",
    "/system/agent-ops/issues",
    "/system/agent-ops/tools",
    "/system/agent-ops/memory",
  ],
  finance: ["/finance/transactions", "/finance/master-data", "/finance/reports"],
  dashboard: ["/dashboard"],
  calendar: ["/calendar"],
  projects: ["/projects"],
  tasks: ["/tasks"],
};

function buildUsername(slug: string): string {
  return `${AGENT_USERNAME_PREFIX}${slug}`;
}

function routesForModules(modules: string[]): string[] {
  const routes = modules.flatMap((module) => MODULE_ROUTES[module] ?? []);
  return [...new Set(routes)];
}

const FEATURE_CAPABLE_AGENTS = new Set([
  "evolution-agent",
  "analytics-agent",
  "design-agent",
  "chat-agent",
  "issue-agent",
]);

function buildProfile(slug: string, modules: string[]): CanonicalAgentDailyReviewProfile {
  const identity = AGENT_IDENTITY_DEFINITIONS[slug];
  const perspective = getBrowserQaPerspective(slug);
  return {
    agentSlug: slug,
    displayName: identity?.displayName ?? slug,
    username: buildUsername(slug),
    jobTitle: AGENT_HUMAN_ROLE[slug] ?? identity?.role ?? slug,
    jobDescription: identity?.mission ?? AGENT_RESPONSIBILITY_SUMMARY[slug] ?? "",
    primaryResponsibility: identity?.responsibilities[0] ?? perspective.findingLens,
    secondaryResponsibility: identity?.responsibilities[1] ?? perspective.improvementLens,
    routeModules: modules,
    errorCategories: [
      "broken_functionality",
      "regression",
      "navigation_failure",
      "accessibility_failure",
      "performance_problem",
      "content_error",
      "state_integrity",
      "configuration_risk",
    ],
    improvementCategories: perspective.focusAreas,
    canProposeFeatures: FEATURE_CAPABLE_AGENTS.has(slug),
    perspectiveTitle: perspective.title,
    forbiddenActions: identity?.forbiddenActions ?? [],
  };
}

const AGENT_MODULE_MAP: Record<string, string[]> = {
  "system-agent": ["agent-ops", "dashboard"],
  "memory-agent": ["agent-ops"],
  "issue-agent": ["agent-ops"],
  "evolution-agent": ["agent-ops", "finance", "dashboard"],
  "fix-agent": ["agent-ops", "finance"],
  "qa-agent": ["agent-ops", "finance", "dashboard", "calendar", "projects", "tasks"],
  "design-agent": ["agent-ops", "finance", "dashboard"],
  "runtime-agent": ["agent-ops"],
  "logs-agent": ["agent-ops"],
  "config-agent": ["agent-ops", "finance"],
  "chat-agent": ["agent-ops", "dashboard"],
  "analytics-agent": ["agent-ops", "finance", "dashboard"],
};

export const CANONICAL_DAILY_REVIEW_PROFILES: CanonicalAgentDailyReviewProfile[] = CANONICAL_AGENTS.map(
  (agent) => buildProfile(agent.id, AGENT_MODULE_MAP[agent.id] ?? ["agent-ops"]),
);

export function getCanonicalDailyReviewProfile(slug: string): CanonicalAgentDailyReviewProfile | null {
  return CANONICAL_DAILY_REVIEW_PROFILES.find((profile) => profile.agentSlug === slug) ?? null;
}

export function routesForDailyReviewProfile(profile: CanonicalAgentDailyReviewProfile): string[] {
  return routesForModules(profile.routeModules);
}

export function canonicalAgentUsernameToolTag(username: string): string {
  return `username:${username}`;
}

export function parseUsernameFromTools(tools: string[] | null | undefined): string | null {
  for (const tool of tools ?? []) {
    if (typeof tool === "string" && tool.startsWith("username:")) {
      return tool.slice("username:".length);
    }
  }
  return null;
}

export type DailyRegistryValidationResult =
  | { ok: true; profiles: CanonicalAgentDailyReviewProfile[] }
  | { ok: false; errors: string[] };

export function validateCanonicalDailyReviewRegistry(): DailyRegistryValidationResult {
  const errors: string[] = [];
  if (CANONICAL_DAILY_REVIEW_PROFILES.length !== EXPECTED_AGENT_COUNT) {
    errors.push(
      `Expected ${EXPECTED_AGENT_COUNT} canonical daily profiles, found ${CANONICAL_DAILY_REVIEW_PROFILES.length}.`,
    );
  }

  const usernames = new Set<string>();
  for (const profile of CANONICAL_DAILY_REVIEW_PROFILES) {
    if (!profile.username.startsWith(AGENT_USERNAME_PREFIX)) {
      errors.push(`${profile.agentSlug}: invalid username ${profile.username}`);
    }
    if (usernames.has(profile.username)) {
      errors.push(`Duplicate username: ${profile.username}`);
    }
    usernames.add(profile.username);

    if (!profile.jobTitle.trim()) errors.push(`${profile.agentSlug}: missing job title`);
    if (!profile.jobDescription.trim()) errors.push(`${profile.agentSlug}: missing job description`);
    if (!profile.primaryResponsibility.trim()) {
      errors.push(`${profile.agentSlug}: missing primary responsibility`);
    }
    if (routesForDailyReviewProfile(profile).length === 0) {
      errors.push(`${profile.agentSlug}: no routes in scope`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, profiles: CANONICAL_DAILY_REVIEW_PROFILES };
}
