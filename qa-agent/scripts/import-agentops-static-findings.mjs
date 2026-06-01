#!/usr/bin/env node
/**
 * Stage 8 — Read guardrail-action-plan.json and generate AgentOps backlog import artifacts.
 * Does NOT apply SQL automatically. Does NOT use service-role.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const SOURCE_REL = 'qa-agent/reports/guardrail-action-plan.json';
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const REPORTS_DIR = path.join(ROOT, 'qa-agent/reports');
const PUBLIC_DIR = path.join(ROOT, 'public/agentops');

const OUTPUT_SQL = path.join(REPORTS_DIR, 'agentops-static-findings-import.sql');
const OUTPUT_MD = path.join(REPORTS_DIR, 'agentops-static-findings-import.md');
const OUTPUT_JSON = path.join(PUBLIC_DIR, 'static-import-plan.json');

const DEFAULT_CURSOR_PROMPT =
  'Inspect shared AiXia source-of-truth first. Preserve business logic, Supabase, routing, permissions, handlers, and backend behavior.';

const SEVERITY_MAP = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  improvement: 'Suggestion',
  suggestion: 'Suggestion',
};

const PRIORITY_SCORE = {
  Critical: 100,
  High: 80,
  Medium: 60,
  Low: 40,
  Suggestion: 20,
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: invalid JSON — ${error.message}`);
    return null;
  }
}

function filePathToRoute(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  let route = filePath
    .replace(/^src\/app\//, '/')
    .replace(/\/page\.tsx$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1');
  if (!route.startsWith('/')) route = `/${route}`;
  return route === '/' ? null : route;
}

function mapSeverity(raw) {
  const key = String(raw ?? 'medium').toLowerCase();
  return SEVERITY_MAP[key] ?? 'Medium';
}

function mapCategory(finding) {
  const panel = String(finding.recommendedReviewPanel ?? '').toLowerCase();
  if (panel.includes('design')) return 'Design';
  if (panel.includes('functional') || panel.includes('engineering')) return 'Functional';
  if (panel.includes('logical')) return 'Logical';
  const ruleId = String(finding.ruleId ?? '').toLowerCase();
  if (ruleId.includes('glass') || ruleId.includes('table') || ruleId.includes('modal')) {
    return 'Design';
  }
  if (ruleId.includes('archive') || ruleId.includes('delete')) return 'Technical';
  return 'Technical';
}

function buildTitle(finding) {
  const ruleName = finding.ruleName ?? finding.ruleId ?? 'finding';
  const location = filePathToRoute(finding.filePath) ?? finding.filePath ?? 'unknown';
  const title = `[STATIC] ${ruleName} — ${location}`;
  return title.length > 240 ? `${title.slice(0, 237)}…` : title;
}

function buildProblem(finding, bucket) {
  const parts = [
    finding.message ?? '',
    finding.evidence ? `Evidence: ${finding.evidence}` : '',
    finding.classificationReason ? `Classification: ${finding.classificationReason}` : '',
    bucket === 'review-needed' ? 'Classification: review-needed (verify before fix).' : '',
    finding.whyActionable ? `Why actionable: ${finding.whyActionable}` : '',
  ].filter(Boolean);
  return parts.join('\n\n').trim() || 'Imported static guardrail finding.';
}

function buildCursorPrompt(finding) {
  if (finding.cursorPromptDraft?.trim()) return finding.cursorPromptDraft.trim();
  return DEFAULT_CURSOR_PROMPT;
}

function buildMetadata(finding, bucket) {
  return {
    imported: true,
    importSource: 'guardrail-action-plan',
    sourceFindingId: finding.id,
    sourceFilePath: finding.filePath ?? null,
    importBucket: bucket,
    stage: '8',
    sample: false,
  };
}

function convertFinding(finding, bucket) {
  const issueCode = `AIXIA-STATIC-${finding.id}`;
  const severity = mapSeverity(finding.severity);
  const category = mapCategory(finding);
  const route = filePathToRoute(finding.filePath);
  const moduleName = finding.module ?? finding.moduleScope?.split('-')?.[0] ?? null;

  return {
    issueCode,
    title: buildTitle(finding),
    category,
    severity,
    status: 'Backlog',
    queueState: 'backlog',
    route,
    module: moduleName,
    pageType: null,
    reviewPanel: finding.recommendedReviewPanelName ?? finding.recommendedReviewPanel ?? null,
    evidenceSummary:
      'Imported from static guardrail action plan (Stage 8). Verify in browser before design-only fixes.',
    problem: buildProblem(finding, bucket),
    expectedResult: finding.suggestedScope ?? null,
    recommendedFixStrategy: finding.suggestedScope ?? null,
    cursorPrompt: buildCursorPrompt(finding),
    nonChangeRules: Array.isArray(finding.nonChanges)
      ? finding.nonChanges.join('\n')
      : null,
    priorityScore: PRIORITY_SCORE[severity] ?? 60,
    agentId: 'static-guardrail-import',
    metadata: buildMetadata(finding, bucket),
  };
}

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function buildInsertSql(candidate) {
  const columns = [
    'issue_code',
    'title',
    'category',
    'severity',
    'status',
    'queue_state',
    'top10_rank',
    'route',
    'module',
    'page_type',
    'review_panel',
    'evidence_summary',
    'problem',
    'expected_result',
    'recommended_fix_strategy',
    'cursor_prompt',
    'non_change_rules',
    'priority_score',
    'agent_id',
    'metadata',
  ];

  const values = [
    sqlEscape(candidate.issueCode),
    sqlEscape(candidate.title),
    sqlEscape(candidate.category),
    sqlEscape(candidate.severity),
    sqlEscape(candidate.status),
    sqlEscape(candidate.queueState),
    'NULL',
    sqlEscape(candidate.route),
    sqlEscape(candidate.module),
    sqlEscape(candidate.pageType),
    sqlEscape(candidate.reviewPanel),
    sqlEscape(candidate.evidenceSummary),
    sqlEscape(candidate.problem),
    sqlEscape(candidate.expectedResult),
    sqlEscape(candidate.recommendedFixStrategy),
    sqlEscape(candidate.cursorPrompt),
    sqlEscape(candidate.nonChangeRules),
    sqlEscape(candidate.priorityScore),
    sqlEscape(candidate.agentId),
    sqlJson(candidate.metadata),
  ];

  return `INSERT INTO public.agentops_findings (${columns.join(', ')})
VALUES (${values.join(', ')})
ON CONFLICT (issue_code) DO NOTHING;`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  console.log('AgentOps Stage 8 — static backlog import plan');
  console.log('---------------------------------------------');

  const plan = readJson(SOURCE_REL);
  if (!plan) return;

  const actionable = Array.isArray(plan.actionableFindings) ? plan.actionableFindings : [];
  const reviewNeeded = Array.isArray(plan.reviewNeededFindings) ? plan.reviewNeededFindings : [];

  const candidates = [
    ...actionable.map((f) => convertFinding(f, 'actionable')),
    ...reviewNeeded.map((f) => convertFinding(f, 'review-needed')),
  ];

  const generatedAt = new Date().toISOString();
  const importPlan = {
    generatedAt,
    source: SOURCE_REL,
    sourceGeneratedAt: plan.generatedAt ?? null,
    summary: {
      totalCandidates: candidates.length,
      actionable: actionable.length,
      reviewNeeded: reviewNeeded.length,
    },
    candidates: candidates.map((c) => ({
      issueCode: c.issueCode,
      title: c.title,
      category: c.category,
      severity: c.severity,
      status: c.status,
      queueState: c.queueState,
      route: c.route,
      module: c.module,
      pageType: c.pageType,
      reviewPanel: c.reviewPanel,
      evidenceSummary: c.evidenceSummary,
      problem: c.problem,
      expectedResult: c.expectedResult,
      recommendedFixStrategy: c.recommendedFixStrategy,
      cursorPrompt: c.cursorPrompt,
      nonChangeRules: c.nonChangeRules,
      priorityScore: c.priorityScore,
      agentId: c.agentId,
      metadata: c.metadata,
    })),
  };

  ensureDir(REPORTS_DIR);
  ensureDir(PUBLIC_DIR);

  const sqlHeader = `-- AgentOps Stage 8 static backlog import (generated ${generatedAt})
-- Source: ${SOURCE_REL}
-- Apply on STAGING only with explicit owner approval.
-- ON CONFLICT (issue_code) DO NOTHING — does not modify sample rows.

`;

  const sqlBody = candidates.map((c) => buildInsertSql(c)).join('\n\n');
  fs.writeFileSync(OUTPUT_SQL, `${sqlHeader}${sqlBody}\n`, 'utf8');

  const md = [
    '# AgentOps static findings import plan',
    '',
    `- Generated: ${generatedAt}`,
    `- Source: \`${SOURCE_REL}\``,
    `- SQL output: \`qa-agent/reports/agentops-static-findings-import.sql\``,
    `- UI plan JSON: \`public/agentops/static-import-plan.json\``,
    '',
    '## Counts',
    '',
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Total import candidates | ${candidates.length} |`,
    `| Actionable | ${actionable.length} |`,
    `| Review needed | ${reviewNeeded.length} |`,
    '',
    '## Skipped by design',
    '',
    '- Out-of-scope findings',
    '- False positive likely',
    '- Positive/shared usage only',
    '',
    '## Apply SQL (staging only)',
    '',
    'Run the SQL file in Supabase SQL editor on **staging** after review.',
    'This script does **not** apply SQL automatically.',
    '',
    '## UI import',
    '',
    'After running this script, use **Import Static Findings** on `/system/agent-ops`',
    'or apply the SQL file directly. Both use `ON CONFLICT` / duplicate skip by `issue_code`.',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_MD, md, 'utf8');
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(importPlan, null, 2)}\n`, 'utf8');

  console.log(`Source: ${SOURCE_REL}`);
  console.log(`Candidates: ${candidates.length} (actionable ${actionable.length}, review-needed ${reviewNeeded.length})`);
  console.log(`SQL: ${path.relative(ROOT, OUTPUT_SQL)}`);
  console.log(`Report: ${path.relative(ROOT, OUTPUT_MD)}`);
  console.log(`UI plan: ${path.relative(ROOT, OUTPUT_JSON)}`);
  console.log('Result: PASS (artifacts generated; SQL not applied)');
}

main();
