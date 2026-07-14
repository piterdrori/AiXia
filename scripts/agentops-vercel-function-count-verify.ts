/**
 * Verify Vercel Hobby serverless function count — api route entry files only.
 * Usage: npm run agentops:vercel-function-count-verify
 */
import { execSync } from "node:child_process";

const MAX_FUNCTIONS = 12;
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function listTrackedApiRouteFiles(): string[] {
  const output = execSync('git ls-files "api/**/*.ts"', {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.includes("/_lib/"))
    .filter((file) => !file.endsWith(".d.ts"));
}

function main(): void {
  const routes = listTrackedApiRouteFiles();
  if (routes.length === 0) {
    fail("No tracked api/**/*.ts route files found.");
  }

  const helpersInApiRoot = routes.filter((file) => {
    const base = file.split("/").pop() ?? "";
    return (
      file.startsWith("api/agentops/") &&
      !file.includes("/global-memory/") &&
      !file.includes("/monitoring/") &&
      !file.includes("/cron/") &&
      base !== "hermes.ts" &&
      base !== "llm.ts" &&
      base !== "voice.ts" &&
      base !== "code-context-tools.ts" &&
      base !== "evidence-tools.ts" &&
      base !== "monitoring.ts"
    );
  });

  for (const helper of helpersInApiRoot) {
    fail(`Shared helper must move to api/**/_lib/: ${helper}`);
  }

  if (routes.length > MAX_FUNCTIONS) {
    fail(`Tracked API route count ${routes.length} exceeds Vercel Hobby limit ${MAX_FUNCTIONS}.`);
  }

  if (failures.length > 0) {
    console.error("AGENTOPS VERCEL FUNCTION COUNT VERIFY — FAILED");
    for (const message of failures) console.error(`  ✗ ${message}`);
    console.error(`  routes (${routes.length}):`, routes.join(", "));
    process.exit(1);
  }

  console.log("AGENTOPS VERCEL FUNCTION COUNT VERIFY — PASSED");
  console.log(`  tracked api route files: ${routes.length}/${MAX_FUNCTIONS}`);
  for (const route of routes) console.log(`    - ${route}`);
}

main();
