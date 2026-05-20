#!/usr/bin/env node
/**
 * Remove corrupted __registryCommandMetrics blocks injected by a bad migration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  "src/app/finance/master-data/vendors/[id]/page.tsx",
  "src/app/finance/master-data/vendors/new/page.tsx",
  "src/app/finance/transactions/expenses/new/page.tsx",
  "src/app/finance/transactions/expenses/page.tsx",
  "src/app/finance/transactions/expenses-payments-made/[id]/page.tsx",
  "src/app/finance/transactions/expenses-payments-made/funding-batches/[id]/page.tsx",
  "src/app/finance/transactions/expenses-payments-made/funding-batches/new/page.tsx",
  "src/app/finance/transactions/expenses-payments-made/new/page.tsx",
  "src/app/finance/transactions/payroll/[id]/page.tsx",
  "src/app/finance/transactions/payroll/funding-batches/[id]/page.tsx",
  "src/app/finance/transactions/payroll/funding-batches/new/page.tsx",
  "src/app/finance/transactions/payroll/new/page.tsx",
  "src/app/finance/transactions/payroll/page.tsx",
  "src/app/finance/transactions/payroll/review/[id]/page.tsx",
];

function stripBlock(source, startMarker) {
  let result = source;
  while (true) {
    const start = result.indexOf(startMarker);
    if (start === -1) break;
    const open = result.indexOf("(", start);
    if (open === -1) break;
    let depth = 0;
    let i = open;
    while (i < result.length) {
      if (result[i] === "(") depth++;
      else if (result[i] === ")") {
        depth--;
        if (depth === 0) {
          i++;
          while (i < result.length && /[\s;]/.test(result[i])) i++;
          if (result[i] === ",") i++;
          while (i < result.length && /[\s\n]/.test(result[i])) i++;
          break;
        }
      }
      i++;
    }
    result = result.slice(0, start) + result.slice(i);
  }
  return result;
}

function repairFile(relPath) {
  const abs = path.join(ROOT, relPath);
  let source = fs.readFileSync(abs, "utf8");
  const original = source;

  source = stripBlock(source, "const __registryCommandMetrics = useMemo");
  source = source.replace(
    /\s*<AixiaCommandMetrics items=\{__registryCommandMetrics\} \/?>\s*/g,
    "\n"
  );
  source = source.replace(/,\s*\n\s*,/g, ",\n");
  source = source.replace(/(\{\s*)\n\s*,/g, "$1");
  source = source.replace(/,\s*\n\s*AixiaCommandMetrics/g, ",\n  AixiaCommandMetrics");

  if (source !== original) {
    fs.writeFileSync(abs, source, "utf8");
    console.log("repaired", relPath);
  }
}

for (const rel of TARGETS) repairFile(rel);
