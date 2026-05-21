#!/usr/bin/env node
/**
 * Read-only live analytics summary for Hermes (stdout JSON).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — never use in frontend.
 *
 * Usage:
 *   npm run analytics:hermes
 *   npm run analytics:hermes -- --days 1 --limit 20
 *   npm run analytics:hermes -- --days 30 --limit 50 --json
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_LABEL = "aixia-staging";

const ANALYTICS_TABLES = [
  "app_analytics_page_views",
  "app_analytics_events",
  "app_analytics_form_events",
  "app_analytics_frontend_errors",
  "app_analytics_feature_feedback",
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

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
  const args = { days: 7, limit: 50, json: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--days" && argv[i + 1]) {
      args.days = Math.max(1, parseInt(argv[++i], 10) || 7);
    } else if (a === "--limit" && argv[i + 1]) {
      args.limit = Math.max(1, parseInt(argv[++i], 10) || 50);
    } else if (a === "--json") {
      args.json = true;
    }
  }
  return args;
}

function windowRange(days) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    fromIso: `${from.toISOString().slice(0, 10)}T00:00:00.000Z`,
    toIso: `${to.toISOString().slice(0, 10)}T23:59:59.999Z`,
  };
}

function sanitizeText(value, maxLen = 500) {
  if (value == null || value === "") return null;
  let s = String(value)
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(JWT_PATTERN, "[redacted-jwt]");
  if (s.length > maxLen) s = s.slice(0, maxLen) + "…";
  return s;
}

async function fetchAll(supabase, table, fromIso, toIso, selectCols) {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

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

function sanitizePageView(row) {
  return {
    created_at: row.created_at,
    page_path: row.page_path,
    page_title: sanitizeText(row.page_title, 120),
    module_name: row.module_name,
    duration_ms: row.duration_ms,
    exit_page: row.exit_page,
    viewport_width: row.viewport_width,
    viewport_height: row.viewport_height,
    has_user: Boolean(row.user_id),
  };
}

function sanitizeEvent(row) {
  return {
    created_at: row.created_at,
    event_name: row.event_name,
    event_type: row.event_type,
    page_path: row.page_path,
    module_name: row.module_name,
    workflow_name: row.workflow_name,
    workflow_step: row.workflow_step,
    target_type: row.target_type,
    target_label: sanitizeText(row.target_label, 200),
    duration_ms: row.duration_ms,
    success: row.success,
    error_code: row.error_code,
    has_user: Boolean(row.user_id),
  };
}

function sanitizeFormEvent(row) {
  return {
    created_at: row.created_at,
    form_name: row.form_name,
    form_action: row.form_action,
    page_path: row.page_path,
    module_name: row.module_name,
    workflow_name: row.workflow_name,
    workflow_step: row.workflow_step,
    field_name: row.field_name,
    validation_error: sanitizeText(row.validation_error, 200),
    duration_ms: row.duration_ms,
    success: row.success,
    has_user: Boolean(row.user_id),
  };
}

function sanitizeFrontendError(row) {
  return {
    created_at: row.created_at,
    page_path: row.page_path,
    module_name: row.module_name,
    error_name: row.error_name,
    error_message: sanitizeText(row.error_message, 300),
    has_user: Boolean(row.user_id),
  };
}

function buildTrackingGaps(counts, pageViews, events, formEvents) {
  const gaps = [];
  if (counts.page_views > 0 && counts.events === 0) {
    gaps.push(
      "Page views are recorded but custom events are empty — trackButtonClick/trackFormStart helpers may not be wired on pages yet."
    );
  }
  if (counts.page_views > 0 && counts.form_events === 0) {
    gaps.push(
      "No form_events in window — form funnels not instrumented or no forms used."
    );
  }
  if (counts.page_views === 0) {
    gaps.push("No page_views in window — app may not have been used or tracking failed.");
  }
  const exitCount = pageViews.filter((r) => r.exit_page).length;
  if (counts.page_views > 10 && exitCount === 0) {
    gaps.push("No exit_page rows — duration-on-leave tracking may not be firing.");
  }
  const shortPages = pageViews.filter(
    (r) => r.duration_ms != null && r.duration_ms < 2000 && r.exit_page
  );
  if (shortPages.length >= 5) {
    gaps.push(
      `${shortPages.length} exit pages under 2s — possible drop-off or navigation churn.`
    );
  }
  if (counts.frontend_errors > 0) {
    gaps.push(`${counts.frontend_errors} frontend_errors in window — review latest_frontend_errors.`);
  }
  return gaps;
}

async function main() {
  const args = parseArgs(process.argv);
  const win = windowRange(args.days);

  const fileEnv = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    fileEnv.VITE_SUPABASE_URL ||
    fileEnv.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    const missing = [];
    if (!url) missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
    if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    console.error(
      JSON.stringify({
        error: `Missing ${missing.join(" and ")}. Set in .env.local (not committed) or shell env.`,
      })
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [
    pageViewsRaw,
    eventsRaw,
    formEventsRaw,
    frontendErrorsRaw,
    featureFeedbackRaw,
  ] = await Promise.all([
    fetchAll(
      supabase,
      "app_analytics_page_views",
      win.fromIso,
      win.toIso,
      "created_at, page_path, page_title, module_name, user_id, duration_ms, exit_page, viewport_width, viewport_height"
    ),
    fetchAll(
      supabase,
      "app_analytics_events",
      win.fromIso,
      win.toIso,
      "created_at, event_name, event_type, page_path, module_name, workflow_name, workflow_step, user_id, target_type, target_label, duration_ms, success, error_code"
    ),
    fetchAll(
      supabase,
      "app_analytics_form_events",
      win.fromIso,
      win.toIso,
      "created_at, form_name, form_action, page_path, module_name, workflow_name, workflow_step, user_id, field_name, validation_error, duration_ms, success"
    ),
    fetchAll(
      supabase,
      "app_analytics_frontend_errors",
      win.fromIso,
      win.toIso,
      "created_at, page_path, module_name, user_id, error_name, error_message"
    ),
    fetchAll(
      supabase,
      "app_analytics_feature_feedback",
      win.fromIso,
      win.toIso,
      "created_at, page_path, module_name, feature_name, feedback_type, rating"
    ),
  ]);

  const limit = args.limit;
  const pageViews = pageViewsRaw.map(sanitizePageView);
  const events = eventsRaw.map(sanitizeEvent);
  const formEvents = formEventsRaw.map(sanitizeFormEvent);
  const frontendErrors = frontendErrorsRaw.map(sanitizeFrontendError);

  const counts = {
    page_views: pageViewsRaw.length,
    events: eventsRaw.length,
    form_events: formEventsRaw.length,
    frontend_errors: frontendErrorsRaw.length,
    feature_feedback: featureFeedbackRaw.length,
  };

  const shortDurationPages = pageViews
    .filter((r) => r.duration_ms != null && r.duration_ms < 3000 && r.exit_page)
    .slice(0, limit)
    .map((r) => ({
      page_path: r.page_path,
      module_name: r.module_name,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
    }));

  const exitPages = countBy(pageViewsRaw.filter((r) => r.exit_page), (r) => r.page_path).slice(
    0,
    15
  );

  const payload = {
    generated_at: new Date().toISOString(),
    project: PROJECT_LABEL,
    window: { from: win.from, to: win.to, days: args.days },
    counts,
    top_pages: countBy(pageViewsRaw, (r) => r.page_path).slice(0, 15),
    top_modules: countBy(pageViewsRaw, (r) => r.module_name).slice(0, 15),
    short_duration_pages: shortDurationPages,
    exit_pages: exitPages,
    latest_page_views: pageViews.slice(0, limit),
    latest_events: events.slice(0, limit),
    latest_form_events: formEvents.slice(0, limit),
    latest_frontend_errors: frontendErrors.slice(0, limit),
    tracking_gaps: buildTrackingGaps(counts, pageViewsRaw, eventsRaw, formEventsRaw),
    notes: [
      "Read-only query; analytics tables only.",
      "IDs (user_id, session_id, anonymous_id) are not included — only has_user boolean where relevant.",
      "Use npm run export:analytics for full file export with github_context_manifest.",
      featureFeedbackRaw.length > 0
        ? `${featureFeedbackRaw.length} feature_feedback rows omitted from detail (counts only).`
        : null,
    ].filter(Boolean),
  };

  const out = JSON.stringify(payload, null, 2);
  process.stdout.write(out + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
