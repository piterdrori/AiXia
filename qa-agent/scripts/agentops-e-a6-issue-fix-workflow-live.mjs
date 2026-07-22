/**
 * E-A6 — Issue detail fix-with-Cursor workflow live QA (staging).
 * Creates [E-A6 TEST] drafts, exercises Fix with Cursor / Mark as fixed / Delete issue,
 * checks default-list hiding, advanced-only Mark duplicate, and anonymous security.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile("qa-agent/browser-qa/.env.owner.local");

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !url || !service) {
  console.error("Missing owner credentials or staging Supabase env.");
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a6-issue-fix-workflow");
fs.mkdirSync(outDir, { recursive: true });

async function insertDraft(kind) {
  const { data, error } = await admin
    .from("agentops_monitoring_issue_drafts")
    .insert({
      run_id: `e-a6-${kind}-${stamp}`,
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: "qa-agent",
      module: "agent-ops",
      route: "/system/agent-ops/issues",
      issue_type: "failed_requests",
      severity: "low",
      title: `[E-A6 TEST] ${kind} ${stamp}`,
      summary: `E-A6 fix workflow ${kind}`,
      evidence: { eA6Test: true, evidence: "synthetic" },
      browser_qa_evidence: {
        scan_mode: "playwright",
        route: "/system/agent-ops/issues",
        type: "failed_requests",
        evidence: "synthetic",
        source: "owner_manual_browser_qa",
      },
      suggested_fix_prompt: "Staging-only E-A6 test.",
      confidence: 0.3,
      duplicate_key: `e-a6-${kind}-${stamp}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

const fixDraftId = await insertDraft("fix-flow");
const deleteDraftId = await insertDraft("delete-flow");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();

async function login() {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
  await page.waitForTimeout(2000);
}

async function openDetail(draftId) {
  await page.goto(`${base}/system/agent-ops/issues/draft-${draftId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await waitDetailSettled();
}

async function waitDetailSettled(timeoutMs = 60_000) {
  await page
    .waitForFunction(
      () =>
        /Current status:/.test(document.body.innerText || "") &&
        !/Loading finding|Loading issue…/.test(document.body.innerText || ""),
      { timeout: timeoutMs },
    )
    .catch(() => null);
  await page.waitForTimeout(800);
}

async function waitForStatus(labelRegex, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = await page.evaluate((pattern) => {
      const match = (document.body.innerText || "").match(/Current status:\s*([A-Za-z ]+)/);
      return match ? new RegExp(pattern, "i").test(match[1]) : false;
    }, labelRegex);
    if (hit) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

async function waitListSettled(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const loading = /Loading issues/i.test(text);
      const cards = document.querySelectorAll('[data-testid="agentops-issue-card"]').length;
      const empty = /No issues|No fixed issues|No deleted issues/i.test(text);
      return !loading && (cards > 0 || empty);
    });
    if (ready) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
}

const report = { at: new Date().toISOString(), base, fixDraftId, deleteDraftId };

try {
  await login();

  // ── Detail page — prime actions + owner copy ─────────────────────────────
  await openDetail(fixDraftId);
  report.detail = await page.evaluate(() => {
    const prime = document.querySelector('[data-testid="agentops-prime-actions"]');
    const primeText = prime?.textContent ?? "";
    // Chrome keeps closed <details> content layout-queryable (hidden-until-found), so
    // rect/offsetParent checks lie. Semantic check: prime-flow Mark duplicate buttons must
    // all live inside a collapsed <details> (Advanced actions) — none outside it.
    const markDuplicateBtns = [...document.querySelectorAll("button")].filter((btn) =>
      /^Mark duplicate$/.test((btn.textContent || "").trim()),
    );
    const visible = (btn) => {
      const details = btn.closest("details");
      return !details || details.open;
    };
    return {
      primeHasFixWithCursor: /Fix with Cursor/.test(primeText),
      primeHasDeleteIssue: /Delete issue/.test(primeText),
      primeHasApprove: /\bApprove\b/.test(primeText),
      primeHasDefer: /\bDefer\b/.test(primeText),
      primeHasReject: /\bReject\b/.test(primeText),
      pageCheckedVisible: Boolean(
        document.querySelector('[data-testid="agentops-page-checked"]'),
      ),
      pageCheckedLink:
        document
          .querySelector('[data-testid="agentops-page-checked"] a')
          ?.getAttribute("href") ?? null,
      suggestedSolutionText:
        document
          .querySelector('[data-testid="agentops-suggested-solution"]')
          ?.textContent?.slice(0, 160) ?? null,
      activityLogVisible: /Activity log/.test(document.body.innerText),
      markDuplicateVisibleByDefault: markDuplicateBtns.some(visible),
      safetyCopy: /Fix with Cursor uses the Fix Issue Prompt on staging only/.test(
        document.body.innerText,
      ),
    };
  });

  // ── Structured template + save persistence ───────────────────────────────
  await page.locator('[data-testid="agentops-structured-template"]').click();
  await page.waitForTimeout(800);
  const promptValue = await page
    .locator('[data-testid="agentops-fix-issue-prompt"]')
    .inputValue();
  report.structuredTemplate = {
    hasHeader: promptValue.startsWith("AGENTOPS ISSUE FIX — STAGING ONLY"),
    hasConstraints: promptValue.includes("Do not touch production."),
    hasPageChecked: promptValue.includes("Page checked by the agent:"),
  };
  await page.getByRole("button", { name: /Save changes/i }).click();
  await page.waitForTimeout(3500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitDetailSettled();
  await page
    .waitForSelector('[data-testid="agentops-fix-issue-prompt"]', { timeout: 60_000 })
    .catch(() => null);
  await page.waitForTimeout(1000);
  const persisted = await page
    .locator('[data-testid="agentops-fix-issue-prompt"]')
    .inputValue();
  report.structuredTemplate.persisted = persisted.startsWith(
    "AGENTOPS ISSUE FIX — STAGING ONLY",
  );

  // ── Copy prompt ───────────────────────────────────────────────────────────
  await page.getByRole("button", { name: /^Copy fix prompt$|^Copy prompt$/i }).first().click();
  await page.waitForTimeout(600);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  report.copyPromptWorks = clip.startsWith("AGENTOPS ISSUE FIX — STAGING ONLY");

  // ── Fix with Cursor handoff → Fixing ─────────────────────────────────────
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
  await page.locator('[data-testid="agentops-fix-with-cursor"]').click();
  const download = await downloadPromise;
  report.fixWithCursor = {
    downloadName: download ? download.suggestedFilename() : null,
    statusFixing: await waitForStatus("Fixing"),
  };
  report.fixWithCursor.handoffStatus = await page.evaluate(
    () =>
      document.querySelector('[data-testid="agentops-handoff-status"]')?.textContent ?? null,
  );
  await page.screenshot({ path: path.join(outDir, "fix-with-cursor-1440.png") });

  // ── Mark as fixed ─────────────────────────────────────────────────────────
  await page.locator('[data-testid="agentops-mark-as-fixed"]').first().click();
  await page.waitForSelector('[data-testid="agentops-mark-fixed-confirm"]', { timeout: 15_000 });
  await page
    .locator('[data-testid="agentops-mark-fixed-confirm"] textarea')
    .fill(`E-A6 live QA verified ${stamp}`);
  await page.getByRole("button", { name: /Confirm mark as fixed/i }).click();
  report.markFixed = {
    statusFixed: await waitForStatus("Fixed"),
  };

  // ── Fixed hidden from default list, present in Fixed tab ─────────────────
  await page.goto(`${base}/system/agent-ops/issues`, { waitUntil: "domcontentloaded" });
  await waitListSettled();
  report.markFixed.hiddenFromDefaultList = await page.evaluate(
    (title) => !document.body.innerText.includes(title),
    `[E-A6 TEST] fix-flow ${stamp}`,
  );
  await page.goto(`${base}/system/agent-ops/issues?tab=fixed`, {
    waitUntil: "domcontentloaded",
  });
  await waitListSettled();
  report.markFixed.visibleInFixedTab = await page.evaluate(
    (title) => document.body.innerText.includes(title),
    `[E-A6 TEST] fix-flow ${stamp}`,
  );

  // ── Delete issue flow ─────────────────────────────────────────────────────
  await openDetail(deleteDraftId);
  await page.locator('[data-testid="agentops-delete-issue"]').click();
  await page.waitForSelector('[data-testid="agentops-delete-confirm"]', { timeout: 15_000 });
  report.deleteFlow = {
    confirmCopy: await page.evaluate(() =>
      /Delete this issue from the active list\? This does not fix code/.test(
        document.body.innerText,
      ),
    ),
  };
  await page.getByRole("button", { name: /Confirm delete/i }).click();
  report.deleteFlow.statusDeleted = await waitForStatus("Deleted");
  await page.screenshot({ path: path.join(outDir, "delete-issue-1440.png") });

  await page.goto(`${base}/system/agent-ops/issues`, { waitUntil: "domcontentloaded" });
  await waitListSettled();
  report.deleteFlow.hiddenFromDefaultList = await page.evaluate(
    (title) => !document.body.innerText.includes(title),
    `[E-A6 TEST] delete-flow ${stamp}`,
  );
  await page.goto(`${base}/system/agent-ops/issues?tab=deleted`, {
    waitUntil: "domcontentloaded",
  });
  await waitListSettled();
  report.deleteFlow.visibleInDeletedTab = await page.evaluate(
    (title) => document.body.innerText.includes(title),
    `[E-A6 TEST] delete-flow ${stamp}`,
  );

  // ── Mobile overflow ───────────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetail(fixDraftId);
  report.mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }));
  await page.screenshot({ path: path.join(outDir, "detail-mobile-390.png") });
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Anonymous security for new decisions ──────────────────────────────────
  async function anonDecision(decision) {
    const res = await fetch(`${base}/api/agentops/monitoring/drafts/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: fixDraftId, decision, ownerId: "spoofed-owner" }),
    });
    return res.status;
  }
  report.security = {
    anonMarkFixing: await anonDecision("mark_fixing"),
    anonMarkFixed: await anonDecision("mark_fixed"),
    anonDeleteIssue: await anonDecision("delete_issue"),
  };
} finally {
  await browser.close();
}

const ok =
  report.detail?.primeHasFixWithCursor === true &&
  report.detail?.primeHasDeleteIssue === true &&
  report.detail?.primeHasApprove === false &&
  report.detail?.primeHasDefer === false &&
  report.detail?.primeHasReject === false &&
  report.detail?.pageCheckedVisible === true &&
  Boolean(report.detail?.suggestedSolutionText) &&
  report.detail?.activityLogVisible === true &&
  report.detail?.markDuplicateVisibleByDefault === false &&
  report.structuredTemplate?.hasHeader === true &&
  report.structuredTemplate?.persisted === true &&
  report.copyPromptWorks === true &&
  report.fixWithCursor?.statusFixing === true &&
  report.markFixed?.statusFixed === true &&
  report.markFixed?.hiddenFromDefaultList === true &&
  report.markFixed?.visibleInFixedTab === true &&
  report.deleteFlow?.statusDeleted === true &&
  report.deleteFlow?.hiddenFromDefaultList === true &&
  report.deleteFlow?.visibleInDeletedTab === true &&
  report.mobile?.overflow === false &&
  report.security?.anonMarkFixing === 401 &&
  report.security?.anonMarkFixed === 401 &&
  report.security?.anonDeleteIssue === 401;

report.ok = ok;
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 2);
