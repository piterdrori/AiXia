import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE = path.join(ROOT, "src", "app", "finance");

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name === "page.tsx" ? [p] : [];
  });
}

for (const file of walk(FINANCE)) {
  let s = fs.readFileSync(file, "utf8");
  const o = s;
  if (!s.includes("AixiaPage") && !s.includes("<FinancePage")) continue;
  s = s.replace(/<AixiaPage\b/g, "<FinancePage");
  s = s.replace(/<\/AixiaPage>/g, "</FinancePage>");
  s = s.replace(/\bAixiaPage,/g, "FinancePage,");
  if (s.includes("FinancePage") && !s.includes("FinanceHubMetrics") && s.includes("FinanceHubMetrics items")) {
    // noop
  }
  if (s !== o) {
    fs.writeFileSync(file, s);
    console.log(path.relative(ROOT, file));
  }
}
