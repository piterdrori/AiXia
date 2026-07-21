/**
 * Phase D-G0 — pre-Issues comprehensive live QA for AgentOps pages (staging).
 * Does not start Issues workflow. Does not log secrets / commit storage_state.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
if (!email || !password) {
  console.error("Missing owner credentials");
  process.exit(2);
}

const DETAIL_AGENTS = [
  "system-agent",
  "design-agent",
  "qa-agent",
  "analytics-agent",
  "runtime-agent",
  "logs-agent",
];

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-g0-pre-issues");
fs.mkdirSync(outDir, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    // Known harmless filter: calendar/tasks HEAD abort shell noise
    if (/HEAD.*(calendar|tasks).*abort|net::ERR_ABORTED.*\/(calendar|tasks)/i.test(text)) {
      return;
    }
    consoleErrors.push({ url: page.url(), text: text.slice(0, 300) });
  }
});
page.on("pageerror", (err) => {
  pageErrors.push({ url: page.url(), text: String(err?.message || err).slice(0, 300) });
});
page.on("response", (res) => {
  if (res.status() >= 400 && /\/api\/agentops\//i.test(res.url())) {
    failedRequests.push({ url: res.url(), status: res.status() });
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

function bodyText() {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
}

function hasForbidden(text) {
  const bad = [
    /website is clean/i,
    /site is clean/i,
    /website has no issues/i,
    /OWNER STATUS:\s*ERROR/i,
    /LAST SCAN:\s*FAILED/i,
    /Routes reviewed/i,
  ];
  return bad.filter((re) => re.test(text)).map((re) => String(re));
}

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

async function overflowCheck() {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
}

// ---------- PAGE 1: overview ----------
await page.goto(`${base}/system/agent-ops`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForFunction(
  () => !/Loading…|Loading\.\.\./i.test(document.body.innerText) || /Healthy|Needs attention|Status unavailable/i.test(document.body.innerText),
  { timeout: 90_000 },
).catch(() => null);
await page.waitForTimeout(800);
const overviewText = await bodyText();
const overviewLinks = await page.evaluate(() => {
  const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "");
  return {
    agents: hrefs.some((h) => /\/system\/agent-ops\/agents\/?$/.test(h) || h.includes("/system/agent-ops/agents")),
    monitoring: hrefs.some((h) => h.includes("/system/agent-ops/monitoring")),
    issues: hrefs.some((h) => h.includes("/system/agent-ops/issues")),
    memory: hrefs.some((h) => h.includes("/system/agent-ops/memory")),
  };
});
await shot("overview-1440.png");
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await shot("overview-390.png");
const overviewOverflowMobile = await overflowCheck();
await page.setViewportSize({ width: 1440, height: 900 });

const overview = {
  loaded: /AgentOps|Control Center|Main AgentOps/i.test(overviewText),
  links: overviewLinks,
  forbidden: hasForbidden(overviewText),
  workerMention: /Worker online|Worker offline|Staging worker/i.test(overviewText),
  overflowMobile: overviewOverflowMobile.overflowX,
};

// ---------- PAGE 2: agents list ----------
await page.goto(`${base}/system/agent-ops/agents`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForFunction(
  () => document.querySelectorAll('a[href*="/system/agent-ops/agents/"]').length >= 6,
  { timeout: 90_000 },
).catch(() => null);
await page.waitForSelector('[data-testid="agentops-staging-worker-health-strip"]', {
  timeout: 60_000,
}).catch(() => null);
await page.waitForTimeout(800);
const agentsText = await bodyText();
const agentsProbe = await page.evaluate((slugs) => {
  const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "");
  const found = {};
  for (const slug of slugs) {
    found[slug] = hrefs.some((h) => h.includes(`/system/agent-ops/agents/${slug}`));
  }
  const health = document.querySelector('[data-testid="agentops-staging-worker-health-strip"]');
  return {
    found,
    cardCount: document.querySelectorAll("a[href*='/system/agent-ops/agents/']").length,
    textHasConnected: /Connected/i.test(document.body.innerText),
    textHasHermes: /Hermes/i.test(document.body.innerText),
    workerStrip: (health?.textContent || "").replace(/\s+/g, " ").trim(),
  };
}, DETAIL_AGENTS);
await shot("agents-list-1440.png");
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await shot("agents-list-390.png");
const agentsOverflowMobile = await overflowCheck();
await page.setViewportSize({ width: 1440, height: 900 });

const agentsPage = {
  loaded: /Agents|AgentOps/i.test(agentsText),
  allSixLinked: DETAIL_AGENTS.every((s) => agentsProbe.found[s]),
  found: agentsProbe.found,
  workerStrip: agentsProbe.workerStrip,
  workerStripOk: /Worker online|Worker offline|Checking worker/i.test(agentsProbe.workerStrip || ""),
  hermesHint: /Per-agent Hermes/i.test(agentsText),
  forbidden: hasForbidden(agentsText),
  overflowMobile: agentsOverflowMobile.overflowX,
};

// ---------- PAGE 3: agent details ----------
const details = [];
for (const slug of DETAIL_AGENTS) {
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector('[data-testid="agentops-agent-status-strip"], [data-testid="agentops-agent-control-header"]', {
    timeout: 90_000,
  });
  await page.waitForFunction(() => {
    const strip = document.querySelector('[data-testid="strip-last-scan"]');
    const hermes = document.querySelector('[data-testid="memory-summary-agent-hermes"]');
    const st = (strip?.textContent || "") + (hermes?.textContent || "");
    return st && !/Not recorded…|Namespace…|Agent Hermes…/i.test(st.replace(/\s+/g, " "));
  }, { timeout: 120_000 }).catch(() => null);
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => {
    const t = (id) =>
      (document.querySelector(`[data-testid="${id}"]`)?.textContent || "").replace(/\s+/g, " ").trim();
    const body = document.body.innerText.replace(/\s+/g, " ");
    return {
      headerOwner: t("agentops-owner-work-status"),
      stripOwner: t("strip-agent-status"),
      lastRun: t("strip-last-scan"),
      worker: t("agentops-execution-worker-status"),
      schedule: t("strip-schedule-status") + " " + t("agentops-scheduler-status"),
      engines: t("agentops-engines-ready"),
      fleetHermes: t("memory-summary-fleet-hermes"),
      agentHermes: t("memory-summary-agent-hermes"),
      namespace: t("memory-summary-namespace"),
      approved: t("memory-summary-approved"),
      pending: t("memory-summary-pending"),
      diagnostics: t("memory-summary-diagnostics"),
      connectedBanner: Boolean(document.querySelector('[data-testid="agentops-hermes-connected-banner"]')),
      issuesPreviewOnly: /Preview only|no approve|no reject|no promote/i.test(body),
      hasApprovePromoteOnFindings: /Approve finding|Promote to issue|Reject finding/i.test(body),
      bodyHasOwnerError: /OWNER STATUS:\s*ERROR/i.test(body),
      bodyHasLastScanFailed: /LAST SCAN:\s*FAILED/i.test(body),
      chatPresent: /Chat with|Type a message/i.test(body),
      schedulePanel: /Schedule and work|Schedule ready|Schedule executable|Manual only/i.test(body),
      queuePanel: /This agent queue|No active or queued|Queued|Running/i.test(body),
    };
  });

  // Prefer Playwright button state
  const runAuditBtn = page.getByRole("button", { name: /Run audit now/i });
  const runBqBtn = page.getByRole("button", { name: /Run Browser QA now/i });
  const runAuditEnabled = (await runAuditBtn.count())
    ? await runAuditBtn.isEnabled().catch(() => false)
    : false;
  const runBqEnabled = (await runBqBtn.count())
    ? await runBqBtn.isEnabled().catch(() => false)
    : false;

  const headerStatus =
    probe.headerOwner.match(/\b(Active|Paused|Unknown|Error|Blocked)\b/i)?.[1] || "";
  const stripStatus =
    probe.stripOwner.match(/\b(Active|Paused|Unknown|Error|Blocked)\b/i)?.[1] || "";

  const checks = {
    headerStripAligned:
      headerStatus && stripStatus
        ? headerStatus.toLowerCase() === stripStatus.toLowerCase()
        : true,
    noFalseOwnerError: !( /active/i.test(headerStatus) && (/^error$/i.test(stripStatus) || probe.bodyHasOwnerError) ),
    noLastScanFailedLabel: !probe.bodyHasLastScanFailed,
    workerOnline: /Worker online|online/i.test(probe.worker),
    scheduleOk: /executable|Schedule executable|Manual only|Schedule ready/i.test(probe.schedule),
    auditToolsReady: /ready|Audit tools ready/i.test(probe.engines + probe.worker) || runAuditEnabled,
    agentHermesConnected: /Connected/i.test(probe.agentHermes),
    namespaceOk: new RegExp(`agentops\\.agent\\.${slug}`, "i").test(probe.namespace),
    findingsPreviewOnly: probe.issuesPreviewOnly && !probe.hasApprovePromoteOnFindings,
    chatPresent: probe.chatPresent,
    schedulePanel: probe.schedulePanel,
    queuePanel: probe.queuePanel,
    runAuditEnabled,
    runBqEnabled,
  };

  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(`${slug}-detail-1440.png`);
  if (slug === "design-agent" || slug === "system-agent") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await shot(`${slug}-detail-390.png`);
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  details.push({
    slug,
    pass: Object.values(checks).every(Boolean),
    checks,
    probe,
    failedChecks: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
  });
  console.log(JSON.stringify({ slug, pass: Object.values(checks).every(Boolean), failedChecks: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k) }, null, 2));
}

// ---------- Functional: Test Hermes + chat + Run audit confirm (design-agent) ----------
const functional = {
  testHermes: null,
  chat: null,
  runAuditConfirm: null,
  runBrowserQaConfirm: null,
};

await page.goto(`${base}/system/agent-ops/agents/design-agent`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForSelector('[data-testid="memory-summary-agent-hermes"]', { timeout: 90_000 });
await page.waitForFunction(
  () => /Connected/i.test(document.querySelector('[data-testid="memory-summary-agent-hermes"]')?.textContent || ""),
  { timeout: 120_000 },
);

await page.getByRole("button", { name: /Test Hermes connection/i }).click();
await page.waitForSelector('[data-testid="agentops-hermes-test-result"]', { timeout: 60_000 });
const hermesTest = (await page.locator('[data-testid="agentops-hermes-test-result"]').innerText()).replace(/\s+/g, " ");
functional.testHermes = {
  ok:
    /Agent Hermes:\s*Connected/i.test(hermesTest) &&
    /Namespace:\s*agentops\.agent\.design-agent/i.test(hermesTest) &&
    /Fleet transport:\s*Available/i.test(hermesTest),
  text: hermesTest.slice(0, 400),
};
await shot("design-test-hermes.png");

// Chat send
const chatBox = page.getByPlaceholder(/Type a message/i).or(page.locator("textarea").first());
if (await chatBox.count()) {
  const msg = `D-G0 ping ${Date.now()} — reply in one short sentence as design-agent.`;
  await chatBox.fill(msg);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(8000);
  const chatBody = await bodyText();
  functional.chat = {
    ok:
      /design-agent|Design Agent/i.test(chatBody) &&
      !/@aixia\.qa-agent|System Agent: Local LLM/i.test(chatBody.split(msg).pop() || ""),
    sawFallback: /Local LLM is unavailable|Fallback reply/i.test(chatBody),
    identityLikelyDesign: /Design Agent|@aixia\.design-agent/i.test(chatBody),
  };
  await shot("design-chat-after-send.png");
} else {
  functional.chat = { ok: false, error: "chat input missing" };
}

// Run audit confirm modal
const auditBtn = page.getByRole("button", { name: /Run audit now/i });
if (await auditBtn.isEnabled()) {
  await auditBtn.click();
  await page.waitForTimeout(1200);
  const modalText = await bodyText();
  functional.runAuditConfirm = {
    ok: /Website audit|staging worker|confirm|Start|Cancel/i.test(modalText),
    text: modalText.slice(0, 250),
  };
  // Cancel modal — do not always burn a full run in sweep; functional run below optional
  const cancel = page.getByRole("button", { name: /^Cancel$/i }).first();
  if (await cancel.count()) await cancel.click().catch(() => null);
  await shot("design-run-audit-confirm.png");
} else {
  functional.runAuditConfirm = { ok: false, error: "Run audit disabled" };
}

const bqBtn = page.getByRole("button", { name: /Run Browser QA now/i });
if (await bqBtn.isEnabled()) {
  await bqBtn.click();
  await page.waitForTimeout(1200);
  const modalText = await bodyText();
  functional.runBrowserQaConfirm = {
    ok: /Browser QA|staging worker|confirm|Start|Cancel/i.test(modalText),
  };
  const cancel = page.getByRole("button", { name: /^Cancel$/i }).first();
  if (await cancel.count()) await cancel.click().catch(() => null);
  await shot("design-run-browser-qa-confirm.png");
} else {
  functional.runBrowserQaConfirm = { ok: false, error: "Run Browser QA disabled" };
}

await browser.close();

const summary = {
  base,
  at: new Date().toISOString(),
  overview,
  agentsPage,
  details,
  functional,
  consoleErrors: consoleErrors.slice(0, 40),
  pageErrors: pageErrors.slice(0, 20),
  failedRequests: failedRequests.slice(0, 40),
  overviewPass:
    overview.loaded &&
    overview.links.agents &&
    overview.forbidden.length === 0 &&
    !overview.overflowMobile,
  agentsPass:
    agentsPage.loaded &&
    agentsPage.allSixLinked &&
    agentsPage.forbidden.length === 0 &&
    Boolean(agentsPage.workerStripOk),
  detailsPass: details.every((d) => d.pass),
  functionalPass:
    Boolean(functional.testHermes?.ok) &&
    Boolean(functional.chat?.ok) &&
    Boolean(functional.runAuditConfirm?.ok) &&
    Boolean(functional.runBrowserQaConfirm?.ok),
};

summary.allPass =
  summary.overviewPass &&
  summary.agentsPass &&
  summary.detailsPass &&
  summary.functionalPass &&
  pageErrors.length === 0;

const summaryPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-d-g0-pre-issues-live-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      summaryPath,
      overviewPass: summary.overviewPass,
      agentsPass: summary.agentsPass,
      detailsPass: summary.detailsPass,
      functionalPass: summary.functionalPass,
      allPass: summary.allPass,
      detailFails: details.filter((d) => !d.pass).map((d) => ({ slug: d.slug, failedChecks: d.failedChecks })),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      failedApiCount: failedRequests.length,
    },
    null,
    2,
  ),
);
process.exit(summary.allPass ? 0 : 1);
