import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Download,
  FileText,
  Users,
  CheckSquare,
  Clock3,
  Shield,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type ProjectReportStatus = "pending" | "processing" | "completed" | "failed";

type ProjectReportRow = {
  id: string;
  project_id: string;
  report_type: string;
  format: string;
  status: ProjectReportStatus;
  requested_by: string;
  generated_at: string | null;
  storage_bucket: string | null;
  file_path: string | null;
  payload_json: ProjectReportPayload | null;
  error_message: string | null;
  filters_json: Record<string, unknown> | null;
  report_version: number;
  created_at: string;
  updated_at: string;
};

type ReportActor = {
  user_id: string;
  full_name: string | null;
  role: Role | string | null;
  status?: string | null;
};

type ReportProject = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at?: string | null;
  creator?: ReportActor | null;
};

type ReportMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: ReportActor | null;
};

type ReportTaskMember = {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: ReportActor | null;
};

type ReportComment = {
  id: string;
  project_id?: string;
  task_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  author: ReportActor | null;
};

type ReportFile = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  entity_type: "project" | "task";
  created_at: string;
  uploader: ReportActor | null;
};

type ReportActivity = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  created_at: string;
  actor: ReportActor | null;
};

type ReportTask = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string | null;
  creator: ReportActor | null;
  assignee: ReportActor | null;
  members: ReportTaskMember[];
  comments: ReportComment[];
  files: ReportFile[];
  activity: ReportActivity[];
};

type ReportRisk = {
  type: string;
  taskId?: string;
  title?: string;
  dueDate?: string | null;
  status?: string | null;
};

type ProjectReportPayload = {
  meta: {
    reportId: string;
    reportType: string;
    format: string;
    generatedAt: string;
    requestedBy: ReportActor | null;
    filters: Record<string, unknown> | null;
    version: number;
  };
  project: ReportProject;
  members: ReportMember[];
  taskSummary: {
    total: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    overdue: number;
  };
  tasks: ReportTask[];
  projectComments: ReportComment[];
  taskComments: ReportComment[];
  files: {
    projectFiles: ReportFile[];
    taskFiles: ReportFile[];
  };
  activityTimeline: ReportActivity[];
  risks: ReportRisk[];
  kpis: {
    completionPercent: number;
    projectFileCount: number;
    taskFileCount: number;
    projectCommentCount: number;
    taskCommentCount: number;
    latestActivityAt: string | null;
  };
};

function ReportPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-slate-800" />
          <div className="h-4 w-80 rounded bg-slate-900" />
        </div>
        <div className="h-10 w-36 rounded bg-slate-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6 space-y-3">
              <div className="h-4 w-24 rounded bg-slate-800" />
              <div className="h-8 w-16 rounded bg-slate-900" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-10 w-full max-w-[820px] rounded bg-slate-900 border border-slate-800" />

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-4 w-full rounded bg-slate-800" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusBadgeClass(status: string | null) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "PLANNING":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "ON_HOLD":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "COMPLETED":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "CANCELLED":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "DONE":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "IN_PROGRESS":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "IN_REVIEW":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "TODO":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

export default function ProjectReportDetailPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const { t } = useLanguage();
  const clock = useAppClock();

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ProjectReportRow | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!id || !reportId) {
        navigate("/projects");
        return;
      }

      const requestId = requestTracker.current.next();
      setIsLoading(true);
      setError("");

      try {
        const { data: reportData, error: reportError } = await supabase
          .from("project_reports")
          .select(
            "id, project_id, report_type, format, status, requested_by, generated_at, storage_bucket, file_path, payload_json, error_message, filters_json, report_version, created_at, updated_at",
          )
          .eq("id", reportId)
          .eq("project_id", id)
          .single();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (reportError || !reportData) {
          setReport(null);
          setError(
            reportError?.message ||
              t("projects.reportNotFound", "Report not found."),
          );
          return;
        }

        setReport(reportData as ProjectReportRow);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Load project report error:", err);
        setError(
          t(
            "projects.failedToLoadReport",
            "Failed to load project report.",
          ),
        );
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void loadReport();
  }, [id, navigate, reportId, t]);

  const payload = report?.payload_json ?? null;

  const overviewStats = useMemo(() => {
    if (!payload) return null;

    return [
      {
        label: t("projects.totalTasks", "Total Tasks"),
        value: payload.taskSummary.total,
      },
      {
        label: t("projects.completion", "Completion"),
        value: `${payload.kpis.completionPercent}%`,
      },
      {
        label: t("projects.totalFiles", "Total Files"),
        value: payload.kpis.projectFileCount + payload.kpis.taskFileCount,
      },
      {
        label: t("projects.totalComments", "Total Comments"),
        value: payload.kpis.projectCommentCount + payload.kpis.taskCommentCount,
      },
    ];
  }, [payload, t]);

  const limitedProjectComments = useMemo(
  () => [...payload.projectComments].slice(-50).reverse(),
  [payload]
);

const limitedTaskComments = useMemo(
  () => [...payload.taskComments].slice(-50).reverse(),
  [payload]
);

const limitedActivity = useMemo(
  () => [...payload.activityTimeline].slice(-50).reverse(),
  [payload]
);

  const handleDownloadJson = async () => {
    if (!report?.storage_bucket || !report.file_path || isDownloading) return;

    setIsDownloading(true);
    setError("");

    try {
      const { data, error: downloadError } = await supabase.storage
        .from(report.storage_bucket)
        .download(report.file_path);

      if (downloadError || !data) {
        setError(
          downloadError?.message ||
            t("projects.failedToDownloadReport", "Failed to download report."),
        );
        return;
      }

      const url = window.URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${payload?.project?.name || "project-report"}-${report.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download project report error:", err);
      setError(
        t("projects.failedToDownloadReport", "Failed to download report."),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <ReportPageSkeleton />;
  }

  if (!report || !payload) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert className="bg-red-900/20 border-red-800 text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && (
          <Alert className="bg-slate-900/50 border-slate-800 text-slate-300">
            <AlertDescription>
              {t("projects.reportNotFound", "Report not found.")}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => navigate(`/projects/${id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("projects.backToProject", "Back to Project")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
  <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-fit px-0 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => navigate(`/projects/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("projects.backToProject", "Back to Project")}
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {payload.project.name} — {t("projects.projectReport", "Project Report")}
              </h1>

              <Badge className={getStatusBadgeClass(payload.project.status)}>
                {payload.project.status || t("projects.unknownUpper", "UNKNOWN")}
              </Badge>

              <Badge className={getStatusBadgeClass(report.status)}>
                {report.status.toUpperCase()}
              </Badge>
            </div>

            <p className="mt-2 text-slate-400">
              {payload.project.description ||
                t("projects.noDescription", "No description")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span>
              {t("projects.reportType", "Report Type")}:{" "}
              <span className="text-slate-200">{report.report_type}</span>
            </span>
            <span>
              {t("projects.generatedAt", "Generated At")}:{" "}
              <span className="text-slate-200">
                {report.generated_at
                  ? format(clock.shiftDate(report.generated_at), "MMM d, yyyy • h:mm a")
                  : t("projects.notAvailable", "Not available")}
              </span>
            </span>
            <span>
              {t("projects.generatedBy", "Generated By")}:{" "}
              <span className="text-slate-200">
                {payload.meta.requestedBy?.full_name ||
                  t("projects.unknown", "Unknown")}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => void handleDownloadJson()}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading
              ? t("projects.downloading", "Downloading...")
              : t("projects.downloadJson", "Download JSON")}
          </Button>
        </div>
      </div>

      {overviewStats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((item) => (
            <Card key={item.label} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
            {t("projects.overview", "Overview")}
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-800">
            {t("projects.team", "Team")}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800">
            {t("projects.tasks", "Tasks")}
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-slate-800">
            {t("projects.files", "Files")}
          </TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-slate-800">
            {t("projects.comments", "Comments")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800">
            {t("projects.activity", "Activity")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-slate-800">
            {t("projects.audit", "Audit")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  {t("projects.projectDetails", "Project Details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.status", "Status")}</span>
                  <span className="text-white">{payload.project.status || "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.progress", "Progress")}</span>
                  <span className="text-white">{payload.project.progress ?? 0}%</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.startDate", "Start Date")}</span>
                  <span className="text-white">
                    {payload.project.start_date
                      ? format(clock.shiftDate(payload.project.start_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.endDate", "End Date")}</span>
                  <span className="text-white">
                    {payload.project.end_date
                      ? format(clock.shiftDate(payload.project.end_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.created", "Created")}</span>
                  <span className="text-white">
                    {format(clock.shiftDate(payload.project.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">{t("projects.createdBy", "Created By")}</span>
                  <span className="text-white">
                    {payload.project.creator?.full_name ||
                      t("projects.unknown", "Unknown")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-400" />
                  {t("projects.taskSummary", "Task Summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.total", "Total")}</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {payload.taskSummary.total}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.toDo", "To Do")}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-300">
                    {payload.taskSummary.todo}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.inProgress", "In Progress")}</p>
                  <p className="mt-1 text-2xl font-bold text-blue-400">
                    {payload.taskSummary.inProgress}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.inReview", "In Review")}</p>
                  <p className="mt-1 text-2xl font-bold text-purple-400">
                    {payload.taskSummary.inReview}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.done", "Done")}</p>
                  <p className="mt-1 text-2xl font-bold text-green-400">
                    {payload.taskSummary.done}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400">{t("projects.overdue", "Overdue")}</p>
                  <p className="mt-1 text-2xl font-bold text-red-400">
                    {payload.taskSummary.overdue}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.identifiedRisks", "Identified Risks")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.risks.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noRisksDetected", "No risks detected in this report.")}
                </p>
                            ) : (
                <div className="space-y-3">
                  {payload.risks.map((risk, index) => (
                    <div
                      key={`${risk.type}-${risk.taskId || index}`}
                      className="rounded-lg border border-red-900/40 bg-red-950/20 p-4"
                    >
                      <p className="text-red-300 font-medium">
                        {risk.title || risk.type}
                      </p>
                      <p className="mt-1 text-sm text-red-200/80">
                        {risk.dueDate
                          ? `${t("projects.dueDate", "Due Date")}: ${format(
                              clock.shiftDate(risk.dueDate),
                              "MMM d, yyyy",
                            )}`
                          : t("projects.noDueDate", "No due date")}
                        {risk.status ? ` • ${risk.status}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </div>
  </div>
</TabsContent>

        <TabsContent value="team" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {t("projects.teamMembers", "Team Members")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.members.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noTeamMembersAssigned", "No team members assigned")}
                </p>
                            ) : (
                <div className="space-y-3">
                  {payload.members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white font-medium">
                            {member.profile?.full_name ||
                              t("projects.unknown", "Unknown")}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {(member.profile?.role || "").toString().toUpperCase() || "USER"}
                          </p>
                        </div>

                        <Badge className="bg-slate-800 text-slate-300">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </div>
  </div>
</TabsContent>

        <TabsContent value="tasks" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-4">
          {payload.tasks.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <p className="text-slate-500">
                  {t("projects.noTasksYet", "No tasks yet")}
                </p>
              </CardContent>
            </Card>
          ) : (
            payload.tasks.map((task) => (
              <Card key={task.id} className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-white">{task.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusBadgeClass(task.status)}>
                        {task.status || "TODO"}
                      </Badge>
                      <Badge className="bg-slate-800 text-slate-300">
                        {task.priority || "LOW"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-slate-300">
                    {task.description || t("projects.noDescription", "No description")}
                  </p>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-slate-500">{t("projects.assignee", "Assignee")}</p>
                      <p className="mt-1 text-white">
                        {task.assignee?.full_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t("projects.createdBy", "Created By")}</p>
                      <p className="mt-1 text-white">
                        {task.creator?.full_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t("projects.dueDate", "Due Date")}</p>
                      <p className="mt-1 text-white">
                        {task.due_date
                          ? format(clock.shiftDate(task.due_date), "MMM d, yyyy")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-slate-400">{t("projects.members", "Members")}</p>
                      <p className="mt-1 text-xl font-bold text-white">{task.members.length}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-slate-400">{t("projects.files", "Files")}</p>
                      <p className="mt-1 text-xl font-bold text-white">{task.files.length}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-slate-400">{t("projects.comments", "Comments")}</p>
                      <p className="mt-1 text-xl font-bold text-white">{task.comments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
            </div>
  </div>
</TabsContent>

        <TabsContent value="files" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.projectFiles", "Project Files")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.files.projectFiles.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noProjectFilesUploadedYet", "No project files uploaded yet.")}
                </p>
                            ) : (
                <div className="space-y-3">
                  {payload.files.projectFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-white font-medium">{file.file_name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {file.uploader?.full_name || t("projects.unknown", "Unknown")} •{" "}
                            {format(clock.shiftDate(file.created_at), "MMM d, yyyy • h:mm a")} •{" "}
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>

                        <Badge className="bg-slate-800 text-slate-300">
                          PROJECT
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.taskFiles", "Task Files")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.files.taskFiles.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noTaskFiles", "No task files")}
                </p>
                            ) : (
                <div className="space-y-3">
                  {payload.files.taskFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-white font-medium">{file.file_name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {file.uploader?.full_name || t("projects.unknown", "Unknown")} •{" "}
                            {format(clock.shiftDate(file.created_at), "MMM d, yyyy • h:mm a")} •{" "}
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>

                        <Badge className="bg-slate-800 text-slate-300">
                          TASK
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </div>
  </div>
</TabsContent>

        <TabsContent value="comments" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.projectComments", "Project Comments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.projectComments.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noDiscussionYet", "No discussion yet")}
                </p>
                            ) : (
                <>
                  {payload.projectComments.length > 50 && (
                    <div className="mb-3 text-xs text-slate-500">
                      Showing latest 50 project comments
                    </div>
                  )}
                  <div className="space-y-3">
                    {limitedProjectComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <p className="text-white whitespace-pre-wrap">{comment.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {comment.author?.full_name || t("projects.unknown", "Unknown")} •{" "}
                        {format(clock.shiftDate(comment.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                   ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.taskComments", "Task Comments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.taskComments.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noTaskComments", "No task comments")}
                </p>
                                         ) : (
                <>
                  {payload.taskComments.length > 50 && (
                    <div className="mb-3 text-xs text-slate-500">
                      Showing latest 50 task comments
                    </div>
                  )}
                  <div className="space-y-3">
                    {limitedTaskComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <p className="text-white whitespace-pre-wrap">{comment.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {comment.author?.full_name || t("projects.unknown", "Unknown")} •{" "}
                        {format(clock.shiftDate(comment.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
           </div>
  </div>
</TabsContent>

        <TabsContent value="activity" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-indigo-400" />
                {t("projects.activityTimeline", "Activity Timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload.activityTimeline.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noActivityYet", "No activity yet.")}
                </p>
                            ) : (
                <>
                  {payload.activityTimeline.length > 50 && (
                    <div className="mb-3 text-xs text-slate-500">
                      Showing latest 50 activity items
                    </div>
                  )}
                  <div className="space-y-4">
                    {limitedActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-b border-slate-800 pb-4 last:border-b-0"
                    >
                      <p className="text-white">
                        {entry.actor?.full_name ? (
                          <>
                            <span className="font-medium">{entry.actor.full_name}</span>{" "}
                            <span className="text-slate-300">{entry.message}</span>
                          </>
                        ) : (
                          <span className="text-slate-300">{entry.message}</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.action_type} • {entry.entity_type} •{" "}
                        {format(clock.shiftDate(entry.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
            </div>
  </div>
</TabsContent>

        <TabsContent value="audit" className="mt-4">
  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
    <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                {t("projects.auditMetadata", "Audit Metadata")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.reportId", "Report ID")}</span>
                <span className="text-white break-all text-right">{report.id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.reportVersion", "Report Version")}</span>
                <span className="text-white">{report.report_version}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.reportFormat", "Report Format")}</span>
                <span className="text-white">{report.format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.reportStatus", "Report Status")}</span>
                <span className="text-white">{report.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.storagePath", "Storage Path")}</span>
                <span className="text-white break-all text-right">
                  {report.file_path || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{t("projects.latestActivity", "Latest Activity")}</span>
                <span className="text-white">
                  {payload.kpis.latestActivityAt
                    ? format(clock.shiftDate(payload.kpis.latestActivityAt), "MMM d, yyyy • h:mm a")
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.reportFilters", "Report Filters")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
                {JSON.stringify(report.filters_json || payload.meta.filters || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
            </div>
  </div>
</TabsContent>
      </Tabs>
    </div>
  );
}
