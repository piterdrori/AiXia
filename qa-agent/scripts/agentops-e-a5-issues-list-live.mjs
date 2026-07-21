/**
 * E-A5 — Issues list simplification live QA (staging).
 * Asserts list cards expose Open issue only; detail keeps decision actions.
 */
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
await page.waitForTimeout(2000);

await page.goto(`${base}/system/agent-ops/issues`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForTimeout(5000);

const list = await page.evaluate(() => {
  const helper = document.querySelector('[data-testid="agentops-issues-inbox-helper"]');
  const cards = [...document.querySelectorAll('[data-testid="agentops-issue-card"]')];
  const openLinks = [...document.querySelectorAll('[data-testid="agentops-open-issue"]')];
  const cardTexts = cards.map((card) => card.innerText || "");
  const decisionOnCards = cardTexts.some((text) =>
    /\b(Approve|Defer|Reject|Promote to issue|Needs more info|Mark duplicate)\b/.test(text),
  );
  const openHrefs = openLinks.map((el) => el.getAttribute("href") || "");
  const openHrefOk =
    openLinks.length > 0 &&
    openHrefs.every((href) => href.startsWith("/system/agent-ops/issues/"));
  return {
    pageLoaded: (document.body.innerText || "").includes("Issues"),
    helperVisible: Boolean(helper?.textContent?.includes("Issues inbox")),
    cardCount: cards.length,
    openLinkCount: openLinks.length,
    openHrefOk,
    sampleOpenHref: openHrefs[0] || null,
    titleVisible: cards.some((c) => c.querySelector('[data-testid="agentops-issue-title"]')),
    reportedByVisible: cards.some((c) =>
      c.querySelector('[data-testid="agentops-issue-reported-by"]'),
    ),
    foundTimeVisible: cards.some((c) =>
      c.querySelector('[data-testid="agentops-issue-found-time"]'),
    ),
    decisionButtonsOnCards: decisionOnCards,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    hasNoiseToggle: /Show likely shell noise|Hide likely shell noise/i.test(
      document.body.innerText || "",
    ),
    hasTabs: /Needs review|Accepted|All/i.test(document.body.innerText || ""),
  };
});

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
const mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
}));
await page.setViewportSize({ width: 1440, height: 900 });

let detail = {
  opened: false,
  hasApprove: false,
  hasDefer: false,
  hasReject: false,
  hasFixPrompt: false,
  hasChat: false,
  path: null,
};

if (list.sampleOpenHref) {
  await page.goto(`${base}${list.sampleOpenHref}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(5000);
  detail = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      opened: !/Issue not found|404/i.test(text) && text.length > 200,
      hasApprove: /\bApprove\b/.test(text),
      hasDefer: /\bDefer\b|\bLater\b/.test(text),
      hasReject: /\bReject\b|\bDismiss\b/.test(text),
      hasNeedsMoreInfo: /Needs more info/i.test(text),
      hasMarkDuplicate: /Mark duplicate/i.test(text),
      hasPromote: /Promote to issue/i.test(text),
      hasFixPrompt: /Fix Issue Prompt/i.test(text),
      hasChat: /AgentOpsFindingChat|chat with|Improve Fix Prompt|Suggested Fix Prompt/i.test(text) ||
        Boolean(document.querySelector("[data-testid*='finding-chat'], [data-testid*='issue-chat']")),
      path: location.pathname,
    };
  });
  // Chat surface may use component without those strings — probe textarea/composer
  if (!detail.hasChat) {
    detail.hasChat = await page.locator("textarea, [contenteditable='true']").count().then((n) => n > 0);
  }
}

await browser.close();

const ok =
  list.pageLoaded &&
  list.helperVisible &&
  list.cardCount > 0 &&
  list.openLinkCount > 0 &&
  list.openHrefOk &&
  list.titleVisible &&
  list.reportedByVisible &&
  list.foundTimeVisible &&
  !list.decisionButtonsOnCards &&
  !list.overflow &&
  !mobile.overflow &&
  list.hasNoiseToggle &&
  list.hasTabs &&
  detail.opened &&
  detail.hasApprove &&
  detail.hasDefer &&
  detail.hasReject &&
  detail.hasFixPrompt;

const report = {
  at: new Date().toISOString(),
  base,
  ok,
  list,
  mobile,
  detail,
};
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 2);
