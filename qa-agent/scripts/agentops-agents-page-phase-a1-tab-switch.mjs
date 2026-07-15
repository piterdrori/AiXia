/**
 * Phase A.1 — Real Chromium multi-tab switch reproduction + live Council layout measures.
 * Uses real browser tabs (context.newPage), not synthetic focus events alone.
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
  "agentops-agents-page-phase-a1-tab-switch.json",
);

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const DRAFT = "TAB-SWITCH-PRESERVATION-TEST";

async function injectDiag(page) {
  await page.addInitScript(() => {
    const g = (window.__A1_DIAG__ = {
      timeOrigin: performance.timeOrigin,
      pageshow: [],
      pagehide: [],
      visibility: [],
      fetches: [],
      messengerRemovals: 0,
      messengerAdds: 0,
      wasDiscarded: typeof document.wasDiscarded === "boolean" ? document.wasDiscarded : null,
    });
    window.addEventListener("pageshow", (e) => {
      g.pageshow.push({
        t: Date.now(),
        persisted: e.persisted,
        timeOrigin: performance.timeOrigin,
        nav: performance.getEntriesByType("navigation").map((n) => ({
          type: n.type,
          transferSize: n.transferSize,
        })),
      });
    });
    window.addEventListener("pagehide", (e) => {
      g.pagehide.push({ t: Date.now(), persisted: e.persisted });
    });
    document.addEventListener("visibilitychange", () => {
      g.visibility.push({ t: Date.now(), state: document.visibilityState });
    });
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/api/agentops/") || url.includes("supabase") || url.includes("auth")) {
        g.fetches.push({ t: Date.now(), url: url.slice(0, 180) });
      }
      return orig(...args);
    };
  });
}

function snap(page) {
  return page.evaluate((draft) => {
    const shell = document.querySelector('[data-testid="agentops-agents-council-messenger"]');
    const viewport = shell?.querySelector(".aixia-messenger-shell__viewport");
    const dock = shell?.querySelector(".aixia-messenger-shell__dock");
    const composer = shell?.querySelector("textarea");
    const section = document.querySelector('[data-testid="agentops-agents-council-embed"]')
      ?.closest(".aixia-section") || document.querySelector(".aixia-section-body--council-embed")?.closest(".aixia-section");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { h: Math.round(b.height), w: Math.round(b.width), top: Math.round(b.top) };
    };
    const diag = window.__A1_DIAG__ || {};
    return {
      timeOrigin: performance.timeOrigin,
      wasDiscarded: typeof document.wasDiscarded === "boolean" ? document.wasDiscarded : null,
      visibilityState: document.visibilityState,
      pathname: location.pathname,
      pageScrollY: Math.round(window.scrollY),
      viewportScrollTop: viewport ? Math.round(viewport.scrollTop) : null,
      draft: composer ? composer.value : null,
      draftMatch: composer ? composer.value === draft : false,
      messengerConnected: Boolean(shell?.isConnected),
      section: r(section),
      shell: r(shell),
      viewport: r(viewport),
      dock: r(dock),
      layoutMode: shell?.getAttribute("data-messenger-layout"),
      pageshow: diag.pageshow || [],
      pagehide: diag.pagehide || [],
      visibilityEvents: (diag.visibility || []).length,
      fetchCount: (diag.fetches || []).length,
      agentOpsFetches: (diag.fetches || []).filter((f) => f.url.includes("/api/agentops/")).length,
      monitoringFetches: (diag.fetches || []).filter((f) => f.url.includes("monitoring")).length,
      nav: performance.getEntriesByType("navigation").map((n) => ({
        type: n.type,
        transferSize: n.transferSize,
      })),
      loaderVisible: Boolean(
        document.body.innerText.includes("Loading") &&
          document.querySelector('[class*="animate-spin"], .aixia-async-state'),
      ),
    };
  }, DRAFT);
}

async function main() {
  const report = {
    baseUrl: base,
    startedAt: new Date().toISOString(),
    cycles: [],
    before: null,
    after: null,
    verdict: {},
    errors: [],
  };

  if (!email || !password) {
    report.errors.push("Missing owner credentials");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageA = await context.newPage();
  await injectDiag(pageA);

  try {
    await pageA.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pageA.getByLabel(/email/i).fill(email);
    await pageA.getByLabel(/^password$/i).fill(password);
    await pageA.getByRole("button", { name: /sign in/i }).click();
    await pageA.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 });

    await pageA.goto(`${base}/system/agent-ops/agents`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await pageA.getByTestId("agentops-agents-council-messenger").waitFor({ timeout: 120000 });
    await pageA.waitForTimeout(4000);

    // observe messenger remounts
    await pageA.evaluate(() => {
      const g = window.__A1_DIAG__;
      const root = document.body;
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.removedNodes) {
            if (n.nodeType === 1 && (n.matches?.('[data-testid="agentops-agents-council-messenger"]') || n.querySelector?.('[data-testid="agentops-agents-council-messenger"]'))) {
              g.messengerRemovals += 1;
            }
          }
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 && (n.matches?.('[data-testid="agentops-agents-council-messenger"]') || n.querySelector?.('[data-testid="agentops-agents-council-messenger"]'))) {
              g.messengerAdds += 1;
            }
          }
        }
      });
      mo.observe(root, { childList: true, subtree: true });
      g._mo = true;
    });

    const composer = pageA.getByTestId("agentops-agents-council-messenger").locator("textarea").first();
    await composer.fill(DRAFT);

    await pageA.evaluate(() => {
      const vp = document.querySelector(
        '[data-testid="agentops-agents-council-messenger"] .aixia-messenger-shell__viewport',
      );
      if (vp) vp.scrollTop = Math.max(40, Math.floor(vp.scrollHeight * 0.35));
      window.scrollTo(0, 420);
    });

    // reset fetch counter after settle
    await pageA.evaluate(() => {
      if (window.__A1_DIAG__) window.__A1_DIAG__.fetches = [];
    });

    report.before = await snap(pageA);
    await pageA.screenshot({ path: path.join(outDir, "before-tab-switch.png") });

    const pageB = await context.newPage();
    await pageB.goto("about:blank");

    for (let i = 0; i < 5; i += 1) {
      await pageB.bringToFront();
      await pageB.waitForTimeout(10_000);
      await pageA.bringToFront();
      await pageA.waitForTimeout(2500);
      const mid = await snap(pageA);
      const diag = await pageA.evaluate(() => ({
        messengerRemovals: window.__A1_DIAG__?.messengerRemovals ?? 0,
        messengerAdds: window.__A1_DIAG__?.messengerAdds ?? 0,
        fetches: (window.__A1_DIAG__?.fetches || []).slice(-20),
      }));
      report.cycles.push({ i: i + 1, snap: mid, diag });
      await pageA.screenshot({ path: path.join(outDir, `after-cycle-${i + 1}.png`) });
    }

    report.after = await snap(pageA);
    const finalDiag = await pageA.evaluate(() => window.__A1_DIAG__);

    const timeOriginStable = report.before.timeOrigin === report.after.timeOrigin;
    const draftOk = report.after.draftMatch === true;
    const pageScrollOk = Math.abs((report.after.pageScrollY || 0) - (report.before.pageScrollY || 0)) <= 2;
    const chatScrollOk =
      report.after.viewportScrollTop != null &&
      Math.abs((report.after.viewportScrollTop || 0) - (report.before.viewportScrollTop || 0)) <= 8;
    const messengerRemounted = (finalDiag.messengerRemovals || 0) > 0;
    const monitoringAfter = report.cycles.reduce(
      (n, c) => n + (c.snap.monitoringFetches || 0),
      0,
    );
    // monitoringFetches in snap is cumulative from start of diag — compare before vs after
    const monitoringDelta = (report.after.monitoringFetches || 0) - (report.before.monitoringFetches || 0);
    const agentOpsDelta = (report.after.agentOpsFetches || 0) - (report.before.agentOpsFetches || 0);

    report.finalDiag = {
      messengerRemovals: finalDiag.messengerRemovals,
      messengerAdds: finalDiag.messengerAdds,
      pageshow: finalDiag.pageshow,
      pagehide: finalDiag.pagehide,
      fetchSample: (finalDiag.fetches || []).slice(-30),
    };

    report.verdict = {
      realChromeTabSwitchTested: true,
      documentReload: !timeOriginStable || (report.after.nav?.[0]?.type === "reload" && !timeOriginStable),
      timeOriginStable,
      reactMessengerRemount: messengerRemounted,
      draftPreserved: draftOk,
      pageScrollPreserved: pageScrollOk,
      chatScrollPreserved: chatScrollOk,
      monitoringDelta,
      agentOpsDelta,
      wasDiscarded: report.after.wasDiscarded,
      pageshowPersisted: (finalDiag.pageshow || []).some((p) => p.persisted),
    };

    // classify
    let category = "H";
    if (!timeOriginStable) category = "A";
    else if (report.after.wasDiscarded || report.verdict.pageshowPersisted) category = "B";
    else if (messengerRemounted) category = "C"; // or F — messenger remount implies route/child remount
    else if (monitoringDelta > 0 || agentOpsDelta > 0) category = "E";
    else if (!draftOk || !pageScrollOk) category = "G";
    else category = "H"; // no reproduced reset — or layout-only
    report.verdict.rootCauseCategory = category;
    report.verdict.tabSwitchReloadReproduced =
      messengerRemounted || !draftOk || !timeOriginStable || monitoringDelta > 0;
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
