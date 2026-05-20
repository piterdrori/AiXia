/**
 * Repair broken __registryCommandMetrics blocks from migrate-finance-metrics-to-hero.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE = path.join(ROOT, "src", "app", "finance");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name === "page.tsx") out.push(p);
  }
  return out;
}

function extractDeps(body) {
  const deps = new Set();
  const valueRegex = /value: (?:String\(([^)]+)\)|"([^"]+)")/g;
  let match;
  while ((match = valueRegex.exec(body))) {
    const expr = match[1] ?? match[2];
    if (!expr) continue;
    const tokens = expr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [];
    for (const token of tokens) {
      if (
        ![
          "String",
          "formatCount",
          "toLocaleString",
          "formatFinanceMoney",
          "true",
          "false",
          "null",
          "undefined",
        ].includes(token)
      ) {
        deps.add(token);
      }
    }
  }
  return [...deps];
}

function repairFile(source) {
  if (!source.includes("__registryCommandMetrics")) return source;

  source = source.replace(/,\s*,\s*\n\s*AixiaCommandMetrics/g, ",\n  AixiaCommandMetrics");

  source = source.replace(
    /const __registryCommandMetrics = useMemo\(\s*\(\) => \[([\s\S]*?)\],\s*\[[\s\S]*?\]\s*\);/g,
    (full, body) => {
      let fixedBody = body;
      fixedBody = fixedBody.replace(
        /subtitle: ([^"{\n][^,]*?),(\s*icon:)/g,
        (_, text, tail) => `subtitle: "${text.trim().replace(/"/g, '\\"')}",${tail}`
      );
      fixedBody = fixedBody.replace(/value: String\(0(\d)\)/g, 'value: "0$1"');
      const deps = extractDeps(fixedBody);
      return `const __registryCommandMetrics = useMemo(
    () => [${fixedBody}
    ],
    [${deps.join(", ")}]
  );`;
    }
  );

  return source;
}

let repaired = 0;
for (const file of walk(FINANCE)) {
  const before = fs.readFileSync(file, "utf8");
  const after = repairFile(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    repaired += 1;
    console.log("repaired", path.relative(ROOT, file));
  }
}
console.log(`Repaired ${repaired} files`);
