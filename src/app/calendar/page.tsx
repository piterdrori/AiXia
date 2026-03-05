import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function safeDate(input: any) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents, tasks } = useStore();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const gridDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

    // Sunday-based grid
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const end = new Date(last);
    end.setDate(last.getDate() + (6 - last.getDay()));

    const days: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    (calendarEvents || []).forEach((ev: any) => {
      const dt = safeDate(ev?.startDate ?? ev?.date);
      if (!dt) return;
      const key = toYYYYMMDD(dt);
      map.set(key, [...(map.get(key) || []), ev]);
    });
    return map;
  }, [calendarEvents]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    (tasks || []).forEach((t: any) => {
      const dt = safeDate(t?.dueDate);
      if (!dt) return;
      const key = toYYYYMMDD(dt);
      map.set(key, [...(map.get(key) || []), t]);
    });
    return map;
  }, [tasks]);

  const goPrevMonth = () =>
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () =>
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Calendar</h1>
          <p className="text-slate-400">View and manage your schedule</p>
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
        <Button variant="outline" size="icon" onClick={goPrevMonth} className="border-slate-800 text-slate-300 hover:bg-slate-900">
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-white font-semibold text-xl min-w-[170px]">{monthLabel}</div>

        <Button variant="outline" size="icon" onClick={goNextMonth} className="border-slate-800 text-slate-300 hover:bg-slate-900">
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button variant="outline" onClick={goToday} className="border-slate-800 text-slate-300 hover:bg-slate-900">
          Today
        </Button>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 p-4">
        <div className="grid grid-cols-7 gap-3 text-slate-400 text-sm mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {gridDays.map((day) => {
            const key = toYYYYMMDD(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = isSameDay(day, now);

            const dayEvents = eventsByDay.get(key) || [];
            const dayTasks = tasksByDay.get(key) || [];

            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(`/calendar/day/${key}`)}
                className={[
                  "text-left rounded-xl border p-3 min-h-[92px] transition",
                  "bg-slate-950/30 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-950/50",
                  !inMonth ? "opacity-50" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className={["text-sm", isToday ? "text-indigo-300 font-semibold" : "text-white"].join(" ")}>
                    {day.getDate()}
                  </div>
                  {isToday ? (
                    <Badge className="bg-indigo-500/20 text-indigo-300">Today</Badge>
                  ) : null}
                </div>

                <div className="mt-2 space-y-1">
                  {dayEvents.slice(0, 2).map((ev: any) => (
                    <div
                      key={ev.id}
                      className="text-xs text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 rounded-md px-2 py-1 truncate"
                      title={ev.title}
                    >
                      {ev.title || "Event"}
                    </div>
                  ))}

                  {dayTasks.slice(0, 2).map((t: any) => (
                    <div
                      key={t.id}
                      className="text-xs text-slate-200 bg-slate-800/40 border border-slate-700 rounded-md px-2 py-1 truncate"
                      title={t.title}
                    >
                      {t.title || "Task"}
                    </div>
                  ))}

                  {(dayEvents.length + dayTasks.length) > 4 ? (
                    <div className="text-xs text-slate-400 px-1">
                      +{(dayEvents.length + dayTasks.length) - 4} more
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
