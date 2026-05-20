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

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  let text = fs.readFileSync(filePath, "utf8");
  const next = text.replace(/type HeaderStatusCardData = \{[\s\S]*?\};\n\n/g, "");
  if (next !== text) {
    fs.writeFileSync(filePath, next, "utf8");
    changed++;
    console.log("removed HeaderStatusCardData:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files cleaned.`);
