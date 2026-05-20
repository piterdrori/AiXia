import path from "node:path";
import fs from "node:fs";

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * Dashboard UI standard: modular CSS under src/styles/dashboard and page shell class.
 * Invoked from scripts/aixia-guardrails.mjs (build gate).
 */
export function runDashboardPageGuardrails({ ROOT, addError }) {
  const SRC = path.join(ROOT, "src");
  const pageFile = path.join(SRC, "app", "dashboard", "page.tsx");
  const mainFile = path.join(SRC, "main.tsx");
  const dashDir = path.join(SRC, "styles", "dashboard");

  const requiredCss = [
    "tokens.css",
    "layout.css",
    "presence.css",
    "admin-usage.css",
    "visual.css",
  ];
  for (const name of requiredCss) {
    const fp = path.join(dashDir, name);
    if (!fileExists(fp)) {
      addError(
        fp,
        `Missing dashboard standard stylesheet src/styles/dashboard/${name}.`,
        "AiXia dashboard standard"
      );
    }
  }

  if (!fileExists(pageFile)) return;

  const text = fs.readFileSync(pageFile, "utf8");
  const mainText = fileExists(mainFile) ? fs.readFileSync(mainFile, "utf8") : "";

  const globalDashCssLoaded =
    mainText.includes("styles/dashboard/tokens.css") &&
    mainText.includes("styles/dashboard/layout.css") &&
    mainText.includes("styles/dashboard/visual.css");

  const pageOnlyImports = [
    "@/styles/dashboard/presence.css",
    "@/styles/dashboard/admin-usage.css",
  ];

  for (const imp of pageOnlyImports) {
    if (!text.includes(imp)) {
      addError(pageFile, `Dashboard page must import ${imp}.`, "AiXia dashboard standard");
    }
  }

  if (!globalDashCssLoaded) {
    for (const imp of [
      "@/styles/dashboard/tokens.css",
      "@/styles/dashboard/layout.css",
      "@/styles/dashboard/visual.css",
    ]) {
      if (!text.includes(imp)) {
        addError(
          pageFile,
          `Dashboard page must import ${imp} when dashboard CSS is not loaded globally in main.tsx.`,
          "AiXia dashboard standard"
        );
      }
    }
  }

  const usesCommandShell =
    /<AixiaPage\b[\s\S]*?\bsurface=["']command["']/.test(text) ||
    (text.includes("aixia-dash-page") && text.includes("aixia-dash-page--command"));

  if (!usesCommandShell) {
    addError(
      pageFile,
      'Dashboard page must use <AixiaPage surface="command"> or root classes "aixia-dash-page aixia-dash-page--command".',
      "AiXia dashboard standard"
    );
  }

  const hasProjectTeammatesCard = text.includes("DashboardProjectTeammatesCard");
  const hasAdminDirectoryCard = text.includes("DashboardAdminEmployeeDirectoryCard");
  const hasAdminUsageCard = text.includes("DashboardAdminPlatformUsageCard");

  if (!hasProjectTeammatesCard || !hasAdminDirectoryCard || !hasAdminUsageCard) {
    addError(
      pageFile,
      "Dashboard page must render DashboardProjectTeammatesCard, DashboardAdminEmployeeDirectoryCard, and DashboardAdminPlatformUsageCard.",
      "AiXia dashboard standard"
    );
  }
}
