/**
 * Tier A: move registry KPI metrics from command-scroll into AixiaHero.
 * Run: node scripts/migrate-finance-metrics-to-hero.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE_APP = path.join(ROOT, "src", "app", "finance");

function walkPageFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkPageFiles(full));
    else if (entry.name === "page.tsx") results.push(full);
  }
  return results;
}

function renameHubMetrics(source) {
  return source
    .replace(/\bFinanceHubMetrics\b/g, "AixiaCommandMetrics")
    .replace(/\bFinanceHubMetricItem\b/g, "AixiaCommandMetricItem");
}

function ensureCommandMetricsImport(source) {
  if (!source.includes("AixiaCommandMetrics")) return source;
  if (/AixiaCommandMetrics,/.test(source) || /,\s*AixiaCommandMetrics/.test(source)) {
    return source;
  }
  const importMatch = source.match(
    /import\s*\{([\s\S]*?)\}\s*from\s*"@\/components\/aixia";/
  );
  if (!importMatch) return source;
  if (importMatch[1].includes("AixiaCommandMetrics")) return source;
  const body = importMatch[1].trimEnd().replace(/,\s*$/, "");
  const next = `import {\n${body},\n  AixiaCommandMetrics,\n} from "@/components/aixia";`;
  return source.replace(importMatch[0], next);
}

function hasMetricsInHero(source) {
  const heroMatch = source.match(/<AixiaHero[\s\S]*?<\/AixiaHero>/);
  if (!heroMatch) return false;
  return heroMatch[0].includes("<AixiaCommandMetrics");
}

function metricCardsUsesLabel(source) {
  return /label=\{metric\.label\}/.test(source);
}

function buildMetricsJsx(metricExpr, source) {
  if (metricExpr === "metricCards" && metricCardsUsesLabel(source)) {
    return `<AixiaCommandMetrics
          items={metricCards.map((metric) => ({
            key: metric.key,
            title: metric.title ?? metric.label,
            value: metric.value,
            subtitle: metric.subtitle ?? metric.description,
            icon: metric.icon,
            tone: metric.tone,
          }))}
        />`;
  }
  return `<AixiaCommandMetrics items={${metricExpr}} />`;
}

function extractFirstScrollMetricGrid(source) {
  const scrollIdx = source.indexOf('className="aixia-command-scroll"');
  if (scrollIdx < 0) return { source, metricExpr: null };

  const afterScroll = source.slice(scrollIdx);
  const gridMatch = afterScroll.match(/<AixiaMetricGrid[^>]*>([\s\S]*?)<\/AixiaMetricGrid>/);
  if (!gridMatch) return { source, metricExpr: null };

  const gridBlock = gridMatch[0];
  const inner = gridMatch[1];
  const globalIdx = scrollIdx + afterScroll.indexOf(gridBlock);

  if (/\{\s*metricCards\.map/.test(inner)) {
    return {
      source: source.slice(0, globalIdx) + source.slice(globalIdx + gridBlock.length),
      metricExpr: "metricCards",
    };
  }

  const cardRegex = /<AixiaMetricCard\s+([\s\S]*?)\/>/g;
  const items = [];
  let cardMatch;
  let index = 0;
  while ((cardMatch = cardRegex.exec(inner)) !== null) {
    const attrs = cardMatch[1];
    const label =
      attrs.match(/label="([^"]*)"/)?.[1] ??
      attrs.match(/label=\{([^}]+)\}/)?.[1];
    const value =
      attrs.match(/value=\{([^}]+)\}/)?.[1] ??
      attrs.match(/value="([^"]*)"/)?.[1];
    const description =
      attrs.match(/description="([^"]*)"/)?.[1] ??
      attrs.match(/description=\{([^}]+)\}/)?.[1];
    const icon = attrs.match(/icon=\{(\w+)\}/)?.[1];
    const tone = attrs.match(/tone="([^"]*)"/)?.[1];
    if (!label || value === undefined) continue;
    const key =
      String(label).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || `metric-${index}`;
    items.push({ key, label, value, description, icon, tone });
    index += 1;
  }

  if (items.length === 0) return { source, metricExpr: null };

  const varName = "__registryCommandMetrics";
  const lines = items.map((item) => {
    const subtitle = item.description
      ? `subtitle: ${item.description},`
      : "";
    const icon = item.icon ? `icon: ${item.icon},` : "";
    const tone = item.tone ? `tone: "${item.tone}",` : "";
    const title = item.label.startsWith('"') ? item.label : `"${item.label}"`;
    const valuePart = item.value.startsWith('"')
      ? `value: ${item.value},`
      : `value: String(${item.value}),`;
    return `    { key: "${item.key}", title: ${title}, ${valuePart} ${subtitle} ${icon} ${tone} }`;
  });

  const deps = [
    ...new Set(
      items
        .map((i) => i.value.replace(/^String\(|\)$/g, ""))
        .filter((v) => !v.startsWith('"'))
    ),
  ].join(", ");

  const useMemoBlock = `
  const ${varName} = useMemo(
    () => [
${lines.join(",\n")}
    ],
    [${deps}]
  );
`;

  let cleaned = source.slice(0, globalIdx) + source.slice(globalIdx + gridBlock.length);
  if (!cleaned.includes(`const ${varName}`)) {
    if (!/\buseMemo\b/.test(cleaned)) {
      cleaned = cleaned.replace(
        /import \{([^}]+)\} from "react";/,
        (m, imports) => {
          if (imports.includes("useMemo")) return m;
          return `import { ${imports.trim()}, useMemo } from "react";`;
        }
      );
    }
    const insertPoint = cleaned.search(/return \(\s*\n\s*<FinancePage>/);
    if (insertPoint > 0) {
      cleaned =
        cleaned.slice(0, insertPoint) + useMemoBlock + "\n" + cleaned.slice(insertPoint);
    }
  }

  return { source: cleaned, metricExpr: varName };
}

function convertHeroMetricGrid(source) {
  const heroMatch = source.match(/<AixiaHero[\s\S]*?<\/AixiaHero>/);
  if (!heroMatch) return { source, metricExpr: null };
  const hero = heroMatch[0];
  const gridMatch = hero.match(/<AixiaMetricGrid[^>]*>[\s\S]*?<\/AixiaMetricGrid>/);
  if (!gridMatch || !/\{\s*metricCards\.map/.test(gridMatch[0])) {
    return { source, metricExpr: null };
  }

  const metricsJsx = buildMetricsJsx("metricCards", source);
  const newHero = hero.replace(
    gridMatch[0],
    `\n        ${metricsJsx}\n      `
  );
  return {
    source: source.replace(hero, newHero),
    metricExpr: "metricCards",
  };
}

function injectMetricsInHero(source, metricExpr) {
  const metricsJsx = buildMetricsJsx(metricExpr, source);
  const metricsBlock = `\n        ${metricsJsx}\n      `;

  const selfClose = source.match(
    /(<AixiaHero[\s\S]*?)(\s*\/>)(\s*\n\s*<div className="aixia-command-scroll")/
  );
  if (selfClose) {
    return source.replace(
      selfClose[0],
      `${selfClose[1]}>${metricsBlock}</AixiaHero>${selfClose[3]}`
    );
  }

  const heroOpen = source.match(/<AixiaHero[^>]*>/);
  if (!heroOpen) return source;
  if (source.includes("<AixiaCommandMetrics")) return source;

  return source.replace(
    /(<AixiaHero[^>]*>)/,
    `$1${metricsBlock}`
  );
}

function moveScrollToolbarToHero(source) {
  const match = source.match(
    /(<div className="aixia-command-scroll">\s*\n)(<AixiaRegistryToolbar[\s\S]*?<\/AixiaRegistryToolbar>\s*\n)/
  );
  if (!match) return source;

  const without = source.replace(match[0], match[1]);
  return without.replace(/(<\/AixiaHero>)/, `$1\n        ${match[2].trim()}\n      `);
}

function cleanupImports(source) {
  let result = source;
  if (!result.includes("AixiaMetricGrid")) {
    result = result.replace(/\s*AixiaMetricGrid,?\n?/g, "\n");
  }
  if (!result.includes("AixiaMetricCard")) {
    result = result.replace(/\s*AixiaMetricCard,?\n?/g, "\n");
  }
  return result;
}

function migrateFile(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  let source = fs.readFileSync(absPath, "utf8");
  const original = source;

  source = renameHubMetrics(source);

  if (hasMetricsInHero(source) && !source.includes("<AixiaMetricGrid")) {
    source = ensureCommandMetricsImport(source);
    source = cleanupImports(source);
    if (source !== original) {
      try {
        fs.writeFileSync(absPath, source, "utf8");
      } catch (error) {
        return { rel, status: "error", error: String(error) };
      }
      return { rel, status: "renamed-only" };
    }
    return { rel, status: "skipped" };
  }

  let metricExpr = null;

  const heroGrid = convertHeroMetricGrid(source);
  if (heroGrid.metricExpr) {
    source = heroGrid.source;
    metricExpr = heroGrid.metricExpr;
  } else {
    const scrollGrid = extractFirstScrollMetricGrid(source);
    if (scrollGrid.metricExpr) {
      source = scrollGrid.source;
      metricExpr = scrollGrid.metricExpr;
      source = injectMetricsInHero(source, metricExpr);
      source = moveScrollToolbarToHero(source);
    }
  }

  if (!metricExpr) {
    if (source !== original) {
      source = ensureCommandMetricsImport(source);
      source = cleanupImports(source);
      try {
        fs.writeFileSync(absPath, source, "utf8");
      } catch (error) {
        return { rel, status: "error", error: String(error) };
      }
      return { rel, status: "renamed-only" };
    }
    return { rel, status: "skipped" };
  }

  source = ensureCommandMetricsImport(source);
  source = cleanupImports(source);

  if (source !== original) {
    try {
      fs.writeFileSync(absPath, source, "utf8");
    } catch (error) {
      return { rel, status: "error", error: String(error) };
    }
    return { rel, status: "migrated" };
  }
  return { rel, status: "unchanged" };
}

const files = walkPageFiles(FINANCE_APP);
const results = files.map(migrateFile);
const migrated = results.filter((r) => r.status === "migrated");
const renamed = results.filter((r) => r.status === "renamed-only");
const errors = results.filter((r) => r.status === "error");
console.log(`Migrated ${migrated.length} files, renamed ${renamed.length}, errors ${errors.length}:`);
migrated.forEach((r) => console.log(`  migrated: ${r.rel}`));
renamed.forEach((r) => console.log(`  renamed: ${r.rel}`));
errors.forEach((r) => console.log(`  error: ${r.rel} — ${r.error}`));
