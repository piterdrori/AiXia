import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";

type ViewMode = "month" | "week" | "day";

function safeParseISO(value?: string) {
  if (!value) return null;
  try {
    const dt = parseISO(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents, tasks, projects, refreshData } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const openDay = (date: Date) => {
    navigate(`/calendar/day/${format(date, "yyyy-MM-dd")}`);
  };

  const getEventsForDate = (date: Date) => {
    const events = Array.isArray(calendarEvents) ? calendarEvents : [];
    const dateStr = format(date, "yyyy-MM-dd");

    return events.filter((event: any) => {
      const start = safeParseISO(event?.startDate);
      const end = safeParseISO(event?.endDate);

      // If no start/end, try "date"
      if (!start && event?.date) {
        const d = safeParseISO(event.date);
        return d ? isSameDay(d, date) : false;
      }

      if (!start) return false;

      // If end missing, treat as single-day event on start
      if (!end) return isSameDay(start, date);

      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  const getTasksForDate = (date: Date) => {
    const allTasks = Array.isArray(tasks) ? tasks : [];
    return allTasks.filter((task: any) => {
      if (!task?.dueDate) return false;
      const due = safeParseISO(task.dueDate);
      return due ? isSameDay(due, date) : false;
    });
  };

  // Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName} className="text-center text-sm font-medium text-slate-400 py-2">
              {dayName}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((date, dateIndex) => {
                const events = getEventsForDate(date);
                const dayTasks = getTasksForDate(date);
                const inMonth = isSameMonth(date, currentDate);
                const today = isToday(date);

                return (
                  <div
                    key={dateIndex}
                    onClick={() => openDay(date)}
                    className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all hover:border-indigo-500/30 ${
                      inMonth ? "bg-slate-900/50 border-slate-800" : "bg-slate-950/50 border-slate-800/50"
                    } ${today ? "ring-1 ring-indigo-500" : ""}`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        today ? "text-indigo-400" : inMonth ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {format(date, "d")}
                    </div>

                    <div className="space-y-1">
                      {events.slice(0, 2).map((event: any, i: number) => (
                        <div
                          key={`ev-${i}`}
                          className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 truncate"
                        >
                          {event.title || "Event"}
                        </div>
                      ))}

                      {dayTasks.slice(0, 2).map((task: any, i: number) => (
                        <div
                          key={`task-${i}`}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            task.priority === "URGENT"
                              ? "bg-red-500/20 text-red-300"
                              : task.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-slate-700/50 text-slate-300"
                          }`}
                        >
                          {task.title || "Task"}
                        </div>
                      ))}

                      {events.length + dayTasks.length > 2 && (
                        <div className="text-xs text-slate-500">
                          +{events.length + dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Week View
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {days.map((date, index) => {
            const events = getEventsForDate(date);
            const dayTasks = getTasksForDate(date);
            const today = isToday(date);

            return (
              <div
                key={index}
                onClick={() => openDay(date)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-indigo-500/30 ${
                  today ? "bg-indigo-900/20 border-indigo-500/30" : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <div className={`text-center mb-4 ${today ? "text-indigo-400" : "text-white"}`}>
                  <div className="text-sm">{format(date, "EEE")}</div>
                  <div className="text-2xl font-bold">{format(date, "d")}</div>
                </div>

                <div className="space-y-2">
                  {events.slice(0, 4).map((event: any, i: number) => (
                    <div key={`ev-${i}`} className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300">
                      {event.title || "Event"}
                    </div>
                  ))}

                  {dayTasks.slice(0, 4).map((task: any, i: number) => (
                    <div
                      key={`task-${i}`}
                      className={`text-xs px-2 py-1 rounded ${
                        task.priority === "URGENT"
                          ? "bg-red-500/20 text-red-300"
                          : task.priority === "HIGH"
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {task.title || "Task"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Day View (inside Calendar page)
  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    const dayTasks = getTasksForDate(currentDate);
    const title = format(currentDate, "EEEE, MMMM d");

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <div className="mt-3">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openDay(currentDate)}>
              Open day details
            </Button>
          </div>
        </div>

        {events.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">Events</h3>
              <div className="space-y-3">
                {events.map((event: any) => (
                  <div
                    key={event.id ?? `${event.title}-${event.startDate}`}
                    onClick={() => event?.id && navigate(`/calendar/${event.id}/edit`)}
                    className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{event.title || "Untitled event"}</p>
                      {event.description && <p className="text-slate-500 text-sm">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {dayTasks.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">Tasks Due</h3>
              <div className="space-y-3">
                {dayTasks.map((task: any) => {
                  const projectName =
                    task.projectId && projects?.find
                      ? projects.find((p: any) => p.id === task.projectId)?.name
                      : "";

                  return (
                    <div
                      key={task.id ?? `${task.title}-${task.dueDate}`}
                      onClick={() => task?.id && navigate(`/tasks/${task.id}`)}
                      className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          task.priority === "URGENT"
                            ? "bg-red-500"
                            : task.priority === "HIGH"
                            ? "bg-orange-500"
                            : "bg-slate-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.title || "Untitled task"}</p>
                        {projectName ? <p className="text-slate-500 text-sm">{projectName}</p> : null}
                      </div>
                      {task.priority ? (
                        <Badge
                          className={
                            task.priority === "URGENT"
                              ? "bg-red-500/20 text-red-400"
                              : task.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-slate-500/20 text-slate-400"
                          }
                        >
                          {task.priority}
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {events.length === 0 && dayTasks.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No events or tasks for this day</p>
          </div>
        )}
      </div>
    );
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "MMMM d, yyyy");
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, viewMode]);

  const goPrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const goNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-slate-400">View and manage your schedule</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate("/calendar/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">{headerLabel}</h2>

          <Button
            variant="outline"
            size="icon"
            onClick={goNext}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 ml-2"
          >
            Today
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
        >
          <ToggleGroupItem value="month" className="data-[state=on]:bg-slate-800 text-slate-300">
            Month
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="data-[state=on]:bg-slate-800 text-slate-300">
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="day" className="data-[state=on]:bg-slate-800 text-slate-300">
            Day
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Calendar */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </CardContent>
      </Card>
    </div>
  );
}
