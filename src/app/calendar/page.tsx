import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  all_day: boolean | null;
  project_id: string | null;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
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

type CalendarEventAccessRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  all_day: boolean | null;
  project_id: string | null;
  created_by: string | null;
};

function toYYYYMMDD(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function buildMonthGrid(cursor: Date) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const gridDays = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const loadCalendar = async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    const monthStart = format(startOfMonth(cursor), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(cursor), "yyyy-MM-dd");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, role")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (profileError || !profileData) {
        console.error("Load profile error:", profileError);
        setEvents([]);
        setTasks([]);
        setLoadError("Failed to load calendar.");
        return;
      }

      const currentProfile = profileData as ProfileRow;
      const isAdmin = currentProfile.role === "admin";

      let visibleProjectIds = new Set<string>();

      if (isAdmin) {
        const { data: allProjects, error: projectsError } = await supabase
          .from("projects")
          .select("id, created_by");

        if (!requestTracker.current.isLatest(requestId)) return;

        if (projectsError) {
          console.error("Load projects error:", projectsError);
          setEvents([]);
          setTasks([]);
          setLoadError("Failed to load calendar.");
          return;
        }

        visibleProjectIds = new Set(((allProjects || []) as ProjectRow[]).map((p) => p.id));
      } else {
        const [{ data: createdProjects, error: createdError }, { data: memberRows, error: membersError }] =
          await Promise.all([
            supabase.from("projects").select("id, created_by").eq("created_by", user.id),
            supabase.from("project_members").select("project_id, user_id").eq("user_id", user.id),
          ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (createdError || membersError) {
          console.error("Load visible projects error:", createdError || membersError);
          setEvents([]);
          setTasks([]);
          setLoadError("Failed to load calendar.");
          return;
        }

        visibleProjectIds = new Set([
          ...((createdProjects || []) as ProjectRow[]).map((p) => p.id),
          ...((memberRows || []) as ProjectMemberRow[]).map((m) => m.project_id),
        ]);
      }

      const [{ data: eventsData, error: eventsError }, { data: tasksData, error: tasksError }] =
        await Promise.all([
          supabase
            .from("calendar_events")
            .select("id, title, description, event_type, start_date, all_day, project_id, created_by")
            .gte("start_date", monthStart)
            .lte("start_date", monthEnd)
            .order("start_date", { ascending: true }),
          supabase
            .from("tasks")
            .select("id, title, due_date, status, project_id")
            .gte("due_date", monthStart)
            .lte("due_date", monthEnd)
            .order("due_date", { ascending: true }),
        ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (eventsError) {
        console.error("Load calendar events error:", eventsError);
      }

      if (tasksError) {
        console.error("Load calendar tasks error:", tasksError);
      }

      const safeEvents = ((eventsData || []) as CalendarEventAccessRow[]).filter((event) => {
        if (isAdmin) return true;
        if (!event.project_id) return event.created_by === user.id;
        return visibleProjectIds.has(event.project_id);
      });

      const safeTasks = ((tasksData || []) as TaskRow[]).filter((task) => {
        if (isAdmin) return true;
        if (!task.project_id) return false;
        return visibleProjectIds.has(task.project_id);
      });

      setEvents(safeEvents);
      setTasks(safeTasks);

      if (eventsError || tasksError) {
        setLoadError("Some calendar data could not be loaded.");
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar error:", error);
      setEvents([]);
      setTasks([]);
      setLoadError("Failed to load calendar.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCalendar("initial");
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();

    for (const event of events) {
      const key = event.start_date;
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    }

    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();

    for (const task of tasks) {
      if (!task.due_date) continue;
      const current = map.get(task.due_date) || [];
      current.push(task);
      map.set(task.due_date, current);
    }

    return map;
  }, [tasks]);

  const todayKey = toYYYYMMDD(new Date());

  const todayCount = useMemo(() => {
    const dayEvents = eventsByDay.get(todayKey) || [];
    const dayTasks = tasksByDay.get(todayKey) || [];
    return dayEvents.length + dayTasks.length;
  }, [eventsByDay, tasksByDay, todayKey]);

  const monthLabel = format(cursor, "MMMM yyyy");

  const goPrevMonth = () => setCursor((prev) => subMonths(prev, 1));
  const goNextMonth = () => setCursor((prev) => addMonths(prev, 1));
  const goToday = () => setCursor(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">Calendar</h1>
            {todayCount > 0 && (
              <Badge className="bg-indigo-600 text-white">
                {todayCount} today
              </Badge>
            )}
          </div>
          <p className="text-slate-400">
            View calendar events, tasks, and deadlines together
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-900"
            onClick={() => void loadCalendar("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate("/calendar/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrevMonth}
          className="border-slate-800 text-slate-300 hover:bg-slate-900"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-white font-semibold text-xl min-w-[170px]">
          {monthLabel}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goNextMonth}
          className="border-slate-800 text-slate-300 hover:bg-slate-900"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          onClick={goToday}
          className="border-slate-800 text-slate-300 hover:bg-slate-900"
        >
          Today
        </Button>
      </div>

      {loadError && (
        <Card className="bg-red-950/20 border-red-900/40 p-4 text-sm text-red-300">
          {loadError}
        </Card>
      )}

      <Card className="bg-slate-900/40 border-slate-800 p-4">
        <div className="grid grid-cols-7 gap-3 text-slate-400 text-sm mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName} className="px-2">
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {isBootstrapping
            ? Array.from({ length: 35 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 min-h-[110px]"
                >
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-6 rounded bg-slate-800" />
                      <div className="h-5 w-10 rounded bg-slate-800" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-full rounded bg-slate-800" />
                      <div className="h-5 w-5/6 rounded bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))
            : gridDays.map((day) => {
                const key = toYYYYMMDD(day);
                const inMonth = isSameMonth(day, cursor);
                const isTodayDate = isSameDay(day, new Date());

                const dayEvents = eventsByDay.get(key) || [];
                const dayTasks = tasksByDay.get(key) || [];
                const totalCount = dayEvents.length + dayTasks.length;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate(`/calendar/day/${key}`)}
                    className={[
                      "text-left rounded-xl border p-3 min-h-[110px] transition",
                      "bg-slate-950/30 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-950/50",
                      !inMonth ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={[
                          "text-sm",
                          isTodayDate ? "text-indigo-300 font-semibold" : "text-white",
                        ].join(" ")}
                      >
                        {day.getDate()}
                      </div>

                      <div className="flex items-center gap-2">
                        {totalCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center">
                            {totalCount}
                          </span>
                        )}

                        {isTodayDate && (
                          <Badge className="bg-indigo-500/20 text-indigo-300">
                            Today
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs rounded-md px-2 py-1 bg-indigo-500/15 text-indigo-200 truncate"
                        >
                          {event.title}
                        </div>
                      ))}

                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="text-xs rounded-md px-2 py-1 bg-emerald-500/15 text-emerald-200 truncate"
                        >
                          Task: {task.title}
                        </div>
                      ))}

                      {totalCount > 4 && (
                        <div className="text-[11px] text-slate-400">
                          +{totalCount - 4} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>
      </Card>
    </div>
  );
}
