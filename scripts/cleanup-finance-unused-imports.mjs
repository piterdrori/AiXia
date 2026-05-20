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

function removeUnusedNamedImports(text) {
  const importRes = [
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+("(?:lucide-react|@\/components\/aixia)";)/g,
    /import\s+type\s+\{\s*([^}]+)\s*\}\s+from\s+("lucide-react";)/g,
  ];

  for (const importRe of importRes) {
    text = text.replace(importRe, (full, inner, fromClause) => {
      const entries = inner.split(",").map((part) => part.trim()).filter(Boolean);
      const kept = entries.filter((entry) => {
        const name = entry.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (!name) return false;
        const usage = new RegExp(`\\b${name}\\b`, "g");
        const matches = text.match(usage) || [];
        return matches.length > 1;
      });

      if (kept.length === entries.length) return full;
      if (kept.length === 0) return "";
      const isTypeOnly = full.startsWith("import type");
      return isTypeOnly
        ? `import type { ${kept.join(", ")} } from ${fromClause}`
        : `import { ${kept.join(", ")} } from ${fromClause}`;
    });
  }

  return text;
}

function removeHeaderStatusType(text) {
  return text.replace(/\ntype HeaderStatusCardData = \{[\s\S]*?\};\n/g, "\n");
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  const original = fs.readFileSync(filePath, "utf8");
  let text = removeHeaderStatusType(original);
  text = removeUnusedNamedImports(text);
  text = text.replace(/\n{3,}/g, "\n\n");
  if (text !== original) {
    fs.writeFileSync(filePath, text, "utf8");
    changed++;
    console.log("cleaned imports:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files cleaned.`);
