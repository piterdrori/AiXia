#!/usr/bin/env node
/**
 * Generates a sample QA foundation report from qa-agent registries and templates.
 * Read-only on registries/templates except writing qa-agent/reports/sample-foundation-report.md
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const QA_ROOT = path.join(ROOT, 'qa-agent');
const REPORTS_DIR = path.join(QA_ROOT, 'reports');
const OUTPUT_FILE = path.join(REPORTS_DIR, 'sample-foundation-report.md');

const REGISTRY_FILES = [
  'qa-agent/registry/issue-categories.json',
  'qa-agent/registry/severity-levels.json',
  'qa-agent/registry/combined-agents.json',
  'qa-agent/registry/review-panels.json',
  'qa-agent/registry/synthetic-roles.json',
  'qa-agent/registry/route-groups.json',
  'qa-agent/registry/ai-access-levels.json',
  'qa-agent/registry/readiness-scores.json',
];

const TEMPLATE_FILES = [
  'qa-agent/templates/issue-report-template.md',
  'qa-agent/templates/improvement-proposal-template.md',
  'qa-agent/templates/council-decision-template.md',
  'qa-agent/templates/qa-run-summary-template.md',
];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing registry file: ${relativePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath}: invalid JSON — ${error.message}`);
  }
}

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing template file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function agentNameById(agents, id) {
  const agent = agents.find((item) => item.id === id);
  return agent?.name ?? id;
}

function panelAgentsLine(agents, panel) {
  const names = [...panel.requiredAgents, ...panel.optionalAgents]
    .map((id) => agentNameById(agents, id))
    .filter((name, index, list) => list.indexOf(name) === index);
  return names.join(', ');
}

function buildReport(registries, templateNames, registryNames) {
  const {
    issueCategories,
    severityLevels,
    combinedAgents,
    reviewPanels,
    syntheticRoles,
    routeGroups,
    aiAccessLevels,
    readinessScores,
  } = registries;

  const designPanel = reviewPanels.panels.find((p) => p.id === 'design-panel');
  const functionalPanel = reviewPanels.panels.find((p) => p.id === 'functional-engineering-panel');
  const businessPanel = reviewPanels.panels.find((p) => p.id === 'business-logic-panel');
  const technicalPanel = reviewPanels.panels.find((p) => p.id === 'technical-panel');
  const saasPanel = reviewPanels.panels.find((p) => p.id === 'saas-conversion-panel');

  const saasModel = readinessScores.scoreModels.find((m) => m.id === 'saas-readiness');
  const mcpModel = readinessScores.scoreModels.find((m) => m.id === 'mcp-readiness');
  const personalModel = readinessScores.scoreModels.find((m) => m.id === 'personal-ai-maturity');

  const prepareDraft = aiAccessLevels.levels.find((l) => l.id === 'prepare-draft');
  const executeConfirm = aiAccessLevels.levels.find((l) => l.id === 'execute-after-confirmation');

  const lines = [];

  lines.push('# AiXia QA Agent Sample Foundation Report');
  lines.push('');
  lines.push('## Purpose');
  lines.push(
    'This is a **sample report** generated from `qa-agent` registries and templates only. It demonstrates how future Synthetic User QA findings, council routing, and readiness notes will be structured. **It does not represent a real browser test** and contains no live screenshots, traces, or Supabase evidence.',
  );
  lines.push('');
  lines.push('## Foundation Status');
  lines.push('');
  lines.push('| Item | Status |');
  lines.push('| --- | --- |');
  lines.push(`| Registry files loaded | ${registryNames.length} |`);
  lines.push(`| Templates loaded | ${templateNames.length} |`);
  lines.push(`| Issue categories | ${issueCategories.categories.length} |`);
  lines.push(`| Severity levels | ${severityLevels.levels.length} |`);
  lines.push(`| Combined agents | ${combinedAgents.agents.length} |`);
  lines.push(`| Review panels | ${reviewPanels.panels.length} |`);
  lines.push(`| Synthetic roles | ${syntheticRoles.roles.length} |`);
  lines.push(`| Route groups | ${routeGroups.routeGroups.length} |`);
  lines.push(`| AI access levels | ${aiAccessLevels.levels.length} |`);
  lines.push(`| Readiness score models | ${readinessScores.scoreModels.length} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Finding 1 — Design Issue');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Issue ID | AIXIA-QA-SAMPLE-0001 |');
  lines.push('| Category | Design |');
  lines.push('| Severity | Medium |');
  lines.push('| Page | `/finance/transactions/customer-pos` |');
  lines.push('| Role | Finance Admin |');
  lines.push(
    '| Problem | Table header does not move with horizontal scrollbar, causing columns to disconnect visually. |',
  );
  lines.push('| Likely root cause | Shared table scroll container or shared table CSS. |');
  lines.push('| Review panel | Design Panel |');
  if (designPanel) {
    lines.push(
      `| Agents involved (from registry) | ${panelAgentsLine(combinedAgents.agents, designPanel)} |`,
    );
  } else {
    lines.push(
      '| Agents involved | Design & UX Excellence Agent, Design System & Frontend Quality Agent, Synthetic User QA Agent, Final Council Chair / Implementation Planner |',
    );
  }
  lines.push(
    '| Fix prompt | Must instruct Cursor to inspect shared AiXia table source of truth first and not patch only one page. |',
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Finding 2 — Functional Issue');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Issue ID | AIXIA-QA-SAMPLE-0002 |');
  lines.push('| Category | Functional |');
  lines.push('| Severity | High |');
  lines.push('| Page | `/finance/transactions/payments-made` |');
  lines.push('| Role | Finance Admin |');
  lines.push('| Problem | Archive modal opens, but Deleted tab does not load records. |');
  lines.push('| Likely root cause | Archive manager data loader, query, or shared archive modal state. |');
  lines.push('| Review panel | Functional Engineering Panel |');
  if (functionalPanel) {
    lines.push(
      `| Agents involved (from registry) | ${panelAgentsLine(combinedAgents.agents, functionalPanel)} |`,
    );
  } else {
    lines.push(
      '| Agents involved | Synthetic User QA Agent, Design System & Frontend Quality Agent, Backend Database & Reliability Agent, Security Permissions & Tenant Isolation Agent, Final Council Chair / Implementation Planner |',
    );
  }
  lines.push('| Fix prompt | Must preserve archive standard and not create local modal logic. |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Finding 3 — Logical Issue');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Issue ID | AIXIA-QA-SAMPLE-0003 |');
  lines.push('| Category | Logical |');
  lines.push('| Severity | Critical |');
  lines.push('| Page | `/finance/transactions/expenses` |');
  lines.push('| Role | Employee |');
  lines.push('| Problem | Employee can see internal funding status. |');
  lines.push('| Likely root cause | Employee-facing projection/visibility issue or permission rule issue. |');
  lines.push('| Review panel | Business Logic Panel |');
  if (businessPanel) {
    lines.push(
      `| Agents involved (from registry) | ${panelAgentsLine(combinedAgents.agents, businessPanel)} |`,
    );
  } else {
    lines.push(
      '| Agents involved | Business Logic & Operations Agent, Security Permissions & Tenant Isolation Agent, Backend Database & Reliability Agent, Synthetic User QA Agent, Final Council Chair / Implementation Planner |',
    );
  }
  lines.push(
    '| Fix prompt | Must preserve backend data unless required and update employee-facing visibility/projection only. |',
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Finding 4 — Technical Issue');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Issue ID | AIXIA-QA-SAMPLE-0004 |');
  lines.push('| Category | Technical |');
  lines.push('| Severity | Critical |');
  lines.push('| Page | `/finance/master-data/vendors` |');
  lines.push('| Role | Finance Admin |');
  lines.push('| Problem | Supabase query failed because an expected column may not exist. |');
  lines.push('| Likely root cause | Schema mismatch or guessed column usage. |');
  lines.push('| Review panel | Technical Panel |');
  if (technicalPanel) {
    lines.push(
      `| Agents involved (from registry) | ${panelAgentsLine(combinedAgents.agents, technicalPanel)} |`,
    );
  } else {
    lines.push(
      '| Agents involved | Backend Database & Reliability Agent, Design System & Frontend Quality Agent, Security Permissions & Tenant Isolation Agent, Synthetic User QA Agent, Final Council Chair / Implementation Planner |',
    );
  }
  lines.push('| Fix prompt | Must not guess columns. Must inspect schema first. |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Finding 5 — Improvement Suggestion');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Proposal ID | AIXIA-IDEA-SAMPLE-0001 |');
  lines.push('| Category | Improvement / SaaS / AI-MCP |');
  lines.push('| Severity | Suggestion |');
  lines.push('| Page | `/finance/transactions/customer-pos` |');
  lines.push('| Role | Finance Admin |');
  lines.push(
    '| Opportunity | Add a quick summary strip above the table showing Active POs, Drafts, Pending Approval, Total Value, and Last Updated. |',
  );
  lines.push('| Review panel | SaaS Conversion Panel + Design Panel |');
  lines.push(
    '| Agents involved | Product & SaaS Strategy Agent, Design & UX Excellence Agent, Design System & Frontend Quality Agent, Business Logic & Operations Agent, Final Council Chair / Implementation Planner |',
  );
  lines.push(
    '| Fix prompt | Must use existing shared AiXia metric/meta components and not create local cards. |',
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample SaaS Readiness Note');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Example module | Finance Transactions |');
  lines.push('| Current score | 2–3 (tenant-separated data, weak onboarding/configuration) |');
  lines.push('| Target score | 4–5 (SaaS-ready with onboarding, plan controls, analytics, support) |');
  if (saasModel) {
    lines.push(`| Registry model | ${saasModel.name} (${saasModel.id}) |`);
  }
  lines.push('| Main gaps | Tenant onboarding, plan entitlements, tenant configuration, analytics, customer success/support |');
  lines.push('| Reminder | SaaS conversion must preserve tenant isolation. |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample AI/MCP Readiness Note');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Example workflow | Create customer PO |');
  lines.push('| Current score | 1–2 (explain page / search-read only) |');
  lines.push('| Target score | 4 (execute safe actions with confirmation and audit) |');
  if (mcpModel) {
    lines.push(`| Registry model | ${mcpModel.name} (${mcpModel.id}) |`);
  }
  const accessNote = [
    prepareDraft ? `${prepareDraft.numericLevel} — ${prepareDraft.name}` : 'prepare-draft',
    executeConfirm ? `${executeConfirm.numericLevel} — ${executeConfirm.name}` : 'execute-after-confirmation',
  ].join('; then ');
  lines.push(`| Required AI access classification | ${accessNote} if user has permission |`);
  lines.push(
    '| Missing | MCP tool definition, permission mapping, confirmation, audit logs, voice/avatar safety |',
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sample Personal AI Note');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Example user | Finance Admin |');
  lines.push('| Current maturity score | 1–2 (explain / guide-navigate) |');
  lines.push('| Target maturity score | 4–5 (drafts/assets through governed workflow execution) |');
  if (personalModel) {
    lines.push(`| Registry model | ${personalModel.name} (${personalModel.id}) |`);
  }
  lines.push(
    '| Personal AI may learn | Frequent pages, repeated workflow preferences, and report preferences within permission boundaries |',
  );
  lines.push(
    '| Personal AI must not | Access Owner AI or other users’ private memory; exceed manual user permissions |',
  );
  lines.push('| User controls required | View memory, delete memory, disable memory, export memory, reset assistant |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Template References');
  lines.push('');
  for (const name of templateNames) {
    lines.push(`- \`${name}\``);
  }
  lines.push('');
  lines.push('## Registry References');
  lines.push('');
  for (const name of registryNames) {
    lines.push(`- \`${name}\``);
  }
  lines.push('');
  lines.push('## Final Reminder');
  lines.push('');
  lines.push('- This report is a **sample only**.');
  lines.push('- Real evidence will come later from browser testing (not yet implemented).');
  lines.push(
    '- All future fixes must preserve AiXia source-of-truth, permissions, tenant boundaries, and AI access boundaries.',
  );
  lines.push('');
  lines.push(`_Generated at ${new Date().toISOString()} from qa-agent registries._`);
  lines.push('');

  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(QA_ROOT)) {
    console.error('Error: qa-agent directory not found from current working directory.');
    process.exitCode = 1;
    return;
  }

  let registries;
  let templateNames;
  let registryNames;

  try {
    registryNames = REGISTRY_FILES.map((f) => f.replace(/^qa-agent\//, ''));
    templateNames = TEMPLATE_FILES.map((f) => f.replace(/^qa-agent\//, ''));

    registries = {
      issueCategories: readJson(REGISTRY_FILES[0]),
      severityLevels: readJson(REGISTRY_FILES[1]),
      combinedAgents: readJson(REGISTRY_FILES[2]),
      reviewPanels: readJson(REGISTRY_FILES[3]),
      syntheticRoles: readJson(REGISTRY_FILES[4]),
      routeGroups: readJson(REGISTRY_FILES[5]),
      aiAccessLevels: readJson(REGISTRY_FILES[6]),
      readinessScores: readJson(REGISTRY_FILES[7]),
    };

    for (const relativePath of TEMPLATE_FILES) {
      readText(relativePath);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const reportBody = buildReport(registries, templateNames, registryNames);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, reportBody, 'utf8');

  const relativeOutput = path.relative(ROOT, OUTPUT_FILE).split(path.sep).join('/');

  console.log('AiXia Sample QA Report Generator');
  console.log('--------------------------------');
  console.log(`Registry files loaded: ${REGISTRY_FILES.length}`);
  console.log(`Templates loaded: ${TEMPLATE_FILES.length}`);
  console.log(`Report written: ${relativeOutput}`);
  console.log('Result: PASS');
}

try {
  main();
} catch (error) {
  console.error('Unexpected failure:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
