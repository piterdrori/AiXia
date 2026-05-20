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

const UNUSED_STATE_VARS = [
  "isRefreshing",
  "isBackgroundRefreshing",
  "backgroundRefreshing",
  "isRefreshingOptions",
];

function setterName(varName) {
  return `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  let text = fs.readFileSync(filePath, "utf8");
  let fileChanged = false;

  for (const varName of UNUSED_STATE_VARS) {
    const setter = setterName(varName);
    const declPattern = new RegExp(`const \\[_?${varName},\\s*${setter}\\]`);
    if (!declPattern.test(text)) continue;

    const usage = new RegExp(`\\b_?${varName}\\b`, "g");
    const matches = text.match(usage) || [];
    if (matches.length > 1) continue;

    text = text.replace(declPattern, `const [, ${setter}]`);
    fileChanged = true;
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, text, "utf8");
    changed++;
    console.log("omitted unused state slot:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files updated.`);
