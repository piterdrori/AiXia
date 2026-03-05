import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const monthLabel = useMemo(() => format(currentDate, "MMMM yyyy"), [currentDate]);

  const days = useMemo(() => {
    const start = viewMode === "month"
      ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
      : startOfWeek(currentDate, { weekStartsOn: 0 });

    const end = viewMode === "month"
      ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
      : endOfWeek(currentDate, { weekStartsOn: 0 });

    const out: Date[] = [];
    let d = start;

    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [currentDate, viewMode]);

  const onPrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -7));
  };

  const onNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const onToday = () => setCurrentDate(new Date());

  const openDay = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    navigate(`/calendar/day?date=${dateKey}`);
  };

  const dayEventCount = (date: Date) => {
    const list = (calendarEvents || []) as any[];
    return list.filter((ev) => {
      if (!ev?.date) return false;
      const evDate = new Date(ev.date);
      if (Number.isNaN(evDate.getTime())) return false;
      return isSameDay(evDate, date);
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-slate-400">View and manage your schedule</p>
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => navigate(`/calendar/new?date=${format(currentDate, "yyyy-MM-dd")}`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-[170px] text-center text-white font-semibold">
            {monthLabel}
          </div>

          <Button variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button variant="outline" onClick={onToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "month" ? "default" : "outline"} onClick={() => setViewMode("month")}>
            Month
          </Button>
          <Button variant={viewMode === "week" ? "default" : "outline"} onClick={() => setViewMode("week")}>
            Week
          </Button>
          <Button variant={viewMode === "day" ? "default" : "outline"} onClick={() => openDay(currentDate)}>
            Day
          </Button>
        </div>
      </div>

      {/* Grid */}
      <Card className="bg-slate-900/40 border-slate-800 p-4">
        <div className="grid grid-cols-7 gap-3 text-slate-400 text-sm mb-3">
          <div className="text-center">Sun</div>
          <div className="text-center">Mon</div>
          <div className="text-center">Tue</div>
          <div className="text-center">Wed</div>
          <div className="text-center">Thu</div>
          <div className="text-center">Fri</div>
          <div className="text-center">Sat</div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((d) => {
            const inMonth = viewMode !== "month" ? true : isSameMonth(d, currentDate);
            const count = dayEventCount(d);

            return (
              <button
                key={d.toISOString()}
                onClick={() => openDay(d)}
                className={[
                  "h-[90px] rounded-xl border text-left p-3 transition",
                  "bg-slate-950/40 border-slate-800 hover:border-indigo-500/60 hover:bg-slate-950/55",
                  inMonth ? "" : "opacity-40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm font-semibold">{format(d, "d")}</div>
                  {count > 0 ? (
                    <div className="text-xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                      {count}
                    </div>
                  ) : null}
                </div>

                {/* Preview line */}
                <div className="mt-3 text-xs text-slate-400">
                  {count > 0 ? `${count} event${count === 1 ? "" : "s"}` : " "}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
