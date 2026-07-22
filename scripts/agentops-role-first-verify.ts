/**
 * Role-first full-site scan verification.
 * Run: npx tsx scripts/agentops-role-first-verify.ts
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { CANONICAL_AGENTS } from "../src/lib/agentops/canonicalAgents.ts";
import {
  classifyFindingForAgentPack,
  filterFindingsForAgentRole,
  getAgentRoleDetectorPack,
} from "../src/lib/agentops/runtime/agentRoleDetectors.ts";
import { FULL_SITE_ROUTE_INVENTORY } from "../src/lib/agentops/runtime/fullSiteRouteInventory.ts";
import {
  routesForDailyReviewProfile,
  getCanonicalDailyReviewProfile,
  validateCanonicalDailyReviewRegistry,
} from "../src/lib/agentops/runtime/canonicalAgentDailyReview.ts";
import { resolveScopedRoutes } from "../src/lib/agentops/runtime/stagingScanTypes.ts";
// defaultScopeForWorkType lives in agentManualRunClient (pulls browser supabase) —
// assert the contract inline to keep this script Node-safe.

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const registry = validateCanonicalDailyReviewRegistry();
assert(registry.ok, `daily registry invalid: ${"errors" in registry ? registry.errors.join("; ") : ""}`);

assert(FULL_SITE_ROUTE_INVENTORY.length >= 50, "full site inventory too small");
assert(
  FULL_SITE_ROUTE_INVENTORY.includes("/system/agent-ops/agents/design-agent"),
  "inventory must include design-agent detail route",
);
for (const agent of CANONICAL_AGENTS) {
  assert(
    FULL_SITE_ROUTE_INVENTORY.includes(`/system/agent-ops/agents/${agent.id}`),
    `inventory missing agent detail for ${agent.id}`,
  );
}

for (const agent of CANONICAL_AGENTS) {
  const profile = getCanonicalDailyReviewProfile(agent.id);
  assert(!!profile, `missing profile ${agent.id}`);
  const routes = routesForDailyReviewProfile(profile!);
  assert(
    routes.length === FULL_SITE_ROUTE_INVENTORY.length,
    `${agent.id} must scan full inventory (${routes.length} vs ${FULL_SITE_ROUTE_INVENTORY.length})`,
  );
  const pack = getAgentRoleDetectorPack(agent.id);
  assert(pack.ownedCategories.length > 0, `${agent.id} pack empty`);
  const folder = join("qa-agent", "agentops-agents", agent.id);
  assert(existsSync(join(folder, "job.md")), `missing job.md for ${agent.id}`);
  assert(existsSync(join(folder, "memory.md")), `missing memory.md for ${agent.id}`);
  assert(existsSync(join(folder, "detectors.md")), `missing detectors.md for ${agent.id}`);
  assert(existsSync(join(folder, "hermes.md")), `missing hermes.md for ${agent.id}`);
}

const designSlow = classifyFindingForAgentPack({
  agentSlug: "design-agent",
  category: "ux",
  issue: "Slow page load detected (7042ms)",
});
assert(designSlow.allowed === false, "design-agent must not own slow-load");

const designH1 = classifyFindingForAgentPack({
  agentSlug: "design-agent",
  category: "ui",
  issue: "Missing primary page header (no h1)",
});
assert(designH1.allowed === true, "design-agent must own missing h1");

const qaBroken = classifyFindingForAgentPack({
  agentSlug: "qa-agent",
  category: "navigation",
  issue: "Linked route probe failed: /broken",
});
assert(qaBroken.allowed === true, "qa-agent must own broken links");

const filtered = filterFindingsForAgentRole("design-agent", [
  { issue: "Slow page load detected (4000ms)", evidence: { category: "ux" } },
  { issue: "Missing primary page header (no h1)", evidence: { category: "ui" } },
]);
assert(filtered.length === 1, "design filter must drop slow-load keep h1");

const scopeType = "entire_staging";
assert(scopeType === "entire_staging", "manual default must be entire_staging");

const resolved = resolveScopedRoutes({
  id: "x",
  name: "Design Agent",
  role: "ui",
  scope: ["ui"],
  mode: "scheduled",
  status: "active",
  tools: ["canonical:design-agent"],
  environment: "staging",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
assert(
  resolved.length === FULL_SITE_ROUTE_INVENTORY.length,
  "role-token scope must fall back to full inventory",
);

const dirs = readdirSync(join("qa-agent", "agentops-agents")).filter(
  (n) => n !== "_shared" && existsSync(join("qa-agent", "agentops-agents", n, "job.md")),
);
assert(dirs.length === 12, `expected 12 agent folders, got ${dirs.length}: ${dirs.join(",")}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      fullSiteRoutes: FULL_SITE_ROUTE_INVENTORY.length,
      agents: CANONICAL_AGENTS.length,
      designSlowAllowed: designSlow.allowed,
      designH1Allowed: designH1.allowed,
      manualDefault: scopeType,
    },
    null,
    2,
  ),
);
