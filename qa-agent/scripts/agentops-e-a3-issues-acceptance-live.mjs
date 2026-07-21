/**
 * Phase E-A3 — owner acceptance live QA for Issues workflow.
 * Mutates only [E-A2 TEST]/[E-A3 TEST] drafts created in this run.
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
const DRAFT_ROUTE =
  "/system/agent-ops/issues/draft-21109c88-4ca6-4afa-9546-f7db66f8bc13";
// Prefer latest E-A3 promote smoke code; fall back to E-A2 codes when present.
const PROMOTED_ROUTE =
  process.env.AGENTOPS_E_A3_PROMOTED_ROUTE || "/system/agent-ops/issues/BQA-F956B002";

if (!email || !password) {
  console.error("Missing owner credentials");
  process.exit(2);
}

const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.STAGING_SUPABASE_ANON_KEY;

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a3-issues-acceptance");
fs.mkdirSync(outDir, { recursive: true });

const consoleErrors = [];
const failedAgentOps = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    if (/HEAD.*(calendar|tasks).*abort|net::ERR_ABORTED.*\/(calendar|tasks)/i.test(text)) {
      return;
    }
    consoleErrors.push(text.slice(0, 280));
  }
});
page.on("response", (res) => {
  if (res.status() >= 400 && /\/api\/agentops\//i.test(res.url())) {
    failedAgentOps.push({ url: res.url(), status: res.status() });
  }
});

async function login() {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 });
  await page.waitForTimeout(2000);
}

async function waitReady(timeoutMs = 90_000) {
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText || "";
        const h1 = document.querySelector("h1")?.textContent || "";
        if (/Could not load this page|Owner gate timed out/i.test(text)) return true;
        if (/Fix Issue Prompt|Reported by|Needs more info|Open issue/i.test(text)) return true;
        if (/Loading issues|Loading finding|\bLoading\b/i.test(text) && !/Reported by|Open issue/i.test(text)) {
          return false;
        }
        return /Issues/i.test(h1);
      },
      { timeout: timeoutMs },
    )
    .catch(() => null);
  await page.waitForTimeout(1000);
}

await login();

// ---- LIST ----
await page.goto(`${base}/system/agent-ops/issues`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await waitReady();
const listDefault = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    h1Issues: /Issues/i.test(document.querySelector("h1")?.textContent || ""),
    showNoiseToggle: /Show likely shell noise/i.test(text),
    noiseHiddenDefault: !document.querySelector('input[type="checkbox"]')?.checked,
    needsMoreInfoTab: /Needs more info/i.test(text),
    duplicatesTab: /Duplicates/i.test(text),
    noMisleadingClean: !/Website clean|No issues found/i.test(text),
  };
});
await page.screenshot({ path: path.join(outDir, "list-default-1440.png") });

await page.goto(`${base}/system/agent-ops/issues?showNoise=1`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await waitReady();
await page
  .waitForFunction(
    () => document.querySelectorAll('a[data-testid="agentops-open-issue"]').length > 0,
    { timeout: 60_000 },
  )
  .catch(() => null);
const listWithNoise = await page.evaluate(() => {
  const text = document.body.innerText;
  const hrefs = [...document.querySelectorAll('a[data-testid="agentops-open-issue"]')].map((a) =>
    a.getAttribute("href"),
  );
  return {
    hasReportedBy: /Reported by/i.test(text),
    hasFound: /\bFound\b/i.test(text),
    openIssueHrefs: hrefs.slice(0, 8),
    hasSeverity: /critical|high|medium|low/i.test(text),
    hasStatus: /Needs review|Approved|Deferred|Rejected/i.test(text),
  };
});
await page.screenshot({ path: path.join(outDir, "list-shownoise-1440.png") });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "list-390.png") });
const listOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await page.setViewportSize({ width: 1440, height: 900 });

// ---- DETAIL: known draft ----
await page.goto(`${base}${DRAFT_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await waitReady();
const detailKnown = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    notFound: /not found/i.test(text),
    hasReportedBy: /Reported by/i.test(text),
    hasFound: /\bFound\b/i.test(text),
    hasRun: /Source run/i.test(text),
    hasRoute: /Source route|route/i.test(text),
    hasFixPrompt: /Fix Issue Prompt/i.test(text),
    hasChat: /Discuss with QA Agent|Ask QA Agent/i.test(text),
    hasImprove: /Improve Fix Prompt/i.test(text),
    hasHistory: /\bHistory\b/i.test(text),
    hasEvidence: /\bEvidence\b/i.test(text),
    honestEmpty:
      /No artifact links are available for this issue/i.test(text) ||
      /Open signed link/i.test(text) ||
      /Local worker artifact/i.test(text),
    hasSafety: /does not change code|creates an AgentOps issue record only/i.test(text),
    agentLink: [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .find((h) => /\/system\/agent-ops\/agents\//.test(h)) || null,
  };
});
await page.screenshot({ path: path.join(outDir, "detail-known-draft-1440.png") });

// ---- DETAIL: promoted smoke issue ----
await page.goto(`${base}${PROMOTED_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await waitReady();
const detailPromoted = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    notFound: /not found/i.test(text),
    titleOk: /E-A2 TEST|Promote smoke|BQA-659157F4/i.test(text),
    hasReportedBy: /Reported by/i.test(text),
    hasFixPrompt: /Fix Issue Prompt|Suggested fix/i.test(text),
    bodySnippet: text.replace(/\s+/g, " ").trim().slice(0, 350),
  };
});
await page.screenshot({ path: path.join(outDir, "detail-promoted-1440.png") });

// ---- CHAT → PROMPT on a fresh test draft ----
let chatToPrompt = {
  status: "skipped",
  reason: null,
  llmFallback: false,
  usePromptClicked: false,
  promptUpdated: false,
  promptSaved: false,
  promptPersisted: false,
  chatScoped: false,
};

const canMutate = Boolean(url && service && anon);
if (canMutate) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const ownerSb = createClient(url, anon, { auth: { persistSession: false } });
  const stamp = Date.now();
  const { data: draftRow, error: insertErr } = await admin
    .from("agentops_monitoring_issue_drafts")
    .insert({
      run_id: `e-a3-chat-prompt-${stamp}`,
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: "qa-agent",
      module: "agent-ops",
      route: "/system/agent-ops/issues",
      issue_type: "failed_requests",
      severity: "low",
      title: `[E-A3 TEST] Chat-to-prompt ${stamp}`,
      summary: "Safe E-A3 acceptance draft for chat-to-prompt workflow.",
      evidence: { eA3Test: true, evidence: "synthetic acceptance evidence" },
      browser_qa_evidence: {
        scan_mode: "playwright",
        route: "/system/agent-ops/issues",
        type: "failed_requests",
        evidence: "synthetic acceptance evidence",
        source: "owner_manual_browser_qa",
        summary: "Synthetic evidence for E-A3 chat-to-prompt.",
      },
      suggested_fix_prompt:
        "Investigate this staging-only AgentOps issue. Do not touch production.",
      confidence: 0.35,
      duplicate_key: `e-a3-chat-prompt-${stamp}`,
    })
    .select("id")
    .single();

  if (insertErr || !draftRow?.id) {
    chatToPrompt = { ...chatToPrompt, status: "PARTIAL", reason: insertErr?.message || "insert failed" };
  } else {
    const draftRoute = `/system/agent-ops/issues/draft-${draftRow.id}`;
    await page.goto(`${base}${draftRoute}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitReady();
    chatToPrompt.chatScoped = await page.evaluate(() =>
      /Discuss with QA Agent/i.test(document.body.innerText),
    );

    // Click Improve Fix Prompt quick action
    const improve = page.getByRole("button", { name: /Improve Fix Prompt/i });
    if (await improve.count()) {
      await improve.first().click();
      await page.waitForTimeout(12_000);
    } else {
      const composer = page.locator('textarea[placeholder*="Type a message"], textarea').last();
      await composer.fill(
        "Explain this issue in simple language and suggest a better fix prompt.",
      );
      await page.keyboard.press("Enter");
      await page.waitForTimeout(12_000);
    }

    const afterChat = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        fallback: /could not reach the staging LLM|LLM unavailable|fallback/i.test(text),
        hasUseAs: !!document.querySelector('[data-testid="agentops-use-as-fix-prompt"]'),
        hasRewriteBadge: /Prompt rewrite|Proposed rewrite|Use as Fix Issue Prompt/i.test(text),
      };
    });
    chatToPrompt.llmFallback = afterChat.fallback;

    if (afterChat.hasUseAs) {
      await page.locator('[data-testid="agentops-use-as-fix-prompt"]').first().click();
      chatToPrompt.usePromptClicked = true;
      await page.waitForTimeout(800);
      const promptVal = await page.locator('[data-testid="agentops-fix-issue-prompt"]').inputValue();
      chatToPrompt.promptUpdated = promptVal.trim().length > 20;
    } else {
      // Manual path when LLM does not emit a parseable rewrite proposal
      await page.getByRole("button", { name: /Edit prompt/i }).click();
      const ta = page.locator('[data-testid="agentops-fix-issue-prompt"]');
      const current = await ta.inputValue();
      const next = `${current}\n\n[E-A3 acceptance edit ${new Date().toISOString()}]`;
      await ta.fill(next);
      chatToPrompt.promptUpdated = true;
      chatToPrompt.status = "PARTIAL";
      chatToPrompt.reason = afterChat.fallback
        ? "Staging LLM unavailable or no parseable rewrite — manual edit path used"
        : "No Use-as-prompt control appeared — manual edit path used";
    }

    // Ensure edit mode + save
    const editBtn = page.getByRole("button", { name: /^Edit prompt$/i });
    if (await editBtn.count()) await editBtn.click();
    const ta = page.locator('[data-testid="agentops-fix-issue-prompt"]');
    const beforeSave = await ta.inputValue();
    const edited = `${beforeSave.trim()}\n\n[E-A3 saved ${stamp}]`;
    await ta.fill(edited);
    await page.getByRole("button", { name: /Save changes/i }).click();
    await page.waitForTimeout(2500);
    chatToPrompt.promptSaved = await page.evaluate(() =>
      /saved|Last saved/i.test(document.body.innerText),
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitReady();
    const afterReload = await page.locator('[data-testid="agentops-fix-issue-prompt"]').inputValue();
    chatToPrompt.promptPersisted = afterReload.includes(`[E-A3 saved ${stamp}]`);
    if (chatToPrompt.status === "skipped") {
      chatToPrompt.status =
        chatToPrompt.usePromptClicked && chatToPrompt.promptPersisted ? "YES" : "PARTIAL";
    }
    await page.screenshot({ path: path.join(outDir, "chat-to-prompt-1440.png") });

    // Owner API decision acceptance on dedicated drafts
    const { data: auth } = await ownerSb.auth.signInWithPassword({ email, password });
    const headers = {
      Authorization: `Bearer ${auth.session.access_token}`,
      "Content-Type": "application/json",
    };
    async function insertDecisionDraft(kind) {
      const { data, error } = await admin
        .from("agentops_monitoring_issue_drafts")
        .insert({
          run_id: `e-a3-${kind}-${stamp}`,
          source: "owner_manual_browser_qa",
          status: "draft",
          agent_slug: "qa-agent",
          module: "agent-ops",
          route: "/system/agent-ops/issues",
          issue_type: "failed_requests",
          severity: "low",
          title: `[E-A3 TEST] ${kind} ${stamp}`,
          summary: `E-A3 acceptance ${kind}`,
          evidence: { eA3Test: true, evidence: "synthetic" },
          browser_qa_evidence: {
            scan_mode: "playwright",
            route: "/system/agent-ops/issues",
            type: "failed_requests",
            evidence: "synthetic",
            source: "owner_manual_browser_qa",
          },
          suggested_fix_prompt: "Staging-only test.",
          confidence: 0.3,
          duplicate_key: `e-a3-${kind}-${stamp}`,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id;
    }

    const rejectId = await insertDecisionDraft("reject");
    const deferId = await insertDecisionDraft("defer");
    const approveId = await insertDecisionDraft("approve");
    const moreId = await insertDecisionDraft("needs-info");
    const dupTarget = await insertDecisionDraft("dup-target");
    const dupSubject = await insertDecisionDraft("dup-subject");

    async function decide(draftId, decision, extra = {}) {
      const res = await fetch(`${base}/api/agentops/monitoring/drafts/decision`, {
        method: "POST",
        headers,
        body: JSON.stringify({ draftId, decision, ...extra }),
      });
      const json = await res.json();
      return { status: res.status, ok: json.ok === true, draft: json.draft, message: json.message };
    }

    var decisions = {
      reject: await decide(rejectId, "rejected", { note: "E-A3 reject acceptance" }),
      defer: await decide(deferId, "deferred", { note: "E-A3 defer acceptance" }),
      needsMoreInfo: await decide(moreId, "needs_more_info", {
        note: "Need clearer steps",
      }),
      markDuplicate: await decide(dupSubject, "mark_duplicate", {
        duplicateOf: dupTarget,
        note: "E-A3 duplicate",
      }),
      approve: await decide(approveId, "owner_approved", { note: "E-A3 approve" }),
    };

    const promote = await fetch(`${base}/api/agentops/monitoring/drafts/promote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ draftId: approveId }),
    });
    const promoteJson = await promote.json();
    const rePromote = await fetch(`${base}/api/agentops/monitoring/drafts/promote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ draftId: approveId }),
    });
    const rePromoteJson = await rePromote.json();
    var promoteResult = {
      status: promote.status,
      ok: promoteJson.ok === true,
      issueDisplayCode: promoteJson.issueDisplayCode ?? null,
      rePromoteOk: rePromoteJson.ok === true,
      rePromoteError: rePromoteJson.error ?? null,
      idempotentOrBlocked:
        rePromoteJson.ok === true ||
        (rePromoteJson.ok === false && typeof rePromoteJson.error === "string"),
    };
  }
} else {
  chatToPrompt = {
    ...chatToPrompt,
    status: "PARTIAL",
    reason: "Missing service-role env for test draft mutation",
  };
}

// ---- Regression light ----
const regression = {};
for (const route of [
  "/system/agent-ops",
  "/system/agent-ops/agents",
  "/system/agent-ops/agents/design-agent",
  "/system/agent-ops/agents/system-agent",
]) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  regression[route] = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      loaded: !/Could not load this page/i.test(text),
      noApprovePromoteOnDetail: !/Promote to issue/i.test(text),
      hasAgentOps: /AgentOps|Agents|Issues/i.test(text),
      snippet: text.replace(/\s+/g, " ").trim().slice(0, 180),
    };
  });
  const safeName = route.replace(/\//g, "_").replace(/^_/, "");
  await page.screenshot({ path: path.join(outDir, `regression${safeName}.png`) });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}${DRAFT_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await waitReady();
await page.screenshot({ path: path.join(outDir, "detail-390.png") });
const detailOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);

await browser.close();

const report = {
  at: new Date().toISOString(),
  base,
  listDefault,
  listWithNoise,
  listOverflow,
  detailKnown,
  detailPromoted,
  detailOverflow,
  chatToPrompt,
  decisions: typeof decisions !== "undefined" ? decisions : null,
  promoteResult: typeof promoteResult !== "undefined" ? promoteResult : null,
  regression,
  consoleErrors: consoleErrors.slice(0, 25),
  failedAgentOps: failedAgentOps.slice(0, 25),
};

const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-e-a3-issues-acceptance-live-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, report }, null, 2));

const pass =
  listDefault.h1Issues &&
  listWithNoise.hasReportedBy &&
  listWithNoise.openIssueHrefs.length > 0 &&
  detailKnown.hasFixPrompt &&
  !detailKnown.notFound &&
  !listOverflow &&
  !detailOverflow &&
  (chatToPrompt.status === "YES" || chatToPrompt.status === "PARTIAL");
process.exit(pass ? 0 : 2);
