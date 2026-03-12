import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

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
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
  project_id: string | null;
};

function parseYYYYMMDD(s: string | undefined) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CalendarDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedDate = useMemo(() => parseYYYYMMDD(date), [date]);

  useEffect(() => {
    const loadDay = async () => {
      if (!date) return;
      setIsLoading(true);

      const [{ data: eventsData }, { data: tasksData }] = await Promise.all([
        supabase
          .from("calendar_events")
          .select(
            "id, title, description, event_type, start_date, start_time, end_date, end_time, all_day, project_id, task_id"
          )
          .eq("start_date", date)
          .order("start_time", { ascending: true }),
        supabase
          .from("tasks")
          .select("id, title, due_date, status, project_id")
          .eq("due_date", date)
          .order("created_at", { ascending: false }),
      ]);

      setEvents((eventsData || []) as CalendarEventRow[]);
      setTasks((tasksData || []) as TaskRow[]);
      setIsLoading(false);
    };

    loadDay();
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
  const dateStr = date || "";

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
          <h1 className="text-2xl font-bold text-white">{dateLabel}</h1>
          <p className="text-slate-400">Day view with calendar events and due tasks</p>
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => navigate(`/calendar/new?date=${encodeURIComponent(dateStr)}`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-slate-400">Loading events...</p>
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
            {isLoading ? (
              <p className="text-slate-400">Loading tasks...</p>
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
