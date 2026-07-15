/**
 * Phase B1 live smoke — agent detail semantics / control honesty.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const outDir = path.join("qa-agent", "browser-qa-artifacts", "agent-detail-b1");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-agent-detail-phase-b1-live.json",
);
fs.mkdirSync(outDir, { recursive: true });

const agents = ["system-agent", "qa-agent", "design-agent", "analytics-agent"];
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

async function waitReady(page) {
  await page.waitForFunction(() => {
    const t = document.body?.innerText || "";
    return t.includes("Back to Agents") || t.includes("Agent not found") || t.length > 900;
  }, { timeout: 60000 });
  await page.waitForTimeout(1200);
}

async function snap(page, slug) {
  return page.evaluate(() => {
    const body = document.body?.innerText || "";
    const chatTitles = [...document.querySelectorAll("h2, h3")]
      .map((n) => (n.textContent || "").trim())
      .filter((t) => /^Chat with /i.test(t));
    const visibleChatTitles = chatTitles.filter((t) => {
      // count only non-sr-only
      return true;
    });
    const pauseButtons = [...document.querySelectorAll("button")].filter((b) =>
      /^Pause$/i.test((b.textContent || "").trim()),
    ).length;
    const activateButtons = [...document.querySelectorAll("button")].filter((b) =>
      /^Activate$/i.test((b.textContent || "").trim()),
    ).length;
    const runButtons = [...document.querySelectorAll("button")].filter((b) =>
      /Run this agent now/i.test(b.textContent || ""),
    );
    return {
      h1: document.querySelector("h1")?.textContent || "",
      bodyLen: body.length,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      composer: Boolean(document.querySelector('[data-testid="agentops-agent-detail-messenger"] textarea, textarea')),
      chatTitleCount: [...document.querySelectorAll(".aixia-messenger-toolbar__title")].filter((el) => {
        const style = getComputedStyle(el);
        return style.visibility !== "hidden" && style.display !== "none" && (el.textContent || "").trim();
      }).length,
      sectionTitles: [...document.querySelectorAll("h2")]
        .map((n) => (n.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 12),
      hasLatestWork: /Latest work/i.test(body),
      hasTodaysWork: /Today.?s work/i.test(body),
      hasRoutesReviewed: /Routes reviewed/i.test(body),
      hasAssignedAreas: /Assigned areas/i.test(body),
      hasOwnerWorkStatus: /Owner work status/i.test(body),
      hasLatestReview: /Latest review/i.test(body),
      hasWorkAutomation: /Work mode and automation/i.test(body),
      hasManualPref: /Manual preference/i.test(body),
      hasFleetReadOnly: /Managed from Monitoring|Fleet automation/i.test(body),
      hasOwnerControlsSection: /Owner controls/i.test(body),
      hasRunHonesty: /Single-agent review is not connected yet/i.test(body),
      hasQualifyingCopy: /No qualifying findings were produced|does not confirm that the website has no issues/i.test(body) || !/No findings[\s\S]{0,20}Yes/i.test(body),
      noFindingsYes: /No findings[\s\S]{0,40}Yes/i.test(body),
      pauseCount: pauseButtons,
      activateCount: activateButtons,
      runCount: runButtons.length,
      runDisabled: runButtons.every((b) => b.disabled),
      approvalDisclosure: /What requires owner approval/i.test(body),
      activityItems: document.querySelectorAll('[data-testid="agentops-recent-activity"] li').length,
    };
  });
}

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  agents: {},
  viewports: {},
  pauseProbe: null,
  preferenceProbe: null,
  errors: [],
};

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  if (!email || !password) throw new Error("Missing owner credentials");
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 });

  for (const slug of agents) {
    await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await waitReady(page);
    report.agents[slug] = await snap(page, slug);
    await page.screenshot({
      path: path.join(outDir, `${slug}-1440.png`),
      fullPage: true,
    });
  }

  // Responsive on design-agent
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${base}/system/agent-ops/agents/design-agent`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await waitReady(page);
    report.viewports[vp.name] = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      composer: Boolean(document.querySelector("textarea")),
      bodyLen: (document.body?.innerText || "").length,
    }));
    await page.screenshot({
      path: path.join(outDir, `design-${vp.name}.png`),
      fullPage: true,
    });
  }

  // Pause / Activate on analytics-agent (safe owner-feedback only)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/system/agent-ops/agents/analytics-agent`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await waitReady(page);
  const before = await page.evaluate(() => document.body?.innerText || "");
  const pauseBtn = page.getByRole("button", { name: /^Pause$/i }).first();
  if (await pauseBtn.isVisible().catch(() => false)) {
    await pauseBtn.click();
    await page.waitForTimeout(2000);
    const mid = await page.evaluate(() => document.body?.innerText || "");
    const activateBtn = page.getByRole("button", { name: /^Activate$/i }).first();
    await activateBtn.click();
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => document.body?.innerText || "");
    report.pauseProbe = {
      hadPauseFeedback: /owner status changed to Paused/i.test(mid),
      hadActivateFeedback: /owner status changed to Active/i.test(after),
      claimedFleetChange:
        /removed from scheduled|stops? fleet|GitHub Actions reviews (were|was) (stopped|changed)/i.test(
          mid + after,
        ),
      beforeHasPause: /Pause/i.test(before),
    };
  } else {
    report.pauseProbe = { skipped: "Pause not visible (already paused?)" };
  }

  // Preference toggle (Manual / Scheduled preference)
  const manual = page.getByRole("button", { name: /Manual preference/i }).first();
  if (await manual.isVisible().catch(() => false)) {
    await manual.click();
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body?.innerText || "");
    report.preferenceProbe = {
      success: /Work preference set to Manual preference/i.test(text),
      helperVisible: /does not change the fleet daily/i.test(text),
    };
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
