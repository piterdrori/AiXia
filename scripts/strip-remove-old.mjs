import fs from "fs";

for (const p of [
  "src/app/calendar/new/page.tsx",
  "src/app/calendar/[id]/edit/page.tsx",
]) {
  let s = fs.readFileSync(p, "utf8");
  const start = s.indexOf(" REMOVE_OLD");
  const end = s.indexOf('<div className="aixia-calendar-scroll');
  if (start < 0) {
    console.log("no REMOVE_OLD in", p);
    continue;
  }
  if (end < 0) {
    console.log("no scroll in", p);
    continue;
  }
  s =
    s.slice(0, start) +
    '">' +
    s.slice(end + '<motion.div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">'.length);
  s = s.replace('<div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  s = s.replace(
    /        <\/div>\s*      <\/div>\s*    <\/div>\s*  \);$/,
    `      </div>
    </AixiaPage>
  );`
  );
  fs.writeFileSync(p, s);
  console.log("fixed", p);
}
