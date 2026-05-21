#!/usr/bin/env node
/**
 * Read-only export of app analytics for Hermes analysis.
 * Requires SUPABASE_SERVICE_ROLE_KEY (never commit). Writes to analytics-exports/YYYY-MM-DD/
 *
 * Usage:
 *   node scripts/export-analytics-for-hermes.mjs
 *   node scripts/export-analytics-for-hermes.mjs --from 2026-05-01 --to 2026-05-21
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvFile(filename) {
  const path = join(ROOT, filename);
  if (!existsSync(path)) return {};
  const out = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function parseArgs(argv) {
  const args = { from: null, to: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) {
      args.from = argv[++i];
    } else if (argv[i] === "--to" && argv[i + 1]) {
      args.to = argv[++i];
    }
  }
  return args;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

async function fetchAll(supabase, table, from, to) {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    let q = supabase
      .from(table)
      .select("*")
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const k = keyFn(row) ?? "(unknown)";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

function buildSummary({
  pageViews,
  events,
  formEvents,
  frontendErrors,
  featureFeedback,
  from,
  to,
}) {
  const exitViews = pageViews.filter((r) => r.exit_page);
  const formStarts = formEvents.filter((r) => r.form_action === "start");
  const formSubmits = formEvents.filter((r) => r.form_action === "submit");
  const abandonRate =
    formStarts.length > 0
      ? 1 - formSubmits.length / formStarts.length
      : null;

  return {
    exported_at: new Date().toISOString(),
    date_range: { from, to },
    totals: {
      page_views: pageViews.length,
      events: events.length,
      form_events: formEvents.length,
      frontend_errors: frontendErrors.length,
      feature_feedback: featureFeedback.length,
    },
    top_pages: countBy(pageViews, (r) => r.page_path).slice(0, 20),
    exit_pages: countBy(exitViews, (r) => r.page_path).slice(0, 20),
    top_events: countBy(events, (r) => r.event_name).slice(0, 20),
    form_abandonment_rate: abandonRate,
    form_actions: countBy(formEvents, (r) => r.form_action),
    repeated_errors: countBy(frontendErrors, (r) => r.error_message).slice(0, 15),
    modules: countBy(pageViews, (r) => r.module_name).slice(0, 15),
  };
}

function collectGithubManifest(topPagePaths = []) {
  const staticPaths = [
    "package.json",
    "src/components/aixia/index.ts",
    "src/styles/aixia-design-system.css",
    "src/App.tsx",
    "src/lib/permissions.ts",
    "src/lib/supabase.ts",
    "src/lib/analytics/index.ts",
    "src/components/analytics/AiXiaAnalyticsTracker.tsx",
    "src/components/aixia/AIXIA_STANDARD.md",
  ];

  const dynamicPaths = new Set(staticPaths);
  for (const pagePath of topPagePaths.slice(0, 10)) {
    if (!pagePath || pagePath === "/") continue;
    const segments = pagePath.split("/").filter(Boolean);
    if (segments.length === 0) continue;
    const base = segments[0];
    dynamicPaths.add(`src/app/${base}/page.tsx`);
  }

  const files = [...dynamicPaths].filter((p) => existsSync(join(ROOT, p)));

  return {
    generated_at: new Date().toISOString(),
    note: "Paths only for Hermes context — no secrets or full repo copy.",
    files,
  };
}

async function main() {
  const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
  const args = parseArgs(process.argv);

  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const from = args.from ?? defaultFromDate();
  const to = args.to ?? todayIso();
  const exportDate = todayIso();
  const outDir = join(ROOT, "analytics-exports", exportDate);

  mkdirSync(outDir, { recursive: true });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Exporting analytics ${from} → ${to} → ${outDir}`);

  const [pageViews, events, formEvents, frontendErrors, featureFeedback] =
    await Promise.all([
      fetchAll(supabase, "app_analytics_page_views", from, to),
      fetchAll(supabase, "app_analytics_events", from, to),
      fetchAll(supabase, "app_analytics_form_events", from, to),
      fetchAll(supabase, "app_analytics_frontend_errors", from, to),
      fetchAll(supabase, "app_analytics_feature_feedback", from, to),
    ]);

  const summary = buildSummary({
    pageViews,
    events,
    formEvents,
    frontendErrors,
    featureFeedback,
    from,
    to,
  });

  const topPages = summary.top_pages.map((x) => x.key);
  const manifest = collectGithubManifest(topPages);

  const write = (name, data) => {
    const path = join(outDir, name);
    writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
    console.log(`  wrote ${name} (${Array.isArray(data) ? data.length : "object"} rows)`);
  };

  write("page_views.json", pageViews);
  write("events.json", events);
  write("form_events.json", formEvents);
  write("frontend_errors.json", frontendErrors);
  write("feature_feedback.json", featureFeedback);
  write("summary.json", summary);
  write("github_context_manifest.json", manifest);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
