import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { canPerform, canDeleteProject as canDeleteProjectPermission } from "@/lib/permissions";

import { useRequest } from "@/lib/useRequest";

import { useAppClock } from "@/lib/clock/provider";
import { AixiaButton, AixiaCommandMetrics, AixiaHero, AixiaPage, AixiaWorkspaceCard } from "@/components/aixia";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

import {
  getProjectCardDescription,
  getProjectCardTitle,
} from "@/lib/projects/display";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";

type Role = "admin" | "manager" | "employee" | "guest";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  role: Role;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();
  const clock = useAppClock();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "MINE" | "COMPLETED">("ALL");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const projectsRequest = useRequest<ProjectRow[]>();
const loadProjects = async () => {
  const requestId = requestTracker.current.next();

  try {
    const result = await projectsRequest.run(async () => {
     const session = await supabase.auth.getSession();
const user = session.data.session?.user;

      if (!requestTracker.current.isLatest(requestId)) return [];

      if (!user) {
        navigate("/login");
        return [];
      }

      setCurrentUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return [];

      if (profileError) {
        throw new Error(
          profileError.message ||
            t("projects.failedToLoadProfile", "Failed to load profile.")
        );
      }

      const currentProfile = (profileData as ProfileRow | null) || null;
      const userRole = currentProfile?.role || null;
      setCurrentUserRole(userRole);

      if (userRole === "admin") {
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select(
            "id, name, description, status, progress, created_by, start_date, end_date, created_at"
          )
          .order("created_at", { ascending: false });

        if (!requestTracker.current.isLatest(requestId)) return [];

        if (projectsError) {
          throw new Error(
            projectsError.message ||
              t("projects.failedToLoadProjects", "Failed to load projects.")
          );
        }

        return (projectsData || []) as ProjectRow[];
      }

            const { data: memberRows, error: membersError } = await supabase
        .from("project_members")
        .select("project_id, user_id")
        .eq("user_id", user.id);

      if (!requestTracker.current.isLatest(requestId)) return [];

      if (membersError) {
        throw new Error(
          membersError.message ||
            t(
              "projects.failedToLoadProjectMemberships",
              "Failed to load project memberships."
            )
        );
      }

      const visibleProjectIds = Array.from(
        new Set(
          ((memberRows as ProjectMemberRow[] | null) || []).map(
            (row) => row.project_id
          )
        )
      );

      const projectsQuery =
        visibleProjectIds.length > 0
          ? supabase
              .from("projects")
              .select(
                "id, name, description, status, progress, created_by, start_date, end_date, created_at"
              )
              .or(`created_by.eq.${user.id},id.in.(${visibleProjectIds.join(",")})`)
          : supabase
              .from("projects")
              .select(
                "id, name, description, status, progress, created_by, start_date, end_date, created_at"
              )
              .eq("created_by", user.id);

      const { data: projectsData, error: projectsError } = await projectsQuery.order(
        "created_at",
        { ascending: false }
      );

      if (!requestTracker.current.isLatest(requestId)) return [];

      if (projectsError) {
        throw new Error(
          projectsError.message ||
            t("projects.failedToLoadProjects", "Failed to load projects.")
        );
      }

      return (projectsData || []) as ProjectRow[];
    });

    if (requestTracker.current.isLatest(requestId)) {
      setProjects(result || []);
    }
  } catch (error) {
    if (!requestTracker.current.isLatest(requestId)) return;
    console.error("Projects page load error:", error);
    setProjects([]);
  }
};

  useEffect(() => {
  void loadProjects();
}, []);

  const canCreateProjects = currentUserRole
  ? canPerform(currentUserRole, "createProjects")
  : false;

const canDeleteProject = (project: ProjectRow) => {
  if (!currentUserId || !currentUserRole) return false;

  return canDeleteProjectPermission(
    project,
    currentUserId,
    currentUserRole
  );
};

  const filteredProjects = useMemo(() => {
    return [...projects]
      .filter((project) => {
        const name = (project.name || "").toLowerCase();
        const description = (project.description || "").toLowerCase();
        const query = searchQuery.toLowerCase();

        const matchesSearch = name.includes(query) || description.includes(query);
        const matchesStatus =
          statusFilter === "ALL" || (project.status || "").toUpperCase() === statusFilter;

        let matchesTab = true;

if (activeTab === "ACTIVE") {
  matchesTab = (project.status || "").toUpperCase() === "ACTIVE";
} else if (activeTab === "COMPLETED") {
  matchesTab = (project.status || "").toUpperCase() === "COMPLETED";
} else if (activeTab === "MINE") {
  matchesTab = project.created_by === currentUserId;
}

return matchesSearch && matchesStatus && matchesTab;
      })
      .sort((a, b) => {
  const priorityDiff = getPriorityScore(b) - getPriorityScore(a);
  if (priorityDiff !== 0) return priorityDiff;

  switch (sortBy) {
    case "newest":
      return clock.shiftDate(b.created_at).getTime() - clock.shiftDate(a.created_at).getTime();
    case "oldest":
      return clock.shiftDate(a.created_at).getTime() - clock.shiftDate(b.created_at).getTime();
    case "name":
      return a.name.localeCompare(b.name);
    case "progress":
      return (b.progress || 0) - (a.progress || 0);
    default:
      return 0;
  }
});
  }, [projects, searchQuery, statusFilter, sortBy, activeTab, currentUserId, pinnedIds]);

  const kpi = useMemo(() => {
  const total = projects.length;
  let active = 0;
  let completed = 0;
  let overdue = 0;

  const now = Date.now();

  for (const p of projects) {
    const status = (p.status || "").toUpperCase();

    if (status === "ACTIVE") active++;
    if (status === "COMPLETED") completed++;

    if (p.end_date) {
      const end = new Date(p.end_date).getTime();
      if (end < now && status !== "COMPLETED") {
        overdue++;
      }
    }
  }

  return { total, active, completed, overdue };
}, [projects]);

  const projectMetricItems = useMemo(
    () => [
      { key: "total", title: "Total", value: String(kpi.total), icon: FolderKanban, tone: "indigo" as const },
      { key: "active", title: "Active", value: String(kpi.active), icon: Activity, tone: "emerald" as const },
      { key: "completed", title: "Completed", value: String(kpi.completed), icon: CheckCircle2, tone: "violet" as const },
      { key: "overdue", title: "Overdue", value: String(kpi.overdue), icon: AlertTriangle, tone: "rose" as const },
    ],
    [kpi]
  );

  const getStatusPillClass = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return "aixia-projects-pill--active";
      case "PLANNING":
        return "aixia-projects-pill--planning";
      case "ON_HOLD":
        return "aixia-projects-pill--on-hold";
      case "COMPLETED":
        return "aixia-projects-pill--completed";
      case "CANCELLED":
        return "aixia-projects-pill--cancelled";
      default:
        return "aixia-projects-pill--planning";
    }
  };
  
  const getStatusLabel = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return t("projects.statusActive", "Active");
      case "PLANNING":
        return t("projects.statusPlanning", "Planning");
      case "ON_HOLD":
        return t("projects.statusOnHold", "On Hold");
      case "COMPLETED":
        return t("projects.statusCompleted", "Completed");
      case "CANCELLED":
        return t("projects.statusCancelled", "Cancelled");
      default:
        return t("projects.statusUnknown", "Unknown");
    }
  };

  function getUrgency(project: ProjectRow) {
  if (!project.end_date) return null;

  const now = Date.now();
  const end = new Date(project.end_date).getTime();
  const diffDays = (end - now) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= 3) return "SOON";

  return null;
}

function getProjectWorkspaceTone(status: string | null, urgency: ReturnType<typeof getUrgency>) {
  if (urgency === "OVERDUE") return "rose" as const;
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "emerald" as const;
    case "COMPLETED":
      return "violet" as const;
    case "ON_HOLD":
      return "amber" as const;
    case "CANCELLED":
      return "rose" as const;
    default:
      return "cyan" as const;
  }
}

function getPriorityScore(project: ProjectRow) {
  let score = 0;

  // PINNED
  if (pinnedIds.includes(project.id)) score += 10000;

  // URGENT
  if (project.end_date) {
    const now = Date.now();
    const end = new Date(project.end_date).getTime();
    const diffDays = (end - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) score += 500;
    else if (diffDays <= 3) score += 300;
  }

  // RECENT
  const created = new Date(project.created_at).getTime();
  score += created / 1_000_000_000;

  return score;
}

  const handleDelete = async (projectId: string) => {
    const confirmed = window.confirm(
      t("projects.deleteProjectConfirm", "Are you sure you want to delete this project?")
    );
    if (!confirmed) return;

    const previousProjects = projects;
    setProjects((prev) => prev.filter((project) => project.id !== projectId));

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      console.error("Delete project error:", error);
      setProjects(previousProjects);
      alert(error.message || t("projects.failedToDeleteProject", "Failed to delete project"));
    }
  };

    return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-projects-page"
    >
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        gradientTitle={t("projects.projectsTitle", "Projects")}
        title={t("projects.projectsTitle", "Projects")}
        subtitle={t("projects.projectsSubtitle", "Manage and track your projects")}
        actions={
          <>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => void loadProjects()}
              disabled={projectsRequest.status === "loading"}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${projectsRequest.status === "loading" ? "animate-spin" : ""}`}
              />
              {projectsRequest.status === "loading"
                ? t("projects.refreshing", "Refreshing...")
                : t("projects.refresh", "Refresh")}
            </AixiaButton>

            {canCreateProjects ? (
              <AixiaButton
                variant="primary"
                type="button"
                className="h-9"
                onClick={() => navigate("/projects/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("projects.newProject", "New Project")}
              </AixiaButton>
            ) : null}
          </>
        }
      >
        <AixiaCommandMetrics items={projectMetricItems} />

        <div className="aixia-command-tabs">
          {[
            { key: "ALL", label: "All" },
            { key: "ACTIVE", label: "Active" },
            { key: "MINE", label: "My Projects" },
            { key: "COMPLETED", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`aixia-command-tab ${
                activeTab === tab.key ? "aixia-command-tab--active" : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="aixia-command-toolbar">
          <div className="relative flex-1 min-w-[12rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aixia-projects-muted" />
            <Input
              placeholder={t("projects.searchProjectsPlaceholder", "Search projects...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 aixia-projects-input"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 aixia-projects-select-trigger">
              <SelectValue placeholder={t("projects.status", "Status")} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className="aixia-projects-select-content"
            >
              <SelectItem value="ALL">{t("projects.allStatus", "All Status")}</SelectItem>
              <SelectItem value="PLANNING">{t("projects.statusPlanning", "Planning")}</SelectItem>
              <SelectItem value="ACTIVE">{t("projects.statusActive", "Active")}</SelectItem>
              <SelectItem value="ON_HOLD">{t("projects.statusOnHold", "On Hold")}</SelectItem>
              <SelectItem value="COMPLETED">{t("projects.statusCompleted", "Completed")}</SelectItem>
              <SelectItem value="CANCELLED">{t("projects.statusCancelled", "Cancelled")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 aixia-projects-select-trigger">
              <SelectValue placeholder={t("projects.sortBy", "Sort by")} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className="aixia-projects-select-content"
            >
              <SelectItem value="newest">{t("projects.newestFirst", "Newest First")}</SelectItem>
              <SelectItem value="oldest">{t("projects.oldestFirst", "Oldest First")}</SelectItem>
              <SelectItem value="name">{t("projects.name", "Name")}</SelectItem>
              <SelectItem value="progress">{t("projects.progress", "Progress")}</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => {
              if (v) setViewMode(v as "grid" | "list");
            }}
          >
            <ToggleGroupItem value="grid">
              <Grid3X3 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <PageError message={projectsRequest.error || ""} />
      </AixiaHero>

      <div className="aixia-command-scroll">
        <PageLoader
  loading={projectsRequest.status === "loading"}
  fallback={
    viewMode === "grid" ? (
      <div className="aixia-projects-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="aixia-workspace-card aixia-workspace-card-neutral aixia-workspace-card--compact animate-pulse"
          />
        ))}
      </div>
    ) : (
      <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card">
        <CardContent className="p-0">
          <div className="aixia-projects-list-divider">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-4">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg aixia-projects-skeleton-bar" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded aixia-projects-skeleton-bar" />
                    <div className="h-4 w-72 rounded aixia-projects-skeleton-bar" />
                  </div>
                  <div className="hidden sm:block h-6 w-20 rounded aixia-projects-skeleton-bar" />
                  <div className="hidden sm:block h-2 w-32 rounded aixia-projects-skeleton-bar" />
                  <div className="hidden sm:block h-4 w-16 rounded aixia-projects-skeleton-bar" />
                  <div className="h-8 w-8 rounded aixia-projects-skeleton-bar" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
>
  {viewMode === "grid" ? (
  <div className="space-y-6">
    {["ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED"].map((status) => {
      const sectionProjects = filteredProjects.filter(
        (p) => (p.status || "").toUpperCase() === status
      );

      if (sectionProjects.length === 0) return null;

      return (
        <div key={status} className={`aixia-projects-grid-section aixia-projects-grid-section--${status}`}>
          <h2 className="aixia-projects-section-title">
            {getStatusLabel(status)}
          </h2>

          <div className="aixia-projects-grid">
            {sectionProjects.map((project) => {
              const urgency = getUrgency(project);
              const accessSummary = `${project.progress || 0}% ${t("projects.progress", "Progress").toLowerCase()} • ${
                project.end_date
                  ? format(clock.shiftDate(project.end_date), "MMM d")
                  : t("projects.noDate", "No date")
              }`;
              const statusLabel =
                urgency === "OVERDUE"
                  ? "OVERDUE"
                  : (project.status || t("projects.statusUnknown", "Unknown")).toUpperCase();

              return (
                <AixiaWorkspaceCard
                  key={project.id}
                  as="div"
                  size="compact"
                  label={getProjectCardTitle(
                    project,
                    t("projects.unnamedProject", "Untitled project"),
                  )}
                  eyebrow={getStatusLabel(status)}
                  description={getProjectCardDescription(
                    project,
                    t("projects.noDescription", "No description"),
                  )}
                  icon={FolderKanban}
                  statusLabel={statusLabel}
                  summary={accessSummary}
                  tone={getProjectWorkspaceTone(project.status, urgency)}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  topRightSlot={
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPinnedIds((prev) =>
                            prev.includes(project.id)
                              ? prev.filter((id) => id !== project.id)
                              : [...prev, project.id],
                          );
                        }}
                        className="aixia-workspace-card-pin-btn"
                        aria-label={
                          pinnedIds.includes(project.id) ? "Unpin project" : "Pin project"
                        }
                      >
                        {pinnedIds.includes(project.id) ? "★" : "☆"}
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                          <AixiaButton variant="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </AixiaButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="aixia-projects-select-content">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/projects/${project.id}/edit`);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t("projects.edit", "Edit")}
                          </DropdownMenuItem>

                          {canDeleteProject(project) && (
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete(project.id);
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("projects.delete", "Delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
) : (
    <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card">
      <CardContent className="p-0">
        <div className="aixia-projects-list-divider">
          {filteredProjects.map((project) => (
  <div
    key={project.id}
    onClick={() => navigate(`/projects/${project.id}`)}
    className="aixia-projects-list-row flex items-center gap-4 p-4 cursor-pointer transition-colors"
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        setPinnedIds((prev) =>
          prev.includes(project.id)
            ? prev.filter((id) => id !== project.id)
            : [...prev, project.id]
        );
      }}
      className="text-yellow-400"
    >
      {pinnedIds.includes(project.id) ? "⭐" : "☆"}
    </button>
              <div className="aixia-projects-list-icon">
                <FolderKanban className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="aixia-dash-list-row-title truncate">
                  {getProjectCardTitle(
                    project,
                    t("projects.unnamedProject", "Untitled project"),
                  )}
                </h4>
                <p className="aixia-dash-list-row-meta truncate">
                  {getProjectCardDescription(
                    project,
                    t("projects.noDescription", "No description"),
                  )}
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-4">
  <div className="flex items-center gap-2">
    <span className={`aixia-dash-pill ${getStatusPillClass(project.status)}`}>
      {getStatusLabel(project.status)}
    </span>

    {getUrgency(project) === "OVERDUE" && (
      <span className="aixia-dash-pill aixia-projects-pill--danger">Overdue</span>
    )}

    {getUrgency(project) === "SOON" && (
      <span className="aixia-dash-pill aixia-projects-pill--warning">Due Soon</span>
    )}
  </div>

  <div className="w-32">
    <Progress value={project.progress || 0} className="aixia-projects-progress aixia-projects-progress--sm" />
  </div>

  <span className="aixia-dash-list-row-meta text-sm">
    {project.end_date
      ? format(clock.shiftDate(project.end_date), "MMM d")
      : t("projects.noDate", "No date")}
  </span>
</div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <AixiaButton variant="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </AixiaButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="aixia-projects-select-content">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id}/edit`);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t("projects.edit", "Edit")}
                  </DropdownMenuItem>

                  {canDeleteProject(project) && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(project.id);
                      }}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("projects.delete", "Delete")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}
        </PageLoader>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 aixia-projects-empty">
            <FolderKanban className="w-12 h-12 aixia-projects-empty-icon mx-auto mb-4" />
            <h3 className="text-lg font-medium aixia-projects-title-inline mb-2">
              {t("projects.noProjectsFound", "No projects found")}
            </h3>
            <p className="aixia-projects-muted mb-4">
              {searchQuery || statusFilter !== "ALL"
                ? t("projects.tryAdjustingYourFilters", "Try adjusting your filters")
                : t(
                    "projects.createYourFirstProject",
                    "Create your first project to get started"
                  )}
            </p>

            {!searchQuery && statusFilter === "ALL" && canCreateProjects && (
              <AixiaButton
                variant="primary"
                onClick={() => navigate("/projects/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("projects.createProject", "Create Project")}
              </AixiaButton>
            )}
          </div>
        )}
      </div>
    </AixiaPage>
  );
}
    
