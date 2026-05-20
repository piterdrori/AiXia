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

function removeUseMemoBlock(text, varName) {
  const marker = `const ${varName} = useMemo`;
  let idx = text.indexOf(marker);
  if (idx === -1) return text;

  const lineStart = text.lastIndexOf("\n", idx) + 1;
  let i = text.indexOf("(", idx);
  if (i === -1) return text;

  let paren = 1;
  i++;
  while (i < text.length && paren > 0) {
    if (text[i] === "(") paren++;
    else if (text[i] === ")") paren--;
    i++;
  }

  while (i < text.length && /[\s;]/.test(text[i])) i++;
  if (text[i] === ";") i++;

  return text.slice(0, lineStart) + text.slice(i);
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.includes("const headerStatusCards")) continue;
  if (/statusCards=\{/.test(text)) continue;

  const refs = (text.match(/\bheaderStatusCards\b/g) || []).length;
  if (refs <= 1) {
    const next = removeUseMemoBlock(text, "headerStatusCards");
    if (next !== text) {
      fs.writeFileSync(filePath, next, "utf8");
      changed++;
      console.log("removed headerStatusCards:", path.relative(ROOT, filePath));
    }
  }
}
console.log(`Done. ${changed} files cleaned.`);
