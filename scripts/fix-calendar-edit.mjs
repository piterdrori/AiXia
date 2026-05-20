import fs from "fs";
const p = "src/app/calendar/[id]/edit/page.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf(" REMOVE_OLD");
const end = s.indexOf('\n          <Card className="aixia-dash-panel');
if (start < 0 || end < 0) {
  console.error({ start, end });
  process.exit(1);
}
s = s.slice(0, start) + '">' + s.slice(end);
fs.writeFileSync(p, s);
console.log("ok");
