/**
 * Phase A.1 — static contract verify (not a LIVE_BROWSER substitute).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENTOPS AGENTS PHASE A.1 REGRESSION: ${message}`);
  }
}

function main(): void {
  const app = read("src/App.tsx");
  assert(app.includes("TOKEN_REFRESHED"), "auth listener must handle TOKEN_REFRESHED");
  assert(app.includes("silent: true"), "TOKEN_REFRESHED must refresh silently");
  assert(app.includes("RefreshAccessOptions"), "silent refresh options type required");
  assert(
    !/onAuthStateChange\(\(_event,\s*session\)\s*=>\s*\{[\s\S]*?void refreshAccessState\(session\);\s*\}\)/.test(
      app,
    ),
    "auth listener must not blindly remount via blocking refreshAccessState(session)",
  );

  const css = read("src/styles/aixia-design-system.css");
  assert(css.includes("clamp(780px, 82vh, 900px)"), "embedded shell clamp ~780–900px");
  assert(css.includes("min-height: 520px"), "embedded viewport min 520px");
  assert(css.includes("max-height: 190px"), "embedded dock capped ~190px");
  assert(css.includes(".aixia-section-body--council-embed"), "council embed body padding class");

  const shell = read("src/components/aixia/AixiaMessengerShell.tsx");
  assert(shell.includes("stickToBottom"), "scroll must stick only when near bottom");
  assert(shell.includes("distanceFromBottom"), "near-bottom distance check required");

  const composer = read("src/components/aixia/AixiaMessengerComposer.tsx");
  assert(composer.includes("rows={2}"), "composer default rows must be compact (2)");

  const council = read("src/components/agentops/owner/useAgentOpsCouncilChat.tsx");
  assert(
    council.includes("agentops.council.draft.agent-council"),
    "council draft local restore key required after remount loss",
  );
  assert(council.includes("writeCouncilDraft"), "draft must clear/persist");

  console.log(
    JSON.stringify(
      {
        ok: true,
        layer: "STATIC_CONTRACT_PASS",
        checks: [
          "silent-token-refresh",
          "embedded-780-shell",
          "viewport-520",
          "dock-190-cap",
          "near-bottom-scroll",
          "compact-composer",
          "council-draft-persist",
        ],
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
