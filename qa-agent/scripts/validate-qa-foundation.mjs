#!/usr/bin/env node
/**
 * Validates AiXia QA Agent foundation files under qa-agent/.
 * Read-only: no network, no browser, no Supabase, no file writes.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const QA_ROOT = path.join(ROOT, 'qa-agent');

const errors = [];

function fail(message) {
  errors.push(message);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: invalid JSON — ${error.message}`);
    return null;
  }
}

function requireFiles(relativePaths, label) {
  let ok = true;
  for (const relativePath of relativePaths) {
    if (!fileExists(relativePath)) {
      fail(`${label}: missing file ${relativePath}`);
      ok = false;
    }
  }
  return ok;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isObjectArray(value) {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function requireFields(object, fields, context) {
  for (const field of fields) {
    if (!(field in object)) {
      fail(`${context}: missing required field "${field}"`);
    }
  }
}

function collectIds(items, idKey = 'id') {
  return new Set((items ?? []).map((item) => item?.[idKey]).filter(Boolean));
}

function validateTopLevelJson(relativePath, data) {
  if (!data) return;
  if (!isNonEmptyString(data.version)) {
    fail(`${relativePath}: missing or empty top-level "version"`);
  }
  if (!isNonEmptyString(data.description)) {
    fail(`${relativePath}: missing or empty top-level "description"`);
  }
}

function validateIssueCategories(data) {
  const relativePath = 'qa-agent/registry/issue-categories.json';
  const requiredIds = ['design', 'functional', 'logical', 'technical', 'improvement'];
  const fields = [
    'id',
    'name',
    'definition',
    'examples',
    'requiredEvidence',
    'likelyRootCauses',
    'defaultReviewPanels',
    'fixPromptRules',
  ];

  if (!isObjectArray(data?.categories)) {
    fail(`${relativePath}: "categories" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.categories);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing category id "${requiredId}"`);
    }
  }

  for (const category of data.categories) {
    const context = `${relativePath} category "${category?.id ?? 'unknown'}"`;
    requireFields(category, fields, context);
    if (!isStringArray(category.examples) || category.examples.length === 0) {
      fail(`${context}: "examples" must be a non-empty string array`);
    }
    if (!isStringArray(category.requiredEvidence) || category.requiredEvidence.length === 0) {
      fail(`${context}: "requiredEvidence" must be a non-empty string array`);
    }
    if (!isStringArray(category.likelyRootCauses) || category.likelyRootCauses.length === 0) {
      fail(`${context}: "likelyRootCauses" must be a non-empty string array`);
    }
    if (!isStringArray(category.defaultReviewPanels) || category.defaultReviewPanels.length === 0) {
      fail(`${context}: "defaultReviewPanels" must be a non-empty string array`);
    }
    if (!isStringArray(category.fixPromptRules) || category.fixPromptRules.length === 0) {
      fail(`${context}: "fixPromptRules" must be a non-empty string array`);
    }
  }

  return ids;
}

function validateSeverityLevels(data) {
  const relativePath = 'qa-agent/registry/severity-levels.json';
  const requiredIds = ['critical', 'high', 'medium', 'low', 'suggestion'];
  const fields = [
    'id',
    'name',
    'definition',
    'useWhen',
    'defaultPriorityOrder',
    'requiresCouncilReview',
    'requiresImmediateOwnerAttention',
    'canBlockRelease',
  ];

  if (!isObjectArray(data?.levels)) {
    fail(`${relativePath}: "levels" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.levels);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing severity id "${requiredId}"`);
    }
  }

  for (const level of data.levels) {
    const context = `${relativePath} severity "${level?.id ?? 'unknown'}"`;
    requireFields(level, fields, context);
    if (!isStringArray(level.useWhen) || level.useWhen.length === 0) {
      fail(`${context}: "useWhen" must be a non-empty string array`);
    }
    if (typeof level.defaultPriorityOrder !== 'number') {
      fail(`${context}: "defaultPriorityOrder" must be a number`);
    }
    for (const boolField of ['requiresCouncilReview', 'requiresImmediateOwnerAttention', 'canBlockRelease']) {
      if (typeof level[boolField] !== 'boolean') {
        fail(`${context}: "${boolField}" must be a boolean`);
      }
    }
  }

  return ids;
}

function validateCombinedAgents(data) {
  const relativePath = 'qa-agent/registry/combined-agents.json';
  const requiredIds = [
    'product-saas-strategy',
    'design-ux-excellence',
    'design-system-frontend-quality',
    'business-logic-operations',
    'hr-people-operations',
    'security-permissions-tenant-isolation',
    'backend-database-reliability',
    'ai-mcp-architecture',
    'personal-ai-productivity',
    'tools-integrations-commercial-open-source',
    'synthetic-user-qa',
    'final-council-chair-implementation-planner',
  ];
  const fields = [
    'id',
    'name',
    'combines',
    'role',
    'alwaysAsk',
    'inspects',
    'canApprove',
    'canBlock',
    'outputResponsibilities',
  ];

  if (!isObjectArray(data?.agents)) {
    fail(`${relativePath}: "agents" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.agents);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing agent id "${requiredId}"`);
    }
  }

  for (const agent of data.agents) {
    const context = `${relativePath} agent "${agent?.id ?? 'unknown'}"`;
    requireFields(agent, fields, context);
    for (const arrayField of ['combines', 'inspects', 'canApprove', 'canBlock', 'outputResponsibilities']) {
      if (!isStringArray(agent[arrayField]) || agent[arrayField].length === 0) {
        fail(`${context}: "${arrayField}" must be a non-empty string array`);
      }
    }
    if (!isNonEmptyString(agent.alwaysAsk)) {
      fail(`${context}: "alwaysAsk" must be a non-empty string`);
    }
    if (!isNonEmptyString(agent.role)) {
      fail(`${context}: "role" must be a non-empty string`);
    }
  }

  return ids;
}

function validateReviewPanels(data, agentIds) {
  const relativePath = 'qa-agent/registry/review-panels.json';
  const requiredIds = [
    'design-panel',
    'functional-engineering-panel',
    'business-logic-panel',
    'hr-panel',
    'technical-panel',
    'ai-mcp-panel',
    'personal-ai-panel',
    'saas-conversion-panel',
  ];
  const fields = [
    'id',
    'name',
    'usedFor',
    'requiredAgents',
    'optionalAgents',
    'approvalRules',
    'blockingRules',
  ];

  if (!isObjectArray(data?.panels)) {
    fail(`${relativePath}: "panels" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.panels);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing panel id "${requiredId}"`);
    }
  }

  for (const panel of data.panels) {
    const context = `${relativePath} panel "${panel?.id ?? 'unknown'}"`;
    requireFields(panel, fields, context);
    if (!isStringArray(panel.usedFor) || panel.usedFor.length === 0) {
      fail(`${context}: "usedFor" must be a non-empty string array`);
    }
    if (!Array.isArray(panel.requiredAgents)) {
      fail(`${context}: "requiredAgents" must be an array`);
    }
    if (!Array.isArray(panel.optionalAgents)) {
      fail(`${context}: "optionalAgents" must be an array`);
    }
    if (!isStringArray(panel.approvalRules) || panel.approvalRules.length === 0) {
      fail(`${context}: "approvalRules" must be a non-empty string array`);
    }
    if (!isStringArray(panel.blockingRules) || panel.blockingRules.length === 0) {
      fail(`${context}: "blockingRules" must be a non-empty string array`);
    }

    for (const agentId of [...panel.requiredAgents, ...panel.optionalAgents]) {
      if (typeof agentId !== 'string') {
        fail(`${context}: agent reference must be a string`);
        continue;
      }
      if (!agentIds.has(agentId)) {
        fail(`${context}: unknown agent id "${agentId}" (not found in combined-agents.json)`);
      }
    }
  }

  return ids;
}

function validateSyntheticRoles(data) {
  const relativePath = 'qa-agent/registry/synthetic-roles.json';
  const requiredIds = [
    'owner-platform-owner',
    'company-admin',
    'finance-admin',
    'finance-viewer',
    'hr-admin',
    'hr-viewer-assistant',
    'manager',
    'employee',
    'guest-restricted-user',
    'saas-tenant-admin-future',
  ];
  const fields = [
    'id',
    'name',
    'purpose',
    'expectedAiTypes',
    'mainModulesToTest',
    'allowedActionLevels',
    'blockedActionExamples',
    'dataVisibilityBoundary',
    'personalAiBoundary',
    'saasTenantBoundary',
    'productionTestingPolicy',
  ];

  if (!isObjectArray(data?.roles)) {
    fail(`${relativePath}: "roles" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.roles);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing role id "${requiredId}"`);
    }
  }

  for (const role of data.roles) {
    const context = `${relativePath} role "${role?.id ?? 'unknown'}"`;
    requireFields(role, fields, context);
    for (const arrayField of ['expectedAiTypes', 'mainModulesToTest', 'allowedActionLevels', 'blockedActionExamples']) {
      if (!isStringArray(role[arrayField]) || role[arrayField].length === 0) {
        fail(`${context}: "${arrayField}" must be a non-empty string array`);
      }
    }
    for (const textField of ['purpose', 'dataVisibilityBoundary', 'personalAiBoundary', 'saasTenantBoundary', 'productionTestingPolicy']) {
      if (!isNonEmptyString(role[textField])) {
        fail(`${context}: "${textField}" must be a non-empty string`);
      }
    }
  }

  return ids;
}

function validateRouteGroups(data, roleIds, categoryIds, panelIds, accessLevelIds) {
  const relativePath = 'qa-agent/registry/route-groups.json';
  const requiredIds = [
    'core-app-shell',
    'finance-hub',
    'finance-master-data',
    'finance-transactions',
    'hr-people-operations',
    'ai-assistant',
    'saas-tenant-management',
  ];
  const fields = [
    'id',
    'name',
    'status',
    'routePatterns',
    'module',
    'pageTypes',
    'primaryRolesToTest',
    'mainIssueCategoriesToTest',
    'requiredReviewPanels',
    'defaultAiAccessClassification',
    'saasReadinessRelevance',
    'notes',
  ];

  if (!isObjectArray(data?.routeGroups)) {
    fail(`${relativePath}: "routeGroups" must be a non-empty array of objects`);
    return;
  }

  const ids = collectIds(data.routeGroups);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing route group id "${requiredId}"`);
    }
  }

  for (const group of data.routeGroups) {
    const context = `${relativePath} route group "${group?.id ?? 'unknown'}"`;
    requireFields(group, fields, context);
    if (!isStringArray(group.routePatterns) || group.routePatterns.length === 0) {
      fail(`${context}: "routePatterns" must be a non-empty string array`);
    }
    if (!isStringArray(group.pageTypes) || group.pageTypes.length === 0) {
      fail(`${context}: "pageTypes" must be a non-empty string array`);
    }
    if (!isNonEmptyString(group.module)) {
      fail(`${context}: "module" must be a non-empty string`);
    }
    if (!isNonEmptyString(group.status)) {
      fail(`${context}: "status" must be a non-empty string`);
    }
    if (!isNonEmptyString(group.notes)) {
      fail(`${context}: "notes" must be a non-empty string`);
    }

    for (const roleId of group.primaryRolesToTest ?? []) {
      if (!roleIds.has(roleId)) {
        fail(`${context}: unknown role id "${roleId}" (not found in synthetic-roles.json)`);
      }
    }
    for (const categoryId of group.mainIssueCategoriesToTest ?? []) {
      if (!categoryIds.has(categoryId)) {
        fail(`${context}: unknown issue category id "${categoryId}" (not found in issue-categories.json)`);
      }
    }
    for (const panelId of group.requiredReviewPanels ?? []) {
      if (!panelIds.has(panelId)) {
        fail(`${context}: unknown review panel id "${panelId}" (not found in review-panels.json)`);
      }
    }
    if (!accessLevelIds.has(group.defaultAiAccessClassification)) {
      fail(
        `${context}: unknown AI access level id "${group.defaultAiAccessClassification}" (not found in ai-access-levels.json)`,
      );
    }
  }
}

function validateAiAccessLevels(data) {
  const relativePath = 'qa-agent/registry/ai-access-levels.json';
  const requiredIds = [
    'no-ai-access',
    'explain-only',
    'navigate-only',
    'read-search-allowed-records',
    'prepare-draft',
    'execute-after-confirmation',
    'execute-automatically-limited-safe-rules',
    'owner-ai-only',
    'never-expose-to-ai',
  ];
  const fields = [
    'id',
    'numericLevel',
    'name',
    'definition',
    'allowedAiTypes',
    'requiresConfirmation',
    'requiresAudit',
    'riskLevel',
    'exampleFunctions',
    'restrictions',
  ];

  if (!isObjectArray(data?.levels)) {
    fail(`${relativePath}: "levels" must be a non-empty array of objects`);
    return new Set();
  }

  const ids = collectIds(data.levels);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing access level id "${requiredId}"`);
    }
  }

  for (const level of data.levels) {
    const context = `${relativePath} level "${level?.id ?? 'unknown'}"`;
    requireFields(level, fields, context);
    if (typeof level.numericLevel !== 'number') {
      fail(`${context}: "numericLevel" must be a number`);
    }
    if (!Array.isArray(level.allowedAiTypes)) {
      fail(`${context}: "allowedAiTypes" must be an array`);
    }
    if (typeof level.requiresConfirmation !== 'boolean') {
      fail(`${context}: "requiresConfirmation" must be a boolean`);
    }
    if (typeof level.requiresAudit !== 'boolean') {
      fail(`${context}: "requiresAudit" must be a boolean`);
    }
    if (!['low', 'medium', 'high', 'critical'].includes(level.riskLevel)) {
      fail(`${context}: "riskLevel" must be one of low, medium, high, critical`);
    }
    if (!isStringArray(level.exampleFunctions) || level.exampleFunctions.length === 0) {
      fail(`${context}: "exampleFunctions" must be a non-empty string array`);
    }
    if (!isStringArray(level.restrictions) || level.restrictions.length === 0) {
      fail(`${context}: "restrictions" must be a non-empty string array`);
    }
  }

  return ids;
}

function validateReadinessScores(data) {
  const relativePath = 'qa-agent/registry/readiness-scores.json';
  const requiredIds = ['saas-readiness', 'mcp-readiness', 'personal-ai-maturity'];
  const modelFields = ['id', 'name', 'description', 'scores'];
  const scoreFields = ['value', 'label', 'definition', 'requiredCapabilities', 'blockers'];

  if (!isObjectArray(data?.scoreModels)) {
    fail(`${relativePath}: "scoreModels" must be a non-empty array of objects`);
    return;
  }

  const ids = collectIds(data.scoreModels);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      fail(`${relativePath}: missing score model id "${requiredId}"`);
    }
  }

  for (const model of data.scoreModels) {
    const context = `${relativePath} model "${model?.id ?? 'unknown'}"`;
    requireFields(model, modelFields, context);
    if (!isObjectArray(model.scores) || model.scores.length === 0) {
      fail(`${context}: "scores" must be a non-empty array of objects`);
      continue;
    }
    for (const score of model.scores) {
      const scoreContext = `${context} score value "${score?.value ?? 'unknown'}"`;
      requireFields(score, scoreFields, scoreContext);
      if (typeof score.value !== 'number') {
        fail(`${scoreContext}: "value" must be a number`);
      }
      if (!isStringArray(score.requiredCapabilities) || score.requiredCapabilities.length === 0) {
        fail(`${scoreContext}: "requiredCapabilities" must be a non-empty string array`);
      }
      if (!Array.isArray(score.blockers)) {
        fail(`${scoreContext}: "blockers" must be an array`);
      }
    }
  }
}

function validateImportantContent() {
  const checks = [
    {
      file: 'qa-agent/qa-agent-council.md',
      needles: ['12 combined agents'],
    },
    {
      file: 'qa-agent/ai-access-boundary.md',
      needles: [
        'If the user cannot do it manually, the user\u2019s AI cannot do it',
        'If the user cannot do it manually, the user\'s AI cannot do it',
      ],
      matchAny: true,
    },
    {
      file: 'qa-agent/personal-ai-memory-and-tools.md',
      needles: ['View memory'],
    },
    {
      file: 'qa-agent/saas-readiness-council.md',
      needles: ['tenant isolation'],
    },
    {
      file: 'qa-agent/templates/cursor-fix-prompt-template.md',
      needles: ['Do not guess database columns'],
    },
  ];

  for (const check of checks) {
    if (!fileExists(check.file)) {
      fail(`Important content: missing file ${check.file}`);
      continue;
    }
    const content = readText(check.file);
    const matched = check.matchAny
      ? check.needles.some((needle) => content.includes(needle))
      : check.needles.every((needle) => content.includes(needle));
    if (!matched) {
      fail(`Important content: ${check.file} missing expected phrase(s): ${check.needles.join(' | ')}`);
    }
  }
}

function main() {
  if (!fs.existsSync(QA_ROOT)) {
    fail('qa-agent directory not found from current working directory');
    printReport({
      markdownOk: false,
      templatesOk: false,
      jsonParseOk: false,
      schemaOk: false,
      crossRefOk: false,
      contentOk: false,
    });
    process.exitCode = 1;
    return;
  }

  const markdownFiles = [
    'qa-agent/qa-issue-taxonomy.md',
    'qa-agent/qa-agent-council.md',
    'qa-agent/ai-access-boundary.md',
    'qa-agent/personal-ai-memory-and-tools.md',
    'qa-agent/saas-readiness-council.md',
    'qa-agent/qa-config-overview.md',
    'qa-agent/qa-user-roles.md',
    'qa-agent/qa-route-registry.md',
    'qa-agent/qa-review-panel-map.md',
    'qa-agent/ai-function-access-map.md',
  ];

  const templateFiles = [
    'qa-agent/templates/issue-report-template.md',
    'qa-agent/templates/improvement-proposal-template.md',
    'qa-agent/templates/council-decision-template.md',
    'qa-agent/templates/cursor-fix-prompt-template.md',
    'qa-agent/templates/qa-run-summary-template.md',
    'qa-agent/templates/saas-readiness-report-template.md',
    'qa-agent/templates/ai-mcp-readiness-report-template.md',
    'qa-agent/templates/personal-ai-review-template.md',
  ];

  const registryFiles = [
    'qa-agent/registry/issue-categories.json',
    'qa-agent/registry/severity-levels.json',
    'qa-agent/registry/combined-agents.json',
    'qa-agent/registry/review-panels.json',
    'qa-agent/registry/synthetic-roles.json',
    'qa-agent/registry/route-groups.json',
    'qa-agent/registry/ai-access-levels.json',
    'qa-agent/registry/readiness-scores.json',
  ];

  const markdownOk = requireFiles(markdownFiles, 'Markdown foundation');
  const templatesOk = requireFiles(templateFiles, 'Template');

  let jsonParseOk = true;
  const parsed = {};
  for (const relativePath of registryFiles) {
    if (!fileExists(relativePath)) {
      fail(`Registry JSON: missing file ${relativePath}`);
      jsonParseOk = false;
      continue;
    }
    const data = readJson(relativePath);
    if (data === null) {
      jsonParseOk = false;
      continue;
    }
    parsed[relativePath] = data;
    validateTopLevelJson(relativePath, data);
  }

  const schemaStartCount = errors.length;

  const categoryIds = validateIssueCategories(parsed['qa-agent/registry/issue-categories.json']);
  validateSeverityLevels(parsed['qa-agent/registry/severity-levels.json']);
  const agentIds = validateCombinedAgents(parsed['qa-agent/registry/combined-agents.json']);
  const panelIds = validateReviewPanels(parsed['qa-agent/registry/review-panels.json'], agentIds);
  const roleIds = validateSyntheticRoles(parsed['qa-agent/registry/synthetic-roles.json']);
  const accessLevelIds = validateAiAccessLevels(parsed['qa-agent/registry/ai-access-levels.json']);
  validateReadinessScores(parsed['qa-agent/registry/readiness-scores.json']);

  const crossRefStartCount = errors.length;
  validateRouteGroups(
    parsed['qa-agent/registry/route-groups.json'],
    roleIds,
    categoryIds,
    panelIds,
    accessLevelIds,
  );

  const schemaOk = errors.length === schemaStartCount && jsonParseOk;
  const crossRefOk = errors.length === crossRefStartCount && schemaOk;

  const contentStartCount = errors.length;
  validateImportantContent();
  const contentOk = errors.length === contentStartCount;

  printReport({
    markdownOk,
    templatesOk,
    jsonParseOk,
    schemaOk,
    crossRefOk,
    contentOk,
  });

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

function printReport(sectionOk) {
  console.log('AiXia QA Foundation Validation');
  console.log('--------------------------------');
  console.log(`Markdown files: ${sectionOk.markdownOk ? 'OK' : 'FAIL'}`);
  console.log(`Template files: ${sectionOk.templatesOk ? 'OK' : 'FAIL'}`);
  console.log(`Registry JSON parse: ${sectionOk.jsonParseOk ? 'OK' : 'FAIL'}`);
  console.log(`Registry schema: ${sectionOk.schemaOk ? 'OK' : 'FAIL'}`);
  console.log(`Cross-reference checks: ${sectionOk.crossRefOk ? 'OK' : 'FAIL'}`);
  console.log(`Important content checks: ${sectionOk.contentOk ? 'OK' : 'FAIL'}`);
  console.log('');

  if (errors.length > 0) {
    console.log('Errors:');
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    console.log('');
    console.log('Result: FAIL');
    return;
  }

  console.log('Result: PASS');
}

try {
  main();
} catch (error) {
  console.error('Unexpected validation failure:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
