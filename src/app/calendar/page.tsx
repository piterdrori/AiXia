import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
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
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
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
  const [isLoading, setIsLoading] = useState(true);

  const gridDays = useMemo(() => buildMonthGrid(cursor), [cursor]);

  useEffect(() => {
    let mounted = true;

    const loadCalendar = async () => {
      const requestId = requestTracker.current.next();
      setIsLoading(true);

      const monthStart = format(startOfMonth(cursor), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(cursor), "yyyy-MM-dd");

      try {
        const [{ data: eventsData }, { data: tasksData }] = await Promise.all([
          supabase
            .from("calendar_events")
            .select("id, title, description, event_type, start_date, all_day")
            .gte("start_date", monthStart)
            .lte("start_date", monthEnd)
            .order("start_date", { ascending: true }),
          supabase
            .from("tasks")
            .select("id, title, due_date, status")
            .gte("due_date", monthStart)
            .lte("due_date", monthEnd)
            .order("due_date", { ascending: true }),
        ]);

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        setEvents((eventsData || []) as CalendarEventRow[]);
        setTasks((tasksData || []) as TaskRow[]);
      } catch (error) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Load calendar error:", error);
        setEvents([]);
        setTasks([]);
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void loadCalendar();

    return () => {
      mounted = false;
    };
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

  const now = new Date();
  const monthLabel = format(cursor, "MMMM yyyy");

  const goPrevMonth = () => setCursor((prev) => subMonths(prev, 1));
  const goNextMonth = () => setCursor((prev) => addMonths(prev, 1));
  const goToday = () => setCursor(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Calendar</h1>
          <p className="text-slate-400">View calendar events, tasks, and deadlines together</p>
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => navigate("/calendar/new")}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
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

        <div className="text-white font-semibold text-xl min-w-[170px]">{monthLabel}</div>

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

      <Card className="bg-slate-900/40 border-slate-800 p-4">
        <div className="grid grid-cols-7 gap-3 text-slate-400 text-sm mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {gridDays.map((day) => {
            const key = toYYYYMMDD(day);
            const inMonth = isSameMonth(day, cursor);
            const today = isSameDay(day, now);

            const dayEvents = eventsByDay.get(key) || [];
            const dayTasks = tasksByDay.get(key) || [];

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
                <div className="flex items-center justify-between">
                  <div
                    className={[
                      "text-sm",
                      today ? "text-indigo-300 font-semibold" : "text-white",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </div>
                  {today ? (
                    <Badge className="bg-indigo-500/20 text-indigo-300">Today</Badge>
                  ) : null}
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

                  {dayEvents.length + dayTasks.length > 4 && (
                    <div className="text-[11px] text-slate-400">
                      +{dayEvents.length + dayTasks.length - 4} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="text-center text-slate-400 mt-4">Loading calendar...</div>
        )}
      </Card>
    </div>
  );
}
