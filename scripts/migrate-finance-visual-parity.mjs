/**
 * One-shot migration: Finance Visual Parity standard for finance page routes
 * Run: node scripts/migrate-finance-visual-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE_APP = path.join(ROOT, "src", "app", "finance");

const SKIP_FILES = new Set([
  "src/app/finance/page.tsx",
  "src/app/finance/transactions/page.tsx",
]);

function walkPageFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkPageFiles(full));
    else if (entry.name === "page.tsx") results.push(full);
  }
  return results;
}

function removeJsxProp(source, propName) {
  const patterns = [
    new RegExp(`\\s+${propName}=\\{[\\s\\S]*?\\n\\s*\\}(?=\\s|\\/)`, "g"),
    new RegExp(`\\s+${propName}="[^"]*"`, "g"),
    new RegExp(`\\s+${propName}=\\{'[^']*'\\}`, "g"),
  ];
  let result = source;
  for (const pattern of patterns) {
    result = result.replace(pattern, "");
  }
  return result;
}

function ensureHeroSurface(source) {
  return source.replace(/<AixiaHero\b([^>]*?)>/g, (match, attrs) => {
    if (attrs.includes('surface="command"')) return match;
    const extra =
      ' surface="command" className="shrink-0 space-y-4"';
    return `<AixiaHero${attrs}${extra}>`;
  });
}

function fixStudioTitle(source) {
  return source.replace(
    /gradientTitle="([^"]+)"[\s\S]*?title="Studio"/g,
    (m, gradientTitle) => m.replace('title="Studio"', `title="${gradientTitle}"`)
  );
}

function fixSplitTitle(source) {
  // title="/ Invoices" style -> match gradientTitle only
  return source.replace(
    /gradientTitle="([^"]+)"\s*\n\s*title="\/[^"]*"/g,
    'gradientTitle="$1"\n        title="$1"'
  );
}

function replacePageShell(source) {
  let result = source;
  result = result.replace(/<AixiaPage(\s[^>]*)?>/g, "<FinancePage$1>");
  result = result.replace(/<\/AixiaPage>/g, "</FinancePage>");
  return result;
}

function updateImports(source) {
  let result = source;
  if (result.includes("AixiaPage") && !result.includes("FinancePagePermission")) {
    result = result.replace(/\bAixiaPage\b/g, "FinancePage");
  }
  if (
    (result.includes("AixiaMetricGrid") || result.includes("<FinanceHubMetrics")) &&
    !result.includes("FinanceHubMetrics")
  ) {
    result = result.replace(
      /from "@\/components\/aixia";/,
      (m) => {
        if (result.includes("FinanceHubMetrics,")) return m;
        return m.replace(
          'from "@/components/aixia";',
          'from "@/components/aixia";\n// FinanceHubMetrics injected below'
        );
      }
    );
    result = result.replace(
      /(\{\s*\n(?:\s+\w+,?\n)+)(\s*\} from "@\/components\/aixia";)/,
      (full, body, close) => {
        if (body.includes("FinanceHubMetrics")) return full;
        const lastImport = body.trimEnd();
        return `${lastImport}  FinanceHubMetrics,\n${close}`;
      }
    );
  }
  return result;
}

function extractMetricCardsBlock(source) {
  const gridMatch = source.match(
    /<AixiaMetricGrid[^>]*>([\s\S]*?)<\/AixiaMetricGrid>/
  );
  if (!gridMatch) return { source, metricExpr: null };

  const inner = gridMatch[1];
  const mapMatch = inner.match(
    /\{\s*metricCards\.map\(\(metric\)\s*=>\s*\(\s*<AixiaMetricCard[\s\S]*?\)\s*\)\s*\}/
  );
  if (mapMatch) {
    const cleaned = source.replace(gridMatch[0], "");
    return { source: cleaned, metricExpr: "metricCards" };
  }

  const cardRegex =
    /<AixiaMetricCard\s+([\s\S]*?)\/>/g;
  const items = [];
  let cardMatch;
  let index = 0;
  while ((cardMatch = cardRegex.exec(inner)) !== null) {
    const attrs = cardMatch[1];
    const label = attrs.match(/label="([^"]*)"/)?.[1] ?? attrs.match(/label=\{([^}]+)\}/)?.[1];
    const value = attrs.match(/value=\{([^}]+)\}/)?.[1] ?? attrs.match(/value="([^"]*)"/)?.[1];
    const description =
      attrs.match(/description="([^"]*)"/)?.[1] ??
      attrs.match(/description=\{([^}]+)\}/)?.[1];
    const icon = attrs.match(/icon=\{(\w+)\}/)?.[1];
    const tone = attrs.match(/tone="([^"]*)"/)?.[1];
    if (!label || value === undefined) continue;
    const key =
      label.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || `metric-${index}`;
    items.push({ key, label, value, description, icon, tone });
    index += 1;
  }

  if (items.length === 0) return { source, metricExpr: null };

  const varName = "__financeHubMetrics";
  const lines = items.map((item) => {
    const subtitle = item.description
      ? `subtitle: ${item.description.includes('"') ? item.description : `"${item.description}"`},`
      : "";
    const icon = item.icon ? `icon: ${item.icon},` : "";
    const tone = item.tone ? `tone: "${item.tone}",` : "";
    const value =
      item.value.startsWith('"') || item.value.includes("(")
        ? item.value
        : `{${item.value}}`;
    return `    { key: "${item.key}", title: "${item.label}", value: String(${item.value}), ${subtitle} ${icon} ${tone} }`;
  });

  const useMemoBlock = `
  const ${varName} = useMemo(
    () => [
${lines.join(",\n")}
    ],
    [${items.map((i) => i.value.replace(/String\(|\)/g, "")).filter((v, idx, arr) => arr.indexOf(v) === idx).join(", ")}]
  );
`;

  let cleaned = source.replace(gridMatch[0], "");
  if (!cleaned.includes("useMemo") && useMemoBlock.includes("useMemo")) {
    cleaned = cleaned.replace(
      /from "react";/,
      'from "react";\nimport { useMemo } from "react";'
    );
    if (!cleaned.includes('import { useMemo }')) {
      cleaned = cleaned.replace(
        /import \{([^}]+)\} from "react";/,
        (m, imports) => {
          if (imports.includes("useMemo")) return m;
          return `import { ${imports.trim()}, useMemo } from "react";`;
        }
      );
    }
  }

  const insertPoint = cleaned.search(/return \(\s*\n\s*<FinancePage>/);
  if (insertPoint > 0 && !cleaned.includes(`const ${varName}`)) {
    cleaned =
      cleaned.slice(0, insertPoint) + useMemoBlock + "\n" + cleaned.slice(insertPoint);
  }

  return { source: cleaned, metricExpr: varName };
}

function injectHubMetricsInHero(source, metricExpr) {
  if (!metricExpr) return source;
  if (source.includes("<FinanceHubMetrics")) return source;

  return source.replace(
    /(<AixiaHero[\s\S]*?)(\s*\/>|\s*>)(\s*\n)/,
    (match, heroStart, heroEnd, newline) => {
      if (heroEnd === "/>") {
        return `${heroStart}\n      >\n        <FinanceHubMetrics items={${metricExpr}} />\n      </AixiaHero>${newline}`;
      }
      if (heroStart.includes("<FinanceHubMetrics")) return match;
      return `${heroStart}${heroEnd}${newline}        <FinanceHubMetrics items={${metricExpr}} />\n`;
    }
  );
}

function wrapCommandScroll(source) {
  if (source.includes('className="aixia-command-scroll"')) return source;

  const heroClose = source.match(/<\/AixiaHero>\s*\n/);
  if (!heroClose) return source;

  const heroCloseIndex = heroClose.index + heroClose[0].length;
  const pageClose = source.lastIndexOf("</FinancePage>");
  if (pageClose <= heroCloseIndex) return source;

  const before = source.slice(0, heroCloseIndex);
  const middle = source.slice(heroCloseIndex, pageClose);
  const after = source.slice(pageClose);

  if (middle.trim().startsWith('<div className="aixia-command-scroll"')) return source;

  return `${before}<div className="aixia-command-scroll">\n${middle}      </div>\n${after}`;
}

function cleanupImports(source) {
  let result = source;
  if (!result.includes("AixiaMetricGrid")) {
    result = result.replace(/\s*AixiaMetricGrid,\n?/g, "\n");
  }
  if (!result.includes("AixiaMetricCard")) {
    result = result.replace(/\s*AixiaMetricCard,\n?/g, "\n");
  }
  result = result.replace(
    /\/\/ FinanceHubMetrics injected below\n/g,
    ""
  );
  return result;
}

function migrateFile(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) return { rel, status: "skipped" };

  let source = fs.readFileSync(absPath, "utf8");
  const original = source;

  if (!source.includes("AixiaPage") && !source.includes("badges={") && source.includes("FinancePage")) {
    return { rel, status: "already" };
  }

  source = updateImports(source);
  source = replacePageShell(source);
  source = removeJsxProp(source, "badges");
  source = removeJsxProp(source, "statusCards");
  source = removeJsxProp(source, "description");
  source = ensureHeroSurface(source);
  source = fixStudioTitle(source);
  source = fixSplitTitle(source);

  const metricResult = extractMetricCardsBlock(source);
  source = metricResult.source;
  source = injectHubMetricsInHero(source, metricResult.metricExpr);
  source = wrapCommandScroll(source);
  source = cleanupImports(source);

  // Remove hero children that were only badges (e.g. access-approvals Sparkles badge)
  source = source.replace(
    /<AixiaHero([^>]*)>\s*<AixiaBadge[\s\S]*?<\/AixiaBadge>\s*<\/AixiaHero>/g,
    (m) => m.replace(/<AixiaBadge[\s\S]*?<\/AixiaBadge>\s*/, "")
  );

  if (source !== original) {
    fs.writeFileSync(absPath, source, "utf8");
    return { rel, status: "migrated" };
  }
  return { rel, status: "unchanged" };
}

const files = walkPageFiles(FINANCE_APP);
const results = files.map(migrateFile);
const migrated = results.filter((r) => r.status === "migrated");
console.log(`Migrated ${migrated.length} files:`);
migrated.forEach((r) => console.log(`  ${r.rel}`));
