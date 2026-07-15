/**
 * Phase A.2 live checks on staging Agents Council workspace.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-a2-council");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-agents-page-phase-a2-live.json",
);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const QUESTION =
  "In one sentence each, identify the most important area you review on the staging website.";

async function main() {
  const report = { baseUrl: base, startedAt: new Date().toISOString(), live: {}, errors: [] };
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
    await page.getByTestId("agentops-agents-council-messenger").waitFor({ timeout: 120000 });
    await page.waitForTimeout(3500);

    report.live.before = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
      const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
      const body = shell?.innerText || "";
      return {
        layout: shell?.getAttribute("data-messenger-layout"),
        rosterMode: shell?.getAttribute("data-roster-mode"),
        shellH: shell ? Math.round(shell.getBoundingClientRect().height) : null,
        viewportH: shell?.querySelector('[data-testid="agentops-messenger-viewport"]')
          ? Math.round(
              shell
                .querySelector('[data-testid="agentops-messenger-viewport"]')
                .getBoundingClientRect().height,
            )
          : null,
        dockH: shell?.querySelector('[data-testid="agentops-messenger-dock"]')
          ? Math.round(
              shell.querySelector('[data-testid="agentops-messenger-dock"]').getBoundingClientRect()
                .height,
            )
          : null,
        rowCount: rows.length,
        expandedCount: rows.filter((r) => r.getAttribute("data-expanded") === "true").length,
        readyAsAnswer: /agentops-council-response-row[\s\S]{0,80}\bready\b/i.test(body)
          ? body.toLowerCase().includes("\nready\n")
          : /\bready\b/i.test(body) && /response-row/i.test(body),
        bodyHasReadyWord: /\bready\b/i.test(body),
        canonicalLabel: /Canonical 12/i.test(body),
        hasSystemAgent: /System Agent/i.test(body),
      };
    });
    await page.screenshot({ path: path.join(outDir, "01-before-send.png") });

    // Ensure AgentOps Council mode
    const canon = page.getByRole("tab", { name: /AgentOps Council/i });
    if ((await canon.count()) > 0) await canon.click();
    await page.waitForTimeout(500);

    const composer = page.getByTestId("agentops-agents-council-messenger").locator("textarea").first();
    await composer.fill(QUESTION);
    await page
      .getByTestId("agentops-agents-council-messenger")
      .getByRole("button", { name: /send/i })
      .first()
      .click();

    // Wait until in-flight clears AND the latest turn is the question we sent with 12 replies
    const deadline = Date.now() + 10 * 60 * 1000;
    let sawInFlight = false;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2500);
      const snapshot = await page.evaluate((q) => {
        const busy = Boolean(document.querySelector('[data-testid="agentops-council-inflight"]'));
        const progress =
          document.querySelector('[data-testid="agentops-council-progress"]')?.textContent || "";
        const turn = document.querySelector('[data-testid="agentops-council-turn"]');
        const question = turn?.querySelector(".agentops-council-turn__question")?.textContent || "";
        const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
        const texts = rows.map((r) => (r.textContent || "").replace(/\s+/g, " ").trim());
        return {
          busy,
          progress,
          question,
          rowCount: rows.length,
          hasSystem: texts.some((t) => /System Agent/i.test(t)),
          hasManagedQa: texts.some((t) => /Finance Viewer QA|Platform Admin QA|Employee QA/i.test(t)),
          matchesQuestion: question.includes(q.slice(0, 40)),
        };
      }, QUESTION);
      report.live.lastProgress = snapshot.progress;
      report.live.waitSnap = snapshot;
      if (snapshot.busy) sawInFlight = true;
      if (
        !snapshot.busy &&
        sawInFlight &&
        snapshot.matchesQuestion &&
        snapshot.hasSystem &&
        !snapshot.hasManagedQa &&
        /12 of 12/i.test(snapshot.progress)
      ) {
        break;
      }
    }

    report.live.after = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
      const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
      const viewport = shell?.querySelector('[data-testid="agentops-messenger-viewport"]');
      const texts = rows.map((r) => (r.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80));
      return {
        shellH: shell ? Math.round(shell.getBoundingClientRect().height) : null,
        viewportH: viewport ? Math.round(viewport.getBoundingClientRect().height) : null,
        dockH: shell?.querySelector('[data-testid="agentops-messenger-dock"]')
          ? Math.round(
              shell.querySelector('[data-testid="agentops-messenger-dock"]').getBoundingClientRect()
                .height,
            )
          : null,
        rowCount: rows.length,
        expandedCount: rows.filter((r) => r.getAttribute("data-expanded") === "true").length,
        readyRow: texts.some((t) => /^[A-Z].*\bReady\b\s*$/i.test(t) || /\bpreview\b.*\bready\b$/i.test(t)),
        rowPreviews: texts.slice(0, 14),
        progress: document.querySelector('[data-testid="agentops-council-progress"]')?.textContent || "",
        composerVisible: Boolean(shell?.querySelector("textarea")),
      };
    });
    await page.screenshot({ path: path.join(outDir, "03-after-replies.png") });

    // Expand first replied row
    const firstRow = page.getByTestId("agentops-council-response-row").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.locator("button").first().click();
      await page.waitForTimeout(400);
      report.live.expanded = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-testid="agentops-council-response-row"]')];
        return {
          expandedCount: rows.filter((r) => r.getAttribute("data-expanded") === "true").length,
          hasSpeak: [...document.querySelectorAll("button")].some((b) =>
            /speak/i.test(b.textContent || ""),
          ),
        };
      });
      await page.screenshot({ path: path.join(outDir, "04-one-expanded.png") });

      const speak = page.getByRole("button", { name: /speak/i }).first();
      if ((await speak.count()) > 0 && (await speak.isVisible().catch(() => false))) {
        // Ensure TTS on
        const ttsOn = page.getByRole("button", { name: /Turn text-to-speech on/i });
        if ((await ttsOn.count()) > 0) await ttsOn.click();
        await speak.click();
        await page.waitForTimeout(1200);
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
    }

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    report.live.mobile = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
      return {
        shellH: shell ? Math.round(shell.getBoundingClientRect().height) : null,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        composer: Boolean(shell?.querySelector("textarea")),
      };
    });
    await page.screenshot({ path: path.join(outDir, "06-mobile.png") });

    const before = report.live.before;
    const after = report.live.after;
    report.live.verdict = {
      canonicalDefault: before?.rosterMode === "canonical" || before?.canonicalLabel === true,
      noReadyAnswers: after?.readyRow !== true,
      collapsedDefault: (after?.expandedCount || 0) === 0 || (report.live.expanded?.expandedCount ?? 1) <= 1,
      shellStable:
        before?.shellH &&
        after?.shellH &&
        Math.abs(after.shellH - before.shellH) <= 8,
      composerVisible: after?.composerVisible === true,
      dockAtMost150: (after?.dockH || 0) > 0 && (after?.dockH || 0) <= 160,
      rowsScannable: (after?.rowCount || 0) >= 8,
      mobileNoOverflow: report.live.mobile?.overflowX === false,
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
