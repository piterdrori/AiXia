import { expect } from "@playwright/test";

export function getIssueWorkspace(page) {
  return page.getByTestId("agentops-issue-workspace");
}

export async function expectIssueWorkspaceReady(page, options = {}) {
  const timeout = options.timeout ?? 60_000;
  const workspace = getIssueWorkspace(page);
  await expect(workspace, "Issue workspace shell should be visible").toBeVisible({ timeout });
  await expect(page.getByTestId("agentops-issue-header"), "Issue header should be visible").toBeVisible({
    timeout,
  });
  await expect(page.getByTestId("agentops-lifecycle-rail"), "Lifecycle rail should be visible").toBeVisible({
    timeout,
  });
  await expect(page.getByTestId("agentops-issue-workbench"), "Workbench should be visible").toBeVisible({
    timeout,
  });
  await expect(
    page.getByTestId("agentops-cursor-prompt-editor"),
    "Cursor prompt editor should be visible or reachable",
  ).toBeVisible({ timeout });
}

export async function openDisclosureByTestId(page, testId, options = {}) {
  const timeout = options.timeout ?? 15_000;
  const locator = page.getByTestId(testId);
  const count = await locator.count();
  if (count === 0) {
    throw new Error(`Disclosure/container missing for test id: ${testId}`);
  }
  const disclosure = locator.first();
  await disclosure.scrollIntoViewIfNeeded().catch(() => {});
  const tagName = await disclosure.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
  if (tagName !== "details") {
    return disclosure;
  }

  const summary = disclosure.locator("summary").first();
  const hasSummary = (await summary.count()) > 0;
  if (!hasSummary) {
    throw new Error(`Details element has no summary for test id: ${testId}`);
  }

  const isOpen = await disclosure.evaluate((el) => el.hasAttribute("open")).catch(() => false);
  if (!isOpen) {
    await summary.click({ timeout });
    await expect.poll(
      async () => disclosure.evaluate((el) => el.hasAttribute("open")).catch(() => false),
      {
        timeout,
        message: `Disclosure did not open for test id: ${testId}`,
      },
    ).toBe(true);
  }

  return disclosure;
}

export async function expectProgressiveDisclosureReachable(page, testId, options = {}) {
  const disclosure = await openDisclosureByTestId(page, testId, options);
  const tagName = await disclosure.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
  if (tagName === "details") {
    await expect
      .poll(async () => disclosure.evaluate((el) => el.hasAttribute("open")).catch(() => false), {
        timeout: options.timeout ?? 15_000,
      })
      .toBe(true);
  }
  return disclosure;
}

export async function expectRuntimeInactiveSafety(page) {
  const technical = await openDisclosureByTestId(page, "agentops-technical-status");
  const technicalText = (await technical.innerText().catch(() => "")).toLowerCase();

  expect(
    technicalText.includes("hermes gate:") && technicalText.includes("runtime active: no"),
    "Hermes runtime should remain inactive",
  ).toBe(true);

  const codegraphDetails = await openDisclosureByTestId(page, "agentops-codegraph-details");
  const codegraphText = (await codegraphDetails.innerText().catch(() => "")).toLowerCase();
  const codegraphInactive =
    technicalText.includes("codegraph gate:") && technicalText.includes("runtime active: no");
  const codegraphAdvisory =
    codegraphText.includes("runtime: not connected") || codegraphText.includes("mock static hints");
  expect(codegraphInactive || codegraphAdvisory, "CodeGraph runtime should remain inactive/advisory").toBe(true);

  // Local LLM is not always surfaced in this page; only fail if explicit active wording is present.
  expect(codegraphText.includes("local llm active"), "Local LLM should not appear active").toBe(false);
}

export async function expectNoAutoExecutionLabels(page) {
  const forbidden = [/auto fix/i, /run cursor now/i, /execute automatically/i, /production fix/i];
  for (const pattern of forbidden) {
    await expect(page.getByText(pattern), `Forbidden label should not appear: ${pattern}`).toHaveCount(0);
  }
}

export async function appendCodeGraphHintsIfAvailable(page) {
  const codegraph = await openDisclosureByTestId(page, "agentops-codegraph-details");
  const appendButton = codegraph.getByRole("button", { name: /append codegraph hints to prompt/i }).first();
  const hasButton = (await appendButton.count()) > 0;
  const promptEditor = page.getByTestId("agentops-cursor-prompt-editor");
  const before = await promptEditor.inputValue().catch(() => "");

  if (!hasButton) {
    return { attempted: false, appended: false, hasOwnerReviewBlock: false };
  }

  await appendButton.click();
  await expect(
    page.getByText(/codegraph hints appended to prompt draft/i),
    "Append action should report success",
  ).toBeVisible({ timeout: 5_000 });

  const after = await promptEditor.inputValue().catch(() => "");
  const appended = after.length > before.length;
  const hasOwnerReviewBlock =
    /owner review required/i.test(after) || /codegraph discovery hints/i.test(after) || /codegraph/i.test(after);

  return { attempted: true, appended, hasOwnerReviewBlock };
}

export async function askAgentIfAvailable(page, message, intent = "clarify issue") {
  await expectIssueWorkspaceReady(page, { timeout: 60_000 });
  const chat = page.getByTestId("agentops-agent-chat");
  const input = chat.getByTestId("agentops-agent-chat-input").first();
  const askButton = chat.getByRole("button", { name: /^ask agent$/i });
  if ((await chat.count()) === 0 || (await input.count()) === 0 || (await askButton.count()) === 0) {
    return false;
  }

  const intentChip = chat.locator("button:not(.aixia-btn)").filter({ hasText: new RegExp(`^${intent}$`, "i") }).first();
  if ((await intentChip.count()) > 0) {
    await intentChip.click();
  }

  let askEnabled = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await expectIssueWorkspaceReady(page, { timeout: 60_000 });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await expect(input, "Agent chat input should be visible before fill").toBeVisible({ timeout: 15_000 });
    await input.click({ timeout: 10_000 });
    await input.fill("");
    await input.fill(message).catch(() => {});

    let typedValue = await input.inputValue().catch(() => "");
    if (!typedValue.trim()) {
      await input.click({ timeout: 10_000 }).catch(() => {});
      await input.type(message, { delay: 5 }).catch(() => {});
      typedValue = await input.inputValue().catch(() => "");
    }
    if (!typedValue.trim()) {
      await input.evaluate((element, nextValue) => {
        const textarea = element;
        textarea.value = nextValue;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
      }, message);
    }

    await expect
      .poll(
        async () => {
          const value = await input.inputValue().catch(() => "");
          return value.trim().length;
        },
        {
          timeout: 15_000,
          message: "Agent chat input should contain a non-empty message",
        },
      )
      .toBeGreaterThan(0);

    try {
      await expect(askButton, "Ask Agent button should become enabled before submit").toBeEnabled({
        timeout: 10_000,
      });
      askEnabled = true;
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(600);
    }
  }

  expect(askEnabled, "Ask Agent button should become enabled before submit").toBe(true);
  await askButton.click({ timeout: 10_000 });
  await page
    .getByText(/update saved|adapter mock fallback recorded|reporting agent \(mock\)/i)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => {});
  return true;
}
