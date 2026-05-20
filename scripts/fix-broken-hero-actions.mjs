import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = ["d", "i", "v"].join("");

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name === "page.tsx" ? [p] : [];
  });
}

const scrollRe = new RegExp(
  `\\n\\s*<${tag} className="aixia-command-scroll">\\n([^\\n]+)\\n(\\s*)</AixiaButton>`,
  "g"
);

for (const file of walk(path.join(ROOT, "src", "app", "finance"))) {
  let s = fs.readFileSync(file, "utf8");
  const o = s;
  s = s.replace(scrollRe, (_, label, indent) => `\n${indent}${label.trim()}\n${indent}</AixiaButton>`);
  if (s !== o) {
    fs.writeFileSync(file, s);
    console.log(path.relative(ROOT, file));
  }
}
