#!/usr/bin/env node
/**
 * Phase 2A: Read-only static app discovery for AiXia QA Agent.
 * Scans allowed source folders; writes reports under qa-agent/reports only.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'qa-agent', 'reports');
const ROUTE_GROUPS_PATH = path.join(ROOT, 'qa-agent', 'registry', 'route-groups.json');
const MD_REPORT = path.join(REPORTS_DIR, 'static-app-discovery.md');
const JSON_REPORT = path.join(REPORTS_DIR, 'static-app-discovery.json');

const SOURCE_FOLDER_CANDIDATES = [
  'src/app',
  'app',
  'src/pages',
  'pages',
  'src/components',
  'src/styles',
  'src/lib',
  'src/hooks',
];

const SCAN_ROOTS = [
  'src/app',
  'app',
  'src/pages',
  'pages',
  'src/components',
  'src/styles',
  'src/lib',
  'src/hooks',
];

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.vercel',
  '.git',
  'coverage',
]);

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json']);

const APP_ROUTE_FILES = new Set([
  'page.tsx',
  'page.ts',
  'layout.tsx',
  'layout.ts',
  'loading.tsx',
  'error.tsx',
  'not-found.tsx',
  'route.ts',
  'route.tsx',
]);

const PAGES_SKIP = new Set(['_app', '_document', '_error', '_middleware']);

const TAILWIND_HINT = /\b(flex|grid|block|inline|hidden|p-\d|px-|py-|m-\d|mx-|my-|gap-|text-|bg-|border-|rounded-|w-|h-|min-|max-|items-|justify-|space-|font-|leading-|shadow-|hover:|md:|lg:|xl:)\b/;

function posix(p) {
  return p.split(path.sep).join('/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${posix(path.relative(ROOT, filePath))}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${posix(path.relative(ROOT, filePath))}: invalid JSON — ${error.message}`);
  }
}

function shouldIgnoreDir(name) {
  return IGNORED_DIR_NAMES.has(name) || name === 'reports';
}

function walkFiles(dirAbs, relativeRoot, files) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    const rel = posix(path.join(relativeRoot, entry.name));

    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      if (rel === 'qa-agent/reports' || rel.startsWith('qa-agent/reports/')) continue;
      walkFiles(abs, rel, files);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    files.push({ abs, rel });
  }
}

function isAppRouteFile(filename) {
  return APP_ROUTE_FILES.has(filename);
}

function isPagesRouteFile(filename, rel) {
  const ext = path.extname(filename).toLowerCase();
  if (!['.tsx', '.ts', '.jsx', '.js'].includes(ext)) return false;
  const base = path.basename(filename, ext);
  if (PAGES_SKIP.has(base)) return false;
  if (rel.includes('/api/') || rel.endsWith('/api')) return false;
  return true;
}

function segmentsToRoute(segments) {
  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

function filePathToAppRoute(relFile) {
  const normalized = posix(relFile);
  let base = normalized;
  if (base.startsWith('src/app/')) base = base.slice('src/app/'.length);
  else if (base.startsWith('app/')) base = base.slice('app/'.length);
  else return null;

  const parts = base.split('/');
  const filename = parts.pop();
  if (!isAppRouteFile(filename)) return null;

  const routeSegments = parts.filter((seg) => seg.length > 0);
  return {
    routePattern: segmentsToRoute(routeSegments),
    routeFileKind: filename.replace(/\.(tsx|ts|jsx|js)$/, ''),
  };
}

function filePathToPagesRoute(relFile) {
  const normalized = posix(relFile);
  let base = normalized;
  if (base.startsWith('src/pages/')) base = base.slice('src/pages/'.length);
  else if (base.startsWith('pages/')) base = base.slice('pages/'.length);
  else return null;

  const ext = path.extname(base);
  const withoutExt = base.slice(0, -ext.length);
  const parts = withoutExt.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1];
  let routeSegments;
  if (last === 'index') {
    routeSegments = parts.slice(0, -1);
  } else {
    routeSegments = parts;
  }

  return {
    routePattern: segmentsToRoute(routeSegments),
    routeFileKind: path.basename(withoutExt),
  };
}

function guessPageType(routePattern, routeFileKind, filePath) {
  const route = routePattern.toLowerCase();
  const file = filePath.toLowerCase();

  if (routeFileKind === 'layout') return 'layout';
  if (routeFileKind === 'route') return 'api-route';

  if (route.includes('/new') || file.includes('/new/')) return 'create';
  if (/\[[^\]]+\]/.test(route) || /\[[^\]]+\]/.test(file)) return 'detail';
  if (route.endsWith('/settings')) return 'settings';
  if (route.includes('/reports')) return 'report';
  if (route.includes('/assistant') || route.includes('/ai')) return 'assistant';

  const depth = route === '/' ? 0 : route.split('/').filter(Boolean).length;
  if (depth <= 1) return 'hub';
  return 'registry';
}

function guessModule(routePattern) {
  const route = routePattern.toLowerCase();
  if (route.startsWith('/finance')) return 'finance';
  if (route.includes('/hr') || route.includes('/employees') || route.includes('/people')) return 'hr';
  if (route.includes('/ai') || route.includes('/assistant') || route.includes('/mcp')) return 'ai-assistant';
  if (
    route.includes('/tenant') ||
    route.includes('/billing') ||
    route.includes('/subscription') ||
    route.includes('/saas')
  ) {
    return 'saas';
  }
  if (route.includes('/settings')) return 'settings';
  if (route === '/' || route === '/dashboard' || route === '/tasks' || route === '/profile') return 'core';
  return 'unknown';
}

function routeDepth(routePattern) {
  if (routePattern === '/') return 0;
  return routePattern.split('/').filter(Boolean).length;
}

function isDynamicRoute(routePattern) {
  return /\[[^\]]+\]/.test(routePattern);
}

function analyzeImports(content) {
  const usesAixiaComponents =
    content.includes('@/components/aixia') || content.includes('components/aixia/');
  const importsForbiddenUiComponents = content.includes('@/components/ui');
  const referencesSupabase =
    content.includes('@/lib/supabase') ||
    /\bfrom\s+['"]@\/lib\/supabase['"]/.test(content) ||
    /\bfrom\s+['"]supabase['"]/.test(content) ||
    content.includes("from 'supabase'") ||
    content.includes('from "supabase"');
  const referencesFinancePermissions =
    content.includes('pageAccess') || content.includes('finance/pageAccess');

  const classNameMatches = content.match(/className\s*=\s*(\{[^}]+\}|"[^"]*"|'[^']*')/g) ?? [];
  let tailwindLikeCount = 0;
  for (const match of classNameMatches) {
    if (TAILWIND_HINT.test(match)) tailwindLikeCount += 1;
  }
  const hasLocalTailwindHeavyClasses = !usesAixiaComponents && tailwindLikeCount >= 5;

  return {
    usesAixiaComponents,
    importsForbiddenUiComponents,
    referencesSupabase,
    referencesFinancePermissions,
    hasLocalTailwindHeavyClasses,
    tailwindLikeCount,
  };
}

function routeMatchesPattern(discoveredRoute, pattern) {
  if (pattern === '/') return discoveredRoute === '/';
  return discoveredRoute === pattern || discoveredRoute.startsWith(`${pattern}/`);
}

function compareRegistryRoutes(discoveredRoutes, routeGroupsData) {
  const discovered = [...new Set(discoveredRoutes.map((r) => r.routePattern))];
  const comparison = [];

  for (const group of routeGroupsData.routeGroups ?? []) {
    const groupStatus = group.status ?? 'unknown';
    for (const pattern of group.routePatterns ?? []) {
      let matchStatus;
      let notes;

      if (groupStatus === 'future-verify-later') {
        matchStatus = 'future-verify-later';
        notes = 'Registry group marked future-verify-later; not counted as a discovery gap.';
      } else {
        const found = discovered.some((route) => routeMatchesPattern(route, pattern));
        matchStatus = found ? 'found' : 'not-found';
        notes = found
          ? 'At least one discovered route matches this registry pattern.'
          : 'No discovered route matched this registry pattern yet.';
      }

      comparison.push({
        groupId: group.id,
        groupName: group.name,
        groupStatus,
        pattern,
        matchStatus,
        notes,
      });
    }
  }

  return comparison;
}

function discoverRoutesFromFiles(files) {
  const routes = [];
  const seen = new Set();

  for (const { rel } of files) {
    let parsed = filePathToAppRoute(rel);
    let routerType = 'app-router';

    if (!parsed) {
      parsed = filePathToPagesRoute(rel);
      routerType = parsed ? 'pages-router' : null;
    }

    if (!parsed) continue;

    const key = `${routerType}:${parsed.routePattern}:${parsed.routeFileKind}:${rel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const pageType = guessPageType(parsed.routePattern, parsed.routeFileKind, rel);
    const moduleGuess = guessModule(parsed.routePattern);

    routes.push({
      routePattern: parsed.routePattern,
      filePath: rel,
      routerType: routerType ?? 'unknown',
      pageTypeGuess: pageType,
      moduleGuess,
      isDynamicRoute: isDynamicRoute(parsed.routePattern),
      depth: routeDepth(parsed.routePattern),
      routeFileKind: parsed.routeFileKind,
    });
  }

  routes.sort((a, b) => a.routePattern.localeCompare(b.routePattern) || a.filePath.localeCompare(b.filePath));
  return routes;
}

function buildSourceFileHints(files) {
  const hints = [];
  for (const { rel } of files) {
    const ext = path.extname(rel).toLowerCase();
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue;

    let content;
    try {
      content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      continue;
    }

    const analysis = analyzeImports(content);
    const anyHint =
      analysis.usesAixiaComponents ||
      analysis.importsForbiddenUiComponents ||
      analysis.referencesSupabase ||
      analysis.referencesFinancePermissions ||
      analysis.hasLocalTailwindHeavyClasses;

    if (!anyHint) continue;

    hints.push({
      filePath: rel,
      ...analysis,
    });
  }

  return hints;
}

function summarizeHints(hints) {
  return {
    usesAixiaComponents: hints.filter((h) => h.usesAixiaComponents).length,
    importsForbiddenUiComponents: hints.filter((h) => h.importsForbiddenUiComponents).length,
    referencesSupabase: hints.filter((h) => h.referencesSupabase).length,
    referencesFinancePermissions: hints.filter((h) => h.referencesFinancePermissions).length,
    hasLocalTailwindHeavyClasses: hints.filter((h) => h.hasLocalTailwindHeavyClasses).length,
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# AiXia Static App Discovery Report');
  lines.push('');
  lines.push('## Purpose');
  lines.push(
    'This report is produced by a **read-only static scan** of allowed source folders. It does **not** run the website, open a browser, connect to Supabase, or validate permissions at runtime. Findings are discovery hints for Phase 2 planning—not final QA issues.',
  );
  lines.push('');
  lines.push('## Source Folders Found');
  lines.push('');
  if (report.sourceFoldersFound.length === 0) {
    lines.push('_No expected source folders were found._');
  } else {
    for (const folder of report.sourceFoldersFound) {
      lines.push(`- \`${folder}\``);
    }
  }
  lines.push('');
  lines.push('## Scan Summary');
  lines.push('');
  lines.push(`- Files scanned: **${report.scannedFileCount}**`);
  lines.push(`- Routes discovered: **${report.discoveredRouteCount}**`);
  lines.push(`- App router routes: **${report.summary.appRouterRoutes}**`);
  lines.push(`- Pages router routes: **${report.summary.pagesRouterRoutes}**`);
  lines.push(`- Dynamic routes: **${report.summary.dynamicRoutes}**`);
  lines.push(`- Finance routes: **${report.summary.financeRoutes}**`);
  lines.push(`- HR routes: **${report.summary.hrRoutes}**`);
  lines.push(`- AI assistant routes: **${report.summary.aiAssistantRoutes}**`);
  lines.push(`- SaaS routes: **${report.summary.saasRoutes}**`);
  lines.push(`- Unknown module routes: **${report.summary.unknownModuleRoutes}**`);
  lines.push('');
  lines.push('## Discovered Routes');
  lines.push('');
  lines.push('| Route | File | Router Type | Page Type | Module | Dynamic |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const route of report.discoveredRoutes) {
    lines.push(
      `| \`${route.routePattern}\` | \`${route.filePath}\` | ${route.routerType} | ${route.pageTypeGuess} | ${route.moduleGuess} | ${route.isDynamicRoute ? 'yes' : 'no'} |`,
    );
  }
  lines.push('');
  lines.push('## Registry Route Comparison');
  lines.push('');
  lines.push('| Registry Group | Pattern | Status | Notes |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.registryRouteComparison) {
    lines.push(`| ${row.groupName} (\`${row.groupId}\`) | \`${row.pattern}\` | ${row.matchStatus} | ${row.notes} |`);
  }
  lines.push('');
  lines.push('## Source File Hints');
  lines.push('');
  const hintSummary = report.summary.sourceHintCounts;
  lines.push(`- Files using AiXia components (\`@/components/aixia\`): **${hintSummary.usesAixiaComponents}**`);
  lines.push(`- Files importing \`@/components/ui\`: **${hintSummary.importsForbiddenUiComponents}**`);
  lines.push(`- Files referencing Supabase: **${hintSummary.referencesSupabase}**`);
  lines.push(`- Files referencing finance permissions (\`pageAccess\`): **${hintSummary.referencesFinancePermissions}**`);
  lines.push(`- Files with local Tailwind-heavy hint: **${hintSummary.hasLocalTailwindHeavyClasses}**`);
  lines.push('');
  lines.push('## Early Observations');
  lines.push('');
  lines.push('- These are **not** final issues.');
  lines.push('- These are **static discovery hints** only.');
  lines.push('- Browser QA, auth sessions, and design-system guardrails come in later phases.');
  if (report.summary.registryPatternsNotFound > 0) {
    lines.push(
      `- **${report.summary.registryPatternsNotFound}** registry pattern(s) on current/mixed groups had no matching discovered route (review before treating as gaps).`,
    );
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push('Proceed to **Phase 2B: static design-system guardrails** (read-only reports for forbidden imports, page-local UI patterns, and shared component usage).');
  lines.push('');
  lines.push(`_Generated at ${report.generatedAt}_`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const sourceFoldersFound = SOURCE_FOLDER_CANDIDATES.filter((folder) =>
    fs.existsSync(path.join(ROOT, folder)),
  );

  let routeGroupsData;
  try {
    routeGroupsData = readJson(ROUTE_GROUPS_PATH);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const allFiles = [];
  for (const scanRoot of SCAN_ROOTS) {
    const abs = path.join(ROOT, scanRoot);
    if (!fs.existsSync(abs)) continue;
    walkFiles(abs, scanRoot, allFiles);
  }

  const discoveredRoutes = discoverRoutesFromFiles(allFiles);
  const sourceFileHints = buildSourceFileHints(allFiles);
  const registryRouteComparison = compareRegistryRoutes(discoveredRoutes, routeGroupsData);

  const notFoundCount = registryRouteComparison.filter(
    (row) => row.matchStatus === 'not-found',
  ).length;

  const summary = {
    appRouterRoutes: discoveredRoutes.filter((r) => r.routerType === 'app-router').length,
    pagesRouterRoutes: discoveredRoutes.filter((r) => r.routerType === 'pages-router').length,
    dynamicRoutes: discoveredRoutes.filter((r) => r.isDynamicRoute).length,
    financeRoutes: discoveredRoutes.filter((r) => r.moduleGuess === 'finance').length,
    hrRoutes: discoveredRoutes.filter((r) => r.moduleGuess === 'hr').length,
    aiAssistantRoutes: discoveredRoutes.filter((r) => r.moduleGuess === 'ai-assistant').length,
    saasRoutes: discoveredRoutes.filter((r) => r.moduleGuess === 'saas').length,
    unknownModuleRoutes: discoveredRoutes.filter((r) => r.moduleGuess === 'unknown').length,
    sourceHintCounts: summarizeHints(sourceFileHints),
    registryPatternsNotFound: notFoundCount,
    registryPatternsFound: registryRouteComparison.filter((r) => r.matchStatus === 'found').length,
    registryPatternsFutureVerifyLater: registryRouteComparison.filter(
      (r) => r.matchStatus === 'future-verify-later',
    ).length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: ROOT,
    sourceFoldersFound,
    scannedFileCount: allFiles.length,
    discoveredRouteCount: discoveredRoutes.length,
    discoveredRoutes,
    sourceFileHints,
    registryRouteComparison,
    summary,
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_REPORT, buildMarkdown(report), 'utf8');

  if (sourceFoldersFound.length === 0) {
    console.warn('Warning: no expected source folders found; report is empty aside from registry comparison.');
  }

  console.log('AiXia Static App Discovery');
  console.log('--------------------------');
  console.log(`Source folders found: ${sourceFoldersFound.length}`);
  console.log(`Files scanned: ${allFiles.length}`);
  console.log(`Routes discovered: ${discoveredRoutes.length}`);
  console.log(`Report written: ${posix(path.relative(ROOT, MD_REPORT))}`);
  console.log(`JSON written: ${posix(path.relative(ROOT, JSON_REPORT))}`);
  console.log('Result: PASS');
}

try {
  main();
} catch (error) {
  console.error('Unexpected failure:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
