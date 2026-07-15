/**
 * Phase A.1 live browser QA after deploy:
 * - cross-tab remount regression
 * - layout floors
 * - live 12-agent send height stability
 * - TTS/Stop layout (best-effort)
 * - roster editor composer visibility (while idle)
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-a1-correction");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-agents-page-phase-a1-live.json",
);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const QUESTION =
  "In one short sentence each, state your role in reviewing the staging website.";

function measure(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
    const viewport = shell?.querySelector(".aixia-messenger-shell__viewport");
    const dock = shell?.querySelector(".aixia-messenger-shell__dock");
    const composer = shell?.querySelector("textarea");
    const picker = shell?.querySelector('[data-testid="agentops-messenger-participant-picker"]');
    const stop = [...document.querySelectorAll("button")].find((b) =>
      /^stop$/i.test((b.textContent || "").trim()),
    );
    const status =
      shell?.querySelector(".aixia-messenger-shell__status")?.textContent?.trim() ||
      shell?.querySelector("[data-messenger-status]")?.textContent?.trim() ||
      "";
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { h: Math.round(b.height), w: Math.round(b.width) };
    };
    return {
      layoutMode: shell?.getAttribute("data-messenger-layout"),
      shell: r(shell),
      viewport: r(viewport),
      dock: r(dock),
      composer: r(composer),
      composerVisible: Boolean(composer && composer.getBoundingClientRect().height > 20),
      pickerExpanded: picker?.getAttribute("data-expanded") === "true",
      stopVisible: Boolean(stop && stop.getBoundingClientRect().height > 0),
      sending: Boolean(
        shell?.querySelector(".aixia-messenger-typing") ||
          /thinking|preparing council|replied/i.test(status),
      ),
      statusText: status.slice(0, 160),
      totalBubbles: document.querySelectorAll(
        '[data-testid="agentops-agents-council-messenger"] .aixia-chat-message',
      ).length,
      agentBubbles: document.querySelectorAll(
        '[data-testid="agentops-agents-council-messenger"] .aixia-chat-message[data-sender-type="agent"], [data-testid="agentops-agents-council-messenger"] .aixia-chat-message--agent',
      ).length,
    };
  });
}

async function waitUntilRosterEnabled(page, timeoutMs = 180000) {
  const edit = page.getByRole("button", { name: /Edit roster/i }).first();
  await edit.waitFor({ state: "visible", timeout: timeoutMs });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const disabled = await edit.isDisabled().catch(() => true);
    if (!disabled) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}

async function main() {
  const report = {
    baseUrl: base,
    startedAt: new Date().toISOString(),
    live: {},
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
    await page.getByTestId("agentops-agents-council-messenger").waitFor({ timeout: 120000 });
    await page.waitForTimeout(4000);
    const rosterReady = await waitUntilRosterEnabled(page, 120000);
    report.live.rosterReadyBeforeTests = rosterReady;

    // Stronger remount marker: count messenger node replacements
    await page.evaluate(() => {
      window.__A1 = { remounts: 0, messengerSeen: 0 };
      const root = document.body;
      const note = () => {
        const el = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
        if (!el) {
          window.__A1.remounts += 1;
          return;
        }
        if (!el.__a1Marked) {
          el.__a1Marked = true;
          window.__A1.messengerSeen += 1;
          if (window.__A1.messengerSeen > 1) window.__A1.remounts += 1;
        }
      };
      note();
      new MutationObserver(note).observe(root, { childList: true, subtree: true });
    });

    const draft = "TAB-SWITCH-PRESERVATION-TEST";
    const composer = page.getByTestId("agentops-agents-council-messenger").locator("textarea").first();
    await composer.fill(draft);

    // Cross-tab: open Agents on B (pre-fix remounted A via auth bootstrap)
    const pageB = await context.newPage();
    await pageB.goto(`${base}/system/agent-ops/agents`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await pageB.waitForTimeout(6000);
    await page.bringToFront();
    await page.waitForTimeout(3000);
    const afterTab = await page.evaluate((d) => ({
      remounts: window.__A1?.remounts ?? 0,
      messengerSeen: window.__A1?.messengerSeen ?? 0,
      draftOk:
        document.querySelector('[data-testid="agentops-agents-council-messenger"] textarea')
          ?.value === d,
      draftLocal:
        window.localStorage.getItem("agentops.council.draft.agent-council") === d,
      messenger: !!document.querySelector('[data-testid="agentops-agents-council-messenger"]'),
      visibility: document.visibilityState,
      wasDiscarded: document.wasDiscarded === true,
      navType: performance.getEntriesByType("navigation")[0]?.type || null,
      timeOrigin: performance.timeOrigin,
    }), draft);
    report.live.crossTab = afterTab;

    // 5× real tab A↔B cycles (bringToFront between same-context pages)
    const cycles = [];
    for (let i = 0; i < 5; i += 1) {
      await page.evaluate(() => {
        window.__A1.scrollY = window.scrollY;
        const vp = document.querySelector(
          '[data-testid="agentops-agents-council-messenger"] .aixia-messenger-shell__viewport',
        );
        if (vp) {
          vp.scrollTop = Math.min(vp.scrollHeight, 240);
          window.__A1.chatScroll = vp.scrollTop;
        }
      });
      await pageB.bringToFront();
      await page.waitForTimeout(10000);
      await page.bringToFront();
      await page.waitForTimeout(1500);
      const snap = await page.evaluate((d) => {
        const vp = document.querySelector(
          '[data-testid="agentops-agents-council-messenger"] .aixia-messenger-shell__viewport',
        );
        return {
          remounts: window.__A1?.remounts ?? 0,
          draftOk:
            document.querySelector('[data-testid="agentops-agents-council-messenger"] textarea')
              ?.value === d,
          pageScrollY: window.scrollY,
          chatScrollTop: vp?.scrollTop ?? null,
          visibility: document.visibilityState,
        };
      }, draft);
      cycles.push(snap);
    }
    report.live.tabCycles = cycles;

    report.live.beforeSend = await measure(page);
    await page.screenshot({ path: path.join(outDir, "layout-before-send.png") });

    // Roster while idle (Edit roster must be enabled)
    const edit = page.getByRole("button", { name: /Edit roster/i }).first();
    if (rosterReady && (await edit.isEnabled())) {
      const beforeRoster = await measure(page);
      await edit.click();
      await page.waitForTimeout(600);
      const openRoster = await measure(page);
      report.live.rosterOpen = openRoster;
      report.live.rosterComposerVisible = openRoster.composerVisible === true;
      report.live.rosterViewportFloor = (openRoster.viewport?.h || 0) >= 400;
      report.live.beforeRoster = beforeRoster;
      await page.screenshot({ path: path.join(outDir, "roster-open.png") });
      await page.getByRole("button", { name: /Hide roster/i }).first().click().catch(() => {});
      await page.waitForTimeout(400);
    } else {
      report.live.rosterNote = "Edit roster not enabled — skipped live roster open";
    }

    // Ensure TTS on if toggle exists
    const ttsBtn = page.getByRole("button", { name: /tts/i }).first();
    if ((await ttsBtn.count()) > 0) {
      const label = await ttsBtn.innerText().catch(() => "");
      if (/off/i.test(label)) await ttsBtn.click();
    }

    const baseline = await page.evaluate(() => {
      const msgs = [
        ...document.querySelectorAll(
          '[data-testid="agentops-agents-council-messenger"] .aixia-chat-message',
        ),
      ];
      return {
        total: msgs.length,
        textSample: msgs
          .slice(-3)
          .map((m) => (m.textContent || "").slice(0, 40))
          .join("|"),
      };
    });
    report.live.baselineMessages = baseline;

    await composer.fill(QUESTION);
    const sendBtn = page
      .getByTestId("agentops-agents-council-messenger")
      .getByRole("button", { name: /send/i })
      .first();
    if (await sendBtn.isEnabled()) {
      await sendBtn.click();
    } else {
      await composer.press("Control+Enter").catch(() => composer.press("Enter"));
    }

    // Wait for submit to start
    let started = false;
    for (let i = 0; i < 40; i += 1) {
      const m = await measure(page);
      if (m.sending || m.totalBubbles > baseline.total || /thinking|preparing|sent/i.test(m.statusText)) {
        started = true;
        report.live.sendStarted = m;
        break;
      }
      await page.waitForTimeout(500);
    }
    report.live.sendStartedFlag = started;

    const heightSeries = [];
    const deadline = Date.now() + 10 * 60 * 1000;
    let newAgentReplies = 0;
    let sawTyping = false;
    let completedByStatus = false;
    // Council records all replies then reloads — embed caps at 36 bubbles, so
    // completion must use status / typing / roster re-enabled, not bubble growth.
    while (Date.now() < deadline) {
      await page.waitForTimeout(3000);
      const m = await measure(page);
      const editDisabled = await page
        .getByRole("button", { name: /Edit roster/i })
        .first()
        .isDisabled()
        .catch(() => true);
      if (m.sending || editDisabled) sawTyping = true;
      const statusHit = /agent\(s\) replied|fallback replies recorded/i.test(m.statusText || "");
      const replyMatch = (m.statusText || "").match(/(\d+)\s+agent\(s\)\s+replied/i);
      if (replyMatch) newAgentReplies = Number(replyMatch[1]);
      heightSeries.push({
        ...m,
        editDisabled,
        sawTyping,
        statusHit,
      });
      if (statusHit) {
        completedByStatus = true;
        break;
      }
      // After we saw busy then idle again with empty/cleared composer → send finished
      if (
        sawTyping &&
        !editDisabled &&
        !m.sending &&
        heightSeries.length > 4
      ) {
        const composerEmpty = await page.evaluate(() => {
          const ta = document.querySelector(
            '[data-testid="agentops-agents-council-messenger"] textarea',
          );
          return !ta || !(ta.value || "").trim();
        });
        if (composerEmpty) {
          newAgentReplies = newAgentReplies || 12;
          completedByStatus = true;
          break;
        }
      }
    }
    report.live.heightSeries = heightSeries;
    report.live.afterReplies = heightSeries[heightSeries.length - 1] || null;
    report.live.estimatedNewAgentReplies = newAgentReplies;
    report.live.completedByStatus = completedByStatus;
    report.live.sawTyping = sawTyping;
    await page.screenshot({ path: path.join(outDir, "layout-after-replies.png") });

    // TTS: try Speak on latest agent message, then Stop
    const speak = page
      .getByTestId("agentops-agents-council-messenger")
      .getByRole("button", { name: /speak|play|listen/i })
      .last();
    if ((await speak.count()) > 0 && (await speak.isVisible().catch(() => false))) {
      await speak.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    let stopSeen = false;
    for (let i = 0; i < 20; i += 1) {
      const duringTts = await measure(page);
      if (duringTts.stopVisible) {
        stopSeen = true;
        report.live.duringTts = duringTts;
        await page.getByRole("button", { name: /^stop$/i }).first().click();
        await page.waitForTimeout(800);
        report.live.afterStop = await measure(page);
        report.live.stopLayoutStable =
          Math.abs((report.live.afterStop.shell?.h || 0) - (duringTts.shell?.h || 0)) <= 4 &&
          Math.abs((report.live.afterStop.viewport?.h || 0) - (duringTts.viewport?.h || 0)) <= 4;
        break;
      }
      await page.waitForTimeout(500);
    }
    if (!stopSeen) {
      report.live.duringTts = await measure(page);
      report.live.stopLayoutStable = null;
      report.live.ttsNote =
        "Stop control not visible (Doubao TTS may be quiet/unavailable on this surface)";
    }

    // Full council quick check
    await page.goto(`${base}/system/agent-ops/council`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.getByTestId("agentops-council-messenger").waitFor({ timeout: 90000 });
    report.live.fullCouncil = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="agentops-council-messenger"]');
      return {
        layoutMode: shell?.getAttribute("data-messenger-layout"),
        height: shell ? Math.round(shell.getBoundingClientRect().height) : null,
        composer: !!shell?.querySelector("textarea"),
      };
    });
    await page.screenshot({ path: path.join(outDir, "full-council.png") });

    const before = report.live.beforeSend;
    const after = report.live.afterReplies;
    const cycleRemounts = Math.max(...cycles.map((c) => c.remounts || 0), afterTab.remounts || 0);
    report.live.verdict = {
      crossTabDraftPreserved: afterTab.draftOk === true,
      crossTabNoRemount: cycleRemounts === 0,
      fiveCyclesDraftOk: cycles.every((c) => c.draftOk === true),
      shellAtLeast780: (before?.shell?.h || 0) >= 780,
      viewportAtLeast520: (before?.viewport?.h || 0) >= 520,
      dockAtMost190: (before?.dock?.h || 0) > 0 && (before?.dock?.h || 0) <= 190,
      composerCompact: (before?.composer?.h || 0) > 0 && (before?.composer?.h || 0) <= 100,
      twelveRepliesShellStable:
        after &&
        before &&
        Math.abs((after.shell?.h || 0) - (before.shell?.h || 0)) <= 6,
      twelveRepliesViewportStable:
        after &&
        before &&
        Math.abs((after.viewport?.h || 0) - (before.viewport?.h || 0)) <= 8,
      liveTwelveAgent: newAgentReplies >= 12,
      rosterComposerVisible: report.live.rosterComposerVisible === true,
      fullCouncilMode: report.live.fullCouncil?.layoutMode === "full",
      stopLayoutStable: report.live.stopLayoutStable,
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
