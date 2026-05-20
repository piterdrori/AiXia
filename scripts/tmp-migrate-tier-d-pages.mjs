import fs from "fs";
import path from "path";

const root = path.resolve("src/app");

function patch(file, patches) {
  const full = path.join(root, file);
  let s = fs.readFileSync(full, "utf8");
  let changed = false;
  for (const [oldStr, newStr] of patches) {
    if (!s.includes(oldStr)) {
      console.error(`[${file}] MISSING:\n${oldStr.slice(0, 120)}...`);
      continue;
    }
    s = s.replace(oldStr, newStr);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(full, s, "utf8");
    console.log(`[${file}] updated`);
  }
}

// tasks/new
patch("tasks/new/page.tsx", [
  [
    `  return (
    <motion.div className="aixia-dash-page aixia-dash-page--command aixia-tasks-page aixia-tasks-page--new h-full flex flex-col overflow-hidden">
      <div className="aixia-dash-3d-decor" aria-hidden>
        <span className="aixia-dash-orb aixia-dash-orb--a" />
        <span className="aixia-dash-orb aixia-dash-orb--b" />
        <span className="aixia-dash-orb aixia-dash-orb--c" />
      </div>
      <div className="aixia-dash-3d-stack flex min-h-0 flex-1 flex-col">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">
          <div className="aixia-dash-hero-inner">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate(
                    initialParentTaskId
                      ? \`/tasks/\${initialParentTaskId}\`
                      : projectId
                        ? \`/projects/\${projectId}\`
                        : "/tasks"
                  )
                }
                className="aixia-dash-action h-9 w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <motion.div className="min-w-0">
                <p className="aixia-dash-kicker">
                  {t(
                    initialParentTaskId
                      ? "taskNew.kicker.subtasks"
                      : "tasks.header.title",
                    initialParentTaskId ? "Subtasks" : "Tasks"
                  )}
                </p>
                <h1 className="aixia-dash-title--hero">{t("taskNew.header.title")}</h1>
                <p className="aixia-dash-subtitle--hero">
                  {t(
                    initialParentTaskId
                      ? "taskNew.subtitle.addSubtask"
                      : "taskNew.header.subtitle"
                  )}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="aixia-tasks-scroll flex min-h-0 flex-1 flex-col">`,
    `  const taskParentPath = initialParentTaskId
    ? \`/tasks/\${initialParentTaskId}\`
    : projectId
      ? \`/projects/\${projectId}\`
      : "/tasks";
  const taskParentLabel = initialParentTaskId
    ? t("taskNew.kicker.subtasks", "Subtasks")
    : t("tasks.header.title", "Tasks");

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-tasks-page aixia-tasks-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={taskParentLabel}
        parentPath={taskParentPath}
        gradientTitle={taskParentLabel}
        title={t("taskNew.header.title")}
        subtitle={t(
          initialParentTaskId
            ? "taskNew.subtitle.addSubtask"
            : "taskNew.header.subtitle"
        )}
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">`,
  ],
  [
    `          </form>
        </div>
      </div>
    </div>
  );
}`,
    `          </form>
      </motion.div>
    </AixiaPage>
  );
}`,
  ],
]);

console.log("done");
