import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseYYYYMMDD(s: string | undefined) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function CalendarDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { calendarEvents, tasks } = useStore();

  const selectedDate = useMemo(() => parseYYYYMMDD(date), [date]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return (calendarEvents || []).filter((ev: any) => {
      const raw = ev?.startDate ?? ev?.date;
      if (!raw) return false;
      const dt = new Date(raw);
      return !Number.isNaN(dt.getTime()) && isSameDay(dt, selectedDate);
    });
  }, [calendarEvents, selectedDate]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return (tasks || []).filter((t: any) => {
      const raw = t?.dueDate;
      if (!raw) return false;
      const dt = new Date(raw);
      return !Number.isNaN(dt.getTime()) && isSameDay(dt, selectedDate);
    });
  }, [tasks, selectedDate]);

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

  const dateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          <p className="text-slate-400">Day view (events + tasks)</p>
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
            {dayEvents.length === 0 ? (
              <p className="text-slate-400">No events for this day.</p>
            ) : (
              dayEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">
                      {ev.title || "Untitled event"}
                    </div>
                    {ev.allDay ? (
                      <Badge className="bg-indigo-500/20 text-indigo-300">All Day</Badge>
                    ) : null}
                  </div>
                  {ev.description ? (
                    <div className="text-slate-400 text-sm mt-1">{ev.description}</div>
                  ) : null}
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
            {dayTasks.length === 0 ? (
              <p className="text-slate-400">No tasks due on this day.</p>
            ) : (
              dayTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">
                      {t.title || "Untitled task"}
                    </div>
                    {t.status ? (
                      <Badge className="bg-slate-500/20 text-slate-300">{t.status}</Badge>
                    ) : null}
                  </div>
                  {t.projectName ? (
                    <div className="text-slate-400 text-sm mt-1">{t.projectName}</div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
