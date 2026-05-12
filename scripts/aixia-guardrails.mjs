import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FINANCE_APP_DIR = path.join(ROOT, "src", "app", "finance");

const errors = [];
const warnings = [];

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
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
    filePath: normalizePath(path.relative(ROOT, filePath)),
    message,
  });
}

function addWarning(filePath, message) {
  warnings.push({
    filePath: normalizePath(path.relative(ROOT, filePath)),
    message,
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

function buttonHasVisibleWord(buttonBlock, word) {
  const withoutTags = buttonBlock
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[\s\S]*?\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return new RegExp(`\\b${word}\\b`, "i").test(withoutTags);
}

function getButtonVariant(buttonBlock) {
  const variantMatch = buttonBlock.match(/\bvariant=["']([^"']+)["']/);
  return variantMatch?.[1] || null;
}

function inspectButtonMeaning(filePath, text) {
  const buttons = getAixiaButtonBlocks(text);

  for (const button of buttons) {
    const variant = getButtonVariant(button);

    if ((buttonHasVisibleWord(button, "Open") || buttonHasVisibleWord(button, "Edit")) && variant === "secondary") {
      addError(
        filePath,
        "Open/Edit action buttons must not use variant=\"secondary\". Use variant=\"primary\" unless the button is explicitly not an action."
      );
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

function inspectFinancePage(filePath) {
  const text = readText(filePath);
  const relativePath = normalizePath(path.relative(ROOT, filePath));

  if (/\btype\s+LoadMode\s*=\s*FinanceLoadMode\s*;[\s\S]*?\btype\s+LoadMode\s*=/.test(text)) {
    addError(filePath, "Duplicate type LoadMode declaration found. Use only: type LoadMode = FinanceLoadMode;");
  }

  if (/\btype\s+LoadMode\s*=\s*["']initial["']\s*\|\s*["']silent["']\s*;/.test(text)) {
    addError(filePath, "Do not locally define LoadMode as \"initial\" | \"silent\". Import FinanceLoadMode and use: type LoadMode = FinanceLoadMode;");
  }

  if (/\bgetEffectivePermissions\b/.test(text)) {
    addError(filePath, "Finance pages must not use getEffectivePermissions. Use fetchFinanceEffectivePermissions + resolveFinancePagePermissionState from @/lib/finance/pageAccess.");
  }

  if (/\bfunction\s+buildPermissionState\b/.test(text)) {
    addError(filePath, "Local buildPermissionState is banned in Finance pages. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess.");
  }

  if (/\bfunction\s+hasPermission\b/.test(text)) {
    addError(filePath, "Local hasPermission is banned in Finance pages. Use resolveFinancePagePermissionState from @/lib/finance/pageAccess.");
  }

  if (/\bloadBackendEffectivePermissions\b/.test(text)) {
    addError(filePath, "Local loadBackendEffectivePermissions is banned in Finance pages. Use fetchFinanceEffectivePermissions(userId, mode, \"Page Label\").");
  }

  if (/finance_get_effective_permissions/.test(text)) {
    addError(filePath, "Finance pages must not call finance_get_effective_permissions directly. Use fetchFinanceEffectivePermissions from @/lib/finance/pageAccess.");
  }

  if (/fetchFinanceEffectivePermissions/.test(text)) {
    inspectCallArguments(filePath, text, "fetchFinanceEffectivePermissions", 3);
  }

  if (/resolveFinancePagePermissionState/.test(text)) {
    inspectCallArguments(filePath, text, "resolveFinancePagePermissionState", 1, {
      firstArgumentMustBeObject: true,
    });
  }

  if (/variant=["']registry["']/.test(text)) {
    const hasLockedAccessRule =
      /Locked access rule/.test(text) ||
      /AixiaRegistryAccessRule/.test(text);

    if (!hasLockedAccessRule) {
      addError(
        filePath,
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

  if (/PAYMENT METHOD REGISTRY/.test(text) || /Payment Method Registry/.test(text)) {
    if (!/Locked access rule/.test(text) && !/AixiaRegistryAccessRule/.test(text)) {
      addError(filePath, "Payment Method Registry must include the locked access rule block.");
    }
  }

  inspectButtonMeaning(filePath, text);

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

  if (/getStatusFilterTone/.test(text) && !/getStatusFilterTone\(/.test(text.replace(/function\s+getStatusFilterTone[\s\S]*?\n}/, ""))) {
    addWarning(filePath, "getStatusFilterTone appears unused. TypeScript may fail with TS6133.");
  }

  if (/variant=["']secondary["'][\s\S]{0,160}>\s*(?:\{[\s\S]*?\}\s*)?Edit/.test(text)) {
    addError(relativePath, "Edit buttons must not be gray/secondary. Use primary for edit actions.");
  }
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
