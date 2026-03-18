import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil } from "lucide-react";

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  all_day: boolean | null;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
  project_id: string | null;
};

type Role = "admin" | "manager" | "employee" | "guest";

type ProfileRow = {
  user_id: string;
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

function parseYYYYMMDD(value: string | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function CalendarDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const selectedDate = useMemo(() => parseYYYYMMDD(date), [date]);
  const dateStr = date || "";

  const loadDay = async (mode: "initial" | "refresh" = "initial") => {
    if (!date) return;

    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: allProjects, error: projectsError },
        { data: memberRows, error: membersError },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, role").eq("user_id", user.id).single(),
        supabase.from("projects").select("id, created_by"),
        supabase.from("project_members").select("project_id, user_id").eq("user_id", user.id),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (profileError || !profileData || projectsError || membersError) {
        console.error(
          "Load calendar day access error:",
          profileError || projectsError || membersError
        );
        setEvents([]);
        setTasks([]);
        setLoadError("Failed to load this day.");
        return;
      }

      const profile = profileData as ProfileRow;
      const projectList = (allProjects || []) as ProjectRow[];
      const membershipList = (memberRows || []) as ProjectMemberRow[];

      const visibleProjectIds =
        profile.role === "admin"
          ? new Set(projectList.map((project) => project.id))
          : new Set([
              ...projectList
                .filter((project) => project.created_by === user.id)
                .map((project) => project.id),
              ...membershipList.map((member) => member.project_id),
            ]);

      const [{ data: eventsData, error: eventsError }, { data: tasksData, error: tasksError }] =
        await Promise.all([
          supabase
            .from("calendar_events")
            .select(
              "id, title, description, event_type, start_date, start_time, end_date, end_time, all_day, project_id, task_id, created_by"
            )
            .eq("start_date", date)
            .order("start_time", { ascending: true }),
          supabase
            .from("tasks")
            .select("id, title, due_date, status, project_id")
            .eq("due_date", date)
            .order("created_at", { ascending: false }),
        ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (eventsError) {
        console.error("Load calendar day events error:", eventsError);
      }

      if (tasksError) {
        console.error("Load calendar day tasks error:", tasksError);
      }

      const safeEvents = ((eventsData || []) as CalendarEventRow[]).filter((event) => {
        if (profile.role === "admin") return true;
        if (!event.project_id) return event.created_by === user.id;
        return visibleProjectIds.has(event.project_id);
      });

      const safeTasks = ((tasksData || []) as TaskRow[]).filter((task) => {
        if (profile.role === "admin") return true;
        if (!task.project_id) return false;
        return visibleProjectIds.has(task.project_id);
      });

      setEvents(safeEvents);
      setTasks(safeTasks);

      if (eventsError || tasksError) {
        setLoadError("Some day data could not be loaded.");
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar day error:", error);
      setEvents([]);
      setTasks([]);
      setLoadError("Failed to load this day.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDay("initial");
  }, [date]);

  if (!selectedDate) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Invalid date</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            The URL date is invalid.
            <div className="mt-4">
              <Button onClick={() => navigate("/calendar")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dateLabel = format(selectedDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/calendar")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{dateLabel}</h1>
            <Badge className="bg-indigo-600 text-white">
              {events.length + tasks.length} item{events.length + tasks.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-slate-400">Day view with calendar events and due tasks</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-900"
            onClick={() => void loadDay("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate(`/calendar/new?date=${encodeURIComponent(dateStr)}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="bg-red-950/20 border-red-900/40 p-4 text-sm text-red-300">
          {loadError}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Events</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isBootstrapping ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`event-skeleton-${index}`}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 w-40 rounded bg-slate-800" />
                      <div className="h-6 w-16 rounded bg-slate-800" />
                    </div>
                    <div className="h-5 w-24 rounded bg-slate-800" />
                    <div className="h-4 w-full rounded bg-slate-800" />
                  </div>
                </div>
              ))
            ) : events.length === 0 ? (
              <p className="text-slate-400">No events for this day.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">{event.title}</div>

                    <div className="flex items-center gap-2">
                      {event.all_day ? (
                        <Badge className="bg-indigo-500/20 text-indigo-300">All Day</Badge>
                      ) : (
                        <Badge className="bg-slate-700 text-slate-200">
                          {event.start_time || "--:--"}
                        </Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                        onClick={() => navigate(`/calendar/${event.id}/edit`)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Badge className="bg-slate-800 text-slate-300 border border-slate-700">
                    {(event.event_type || "other").toUpperCase()}
                  </Badge>

                  {event.description && (
                    <div className="text-slate-400 text-sm">{event.description}</div>
                  )}

                  {(event.project_id || event.task_id) && (
                    <div className="text-xs text-slate-500 space-y-1">
                      {event.project_id && <div>Linked project: {event.project_id}</div>}
                      {event.task_id && <div>Linked task: {event.task_id}</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Tasks Due</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isBootstrapping ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`task-skeleton-${index}`}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 w-40 rounded bg-slate-800" />
                      <div className="h-6 w-20 rounded bg-slate-800" />
                    </div>
                    <div className="h-4 w-28 rounded bg-slate-800" />
                    <div className="h-9 w-24 rounded bg-slate-800" />
                  </div>
                </div>
              ))
            ) : tasks.length === 0 ? (
              <p className="text-slate-400">No tasks due on this day.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">{task.title}</div>

                    {task.status && (
                      <Badge className="bg-emerald-500/20 text-emerald-300">
                        {task.status.replaceAll("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {task.project_id && (
                    <div className="text-xs text-slate-500">Project: {task.project_id}</div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    Open Task
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
