import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";

import { getVisibleProjectIds } from "@/lib/permissions";

import { useAppClock } from "@/lib/clock/provider";
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
import { RefreshCw } from "lucide-react";
import { AixiaButton, AixiaHero, AixiaPage } from "@/components/aixia";

import {
  calendarFormSelectContentClassName,
  calendarFormSelectContentProps,
  calendarFormSelectItemClassName,
} from "@/app/calendar/formSelectContentProps";
import {
  parseCheckboxChecked,
  type MeetingDurationValue as SharedMeetingDurationValue,
} from "@/app/calendar/calendarEventFormTime";

import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";
import "@/styles/calendar/calendar-visual.css";

type EventType =
  | "meeting"
  | "task"
  | "reminder"
  | "deadline"
  | "call"
  | "personal"
  | "other";

type ReminderValue = "NONE" | "5" | "10" | "15" | "30" | "60";
type MeetingDurationValue = SharedMeetingDurationValue;

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

function normalizeTime(value: string) {
  const [rawHour = "09", rawMinute = "00"] = (value || "09:00").split(":");
  const safeHour = /^\d{2}$/.test(rawHour) ? rawHour : "09";
  const safeMinute = /^\d{2}$/.test(rawMinute) ? rawMinute : "00";
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

function CalendarFormSkeleton() {
  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page aixia-calendar-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel="Calendar"
        parentPath="/calendar"
        gradientTitle="Calendar"
        title="New event"
        subtitle="Loading calendar form…"
      />

      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
          <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card w-full">
            <CardContent className="p-4 lg:p-6">
              <div className="aixia-calendar-new-form-fields">
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className={`space-y-2 ${index < 2 ? "md:col-span-2" : ""}`}
                    >
                      <div className="h-4 w-24 rounded aixia-projects-skeleton-bar animate-pulse" />
                      <div className="h-10 w-full rounded aixia-projects-skeleton-bar animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </AixiaPage>
  );
}

function TimeInput({
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
  return (
    <div className="space-y-1.5">
      <Label className="aixia-projects-label">{label}</Label>
      <Input
        type="time"
        value={normalizeTime(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="aixia-projects-input h-10"
      />
    </div>
  );
}

export default function CalendarNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();
  const clock = useAppClock();
  

  const presetDate = searchParams.get("date") || clock.todayKey;

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
          .is("deleted_at", null)
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
        setError(projectsError.message || t("calendarNew.errors.failedToLoadProjects"));
        setProjects([]);
      } else {
        const visibleProjectIds = getVisibleProjectIds(
  user.id,
  me.role,
  projectList,
  memberList
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
      setError(t("calendarNew.errors.failedToLoadForm"));
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

    setEndDate((prevEndDate: string) => {
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

  const clearAllDayForTimedFields = () => {
    if (allDay) setAllDay(false);
  };

  const handleAllDayChange = (checked: boolean | "indeterminate") => {
    const nextAllDay = parseCheckboxChecked(checked);
    setAllDay(nextAllDay);

    if (nextAllDay) {
      setEndDate((prevEndDate) => prevEndDate || startDate);
      return;
    }

    const duration = usesDuration ? Number(meetingDuration || 60) : 60;
    const nextStartTime = startTime || "09:00";
    setStartTime(nextStartTime);
    setEndTime(addMinutesToTime(nextStartTime, duration));
    setEndDate(startDate);
  };

  const handleMeetingDurationChange = (value: MeetingDurationValue) => {
    setMeetingDuration(value);
    clearAllDayForTimedFields();
  };

  const handleStartTimeChange = (nextStartTime: string) => {
    clearAllDayForTimedFields();
    setStartTime(nextStartTime);

    const autoDuration = usesDuration ? Number(meetingDuration || 60) : 60;
    const nextEndTime = addMinutesToTime(nextStartTime, autoDuration);
    setEndTime(nextEndTime);

    const [startHour, startMinute] = normalizeTime(nextStartTime).split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = startTotal + autoDuration;

    if (endTotal >= 1440) {
      setEndDate(addDaysToDate(startDate, 1));
    } else {
      setEndDate(startDate);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      setError(t("calendarNew.errors.userSessionNotFound"));
      return;
    }

    if (!title.trim()) {
      setError(t("calendarNew.errors.titleRequired"));
      return;
    }

    if (!startDate) {
      setError(t("calendarNew.errors.startDateRequired"));
      return;
    }

    if (!allDay && !startTime) {
      setError(t("calendarNew.errors.startTimeRequired"));
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
      setError(t("calendarNew.errors.endTimeRequired"));
      return;
    }

    if (
      !allDay &&
      needsStartAndEnd &&
      computedEndTime &&
      isEndBeforeStart(startDate, startTime, computedEndDate, computedEndTime)
    ) {
      setError(t("calendarNew.errors.endBeforeStart"));
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
        .select("id, project_id, task_id, title, start_date, start_time, reminder_minutes")
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (insertError || !insertedEvent) {
        setError(insertError?.message || t("calendarNew.errors.failedToCreateEvent"));
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

      if (insertedEvent.reminder_minutes && insertedEvent.start_time) {
        const eventTime = new Date(
          `${insertedEvent.start_date}T${insertedEvent.start_time}`
        );

        const reminderTime = new Date(
          eventTime.getTime() - insertedEvent.reminder_minutes * 60000
        );

        await supabase.from("calendar_event_reminder_deliveries").insert({
          calendar_event_id: insertedEvent.id,
          reminder_minutes: insertedEvent.reminder_minutes,
          reminder_at: reminderTime.toISOString(),
          delivery_status: "pending",
        });
      }

      if (!requestTracker.current.isLatest(requestId)) return;
      navigate("/calendar");
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Create event error:", err);
      setError(t("calendarNew.errors.failedToCreateEvent"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsSaving(false);
    }
  };

  if (isBootstrapping) {
    return <CalendarFormSkeleton />;
  }

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page aixia-calendar-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={t("calendar.header.title", "Calendar")}
        parentPath="/calendar"
        gradientTitle={t("calendar.header.title", "Calendar")}
        title={t("calendarNew.header.title")}
        subtitle={t("calendarNew.header.subtitle")}
        actions={
          <AixiaButton
            type="button"
            className="h-9"
            onClick={() => void loadPage("refresh")}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? t("calendarNew.buttons.refreshing") : t("calendarNew.buttons.refresh")}
          </AixiaButton>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
          <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card w-full">
            <CardContent className="p-4 lg:p-6">
              <form onSubmit={handleSubmit} className="aixia-calendar-new-form">
                {error && (
                  <Alert className="aixia-calendar-alert-error py-2 shrink-0">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="aixia-calendar-new-form-fields">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.title")}</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("calendarNew.placeholders.enterEventTitle")}
                        className="aixia-projects-input h-10"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.description")}</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("calendarNew.placeholders.optionalDescription")}
                        rows={4}
                        className="aixia-projects-textarea min-h-[96px] resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.eventType")}</Label>
                      <Select
                        value={eventType}
                        onValueChange={(value) => setEventType(value as EventType)}
                      >
                        <SelectTrigger className="aixia-projects-select-trigger h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          {...calendarFormSelectContentProps}
                          className={calendarFormSelectContentClassName}
                        >
                    <SelectItem value="meeting">{t("calendarNew.eventTypes.meeting")}</SelectItem>
                    <SelectItem value="task">{t("calendarNew.eventTypes.task")}</SelectItem>
                    <SelectItem value="reminder">{t("calendarNew.eventTypes.reminder")}</SelectItem>
                    <SelectItem value="deadline">{t("calendarNew.eventTypes.deadline")}</SelectItem>
                    <SelectItem value="call">{t("calendarNew.eventTypes.call")}</SelectItem>
                    <SelectItem value="personal">{t("calendarNew.eventTypes.personal")}</SelectItem>
                    <SelectItem value="other">{t("calendarNew.eventTypes.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.reminder")}</Label>
                      <Select
                        value={reminderMinutes}
                        onValueChange={(value) => setReminderMinutes(value as ReminderValue)}
                      >
                        <SelectTrigger className="aixia-projects-select-trigger h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          {...calendarFormSelectContentProps}
                          className={calendarFormSelectContentClassName}
                        >
                          <SelectItem value="NONE">{t("calendarNew.reminders.none")}</SelectItem>
                          <SelectItem value="5">{t("calendarNew.reminders.fiveMinutesBefore")}</SelectItem>
                          <SelectItem value="10">{t("calendarNew.reminders.tenMinutesBefore")}</SelectItem>
                          <SelectItem value="15">{t("calendarNew.reminders.fifteenMinutesBefore")}</SelectItem>
                          <SelectItem value="30">{t("calendarNew.reminders.thirtyMinutesBefore")}</SelectItem>
                          <SelectItem value="60">{t("calendarNew.reminders.oneHourBefore")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                      <Checkbox
                        id="calendar-new-all-day"
                        className="aixia-calendar-all-day-checkbox"
                        checked={allDay}
                        onCheckedChange={handleAllDayChange}
                      />
                      <Label
                        htmlFor="calendar-new-all-day"
                        className="aixia-projects-label cursor-pointer"
                      >
                        {t("calendarNew.fields.allDayEvent")}
                      </Label>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.startDate")}</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const nextStartDate = e.target.value;
                          setStartDate(nextStartDate);

                          setEndDate((prevEndDate: string) => {
                            if (!prevEndDate || prevEndDate < nextStartDate) {
                              return nextStartDate;
                            }
                            return prevEndDate;
                          });
                        }}
                        className="aixia-projects-input h-10"
                      />
                    </div>

                    {!allDay && (
                      <TimeInput
                        label={t("calendarNew.fields.startTime")}
                        value={startTime}
                        onChange={handleStartTimeChange}
                      />
                    )}

                    {usesDuration && !allDay && (
                      <div className="space-y-1.5">
                        <Label className="aixia-projects-label">{t("calendarNew.fields.duration")}</Label>
                        <Select
                          value={meetingDuration}
                          onValueChange={(value) =>
                            handleMeetingDurationChange(value as MeetingDurationValue)
                          }
                        >
                          <SelectTrigger className="aixia-projects-select-trigger h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                          {...calendarFormSelectContentProps}
                          className={calendarFormSelectContentClassName}
                        >
                            <SelectItem value="30">{t("calendarNew.durations.thirtyMinutes")}</SelectItem>
                            <SelectItem value="60">{t("calendarNew.durations.oneHour")}</SelectItem>
                            <SelectItem value="90">{t("calendarNew.durations.oneAndHalfHours")}</SelectItem>
                            <SelectItem value="120">{t("calendarNew.durations.twoHours")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(needsStartAndEnd || usesDuration) && (
                      <div className="space-y-1.5">
                        <Label className="aixia-projects-label">{t("calendarNew.fields.endDate")}</Label>
                        <Input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="aixia-projects-input h-10"
                          disabled={usesDuration}
                        />
                      </div>
                    )}

                    {needsStartAndEnd && !allDay && (
                      <TimeInput
                        label={t("calendarNew.fields.endTime")}
                        value={endTime}
                        onChange={(nextEndTime) => {
                          clearAllDayForTimedFields();
                          setEndTime(nextEndTime);
                        }}
                      />
                    )}

                    <div className="space-y-1.5">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.relatedProject")}</Label>
                      <Select
                        value={selectedProjectId}
                        onValueChange={(value) => {
                          setSelectedProjectId(value);
                          setSelectedTaskId("NONE");
                        }}
                      >
                        <SelectTrigger className="aixia-projects-select-trigger h-10">
                          <SelectValue placeholder={t("calendarNew.placeholders.selectProject")} />
                        </SelectTrigger>
                        <SelectContent
                          {...calendarFormSelectContentProps}
                          className={calendarFormSelectContentClassName}
                        >
                          <SelectItem value="NONE" className={calendarFormSelectItemClassName}>
                            {t("calendarNew.common.none")}
                          </SelectItem>
                          {projects.map((project) => (
                            <SelectItem
                              key={project.id}
                              value={project.id}
                              className={calendarFormSelectItemClassName}
                            >
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="aixia-projects-label">{t("calendarNew.fields.relatedTask")}</Label>
                      <Select
                        value={selectedTaskId}
                        onValueChange={setSelectedTaskId}
                        disabled={selectedProjectId === "NONE"}
                      >
                        <SelectTrigger className="aixia-projects-select-trigger h-10">
                          <SelectValue placeholder={t("calendarNew.placeholders.selectTask")} />
                        </SelectTrigger>
                        <SelectContent
                          {...calendarFormSelectContentProps}
                          className={calendarFormSelectContentClassName}
                        >
                          <SelectItem value="NONE" className={calendarFormSelectItemClassName}>
                            {t("calendarNew.common.none")}
                          </SelectItem>
                          {filteredTasks.map((task) => (
                            <SelectItem
                              key={task.id}
                              value={task.id}
                              className={calendarFormSelectItemClassName}
                            >
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="aixia-calendar-new-form-footer">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/calendar")}
                    className="aixia-dash-action h-9"
                  >
                    {t("calendarNew.buttons.cancel")}
                  </Button>

                  <Button
                    type="submit"
                    className="aixia-dash-action aixia-dash-action--primary h-9"
                    disabled={isSaving}
                  >
                    {isSaving ? t("calendarNew.buttons.creating") : t("calendarNew.buttons.createEvent")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      </div>
    </AixiaPage>
  );
}
