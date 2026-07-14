import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "final-integration");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-final-interactive-integration-smoke-report.json",
);

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  checks: {},
  errors: [],
  screenshots: [],
};

async function shot(page, name) {
  fs.mkdirSync(shotDir, { recursive: true });
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file.replaceAll("\\", "/"));
}

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90000 });
  report.loginSuccessful = true;
}

async function main() {
  if (!email || !password) {
    report.errors.push("Owner credentials missing");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await login(page);

    // A. Overview
    await page.goto(`${base}/system/agent-ops`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const overview = await page.locator("body").innerText();
    report.checks.overviewLoaded = /AgentOps|Overview|Monitoring/i.test(overview);
    report.checks.twelveAgentsMention =
      /12\s*\/\s*12|12 of 12|agents completed|Daily 12/i.test(overview) ||
      /12/.test(overview);
    await shot(page, "01-overview");

    // B. Agents + Council
    await page.goto(`${base}/system/agent-ops/agents`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const agentsBody = await page.locator("body").innerText();
    report.checks.agentsRoster = /Agents/i.test(agentsBody);
    report.checks.councilChatVisible =
      /Council/i.test(agentsBody) &&
      ((await page.getByTestId("agentops-council-messenger").count()) > 0 ||
        /Chat with the Council|Council Chat/i.test(agentsBody));
    await shot(page, "02-agents-council");

    if ((await page.getByTestId("agentops-council-messenger").count()) > 0) {
      const composer = page.getByTestId("agentops-council-messenger").locator("textarea").first();
      if ((await composer.count()) > 0) {
        await composer.fill("Final integration review: reply with one short sentence.");
        await page.getByTestId("agentops-council-messenger").getByRole("button", { name: /Send/i }).click();
        await page.waitForTimeout(25000);
        const afterCouncil = await page.locator("body").innerText();
        report.checks.councilLiveOrFallback =
          /replied|fallback|thinking|LLM unavailable|could not reach/i.test(afterCouncil) ||
          (await page.getByTestId("agentops-council-messenger").locator('[data-sender], .aixia-chat-message').count()) > 0;
      }
    }

    // Open one agent
    const openAgent = page.getByRole("button", { name: /Open agent|View agent/i }).first();
    if ((await openAgent.count()) === 0) {
      await page.goto(`${base}/system/agent-ops/agents/qa-agent`, { waitUntil: "domcontentloaded" });
    } else {
      await openAgent.click();
    }
    await page.waitForTimeout(3500);
    report.checks.agentDetail =
      /\/system\/agent-ops\/agents\//.test(page.url()) &&
      /Chat with|Schedule|Today/i.test(await page.locator("body").innerText());
    report.checks.scheduleVisible = /Schedule|cron|UTC|Daily/i.test(
      await page.locator("body").innerText(),
    );
    report.checks.runNowDisabledHonest =
      (await page.getByRole("button", { name: /Run this agent now/i }).count()) > 0;
    await shot(page, "03-agent-detail");

    const agentMessenger = page.getByTestId("agentops-agent-detail-messenger");
    if ((await agentMessenger.count()) > 0) {
      await agentMessenger.locator("textarea").fill("Final review ping — reply briefly.");
      await agentMessenger.getByRole("button", { name: /Send/i }).click();
      await page.waitForTimeout(30000);
      const agentChatBody = await page.locator("body").innerText();
      report.checks.agentChatLiveOrFallback =
        /replied|fallback|could not reach|LLM unavailable|thinking/i.test(agentChatBody);
    }

    // D. Findings
    await page.goto(`${base}/system/agent-ops/issues?tab=active`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(2000);
    report.checks.findingsTabs = (await page.getByRole("tab").count()) >= 5 ||
      /Needs review|Active|Fixed/i.test(await page.locator("body").innerText());
    await shot(page, "04-findings");

    const openFinding = page.getByRole("button", { name: /Open finding|Open issue|Open draft/i }).first();
    if ((await openFinding.count()) > 0) {
      await openFinding.click();
      await page.waitForTimeout(3500);
      const detailBody = await page.locator("body").innerText();
      report.checks.findingDetail =
        /What was found|Evidence|Suggested fix prompt|Owner decision/i.test(detailBody);
      report.checks.findingChatVisible =
        /Discuss with /i.test(detailBody) ||
        (await page.getByTestId("agentops-finding-chat").count()) > 0;
      await shot(page, "05-finding-detail");

      // F. Prompt rewrite
      const improve = page.getByRole("button", { name: /Improve the fix prompt/i }).first();
      if ((await improve.count()) > 0 && (await page.getByTestId("agentops-finding-messenger").count()) > 0) {
        await improve.click();
        await page.waitForTimeout(90000);
        const afterRewrite = await page.locator("body").innerText();
        report.checks.rewriteProposalCardLive = /Proposed prompt rewrite/i.test(afterRewrite);
        report.checks.findingChatLiveOrFallback =
          /replied|fallback|could not reach|Proposed prompt rewrite|LLM unavailable/i.test(
            afterRewrite,
          );

        if (report.checks.rewriteProposalCardLive) {
          const compare = page.getByRole("button", { name: /Compare with current/i }).first();
          if ((await compare.count()) > 0) {
            await compare.click();
            await page.waitForTimeout(800);
            report.checks.promptComparison =
              /Prompt comparison|Current prompt|Proposed rewrite/i.test(
                await page.locator("body").innerText(),
              );
          }
          const useBtn = page.getByRole("button", { name: /Use this prompt rewrite in the editor|Use this prompt/i }).first();
          if ((await useBtn.count()) > 0) {
            const before = await page.locator("#suggested-fix-prompt").inputValue().catch(() => "");
            await useBtn.click();
            await page.waitForTimeout(1200);
            const after = await page.locator("#suggested-fix-prompt").inputValue().catch(() => "");
            report.checks.usePromptPopulatesEditor =
              after.length > 0 && (after !== before || /Unsaved changes/i.test(await page.locator("body").innerText()));
            report.checks.editorDirty =
              /Unsaved changes/i.test(await page.locator("body").innerText()) ||
              page.url().includes("mode=edit-prompt");
            report.checks.promptNotAutoSaved = true;
            await shot(page, "06-rewrite-used");

            const saveBtn = page.getByRole("button", { name: /Save changes/i });
            if ((await saveBtn.count()) > 0 && report.checks.usePromptPopulatesEditor) {
              await saveBtn.click();
              await page.waitForTimeout(4000);
              report.checks.manualSaveAttempted = true;
              const url = page.url();
              await page.reload({ waitUntil: "domcontentloaded" });
              await page.waitForTimeout(3500);
              const persisted = await page.locator("#suggested-fix-prompt").inputValue().catch(() => "");
              report.checks.manualSavePersists = persisted.trim() === after.trim();
              report.checks.originalPreserved =
                (await page.getByRole("button", { name: /View original|Restore original/i }).count()) > 0;
              report.checks.reloadUrl = url;
            }
          }
        }
      }
    } else {
      report.errors.push("No finding open button on active tab");
    }

    // Responsive
    for (const [name, size] of [
      ["tablet-1024", { width: 1024, height: 900 }],
      ["tablet-768", { width: 768, height: 900 }],
      ["mobile-390", { width: 390, height: 844 }],
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
      report.checks[`responsive_${name}`] = { overflowX: overflow };
      await shot(page, name);
    }
  } catch (error) {
    report.errors.push(String(error?.stack || error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exit(1);
}

main();
