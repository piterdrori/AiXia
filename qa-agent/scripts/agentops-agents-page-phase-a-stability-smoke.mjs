/**
 * Phase Agents A — live smoke on staging alias.
 * Focus: silent refresh, no focus-refetch, embedded Council layout floors.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-a-agents-stability");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-agents-page-phase-a-stability-smoke.json",
);

fs.mkdirSync(shotDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  checks: {},
  viewports: {},
  screenshots: [],
  errors: [],
};

async function shot(page, name) {
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots.push(file.replaceAll("\\", "/"));
}

function measureShell(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(
      '[data-testid="agentops-agents-council-messenger"], .aixia-messenger-shell--embedded',
    );
    const viewport = shell?.querySelector(".aixia-messenger-shell__viewport");
    const dock = shell?.querySelector(".aixia-messenger-shell__dock");
    const composer =
      shell?.querySelector("textarea") ||
      shell?.querySelector('[contenteditable="true"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { height: Math.round(r.height), width: Math.round(r.width), top: Math.round(r.top) };
    };
    return {
      layoutMode: shell?.getAttribute("data-messenger-layout") ?? null,
      shell: rect(shell),
      viewport: rect(viewport),
      dock: rect(dock),
      composerVisible: Boolean(composer && composer.getBoundingClientRect().height > 20),
      pageScrollY: window.scrollY,
      hasInfoFeedbackBlock: Boolean(
        Array.from(document.querySelectorAll("h3,h4,.aixia-info-block")).some((n) =>
          /Council message sent/i.test(n.textContent || ""),
        ),
      ),
    };
  });
}

async function main() {
  if (!email || !password) {
    report.errors.push("Owner credentials missing");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const tracking = { monitoring: 0, council: 0, allAgentOps: 0 };
  page.on("request", (req) => {
    const u = req.url();
    if (!u.includes("/api/agentops/")) return;
    tracking.allAgentOps += 1;
    if (u.includes("/api/agentops/monitoring")) tracking.monitoring += 1;
    if (u.includes("council") || u.includes("/chat")) tracking.council += 1;
  });

  try {
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90000 });

    await page.goto(`${base}/system/agent-ops/agents`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.getByTestId("agentops-agents-council-messenger").waitFor({ timeout: 90000 });
    await page.waitForTimeout(2500);

    // A — focus / visibility should not refetch
    tracking.monitoring = 0;
    tracking.council = 0;
    tracking.allAgentOps = 0;
    for (let i = 0; i < 5; i += 1) {
      await page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
      });
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    report.checks.tabFocusFetch = {
      monitoring: tracking.monitoring,
      council: tracking.council,
      allAgentOps: tracking.allAgentOps,
      pass: tracking.monitoring === 0 && tracking.council === 0,
    };

    // B — Silent Refresh preserves composer + mount
    const draft = `PhaseA draft ${Date.now()}`;
    const composer = page
      .getByTestId("agentops-agents-council-messenger")
      .locator("textarea")
      .first();
    await composer.fill(draft);
    const messengerBefore = await page
      .getByTestId("agentops-agents-council-messenger")
      .evaluate((el) => el.isConnected);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    tracking.monitoring = 0;
    const refreshBtn = page.getByRole("button", { name: /^Refresh$|^Refreshing/i }).first();
    await refreshBtn.click();
    await page.waitForTimeout(2500);
    const refreshLabel = await refreshBtn.innerText().catch(() => "");
    const draftAfter = await composer.inputValue();
    const messengerAfter = await page
      .getByTestId("agentops-agents-council-messenger")
      .evaluate((el) => el.isConnected);
    const bodyBlank = await page.evaluate(() => {
      const text = document.body.innerText || "";
      return /Loading|Owner gate|Unable to load/i.test(text) && text.length < 400;
    });
    report.checks.manualRefresh = {
      draftSurvived: draftAfter === draft,
      messengerStillMounted: messengerBefore && messengerAfter,
      pageNotBlanked: !bodyBlank,
      refreshingLabelSeen: /Refreshing/i.test(refreshLabel) || tracking.monitoring > 0,
      scrollDelta: Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore),
      pass:
        draftAfter === draft &&
        messengerBefore &&
        messengerAfter &&
        !bodyBlank,
    };

    // C — Layout measures @1440
    const m1440 = await measureShell(page);
    report.viewports["desktop-1440"] = m1440;
    report.checks.embedDesktop = {
      shellNear680: m1440.shell && m1440.shell.height >= 600 && m1440.shell.height <= 780,
      viewportFloor: m1440.viewport && m1440.viewport.height >= 400,
      composerVisible: m1440.composerVisible,
      embeddedMode: m1440.layoutMode === "embedded",
      noLargeFeedbackBlock: !m1440.hasInfoFeedbackBlock,
      pass:
        m1440.layoutMode === "embedded" &&
        m1440.composerVisible &&
        m1440.viewport &&
        m1440.viewport.height >= 400 &&
        m1440.shell &&
        m1440.shell.height >= 600,
    };
    await shot(page, "agents-1440");

    // Responsive
    for (const [name, size, floor] of [
      ["tablet-1024", { width: 1024, height: 900 }, 350],
      ["tablet-768", { width: 768, height: 900 }, 320],
      ["mobile-390", { width: 390, height: 844 }, 240],
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(800);
      const m = await measureShell(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      report.viewports[name] = { ...m, horizontalOverflow: overflow };
      report.checks[name] = {
        shellPresent: Boolean(m.shell),
        viewportFloor: m.viewport && m.viewport.height >= floor,
        composerVisible: m.composerVisible,
        noOverflow: !overflow,
        pass:
          Boolean(m.shell) &&
          m.composerVisible &&
          !overflow &&
          m.viewport &&
          m.viewport.height >= floor,
      };
      await shot(page, `agents-${name}`);
    }

    // D — Full Council regression
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/system/agent-ops/council`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.getByTestId("agentops-council-messenger").waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    const full = await page.evaluate(() => {
      const shell = document.querySelector(
        '[data-testid="agentops-council-messenger"]',
      );
      const viewport = shell?.querySelector(".aixia-messenger-shell__viewport");
      const composer =
        shell?.querySelector("textarea") ||
        shell?.querySelector('[contenteditable="true"]');
      const r = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
      return {
        layoutMode: shell?.getAttribute("data-messenger-layout") ?? null,
        shellHeight: r(shell),
        viewportHeight: r(viewport),
        composerVisible: Boolean(composer && composer.getBoundingClientRect().height > 20),
        duplicateScrollRegions:
          document.querySelectorAll(".aixia-messenger-shell .aixia-scrollbar, .overflow-y-auto")
            .length,
      };
    });
    report.checks.fullCouncil = {
      ...full,
      notEmbedded: full.layoutMode === "full",
      pass: full.composerVisible && full.layoutMode === "full" && full.shellHeight != null,
    };
    await shot(page, "council-full-1440");
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    const checkValues = Object.values(report.checks);
    report.pass =
      report.errors.length === 0 &&
      checkValues.length > 0 &&
      checkValues.every((c) => c && c.pass !== false);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
