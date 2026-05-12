import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FINANCE_APP_DIR = path.join(ROOT, "src", "app", "finance");

const errors = [];
const warnings = [];

/**
 * These files existed before the guardrail was created and still contain legacy
 * permission/registry patterns. They are allowed to build for now, but the guard
 * still reports warnings so every future rewrite can remove them from this list.
 *
 * Rule:
 * - New or rewritten standardized pages must NOT be added here.
 * - Remove files from these lists when they are standardized.
 */
const LEGACY_PERMISSION_PATTERN_EXEMPTIONS = new Set([
  "src/app/finance/access-approvals/[userId]/page.tsx",
  "src/app/finance/access-approvals/page.tsx",
  "src/app/finance/master-data/page.tsx",
  "src/app/finance/master-data/payment-terms/page.tsx",
  "src/app/finance/master-data/revenue-categories/page.tsx",
  "src/app/finance/master-data/shipping-terms/page.tsx",
  "src/app/finance/master-data/tax-codes/page.tsx",
  "src/app/finance/master-data/units-of-measure/page.tsx",
  "src/app/finance/master-data/vendor-bank-accounts/[id]/page.tsx",
  "src/app/finance/master-data/vendor-bank-accounts/new/page.tsx",
  "src/app/finance/master-data/vendor-bank-accounts/page.tsx",
  "src/app/finance/master-data/vendors/[id]/page.tsx",
  "src/app/finance/master-data/vendors/new/page.tsx",
  "src/app/finance/master-data/vendors/page.tsx",
  "src/app/finance/page.tsx",
  "src/app/finance/transactions/invoices/page.tsx",
  "src/app/finance/transactions/page.tsx",
  "src/app/finance/transactions/payments-received/page.tsx",
  "src/app/finance/transactions/proforma-invoices/page.tsx",
  "src/app/finance/transactions/quotations/page.tsx",
]);

const LEGACY_REGISTRY_ACCESS_RULE_EXEMPTIONS = new Set([
  "src/app/finance/master-data/bank-accounts/page.tsx",
  "src/app/finance/master-data/currencies/page.tsx",
  "src/app/finance/master-data/employees/page.tsx",
  "src/app/finance/master-data/expense-categories/page.tsx",
  "src/app/finance/master-data/items/page.tsx",
]);

const LEGACY_SECONDARY_EDIT_EXEMPTIONS = new Set([
  "src/app/finance/master-data/employees/page.tsx",
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getRelativePath(filePath) {
  if (path.isAbsolute(filePath)) {
    return normalizePath(path.relative(ROOT, filePath));
  }

  return normalizePath(filePath);
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

function addError(filePath, message) {
  errors.push({
    filePath: getRelativePath(filePath),
    message,
  });
}

function addWarning(filePath, message) {
  warnings.push({
    filePath: getRelativePath(filePath),
    message,
  });
}

function addLegacyWarningOrError(filePath, legacySet, message) {
  const relativePath = getRelativePath(filePath);

  if (legacySet.has(relativePath)) {
    addWarning(filePath, `Legacy baseline warning: ${message}`);
    return;
  }

  addError(filePath, message);
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
      addError(filePath, `${functionName} call is not closed correctly.`);
      continue;
    }

    const argumentText = cleanText.slice(openParenIndex + 1, closeParenIndex);
    const argumentCount = countTopLevelArguments(argumentText);

    if (argumentCount !== expectedCount) {
      addError(
        filePath,
        `${functionName} must be called with exactly ${expectedCount} argument${expectedCount === 1 ? "" : "s"}. Found ${argumentCount}.`
      );
    }

    if (options.firstArgumentMustBeObject && !argumentText.trim().startsWith("{")) {
      addError(
        filePath,
        `${functionName} must be called with one object argument: { profileRole, permissions, config }.`
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

function inspectButtonMeaning(filePath, text) {
  const relativePath = getRelativePath(filePath);
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
        "Primary row Open action buttons must use variant=\"primary\", not variant=\"secondary\". Secondary context links like Open Source Record are allowed."
      );
    }

    if (buttonHasVisibleWord(button, "Edit") && variant === "secondary") {
      if (LEGACY_SECONDARY_EDIT_EXEMPTIONS.has(relativePath)) {
        addWarning(
          filePath,
          "Legacy baseline warning: Edit button uses variant=\"secondary\". Standardized pages must use primary when Edit is the main section action."
        );
      } else {
        addError(
          filePath,
          "Edit action buttons must not use variant=\"secondary\" unless explicitly approved. Use variant=\"primary\" for normal Edit actions."
        );
      }
    }

    if (buttonHasVisibleWord(button, "Archive") && variant !== "danger") {
      addError(filePath, "Archive action buttons must use variant=\"danger\".");
    }

    if (buttonHasVisibleWord(button, "Delete") && variant !== "danger") {
      addError(filePath, "Delete / Delete Permanently action buttons must use variant=\"danger\".");
    }

    if (buttonHasVisibleWord(button, "Restore") && variant !== "secondary") {
      addError(filePath, "Restore action buttons must use variant=\"secondary\".");
    }
  }
}

function inspectUnusedPatternRisks(filePath, text) {
  if (/AixiaActionStack/.test(text) && !/<AixiaActionStack\b/.test(text)) {
    addError(filePath, "AixiaActionStack is imported/mentioned but not rendered. Remove unused imports before build.");
  }

  if (/AixiaReviewBlock/.test(text) && !/<AixiaReviewBlock\b/.test(text)) {
    addError(filePath, "AixiaReviewBlock is imported/mentioned but not rendered. Remove unused imports before build.");
  }

  if (/ArrowRight/.test(text) && !/<ArrowRight\b/.test(text)) {
    addError(filePath, "ArrowRight is imported/mentioned but not rendered. Remove unused imports before build.");
  }

  if (/\bconst\s+navigate\s*=\s*useNavigate\(\)\s*;/.test(text) && !/navigate\(/.test(text)) {
    addError(filePath, "navigate is declared but never used. Remove useNavigate/navigate before build.");
  }

  const textWithoutGetStatusFilterToneDeclaration = text.replace(
    /function\s+getStatusFilterTone[\s\S]*?\n}/,
    ""
  );

  if (
    /getStatusFilterTone/.test(text) &&
    !/getStatusFilterTone\(/.test(textWithoutGetStatusFilterToneDeclaration)
  ) {
    addWarning(filePath, "getStatusFilterTone appears unused. TypeScript may fail with TS6133.");
  }
}

function inspectPermissionPatterns(filePath, text) {
  if (/\bgetEffectivePermissions\b/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Finance pages must not use getEffectivePermissions after standardization. Use fetchFinanceEffectivePermissions + resolveFinancePagePermissionState from @/lib/finance/pageAccess."
    );
  }

  if (/\bfunction\s+buildPermissionState\b/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Local buildPermissionState is banned after standardization. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess."
    );
  }

  if (/\bfunction\s+hasPermission\b/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Local hasPermission is banned after standardization. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess."
    );
  }

  if (/\bloadBackendEffectivePermissions\b/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Local loadBackendEffectivePermissions is banned after standardization. Use fetchFinanceEffectivePermissions(userId, mode, \"Page Label\")."
    );
  }

  if (/finance_get_effective_permissions/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Finance pages must not call finance_get_effective_permissions directly after standardization. Use fetchFinanceEffectivePermissions from @/lib/finance/pageAccess."
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

  const hasLockedAccessRule =
    /Locked access rule/.test(text) ||
    /AixiaRegistryAccessRule/.test(text);

  if (!hasLockedAccessRule) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_REGISTRY_ACCESS_RULE_EXEMPTIONS,
      "Registry pages must include the locked access rule block or shared AixiaRegistryAccessRule component."
    );
  }

  if (!/AixiaRegistryToolbar/.test(text)) {
    addError(filePath, "Registry pages must use AixiaRegistryToolbar for search/filter/action controls.");
  }

  if (/className=["'][^"']*\bflex\b[^"']*["'][\s\S]{0,500}<AixiaRegistryToolbar/.test(text)) {
    addError(
      filePath,
      "Do not wrap AixiaRegistryToolbar in local flex layout hacks. The shared toolbar/section must control registry layout."
    );
  }

  if (/className=["'][^"']*\bgrid\b[^"']*["'][\s\S]{0,500}<AixiaRegistryToolbar/.test(text)) {
    addError(
      filePath,
      "Do not wrap AixiaRegistryToolbar in local grid layout hacks. The shared toolbar/section must control registry layout."
    );
  }
}

function inspectFinancePage(filePath) {
  const text = readText(filePath);

  if (/\btype\s+LoadMode\s*=\s*FinanceLoadMode\s*;[\s\S]*?\btype\s+LoadMode\s*=/.test(text)) {
    addError(filePath, "Duplicate type LoadMode declaration found. Use only: type LoadMode = FinanceLoadMode;");
  }

  if (/\btype\s+LoadMode\s*=\s*["']initial["']\s*\|\s*["']silent["']\s*;/.test(text)) {
    addLegacyWarningOrError(
      filePath,
      LEGACY_PERMISSION_PATTERN_EXEMPTIONS,
      "Do not locally define LoadMode as \"initial\" | \"silent\" after standardization. Import FinanceLoadMode and use: type LoadMode = FinanceLoadMode;"
    );
  }

  inspectPermissionPatterns(filePath, text);
  inspectRegistryStandards(filePath, text);
  inspectButtonMeaning(filePath, text);
  inspectUnusedPatternRisks(filePath, text);
}

function main() {
  const financeFiles = walkFiles(FINANCE_APP_DIR, [".tsx", ".ts"]);

  for (const filePath of financeFiles) {
    inspectFinancePage(filePath);
  }

  if (warnings.length > 0) {
    console.warn("\nAiXia guardrail warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning.filePath}: ${warning.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("\nAiXia guardrail failed. Fix these issues before build:\n");

    for (const error of errors) {
      console.error(`- ${error.filePath}: ${error.message}`);
    }

    console.error(
      "\nLocked rule: fix the shared source-of-truth/component/permission pattern. Do not bypass the guard with page-level hacks.\n"
    );

    process.exit(1);
  }

  console.log("AiXia guardrails passed.");
}

main();
