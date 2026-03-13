import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

type EventType =
  | "meeting"
  | "task"
  | "reminder"
  | "deadline"
  | "call"
  | "personal"
  | "other";

type ReminderValue = "NONE" | "5" | "10" | "15" | "30" | "60";
type MeetingDurationValue = "30" | "60" | "90" | "120";

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  all_day: boolean | null;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  reminder_minutes?: number | null;
};

type ProjectRow = {
  id: string;
  name: string;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
};

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHours = Math.floor(normalizedMinutes / 60);
  const nextMinutes = normalizedMinutes % 60;

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function addDaysToDate(dateStr: string, daysToAdd: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function isEndBeforeStart(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
) {
  const start = new Date(`${startDate}T${startTime || "00:00"}`);
  const end = new Date(`${endDate}T${endTime || "00:00"}`);
  return end.getTime() < start.getTime();
}

export default function CalendarEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pageRequestTracker = useRef(createRequestTracker());

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [reminderMinutes, setReminderMinutes] = useState<ReminderValue>("NONE");

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);

  const [meetingDuration, setMeetingDuration] = useState<MeetingDurationValue>("60");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("NONE");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("NONE");

  const [eventLoaded, setEventLoaded] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const usesDuration = useMemo(() => eventType === "meeting", [eventType]);

  const needsStartAndEnd = useMemo(() => {
    return eventType === "task" || eventType === "deadline" || eventType === "other";
  }, [eventType]);

  const needsSingleTimeOnly = useMemo(() => {
    return eventType === "reminder" || eventType === "call" || eventType === "personal";
  }, [eventType]);

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "NONE") return [];
    return tasks.filter((task) => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const isLoadingRelatedData = isBootstrapping || isRefreshing;
  const isPageBusy = !eventLoaded;

  const loadPage = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/calendar");
      return;
    }

    const requestId = pageRequestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
      setEventLoaded(false);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [{ data: eventData, error: eventError }, { data: projectsData }, { data: tasksData }] =
        await Promise.all([
          supabase
            .from("calendar_events")
            .select(
              "id, title, description, event_type, start_date, start_time, end_date, end_time, all_day, project_id, task_id, created_by, reminder_minutes"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("projects")
            .select("id, name, created_by")
            .order("created_at", { ascending: false }),
          supabase
            .from("tasks")
            .select("id, title, project_id")
            .order("created_at", { ascending: false }),
        ]);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (eventError || !eventData) {
        navigate("/calendar");
        return;
      }

      const event = eventData as CalendarEventRow;

      if (event.created_by !== user.id) {
        navigate("/calendar");
        return;
      }

      setTitle(event.title || "");
      setDescription(event.description || "");
      setEventType((event.event_type || "meeting") as EventType);
      setStartDate(event.start_date || "");
      setStartTime(event.start_time || "09:00");
      setEndDate(event.end_date || event.start_date || "");
      setEndTime(event.end_time || "10:00");
      setAllDay(Boolean(event.all_day));
      setSelectedProjectId(event.project_id || "NONE");
      setSelectedTaskId(event.task_id || "NONE");
      setReminderMinutes(
        event.reminder_minutes ? (String(event.reminder_minutes) as ReminderValue) : "NONE"
      );

      setProjects((projectsData || []) as ProjectRow[]);
      setTasks((tasksData || []) as TaskRow[]);
      setEventLoaded(true);
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar edit page error:", err);
      setError("Failed to load event.");
      setProjects([]);
      setTasks([]);
    } finally {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPage("initial");
  }, [id]);

  useEffect(() => {
    if (!startDate) return;

    setEndDate((prevEndDate) => {
      if (!prevEndDate || prevEndDate < startDate) {
        return startDate;
      }
      return prevEndDate;
    });
  }, [startDate]);

  useEffect(() => {
    if (!startDate || !startTime || allDay) return;

    const autoDuration = usesDuration ? Number(meetingDuration || 60) : 60;
    const nextEndTime = addMinutesToTime(startTime, autoDuration);
    setEndTime(nextEndTime);

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = startTotal + autoDuration;

    if (endTotal >= 1440) {
      setEndDate(addDaysToDate(startDate, 1));
    } else {
      setEndDate(startDate);
    }
  }, [startDate, startTime, allDay, usesDuration, meetingDuration]);

  useEffect(() => {
    if (selectedProjectId === "NONE") {
      setSelectedTaskId("NONE");
      return;
    }

    if (
      selectedTaskId !== "NONE" &&
      !tasks.some((task) => task.id === selectedTaskId && task.project_id === selectedProjectId)
    ) {
      setSelectedTaskId("NONE");
    }
  }, [selectedProjectId, selectedTaskId, tasks]);

  useEffect(() => {
    if (allDay || !startDate || !startTime) return;

    if (needsSingleTimeOnly) {
      setEndDate(startDate);
      setEndTime(addMinutesToTime(startTime, 60));
      return;
    }

    if (usesDuration) {
      const duration = Number(meetingDuration || 60);
      setEndDate(startDate);
      setEndTime(addMinutesToTime(startTime, duration));
      return;
    }

    if (needsStartAndEnd) {
      if (endDate < startDate || isEndBeforeStart(startDate, startTime, endDate, endTime)) {
        setEndDate(startDate);
        setEndTime(addMinutesToTime(startTime, 60));
      }
    }
  }, [
    allDay,
    startDate,
    startTime,
    endDate,
    endTime,
    needsSingleTimeOnly,
    usesDuration,
    needsStartAndEnd,
    meetingDuration,
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !currentUserId) {
      setError("User session not found.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (!allDay && !startTime) {
      setError("Start time is required.");
      return;
    }

    const computedEndDate = allDay
      ? endDate || startDate
      : needsSingleTimeOnly
        ? startDate
        : endDate || startDate;

    const computedEndTime = allDay
      ? null
      : needsSingleTimeOnly
        ? startTime || null
        : usesDuration
          ? addMinutesToTime(startTime, Number(meetingDuration || 60))
          : endTime || null;

    if (!allDay && needsStartAndEnd && !computedEndTime) {
      setError("End time is required.");
      return;
    }

    if (
      !allDay &&
      needsStartAndEnd &&
      computedEndTime &&
      isEndBeforeStart(startDate, startTime, computedEndDate, computedEndTime)
    ) {
      setError("End date/time cannot be earlier than start date/time.");
      return;
    }

    const requestId = pageRequestTracker.current.next();
    setIsSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("calendar_events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          start_date: startDate,
          start_time: allDay ? null : startTime || null,
          end_date: computedEndDate,
          end_time: computedEndTime,
          all_day: allDay,
          project_id: selectedProjectId === "NONE" ? null : selectedProjectId,
          task_id: selectedTaskId === "NONE" ? null : selectedTaskId,
          reminder_minutes: reminderMinutes === "NONE" ? null : Number(reminderMinutes),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (updateError) {
        setError(updateError.message || "Failed to update event.");
        return;
      }

      await supabase.from("activity_logs").insert({
        project_id: selectedProjectId === "NONE" ? null : selectedProjectId,
        task_id: selectedTaskId === "NONE" ? null : selectedTaskId,
        user_id: currentUserId,
        action_type: "UPDATE",
        entity_type: "calendar_event",
        entity_id: id,
        message: `Updated calendar event "${title.trim()}"`,
      });

      if (!pageRequestTracker.current.isLatest(requestId)) return;
      navigate("/calendar");
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Update calendar event error:", err);
      setError("Failed to update event.");
    } finally {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !currentUserId) return;

    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    const requestId = pageRequestTracker.current.next();
    setIsDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (deleteError) {
        setError(deleteError.message || "Failed to delete event.");
        return;
      }

      await supabase.from("activity_logs").insert({
        project_id: selectedProjectId === "NONE" ? null : selectedProjectId,
        task_id: selectedTaskId === "NONE" ? null : selectedTaskId,
        user_id: currentUserId,
        action_type: "DELETE",
        entity_type: "calendar_event",
        entity_id: id,
        message: `Deleted calendar event "${title.trim()}"`,
      });

      if (!pageRequestTracker.current.isLatest(requestId)) return;
      navigate("/calendar");
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Delete calendar event error:", err);
      setError("Failed to delete event.");
    } finally {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      setIsDeleting(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/calendar")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-white">Edit Event</h1>
            <p className="text-slate-400">Update or delete this calendar event</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadPage("refresh")}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {isPageBusy && (
              <Alert className="bg-indigo-900/20 border-indigo-800 text-indigo-200">
                <AlertDescription className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading event details...
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isPageBusy}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="bg-slate-950 border-slate-800 text-white resize-none"
                  disabled={isPageBusy}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Event Type</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) => setEventType(value as EventType)}
                  disabled={isPageBusy}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Reminder</Label>
                <Select
                  value={reminderMinutes}
                  onValueChange={(value) => setReminderMinutes(value as ReminderValue)}
                  disabled={isPageBusy}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="NONE">No reminder</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <Checkbox
                  checked={allDay}
                  onCheckedChange={(checked) => setAllDay(Boolean(checked))}
                  disabled={isPageBusy}
                />
                <Label className="text-slate-300">All Day Event</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const nextStartDate = e.target.value;
                    setStartDate(nextStartDate);

                    setEndDate((prevEndDate) => {
                      if (!prevEndDate || prevEndDate < nextStartDate) {
                        return nextStartDate;
                      }
                      return prevEndDate;
                    });
                  }}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isPageBusy}
                />
              </div>

              {!allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Time</Label>
                  <Input
                    type="time"
                    step="60"
                    inputMode="numeric"
                    pattern="[0-9]{2}:[0-9]{2}"
                    value={startTime}
                    onChange={(e) => {
                      const nextStartTime = e.target.value;
                      setStartTime(nextStartTime);

                      const autoDuration = usesDuration ? Number(meetingDuration || 60) : 60;
                      const nextEndTime = addMinutesToTime(nextStartTime, autoDuration);
                      setEndTime(nextEndTime);

                      const [startHour, startMinute] = nextStartTime.split(":").map(Number);
                      const startTotal = startHour * 60 + startMinute;
                      const endTotal = startTotal + autoDuration;

                      if (endTotal >= 1440) {
                        setEndDate(addDaysToDate(startDate, 1));
                      } else {
                        setEndDate(startDate);
                      }
                    }}
                    className="bg-slate-950 border-slate-800 text-white"
                    disabled={isPageBusy}
                  />
                </div>
              )}

              {usesDuration && !allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Duration</Label>
                  <Select
                    value={meetingDuration}
                    onValueChange={(value) => setMeetingDuration(value as MeetingDurationValue)}
                    disabled={isPageBusy}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(needsStartAndEnd || usesDuration) && (
                <div className="space-y-2">
                  <Label className="text-slate-300">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
                    disabled={usesDuration || isPageBusy}
                  />
                </div>
              )}

              {needsStartAndEnd && !allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">End Time</Label>
                  <Input
                    type="time"
                    step="60"
                    inputMode="numeric"
                    pattern="[0-9]{2}:[0-9]{2}"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
                    disabled={isPageBusy}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Related Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setSelectedTaskId("NONE");
                  }}
                  disabled={isPageBusy}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="NONE">None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Related Task</Label>
                <Select
                  value={selectedTaskId}
                  onValueChange={setSelectedTaskId}
                  disabled={selectedProjectId === "NONE" || isLoadingRelatedData || isPageBusy}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="NONE">None</SelectItem>
                    {filteredTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-900/20"
                onClick={() => void handleDelete()}
                disabled={isDeleting || isPageBusy}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => navigate("/calendar")}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSaving || isPageBusy}
                >
                  {isSaving ? "Saving..." : isPageBusy ? "Loading..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
