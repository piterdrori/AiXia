/**
 * Verify slow-load metric + auth-gate skip for AgentOps staging scanner fix.
 * Run: npx tsx scripts/agentops-slow-load-metric-verify.ts
 */
import {
  detectStagingScanAuthGate,
  evaluateSlowPageLoadMetric,
} from "../src/lib/agentops/runtime/playwrightStagingScanner.ts";
import { classifyLikelyShellNoiseDraft } from "../src/lib/agentops/findings/issueDraftNoise.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Case matching the reported finding: ~4542ms nav + ~2500ms settle = 7042ms wall.
const reported = evaluateSlowPageLoadMetric({
  navigationMs: 4542,
  settleWaitMs: 2500,
  slowLoadThresholdMs: 3000,
});
assert(reported.wallClockMs === 7042, `wall expected 7042 got ${reported.wallClockMs}`);
assert(reported.shouldFlag === true, "nav 4542ms should still flag above 3000");
assert(reported.reportedMs === 4542, "reported ms must be navigation only");

// Typical SPA settle inflation that caused false positives under old wall-clock metric.
const settleInflated = evaluateSlowPageLoadMetric({
  navigationMs: 1800,
  settleWaitMs: 2500,
  slowLoadThresholdMs: 3000,
});
assert(settleInflated.wallClockMs === 4300, "wall includes settle");
assert(settleInflated.shouldFlag === false, "nav 1800ms must NOT flag (old metric would)");
assert(settleInflated.reportedMs === 1800, "report navigation only");

// Auth gate: unauthenticated website_audit hits Sign In, not Agent Detail.
const authBody =
  "Sign In Access your workspace Email Password Forgot password? Sign In Don't have an account? Create one";
assert(detectStagingScanAuthGate(authBody) === true, "sign-in body must detect auth gate");
assert(
  detectStagingScanAuthGate("Design Agent Control Center Schedule Results") === false,
  "agent detail body must not look like auth gate",
);

// Auth-gate + slow nav must not be promoted (product rule in scanner).
const shouldPromoteSlowLoad = reported.shouldFlag && !detectStagingScanAuthGate(authBody);
assert(shouldPromoteSlowLoad === false, "auth gate must suppress slow-load promotion");

// Legacy draft without measurement metadata → scanner noise on AgentOps route.
const noise = classifyLikelyShellNoiseDraft({
  title: "Improvement: Slow page load detected (7042ms)",
  summary: "Slow page load detected (7042ms)",
  route: "/system/agent-ops/agents/design-agent",
  module: "agent-ops",
  evidence: { load_time_ms: 7042 },
});
assert(noise.likelyShellNoise === true, "legacy slow-load draft should be scanner noise");
assert(
  (noise.badgeLabel || "").toLowerCase().includes("scanner"),
  `badge expected scanner noise, got ${noise.badgeLabel}`,
);

// Truthful new finding with navigation-only measurement should not auto-noise.
const real = classifyLikelyShellNoiseDraft({
  title: "Improvement: Slow page load detected (5200ms)",
  route: "/system/agent-ops/agents/design-agent",
  module: "agent-ops",
  evidence: {
    load_time_ms: 5200,
    navigation_ms: 5200,
    settle_wait_ms: 2500,
    measurement: "domcontentloaded",
    auth_gate: false,
  },
});
assert(real.likelyShellNoise === false, "truthful slow navigation must remain a real finding");

console.log(
  JSON.stringify(
    {
      ok: true,
      reportedFindingCase: reported,
      settleInflationCase: settleInflated,
      authGateSuppressesPromotion: !shouldPromoteSlowLoad,
      legacyDraftNoise: noise,
      truthfulSlowNav: real,
    },
    null,
    2,
  ),
);
