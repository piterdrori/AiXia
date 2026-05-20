import fs from "fs";

function patchProjectsDetail() {
  const p = "src/app/projects/[id]/page.tsx";
  let s = fs.readFileSync(p, "utf8");

  if (!s.includes('from "@/components/aixia"')) {
    s = s.replace(
      'import { getProjectCardTitle } from "@/lib/projects/display";',
      'import { getProjectCardTitle } from "@/lib/projects/display";\nimport { AixiaHero, AixiaPage } from "@/components/aixia";'
    );
  }
  s = s.replace(/\s*ArrowLeft,\n/, "\n");

  const heroActions = `actions={
              <>
              <Button
            variant="outline"
            className="aixia-dash-action h-9"
            onClick={() => void loadProjectPage("refresh")}
            disabled={isRefreshing}
          >
            <RefreshCw className={\`h-4 w-4 mr-2 \${isRefreshing ? "animate-spin" : ""}\`} />
            {isRefreshing
              ? t("projects.refreshing", "Refreshing...")
              : t("projects.refresh", "Refresh")}
          </Button>

          {canGenerateReports && (
            <Button
              variant="outline"
              className="aixia-dash-action h-9"
              onClick={() => setIsReportsDialogOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("projects.reports", "Reports")}
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              className="aixia-dash-action h-9"
              onClick={() => navigate(\`/projects/\${project.id}/edit\`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("projects.edit", "Edit")}
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              className="aixia-dash-action h-9"
              onClick={() => navigate(\`/projects/\${project.id}/task-fields\`)}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {t("projects.taskFields.link", "Task fields")}
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              className="aixia-dash-action aixia-dash-action--danger h-9"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting
                ? t("projects.deleting", "Deleting...")
                : t("projects.delete", "Delete")}
            </Button>
          )}
              </>
            }`;

  const oldMainOpen = `  return (
    <div className="aixia-dash-page aixia-dash-page--command aixia-projects-page h-full flex flex-col overflow-hidden">
      <motion.div className="aixia-dash-3d-decor" aria-hidden>
        <span className="aixia-dash-orb aixia-dash-orb--a" />
        <span className="aixia-dash-orb aixia-dash-orb--b" />
        <span className="aixia-dash-orb aixia-dash-orb--c" />
      </motion.div>
      <div className="aixia-dash-3d-stack flex min-h-0 flex-1 flex-col">
        <header className="aixia-dash-hero aixia-dash-glass aixia-dash-3d-hero shrink-0">
          <div className="aixia-projects-detail-hero-inner aixia-projects-detail-hero">`;

  const oldMainOpen2 = oldMainOpen
    .replace("aixia-projects-detail-hero-inner", "aixia-dash-hero-inner aixia-projects-detail-hero")
    .replace("<motion.div", "<motion.div")
    .replace("      <motion.div className=\"aixia-dash-3d-decor\"", "      <div className=\"aixia-dash-3d-decor\"");

  const marker = "___PROJECT_DETAIL_MAIN___";
  const idx = s.indexOf("  return (\n    <div className=\"aixia-dash-page aixia-dash-page--command aixia-projects-page");
  if (idx < 0) {
    console.error("projects detail main return not found");
    return;
  }

  const headerEnd = s.indexOf("        </header>", idx);
  const scrollStart = s.indexOf("        <div className=\"aixia-projects-scroll", headerEnd);
  if (headerEnd < 0 || scrollStart < 0) {
    console.error("projects markers", headerEnd, scrollStart);
    return;
  }

  const tabsListStart = s.indexOf("            <Tabs value={activeTab}", scrollStart);
  const tabsListEnd = s.indexOf("        </TabsList>", tabsListStart) + "        </TabsList>".length;

  const tabsListBlock = s.slice(tabsListStart, tabsListEnd);

  const newMain = `  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-projects-page h-full flex flex-col overflow-hidden"
      scrollClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <AixiaHero
          surface="command"
          className="shrink-0"
          parentLabel={t("projects.projectsTitle", "Projects")}
          parentPath="/projects"
          gradientTitle={t("projects.projectsTitle", "Projects")}
          title={projectCardTitle}
          subtitle={projectHeroDescription || undefined}
          ${heroActions}
        >
${tabsListBlock.replace("            <Tabs value={activeTab} onValueChange={setActiveTab} className=\"flex min-h-0 flex-1 flex-col\">\n", "").replace(/^\s{12}/gm, "          ")}
        </AixiaHero>

        <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col gap-4">`;

  s = s.slice(0, idx) + newMain + s.slice(scrollStart + '        <div className="aixia-projects-scroll flex flex-col gap-4">'.length);

  // Remove old header from... already skipped by slice

  // Remove Tabs wrapper and TabsList from scroll (already extracted)
  s = s.replace(
    /\n            <Tabs value=\{activeTab\} onValueChange=\{setActiveTab\} className="flex min-h-0 flex-1 flex-col">\n        <TabsList[\s\S]*?        <\/TabsList>\n\n/,
    "\n"
  );

  // Fix closing: </Tabs>\n        </motion.div>\n      </motion.div>\n    </motion.div>
  s = s.replace(
    /\n      <\/Tabs>\n        <\/div>\n      <\/motion.div>\n    <\/motion.div>\n  \);/,
    "\n      </Tabs>\n    </AixiaPage>\n  );"
  );
  s = s.replace(
    /\n      <\/Tabs>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);/,
    "\n      </Tabs>\n    </AixiaPage>\n  );"
  );

  fs.writeFileSync(p, s);
  console.log("projects detail patched");
}

patchProjectsDetail();
