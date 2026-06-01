#!/usr/bin/env node
/**
 * Phase 2B: Read-only static design-system guardrail scan for AiXia QA Agent.
 * Writes triage-quality reports under qa-agent/reports only.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

import { runShellHeroGuardrails } from '../../scripts/guardrails/aixia-shell-hero-guardrails.mjs';
import { runShadcnBoundaryGuardrails } from '../../scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'qa-agent', 'reports');
const DISCOVERY_JSON = path.join(REPORTS_DIR, 'static-app-discovery.json');
const MD_REPORT = path.join(REPORTS_DIR, 'static-design-guardrails.md');
const JSON_REPORT = path.join(REPORTS_DIR, 'static-design-guardrails.json');

const REGISTRY_PATHS = {
  reviewPanels: path.join(ROOT, 'qa-agent/registry/review-panels.json'),
  issueCategories: path.join(ROOT, 'qa-agent/registry/issue-categories.json'),
  combinedAgents: path.join(ROOT, 'qa-agent/registry/combined-agents.json'),
};

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

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);

const FORBIDDEN_UI_PATTERNS = [
  /from\s+['"]@\/components\/ui(?:\/[^'"]*)?['"]/,
  /from\s+['"]src\/components\/ui(?:\/[^'"]*)?['"]/,
  /from\s+['"](?:\.\.\/)+components\/ui(?:\/[^'"]*)?['"]/,
];

const AIXIA_IMPORT = /@\/components\/aixia|from\s+['"]@\/components\/aixia/;
const AIXIA_TABLE_IMPORT = /AixiaTableShell|AixiaSortableHeader|AixiaTable\b/;
const AIXIA_MODAL_IMPORT = /AixiaModal|AixiaArchiveManagerModal/;
const AIXIA_BUTTON_IMPORT = /AixiaButton\b/;
const PAGE_SHELL_IMPORT =
  /AixiaHero|AixiaPage\b|FinancePage\b|AixiaFinanceCommandDetailPage|AixiaFinanceCommandCreatePage/;
const SHARED_ARCHIVE_SHELL_IMPORT =
  /AixiaArchiveManagerModal|AixiaFinanceCommandDetailPage|AixiaFinanceCommandCreatePage|FinancePage\b/;

const GLASS_PATTERNS = [
  /bg-white\/\[0\./,
  /border-white\/10/,
  /rounded-\[2/,
  /rounded-\[3/,
  /backdrop-blur/,
  /bg-black\/20/,
];

const TABLE_PATTERNS = [/<table\b/i, /\bsticky\b/, /overflow-x-auto/, /min-w\[/, /border-collapse/];
const MODAL_PATTERNS = [/fixed\s+inset-0/, /\bz-50\b/, /\bDialog\b/, /\bmodal\b/i, /\boverlay\b/i];
const ARCHIVE_WORDS = /\b(archive|delete|restore|permanently\s+delete)\b/i;

const BENIGN_ARCHIVE_ONLY_PATTERNS = [
  /deleteArchivePermissions/,
  /deleteArchive\s*:/,
  /Can Delete \/ Archive/,
  /archiveFinanceRecords/,
  /\|\s*["']archived["']/,
  /status\s*===\s*["']archived["']/,
  /["']archived["']\s*\|/,
  /finance_[a-z_]*archive[a-z_]*/i,
  /\.not\s*\(\s*["']status["']\s*,\s*["']in["']\s*,\s*["']\(archived/i,
  /Create,\s*update,\s*archive/i,
  /Approve,\s*archive,\s*delete/i,
];

const CUSTOM_ARCHIVE_UI_PATTERNS = [
  /<Dialog\b/,
  /archiveModal|showArchive|setArchive/i,
  /fixed\s+inset-0[\s\S]{0,400}\b(archive|delete|restore)\b/i,
  /runRpcAction\s*\(\s*["'][^"']*archive/i,
];

const TAILWIND_TOKEN =
  /\b(flex|grid|p-\d|px-|py-|m-\d|gap-|text-|bg-|border-|rounded-|w-|h-|items-|justify-|shadow-|md:|lg:)\b/;

const RULES = {
  'forbidden-ui-import': {
    id: 'forbidden-ui-import',
    name: 'Forbidden UI import',
    panel: 'design-panel',
    hint: 'Inspect this file and replace direct @/components/ui usage with shared @/components/aixia patterns only if this page is part of the standardized AiXia UI. Preserve all business logic.',
  },
  'missing-aixia-component-import': {
    id: 'missing-aixia-component-import',
    name: 'Missing AiXia component import',
    panel: 'design-panel',
    hint: 'Review whether this standardized module page should import shared @/components/aixia building blocks. Preserve handlers, data loading, and permissions.',
  },
  'local-glass-card-pattern': {
    id: 'local-glass-card-pattern',
    name: 'Local glass/card pattern',
    panel: 'design-panel',
    hint: 'Inspect shared AiXia card and surface CSS/components first. If the pattern repeats globally, fix shared source-of-truth rather than one page.',
  },
  'local-table-system': {
    id: 'local-table-system',
    name: 'Local table system',
    panel: 'design-panel',
    hint: 'Inspect this page and shared AiXia table components first. If this is a registry/list table, migrate visual structure to shared table source-of-truth without changing data loading, permissions, or handlers.',
  },
  'local-modal-system': {
    id: 'local-modal-system',
    name: 'Local modal system',
    panel: 'design-panel',
    hint: 'Inspect shared AixiaModal and archive modals before adding local dialog markup. Preserve interaction and permission behavior.',
  },
  'local-button-system': {
    id: 'local-button-system',
    name: 'Local button system',
    panel: 'design-panel',
    hint: 'Prefer shared AixiaButton for variants and action meaning. Do not change click handlers or business rules.',
  },
  'possible-hero-missing': {
    id: 'possible-hero-missing',
    name: 'Possible missing hero/page shell',
    panel: 'design-panel',
    hint: 'Verify the page uses AixiaHero, AixiaPage, FinancePage, or an approved finance command shell. Adjust layout only; preserve page logic.',
  },
  'local-archive-delete-flow': {
    id: 'local-archive-delete-flow',
    name: 'Local archive/delete flow',
    panel: 'functional-engineering-panel',
    hint: 'Inspect archive/delete behavior and shared AixiaArchiveManagerModal. Do not create local archive modal logic. Preserve lifecycle behavior and permissions.',
  },
  'tailwind-heavy-page': {
    id: 'tailwind-heavy-page',
    name: 'Tailwind-heavy page',
    panel: 'design-panel',
    hint: 'Review for page-local design drift. Move repeated visual patterns to shared AiXia components or shared CSS. Preserve all logic.',
  },
  'shared-aixia-wrapper': {
    id: 'shared-aixia-wrapper',
    name: 'Shared AiXia wrapper layer',
    panel: 'design-panel',
    hint: 'Shared AiXia wrapper intentionally composes primitives. Do not replace wrapper imports unless doing a dedicated shared-layer review.',
  },
  'orb-page-shell': {
    id: 'orb-page-shell',
    name: 'Orb/default AixiaPage shell',
    panel: 'design-panel',
    hint: 'Use FinancePage, AixiaCommandPage, or AixiaPage surface="command". See src/design-system/aixia-global/03-page-shell-standard.md and 15-guardrail-rules.md',
  },
  'non-command-hero': {
    id: 'non-command-hero',
    name: 'AixiaHero without command surface',
    panel: 'design-panel',
    hint: 'Set AixiaHero surface="command" on authenticated dashboard pages. See src/design-system/aixia-global/04-hero-header-standard.md and 15-guardrail-rules.md',
  },
  'shadcn-page-content': {
    id: 'shadcn-page-content',
    name: 'shadcn/ui in Finance/AgentOps page content',
    panel: 'design-panel',
    hint: 'Use @/components/aixia for page rhythm. shadcn/ui is shell chrome only. See src/design-system/aixia-global/07-button-action-standard.md, 13-module-wrapper-rules.md, and 15-guardrail-rules.md',
  },
};

let findingCounter = 0;

function posix(p) {
  return p.split(path.sep).join('/');
}

function readJsonRequired(filePath) {
  const rel = posix(path.relative(ROOT, filePath));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required registry file: ${rel}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${rel}: invalid JSON — ${error.message}`);
  }
}

function readJsonOptional(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function shouldIgnoreDir(name) {
  return IGNORED_DIR_NAMES.has(name);
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

function inferModule(rel, routeModuleMap) {
  if (routeModuleMap.has(rel)) return routeModuleMap.get(rel);
  const lower = rel.toLowerCase();
  if (lower.startsWith('src/components/aixia/')) return 'shared-aixia';
  if (lower.startsWith('src/styles/')) return 'shared-style';
  if (lower.includes('/finance/') || lower.startsWith('src/app/finance')) return 'finance';
  if (lower.includes('/hr/') || lower.includes('/employees') || lower.includes('/people')) return 'hr';
  if (
    lower.includes('/ai-management') ||
    lower.includes('/ai/') ||
    lower.includes('/assistant') ||
    lower.includes('/mcp')
  ) {
    return 'ai-assistant';
  }
  if (
    lower.includes('/tenant') ||
    lower.includes('/billing') ||
    lower.includes('/subscription') ||
    lower.includes('/saas')
  ) {
    return 'saas';
  }
  if (
    lower === 'src/app/page.tsx' ||
    lower.includes('/dashboard/') ||
    lower.includes('/tasks/') ||
    lower.includes('/profile/') ||
    lower.includes('/login/') ||
    lower.includes('/register/')
  ) {
    return 'core';
  }
  return 'unknown';
}

function inferModuleScope(rel, module) {
  const lower = rel.toLowerCase();
  if (lower.startsWith('src/components/aixia/') || lower.startsWith('src/styles/')) return 'shared-source';
  if (lower.startsWith('src/lib/')) return 'lib-backend';
  if (module === 'finance' && lower.includes('/finance')) return 'finance-current';
  if (module === 'hr' || lower.includes('/employees')) return 'hr-future';
  if (module === 'ai-assistant') return 'ai-future';
  if (module === 'saas') return 'saas-future';
  if (module === 'core') return 'core-future';
  return 'unknown';
}

function inferFileKind(rel) {
  const base = path.basename(rel);
  const lower = rel.toLowerCase();
  if (lower.startsWith('src/styles/') || lower.endsWith('.css')) return 'style';
  if (lower.startsWith('src/hooks/')) return 'hook';
  if (lower.startsWith('src/lib/')) return 'lib';
  if (lower.startsWith('src/components/ui/')) return 'ui-primitive';
  if (lower.startsWith('src/components/aixia/')) return 'component';
  if (lower.startsWith('src/components/')) return 'component';
  if (base === 'page.tsx' || base === 'page.ts') return 'app-page';
  if (['layout.tsx', 'layout.ts', 'loading.tsx', 'error.tsx', 'not-found.tsx'].includes(base)) {
    return 'app-layout';
  }
  if (base === 'route.ts' || base === 'route.tsx') return 'app-route';
  if (lower.includes('/src/pages/') || lower.includes('/pages/')) {
    const ext = path.extname(base);
    const name = base.slice(0, -ext.length);
    if (name === 'index' || ['tsx', 'ts', 'jsx', 'js'].includes(ext.slice(1))) return 'app-page';
  }
  if (lower.startsWith('src/app/')) return 'component';
  return 'unknown';
}

function classifyFile(rel, routeModuleMap) {
  const fileKind = inferFileKind(rel);
  const module = inferModule(rel, routeModuleMap);
  const moduleScope = inferModuleScope(rel, module);
  const isPageLevel = fileKind === 'app-page';
  return { filePath: rel, module, fileKind, moduleScope, isPageLevel };
}

function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function isRedirectOnly(content, fileKind) {
  if (!['app-page', 'app-route'].includes(fileKind)) return false;
  const stripped = stripComments(content);
  if (/\bnotFound\s*\(/.test(stripped)) return true;
  if (/\b(permanentRedirect|redirect)\s*\(/.test(stripped) && !/<(div|section|main|form|table|Aixia)/i.test(stripped)) {
    return true;
  }
  const hasNavigate = /<Navigate\b/.test(stripped);
  if (!hasNavigate) return false;
  const jsxTags = stripped.match(/<[A-Za-z][A-Za-z0-9]*/g) ?? [];
  const meaningfulTags = jsxTags.filter((tag) => !/^<(Navigate|Fragment|React\.Fragment)$/i.test(tag));
  return meaningfulTags.length === 0;
}

function isPrintDocument(rel) {
  const base = path.basename(rel).toLowerCase();
  return base.includes('print') && (base.endsWith('.tsx') || base.endsWith('.jsx'));
}

function isHubNavigationPage(rel, content) {
  const lower = rel.toLowerCase();
  const isFinanceHub =
    /\/finance\/page\.tsx$/.test(lower) ||
    /\/finance\/master-data\/page\.tsx$/.test(lower) ||
    /\/finance\/transactions\/page\.tsx$/.test(lower) ||
    /\/finance\/reports\/page\.tsx$/.test(lower);
  return isFinanceHub && /AixiaNavigation(Grid|Card)|AixiaFinanceHubOverviewGrid/.test(content);
}

function isNonPageInfrastructure(classification) {
  const { filePath, fileKind, moduleScope } = classification;
  const lower = filePath.toLowerCase();
  return (
    moduleScope === 'lib-backend' ||
    moduleScope === 'shared-source' ||
    fileKind === 'style' ||
    fileKind === 'hook' ||
    fileKind === 'lib' ||
    fileKind === 'ui-primitive' ||
    lower.startsWith('src/components/aixia/') ||
    lower.startsWith('src/components/ui/') ||
    lower.startsWith('src/styles/')
  );
}

function isRegistryLikePage(rel, fileKind) {
  if (fileKind !== 'app-page') return false;
  const lower = rel.toLowerCase();
  if (lower.includes('/new/')) return false;
  if (/\[[^\]]+\]/.test(lower)) return false;
  if (lower.endsWith('/page.tsx') && !lower.includes('/new/')) {
    const segments = lower.split('/');
    const lastSeg = segments[segments.length - 2];
    if (lastSeg === 'transactions' || lastSeg === 'master-data' || lastSeg === 'reports') return true;
    if (lower.includes('/master-data/') && !lower.includes('/[')) return true;
    if (lower.includes('/transactions/') && !lower.includes('/[') && !lower.includes('/new')) return true;
  }
  return false;
}

function archiveMentionsAreBenignOnly(content) {
  if (!ARCHIVE_WORDS.test(content)) return true;
  if (SHARED_ARCHIVE_SHELL_IMPORT.test(content) || AIXIA_MODAL_IMPORT.test(content)) return true;

  const stripped = content.replace(/\s+/g, ' ');
  const mentions = ARCHIVE_WORDS.test(stripped);
  if (!mentions) return true;

  const withoutBenign = BENIGN_ARCHIVE_ONLY_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ''),
    stripped,
  );
  if (!ARCHIVE_WORDS.test(withoutBenign)) return true;

  return false;
}

function hasCustomArchiveUi(content) {
  if (!ARCHIVE_WORDS.test(content)) return false;
  if (SHARED_ARCHIVE_SHELL_IMPORT.test(content) || AIXIA_MODAL_IMPORT.test(content)) return false;
  return CUSTOM_ARCHIVE_UI_PATTERNS.some((pattern) => pattern.test(content));
}

function shouldSkipPageVisualRule(classification, content, redirectOnly) {
  if (isNonPageInfrastructure(classification)) return true;
  if (redirectOnly) return true;
  if (classification.fileKind === 'app-layout' || classification.fileKind === 'app-route') return true;
  return false;
}

function applyScopeClassification(baseClassification, baseSeverity, classification, ruleId, triage = {}) {
  const { moduleScope } = classification;

  if (baseClassification === 'positive') {
    return {
      classification: 'positive',
      classificationReason:
        triage.classificationReason ?? 'Shared AiXia or approved source-of-truth usage detected.',
      severity: 'low',
    };
  }

  if (moduleScope === 'finance-current') {
    if (ruleId === 'forbidden-ui-import') {
      return {
        classification: baseClassification === 'actionable' ? 'actionable' : 'review-needed',
        classificationReason:
          'Finance-standardized app page with direct @/components/ui import; strong design-system signal.',
        severity: baseSeverity,
      };
    }
    if (ruleId === 'local-glass-card-pattern' && baseClassification === 'actionable') {
      return {
        classification: 'actionable',
        classificationReason: 'Finance page contains local glass/card Tailwind patterns in JSX UI.',
        severity: baseSeverity,
      };
    }
    return {
      classification: baseClassification,
      classificationReason: `Finance-current scope; ${ruleId} requires review against shared AiXia source of truth.`,
      severity: baseSeverity,
    };
  }

  if (moduleScope === 'hr-future') {
    if (ruleId === 'forbidden-ui-import') {
      return {
        classification: 'out-of-scope',
        classificationReason:
          'True standardization debt, but HR migration is not in the current finance-first batch.',
        severity: 'high',
      };
    }
    return {
      classification: 'out-of-scope',
      classificationReason: 'HR/employees area belongs to a future standardization program, not finance-first batch.',
      severity: baseSeverity === 'high' ? 'medium' : baseSeverity,
    };
  }

  if (moduleScope === 'ai-future' || moduleScope === 'saas-future') {
    return {
      classification: 'out-of-scope',
      classificationReason: 'AI/SaaS module standardization is planned for a later phase.',
      severity: baseSeverity === 'high' ? 'medium' : baseSeverity,
    };
  }

  if (moduleScope === 'core-future' || moduleScope === 'unknown') {
    return {
      classification: 'out-of-scope',
      classificationReason: 'Pre-standardization or non-finance module (chat, calendar, projects, core shell).',
      severity: baseSeverity === 'high' ? 'medium' : baseSeverity,
    };
  }

  if (moduleScope === 'shared-source') {
    return {
      classification: 'false-positive-likely',
      classificationReason: 'Shared AiXia layer or styles may intentionally use primitives or define global patterns.',
      severity: 'low',
    };
  }

  if (moduleScope === 'lib-backend') {
    return {
      classification: 'false-positive-likely',
      classificationReason: 'Backend/lib lifecycle or data code; not a page-level visual violation.',
      severity: 'low',
    };
  }

  return { classification: baseClassification, classificationReason: 'Default scanner classification.', severity: baseSeverity };
}

function makeFinding(rule, severity, fileClassification, message, evidence, panel, hint, triage) {
  findingCounter += 1;
  const scoped = applyScopeClassification(
    triage.baseClassification,
    severity,
    fileClassification,
    rule.id,
    triage,
  );

  return {
    id: `GR-${String(findingCounter).padStart(4, '0')}`,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: scoped.severity,
    filePath: fileClassification.filePath,
    module: fileClassification.module,
    moduleScope: fileClassification.moduleScope,
    fileKind: fileClassification.fileKind,
    message,
    evidence,
    recommendedReviewPanel: panel,
    cursorPromptHint: hint,
    classification: scoped.classification,
    classificationReason: triage.classificationReason ?? scoped.classificationReason,
  };
}

function pushFinding(findings, rule, severity, fileClassification, message, evidence, triage) {
  findings.push(
    makeFinding(rule, severity, fileClassification, message, evidence, rule.panel, rule.hint, triage),
  );
}

function analyzeFile(rel, content, fileClassification, scanMeta) {
  const findings = [];
  const lower = rel.toLowerCase();
  const usesAixia = AIXIA_IMPORT.test(content);
  const isTsx = /\.(tsx|jsx)$/.test(rel);
  const redirectOnly = isRedirectOnly(content, fileClassification.fileKind);
  const nonPage = isNonPageInfrastructure(fileClassification);
  const printDoc = isPrintDocument(rel);

  if (redirectOnly) {
    scanMeta.redirectOnlyFiles.push(rel);
  }

  if (lower.startsWith('src/components/aixia/') && FORBIDDEN_UI_PATTERNS.some((p) => p.test(content))) {
    scanMeta.positiveWrapperFiles.push(rel);
    pushFinding(
      findings,
      RULES['shared-aixia-wrapper'],
      'low',
      fileClassification,
      'Shared AiXia wrapper intentionally imports primitive UI components.',
      'Wrapper composes @/components/ui primitives.',
      {
        baseClassification: 'positive',
        classificationReason: 'Expected shared-wrapper pattern; not a page-level violation.',
      },
    );
    return { findings, usesAixia };
  }

  if (usesAixia && lower.startsWith('src/components/aixia/')) {
    scanMeta.positiveWrapperFiles.push(rel);
  }

  if (nonPage) {
    return { findings, usesAixia };
  }

  if (redirectOnly) {
    return { findings, usesAixia };
  }

  for (const pattern of FORBIDDEN_UI_PATTERNS) {
    const match = content.match(pattern);
    if (!match) continue;
    const rule = RULES['forbidden-ui-import'];
    let baseSeverity = 'low';
    let baseClass = 'review-needed';
    if (fileClassification.moduleScope === 'finance-current' && fileClassification.isPageLevel) {
      baseSeverity = 'high';
      baseClass = 'actionable';
    } else if (fileClassification.isPageLevel) {
      baseSeverity = 'medium';
    }
    pushFinding(
      findings,
      rule,
      baseSeverity,
      fileClassification,
      'AiXia standardized pages should use shared @/components/aixia components, not @/components/ui directly.',
      match[0].slice(0, 120),
      { baseClassification: baseClass },
    );
    break;
  }

  if (
    fileClassification.moduleScope === 'finance-current' &&
    fileClassification.isPageLevel &&
    isTsx &&
    !usesAixia
  ) {
    const rule = RULES['missing-aixia-component-import'];
    pushFinding(
      findings,
      rule,
      'medium',
      fileClassification,
      'Standardized AiXia module pages should use shared AiXia source-of-truth components where applicable.',
      'No @/components/aixia import detected on page file.',
      { baseClassification: 'review-needed' },
    );
  }

  const skipVisual = shouldSkipPageVisualRule(fileClassification, content, redirectOnly);

  if (!skipVisual) {
    const glassHits = GLASS_PATTERNS.filter((p) => p.test(content));
    const glassInJsx = /className\s*=[^>]*(bg-white\/|border-white\/10|backdrop-blur|bg-black\/20)/.test(content);
    if (glassHits.length >= 1 && glassInJsx) {
      const rule = RULES['local-glass-card-pattern'];
      const actionable =
        fileClassification.moduleScope === 'finance-current' && fileClassification.isPageLevel && !printDoc;
      pushFinding(
        findings,
        rule,
        actionable ? 'medium' : 'low',
        fileClassification,
        'Possible local glass/card visual system. Shared AiXia components or CSS should own repeated visual patterns.',
        glassHits.map((p) => p.source).join(', ').slice(0, 120),
        {
          baseClassification: actionable ? 'actionable' : printDoc ? 'review-needed' : 'review-needed',
          classificationReason: printDoc
            ? 'Print template may intentionally use custom layout.'
            : undefined,
        },
      );
    }

    const tableHits = TABLE_PATTERNS.filter((p) => p.test(content));
    if (tableHits.length >= 2 && !AIXIA_TABLE_IMPORT.test(content) && !lower.includes('src/components/aixia/')) {
      const rule = RULES['local-table-system'];
      if (printDoc) {
        pushFinding(
          findings,
          rule,
          'low',
          fileClassification,
          'Print templates may use custom table markup.',
          `Signals: ${tableHits.length} table-related patterns`,
          {
            baseClassification: 'review-needed',
            classificationReason: 'Print templates may be intentionally custom and require separate print strategy.',
          },
        );
      } else {
        const sev = isRegistryLikePage(rel, fileClassification.fileKind) ? 'high' : 'medium';
        pushFinding(
          findings,
          rule,
          sev,
          fileClassification,
          'Possible local table system. Registry/list pages should prefer shared AiXia table components.',
          `Signals: ${tableHits.length} table-related patterns`,
          {
            baseClassification:
              fileClassification.moduleScope === 'finance-current' && isRegistryLikePage(rel, fileClassification.fileKind)
                ? 'actionable'
                : 'review-needed',
          },
        );
      }
    }

    const modalHits = MODAL_PATTERNS.filter((p) => p.test(content));
    if (modalHits.length >= 2 && !AIXIA_MODAL_IMPORT.test(content)) {
      const rule = RULES['local-modal-system'];
      pushFinding(
        findings,
        rule,
        fileClassification.isPageLevel ? 'medium' : 'low',
        fileClassification,
        'Possible local modal system. Shared AiXia modal/archive components should be used where applicable.',
        `Signals: ${modalHits.length} modal-related patterns`,
        { baseClassification: 'review-needed' },
      );
    }

    const buttonCount = (content.match(/<button\b/gi) ?? []).length;
    const hasRawButtonClasses = /className\s*=\s*["'][^"']*\b(btn|button|rounded|px-\d)/i.test(content);
    if ((buttonCount >= 3 || (buttonCount >= 1 && hasRawButtonClasses)) && !AIXIA_BUTTON_IMPORT.test(content)) {
      const rule = RULES['local-button-system'];
      pushFinding(
        findings,
        rule,
        fileClassification.isPageLevel ? 'medium' : 'low',
        fileClassification,
        'Possible local button system. Shared AixiaButton should own button sizing, variants, and action meaning.',
        `${buttonCount} <button> element(s)`,
        { baseClassification: 'review-needed' },
      );
    }

    if (fileClassification.isPageLevel && isTsx && !PAGE_SHELL_IMPORT.test(content)) {
      const rule = RULES['possible-hero-missing'];
      pushFinding(
        findings,
        rule,
        'medium',
        fileClassification,
        'Possible missing shared AiXia hero/page shell. Verify page uses the approved shared layout.',
        'No AixiaHero / AixiaPage / FinancePage / finance command shell reference found.',
        { baseClassification: 'review-needed' },
      );
    }

    if (ARCHIVE_WORDS.test(content)) {
      const rule = RULES['local-archive-delete-flow'];
      const hubBenign = isHubNavigationPage(rel, content) && archiveMentionsAreBenignOnly(content);
      const benignOnly = archiveMentionsAreBenignOnly(content);
      const customUi = hasCustomArchiveUi(content);

      if (hubBenign || (benignOnly && !customUi)) {
        scanMeta.skippedArchiveBenign.push(rel);
      } else if (customUi && fileClassification.moduleScope === 'finance-current') {
        pushFinding(
          findings,
          rule,
          isRegistryLikePage(rel, fileClassification.fileKind) ? 'high' : 'medium',
          fileClassification,
          'File appears to implement custom archive/delete/restore UI instead of shared archive manager patterns.',
          'Custom archive/delete UI signals without shared archive manager import.',
          { baseClassification: 'actionable' },
        );
      } else if (ARCHIVE_WORDS.test(content) && fileClassification.moduleScope === 'finance-current') {
        pushFinding(
          findings,
          rule,
          'medium',
          fileClassification,
          'Archive/delete lifecycle referenced; verify shared command shell or archive manager is used.',
          'Archive/delete wording present; may be RPC/command detail rather than local modal.',
          {
            baseClassification: 'review-needed',
            classificationReason:
              'Finance detail pages may use AixiaFinanceCommandDetailPage with RPC archive actions rather than AixiaArchiveManagerModal in the same file.',
          },
        );
      } else if (!benignOnly) {
        pushFinding(
          findings,
          rule,
          'low',
          fileClassification,
          'Archive/delete language detected; likely permission copy or lifecycle reference.',
          'Archive/delete/restore language without shared archive component import.',
          { baseClassification: 'false-positive-likely' },
        );
      }
    }

    const classMatches = content.match(/className\s*=/g) ?? [];
    let tailwindCount = 0;
    for (const match of content.match(/className\s*=\s*(\{[^}]+\}|"[^"]*"|'[^']*')/g) ?? []) {
      if (TAILWIND_TOKEN.test(match)) tailwindCount += 1;
    }
    if (fileClassification.isPageLevel && classMatches.length >= 12 && tailwindCount >= 8 && !usesAixia) {
      const rule = RULES['tailwind-heavy-page'];
      pushFinding(
        findings,
        rule,
        'medium',
        fileClassification,
        'Potential page-local design system. Review for shared source-of-truth compliance.',
        `${classMatches.length} className occurrences, ${tailwindCount} Tailwind-like blocks`,
        { baseClassification: 'review-needed' },
      );
    }
  }

  return { findings, usesAixia };
}

function buildRouteModuleMap(discovery) {
  const map = new Map();
  if (!discovery?.discoveredRoutes) return map;
  for (const route of discovery.discoveredRoutes) {
    const mod =
      route.moduleGuess === 'finance'
        ? 'finance'
        : route.moduleGuess === 'hr'
          ? 'hr'
          : route.moduleGuess === 'ai-assistant'
            ? 'ai-assistant'
            : route.moduleGuess === 'saas'
              ? 'saas'
              : route.moduleGuess === 'core'
                ? 'core'
                : null;
    if (mod) map.set(route.filePath, mod);
  }
  return map;
}

function countByKey(items, key) {
  const counts = {};
  for (const item of items) {
    const k = item[key];
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function findingsTable(findings, limit = 200) {
  const lines = [];
  lines.push('| Severity | Classification | Rule | File | Module scope | Message |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const f of findings.slice(0, limit)) {
    const msg = f.message.replace(/\|/g, '\\|').slice(0, 70);
    lines.push(
      `| ${f.severity} | ${f.classification} | ${f.ruleName} | \`${f.filePath}\` | ${f.moduleScope} | ${msg} |`,
    );
  }
  if (findings.length > limit) {
    lines.push(`| … | … | … | _${findings.length - limit} more in JSON_ | … | … |`);
  }
  return lines.join('\n');
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# AiXia Static Design-System Guardrails Report');
  lines.push('');
  lines.push('## Purpose');
  lines.push(
    'This report is from a **read-only static guardrail scan** with triage classifications. It highlights possible design-system drift; it is **not** browser QA and does not prove runtime behavior. Use **actionable** and **review-needed** sections first; treat **false-positive-likely** as noise unless manual review says otherwise.',
  );
  lines.push('');
  lines.push('## Scan Summary');
  lines.push('');
  lines.push(`- Files scanned: **${report.scannedFileCount}**`);
  lines.push(`- Total findings: **${report.totalFindings}**`);
  lines.push(`- Actionable: **${report.actionableCount}**`);
  lines.push(`- Review needed: **${report.reviewNeededCount}**`);
  lines.push(`- False positive likely: **${report.falsePositiveLikelyCount}**`);
  lines.push(`- Out of scope: **${report.outOfScopeCount}**`);
  lines.push(`- Positive / shared usage records: **${report.positiveCount}**`);
  lines.push(`- Files importing shared AiXia (count): **${report.positiveSharedAixiaUsageCount}**`);
  lines.push('');
  lines.push('### Severity (all classifications)');
  lines.push(`- High: **${report.findingsBySeverity.high ?? 0}**`);
  lines.push(`- Medium: **${report.findingsBySeverity.medium ?? 0}**`);
  lines.push(`- Low: **${report.findingsBySeverity.low ?? 0}**`);
  lines.push('');
  lines.push('### Skipped / noise summary');
  for (const [key, value] of Object.entries(report.skippedNoise)) {
    lines.push(`- ${key}: **${value}**`);
  }
  lines.push('');
  lines.push('## Actionable Findings');
  lines.push('');
  if (report.actionableFindings.length === 0) {
    lines.push('_No actionable findings._');
  } else {
    lines.push(findingsTable(report.actionableFindings));
  }
  lines.push('');
  lines.push('## Review Needed Findings');
  lines.push('');
  if (report.reviewNeededFindings.length === 0) {
    lines.push('_No review-needed findings._');
  } else {
    lines.push(findingsTable(report.reviewNeededFindings));
  }
  lines.push('');
  lines.push('## Future Module Standardization Debt');
  lines.push('');
  lines.push('Findings classified **out-of-scope** for the finance-first batch.');
  lines.push('');
  const debt = report.futureModuleDebt;
  for (const [section, items] of Object.entries(debt)) {
    lines.push(`### ${section}`);
    if (items.length === 0) {
      lines.push('_None._');
    } else {
      for (const f of items.slice(0, 15)) {
        lines.push(`- **${f.severity}** \`${f.filePath}\` — ${f.ruleName}: ${f.classificationReason}`);
      }
      if (items.length > 15) lines.push(`- _…and ${items.length - 15} more._`);
    }
    lines.push('');
  }
  lines.push('## False Positive Likely / Skipped Noise');
  lines.push('');
  lines.push('Common benign or skipped patterns:');
  lines.push('- Redirect-only pages (`<Navigate />`, route stubs)');
  lines.push('- `src/lib` lifecycle functions (archive/delete in data layer)');
  lines.push('- Permission-key-only archive wording (`deleteArchivePermissions`, labels)');
  lines.push('- Hub pages with copy-only archive references');
  lines.push('- Shared `src/components/aixia` wrappers importing primitives');
  lines.push('- Shared styles and `src/components/ui` primitives');
  lines.push('- Print document components (separate print strategy)');
  lines.push('');
  if (report.falsePositiveFindings.length > 0) {
    lines.push(findingsTable(report.falsePositiveFindings, 40));
  }
  lines.push('');
  lines.push('## Positive Shared AiXia Usage');
  lines.push('');
  lines.push(
    `**${report.positiveSharedAixiaUsageCount}** scanned file(s) import \`@/components/aixia\`. **${report.positiveWrapperFiles.length}** shared-wrapper file(s) recorded as intentional primitive composition.`,
  );
  lines.push('');
  lines.push('## Findings by Rule');
  lines.push('');
  for (const [ruleId, count] of Object.entries(report.findingsByRule).sort((a, b) => b[1] - a[1])) {
    const rule = RULES[ruleId];
    lines.push(`- **${rule?.name ?? ruleId}** (\`${ruleId}\`): ${count}`);
  }
  lines.push('');
  lines.push('## Findings by Module Scope');
  lines.push('');
  for (const [scope, count] of Object.entries(report.findingsByModuleScope).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${scope}: ${count}`);
  }
  lines.push('');
  lines.push('## Safety Reminder');
  lines.push('');
  lines.push('- Static findings are **hints**, not proof.');
  lines.push('- **Do not mass-fix** from scanner output.');
  lines.push('- **Browser/manual verification** is required before app code changes.');
  lines.push('- **Inspect shared source-of-truth first** (components + CSS).');
  lines.push('- Preserve app logic, Supabase behavior, permissions, tenant boundaries, and AI boundaries.');
  lines.push('');
  lines.push(`_Generated at ${report.generatedAt}_`);
  lines.push('');
  return lines.join('\n');
}

function partitionFindings(allFindings) {
  const actionableFindings = allFindings.filter((f) => f.classification === 'actionable');
  const reviewNeededFindings = allFindings.filter((f) => f.classification === 'review-needed');
  const falsePositiveFindings = allFindings.filter((f) => f.classification === 'false-positive-likely');
  const outOfScopeFindings = allFindings.filter((f) => f.classification === 'out-of-scope');
  const positiveFindings = allFindings.filter((f) => f.classification === 'positive');

  const futureModuleDebt = {
    HR: outOfScopeFindings.filter((f) => f.moduleScope === 'hr-future'),
    AI: outOfScopeFindings.filter((f) => f.moduleScope === 'ai-future'),
    SaaS: outOfScopeFindings.filter((f) => f.moduleScope === 'saas-future'),
    'Core/Other': outOfScopeFindings.filter((f) =>
      ['core-future', 'unknown'].includes(f.moduleScope),
    ),
  };

  return {
    actionableFindings,
    reviewNeededFindings,
    falsePositiveFindings,
    outOfScopeFindings,
    positiveFindings,
    futureModuleDebt,
  };
}

function main() {
  readJsonRequired(REGISTRY_PATHS.reviewPanels);
  readJsonRequired(REGISTRY_PATHS.issueCategories);
  readJsonRequired(REGISTRY_PATHS.combinedAgents);

  const discovery = readJsonOptional(DISCOVERY_JSON);
  if (!discovery) {
    console.warn('Warning: qa-agent/reports/static-app-discovery.json not found; continuing with direct source scan.');
  }

  const routeModuleMap = buildRouteModuleMap(discovery);
  const scanMeta = {
    redirectOnlyFiles: [],
    skippedArchiveBenign: [],
    positiveWrapperFiles: [],
  };

  const allFiles = [];
  for (const scanRoot of SCAN_ROOTS) {
    const abs = path.join(ROOT, scanRoot);
    if (!fs.existsSync(abs)) continue;
    walkFiles(abs, scanRoot, allFiles);
  }

  const allFindings = [];
  let positiveSharedAixiaUsageCount = 0;

  for (const { rel } of allFiles) {
    let content;
    try {
      content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      continue;
    }

    const fileClassification = classifyFile(rel, routeModuleMap);
    const { findings, usesAixia } = analyzeFile(rel, content, fileClassification, scanMeta);
    allFindings.push(...findings);
    if (usesAixia) positiveSharedAixiaUsageCount += 1;
  }

  const p0GuardrailWarnings = [];
  const collectP0Warning = (filePath, message, scope) => {
    p0GuardrailWarnings.push({ filePath, message, scope });
  };
  runShellHeroGuardrails({ ROOT, addWarning: collectP0Warning });
  runShadcnBoundaryGuardrails({ ROOT, addWarning: collectP0Warning });

  for (const item of p0GuardrailWarnings) {
    const rel = item.filePath.replace(/\\/g, '/');
    const fileClassification = classifyFile(rel, routeModuleMap);
    let rule = RULES['orb-page-shell'];
    if (item.scope === 'AiXia hero surface') rule = RULES['non-command-hero'];
    if (item.scope === 'AiXia shadcn boundary') rule = RULES['shadcn-page-content'];
    if (item.scope === 'AiXia hero typography') rule = RULES['non-command-hero'];

    pushFinding(
      allFindings,
      rule,
      'medium',
      fileClassification,
      item.message,
      item.scope,
      {
        baseClassification:
          item.scope === 'AiXia shadcn boundary' ? 'actionable' : 'review-needed',
      },
    );
  }

  const partitions = partitionFindings(allFindings);

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: ROOT,
    scannedFileCount: allFiles.length,
    totalFindings: allFindings.length,
    findingCount: allFindings.length,
    actionableCount: partitions.actionableFindings.length,
    reviewNeededCount: partitions.reviewNeededFindings.length,
    falsePositiveLikelyCount: partitions.falsePositiveFindings.length,
    outOfScopeCount: partitions.outOfScopeFindings.length,
    positiveCount: partitions.positiveFindings.length,
    findingsByClassification: countByKey(allFindings, 'classification'),
    findingsByModuleScope: countByKey(allFindings, 'moduleScope'),
    findingsBySeverity: countByKey(allFindings, 'severity'),
    findingsByRule: countByKey(allFindings, 'ruleId'),
    findingsByModule: countByKey(allFindings, 'module'),
    positiveSharedAixiaUsageCount,
    positiveWrapperFiles: scanMeta.positiveWrapperFiles,
    findings: allFindings,
    ...partitions,
    skippedNoise: {
      redirectOnlyPages: scanMeta.redirectOnlyFiles.length,
      archiveBenignSkipped: scanMeta.skippedArchiveBenign.length,
      nonPageInfrastructureExcluded:
        allFiles.length -
        allFindings.length -
        scanMeta.redirectOnlyFiles.length -
        positiveSharedAixiaUsageCount,
    },
    summary: {
      discoveryJsonLoaded: Boolean(discovery),
      actionableHighSeverity: partitions.actionableFindings.filter((f) => f.severity === 'high').length,
    },
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_REPORT, buildMarkdown(report), 'utf8');

  console.log('AiXia Static Design-System Guardrails');
  console.log('-------------------------------------');
  console.log(`Files scanned: ${report.scannedFileCount}`);
  console.log(`Findings: ${report.totalFindings}`);
  console.log(`Actionable: ${report.actionableCount}`);
  console.log(`Review needed: ${report.reviewNeededCount}`);
  console.log(`False positive likely: ${report.falsePositiveLikelyCount}`);
  console.log(`Out of scope: ${report.outOfScopeCount}`);
  console.log(`Positive/shared usage: ${report.positiveCount + report.positiveSharedAixiaUsageCount}`);
  console.log(`Report written: ${posix(path.relative(ROOT, MD_REPORT))}`);
  console.log(`JSON written: ${posix(path.relative(ROOT, JSON_REPORT))}`);
  console.log('Result: PASS');
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
