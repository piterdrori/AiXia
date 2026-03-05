import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";

function parseYmd(ymd: string | undefined) {
  if (!ymd) return null;
  const parts = ymd.split("-").map((n) => Number(n));
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;

  const dt = new Date(y, m - 1, d);
  // Guard against invalid dates like 2026-02-30
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function isSameDayLocal(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { calendarEvents, tasks, projects } = useStore();

  const selectedDate = useMemo(() => parseYmd(date), [date]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const events = Array.isArray(calendarEvents) ? calendarEvents : [];
    return events.filter((ev: any) => {
      // Your events seem to use startDate/endDate (date-fns parseISO in month view)
      // We'll support both:
      const startRaw = ev?.startDate ?? ev?.date;
      if (!startRaw) return false;

      const start = new Date(startRaw);
      if (Number.isNaN(start.getTime())) return false;

      // If event spans multiple days using endDate:
      const endRaw = ev?.endDate;
      if (endRaw) {
        const end = new Date(endRaw);
        if (!Number.isNaN(end.getTime())) {
          const day = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          );
          const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          return day >= startDay && day <= endDay;
        }
      }

      return isSameDayLocal(start, selectedDate);
    });
  }, [calendarEvents, selectedDate]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    const allTasks = Array.isArray(tasks) ? tasks : [];
    return allTasks.filter((t: any) => {
      const due = t?.dueDate;
      if (!due) return false;
      const dueDt = new Date(due);
      if (Number.isNaN(dueDt.getTime())) return false;
      return isSameDayLocal(dueDt, selectedDate);
    });
  }, [tasks, selectedDate]);

  if (!selectedDate) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Invalid date</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-4">
            <div>The URL date is invalid. Go back to the calendar.</div>
            <Button onClick={() => navigate("/calendar")}>Back</Button>
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          onClick={() => navigate(`/calendar/new?date=${date}`)}
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
                  key={ev.id ?? `${ev.title}-${ev.startDate ?? ev.date}`}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">
                      {ev.title || "Untitled event"}
                    </div>
                    {ev.type ? (
                      <Badge className="bg-indigo-500/20 text-indigo-300">
                        {ev.type}
                      </Badge>
                    ) : null}
                  </div>

                  {(ev.startDate || ev.time) && (
                    <div className="text-slate-400 text-sm mt-1">
                      {ev.time ? ev.time : ""}
                    </div>
                  )}

                  {ev.description ? (
                    <div className="text-slate-400 text-sm mt-1">
                      {ev.description}
                    </div>
                  ) : null}

                  {ev.id ? (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={() => navigate(`/calendar/${ev.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
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
              dayTasks.map((t: any) => {
                const projectName =
                  t.projectName ||
                  (t.projectId
                    ? projects?.find?.((p: any) => p.id === t.projectId)?.name
                    : "");

                return (
                  <div
                    key={t.id ?? `${t.title}-${t.dueDate}`}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-white font-medium truncate">
                        {t.title || "Untitled task"}
                      </div>
                      {t.status ? (
                        <Badge className="bg-slate-500/20 text-slate-300">
                          {t.status}
                        </Badge>
                      ) : null}
                    </div>

                    {projectName ? (
                      <div className="text-slate-400 text-sm mt-1">
                        {projectName}
                      </div>
                    ) : null}

                    {t.id ? (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => navigate(`/tasks/${t.id}`)}
                        >
                          Open task
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
