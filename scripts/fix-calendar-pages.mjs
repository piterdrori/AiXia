import fs from "fs";

function fix(rel, opts) {
  const p = `src/app/${rel}`;
  let s = fs.readFileSync(p, "utf8");

  const headerRe = new RegExp(
    `<div className="aixia-dash-page aixia-dash-page--command ${opts.pageClass}[^"]*">\\s*` +
      `<motion.div className="aixia-dash-3d-decor"[\\s\\S]*?<\\/header>\\s*` +
      `(?:<div className="${opts.oldScrollClass}[^"]*">\\s*)?`,
    "m"
  );

  const hero = opts.heroBlock;
  if (!headerRe.test(s)) {
    // try without optional scroll
    const headerRe2 = new RegExp(
      `<motion.div className="aixia-dash-page aixia-dash-page--command ${opts.pageClass}[^"]*">\\s*` +
        `<div className="aixia-dash-3d-decor"[\\s\\S]*?<\\/header>\\s*`,
      "m"
    );
    if (!headerRe2.test(s)) {
      console.error("no match", rel);
      return;
    }
    s = s.replace(headerRe2, hero);
  } else {
    s = s.replace(headerRe, hero);
  }

  s = s.replace(
    /<div className="aixia-dash-page aixia-dash-page--command/g,
    "<!--REMOVED-->"
  );

  // fix broken partial migrations
  s = s.replace(/<div className="aixia-dash-page aixia-dash-page--command[^>]*>[\s\S]*?<header className="aixia-dash-hero[\s\S]*?<\/header>\s*/m, hero);

  fs.writeFileSync(p, s);
  console.log("patched", rel, s.includes("AixiaPage") && s.includes("surface=\"command\""));
}

// Simpler: line-based removal for calendar new
function fixCalendarNew() {
  const p = "src/app/calendar/new/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  const start = s.indexOf('  return (\n    <div className="aixia-dash-page');
  const heroEnd = s.indexOf('<div className="aixia-calendar-scroll');
  if (start < 0 || heroEnd < 0) {
    console.error("calendar/new markers", start, heroEnd);
    return;
  }
  const hero = `  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page aixia-calendar-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={t("calendar.header.title", "Calendar")}
        parentPath="/calendar"
        gradientTitle={t("calendar.header.title", "Calendar")}
        title={t("calendarNew.header.title")}
        subtitle={t("calendarNew.header.subtitle")}
        actions={
          <Button
            type="button"
            variant="outline"
            className="aixia-dash-action h-9"
            onClick={() => void loadPage("refresh")}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={\`mr-2 h-4 w-4 \${isRefreshing ? "animate-spin" : ""}\`}
            />
            {isRefreshing ? t("calendarNew.buttons.refreshing") : t("calendarNew.buttons.refresh")}
          </Button>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
`;
  s = s.slice(0, start) + hero + s.slice(heroEnd);
  s = s.replace('<motion.div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  s = s.replace(
    /        <\/div>\s*      <\/div>\s*    <\/motion.div>\s*  \);/,
    `      </div>
    </AixiaPage>
  );`
  );
  s = s.replace(
    /        <\/div>\s*      <\/div>\s*    <\/div>\s*  \);/,
    `      </div>
    </AixiaPage>
  );`
  );
  fs.writeFileSync(p, s);
  console.log("calendar/new", s.includes("</AixiaPage>"));
}

function fixCalendarEdit() {
  const p = "src/app/calendar/[id]/edit/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  const start = s.indexOf('  return (\n    <div className="aixia-dash-page');
  const heroEnd = s.indexOf('<div className="aixia-calendar-scroll');
  if (start < 0 || heroEnd < 0) {
    console.error("calendar/edit markers", start, heroEnd);
    return;
  }
  const hero = `  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page aixia-calendar-page--edit h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={t("calendar.header.title", "Calendar")}
        parentPath="/calendar"
        gradientTitle={t("calendar.header.title", "Calendar")}
        title={t("calendarEdit.header.title")}
        subtitle={t("calendarEdit.header.subtitle")}
        actions={
          <Button
            type="button"
            variant="outline"
            className="aixia-dash-action h-9"
            onClick={() => void loadPage("refresh")}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={\`mr-2 h-4 w-4 \${isRefreshing ? "animate-spin" : ""}\`}
            />
            {isRefreshing ? t("calendarEdit.buttons.refreshing") : t("calendarEdit.buttons.refresh")}
          </Button>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
`;
  s = s.slice(0, start) + hero + s.slice(heroEnd);
  s = s.replace('<div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  // remove duplicate closing if broken
  s = s.replace(/\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/AixiaPage>/, "\n    </AixiaPage>");
  if (!s.trimEnd().endsWith("}")) {
    console.error("bad end");
  }
  fs.writeFileSync(p, s);
  console.log("calendar/edit", s.includes("AixiaHero"));
}

fixCalendarNew();
fixCalendarEdit();
