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

for (const file of walk(path.join(ROOT, "src", "app", "finance"))) {
  let s = fs.readFileSync(file, "utf8");
  const badOpen = "<motion className=\"aixia-command-scroll\">";
  const goodOpen = `<${tag} className="aixia-command-scroll">`;
  if (!s.includes(badOpen)) continue;
  s = s.split(badOpen).join(goodOpen);
  s = s.split("</motion>").join(`</${tag}>`);
  fs.writeFileSync(file, s);
  console.log(path.relative(ROOT, file));
}
