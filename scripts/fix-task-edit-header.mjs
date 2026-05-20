import fs from "fs";

const p = "src/app/tasks/[id]/edit/page.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("<Button HIDDEN");
const end = s.indexOf('<motion.div className="aixia-tasks-scroll');
const endAlt = s.indexOf('<div className="aixia-tasks-scroll');
const cutEnd = end >= 0 ? end : endAlt;
if (start < 0 || cutEnd < 0) {
  console.error("markers not found", { start, cutEnd });
  process.exit(1);
}
s = s.slice(0, start) + s.slice(cutEnd);
fs.writeFileSync(p, s);
console.log("fixed", cutEnd - start, "chars removed");
