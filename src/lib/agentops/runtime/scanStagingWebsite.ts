/**
 * Real Playwright staging scan entry — replaces mock implementation.
 */

import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import { runPlaywrightStagingScan, type PlaywrightStagingScanOptions } from "./playwrightStagingScanner";
import type { StagingScanFinding } from "./stagingScanTypes";

export type { StagingScanFinding, StagingScanSeverity } from "./stagingScanTypes";
export {
  DEFAULT_SCAN_ROUTES,
  buildAbsolutePageUrl,
  normalizeRoute,
  resolveScopedRoutes,
} from "./stagingScanTypes";

export type ScanStagingWebsiteOptions = PlaywrightStagingScanOptions;

/**
 * Scan the staging website for one agent using Playwright (headless Chromium).
 * Requires Node.js worker/runtime — not for browser UI bundles.
 */
export async function scanStagingWebsite(
  agent: AgentOpsRuntimeAgentRow,
  stagingUrl: string,
  options: ScanStagingWebsiteOptions = {},
): Promise<StagingScanFinding[]> {
  return runPlaywrightStagingScan(agent, stagingUrl, options);
}
