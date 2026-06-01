import { defineConfig } from "@playwright/test";

const baseURL = process.env.AGENTOPS_QA_BASE_URL || "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  outputDir: "../reports/browser-qa/playwright-output",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "../reports/browser-qa/playwright-report.json" }],
    ["html", { outputFolder: "../reports/browser-qa/playwright-html", open: "never" }],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium-readonly",
      use: { browserName: "chromium" },
    },
  ],
});

