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

await page.goto(`${base}/system/agent-ops/issues?tab=all`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForSelector(
  '[data-testid="agentops-issue-card"], [data-testid="agentops-issues-inbox-helper"]',
  { timeout: 60_000 },
).catch(() => null);
// Wait until loading skeleton clears or cards appear
for (let i = 0; i < 30; i++) {
  const ready = await page.evaluate(() => {
    const loading = /Loading issues/i.test(document.body.innerText || "");
    const cards = document.querySelectorAll('[data-testid="agentops-issue-card"]').length;
    const empty = /No issues are available|No issues are waiting/i.test(
      document.body.innerText || "",
    );
    return !loading && (cards > 0 || empty);
  });
  if (ready) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(1500);

const list = await page.evaluate(() => {
  const body = document.body.innerText || "";
  const helper = document.querySelector('[data-testid="agentops-issues-inbox-helper"]');
  const cards = [...document.querySelectorAll('[data-testid="agentops-issue-card"]')];
  const openLinks = [...document.querySelectorAll('[data-testid="agentops-open-issue"]')];
  const cardTexts = cards.map((card) => card.innerText || "");
  const decisionOnCards = cardTexts.some((text) =>
    /\b(Approve|Defer|Reject|Promote to issue|Needs more info|Mark duplicate)\b/.test(text),
  );
  // Page chrome may mention statuses; only fail if those labels appear as card action buttons.
  const decisionButtonsInDom = [...document.querySelectorAll("button, a")].some((el) => {
    const inCard = el.closest('[data-testid="agentops-issue-card"]');
    if (!inCard) return false;
    const label = (el.textContent || "").trim();
    return /^(Approve|Defer|Reject|Promote to issue|Needs more info|Mark duplicate)$/i.test(label);
  });
  const openHrefs = openLinks.map((el) => el.getAttribute("href") || "");
  const openHrefOk =
    openLinks.length > 0 &&
    openHrefs.every((href) => href.startsWith("/system/agent-ops/issues/"));
  return {
    pageLoaded: body.includes("Issues"),
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
    decisionButtonsOnCards: decisionOnCards || decisionButtonsInDom,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    hasNoiseToggle: /Show likely shell noise|Hide likely shell noise/i.test(body),
    hasTabs: /Needs review|Accepted|All/i.test(body),
    emptyState: /No issues are available|No issues are waiting/i.test(body),
    gateError: /Owner gate|not an owner|Could not load/i.test(body),
    bodySnippet: body.slice(0, 600),
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

const detailPath =
  list.sampleOpenHref ||
  "/system/agent-ops/issues/draft-21109c88-4ca6-4afa-9546-f7db66f8bc13";

await page.goto(`${base}${detailPath}`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForTimeout(6000);
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
    hasChat:
      /Improve Fix Prompt|Suggested Fix Prompt|Use as Fix Issue Prompt|Chat with/i.test(text) ||
      Boolean(document.querySelector("[data-testid*='finding-chat'], [data-testid*='issue-chat']")),
    path: location.pathname,
  };
});
if (!detail.hasChat) {
  detail.hasChat = (await page.locator("textarea, [contenteditable='true']").count()) > 0;
}
detail.usedFallbackPath = !list.sampleOpenHref;

await browser.close();

const listCardsOk =
  list.cardCount > 0 &&
  list.openLinkCount > 0 &&
  list.openHrefOk &&
  list.titleVisible &&
  list.reportedByVisible &&
  list.foundTimeVisible &&
  !list.decisionButtonsOnCards;

const ok =
  list.pageLoaded &&
  list.helperVisible &&
  !list.gateError &&
  listCardsOk &&
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
