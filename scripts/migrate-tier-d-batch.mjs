import fs from "fs";
import path from "path";

const root = path.resolve("src/app");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function write(rel, s) {
  fs.writeFileSync(path.join(root, rel), s, "utf8");
  console.log("wrote", rel);
}

function removeBetween(s, startMarker, endMarker) {
  const start = s.indexOf(startMarker);
  const end = s.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    console.error("removeBetween failed", { startMarker: startMarker.slice(0, 40), endMarker: endMarker.slice(0, 40), start, end });
    return s;
  }
  return s.slice(0, start) + s.slice(end);
}

function ensureImport(s, names) {
  if (s.includes('from "@/components/aixia"')) {
    const m = s.match(/import \{([^}]+)\} from "@\/components\/aixia"/);
    if (m) {
      const existing = m[1].split(",").map((x) => x.trim());
      const merged = [...new Set([...existing, ...names])].join(", ");
      return s.replace(m[0], `import { ${merged} } from "@/components/aixia"`);
    }
  }
  const lucideEnd = s.indexOf('from "lucide-react";');
  const insertAt = s.indexOf("\n", lucideEnd) + 1;
  return s.slice(0, insertAt) + `import { ${names.join(", ")} } from "@/components/aixia";\n` + s.slice(insertAt);
}

function removeArrowLeftImport(s) {
  return s.replace(/import \{([^}]*)\} from "lucide-react";/g, (full, inner) => {
    const icons = inner.split(",").map((x) => x.trim()).filter((x) => x && x !== "ArrowLeft");
    return `import { ${icons.join(", ")} } from "lucide-react";`;
  });
}

// calendar/new
{
  let s = read("calendar/new/page.tsx");
  s = ensureImport(s, ["AixiaHero", "AixiaPage"]);
  s = removeArrowLeftImport(s);
  s = s.replace(
    `<div className="aixia-dash-page aixia-dash-page--command aixia-calendar-page aixia-calendar-page--new h-full flex flex-col overflow-hidden">
      <div className="aixia-dash-3d-decor" aria-hidden>
        <span className="aixia-dash-orb aixia-dash-orb--a" />
        <span className="aixia-dash-orb aixia-dash-orb--b" />
        <span className="aixia-dash-orb aixia-dash-orb--c" />
      </motion.div>
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
          <>
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
          </>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col MARKER_OLD_HEADER">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`
  );
  // fix typo if div not motion
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
            <RefreshCw
              className={\`mr-2 h-4 w-4 \${isRefreshing ? "animate-spin" : ""}\`}
            />
            {isRefreshing ? t("calendarNew.buttons.refreshing") : t("calendarNew.buttons.refresh")}
          </Button>
        }
      />
      <motion.div className="aixia-command-scroll flex min-h-0 flex-1 flex-col MARKER_OLD_HEADER">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">`
  );
  s = removeBetween(s, "MARKER_OLD_HEADER", '<div className="aixia-calendar-scroll');
  s = s.replace('<div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">', "");
  s = s.replace(
    `        </div>
      </div>
    </div>
  );
}`,
    `      </div>
    </AixiaPage>
  );
}`
  );
  write("calendar/new/page.tsx", s);
}

console.log("batch partial - run manually for rest");
