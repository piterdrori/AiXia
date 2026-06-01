#!/usr/bin/env node
/**
 * Reads static design guardrail findings and writes an implementation planning report.
 * Read-only on app source; writes qa-agent/reports/guardrail-action-plan.{md,json} only.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const QA_ROOT = path.join(ROOT, 'qa-agent');
const REPORTS_DIR = path.join(QA_ROOT, 'reports');

const SOURCE_REL = 'qa-agent/reports/static-design-guardrails.json';
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const OUTPUT_MD = path.join(REPORTS_DIR, 'guardrail-action-plan.md');
const OUTPUT_JSON = path.join(REPORTS_DIR, 'guardrail-action-plan.json');

const REQUIRED_REGISTRY = [
  'qa-agent/registry/combined-agents.json',
  'qa-agent/registry/review-panels.json',
];

const REQUIRED_TEMPLATES = [
  'qa-agent/templates/cursor-fix-prompt-template.md',
  'qa-agent/templates/improvement-proposal-template.md',
  'qa-agent/templates/council-decision-template.md',
];

const SAFETY_RULES = [
  'Static scanner findings are hints, not proof.',
  'Do not edit pages blindly from scanner output.',
  'Do not change backend logic, Supabase queries, API calls, routing, permissions, validation, handlers, or state unless explicitly required.',
  'Do not change Supabase schema or RPC behavior from design-only tasks.',
  'Do not touch permissions or tenant boundaries.',
  'Do not create new page-local visual systems.',
  'Fix shared source-of-truth (src/components/aixia, src/styles) when the same pattern appears globally.',
  'Page-level visual fixes are allowed only when the issue is truly page-specific and verified.',
];

const RECOMMENDED_NEXT_STEP =
  '1. Manually verify the actionable finance local-glass-card findings in browser or by file inspection. ' +
  '2. Do not change HR/AI/SaaS future debt yet. ' +
  '3. Do not mass-fix review-needed findings. ' +
  '4. After verification, create one small design-only prompt for the confirmed finance hub/page local-glass findings. ' +
  '5. Preserve app logic and shared source-of-truth rules.';

const OUT_OF_SCOPE_BUCKETS = [
  { key: 'hr-future', label: 'HR future debt', scopes: ['hr-future'] },
  { key: 'ai-future', label: 'AI future debt', scopes: ['ai-future'] },
  { key: 'saas-future', label: 'SaaS future debt', scopes: ['saas-future'] },
  {
    key: 'core-other',
    label: 'Core/unknown future debt',
    scopes: ['core-future', 'unknown', 'shared-source', 'lib-backend'],
  },
];

const MAX_REPRESENTATIVE_FILES = 8;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJsonFile(relativePath) {
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

function readTextFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function panelNameById(reviewPanels, panelId) {
  const panel = reviewPanels.panels?.find((item) => item.id === panelId);
  return panel?.name ?? panelId;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function countBy(items, keyFn) {
  const map = {};
  for (const item of items) {
    const key = keyFn(item);
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

function representativeFiles(findings, limit = MAX_REPRESENTATIVE_FILES) {
  return uniqueSorted(findings.map((f) => f.filePath)).slice(0, limit);
}

function whyActionable(finding) {
  if (finding.classificationReason) {
    return finding.classificationReason;
  }
  if (finding.moduleScope === 'finance-current') {
    return 'Finance-current scope with scanner confidence that a standardized visual pattern may be drifting from shared AiXia source of truth.';
  }
  return 'Scanner classified this as actionable based on rule signals and module scope.';
}

function suggestedVerification(finding) {
  const checks = [
    'Open the file and locate the evidence strings in JSX (not comments-only).',
    'Confirm the page is a full UI surface (not redirect-only or layout-only).',
    'Compare with an adjacent finance page that already uses shared AiXia surfaces/cards.',
    'Inspect src/components/aixia and src/styles/aixia-design-system.css for an existing shared pattern.',
  ];

  if (finding.ruleId === 'local-glass-card-pattern') {
    checks.push(
      'In browser (finance role), confirm the glass/card styling is visible and unintentional—not required for print or a one-off marketing layout.',
    );
  }

  if (finding.ruleId === 'forbidden-ui-import') {
    checks.push('List each @/components/ui import and identify the shared AiXia wrapper equivalent before any replacement.');
  }

  return checks;
}

function suggestedScope(finding) {
  if (finding.ruleId === 'local-glass-card-pattern') {
    return (
      'Design-only: replace local Tailwind glass/card wrappers with shared AiXia layout/surface components or shared finance CSS tokens. ' +
      'Scope to the verified JSX block(s) in this file unless the same pattern appears on multiple finance hub pages—in that case, prefer a shared component/CSS fix.'
    );
  }
  if (finding.ruleId === 'forbidden-ui-import') {
    return 'Design-only: migrate primitive UI imports to shared @/components/aixia wrappers after shared wrappers exist.';
  }
  return 'Design-only visual alignment with shared AiXia source of truth; no behavioral changes.';
}

function nonChangesList() {
  return [
    'Supabase queries, RPC calls, and realtime subscriptions',
    'API endpoints and request/response shapes',
    'Routing paths and navigation guards',
    'Permissions, roles, and tenant/company boundaries',
    'Validation rules and form state machines',
    'Event handlers, archive/delete lifecycle logic, and status transitions',
    'Data structures passed to child components',
  ];
}

function buildCursorPromptDraft(finding, panelName) {
  const lines = [
    '# Cursor/Hermes Fix Prompt (draft — verify before use)',
    '',
    `TASK: Review and fix design drift for ${finding.id} (${finding.ruleName}).`,
    '',
    'REQUIRED READING (in order):',
    '- qa-agent/README.md',
    '- qa-agent/FOUNDATION_INDEX.md',
    '- qa-agent/qa-agent-council.md',
    '- qa-agent/qa-issue-taxonomy.md',
    '',
    'TARGET:',
    `- File: ${finding.filePath}`,
    `- Rule: ${finding.ruleId}`,
    `- Module scope: ${finding.moduleScope}`,
    `- Review panel: ${panelName}`,
    '',
    'INVESTIGATION:',
    `- ${finding.message}`,
    `- Evidence: ${finding.evidence}`,
    `- ${finding.cursorPromptHint ?? 'Follow shared AiXia source of truth.'}`,
    '',
    'AIXIA SOURCE-OF-TRUTH:',
    '- Inspect shared AiXia components under src/components/aixia first.',
    '- Inspect src/styles/aixia-design-system.css and finance shared CSS before page edits.',
    '- Do not create page-local design systems.',
    '- If the pattern repeats on multiple finance pages, fix shared source-of-truth instead of one page.',
    '',
    'PRESERVE (do not change unless explicitly required):',
    '- All business logic, Supabase logic, API calls, routing, permissions, validation, handlers, state, and backend behavior.',
    '',
    'ALLOWED SCOPE (only after manual/browser verification):',
    '- Visual/design pattern alignment using shared AiXia components/CSS.',
    '- Provide exact full block/section replacement if code changes are requested.',
    '',
    'DO NOT:',
    '- Guess database columns or change RPC signatures.',
    '- Alter permissions or tenant boundaries.',
    '- Mass-replace unrelated pages from scanner output alone.',
  ];
  return lines.join('\n');
}

function verificationChecklist(finding) {
  const base = [
    'Confirm classification review-needed is still correct after file inspection.',
    'Determine whether shared command shell, archive manager, or RPC-only lifecycle is in use.',
    'Check for AixiaArchiveManagerModal, AixiaFinanceCommandDetailPage, or FinancePage wrapper usage.',
    'Verify no custom archive/delete modal was added locally.',
  ];

  if (finding.ruleId === 'local-table-system') {
    base.push('Confirm whether this is a print-only document with an intentional custom table layout.');
    base.push('If print strategy is custom-by-design, close as no-change until print guardrails are defined.');
  }

  if (finding.ruleId === 'local-glass-card-pattern') {
    base.push('Confirm backdrop-blur/glass classes are user-visible UI, not a utility for overlays.');
    base.push('Check if a shared footer/surface component should own the pattern instead.');
  }

  return base;
}

function enrichActionable(finding, reviewPanels) {
  const panelId = finding.recommendedReviewPanel ?? 'design-panel';
  const panelName = panelNameById(reviewPanels, panelId);

  return {
    id: finding.id,
    severity: finding.severity,
    ruleId: finding.ruleId,
    ruleName: finding.ruleName,
    filePath: finding.filePath,
    module: finding.module,
    moduleScope: finding.moduleScope,
    message: finding.message,
    evidence: finding.evidence,
    classificationReason: finding.classificationReason,
    recommendedReviewPanel: panelId,
    recommendedReviewPanelName: panelName,
    whyActionable: whyActionable(finding),
    suggestedVerification: suggestedVerification(finding),
    suggestedScope: suggestedScope(finding),
    nonChanges: nonChangesList(),
    cursorPromptDraft: buildCursorPromptDraft(finding, panelName),
  };
}

function enrichReviewNeeded(finding) {
  return {
    id: finding.id,
    severity: finding.severity,
    ruleId: finding.ruleId,
    ruleName: finding.ruleName,
    filePath: finding.filePath,
    moduleScope: finding.moduleScope,
    message: finding.message,
    classificationReason: finding.classificationReason,
    verificationChecklist: verificationChecklist(finding),
    doNotFixUntilVerified:
      'Do not change archive/delete UI, tables, or glass styling until file and browser verification confirm a real design defect rather than RPC/command-shell or print-template intent.',
  };
}

function summarizeOutOfScope(outOfScopeFindings) {
  const summary = {};

  for (const bucket of OUT_OF_SCOPE_BUCKETS) {
    const bucketFindings = outOfScopeFindings.filter((f) => bucket.scopes.includes(f.moduleScope));
    summary[bucket.key] = {
      label: bucket.label,
      count: bucketFindings.length,
      byRule: countBy(bucketFindings, (f) => f.ruleId),
      bySeverity: countBy(bucketFindings, (f) => f.severity),
      representativeFiles: representativeFiles(bucketFindings),
    };
  }

  return summary;
}

function summarizeFalsePositiveNoise(guardrails) {
  const falsePositiveFindings = guardrails.falsePositiveFindings ?? [];
  const skipped = guardrails.skippedNoise ?? {};

  return {
    falsePositiveFindingCount: falsePositiveFindings.length,
    representativeFiles: representativeFiles(falsePositiveFindings, 6),
    skippedNoise: {
      redirectOnlyPages: skipped.redirectOnlyPages ?? 0,
      archiveBenignSkipped: skipped.archiveBenignSkipped ?? 0,
      nonPageInfrastructureExcluded: skipped.nonPageInfrastructureExcluded ?? 0,
    },
    notes: [
      'Redirect-only pages: hero/missing-aixia/archive rules skipped.',
      'src/lib lifecycle and permission-key-only archive wording often skipped.',
      'src/components/aixia shared wrappers may record positive usage instead of violations.',
      'src/styles and non-page infrastructure excluded from page-level visual rules.',
      'Print templates may remain review-needed rather than actionable.',
    ],
  };
}

function summarizePositive(guardrails, positiveFindings) {
  return {
    positiveFindingCount: positiveFindings.length,
    positiveSharedAixiaUsageCount: guardrails.positiveSharedAixiaUsageCount ?? 0,
    positiveWrapperFiles: guardrails.positiveWrapperFiles ?? [],
    representativePositiveFindings: positiveFindings.slice(0, 6).map((f) => ({
      id: f.id,
      filePath: f.filePath,
      ruleId: f.ruleId,
      message: f.message,
    })),
  };
}

function buildSummary(guardrails, findings) {
  const byClassification = guardrails.findingsByClassification ?? countBy(findings, (f) => f.classification);

  return {
    totalFindings: guardrails.totalFindings ?? guardrails.findingCount ?? findings.length,
    actionable: guardrails.actionableCount ?? byClassification.actionable ?? 0,
    reviewNeeded: guardrails.reviewNeededCount ?? byClassification['review-needed'] ?? 0,
    falsePositiveLikely:
      guardrails.falsePositiveLikelyCount ?? byClassification['false-positive-likely'] ?? 0,
    outOfScope: guardrails.outOfScopeCount ?? byClassification['out-of-scope'] ?? 0,
    positive: guardrails.positiveCount ?? byClassification.positive ?? 0,
  };
}

function collectFindings(guardrails) {
  const all = guardrails.findings ?? [];
  const actionable =
    guardrails.actionableFindings ?? all.filter((f) => f.classification === 'actionable');
  const reviewNeeded =
    guardrails.reviewNeededFindings ?? all.filter((f) => f.classification === 'review-needed');
  const outOfScope =
    guardrails.outOfScopeFindings ?? all.filter((f) => f.classification === 'out-of-scope');
  const positive = all.filter((f) => f.classification === 'positive');
  const falsePositive =
    guardrails.falsePositiveFindings ?? all.filter((f) => f.classification === 'false-positive-likely');

  return { all, actionable, reviewNeeded, outOfScope, positive, falsePositive };
}

function renderActionableSection(items) {
  if (items.length === 0) {
    return '_No actionable findings in the source report._\n';
  }

  const blocks = items.map((item) => {
    const verification = item.suggestedVerification.map((v) => `- ${v}`).join('\n');
    const nonChanges = item.nonChanges.map((v) => `- ${v}`).join('\n');

    return [
      `### ${item.id} — ${item.ruleName} (${item.severity})`,
      '',
      `| Field | Value |`,
      `| --- | --- |`,
      `| Severity | ${item.severity} |`,
      `| Rule | ${item.ruleId} |`,
      `| File | \`${item.filePath}\` |`,
      `| Module scope | ${item.moduleScope} |`,
      `| Review panel | ${item.recommendedReviewPanelName} (\`${item.recommendedReviewPanel}\`) |`,
      '',
      `**Message:** ${item.message}`,
      '',
      `**Evidence:** ${item.evidence}`,
      '',
      `**Classification reason:** ${item.classificationReason}`,
      '',
      `**Why this may be actionable:** ${item.whyActionable}`,
      '',
      '**Required manual/browser verification before code:**',
      verification,
      '',
      `**Suggested implementation scope:** ${item.suggestedScope}`,
      '',
      '**Explicit non-changes:**',
      nonChanges,
      '',
      '**Cursor/Hermes prompt draft:**',
      '',
      '```markdown',
      item.cursorPromptDraft,
      '```',
      '',
    ].join('\n');
  });

  return blocks.join('\n');
}

function renderReviewSection(items) {
  if (items.length === 0) {
    return '_No review-needed findings in the source report._\n';
  }

  return items
    .map((item) => {
      const checklist = item.verificationChecklist.map((c) => `- ${c}`).join('\n');
      return [
        `### ${item.id} — ${item.ruleName} (${item.severity})`,
        '',
        `- **File:** \`${item.filePath}\``,
        `- **Module scope:** ${item.moduleScope}`,
        `- **Message:** ${item.message}`,
        `- **Classification reason:** ${item.classificationReason}`,
        '',
        '**Why review is needed:**',
        '',
        item.classificationReason,
        '',
        '**Verification checklist:**',
        checklist,
        '',
        `**Do not fix until verified:** ${item.doNotFixUntilVerified}`,
        '',
      ].join('\n');
    })
    .join('\n');
}

function renderOutOfScopeSection(summary) {
  return OUT_OF_SCOPE_BUCKETS.map((bucket) => {
    const data = summary[bucket.key];
    const rules = Object.entries(data.byRule)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => `${rule} (${count})`)
      .join(', ');

    const files =
      data.representativeFiles.length > 0
        ? data.representativeFiles.map((f) => `- \`${f}\``).join('\n')
        : '_None_';

    return [
      `### ${data.label}`,
      '',
      `- **Count:** ${data.count}`,
      `- **By rule:** ${rules || 'n/a'}`,
      '',
      '**Representative files:**',
      files,
      '',
    ].join('\n');
  }).join('\n');
}

function renderFalsePositiveSection(noiseSummary) {
  const skipped = noiseSummary.skippedNoise;
  const notes = noiseSummary.notes.map((n) => `- ${n}`).join('\n');

  return [
    `- **False-positive-likely findings in report:** ${noiseSummary.falsePositiveFindingCount}`,
    `- **Redirect-only pages skipped:** ${skipped.redirectOnlyPages}`,
    `- **Archive benign wording skipped:** ${skipped.archiveBenignSkipped}`,
    `- **Non-page infrastructure excluded:** ${skipped.nonPageInfrastructureExcluded}`,
    '',
    '**Scanner noise patterns:**',
    notes,
    '',
    noiseSummary.representativeFiles.length > 0
      ? `**Representative false-positive-likely files:**\n${noiseSummary.representativeFiles.map((f) => `- \`${f}\``).join('\n')}`
      : '',
    '',
  ].join('\n');
}

function renderPositiveSection(positiveSummary) {
  const wrappers =
    positiveSummary.positiveWrapperFiles.length > 0
      ? positiveSummary.positiveWrapperFiles.map((f) => `- \`${f}\``).join('\n')
      : '_None listed_';

  const reps =
    positiveSummary.representativePositiveFindings.length > 0
      ? positiveSummary.representativePositiveFindings
          .map((f) => `- ${f.id}: \`${f.filePath}\` (${f.ruleId})`)
          .join('\n')
      : '_No positive finding records_';

  return [
    `- **@/components/aixia import usage (scanner):** ${positiveSummary.positiveSharedAixiaUsageCount}`,
    `- **Positive finding records:** ${positiveSummary.positiveFindingCount}`,
    '',
    '**Shared wrapper files (representative):**',
    wrappers,
    '',
    '**Positive finding records:**',
    reps,
    '',
  ].join('\n');
}

function buildMarkdown(plan) {
  const { summary, sourceGeneratedAt, actionable, reviewNeeded, outOfScopeSummary, falsePositiveSummary, positiveSummary } =
    plan;

  const safety = SAFETY_RULES.map((r) => `- ${r}`).join('\n');

  return [
    '# AiXia Guardrail Action Plan',
    '',
    '## Purpose',
    '',
    'This report converts static design guardrail findings into an implementation planning view. ',
    'It is not a browser test and not proof by itself. It should guide what to verify and what to fix later.',
    '',
    '## Source',
    '',
    `- **Source JSON:** \`${SOURCE_REL}\``,
    `- **Source generated:** ${sourceGeneratedAt ?? 'unknown'}`,
    `- **Action plan generated:** ${plan.generatedAt}`,
    `- **Total findings:** ${summary.totalFindings}`,
    `- **Actionable:** ${summary.actionable}`,
    `- **Review needed:** ${summary.reviewNeeded}`,
    `- **Out of scope:** ${summary.outOfScope}`,
    `- **False-positive-likely:** ${summary.falsePositiveLikely}`,
    `- **Positive:** ${summary.positive}`,
    '',
    '## Actionable Findings',
    '',
    renderActionableSection(plan.actionableFindings),
    '## Review Needed Findings',
    '',
    renderReviewSection(plan.reviewNeededFindings),
    '## Out-of-Scope Findings',
    '',
    renderOutOfScopeSection(outOfScopeSummary),
    '## False Positive / Skipped Noise',
    '',
    renderFalsePositiveSection(falsePositiveSummary),
    '## Positive Shared AiXia Usage',
    '',
    renderPositiveSection(positiveSummary),
    '## Recommended Next Step',
    '',
    RECOMMENDED_NEXT_STEP,
    '',
    '## Safety Rules',
    '',
    safety,
    '',
  ].join('\n');
}

function main() {
  console.log('AiXia Guardrail Action Plan Generator');
  console.log('-------------------------------------');

  if (!fs.existsSync(SOURCE_PATH)) {
    fail(
      'Missing qa-agent/reports/static-design-guardrails.json. Run npm run qa:static-design-guardrails first.',
    );
    return;
  }

  let guardrails;
  try {
    guardrails = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${SOURCE_REL}: ${error.message}`);
    return;
  }

  for (const rel of REQUIRED_REGISTRY) {
    if (!readJsonFile(rel)) return;
  }
  for (const rel of REQUIRED_TEMPLATES) {
    if (!readTextFile(rel)) return;
  }

  const reviewPanels = readJsonFile('qa-agent/registry/review-panels.json');
  if (!reviewPanels) return;

  // Templates are required for workflow alignment; content informs future prompt expansion.
  readTextFile('qa-agent/templates/cursor-fix-prompt-template.md');
  readTextFile('qa-agent/templates/improvement-proposal-template.md');
  readTextFile('qa-agent/templates/council-decision-template.md');

  const { all, actionable, reviewNeeded, outOfScope, positive, falsePositive } =
    collectFindings(guardrails);

  const summary = buildSummary(guardrails, all);
  const actionableEnriched = actionable.map((f) => enrichActionable(f, reviewPanels));
  const reviewEnriched = reviewNeeded.map(enrichReviewNeeded);
  const outOfScopeSummary = summarizeOutOfScope(outOfScope);
  const falsePositiveSummary = summarizeFalsePositiveNoise(guardrails);
  const positiveSummary = summarizePositive(guardrails, positive);

  const generatedAt = new Date().toISOString();

  const plan = {
    generatedAt,
    source: SOURCE_REL,
    sourceGeneratedAt: guardrails.generatedAt,
    summary,
    actionableFindings: actionableEnriched,
    reviewNeededFindings: reviewEnriched,
    outOfScopeSummary,
    falsePositiveSummary,
    positiveSummary,
    recommendedNextStep: RECOMMENDED_NEXT_STEP,
    safetyRules: SAFETY_RULES,
    grouped: {
      byClassification: guardrails.findingsByClassification ?? countBy(all, (f) => f.classification),
      bySeverity: guardrails.findingsBySeverity ?? countBy(all, (f) => f.severity),
      byModuleScope: guardrails.findingsByModuleScope ?? countBy(all, (f) => f.moduleScope),
      byRuleId: guardrails.findingsByRule ?? countBy(all, (f) => f.ruleId),
    },
  };

  try {
    ensureReportsDir();
    fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    fs.writeFileSync(OUTPUT_MD, buildMarkdown(plan), 'utf8');
  } catch (error) {
    fail(`Failed to write action plan reports: ${error.message}`);
    return;
  }

  console.log(`Source findings: ${summary.totalFindings}`);
  console.log(`Actionable: ${summary.actionable}`);
  console.log(`Review needed: ${summary.reviewNeeded}`);
  console.log(`Out of scope: ${summary.outOfScope}`);
  console.log(`Positive: ${summary.positive}`);
  console.log('Report written: qa-agent/reports/guardrail-action-plan.md');
  console.log('JSON written: qa-agent/reports/guardrail-action-plan.json');
  console.log('Result: PASS');
}

main();
