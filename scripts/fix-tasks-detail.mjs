import fs from "fs";
const p = "src/app/tasks/[id]/page.tsx";
let s = fs.readFileSync(p, "utf8");

// Remove broken nested hero/header block inside actions
const start = s.indexOf("          <AixiaHero surface=\"command\" className=\"HIDDEN\">");
const end = s.indexOf("          </header>", start);
if (start < 0 || end < 0) {
  console.error("hero block", start, end);
  process.exit(1);
}
const actionsStart = s.indexOf("            actions={\n              <>", start - 200);
const buttonsBlock = `            actions={
              <>
                  <Button
                    variant="outline"
                    className="aixia-dash-action h-9"
                    onClick={() => void loadTaskPage("refresh")}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={\`h-4 w-4 mr-2 \${isRefreshing ? "animate-spin" : ""}\`} />
                    {isRefreshing ? t("taskDetail.actions.refreshing") : t("taskDetail.actions.refresh")}
                  </Button>

          {canEditTask && (
            <Button
              variant="outline"
              onClick={() => navigate(\`/tasks/\${task.id}/edit\`)}
              className="aixia-dash-action h-9"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("taskDetail.actions.edit")}
            </Button>
          )}

                  {canDeleteTask && (
                    <Button
                      variant="outline"
                      onClick={() => void handleSoftDelete()}
                      disabled={deleteSaving}
                      className="aixia-dash-action aixia-dash-action--danger h-9"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("taskDetail.actions.delete")}
                    </Button>
                  )}
                  {canEditTask && isTaskActive(task) && (
                    <Button
                      variant="outline"
                      className="aixia-dash-action h-9"
                      onClick={() => void handleArchive()}
                    >
                      Archive
                    </Button>
                  )}
                  {canEditTask && (isTaskArchived(task) || task.deleted_at) && (
                    <Button
                      variant="outline"
                      className="aixia-dash-action h-9"
                      onClick={() => void handleRestore()}
                    >
                      Restore
                    </Button>
                  )}
              </>
            }`;

// Extract tabs list from scroll area
const tabsListStart = s.indexOf("            <TabsList className=\"aixia-projects-tabs w-full\">", start);
const tabsListEnd = s.indexOf("            </TabsList>", tabsListStart) + "            </TabsList>".length;
const tabsList = s.slice(tabsListStart, tabsListEnd);

const heroClose = `          >
${tabsList}
          </AixiaHero>

          <motion.div className="aixia-command-scroll flex flex-col gap-4 min-h-0 flex-1">`;

s =
  s.slice(0, actionsStart) +
  buttonsBlock +
  "\n" +
  heroClose +
  s.slice(end + "</header>".length);

// Remove duplicate tabs wrapper in scroll
s = s.replace(
  /\n            <Tabs value=\{activeTab\} onValueChange=\{setActiveTab\} className="flex min-h-0 flex-1 flex-col">\n            <TabsList className="aixia-projects-tabs w-full">[\s\S]*?            <\/TabsList>\n\n/,
  "\n"
);

s = s.replace(
  '<div className="aixia-tasks-scroll flex flex-col gap-4 min-h-0 flex-1">',
  ""
);

// Fix closing - find end of main content before dialogs
s = s.replace(
  /          <\/Tabs>\n        <\/div>\n      <\/div>\n    <\/div>/,
  "          </Tabs>\n      </AixiaPage>"
);

s = s.replace(/ArrowLeft/g, "/* ArrowLeft removed */");

fs.writeFileSync(p, s);
console.log("fixed tasks detail");
