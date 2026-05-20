import fs from "node:fs";
import path from "node:path";

function walkFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      results.push(...walkFiles(fullPath, extensions));
      continue;
    }

    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Platform visual parity guardrails for hub pages.
 */
export function runVisualParityGuardrails({ ROOT, addWarning, addError }) {
  const warn = addWarning ?? addError;
  const appDir = path.join(ROOT, "src", "app");
  const stylesDir = path.join(ROOT, "src", "styles");
  const pageFiles = walkFiles(appDir, [".tsx"]).filter(
    (filePath) => filePath.endsWith("page.tsx") || filePath.endsWith("/page.tsx")
  );

  for (const filePath of pageFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");

    const isAuthPage =
      rel === "src/app/login/page.tsx" || rel === "src/app/register/page.tsx";

    if (
      /from\s+["']@\/components\/ui\/button["']/.test(text) &&
      /className=["'][^"']*aixia-dash-action/.test(text)
    ) {
      warn(
        rel,
        "Use AixiaButton instead of shadcn Button with aixia-dash-action classes.",
        "AiXia visual parity"
      );
    }

    if (/<header[^>]*className=["'][^"']*aixia-dash-hero/.test(text)) {
      warn(
        rel,
        "Use AixiaHero surface=\"command\" instead of raw aixia-dash-hero markup.",
        "AiXia visual parity"
      );
    }

    if (!isAuthPage && rel.startsWith("src/app/")) {
      const hasCommandShell =
        /<FinancePage/.test(text) ||
        (/AixiaPage[\s\S]*surface=["']command["']/.test(text) &&
          /aixia-command-page/.test(text));

      if (
        !hasCommandShell &&
        (/<AixiaHero/.test(text) || /aixia-dash-kicker/.test(text)) &&
        !rel.startsWith("src/app/login/") &&
        !rel.startsWith("src/app/register/")
      ) {
        warn(
          rel,
          "Authenticated pages should use AixiaPage surface=\"command\" + aixia-command-page or FinancePage.",
          "AiXia command shell"
        );
      }

      if (
        /<AixiaHero[\s\S]*surface=["']command["']/.test(text) &&
        /aixia-projects-tabs|aixia-command-tabs/.test(text) &&
        /aixia-dash-metrics|AixiaCommandMetrics|FinanceHubMetrics/.test(text)
      ) {
        const tabsIdx = Math.min(
          ...["aixia-projects-tabs", "aixia-command-tabs"]
            .map((needle) => text.indexOf(needle))
            .filter((idx) => idx >= 0)
        );
        const metricsIdx = Math.min(
          ...["AixiaCommandMetrics", "FinanceHubMetrics", "aixia-dash-metrics"]
            .map((needle) => text.indexOf(needle))
            .filter((idx) => idx >= 0)
        );
        if (tabsIdx >= 0 && metricsIdx >= 0 && tabsIdx < metricsIdx) {
          warn(
            rel,
            "Command hero child order: AixiaCommandMetrics must appear before filter tabs.",
            "AiXia command header"
          );
        }
      }

      if (
        /<AixiaHero[\s\S]*surface=["']command["']/.test(text) &&
        /aixia-projects-toolbar|aixia-command-toolbar/.test(text) &&
        /aixia-dash-metrics|AixiaCommandMetrics|FinanceHubMetrics/.test(text)
      ) {
        const toolbarIdx = Math.min(
          ...["aixia-projects-toolbar", "aixia-command-toolbar"]
            .map((needle) => text.indexOf(needle))
            .filter((idx) => idx >= 0)
        );
        const metricsIdx = Math.min(
          ...["AixiaCommandMetrics", "FinanceHubMetrics", "aixia-dash-metrics"]
            .map((needle) => text.indexOf(needle))
            .filter((idx) => idx >= 0)
        );
        if (toolbarIdx >= 0 && metricsIdx >= 0 && toolbarIdx < metricsIdx) {
          warn(
            rel,
            "Command hero child order: AixiaCommandMetrics must appear before list toolbar.",
            "AiXia command header"
          );
        }
      }

      if (
        /<AixiaHero[\s\S]*surface=["']command["']/.test(text) &&
        /aixia-command-scroll[\s\S]*AixiaMetricGrid/.test(text)
      ) {
        warn(
          rel,
          "Page-level KPI metrics belong in AixiaHero via AixiaCommandMetrics, not AixiaMetricGrid in scroll.",
          "AiXia command header"
        );
      }

      if (
        /<AixiaHero[\s\S]*surface=["']command["']/.test(text) &&
        /<div className="aixia-dash-metrics">/.test(text) &&
        !/aixia-dash-metrics--auto/.test(text)
      ) {
        warn(
          rel,
          "Use AixiaCommandMetrics (aixia-dash-metrics--auto) instead of manual metric grids in hero.",
          "AiXia command header"
        );
      }
    }

    if (/min-h-screen/.test(text) && rel.startsWith("src/app/finance/")) {
      warn(
        rel,
        "Finance pages should use FinancePage / command shell instead of local min-h-screen grids.",
        "AiXia visual parity"
      );
    }

    if (!rel.startsWith("src/app/finance/")) continue;

    if (/<AixiaHero[\s\S]*?\bbadges=\{/.test(text)) {
      addError?.(
        rel,
        "Finance AixiaHero must not use badges — use kicker/title/subtitle/actions only.",
        "AiXia finance hero"
      ) ?? warn(rel, "Finance AixiaHero must not use badges.", "AiXia finance hero");
    }

    if (/<AixiaHero[\s\S]*?\bstatusCards=\{/.test(text)) {
      addError?.(
        rel,
        "Finance AixiaHero must not use statusCards — move meta to scroll body.",
        "AiXia finance hero"
      ) ?? warn(rel, "Finance AixiaHero must not use statusCards.", "AiXia finance hero");
    }

    if (/title=\{?["']Studio["']\}?/.test(text) || /studioName/.test(text)) {
      addError?.(
        rel,
        "Finance hero title must match module name, not \"Studio\".",
        "AiXia finance hero"
      ) ?? warn(rel, "Finance hero title must not be Studio.", "AiXia finance hero");
    }

    if (
      /<FinancePage[\s\S]*?<\/FinancePage>/.test(text) &&
      !/aixia-command-scroll/.test(text)
    ) {
      warn(
        rel,
        "FinancePage should wrap body content in aixia-command-scroll.",
        "AiXia finance scroll"
      );
    }

    if (/<AixiaPage[\s\S]*?<\/AixiaPage>/.test(text) && !/<FinancePage/.test(text)) {
      warn(
        rel,
        "Finance routes should use FinancePage instead of AixiaPage.",
        "AiXia finance shell"
      );
    }
  }

  const workspaceGridPages = [
    "src/app/projects/page.tsx",
    "src/app/tasks/page.tsx",
    "src/app/employees/page.tsx",
    "src/app/finance/reports/page.tsx",
    "src/app/ai-management/page.tsx",
    "src/app/calendar/day/page.tsx",
  ];

  for (const rel of workspaceGridPages) {
    const filePath = path.join(ROOT, rel);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, "utf8");

    if (/aixia-projects-grid-card|ReportWorkspaceCard|function ModuleCard\b/.test(text)) {
      warn(
        rel,
        "Use AixiaWorkspaceCard instead of legacy grid/hub card patterns.",
        "AiXia workspace cards"
      );
    }

    if (
      /rounded-\[(?:24|26)px\][\s\S]{0,160}border-white\/10[\s\S]{0,120}bg-white\/\[0\.04\]/.test(
        text
      )
    ) {
      warn(
        rel,
        "Avoid local glass hub card Tailwind shells — use AixiaWorkspaceCard.",
        "AiXia workspace cards"
      );
    }

    const usesWorkspaceCard = /AixiaWorkspaceCard/.test(text);
    const usesShadcnCard = /from\s+["']@\/components\/ui\/card["']/.test(text);
    const cardInEntityMap =
      /\.map\([\s\S]{0,400}?<Card[\s\S]{0,200}?onClick/.test(text) ||
      /\.map\([\s\S]{0,400}?<Card[\s\S]{0,200}?cursor-pointer/.test(text);

    if (usesShadcnCard && cardInEntityMap && !usesWorkspaceCard) {
      warn(
        rel,
        "Entity grid cards should use AixiaWorkspaceCard, not shadcn Card in .map() handlers.",
        "AiXia workspace cards"
      );
    }
  }

  const financeHubPages = [
    "src/app/finance/page.tsx",
    "src/app/finance/transactions/page.tsx",
    "src/app/finance/master-data/page.tsx",
    "src/app/finance/reports/page.tsx",
    "src/app/finance/access-approvals/page.tsx",
  ];

  for (const rel of financeHubPages) {
    const filePath = path.join(ROOT, rel);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, "utf8");

    if (/aixia-finance-hub-meta/.test(text) && !/AixiaFinanceHubMetaStrip/.test(text)) {
      warn(
        rel,
        "Use AixiaFinanceHubMetaStrip instead of raw aixia-finance-hub-meta markup.",
        "AiXia finance hub intro"
      );
    }

    if (
      /className=["'][^"']*aixia-command-scroll[^"']*\b(?:gap-|space-y-|pr-|pb-|pt-|pl-)/.test(
        text
      )
    ) {
      warn(
        rel,
        "Finance aixia-command-scroll spacing is owned by finance-visual.css — remove inline Tailwind gap/padding overrides.",
        "AiXia finance hub intro"
      );
    }

    const scrollBody = text.match(
      /<div className="aixia-command-scroll">([\s\S]*?)<\/div>\s*<\/FinancePage>/
    )?.[1];

    if (scrollBody) {
      const introEnd = scrollBody.search(
        /AixiaSmartLayout|aixia-transactions-hub-layout/
      );
      const introZone =
        introEnd >= 0 ? scrollBody.slice(0, introEnd) : scrollBody;

      if (
        /AixiaValueBlock/.test(introZone) &&
        !/AixiaFinanceHubOverviewGrid/.test(introZone)
      ) {
        warn(
          rel,
          "Use AixiaFinanceHubOverviewGrid (AixiaMetricCard) for finance hub overview KPIs — not AixiaValueBlock in the scroll intro.",
          "AiXia finance hub intro"
        );
      }

      const accessRuleIndex = scrollBody.indexOf("AixiaAccessRule");
      const metricsBeforeRule =
        /AixiaFinanceHubOverviewGrid|variant="metrics"/.test(
          accessRuleIndex >= 0
            ? scrollBody.slice(0, accessRuleIndex)
            : ""
        );

      if (accessRuleIndex >= 0 && metricsBeforeRule) {
        warn(
          rel,
          "Finance hub overview metrics must appear after AixiaAccessRule in the scroll body.",
          "AiXia finance hub intro"
        );
      }
    }
  }

  const transactionRegistryPages = walkFiles(
    path.join(ROOT, "src", "app", "finance", "transactions"),
    [".tsx"]
  ).filter(
    (candidate) =>
      /transactions\\[^\\]+\\page\.tsx$/.test(candidate.replace(/\//g, "\\")) ||
      /transactions\/[^/]+\/page\.tsx$/.test(candidate.replace(/\\/g, "/"))
  );

  for (const filePath of transactionRegistryPages) {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");

    if (
      /<AixiaHero[\s\S]*?aixia-action-system[\s\S]*?AixiaBadge/.test(text)
    ) {
      warn(
        rel,
        "Registry list pages must not use ad-hoc AixiaBadge pill rows inside AixiaHero — use AixiaFinanceHubControlPanel in the scroll body (AIXIA_STANDARD §22).",
        "AiXia finance registry intro"
      );
    }

    if (
      /AixiaRegistryToolbar/.test(text) &&
      /AixiaAccessRule/.test(text) &&
      !/AixiaFinanceHubMetaStrip/.test(text)
    ) {
      warn(
        rel,
        "Transaction registry list pages must include AixiaFinanceHubMetaStrip before AixiaAccessRule (AIXIA_STANDARD §22).",
        "AiXia finance registry intro"
      );
    }

    if (
      /AixiaFinanceHubMetaStrip/.test(text) &&
      /AixiaAccessRule/.test(text) &&
      !/AixiaFinanceHubControlPanel/.test(text)
    ) {
      warn(
        rel,
        "Transaction registry list pages must include AixiaFinanceHubControlPanel after AixiaAccessRule (AIXIA_STANDARD §22).",
        "AiXia finance registry intro"
      );
    }
  }

  for (const filePath of walkFiles(path.join(ROOT, "src", "app", "finance"), [".tsx"]).filter(
    (candidate) => candidate.endsWith("page.tsx")
  )) {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");

    if (
      /className=["'][^"']*aixia-command-scroll[^"']*\b(?:gap-|space-y-|pr-|pb-|pt-|pl-)/.test(
        text
      )
    ) {
      warn(
        rel,
        "Finance aixia-command-scroll spacing is owned by finance-visual.css — remove inline Tailwind gap/padding overrides.",
        "AiXia finance hub intro"
      );
    }
  }

  const moduleCssFiles = walkFiles(stylesDir, [".css"]).filter((filePath) =>
    /-visual\.css$/.test(filePath)
  );

  for (const filePath of moduleCssFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");

    if (/\.aixia-dash-hero\b/.test(text) || /\.aixia-hero\b/.test(text)) {
      warn(
        rel,
        "Module CSS must not override global hero styles — use dashboard/visual.css.",
        "AiXia CSS truth"
      );
    }

    if (
      /\.aixia-(?:projects|inbox|tasks|finance)-scroll\b/.test(text) &&
      /flex:\s*1/.test(text) &&
      /overflow-y:\s*auto/.test(text)
    ) {
      warn(
        rel,
        "Duplicate scroll shell in module CSS — use .aixia-command-scroll in layout.css.",
        "AiXia CSS truth"
      );
    }
  }

  const dashboardLayoutPath = path.join(ROOT, "src", "components", "layout", "DashboardLayout.tsx");
  if (fs.existsSync(dashboardLayoutPath)) {
    const layoutText = fs.readFileSync(dashboardLayoutPath, "utf8");
    if (/aixia-finance-module-root|aixia-finance-stack/.test(layoutText)) {
      warn(
        "src/components/layout/DashboardLayout.tsx",
        "Remove finance double-shell from DashboardLayout — FinancePage owns command shell.",
        "AiXia finance scroll"
      );
    }
  }
}
