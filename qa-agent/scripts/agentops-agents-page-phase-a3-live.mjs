/**
 * Phase A.3 live checks — fixed composer, two-column, agent select, history drawer.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-a3-council");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-agents-page-phase-a3-live.json",
);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const QUESTION =
  "In one short sentence each, identify the most important area you review on the staging website.";

async function measureComposer(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
    const dock = shell?.querySelector('[data-testid="agentops-messenger-dock"]');
    const textarea = shell?.querySelector("textarea");
    if (!shell || !dock || !textarea) {
      return { ok: false };
    }
    const shellRect = shell.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    const taRect = textarea.getBoundingClientRect();
    const vh = window.innerHeight;
    return {
      ok: true,
      shellH: Math.round(shellRect.height),
      dockH: Math.round(dockRect.height),
      composerVisibleInShell:
        dockRect.bottom <= shellRect.bottom + 2 && dockRect.top >= shellRect.top - 2,
      composerInViewport:
        taRect.bottom <= vh && taRect.top >= 0 && taRect.height > 0 && taRect.width > 0,
      phase: shell.getAttribute("data-phase"),
      rosterMode: shell.getAttribute("data-roster-mode"),
      hasTwoColBody: Boolean(shell.querySelector('[data-testid="agentops-council-agents-panel"]')),
      historyInBody: /Earlier Council turns/i.test(shell.innerText || ""),
      technicalLabel: /NOT AN LLM CONSENSUS/i.test(shell.innerText || ""),
      duplicateCouncilTitles: ((shell.innerText || "").match(/Council Chat/g) || []).length,
    };
  });
}

async function main() {
  const report = {
    baseUrl: base,
    startedAt: new Date().toISOString(),
    live: {},
    viewports: {},
    errors: [],
  };
  if (!email || !password) {
    report.errors.push("missing credentials");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 });
    await page.goto(`${base}/system/agent-ops/agents`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.getByTestId("agentops-agents-council-embed").waitFor({ timeout: 120000 });
    await page.getByTestId("agentops-agents-council-messenger").waitFor({
      state: "attached",
      timeout: 120000,
    });
    await page.getByTestId("agentops-messenger-dock").waitFor({ state: "attached", timeout: 60000 });
    await page.waitForTimeout(2500);

    report.live.before = await measureComposer(page);
    // Soft-scroll may place dock in browser viewport
    await page.waitForTimeout(600);
    report.live.beforeAfterScroll = await measureComposer(page);
    await page.screenshot({ path: path.join(outDir, "01-before-1440.png"), fullPage: false });

    const canon = page.getByRole("tab", { name: /AgentOps Council/i });
    if ((await canon.count()) > 0) await canon.click();

    const composer = page.getByTestId("agentops-agents-council-messenger").locator("textarea").first();
    const draft = `draft-${Date.now()}`;
    await composer.fill(draft);
    report.live.tabSwitch = { draft };
    for (let i = 0; i < 5; i += 1) {
      const other = await context.newPage();
      await other.goto("about:blank");
      await page.waitForTimeout(400);
      await other.close();
      await page.bringToFront();
      await page.waitForTimeout(400);
    }
    report.live.tabSwitch.after = await composer.inputValue();
    report.live.tabSwitch.preserved = report.live.tabSwitch.after === draft;

    await composer.fill(QUESTION);
    await page
      .getByTestId("agentops-agents-council-messenger")
      .getByRole("button", { name: /send/i })
      .first()
      .click();

    const deadline = Date.now() + 10 * 60 * 1000;
    let sawInFlight = false;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2500);
      const snap = await page.evaluate((q) => {
        const busy = Boolean(document.querySelector('[data-testid="agentops-council-inflight"]'));
        const progress =
          document.querySelector('[data-testid="agentops-council-progress"]')?.textContent || "";
        const turnQ =
          document.querySelector('[data-testid="agentops-council-turn"] .agentops-council-msg__text')
            ?.textContent || "";
        const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
        const selectedFull = document.querySelector(
          '[data-testid="agentops-council-selected-response"]',
        );
        return {
          busy,
          progress,
          turnQ,
          rowCount: rows.length,
          hasSystem: rows.some((r) => /System Agent/i.test(r.textContent || "")),
          hasManaged: rows.some((r) => /Finance Viewer QA|Platform Admin QA/i.test(r.textContent || "")),
          matches: turnQ.includes(q.slice(0, 32)),
          selectedVisible: Boolean(selectedFull),
        };
      }, QUESTION);
      report.live.waitSnap = snap;
      if (snap.busy) sawInFlight = true;
      if (
        !snap.busy &&
        sawInFlight &&
        snap.matches &&
        snap.hasSystem &&
        !snap.hasManaged &&
        /12\s*\/\s*12|12 of 12|12\/12/i.test(snap.progress)
      ) {
        break;
      }
      // also accept "12/12 replied" compact form
      if (
        !snap.busy &&
        snap.matches &&
        snap.rowCount >= 12 &&
        snap.hasSystem &&
        /12/.test(snap.progress)
      ) {
        const done = /12\s*\/\s*12|12\/12 replied|12 of 12/i.test(snap.progress);
        if (done) break;
      }
    }

    report.live.after = await measureComposer(page);
    report.live.after.rowScan = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
      return {
        count: rows.length,
        names: rows.map((r) => (r.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)),
      };
    });
    await page.screenshot({ path: path.join(outDir, "02-after-replies-1440.png") });

    // Select System Agent then Design Agent
    const systemRow = page.getByTestId("agentops-council-response-row").filter({ hasText: /System Agent/i }).first();
    await systemRow.click();
    await page.waitForTimeout(400);
    report.live.systemSelected = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="agentops-council-selected-response"]');
      return {
        visible: Boolean(el),
        text: (el?.textContent || "").slice(0, 120),
        hasSpeak: [...document.querySelectorAll("button")].some((b) => /speak/i.test(b.textContent || "")),
      };
    });
    await page.screenshot({ path: path.join(outDir, "03-system-selected.png") });

    const designRow = page.getByTestId("agentops-council-response-row").filter({ hasText: /Design Agent/i }).first();
    await designRow.click();
    await page.waitForTimeout(400);
    report.live.designSelected = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="agentops-council-selected-response"]');
      return {
        visible: Boolean(el),
        name: el?.getAttribute("data-agent-id") || "",
        text: (el?.textContent || "").slice(0, 120),
        selectedRows: [...document.querySelectorAll('[data-testid="agentops-council-response-row"][data-selected="true"]')]
          .length,
      };
    });
    await page.screenshot({ path: path.join(outDir, "04-design-selected.png") });

    // TTS
    const ttsOn = page.getByRole("button", { name: /Turn text-to-speech on|TTS Off/i });
    if ((await ttsOn.count()) > 0) await ttsOn.first().click();
    const speak = page.getByRole("button", { name: /speak/i }).first();
    if ((await speak.count()) > 0 && (await speak.isVisible().catch(() => false))) {
      await speak.click();
      await page.waitForTimeout(1000);
      const stop = page.getByTestId("agentops-tts-stop");
      report.live.tts = {
        stopVisible: (await stop.count()) > 0 && (await stop.isVisible().catch(() => false)),
      };
      if (report.live.tts.stopVisible) {
        await stop.click();
        report.live.tts.stopped = true;
      }
      await page.screenshot({ path: path.join(outDir, "05-tts.png") });
    }

    // History drawer — latest not listed
    await page.getByTestId("agentops-council-history-toggle").click();
    await page.waitForTimeout(300);
    report.live.history = await page.evaluate((q) => {
      const drawer = document.querySelector('[data-testid="agentops-council-history-drawer"]');
      const items = [...(drawer?.querySelectorAll(".agentops-council-workspace__history-item") || [])];
      const activeTurnId =
        document.querySelector('[data-testid="agentops-council-turn"]')?.getAttribute("data-turn-id") ||
        "";
      return {
        open: Boolean(drawer),
        itemCount: items.length,
        // Same wording may appear if the owner asked twice; ensure active turnId is not listed as a history button target.
        containsLatestExact: items.some((item) => (item.textContent || "").includes(q)),
        activeTurnId,
      };
    }, QUESTION);
    await page.screenshot({ path: path.join(outDir, "06-history.png") });
    await page.getByTestId("agentops-council-history-toggle").click().catch(() => undefined);

    // Responsive live shots
    for (const vp of [
      { name: "1024", width: 1024, height: 768 },
      { name: "768", width: 768, height: 1024 },
      { name: "390", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(700);
      report.viewports[vp.name] = await measureComposer(page);
      await page.screenshot({
        path: path.join(outDir, `07-${vp.name}.png`),
        fullPage: false,
      });
    }

    report.live.verdict = {
      composerVisible:
        report.live.beforeAfterScroll?.composerInViewport === true ||
        report.live.before?.composerVisibleInShell === true,
      composerInBrowserViewport: report.live.beforeAfterScroll?.composerInViewport === true,
      composerFixedAfter: report.live.after?.composerVisibleInShell === true,
      shellStable:
        report.live.before?.shellH &&
        report.live.after?.shellH &&
        Math.abs(report.live.after.shellH - report.live.before.shellH) <= 80,
      twoColumn: report.live.before?.hasTwoColBody === true,
      noHistoryInBody: report.live.before?.historyInBody !== true,
      noTechnicalLabel: report.live.after?.technicalLabel !== true,
      twelveAgents: (report.live.after?.rowScan?.count || 0) >= 12,
      oneSelected: (report.live.designSelected?.selectedRows || 0) === 1,
      selectionWorks: /design-agent/i.test(report.live.designSelected?.name || ""),
      draftPreserved: report.live.tabSwitch?.preserved === true,
      tabletComposer:
        report.viewports["1024"]?.composerVisibleInShell === true ||
        report.viewports["1024"]?.composerInViewport === true,
      mobileComposer:
        report.viewports["390"]?.composerVisibleInShell === true ||
        report.viewports["390"]?.composerInViewport === true,
    };
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors.length ? 1 : 0);
}

main();
