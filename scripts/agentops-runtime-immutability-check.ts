/**
 * Runtime immutability CI gate — 4-surface freeze, route lock, import boundary, structure tokens.
 * Usage: npx tsx scripts/agentops-runtime-immutability-check.ts
 */
import fs from "node:fs";
import path from "node:path";

import {
  ALLOWED_RUNTIME_ROUTES,
  EXPECTED_RUNTIME_SURFACE_COUNT,
  FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES,
  RUNTIME_IMMUTABILITY_REGRESSION_LABEL,
  RUNTIME_SURFACE_PAGE_PATHS,
  RUNTIME_UI_COMPONENT_PATHS,
  validateForbiddenRuntimeImports,
  validateForbiddenRuntimeStructureTokens,
  validateRuntimePageImports,
  validateRuntimeRouteRegistry,
  validateRuntimeSurfaceFileRegistry,
} from "../src/lib/agentops/runtime/acdlRuntimeImmutabilityGuard";

const REPO_ROOT = process.cwd();
const APP_ROUTER_PATH = "src/App.tsx";

const RUNTIME_SCAN_PATHS = [...RUNTIME_SURFACE_PAGE_PATHS, ...RUNTIME_UI_COMPONENT_PATHS];

/** Discover runtime observatory page.tsx files under agent-ops (must stay at 4). */
function discoverRuntimeSurfacePages(): string[] {
  const agentOpsRoot = path.join(REPO_ROOT, "src/app/system/agent-ops");
  const hits: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "page.tsx") continue;
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      const isHub = rel === "src/app/system/agent-ops/runtime/page.tsx";
      const isMemory = rel === "src/app/system/agent-ops/memory/page.tsx";
      const isIssuesRuntime = rel === "src/app/system/agent-ops/issues/runtime/page.tsx";
      const isAgentsRuntime = rel === "src/app/system/agent-ops/agents/runtime/page.tsx";
      if (isHub || isMemory || isIssuesRuntime || isAgentsRuntime) {
        hits.push(rel);
      }
    }
  }

  walk(agentOpsRoot);
  return hits.sort();
}

function readLines(relPath: string): string[] {
  const full = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(full)) return [];
  return fs.readFileSync(full, "utf8").split(/\r?\n/);
}

function extractImportLines(lines: string[]): string[] {
  return lines.filter((line) => /^\s*import\s/.test(line));
}

function extractAppRoutePaths(appSource: string): string[] {
  const paths: string[] = [];
  const routePattern = /path="(\/system\/agent-ops[^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = routePattern.exec(appSource)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

function validateLegacyRedirectPages(): string[] {
  const failures: string[] = [];
  const redirectPages = [
    "src/app/system/agent-ops/evolution/page.tsx",
    "src/app/system/agent-ops/fix/page.tsx",
    "src/app/system/agent-ops/config/page.tsx",
  ];

  for (const rel of redirectPages) {
    const text = readLines(rel).join("\n");
    if (!text.includes("<Navigate")) {
      failures.push(`${rel}: legacy redirect page must use <Navigate> only`);
    }
    if (/AixiaHero|AixiaTable|fetchRuntime/.test(text)) {
      failures.push(`${rel}: legacy redirect page must not mount observatory UI`);
    }
  }

  return failures;
}

function main() {
  const failures: string[] = [];

  const appSource = fs.readFileSync(path.join(REPO_ROOT, APP_ROUTER_PATH), "utf8");
  const appLines = appSource.split(/\r?\n/);
  const routePaths = extractAppRoutePaths(appSource);

  failures.push(...validateRuntimeRouteRegistry(routePaths));
  failures.push(...validateRuntimePageImports(extractImportLines(appLines)));

  const discoveredSurfaces = discoverRuntimeSurfacePages();
  failures.push(...validateRuntimeSurfaceFileRegistry(discoveredSurfaces));

  for (const rel of RUNTIME_SCAN_PATHS) {
    const lines = readLines(rel);
    if (lines.length === 0) {
      failures.push(`${rel}: missing runtime scan target`);
      continue;
    }
    failures.push(...validateForbiddenRuntimeImports(rel, extractImportLines(lines)));
    failures.push(...validateForbiddenRuntimeStructureTokens(rel, lines));
  }

  failures.push(...validateLegacyRedirectPages());

  const output = {
    pass: failures.length === 0,
    regressionLabel: RUNTIME_IMMUTABILITY_REGRESSION_LABEL,
    allowedRuntimeRoutes: [...ALLOWED_RUNTIME_ROUTES],
    frozenLegacyRedirectRoutes: [...FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES],
    expectedSurfaceCount: EXPECTED_RUNTIME_SURFACE_COUNT,
    discoveredSurfacePages: discoveredSurfaces,
    scannedUiPaths: RUNTIME_SCAN_PATHS.length,
    appRouterPath: APP_ROUTER_PATH,
    failureCount: failures.length,
    failures,
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.pass) process.exitCode = 1;
}

main();
