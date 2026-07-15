/**
 * Phase Agents A — source contract verify for silent Refresh + embedded Council shell.
 * Does not hit network. Fail = ACDL/UX stability regression for Agents page.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENTOPS AGENTS PHASE A REGRESSION: ${message}`);
  }
}

function main(): void {
  const gate = read("src/components/agentops/owner/useAgentOpsOwnerGate.ts");
  assert(gate.includes("initialLoading"), "owner gate must expose initialLoading");
  assert(gate.includes("refreshing"), "owner gate must expose refreshing");
  assert(gate.includes("silent"), "owner gate refresh must support silent mode");
  assert(
    gate.includes("hasValidatedRef"),
    "owner gate must avoid re-blocking after first validation",
  );

  const monitoring = read("src/components/agentops/owner/useAgentOpsMonitoringStatus.ts");
  assert(monitoring.includes("refreshing"), "monitoring hook must expose refreshing");
  assert(
    monitoring.includes("preserveOnError"),
    "monitoring soft refresh must preserve prior data on error",
  );

  const agentsPage = read("src/app/system/agent-ops/agents/page.tsx");
  assert(
    agentsPage.includes("refreshGate({ silent: true })"),
    "Agents Refresh must call silent gate refresh",
  );
  assert(
    agentsPage.includes("loading={initialLoading}"),
    "Agents shell must block only on initialLoading",
  );
  assert(
    agentsPage.includes("enabled={isOwner}"),
    "Council embed must stay enabled across silent refresh",
  );
  assert(
    !agentsPage.includes("enabled={isOwner && !gateLoading}"),
    "Council must not disable when soft-refreshing",
  );
  assert(
    agentsPage.includes("Refreshing…"),
    "Refresh button must show Refreshing… state",
  );

  const card = read("src/components/agentops/owner/AgentOpsCouncilChatCard.tsx");
  assert(card.includes('layoutMode="embedded"'), "Agents Council must use embedded layout");
  assert(!card.includes("max-h-[520px]"), "embedded shell must not use max-h-[520px]");
  assert(!card.includes("min-h-[320px]"), "embedded shell must not use min-h-[320px]");
  assert(
    !card.includes('title="Council chat"'),
    "success feedback must not use full-width AixiaInfoBlock",
  );
  assert(card.includes("clearChatFeedback"), "feedback must auto-clear via clearChatFeedback");

  const shell = read("src/components/aixia/AixiaMessengerShell.tsx");
  assert(shell.includes("layoutMode"), "messenger shell must accept layoutMode");
  assert(shell.includes('data-messenger-layout={layoutMode}'), "layout mode must be data attribute");
  assert(shell.includes("block: \"nearest\""), "dock scrollIntoView must use nearest (not end)");

  const css = read("src/styles/aixia-design-system.css");
  assert(css.includes(".aixia-messenger-shell--embedded"), "embedded CSS class required");
  assert(css.includes(".aixia-messenger-shell--full"), "full CSS class required");
  assert(css.includes("min-height: 400px"), "embedded viewport min-height 400px required");
  assert(css.includes("flex: 0 0 auto"), "shell must not flex-shrink by default");
  assert(
    css.includes("clamp(620px, 70vh, 760px)"),
    "embedded height clamp targeting ~680px required",
  );


  const councilPage = read("src/app/system/agent-ops/council/page.tsx");
  assert(councilPage.includes('layoutMode="full"'), "council page messenger must use full layout");

  // Focus refetch regression: Agents page must not add visibility listeners
  assert(
    !agentsPage.includes("visibilitychange") && !agentsPage.includes("visibilityState"),
    "Agents page must not listen to visibilitychange",
  );
  assert(!agentsPage.includes("addEventListener(\"focus\""), "Agents page must not focus-refetch");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "silent-owner-gate",
          "monitoring-preserve-on-error",
          "agents-non-blocking-refresh",
          "council-embed-layout",
          "full-council-layout",
          "css-viewport-floor",
          "no-focus-refetch-listeners",
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
