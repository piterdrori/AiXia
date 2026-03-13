import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";

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

type ProjectRow = {
  id: string;
  name: string;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
  due_date: string | null;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);

const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function normalizeTime(value: string) {
  const [rawHour = "09", rawMinute = "00"] = (value || "09:00").split(":");
  const hour = HOUR_OPTIONS.includes(rawHour) ? rawHour : "09";
  const minute = MINUTE_OPTIONS.includes(rawMinute) ? rawMinute : "00";
  return `${hour}:${minute}`;
}

function getHour(value: string) {
  return normalizeTime(value).split(":")[0];
}

function getMinute(value: string) {
  return normalizeTime(value).split(":")[1];
}

function buildTime(hour: string, minute: string) {
  const safeHour = HOUR_OPTIONS.includes(hour) ? hour : "00";
  const safeMinute = MINUTE_OPTIONS.includes(minute) ? minute : "00";
  return `${safeHour}:${safeMinute}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(":").map(Number);
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
  const start = new Date(`${startDate}T${normalizeTime(startTime)}`);
  const end = new Date(`${endDate}T${normalizeTime(endTime)}`);
  return end.getTime() < start.getTime();
}

function Time24Field({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const hour = getHour(value);
  const minute = getMinute(value);

  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={hour}
          onValueChange={(nextHour) => onChange(buildTime(nextHour, minute))}
          disabled={disabled}
        >
          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-slate-800 text-white max-h-64">
            {HOUR_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={minute}
          onValueChange={(nextMinute) => onChange(buildTime(hour, nextMinute))}
          disabled={disabled}
        >
          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
            <SelectValue placeholder="Minute" />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-slate-800 text-white max-h-64">
            {MINUTE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CalendarFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-slate-800 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-80 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className={`space-y-2 ${index < 2 ? "md:col-span-2" : ""}`}
              >
                <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
                <div className="h-10 w-full rounded bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());

  const presetDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [reminderMinutes, setReminderMinutes] = useState<ReminderValue>("5");

  const [startDate, setStartDate] = useState(presetDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(presetDate);
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);

  const [meetingDuration, setMeetingDuration] =
    useState<MeetingDurationValue>("60");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("NONE");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("NONE");

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const usesDuration = useMemo(() => eventType === "meeting", [eventType]);

  const needsStartAndEnd = useMemo(() => {
    return eventType === "task" || eventType === "deadline" || eventType === "other";
  }, [eventType]);

  const needsSingleTimeOnly = useMemo(() => {
    return eventType === "reminder" || eventType === "call" || eventType === "personal";
  }, [eventType]);

  const loadPage = async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [
        { data: me, error: meError },
        { data: allProjects, error: projectsError },
        { data: allProjectMembers, error: membersError },
        { data: allTasks, error: tasksError },
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase
          .from("projects")
          .select("id, name, created_by")
          .order("created_at", { ascending: false }),
        supabase.from("project_members").select("project_id, user_id"),
        supabase
          .from("tasks")
          .select("id, title, project_id, due_date")
          .order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (meError || !me) {
        navigate("/calendar");
        return;
      }

      const projectList = (allProjects || []) as ProjectRow[];
      const memberList = (allProjectMembers || []) as ProjectMemberRow[];
      const taskList = (allTasks || []) as TaskRow[];

      if (projectsError) {
        setError(projectsError.message || "Failed to load projects.");
        setProjects([]);
      } else {
        const visibleProjectIds =
          me.role === "admin"
            ? new Set(projectList.map((project) => project.id))
            : new Set(
                projectList
                  .filter(
                    (project) =>
                      project.created_by === user.id ||
                      memberList.some(
                        (member) =>
                          member.project_id === project.id && member.user_id === user.id
                      )
                  )
                  .map((project) => project.id)
              );

        const visibleProjects = projectList.filter((project) =>
          visibleProjectIds.has(project.id)
        );

        setProjects(visibleProjects);

        if (
          selectedProjectId !== "NONE" &&
          !visibleProjects.some((project) => project.id === selectedProjectId)
        ) {
          setSelectedProjectId("NONE");
          setSelectedTaskId("NONE");
        }

        if (!tasksError && !membersError) {
          setTasks(
            taskList.filter(
              (task) => !task.project_id || visibleProjectIds.has(task.project_id)
            )
          );
        }
      }

      if (tasksError || membersError) {
        setTasks([]);
      }
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar new page error:", err);
      setError("Failed to load calendar form.");
      setProjects([]);
      setTasks([]);
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPage("initial");
  }, []);

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

    const [startHour, startMinute] = normalizeTime(startTime).split(":").map(Number);
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
    } else if (
      selectedTaskId !== "NONE" &&
      !tasks.some(
        (task) =>
          task.id === selectedTaskId && task.project_id === selectedProjectId
      )
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
      const nextEndTime = addMinutesToTime(startTime, duration);
      setEndTime(nextEndTime);

      const [startHour, startMinute] = normalizeTime(startTime).split(":").map(Number);
      const startTotal = startHour * 60 + startMinute;
      const endTotal = startTotal + duration;

      if (endTotal >= 1440) {
        setEndDate(addDaysToDate(startDate, 1));
      } else {
        setEndDate(startDate);
      }
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

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "NONE") return [];
    return tasks.filter((task) => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
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
      ? normalizeTime(startTime)
      : usesDuration
      ? addMinutesToTime(startTime, Number(meetingDuration || 60))
      : normalizeTime(endTime);

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

    const requestId = requestTracker.current.next();
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        start_date: startDate,
        start_time: allDay ? null : normalizeTime(startTime),
        end_date: computedEndDate,
        end_time: computedEndTime,
        all_day: allDay,
        project_id: selectedProjectId === "NONE" ? null : selectedProjectId,
        task_id: selectedTaskId === "NONE" ? null : selectedTaskId,
        created_by: currentUserId,
        reminder_minutes: reminderMinutes === "NONE" ? null : Number(reminderMinutes),
      };

      const { data: insertedEvent, error: insertError } = await supabase
        .from("calendar_events")
        .insert(payload)
        .select("id, project_id, task_id, title, start_date")
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (insertError || !insertedEvent) {
        setError(insertError?.message || "Failed to create event.");
        return;
      }

      await supabase.from("activity_logs").insert({
        project_id: insertedEvent.project_id,
        task_id: insertedEvent.task_id,
        user_id: currentUserId,
        action_type: "CREATE",
        entity_type: "calendar_event",
        entity_id: insertedEvent.id,
        message: `Created calendar event "${insertedEvent.title}" for ${insertedEvent.start_date}`,
      });

      if (!requestTracker.current.isLatest(requestId)) return;
      navigate("/calendar");
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Create event error:", err);
      setError("Failed to create event.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsSaving(false);
    }
  };

  if (isBootstrapping) {
    return <CalendarFormSkeleton />;
  }

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
            <h1 className="text-2xl font-bold text-white">Create New Event</h1>
            <p className="text-slate-400">
              Add a calendar event and connect it to projects or tasks
            </p>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={4}
                  className="bg-slate-950 border-slate-800 text-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Event Type</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) => setEventType(value as EventType)}
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
                />
              </div>

              {!allDay && (
                <Time24Field
                  label="Start Time"
                  value={startTime}
                  onChange={(nextStartTime) => {
                    setStartTime(nextStartTime);

                    const autoDuration = usesDuration ? Number(meetingDuration || 60) : 60;
                    const nextEndTime = addMinutesToTime(nextStartTime, autoDuration);
                    setEndTime(nextEndTime);

                    const [startHour, startMinute] = normalizeTime(nextStartTime)
                      .split(":")
                      .map(Number);
                    const startTotal = startHour * 60 + startMinute;
                    const endTotal = startTotal + autoDuration;

                    if (endTotal >= 1440) {
                      setEndDate(addDaysToDate(startDate, 1));
                    } else {
                      setEndDate(startDate);
                    }
                  }}
                />
              )}

              {usesDuration && !allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Duration</Label>
                  <Select
                    value={meetingDuration}
                    onValueChange={(value) =>
                      setMeetingDuration(value as MeetingDurationValue)
                    }
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
                    disabled={usesDuration}
                  />
                </div>
              )}

              {needsStartAndEnd && !allDay && (
                <Time24Field
                  label="End Time"
                  value={endTime}
                  onChange={setEndTime}
                />
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Related Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setSelectedTaskId("NONE");
                  }}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select project" />
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
                  disabled={selectedProjectId === "NONE"}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select task" />
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

            <div className="flex justify-end gap-3">
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
                disabled={isSaving}
              >
                {isSaving ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
