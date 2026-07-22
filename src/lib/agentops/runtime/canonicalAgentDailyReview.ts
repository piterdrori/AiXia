/**
 * Phase 5H — canonical 12-agent daily website review registry (code source of truth).
 * Role-first: every agent reviews the full site; profiles define skills only (not route subsets).
 */

import { AGENT_IDENTITY_DEFINITIONS } from "../agents/agentIdentityDefinitions";
import { AGENT_HUMAN_ROLE, AGENT_RESPONSIBILITY_SUMMARY } from "../agents/productAgentDisplay";
import { getBrowserQaPerspective } from "../browserQa/browserQaAgentPerspective";
import { CANONICAL_AGENTS, EXPECTED_AGENT_COUNT } from "../canonicalAgents";
import { FULL_SITE_ROUTE_INVENTORY } from "./fullSiteRouteInventory";
import { getAgentRoleDetectorPack } from "./agentRoleDetectors";

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
  /** @deprecated Role-first: always full site. Kept for API compatibility. */
  routeModules: string[];
  errorCategories: string[];
  improvementCategories: string[];
  canProposeFeatures: boolean;
  perspectiveTitle: string;
  forbiddenActions: string[];
};

const FEATURE_CAPABLE_AGENTS = new Set([
  "evolution-agent",
  "analytics-agent",
  "design-agent",
  "chat-agent",
  "issue-agent",
]);

function buildUsername(slug: string): string {
  return `${AGENT_USERNAME_PREFIX}${slug}`;
}

function buildProfile(slug: string): CanonicalAgentDailyReviewProfile {
  const identity = AGENT_IDENTITY_DEFINITIONS[slug];
  const perspective = getBrowserQaPerspective(slug);
  const pack = getAgentRoleDetectorPack(slug);
  return {
    agentSlug: slug,
    displayName: identity?.displayName ?? slug,
    username: buildUsername(slug),
    jobTitle: AGENT_HUMAN_ROLE[slug] ?? identity?.role ?? slug,
    jobDescription: identity?.mission ?? AGENT_RESPONSIBILITY_SUMMARY[slug] ?? "",
    primaryResponsibility: identity?.responsibilities[0] ?? perspective.findingLens,
    secondaryResponsibility: identity?.responsibilities[1] ?? perspective.improvementLens,
    routeModules: ["full-site"],
    errorCategories: [...pack.ownedCategories],
    improvementCategories: [...pack.improvementKinds],
    canProposeFeatures: FEATURE_CAPABLE_AGENTS.has(slug),
    perspectiveTitle: perspective.title,
    forbiddenActions: identity?.forbiddenActions ?? [],
  };
}

export const CANONICAL_DAILY_REVIEW_PROFILES: CanonicalAgentDailyReviewProfile[] = CANONICAL_AGENTS.map(
  (agent) => buildProfile(agent.id),
);

export function getCanonicalDailyReviewProfile(slug: string): CanonicalAgentDailyReviewProfile | null {
  return CANONICAL_DAILY_REVIEW_PROFILES.find((profile) => profile.agentSlug === slug) ?? null;
}

/** Role-first: every agent gets the same full-site inventory. */
export function routesForDailyReviewProfile(
  _profile: CanonicalAgentDailyReviewProfile,
): string[] {
  return [...FULL_SITE_ROUTE_INVENTORY];
}

export function routesForModules(_modules: string[]): string[] {
  return [...FULL_SITE_ROUTE_INVENTORY];
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

export function assertCanonicalDailyReviewCount(): void {
  const result = validateCanonicalDailyReviewRegistry();
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
}
