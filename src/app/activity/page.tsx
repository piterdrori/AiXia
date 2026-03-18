import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  Activity,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type ActivityLogRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
};

type ProjectRow = {
  id: string;
  created_by: string | null;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

type FilterType = "all" | "project" | "task" | "calendar_event" | "user";

export default function ActivityPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<FilterType>("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isAdmin = currentUserRole === "admin";

  const loadActivity = async () => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Failed to load authenticated user.");
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const [
        { data: me, error: meError },
        { data: profilesData, error: profilesError },
        { data: projectsData, error: projectsError },
        { data: projectMembersData, error: projectMembersError },
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("profiles").select("user_id, full_name, role").eq("status", "active"),
        supabase.from("projects").select("id, created_by"),
        supabase.from("project_members").select("project_id, user_id"),
      ]);

      if (meError || !me) {
        setError("Failed to load current user role.");
        setIsLoading(false);
        return;
      }

      setCurrentUserRole((me.role as Role) || null);

      if (profilesError) {
        setProfiles([]);
      } else {
        setProfiles((profilesData || []) as ProfileRow[]);
      }

      if (projectsError) {
        setProjects([]);
      } else {
        setProjects((projectsData || []) as ProjectRow[]);
      }

      if (projectMembersError) {
        setProjectMembers([]);
      } else {
        setProjectMembers((projectMembersData || []) as ProjectMemberRow[]);
      }

      const { data: logsData, error: logsError } = await supabase
        .from("activity_logs")
        .select(
          "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
        )
        .order("created_at", { ascending: false });

      if (logsError) {
        setError(logsError.message || "Failed to load activity logs.");
        setLogs([]);
        setIsLoading(false);
        return;
      }

      setLogs((logsData || []) as ActivityLogRow[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load activity logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channelKey = `activity-page:${currentUserId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_logs",
          },
          (payload) => {
            const newLog = payload.new as ActivityLogRow;

            setLogs((prev) => {
              const alreadyExists = prev.some((log) => log.id === newLog.id);
              if (alreadyExists) return prev;
              return [newLog, ...prev];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "activity_logs",
          },
          (payload) => {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (!deletedId) return;

            setLogs((prev) => prev.filter((log) => log.id !== deletedId));
            setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [currentUserId]);

  const visibleProjectIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();

    if (currentUserRole === "admin") {
      return new Set(projects.map((project) => project.id));
    }

    return new Set(
      projects
        .filter(
          (project) =>
            project.created_by === currentUserId ||
            projectMembers.some(
              (member) =>
                member.project_id === project.id && member.user_id === currentUserId
            )
        )
        .map((project) => project.id)
    );
  }, [projects, projectMembers, currentUserId, currentUserRole]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (currentUserRole !== "admin") {
        const hasProjectAccess =
          !!log.project_id && visibleProjectIds.has(log.project_id);

        const isOwnLog = log.user_id === currentUserId;

        if (!hasProjectAccess && !isOwnLog) return false;
      }

      const matchesEntity =
        entityFilter === "all" || log.entity_type === entityFilter;

      const profile = profiles.find((p) => p.user_id === log.user_id);
      const actorName = profile?.full_name || "";

      const haystack = [
        log.message || "",
        log.action_type || "",
        log.entity_type || "",
        actorName,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchQuery.toLowerCase());

      return matchesEntity && matchesSearch;
    });
  }, [
    logs,
    profiles,
    searchQuery,
    entityFilter,
    currentUserId,
    currentUserRole,
    visibleProjectIds,
  ]);

  const canDeleteLog = (log: ActivityLogRow) => {
    if (!currentUserId) return false;
    return isAdmin || log.user_id === currentUserId;
  };

  const deletableVisibleIds = filteredLogs
    .filter((log) => canDeleteLog(log))
    .map((log) => log.id);

  const allVisibleSelected =
    deletableVisibleIds.length > 0 &&
    deletableVisibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectionMode = () => {
    const next = !isSelectionMode;
    setIsSelectionMode(next);
    if (!next) setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableVisibleIds);
    }
  };

  const toggleSelectOne = (logId: string) => {
    setSelectedIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const handleDeleteOne = async (logId: string) => {
    const confirmed = window.confirm("Delete this activity log?");
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");
    setSuccessMessage("");

    const { error } = await supabase.from("activity_logs").delete().eq("id", logId);

    setIsDeleting(false);

    if (error) {
      setError(error.message || "Failed to delete activity log.");
      return;
    }

    setLogs((prev) => prev.filter((log) => log.id !== logId));
    setSelectedIds((prev) => prev.filter((id) => id !== logId));
    setSuccessMessage("Activity log deleted.");
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected activity log(s)?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");
    setSuccessMessage("");

    const { error } = await supabase.from("activity_logs").delete().in("id", selectedIds);

    setIsDeleting(false);

    if (error) {
      setError(error.message || "Failed to delete selected activity logs.");
      return;
    }

    const selectedSet = new Set(selectedIds);
    setLogs((prev) => prev.filter((log) => !selectedSet.has(log.id)));
    setSelectedIds([]);
    setIsSelectionMode(false);
    setSuccessMessage("Selected activity logs deleted.");
  };

  const getActorName = (userId: string | null) => {
    if (!userId) return "Unknown user";
    return profiles.find((p) => p.user_id === userId)?.full_name || "Unknown user";
  };

  const getEntityBadge = (entityType: string) => {
    const normalized = (entityType || "").toLowerCase();

    if (normalized === "project") {
      return <Badge className="bg-indigo-500/20 text-indigo-300">PROJECT</Badge>;
    }

    if (normalized === "task") {
      return <Badge className="bg-emerald-500/20 text-emerald-300">TASK</Badge>;
    }

    if (normalized === "calendar_event") {
      return <Badge className="bg-amber-500/20 text-amber-300">EVENT</Badge>;
    }

    if (normalized === "user") {
      return <Badge className="bg-purple-500/20 text-purple-300">USER</Badge>;
    }

    return <Badge className="bg-slate-500/20 text-slate-300">{entityType}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Log</h1>
          <p className="text-slate-400">
            {isAdmin
              ? "Monitor and manage all system activity logs"
              : "Monitor and manage your accessible activity logs"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadActivity()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={toggleSelectionMode}
          >
            {isSelectionMode ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Cancel Selection
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Select Logs
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300 shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-900/20 border-green-800 text-green-300 shrink-0">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800 shrink-0">
        <CardContent className="p-4">
          <div className="grid md:grid-cols-[1fr,220px,auto,auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as FilterType)}
              className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-white"
            >
              <option value="all">All Types</option>
              <option value="project">Project</option>
              <option value="task">Task</option>
              <option value="calendar_event">Calendar Event</option>
              <option value="user">User</option>
            </select>

            {isSelectionMode && (
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={toggleSelectAll}
              >
                {allVisibleSelected ? "Clear All" : "Select All"}
              </Button>
            )}

            {isSelectionMode && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => void handleBulkDelete()}
                disabled={isDeleting || selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800 flex-1 min-h-0">
        <CardHeader className="shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Activity Entries
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 min-h-0">
          {isLoading ? (
            <div className="text-slate-400">Loading activity logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-slate-400">No activity logs found.</div>
          ) : (
            <ScrollArea className="h-full pr-3">
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const canDelete = canDeleteLog(log);
                  const isSelected = selectedIds.includes(log.id);

                  return (
                    <div
                      key={log.id}
                      className={`rounded-lg border p-4 bg-slate-950/40 ${
                        isSelected ? "border-indigo-500/50" : "border-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isSelectionMode && (
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected}
                              disabled={!canDelete}
                              onCheckedChange={() => toggleSelectOne(log.id)}
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getEntityBadge(log.entity_type)}
                              <Badge className="bg-slate-700 text-slate-200">
                                {log.action_type}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                by {getActorName(log.user_id)}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500">
                              {format(parseISO(log.created_at), "MMM d, yyyy h:mm a")}
                            </div>
                          </div>

                          <div className="text-white text-sm break-words">{log.message}</div>

                          {(log.project_id || log.task_id || log.entity_id) && (
                            <div className="text-xs text-slate-500 flex flex-wrap gap-4">
                              {log.project_id && <span>Project: {log.project_id}</span>}
                              {log.task_id && <span>Task: {log.task_id}</span>}
                              {log.entity_id && <span>Entity: {log.entity_id}</span>}
                            </div>
                          )}

                          {!isSelectionMode && canDelete && (
                            <div className="pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-800 text-red-400 hover:bg-red-900/20"
                                onClick={() => void handleDeleteOne(log.id)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
