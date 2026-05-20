#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE_APP = path.join(ROOT, "src", "app", "finance");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

function repair(text) {
  text = text.replace(
    /^[ \t]*[•·]\s*\$\{([^}]+)\}`\}/gm,
    (match, expr) => {
      const indent = match.match(/^[ \t]*/)[0];
      return `${indent}description={${expr}}`;
    }
  );

  text = text.replace(
    /(\)\s*\}\s*\$\{convertTo\}`\})\s*\n(\s*)`\}\s*\n(\s*\/>)/g,
    "$1\n$3"
  );

  text = text.replace(
    /(\)\s*\}\s*\$\{convertTo\}`\})\s*\n(\s*)`\}\s*\n(\s*\/>)/g,
    "$1\n$3"
  );

  // Remove orphan "`}" line after closed template value
  text = text.replace(
    /(\$\{convertTo\}`\})\s*\n(\s*)`\}\s*\n(\s*\/>)/g,
    "$1\n$3"
  );

  text = text.replace(
    /(\)\s*\}\s*\$\{[^}]+\}`\})\s*\n(\s*)`\}\s*\n/g,
    "$1\n"
  );

  text = text.replace(
    /\[isLoading \? "—" : formatCount\(userRows\.length[^\]]+\]/g,
    "[isLoading, userRows.length, financeTemplateAssignedCount, approveExecuteUserCount, overrideUserCount]"
  );

  text = text.replace(
    /gradientTitle="Finance Access"\s*\n\s*title="Approvals"/g,
    'gradientTitle="Finance Access Approvals"\n        title="Finance Access Approvals"'
  );

  // Close command-scroll before FinancePage when missing
  text = text.replace(
    /(<div className="aixia-command-scroll">[\s\S]*?)(\n\s*<\/FinancePage>)/g,
    (block, inner, close) => {
      if (/<\/div>\s*\n\s*<\/FinancePage>/.test(block)) return block;
      return `${inner}\n      </div>${close}`;
    }
  );

  return text;
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  const original = fs.readFileSync(filePath, "utf8");
  const fixed = repair(original);
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, "utf8");
    changed++;
    console.log("repaired:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files repaired.`);
