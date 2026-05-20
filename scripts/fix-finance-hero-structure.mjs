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

for (const file of walk(FINANCE)) {
  let s = fs.readFileSync(file, "utf8");
  const before = s;

  // Fix hero self-close + metrics outside
  s = s.replace(
    /(<AixiaHero[\s\S]*?)\s*\/>\s*\n\s*<FinanceHubMetrics items=\{([^}]+)\} \/>\s*\n\s*<div className="aixia-command-scroll">/g,
    "$1>\n        <FinanceHubMetrics items={$2} />\n      </AixiaHero>\n\n      <div className=\"aixia-command-scroll\">"
  );

  // Fix numeric flow metrics
  s = s.replace(/value: String\(0(\d)\)/g, 'value: "0$1"');
  s = s.replace(/, 0(\d)\]/g, ', "$0$1"]');

  // title Registry -> match gradientTitle when alone
  s = s.replace(
    /gradientTitle="([^"]+)"\s*\n\s*title="Registry"/g,
    'gradientTitle="$1"\n        title="$1"'
  );

  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log("fixed", path.relative(ROOT, file));
  }
}
