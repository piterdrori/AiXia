import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function parseYYYYMMDD(value?: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [y, m, d] = parts;
  if (!y || !m || !d) return null;

  const dt = new Date(y, m - 1, d);

  // validate it didn't overflow (e.g. 2026-02-30)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }

  return dt;
}

export default function CalendarDayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { calendarEvents, tasks } = useStore();

  const dateStr = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get("date"); // expected YYYY-MM-DD
  }, [location.search]);

  const selectedDate = useMemo(() => parseYYYYMMDD(dateStr), [dateStr]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return (calendarEvents || []).filter((ev: any) => {
      const raw = ev?.date ?? ev?.startDate ?? ev?.start ?? null;
      if (!raw) return false;
      const evDate = new Date(raw);
      if (Number.isNaN(evDate.getTime())) return false;
      return isSameDay(evDate, selectedDate);
    });
  }, [calendarEvents, selectedDate]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return (tasks || []).filter((t: any) => {
      const raw = t?.dueDate ?? t?.due ?? null;
      if (!raw) return false;
      const tDate = new Date(raw);
      if (Number.isNaN(tDate.getTime())) return false;
      return isSameDay(tDate, selectedDate);
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
            The calendar day URL is invalid.
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate("/calendar")}>Back to calendar</Button>
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
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
          onClick={() => navigate(`/calendar/new?date=${dateStr}`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
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
                    {ev.type ? (
                      <Badge className="bg-indigo-500/20 text-indigo-300">
                        {ev.type}
                      </Badge>
                    ) : null}
                  </div>

                  {ev.time ? (
                    <div className="text-slate-400 text-sm mt-1">{ev.time}</div>
                  ) : null}

                  {ev.description ? (
                    <div className="text-slate-400 text-sm mt-1">
                      {ev.description}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
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
                      <Badge className="bg-slate-500/20 text-slate-300">
                        {t.status}
                      </Badge>
                    ) : null}
                  </div>

                  {t.projectName ? (
                    <div className="text-slate-400 text-sm mt-1">
                      {t.projectName}
                    </div>
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
