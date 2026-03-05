import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function CalendarDayPage() {
  import { useLocation } from "react-router-dom";

const location = useLocation();
const date = new URLSearchParams(location.search).get("date") || undefined;
  const navigate = useNavigate();
  const { calendarEvents, tasks } = useStore();

  // Parse date safely
  const selectedDate = useMemo(() => {
    if (!date) return null;
    // Expecting YYYY-MM-DD
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [date]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return (calendarEvents || []).filter((ev: any) => {
      if (!ev?.date) return false;
      const evDate = new Date(ev.date);
      return isSameDay(evDate, selectedDate);
    });
  }, [calendarEvents, selectedDate]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return (tasks || []).filter((t: any) => {
      if (!t?.dueDate) return false;
      const tDate = new Date(t.dueDate);
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
            The URL date is invalid. Go back to the calendar.
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
                  key={ev.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-medium">{ev.title || "Untitled event"}</div>
                    {ev.type && (
                      <Badge className="bg-indigo-500/20 text-indigo-300">
                        {ev.type}
                      </Badge>
                    )}
                  </div>
                  {ev.time && <div className="text-slate-400 text-sm mt-1">{ev.time}</div>}
                  {ev.description && (
                    <div className="text-slate-400 text-sm mt-1">{ev.description}</div>
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
            {dayTasks.length === 0 ? (
              <p className="text-slate-400">No tasks due on this day.</p>
            ) : (
              dayTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-medium">{t.title || "Untitled task"}</div>
                    {t.status && (
                      <Badge className="bg-slate-500/20 text-slate-300">
                        {t.status}
                      </Badge>
                    )}
                  </div>
                  {t.projectName && (
                    <div className="text-slate-400 text-sm mt-1">{t.projectName}</div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

}
