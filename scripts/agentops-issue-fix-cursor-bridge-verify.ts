/**
 * Phase E-A7 — static verify for the issue detail Fix-with-Cursor bridge UI.
 * Usage: npm run agentops:issue-fix-cursor-bridge-verify
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function read(rel: string): string {
  const full = join(REPO_ROOT, rel);
  if (!existsSync(full)) {
    fail(`Missing file: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustInclude(rel: string, needle: string): void {
  if (!read(rel).includes(needle)) fail(`${rel} must include ${JSON.stringify(needle)}`);
}

function mustNotInclude(rel: string, needle: string): void {
  if (read(rel).includes(needle)) fail(`${rel} must NOT include ${JSON.stringify(needle)}`);
}

const DETAIL = "src/app/system/agent-ops/issues/[issueCode]/page.tsx";
const CLIENT = "src/lib/agentops/findings/cursorBridgeClient.ts";
const BRIDGE = "scripts/agentops-cursor-bridge.mjs";
const PKG = "package.json";

function main(): void {
  // Bridge client
  mustInclude(CLIENT, 'export const CURSOR_BRIDGE_URL = "http://127.0.0.1:17876"');
  mustInclude(CLIENT, "X-Bridge-Token");
  mustInclude(CLIENT, 'branch: "staging"');
  mustInclude(CLIENT, "probeCursorBridge");
  mustInclude(CLIENT, "sendFixIssueToBridge");
  mustNotInclude(CLIENT, "service_role");
  mustNotInclude(CLIENT, "SERVICE_ROLE");

  // UI detection + honest states
  mustInclude(DETAIL, "probeCursorBridge");
  mustInclude(DETAIL, "sendFixIssueToBridge");
  mustInclude(DETAIL, 'data-testid="agentops-bridge-status"');
  mustInclude(DETAIL, 'data-testid="agentops-bridge-help"');
  mustInclude(DETAIL, "Local bridge connected");
  mustInclude(DETAIL, "Local Cursor bridge is not running.");
  mustInclude(DETAIL, "Cursor opened with this fix prompt.");
  mustInclude(DETAIL, "CURSOR_BRIDGE_START_COMMAND");
  // No auto-download when bridge is online — bridge writes the file locally.
  mustInclude(DETAIL, "no download dialog — the bridge writes the prompt file locally");
  // Fallback keeps manual Download prompt / Copy prompt controls.
  mustInclude(DETAIL, 'data-testid="agentops-download-prompt"');
  mustInclude(DETAIL, "Copy prompt");
  // Status model: Fixing only after handoff/bridge accept; Fixed needs confirmation.
  mustInclude(DETAIL, "markFixingAfterHandoff");
  mustInclude(DETAIL, 'data-testid="agentops-mark-fixed-confirm"');
  // Offline path must not mark Fixing.
  const detailSource = read(DETAIL);
  const offlineBlock = detailSource.split("// Bridge offline: honest fallback")[1] ?? "";
  if (offlineBlock && offlineBlock.slice(0, 400).includes("markFixingAfterHandoff")) {
    fail("Offline fallback must not mark the issue Fixing");
  }

  // Bridge script safety recap (full checks live in agentops:cursor-bridge-verify)
  mustInclude(BRIDGE, 'const HOST = "127.0.0.1"');
  mustInclude(BRIDGE, "server.listen(PORT, HOST");
  mustInclude(BRIDGE, "not_supported_by_cursor");
  mustNotInclude(BRIDGE, "0.0.0.0");

  // npm scripts registered
  mustInclude(PKG, '"agentops:cursor-bridge"');
  mustInclude(PKG, '"agentops:cursor-bridge-verify"');
  mustInclude(PKG, '"agentops:issue-fix-cursor-bridge-verify"');

  // Bridge artifacts are gitignored
  mustInclude(".gitignore", ".agentops/");

  if (failures.length > 0) {
    console.error("AGENTOPS ISSUE FIX CURSOR BRIDGE VERIFY — FAILED");
    for (const item of failures) console.error(`  - ${item}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:issue-fix-cursor-bridge-verify",
      checks: [
        "bridge_client_localhost",
        "bridge_token_header",
        "staging_branch_payload",
        "ui_detects_bridge_online_offline",
        "no_auto_download_when_online",
        "fallback_download_copy",
        "fixing_after_bridge_accept_only",
        "fixed_requires_confirmation",
        "bridge_localhost_only",
        "honest_auto_fix_status",
        "npm_scripts_registered",
        "bridge_artifacts_gitignored",
      ],
    }),
  );
}

main();
