/**
 * Authenticated design-agent website_audit dry-run (role-first).
 *
 *   npx tsx scripts/agentops-design-agent-role-first-dry-run.ts
 *   npx tsx scripts/agentops-design-agent-role-first-dry-run.ts --all
 *   npx tsx scripts/agentops-design-agent-role-first-dry-run.ts --max-routes 12
 *   npx tsx scripts/agentops-design-agent-role-first-dry-run.ts --routes /system/agent-ops/agents/design-agent,/dashboard
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FULL_SITE_ROUTE_INVENTORY } from "../src/lib/agentops/runtime/fullSiteRouteInventory.ts";
import {
  classifyFindingForAgentPack,
  filterFindingsForAgentRole,
} from "../src/lib/agentops/runtime/agentRoleDetectors.ts";
import { scanStagingWebsite } from "../src/lib/agentops/runtime/scanStagingWebsite.ts";
import type { AgentOpsRuntimeAgentRow } from "../src/lib/agentops/db/agentOpsRuntimeTypes.ts";

const STAGING_URL =
  process.env.STAGING_APP_URL?.trim() || "https://ai-xia-staging.vercel.app";

function parseArgs(argv: string[]) {
  const all = argv.includes("--all");
  const maxIdx = argv.indexOf("--max-routes");
  const routesIdx = argv.indexOf("--routes");
  const maxRoutes =
    maxIdx >= 0 ? Number(argv[maxIdx + 1]) : all ? FULL_SITE_ROUTE_INVENTORY.length : 12;
  const routeOverride =
    routesIdx >= 0
      ? String(argv[routesIdx + 1] || "")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : null;
  return {
    maxRoutes: Number.isFinite(maxRoutes) && maxRoutes > 0 ? maxRoutes : 12,
    expandSubpages: argv.includes("--expand-subpages"),
    routeOverride,
  };
}

async function main() {
  const { maxRoutes, expandSubpages, routeOverride } = parseArgs(process.argv.slice(2));
  const agent: AgentOpsRuntimeAgentRow = {
    id: "dry-run-design-agent",
    name: "Design Agent",
    role: "ui",
    scope: ["ui"],
    mode: "manual",
    status: "active",
    tools: ["canonical:design-agent"],
    environment: "staging",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const effectiveMax = routeOverride?.length ?? maxRoutes;
  console.log(
    JSON.stringify(
      {
        phase: "start",
        stagingUrl: STAGING_URL,
        inventorySize: FULL_SITE_ROUTE_INVENTORY.length,
        maxRoutes: effectiveMax,
        expandSubpages,
        routeOverride,
        agentSlug: "design-agent",
      },
      null,
      2,
    ),
  );

  const rawFindings = await scanStagingWebsite(agent, STAGING_URL, {
    maxRoutes: effectiveMax,
    expandSubpages,
    routes: routeOverride ?? undefined,
    screenshotDir: join("qa-agent", "browser-qa-artifacts", "role-first-design-dry-run"),
  });

  const promoted = filterFindingsForAgentRole("design-agent", rawFindings);
  const classifications = rawFindings.map((f) => {
    const category =
      typeof f.evidence?.category === "string" ? f.evidence.category : "ui";
    const decision = classifyFindingForAgentPack({
      agentSlug: "design-agent",
      category: category as "ui" | "functional" | "ux" | "navigation",
      issue: f.issue,
    });
    return {
      route: f.page_url,
      issue: f.issue,
      category,
      allowed: decision.allowed,
      detectorId: decision.detectorId,
      roleCategory: decision.roleCategory,
    };
  });

  const slowLoadPromoted = promoted.filter((f) =>
    /slow page load detected/i.test(f.issue),
  );
  const outOfPack = classifications.filter((c) => !c.allowed);

  const report = {
    ok: slowLoadPromoted.length === 0 && outOfPack.length === 0,
    stagingUrl: STAGING_URL,
    inventorySize: FULL_SITE_ROUTE_INVENTORY.length,
    routesScannedCap: effectiveMax,
    rawFindingCount: rawFindings.length,
    promotedCount: promoted.length,
    slowLoadPromoted: slowLoadPromoted.length,
    outOfPackCount: outOfPack.length,
    classifications,
    promoted: promoted.map((f) => ({
      route: f.page_url,
      issue: f.issue,
      category: f.evidence?.category ?? null,
    })),
  };

  const outDir = join("qa-agent", "browser-qa-artifacts", "role-first-design-dry-run");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `design-agent-dry-run-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[design-agent-role-first-dry-run] FAILED:", err);
  process.exit(1);
});
