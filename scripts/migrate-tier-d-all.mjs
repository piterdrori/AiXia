import fs from "fs";
import path from "path";

const root = path.resolve("src/app");

function patch(rel, fn) {
  const full = path.join(root, rel);
  const before = fs.readFileSync(full, "utf8");
  const after = fn(before);
  if (after === before) {
    console.warn("[skip]", rel);
  } else {
    fs.writeFileSync(full, after, "utf8");
    console.log("[ok]", rel);
  }
}

function stripOldHeader(s, scrollClass) {
  const marker = "___TIER_D_HEADER_START___";
  const idx = s.indexOf(marker);
  if (idx < 0) return s;
  const scrollIdx = s.indexOf(`<div className="${scrollClass}`, idx);
  if (scrollIdx < 0) return s;
  return s.slice(0, idx) + s.slice(scrollIdx);
}

function closeCommandPage(s) {
  return s
    .replace(/\s*<\/div>\s*<\/motion.div>\s*<\/div>\s*\);\s*\n\}/, "\n    </AixiaPage>\n  );\n}")
    .replace(/\s*<\/motion.div>\s*<\/div>\s*<\/div>\s*\);\s*\n\}/, "\n    </AixiaPage>\n  );\n}")
    .replace(/\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\n\}/, "\n    </AixiaPage>\n  );\n}");
}

// calendar/new
patch("calendar/new/page.tsx", (s) => {
  if (s.includes("AixiaPage")) return s;
  s = s.replace(
    `<div className="aixia-dash-page aixia-dash-page--command aixia-calendar-page aixia-calendar-page--new h-full flex flex-col overflow-hidden">
      <div className="aixia-dash-3d-decor" aria-hidden>
        <span className="aixia-dash-orb aixia-dash-orb--a" />
        <span className="aixia-dash-orb aixia-dash-orb--b" />
        <span className="aixia-dash-orb aixia-dash-orb--c" />
      </div>
      <div className="aixia-dash-3d-stack flex min-h-0 flex-1 flex-col">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`,
    `<AixiaPage
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
            <RefreshCw className={\`mr-2 h-4 w-4 \${isRefreshing ? "animate-spin" : ""}\`} />
            {isRefreshing ? t("calendarNew.buttons.refreshing") : t("calendarNew.buttons.refresh")}
          </Button>
        }
      />
      <motion.div className="aixia-command-scroll flex min-h-0 flex-1 flex-col ___TIER_D_HEADER_START___">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`
  );
  s = stripOldHeader(s, "aixia-calendar-scroll");
  s = s.replace('<div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  s = closeCommandPage(s);
  return s;
});

// calendar/edit
patch("calendar/[id]/edit/page.tsx", (s) => {
  if (s.includes("surface=\"command\"") && s.includes("AixiaPage")) return s;
  s = s.replace(
    `<div className="aixia-dash-page aixia-dash-page--command aixia-calendar-page aixia-calendar-page--edit h-full flex flex-col overflow-hidden">
      <div className="aixia-dash-3d-decor" aria-hidden>
        <span className="aixia-dash-orb aixia-dash-orb--a" />
        <span className="aixia-dash-orb aixia-dash-orb--b" />
        <span className="aixia-dash-orb aixia-dash-orb--c" />
      </div>
      <div className="aixia-dash-3d-stack flex min-h-0 flex-1 flex-col">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`,
    `<AixiaPage
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
            <RefreshCw className={\`mr-2 h-4 w-4 \${isRefreshing ? "animate-spin" : ""}\`} />
            {isRefreshing ? t("calendarEdit.buttons.refreshing") : t("calendarEdit.buttons.refresh")}
          </Button>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col ___TIER_D_HEADER_START___">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`
  );
  s = stripOldHeader(s, "aixia-calendar-scroll");
  s = s.replace('<div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  s = closeCommandPage(s);
  return s;
});

console.log("calendar batch done");
