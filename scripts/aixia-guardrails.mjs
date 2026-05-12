import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const FINANCE_APP_DIR = path.join(ROOT, "src", "app", "finance");
const AIXIA_COMPONENT_DIR = path.join(ROOT, "src", "components", "aixia");
const AIXIA_STYLE_FILE = path.join(ROOT, "src", "styles", "aixia-design-system.css");
const AIXIA_STANDARD_FILE = path.join(ROOT, "src", "components", "aixia", "AIXIA_STANDARD.md");
const PAGE_ACCESS_FILE = path.join(ROOT, "src", "lib", "finance", "pageAccess.ts");
const FINANCE_LIB_DIR = path.join(ROOT, "src", "lib", "finance");

const errors = [];
const warnings = [];

const REQUIRED_AIXIA_COMPONENT_FILES = [
  "AIXIA_STANDARD.md",
  "index.ts",
  "AixiaAccessRule.tsx",
  "AixiaActionCard.tsx",
  "AixiaActionSystem.tsx",
  "AixiaAlert.tsx",
  "AixiaArchiveManagerModal.tsx",
  "AixiaBadge.tsx",
  "AixiaButton.tsx",
  "AixiaCurrencyBadge.tsx",
  "AixiaDefaultBadge.tsx",
  "AixiaDetailSection.tsx",
  "AixiaDocumentUploadPanel.tsx",
  "AixiaEmptyState.tsx",
  "AixiaFormFields.tsx",
  "AixiaHero.tsx",
  "AixiaMetricCard.tsx",
  "AixiaMetricGrid.tsx",
  "AixiaModal.tsx",
  "AixiaNavigationCard.tsx",
  "AixiaPage.tsx",
  "AixiaPageStates.tsx",
  "AixiaRegistryToolbar.tsx",
  "AixiaReviewBlocks.tsx",
  "AixiaSearchField.tsx",
  "AixiaSection.tsx",
  "AixiaSmartGrid.tsx",
  "AixiaSmartLayout.tsx",
  "AixiaStatusBadge.tsx",
  "AixiaStatusCard.tsx",
  "AixiaTable.tsx",
  "AixiaTableCells.tsx",
  "AixiaValueBlock.tsx",
];

const REQUIRED_CSS_SELECTORS = [
  ".aixia-page",
  ".aixia-hero",
  ".aixia-hero-status-grid",
  ".aixia-section",
  ".aixia-section-header-layout",
  ".aixia-section-actions",
  ".aixia-registry-control-cluster",
  ".aixia-registry-filter-grid",
  ".aixia-btn-primary",
  ".aixia-btn-secondary",
  ".aixia-btn-danger",
  ".aixia-action-card",
  ".aixia-action-card-action",
  ".aixia-navigation-grid",
  ".aixia-navigation-card-shell",
  ".aixia-navigation-card",
  ".aixia-navigation-info-panel",
  ".aixia-navigation-stat-grid",
  ".aixia-navigation-stat-block",
  ".aixia-smart-layout",
  ".aixia-smart-main",
  ".aixia-smart-side",
  ".aixia-smart-bottom-span",
  ".aixia-table-wrap",
  ".aixia-table-scroll",
  ".aixia-table",
  ".aixia-table-head",
  ".aixia-table-row",
  ".aixia-table-cell-text",
  ".aixia-table-cell-badge",
  ".aixia-table-cell-date",
  ".aixia-table-cell-actions",
  ".aixia-table-actions",
  ".aixia-sortable-header",
  ".aixia-form-row-list",
  ".aixia-detail-section",
  ".aixia-document-upload-panel",
  ".aixia-document-upload-zone",
  ".aixia-document-selected-file",
  ".aixia-document-attachment-card",
  ".aixia-archive-manager-tabs",
];

const REQUIRED_INDEX_EXPORTS = [
  "AixiaPage",
  "AixiaHero",
  "AixiaActionCard",
  "AixiaSection",
  "AixiaDetailSection",
  "AixiaMetricGrid",
  "AixiaMetricCard",
  "AixiaDocumentUploadPanel",
  "AixiaNavigationCard",
  "AixiaNavigationGrid",
  "AixiaNavigationInfoPanel",
  "AixiaNavigationStatBlock",
  "AixiaButton",
  "AixiaSearchField",
  "AixiaRegistryToolbar",
  "AixiaArchiveManagerModal",
  "AixiaSortableHeader",
  "AixiaTableShell",
  "AixiaTableActionsCell",
  "AixiaTableBadgeCell",
  "AixiaTableDateCell",
  "AixiaTableTextCell",
  "AixiaSmartLayout",
  "AixiaStatusBadge",
  "AixiaCurrencyBadge",
  "AixiaDefaultBadge",
  "AixiaAccessDeniedState",
  "AixiaLoadingState",
  "AixiaNotFoundState",
  "AixiaAlert",
  "AixiaAlertText",
];

const ZERO_LOCAL_DESIGN_BANNED_PATTERNS = [
  "MasterDataModuleButton",
  "ModuleCard",
  "NavigationCard",
  "DomainCard",
  "HubCard",
  "MetricCard",
  "StatusCard",
  "SectionCard",
  "ValueBlock",
  "InfoBlock",
  "EmptyState",
  "AlertBox",
  "StatusPill",
  "SortButton",
  "SearchInput",
  "TableShell",
  "TableActionCell",
  "AccessRule",
  "DocumentUploadPanel",
  "UploadPanel",
  "UploadZone",
  "FileUploadPanel",
  "AttachmentPanel",
  "AttachmentCard",
  "FloatingUploadCard",
  "AixiaButton",
  "AixiaDisplayBlock",
  "AixiaFormGrid",
  "AixiaFormRowCard",
];

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getRelativePath(filePath) {
  if (path.isAbsolute(filePath)) {
    return normalizePath(path.relative(ROOT, filePath));
  }

  return normalizePath(filePath);
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function dirExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir, extensions, output = []) {
  if (!fs.existsSync(dir)) return output;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, output);
      continue;
    }

    if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) {
      output.push(fullPath);
    }
  }

  return output;
}

function addError(filePath, message, scope = "AiXia guardrail") {
  warnings.push({
    filePath: getRelativePath(filePath),
    message,
    scope,
  });
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function findCallEnd(text, openParenIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openParenIndex; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "(") depth += 1;

    if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function countTopLevelArguments(argumentText) {
  const trimmed = argumentText.trim();
  if (!trimmed) return 0;

  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let quote = null;
  let escaped = false;
  let commas = 0;

  for (let index = 0; index < argumentText.length; index += 1) {
    const character = argumentText[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "(") depthParen += 1;
    if (character === ")") depthParen -= 1;
    if (character === "{") depthBrace += 1;
    if (character === "}") depthBrace -= 1;
    if (character === "[") depthBracket += 1;
    if (character === "]") depthBracket -= 1;

    if (
      character === "," &&
      depthParen === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
      commas += 1;
    }
  }

  return commas + 1;
}

function inspectCallArguments(filePath, text, functionName, expectedCount, options = {}) {
  const cleanText = stripComments(text);
  const callPattern = new RegExp(`\\b${functionName}\\s*\\(`, "g");
  let match;

  while ((match = callPattern.exec(cleanText)) !== null) {
    const openParenIndex = cleanText.indexOf("(", match.index);
    const closeParenIndex = findCallEnd(cleanText, openParenIndex);

    if (closeParenIndex === -1) {
      addError(filePath, `${functionName} call is not closed correctly.`, "AiXia helper signature rule");
      continue;
    }

    const argumentText = cleanText.slice(openParenIndex + 1, closeParenIndex);
    const argumentCount = countTopLevelArguments(argumentText);

    if (argumentCount !== expectedCount) {
      addError(
        filePath,
        `${functionName} must be called with exactly ${expectedCount} argument${expectedCount === 1 ? "" : "s"}. Found ${argumentCount}.`,
        "AiXia helper signature rule"
      );
    }

    if (options.firstArgumentMustBeObject && !argumentText.trim().startsWith("{")) {
      addError(
        filePath,
        `${functionName} must be called with one object argument: { profileRole, permissions, config }.`,
        "AiXia helper signature rule"
      );
    }

    callPattern.lastIndex = closeParenIndex + 1;
  }
}

function getAixiaButtonBlocks(text) {
  const blocks = [];
  const pattern = /<AixiaButton\b[\s\S]*?<\/AixiaButton>/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    blocks.push(match[0]);
  }

  return blocks;
}

function getButtonVariant(buttonBlock) {
  const variantMatch = buttonBlock.match(/\bvariant=["']([^"']+)["']/);
  return variantMatch?.[1] || null;
}

function buttonHasVisibleWord(buttonBlock, word) {
  const withoutTags = buttonBlock
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[\s\S]*?\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return new RegExp(`\\b${word}\\b`, "i").test(withoutTags);
}

function assertFileExists(filePath, scope) {
  if (!fileExists(filePath)) {
    addError(filePath, "Required AiXia source-of-truth file is missing.", scope);
    return false;
  }

  return true;
}

function assertDirExists(filePath, scope) {
  if (!dirExists(filePath)) {
    addError(filePath, "Required AiXia source-of-truth directory is missing.", scope);
    return false;
  }

  return true;
}

function getCssBlock(text, selector) {
  const selectorIndex = text.indexOf(selector);
  if (selectorIndex === -1) return "";

  const openBraceIndex = text.indexOf("{", selectorIndex);
  if (openBraceIndex === -1) return "";

  let depth = 0;
  for (let index = openBraceIndex; index < text.length; index += 1) {
    const character = text[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBraceIndex + 1, index);
      }
    }
  }

  return "";
}

function inspectSharedStandardDocument() {
  if (!assertFileExists(AIXIA_STANDARD_FILE, "AiXia standard document rule")) return;

  const text = readText(AIXIA_STANDARD_FILE);
  const requiredPhrases = [
    "Source of truth",
    "Zero local design rule",
    "Locked shared components",
    "Registry toolbar standard",
    "Archive manager standard",
    "Button standard",
    "Table standard",
    "Silent refresh standard",
    "Finance permission standard",
    "GLOBAL AIXIA FONT / TYPOGRAPHY RULE",
    "All AiXia pages must use the same shared font and shared text-size scale",
    "No page may create its own font family",
    "Large hero titles may stay large",
  ];

  for (const phrase of requiredPhrases) {
    if (!text.includes(phrase)) {
      addError(
        AIXIA_STANDARD_FILE,
        `AIXIA_STANDARD.md must include the locked section/phrase: ${phrase}`,
        "AiXia standard document rule"
      );
    }
  }
}

function inspectSharedCssSourceOfTruth() {
  if (!assertFileExists(AIXIA_STYLE_FILE, "AiXia CSS source-of-truth rule")) return;

  const text = readText(AIXIA_STYLE_FILE);

  for (const selector of REQUIRED_CSS_SELECTORS) {
    if (!text.includes(selector)) {
      addError(
        AIXIA_STYLE_FILE,
        `Missing required shared CSS selector: ${selector}`,
        "AiXia CSS source-of-truth rule"
      );
    }
  }

  const requiredSnippets = [
    "repeat(6, minmax(0, 1fr))",
    "aixia-section-header-layout:has(.aixia-registry-control-cluster)",
    "data-table-variant=\"registry\"",
    "data-table-variant=\"archive\"",
    "position: sticky",
    "overflow-x: auto",
    "overflow-y: auto",
    "GLOBAL AIXIA TYPOGRAPHY LOCK",
    "GLOBAL AIXIA FONT + DETAIL TYPOGRAPHY LOCK",
    "GLOBAL AIXIA ACTION CARD + BUTTON SYMMETRY STANDARD",
    "GLOBAL DOCUMENT UPLOAD PANEL STANDARD",
    "GLOBAL SMART DETAIL LAYOUT COMPACTION STANDARD",
    "font-family:",
    "0.66rem",
    "0.74rem",
    "0.95rem",
    "1.12rem",
    "0.64rem",
    ".aixia-document-upload-panel",
    ".aixia-document-upload-zone",
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      addError(
        AIXIA_STYLE_FILE,
        `Missing locked shared CSS behavior/snippet: ${snippet}`,
        "AiXia CSS source-of-truth rule"
      );
    }
  }

  const protectedSelectorChecks = [
    {
      selector: ".aixia-registry-control-cluster",
      banned: [/display\s*:\s*none/i, /visibility\s*:\s*hidden/i],
    },
    {
      selector: ".aixia-section-actions",
      banned: [/display\s*:\s*none/i, /visibility\s*:\s*hidden/i],
    },
    {
      selector: ".aixia-table-actions",
      banned: [/display\s*:\s*none/i, /visibility\s*:\s*hidden/i],
    },
    {
      selector: ".aixia-table-wrap",
      banned: [/overflow\s*:\s*hidden/i],
    },
    {
      selector: ".aixia-table-scroll",
      banned: [/overflow\s*:\s*hidden/i],
    },
  ];

  for (const check of protectedSelectorChecks) {
    const block = getCssBlock(text, check.selector);
    for (const bannedPattern of check.banned) {
      if (bannedPattern.test(block)) {
        addError(
          AIXIA_STYLE_FILE,
          `${check.selector} contains a banned CSS rule that hides or clips locked registry/table/action layout.`,
          "AiXia CSS source-of-truth rule"
        );
      }
    }
  }
}

function inspectSharedComponentSourceOfTruth() {
  if (!assertDirExists(AIXIA_COMPONENT_DIR, "AiXia component source-of-truth rule")) return;

  for (const fileName of REQUIRED_AIXIA_COMPONENT_FILES) {
    assertFileExists(path.join(AIXIA_COMPONENT_DIR, fileName), "AiXia component source-of-truth rule");
  }

  const indexFile = path.join(AIXIA_COMPONENT_DIR, "index.ts");
  if (fileExists(indexFile)) {
    const indexText = readText(indexFile);
    for (const exportName of REQUIRED_INDEX_EXPORTS) {
      if (!new RegExp(`\\b${exportName}\\b`).test(indexText)) {
        addError(indexFile, `src/components/aixia/index.ts must export ${exportName}.`, "AiXia component source-of-truth rule");
      }
    }
  }

  const actionCardFile = path.join(AIXIA_COMPONENT_DIR, "AixiaActionCard.tsx");
  if (fileExists(actionCardFile)) {
    const text = readText(actionCardFile);
    const required = [
      "export function AixiaActionCard",
      "aixia-action-card",
      "aixia-action-card-action",
      "onClick",
      "actionLabel",
      "ArrowRight",
    ];

    for (const snippet of required) {
      if (!text.includes(snippet)) {
        addError(
          actionCardFile,
          `AixiaActionCard.tsx must preserve shared action-card behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const documentUploadPanelFile = path.join(
    AIXIA_COMPONENT_DIR,
    "AixiaDocumentUploadPanel.tsx"
  );
  if (fileExists(documentUploadPanelFile)) {
    const text = readText(documentUploadPanelFile);
    const required = [
      "export function AixiaDocumentUploadPanel",
      "export type AixiaDocumentUploadAttachment",
      "aixia-document-upload-panel",
      "aixia-document-upload-zone",
      "aixia-document-selected-file",
      "aixia-document-attachment-card",
      "onFileSelect",
      "onUpload",
      "onOpenAttachment",
    ];

    for (const snippet of required) {
      if (!text.includes(snippet)) {
        addError(
          documentUploadPanelFile,
          `AixiaDocumentUploadPanel.tsx must preserve shared upload behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const navigationCardFile = path.join(AIXIA_COMPONENT_DIR, "AixiaNavigationCard.tsx");
  if (fileExists(navigationCardFile)) {
    const text = readText(navigationCardFile);
    const required = [
      "export function AixiaNavigationGrid",
      "export function AixiaNavigationCard",
      "export function AixiaNavigationInfoPanel",
      "export function AixiaNavigationStatBlock",
      "AixiaWorkspaceCard",
      "aixia-navigation-grid",
      "aixia-navigation-card-shell",
      "aixia-navigation-card",
      "aixia-navigation-info-panel",
      "aixia-navigation-stat-block",
    ];

    for (const snippet of required) {
      if (!text.includes(snippet)) {
        addError(
          navigationCardFile,
          `AixiaNavigationCard.tsx must preserve shared navigation-card behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const registryToolbarFile = path.join(AIXIA_COMPONENT_DIR, "AixiaRegistryToolbar.tsx");
  if (fileExists(registryToolbarFile)) {
    const text = readText(registryToolbarFile);
    if (!/export\s+function\s+AixiaRegistryToolbar/.test(text)) {
      addError(registryToolbarFile, "AixiaRegistryToolbar must remain a shared exported function component.", "AiXia component source-of-truth rule");
    }
    if (!/aixia-registry-control-cluster/.test(text)) {
      addError(registryToolbarFile, "AixiaRegistryToolbar must own the aixia-registry-control-cluster layout class.", "AiXia component source-of-truth rule");
    }
    if (!/search[\s\S]*filters[\s\S]*secondaryActions[\s\S]*primaryAction[\s\S]*archiveAction/.test(text)) {
      addError(registryToolbarFile, "AixiaRegistryToolbar action order must remain: search, filters, secondaryActions, primaryAction, archiveAction.", "AiXia component source-of-truth rule");
    }
  }

  const tableFile = path.join(AIXIA_COMPONENT_DIR, "AixiaTable.tsx");
  if (fileExists(tableFile)) {
    const text = readText(tableFile);
    const required = [
      "export function AixiaTableShell",
      "export function AixiaSortableHeader",
      "data-table-variant",
      "variant === \"registry\"",
      "min-w-[1240px]",
      "variant === \"archive\"",
      "aixia-table-wrap",
      "aixia-table-scroll",
      "aixia-table",
      "aixia-sortable-header",
    ];
    for (const snippet of required) {
      if (!text.includes(snippet)) {
        addError(tableFile, `AixiaTable.tsx is missing locked table behavior/snippet: ${snippet}`, "AiXia component source-of-truth rule");
      }
    }
  }

  const tableCellsFile = path.join(AIXIA_COMPONENT_DIR, "AixiaTableCells.tsx");
  if (fileExists(tableCellsFile)) {
    const text = readText(tableCellsFile);
    const required = [
      "export function AixiaTableTextCell",
      "export function AixiaTableBadgeCell",
      "export function AixiaTableDateCell",
      "export function AixiaTableActionsCell",
      "aixia-table-cell-text",
      "aixia-table-cell-badge",
      "aixia-table-cell-date",
      "aixia-table-cell-actions",
      "aixia-table-actions",
    ];
    for (const snippet of required) {
      if (!text.includes(snippet)) {
        addError(tableCellsFile, `AixiaTableCells.tsx is missing locked cell/action behavior/snippet: ${snippet}`, "AiXia component source-of-truth rule");
      }
    }
  }

  const buttonFile = path.join(AIXIA_COMPONENT_DIR, "AixiaButton.tsx");
  if (fileExists(buttonFile)) {
    const text = readText(buttonFile);
    for (const snippet of ["aixia-btn", "aixia-btn-primary", "aixia-btn-secondary", "aixia-btn-danger"]) {
      if (!text.includes(snippet)) {
        addError(buttonFile, `AixiaButton.tsx must preserve shared button class: ${snippet}`, "AiXia component source-of-truth rule");
      }
    }
  }

  const heroFile = path.join(AIXIA_COMPONENT_DIR, "AixiaHero.tsx");
  if (fileExists(heroFile)) {
    const text = readText(heroFile);
    for (const snippet of ["statusCards", "parentLabel", "parentPath", "aixia-hero", "aixia-hero-status-grid"]) {
      if (!text.includes(snippet)) {
        addError(heroFile, `AixiaHero.tsx must preserve hero source-of-truth behavior/snippet: ${snippet}`, "AiXia component source-of-truth rule");
      }
    }
  }

  const smartLayoutFile = path.join(AIXIA_COMPONENT_DIR, "AixiaSmartLayout.tsx");
  if (fileExists(smartLayoutFile)) {
    const text = readText(smartLayoutFile);
    for (const snippet of [
      "bottomSpan",
      "sideRebalance",
      "mainTopCount",
      "aixia-smart-layout",
      "aixia-smart-bottom-span",
    ]) {
      if (!text.includes(snippet)) {
        addError(
          smartLayoutFile,
          `AixiaSmartLayout.tsx must preserve smart layout behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const archiveModalFile = path.join(AIXIA_COMPONENT_DIR, "AixiaArchiveManagerModal.tsx");
  if (fileExists(archiveModalFile)) {
    const text = readText(archiveModalFile);
    for (const snippet of [
      "AixiaArchiveManagerModal",
      "archivedCount",
      "deletedCount",
      "activeTab",
      "onTabChange",
      "Archive Manager",
    ]) {
      if (!text.includes(snippet)) {
        addError(
          archiveModalFile,
          `AixiaArchiveManagerModal.tsx must preserve archive modal behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const sectionFile = path.join(AIXIA_COMPONENT_DIR, "AixiaSection.tsx");
  if (fileExists(sectionFile)) {
    const text = readText(sectionFile);
    for (const snippet of [
      "AixiaSection",
      "AixiaDetailSection",
      "aixia-section",
      "aixia-section-header-layout",
      "aixia-section-actions",
      "actions",
    ]) {
      if (!text.includes(snippet)) {
        addError(
          sectionFile,
          `AixiaSection.tsx must preserve shared section behavior/snippet: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }

  const pageStatesFile = path.join(AIXIA_COMPONENT_DIR, "AixiaPageStates.tsx");
  if (fileExists(pageStatesFile)) {
    const text = readText(pageStatesFile);
    for (const snippet of [
      "AixiaLoadingState",
      "AixiaAccessDeniedState",
      "AixiaNotFoundState",
    ]) {
      if (!text.includes(snippet)) {
        addError(
          pageStatesFile,
          `AixiaPageStates.tsx must preserve shared page state component: ${snippet}`,
          "AiXia component source-of-truth rule"
        );
      }
    }
  }
}

function inspectFinancePermissionHelperSourceOfTruth() {
  if (!assertFileExists(PAGE_ACCESS_FILE, "AiXia permission helper source-of-truth rule")) return;

  const text = readText(PAGE_ACCESS_FILE);

  const requiredSnippets = [
    "export type FinanceLoadMode = \"initial\" | \"silent\"",
    "export type FinancePagePermissionState",
    "canRead: boolean",
    "canCreate: boolean",
    "canUpdate: boolean",
    "canDeleteArchive: boolean",
    "canApproveExecute: boolean",
    "export type FinancePageAccessConfig",
    "sectionKey: AccessApprovalSectionKey",
    "export function resolveFinancePagePermissionState({",
    "profileRole",
    "permissions",
    "config",
    "canRead = rawRead || canCreate",
    "export async function fetchFinanceEffectivePermissions(",
    "userId: string",
    "mode: FinanceLoadMode",
    "logLabel: string",
    "finance_get_effective_permissions",
    "target_user_id: userId",
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      addError(
        PAGE_ACCESS_FILE,
        `pageAccess.ts is missing locked permission behavior/snippet: ${snippet}`,
        "AiXia permission helper source-of-truth rule"
      );
    }
  }

  if (
    !/export\s+async\s+function\s+fetchFinanceEffectivePermissions\s*\(\s*userId\s*:\s*string\s*,\s*mode\s*:\s*FinanceLoadMode\s*,\s*logLabel\s*:\s*string\s*\)/.test(
      text
    )
  ) {
    addError(
      PAGE_ACCESS_FILE,
      "fetchFinanceEffectivePermissions signature must stay exactly: (userId: string, mode: FinanceLoadMode, logLabel: string).",
      "AiXia permission helper source-of-truth rule"
    );
  }

  if (
    !/export\s+function\s+resolveFinancePagePermissionState\s*\(\s*\{\s*profileRole\s*,\s*permissions\s*,\s*config\s*,\s*\}/.test(
      text
    )
  ) {
    addError(
      PAGE_ACCESS_FILE,
      "resolveFinancePagePermissionState must keep one object argument with { profileRole, permissions, config }.",
      "AiXia permission helper source-of-truth rule"
    );
  }
}

function getExportedFunctionBlock(text, functionName) {
  const pattern = new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\(`);
  const match = text.match(pattern);
  if (!match || typeof match.index !== "number") return "";

  const startIndex = match.index;
  const firstBraceIndex = text.indexOf("{", startIndex);
  if (firstBraceIndex === -1) return "";

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = firstBraceIndex; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "{") depth += 1;

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function inspectFinanceLibSafetyRules() {
  if (!dirExists(FINANCE_LIB_DIR)) return;

  const paymentMethodsFile = path.join(FINANCE_LIB_DIR, "paymentMethods.ts");
  if (fileExists(paymentMethodsFile)) {
    const text = readText(paymentMethodsFile);

    if (!/finance_permanently_delete_payment_method/.test(text)) {
      addError(
        paymentMethodsFile,
        "permanentlyDeletePaymentMethod must use the protected RPC finance_permanently_delete_payment_method.",
        "AiXia finance lib safety rule"
      );
    }

    const hardDeleteFunctionBlock = getExportedFunctionBlock(
      text,
      "permanentlyDeletePaymentMethod"
    );

    if (hardDeleteFunctionBlock && /\.delete\s*\(/.test(hardDeleteFunctionBlock)) {
      addError(
        paymentMethodsFile,
        "permanentlyDeletePaymentMethod must not call .delete() directly. Use the protected RPC only.",
        "AiXia finance lib safety rule"
      );
    }
  }

  const financeLibFiles = walkFiles(FINANCE_LIB_DIR, [".ts"]);

  for (const filePath of financeLibFiles) {
    const text = readText(filePath);
    const relativePath = getRelativePath(filePath);

    const hardDeleteFunctionPattern =
      /export\s+async\s+function\s+(permanentlyDelete\w+|hardDelete\w+|delete\w+Permanently)\s*\(/g;

    let match;
    while ((match = hardDeleteFunctionPattern.exec(text)) !== null) {
      const functionName = match[1];
      const functionBlock = getExportedFunctionBlock(text, functionName);

      if (!functionBlock) {
        addError(
          filePath,
          `Could not inspect hard-delete function ${functionName}. Keep hard-delete functions simple and protected by RPC.`,
          "AiXia finance lib safety rule"
        );
        continue;
      }

      const usesDirectDelete = /\.delete\s*\(/.test(functionBlock);
      const usesProtectedRpc = /\.rpc\s*\(/.test(functionBlock);

      if (usesDirectDelete && !usesProtectedRpc) {
        addError(
          filePath,
          `${functionName} uses direct .delete() without protected RPC. Hard delete helpers must be backend protected.`,
          "AiXia finance lib safety rule"
        );
      }

      if (usesDirectDelete && relativePath === "src/lib/finance/paymentMethods.ts") {
        addError(
          filePath,
          `${functionName} in paymentMethods.ts must never call .delete() directly. Use finance_permanently_delete_payment_method.`,
          "AiXia finance lib safety rule"
        );
      }
    }
  }
}

function inspectButtonMeaning(filePath, text) {
  const buttons = getAixiaButtonBlocks(text);

  for (const button of buttons) {
    const variant = getButtonVariant(button);

    if (
      buttonHasVisibleWord(button, "Open") &&
      variant === "secondary" &&
      !/Open\s+Source\s+Record/i.test(button)
    ) {
      addError(
        filePath,
        "Primary row Open action buttons must use variant=\"primary\", not variant=\"secondary\". Secondary context links like Open Source Record are allowed.",
        "AiXia button meaning rule"
      );
    }

    if (buttonHasVisibleWord(button, "Edit") && variant === "secondary") {
      addError(
        filePath,
        "Edit action buttons must not use variant=\"secondary\" unless explicitly approved in the shared component source. Use variant=\"primary\" for normal Edit actions.",
        "AiXia button meaning rule"
      );
    }

    if (buttonHasVisibleWord(button, "Archive") && variant !== "danger") {
      addError(
        filePath,
        "Archive action buttons must use variant=\"danger\".",
        "AiXia button meaning rule"
      );
    }

    if (buttonHasVisibleWord(button, "Delete") && variant !== "danger") {
      addError(
        filePath,
        "Delete / Delete Permanently action buttons must use variant=\"danger\".",
        "AiXia button meaning rule"
      );
    }

    if (buttonHasVisibleWord(button, "Restore") && variant !== "secondary") {
      addError(
        filePath,
        "Restore action buttons must use variant=\"secondary\".",
        "AiXia button meaning rule"
      );
    }
  }
}

function removeFunctionDeclaration(text, functionName) {
  const pattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`, "g");
  return text.replace(pattern, "");
}

function inspectUnusedPatternRisks(filePath, text) {
  if (/AixiaActionStack/.test(text) && !/<AixiaActionStack\b/.test(text)) {
    addError(
      filePath,
      "AixiaActionStack is imported/mentioned but not rendered. Remove unused imports before build.",
      "AiXia compile safety rule"
    );
  }

  if (/AixiaReviewBlock/.test(text) && !/<AixiaReviewBlock\b/.test(text)) {
    addError(
      filePath,
      "AixiaReviewBlock is imported/mentioned but not rendered. Remove unused imports before build.",
      "AiXia compile safety rule"
    );
  }

  if (/ArrowRight/.test(text) && !/<ArrowRight\b/.test(text)) {
    addError(
      filePath,
      "ArrowRight is imported/mentioned but not rendered. Remove unused imports before build.",
      "AiXia compile safety rule"
    );
  }

  if (/\bconst\s+navigate\s*=\s*useNavigate\(\)\s*;/.test(text) && !/navigate\(/.test(text)) {
    addError(
      filePath,
      "navigate is declared but never used. Remove useNavigate/navigate before build.",
      "AiXia compile safety rule"
    );
  }

  const textWithoutGetStatusFilterToneDeclaration = removeFunctionDeclaration(
    text,
    "getStatusFilterTone"
  );

  if (
    /function\s+getStatusFilterTone\b/.test(text) &&
    !/getStatusFilterTone\(/.test(textWithoutGetStatusFilterToneDeclaration)
  ) {
    addError(
      filePath,
      "getStatusFilterTone is declared but never used. Remove unused helpers before build.",
      "AiXia compile safety rule"
    );
  }

  const textWithoutFormatStatusLabelDeclaration = removeFunctionDeclaration(
    text,
    "formatStatusLabel"
  );

  if (
    /function\s+formatStatusLabel\b/.test(text) &&
    !/formatStatusLabel\(/.test(textWithoutFormatStatusLabelDeclaration)
  ) {
    addError(
      filePath,
      "formatStatusLabel is declared but never used. Remove unused helpers before build.",
      "AiXia compile safety rule"
    );
  }
}

function inspectPermissionPatterns(filePath, text) {
  if (/\bgetEffectivePermissions\b/.test(text)) {
    addError(
      filePath,
      "Finance pages must not use getEffectivePermissions. Use fetchFinanceEffectivePermissions + resolveFinancePagePermissionState from @/lib/finance/pageAccess.",
      "AiXia page permission rule"
    );
  }

  if (/\bfunction\s+buildPermissionState\b/.test(text)) {
    addError(
      filePath,
      "Local buildPermissionState is banned. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess.",
      "AiXia page permission rule"
    );
  }

  if (/\bfunction\s+hasPermission\b/.test(text)) {
    addError(
      filePath,
      "Local hasPermission is banned. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess.",
      "AiXia page permission rule"
    );
  }

  if (/\bloadBackendEffectivePermissions\b/.test(text)) {
    addError(
      filePath,
      "Local loadBackendEffectivePermissions is banned. Use fetchFinanceEffectivePermissions(userId, mode, \"Page Label\").",
      "AiXia page permission rule"
    );
  }

  if (/finance_get_effective_permissions/.test(text)) {
    addError(
      filePath,
      "Finance pages must not call finance_get_effective_permissions directly. Use fetchFinanceEffectivePermissions from @/lib/finance/pageAccess.",
      "AiXia page permission rule"
    );
  }

  if (/fetchFinanceEffectivePermissions/.test(text)) {
    inspectCallArguments(filePath, text, "fetchFinanceEffectivePermissions", 3);
  }

  if (/resolveFinancePagePermissionState/.test(text)) {
    inspectCallArguments(filePath, text, "resolveFinancePagePermissionState", 1, {
      firstArgumentMustBeObject: true,
    });
  }
}

function inspectRegistryStandards(filePath, text) {
  if (!/variant=["']registry["']/.test(text)) return;

  const hasSharedRegistryAccessRule = /<AixiaRegistryAccessRule\b/.test(text);

  const hasLockedTitleAccessRule =
    /<AixiaAccessRule\b[\s\S]{0,1200}title=["']Locked access rule["'][\s\S]{0,5000}<\/AixiaAccessRule>/.test(
      text
    );

  const hasSemanticRegistryAccessRule =
    /<AixiaAccessRule\b[\s\S]{0,7000}<\/AixiaAccessRule>/.test(text) &&
    /registry|records|active|archived|deleted|archive panel|archive modal/i.test(
      text
    ) &&
    /restore|permanent delete|Delete Permanently|lifecycle/i.test(text) &&
    /silent|Realtime|60-second|60s|refresh/i.test(text);

  const hasLockedAccessRule =
    hasSharedRegistryAccessRule ||
    hasLockedTitleAccessRule ||
    hasSemanticRegistryAccessRule;

  if (!hasLockedAccessRule) {
    addError(
      filePath,
      "Registry pages must include the locked access rule block or shared AixiaRegistryAccessRule component.",
      "AiXia registry page rule"
    );
  }

  if (!/AixiaRegistryToolbar/.test(text)) {
    addError(
      filePath,
      "Registry pages must use AixiaRegistryToolbar for search/filter/action controls.",
      "AiXia registry page rule"
    );
  }

  if (/className=["'][^"']*\bflex\b[^"']*["'][\s\S]{0,500}<AixiaRegistryToolbar/.test(text)) {
    addError(
      filePath,
      "Do not wrap AixiaRegistryToolbar in local flex layout hacks. The shared toolbar/section must control registry layout.",
      "AiXia registry page rule"
    );
  }

  if (/className=["'][^"']*\bgrid\b[^"']*["'][\s\S]{0,500}<AixiaRegistryToolbar/.test(text)) {
    addError(
      filePath,
      "Do not wrap AixiaRegistryToolbar in local grid layout hacks. The shared toolbar/section must control registry layout.",
      "AiXia registry page rule"
    );
  }

  if (/AixiaTableActionsCell[\s\S]{0,120}<AixiaActionSystem/.test(text)) {
    addError(
      filePath,
      "Do not wrap AixiaTableActionsCell with AixiaActionSystem. AixiaTableActionsCell owns table row action layout.",
      "AiXia registry page rule"
    );
  }
}

function inspectZeroLocalDesign(filePath, text) {
  for (const componentName of ZERO_LOCAL_DESIGN_BANNED_PATTERNS) {
    const functionPattern = new RegExp(
      `function\\s+${componentName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?return\\s*\\(`,
      "m"
    );

    const constPattern = new RegExp(
      `const\\s+${componentName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\(?\\s*<`,
      "m"
    );

    if (functionPattern.test(text) || constPattern.test(text)) {
      addError(
        filePath,
        `Local visual component ${componentName} is banned in Finance pages. Use shared src/components/aixia source-of-truth components. Hub/module cards must use AixiaNavigationCard or AixiaWorkspaceCard.`,
        "AiXia zero local design rule"
      );
    }
  }

  if (/className=["'][^"']*\brounded-\[[^\]]+\][^"']*\bborder-white\/10[^"']*["']/.test(text)) {
    addError(
      filePath,
      "Finance pages must not create local glass card visual systems with raw Tailwind classes. Use shared AiXia components/classes.",
      "AiXia zero local design rule"
    );
  }

  if (
    /modules?\.map|filteredModules?\.map|moduleCards?\.map|filteredModuleCards?\.map|domains?\.map/i.test(text) &&
    /<AixiaSection\b[\s\S]{0,5000}modules?\.map|modules?\.map[\s\S]{0,5000}<AixiaSection\b|filteredModuleCards?\.map[\s\S]{0,5000}<AixiaSection\b/i.test(text)
  ) {
    addError(
      filePath,
      "Hub/module navigation lists must not render repeated AixiaSection cards. Use AixiaNavigationGrid + AixiaNavigationCard, or AixiaWorkspaceCard when a thinner wrapper is not needed.",
      "AiXia navigation-card standard rule"
    );
  }

  if (
    /path\s*:\s*["']\/finance\//.test(text) &&
    /(modules?|domains?|cards?)\s*=/.test(text) &&
    !/AixiaNavigationCard|AixiaWorkspaceCard/.test(text)
  ) {
    addError(
      filePath,
      "Finance hub pages with route-based module cards must use the shared AixiaNavigationCard or AixiaWorkspaceCard pattern.",
      "AiXia navigation-card standard rule"
    );
  }
}

function inspectBannedFinanceUiImports(filePath, text) {
  const bannedImports = [
    "@/components/ui/",
    "framer-motion",
  ];

  for (const bannedImport of bannedImports) {
    if (text.includes(bannedImport)) {
      addError(
        filePath,
        `Finance pages must not import from ${bannedImport}. Use shared "@/components/aixia" components only. If a primitive is needed, wrap it inside src/components/aixia first.`,
        "AiXia banned Finance UI import rule"
      );
    }
  }

  if (/\bmotion\./.test(text) || /<motion\./.test(text) || /\bAnimatePresence\b/.test(text)) {
    addError(
      filePath,
      "Finance pages must not use framer-motion directly. Animation belongs inside shared AiXia components only.",
      "AiXia banned Finance UI import rule"
    );
  }

  const bannedLocalStyleConstants = [
    "pageShell",
    "glassSurface",
    "glassSurfaceHover",
    "textGradient",
    "badgeBase",
    "premiumButton",
    "inputGlass",
    "selectGlass",
    "textareaGlass",
    "labelGlass",
  ];

  for (const constantName of bannedLocalStyleConstants) {
    const constantPattern = new RegExp(`\\bconst\\s+${constantName}\\s*=`, "m");

    if (constantPattern.test(text)) {
      addError(
        filePath,
        `Finance pages must not define local style constant "${constantName}". Use shared AiXia components/CSS source-of-truth.`,
        "AiXia zero local design rule"
      );
    }
  }
}

function inspectDocumentUploadAndLocalWrapperRules(filePath, text) {
  const localSharedWrapperPatterns = [
    "function AixiaButton(",
    "function AixiaDisplayBlock(",
    "function AixiaFormGrid(",
    "function AixiaFormRowCard(",
    "const AixiaButton =",
    "const AixiaDisplayBlock =",
    "const AixiaFormGrid =",
    "const AixiaFormRowCard =",
  ];

  for (const snippet of localSharedWrapperPatterns) {
    if (text.includes(snippet)) {
      addError(
        filePath,
        `Finance pages must not create local wrapper component "${snippet.replace("function ", "").replace("const ", "").replace("(", "").replace(" =", "")}". Use the shared component directly or update src/components/aixia source-of-truth.`,
        "AiXia zero local wrapper rule"
      );
    }
  }

  const hasManualUploadUi =
    /aixia-upload-zone|aixia-document-upload-zone|Drop .*file here|Click to browse|selectedFile|fileInputRef|onDragEnter|onDrop|handleDropFile/i.test(
      text
    );

  const usesSharedUploadPanel = /AixiaDocumentUploadPanel/.test(text);

  if (hasManualUploadUi && !usesSharedUploadPanel) {
    addError(
      filePath,
      "Finance pages must not build manual upload/drop-zone/attachment UI. Use shared AixiaDocumentUploadPanel from @/components/aixia.",
      "AiXia document upload standard rule"
    );
  }

  if (/className=["'][^"']*aixia-upload-zone[^"']*["']/.test(text)) {
    addError(
      filePath,
      "Legacy aixia-upload-zone is banned in Finance pages. Use AixiaDocumentUploadPanel and aixia-document-upload-zone from the shared source-of-truth.",
      "AiXia document upload standard rule"
    );
  }

  const localTypographyPatterns = [
    /\btext-\[[^\]]+\]/,
    /\bfont-\[(?:[^\]]+)\]/,
    /\bleading-\[[^\]]+\]/,
    /\btracking-\[[^\]]+\]/,
    /\bfontFamily\s*:/,
    /\bfont-family\s*:/,
  ];

  for (const pattern of localTypographyPatterns) {
    if (pattern.test(text)) {
      addError(
        filePath,
        "Finance pages must not create local typography sizing/family systems. Typography belongs in src/styles/aixia-design-system.css and shared AiXia components.",
        "AiXia typography standard rule"
      );
      break;
    }
  }
}

function inspectActionCardAndButtonSymmetryRules(filePath, text) {
  const hasSourceOrLinkSection =
    /title=["']Source Links["']|title=["']Linked Documents["']|title=["']Source Documents["']|title=["']Payment History["']|title=["']Customer PO Document["']|title=["']Vendor Bill Document["']/i.test(
      text
    );

  const hasLooseOpenButton =
    /<AixiaButton\b[\s\S]{0,400}>\s*[\s\S]{0,120}\bOpen\b[\s\S]{0,180}<\/AixiaButton>/i.test(
      text
    );

  const usesActionCard = /<AixiaActionCard\b/.test(text);
  const usesDocumentUploadPanel = /<AixiaDocumentUploadPanel\b/.test(text);

  if (hasSourceOrLinkSection && hasLooseOpenButton && !usesActionCard && !usesDocumentUploadPanel) {
    addError(
      filePath,
      "Source/link/payment/document sections must not use loose Open buttons. Use shared AixiaActionCard for full-card click behavior, or AixiaDocumentUploadPanel for file attachments.",
      "AiXia action-card standard rule"
    );
  }

  if (
    /title=["']Source Links["'][\s\S]{0,4000}<AixiaButton\b[\s\S]{0,600}\bOpen\b/i.test(
      text
    ) &&
    !usesActionCard
  ) {
    addError(
      filePath,
      "Source Links must use full clickable AixiaActionCard records. Do not place large detached Open PO / Open Quotation buttons below source cards.",
      "AiXia action-card standard rule"
    );
  }

  const oversizedButtonPatterns = [
    /\bh-14\b/,
    /\bh-16\b/,
    /\bh-20\b/,
    /\bpx-8\b/,
    /\bpx-10\b/,
    /\bpx-12\b/,
    /\btext-lg\b/,
    /\btext-xl\b/,
    /\btext-2xl\b/,
  ];

  for (const pattern of oversizedButtonPatterns) {
    if (pattern.test(text)) {
      addError(
        filePath,
        "Finance pages must not create oversized local action buttons. Button size/symmetry belongs to AixiaButton and shared CSS.",
        "AiXia button symmetry rule"
      );
      break;
    }
  }
}

function inspectFinancePage(filePath) {
  const text = readText(filePath);

  if (/\btype\s+LoadMode\s*=\s*FinanceLoadMode\s*;[\s\S]*?\btype\s+LoadMode\s*=/.test(text)) {
    addError(
      filePath,
      "Duplicate type LoadMode declaration found. Use only: type LoadMode = FinanceLoadMode;",
      "AiXia page permission rule"
    );
  }

  if (/\btype\s+LoadMode\s*=\s*["']initial["']\s*\|\s*["']silent["']\s*;/.test(text)) {
    addError(
      filePath,
      "Do not locally define LoadMode as \"initial\" | \"silent\". Import FinanceLoadMode and use: type LoadMode = FinanceLoadMode;",
      "AiXia page permission rule"
    );
  }

  inspectPermissionPatterns(filePath, text);
  inspectBannedFinanceUiImports(filePath, text);
  inspectRegistryStandards(filePath, text);
  inspectButtonMeaning(filePath, text);
  inspectActionCardAndButtonSymmetryRules(filePath, text);
  inspectUnusedPatternRisks(filePath, text);
  inspectZeroLocalDesign(filePath, text);
  inspectDocumentUploadAndLocalWrapperRules(filePath, text);
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log("AiXia guardrails skipped: src directory not found.");
    return;
  }

  inspectSharedStandardDocument();
  inspectSharedCssSourceOfTruth();
  inspectSharedComponentSourceOfTruth();
  inspectFinancePermissionHelperSourceOfTruth();
  inspectFinanceLibSafetyRules();

  const financeFiles = walkFiles(FINANCE_APP_DIR, [".tsx", ".ts"]);

  for (const filePath of financeFiles) {
    inspectFinancePage(filePath);
  }

  if (warnings.length > 0) {
    console.warn("\nAiXia standards warning report. Build will continue, but these violations must be fixed:\n");

    for (const warning of warnings) {
      console.warn(`- [${warning.scope}] ${warning.filePath}: ${warning.message}`);
    }

    console.warn(
      "\nLocked rule: these are not exceptions. They are active AiXia standard violations that must be fixed. The build continues so the project can keep moving while the violations are cleaned up.\n"
    );
  }

  if (errors.length > 0) {
    console.error("\nAiXia guardrail system error. Fix the guard script itself before build:\n");

    for (const error of errors) {
      console.error(`- [${error.scope}] ${error.filePath}: ${error.message}`);
    }

    process.exit(1);
  }

  console.log("AiXia guardrails completed. Navigation-card, action-card, document-upload, typography, button-symmetry, and shared-wrapper source-of-truth rules are active.");
}

main();
