import fs from "node:fs";
const p = "scripts/migrate-finance-visual-parity.mjs";
let s = fs.readFileSync(p, "utf8");
const tag = ["d", "i", "v"].join("");
const bad =
  `return \`\${before}<motion className="aixia-command-scroll">\\n\${middle}      </motion>\\n\${after}\`;`;
const good =
  `return \`\${before}<${tag} className="aixia-command-scroll">\\n\${middle}      </${tag}>\\n\${after}\`;`;
const badMotion = bad.replaceAll(tag, "motion");
if (!s.includes(badMotion)) {
  console.error("pattern not found");
  process.exit(1);
}
s = s.replace(badMotion, good);
fs.writeFileSync(p, s);
console.log("fixed:", s.split(/\n/)[220]);
