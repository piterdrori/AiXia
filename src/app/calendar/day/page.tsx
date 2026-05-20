import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { getVisibleProjectIds } from "@/lib/permissions";
import { useUserPreferences } from "@/lib/useUserPreferences";
import { formatDateTimeInTimezone, formatTimeInTimezone } from "@/lib/datetime";
import { useAppClock } from "@/lib/clock/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageError } from "@/components/ui/PageError";
import { Plus, Pencil, RefreshCw, CalendarDays, CheckSquare } from "lucide-react";
import { AixiaButton, AixiaHero, AixiaPage, AixiaWorkspaceCard } from "@/components/aixia";
import type { AixiaWorkspaceTone } from "@/components/aixia/AixiaWorkspaceCard";
import { getTaskCardDescription, getTaskCardTitle } from "@/lib/tasks/display";

import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";
import "@/styles/calendar/calendar-visual.css";

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  all_day: boolean | null;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  project_id: string | null;
};

type Role = "admin" | "manager" | "employee" | "guest";

type ProfileRow = {
  user_id: string;
  role: Role;
};

type ProjectRow = {
  id: string;
  created_by: string | null;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

const CALENDAR_SELECTED_DAY_KEY = "aixia-calendar-selected-day";

function parseYYYYMMDD(value: string | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}


function getTaskWorkspaceTone(status: string | null): AixiaWorkspaceTone {
  if (!status) return "indigo";
  const normalized = status.toUpperCase();
  if (normalized === "DONE" || normalized === "COMPLETED") return "emerald";
  if (normalized === "IN_PROGRESS") return "cyan";
  if (normalized === "IN_REVIEW" || normalized === "REVIEW") return "violet";
  return "amber";
}

export default function CalendarDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t, language } = useLanguage();
  const { timezone } = useUserPreferences();
  const clock = useAppClock();

  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, string>>({});
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const selectedDate = useMemo(() => {
    const parsed = parseYYYYMMDD(date);
    return parsed ? clock.shiftDate(parsed) : null;
  }, [date, clock]);
  const dateStr = date || "";

  const loadDay = async (mode: "initial" | "refresh" = "initial") => {
    if (!date) return;

    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: allProjects, error: projectsError },
        { data: memberRows, error: membersError },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, role").eq("user_id", user.id).single(),
        supabase.from("projects").select("id, created_by"),
        supabase.from("project_members").select("project_id, user_id").eq("user_id", user.id),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (profileError || !profileData || projectsError || membersError) {
        console.error(
          "Load calendar day access error:",
          profileError || projectsError || membersError
        );
        setEvents([]);
        setTasks([]);
        setLoadError(t("calendarDay.errors.failedToLoadDay"));
        return;
      }

      const profile = profileData as ProfileRow;
      const projectList = (allProjects || []) as ProjectRow[];
      const membershipList = (memberRows || []) as ProjectMemberRow[];

      const visibleProjectIds = getVisibleProjectIds(
        user.id,
        profile.role,
        projectList,
        membershipList
      );

      const [
        { data: eventsData, error: eventsError },
        { data: tasksData, error: tasksError },
        { data: projectsFull },
        { data: allVisibleTasksForNames },
      ] = await Promise.all([
        supabase
          .from("calendar_events")
          .select(
            "id, title, description, event_type, start_date, start_time, end_date, end_time, all_day, project_id, task_id, created_by"
          )
          .eq("start_date", date)
          .order("start_time", { ascending: true }),

        supabase
          .from("tasks")
          .select("id, title, description, due_date, status, project_id")
          .is("deleted_at", null)
          .eq("due_date", date)
          .order("created_at", { ascending: false }),

        supabase.from("projects").select("id, name"),

        supabase.from("tasks").select("id, title, project_id"),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (eventsError) {
        console.error("Load calendar day events error:", eventsError);
      }

      if (tasksError) {
        console.error("Load calendar day tasks error:", tasksError);
      }

      const safeEvents = ((eventsData || []) as CalendarEventRow[]).filter((event) => {
        if (profile.role === "admin") return true;
        if (!event.project_id) return event.created_by === user.id;
        return visibleProjectIds.has(event.project_id);
      });

      const safeTasks = ((tasksData || []) as TaskRow[]).filter((task) => {
        if (profile.role === "admin") return true;
        if (!task.project_id) return false;
        return visibleProjectIds.has(task.project_id);
      });

      setEvents(safeEvents);
      setTasks(safeTasks);

      const projectMap: Record<string, string> = {};
      ((projectsFull || []) as Array<{ id: string; name: string }>).forEach((project) => {
        projectMap[project.id] = project.name;
      });

      const taskMap: Record<string, string> = {};
      ((allVisibleTasksForNames || []) as Array<{
        id: string;
        title: string;
        project_id: string | null;
      }>)
        .filter((task) => {
          if (profile.role === "admin") return true;
          if (!task.project_id) return false;
          return visibleProjectIds.has(task.project_id);
        })
        .forEach((task) => {
          taskMap[task.id] = getTaskCardTitle(
            task,
            t("taskDetail.fallbacks.untitled", "Untitled task"),
          );
        });

      setProjectsMap(projectMap);
      setTasksMap(taskMap);

      if (eventsError || tasksError) {
        setLoadError(t("calendarDay.errors.someDayDataCouldNotBeLoaded"));
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar day error:", error);
      setEvents([]);
      setTasks([]);
      setLoadError(t("calendarDay.errors.failedToLoadDay"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDay("initial");
  }, [date]);

  useEffect(() => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    try {
      sessionStorage.setItem(CALENDAR_SELECTED_DAY_KEY, date);
    } catch {
      /* ignore storage errors */
    }
  }, [date]);

  const isTodayDate = date === clock.todayKey;

  if (!selectedDate) {
    return (
      <div className="aixia-dash-page aixia-dash-page--command aixia-calendar-page aixia-calendar-page--day h-full flex flex-col overflow-hidden">
        <div className="aixia-dash-3d-decor" aria-hidden>
          <span className="aixia-dash-orb aixia-dash-orb--a" />
          <span className="aixia-dash-orb aixia-dash-orb--b" />
          <span className="aixia-dash-orb aixia-dash-orb--c" />
        </div>
        <div className="aixia-dash-3d-stack flex min-h-0 flex-1 flex-col">
          <div className="aixia-calendar-scroll flex min-h-0 flex-1 flex-col">
            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card w-full">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-dash-panel-hd">
                  <h2 className="aixia-dash-panel-title">
                    {t("calendarDay.invalidDate.title")}
                  </h2>
                </div>
                <p className="aixia-calendar-empty mt-3">
                  {t("calendarDay.invalidDate.description")}
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => navigate("/calendar")}
                    className="aixia-dash-action aixia-dash-action--primary h-9"
                  >
                    {t("calendarDay.invalidDate.back")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const dateLabel = new Intl.DateTimeFormat(
    language === "ru" ? "ru-RU" : language === "zh" ? "zh-CN" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(clock.shiftDate(selectedDate));

  const totalItems = events.length + tasks.length;
  const dayHeroClassName = [
    "shrink-0",
    "aixia-calendar-day-hero",
    isTodayDate ? "aixia-calendar-day-hero--today" : "aixia-calendar-day-hero--selected",
  ].join(" ");

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page aixia-calendar-page--day h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className={dayHeroClassName}
        parentLabel={t("calendar.header.title", "Calendar")}
        parentPath="/calendar"
        gradientTitle={t("calendar.header.title", "Calendar")}
        title={dateLabel}
        subtitle={t("calendarDay.header.subtitle")}
        badges={[
          {
            label: t("calendarDay.header.itemsCount", undefined, { total: totalItems }),
            tone: "indigo",
          },
        ]}
        actions={
          <>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => void loadDay("refresh")}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing
                ? t("calendarDay.buttons.refreshing")
                : t("calendarDay.buttons.refresh")}
            </AixiaButton>

            <AixiaButton
              variant="primary"
              type="button"
              className="h-9"
              onClick={() => navigate(`/calendar/new?date=${encodeURIComponent(dateStr)}`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("calendarDay.buttons.newEvent")}
            </AixiaButton>
          </>
        }
      />
      <div className="aixia-command-scroll aixia-calendar-scroll flex min-h-0 flex-1 flex-col">
          <PageError message={loadError} />

          <div className="aixia-calendar-day-sections">
            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-calendar-section-card">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-dash-panel-hd">
                  <h2 className="aixia-dash-panel-title">
                    {t("calendarDay.sections.events")}
                  </h2>
                </div>

                <div className="aixia-calendar-item-list mt-3">
                  {isBootstrapping ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`event-skeleton-${index}`}
                        className="aixia-workspace-card aixia-workspace-card-neutral aixia-workspace-card--compact animate-pulse"
                      >
                        <div className="aixia-workspace-card-body">
                          <div className="h-3 w-24 rounded aixia-projects-skeleton-bar mb-2" />
                          <div className="h-5 w-48 rounded aixia-projects-skeleton-bar mb-2" />
                          <div className="h-4 w-full rounded aixia-projects-skeleton-bar" />
                        </div>
                      </div>
                    ))
                  ) : events.length === 0 ? (
                    <p className="aixia-calendar-empty">{t("calendarDay.empty.noEvents")}</p>
                  ) : (
                    events.map((event) => {
                      const eventStart = `${event.start_date}T${event.start_time || "00:00"}`;
                      const timeSummary = event.all_day
                        ? t("calendarDay.badges.allDay")
                        : `${formatTimeInTimezone(eventStart, language, timezone)} • ${formatDateTimeInTimezone(eventStart, language, timezone)}`;

                      return (
                        <AixiaWorkspaceCard
                          key={event.id}
                          as="div"
                          size="compact"
                          icon={CalendarDays}
                          eyebrow={(event.event_type || t("calendarDay.common.other")).toUpperCase()}
                          label={event.title}
                          description={event.description || undefined}
                          statusLabel={
                            event.all_day
                              ? t("calendarDay.badges.allDay").toUpperCase()
                              : formatTimeInTimezone(eventStart, language, timezone)
                          }
                          summary={timeSummary}
                          tone="cyan"
                          onClick={() => navigate(`/calendar/${event.id}/edit`)}
                          topRightSlot={
                            <AixiaButton
                              variant="icon"
                              className="h-8 w-8"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                navigate(`/calendar/${event.id}/edit`);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </AixiaButton>
                          }
                        >
                          {(event.project_id || event.task_id) && (
                            <div className="aixia-calendar-item-card-meta text-xs text-[var(--aixia-dash-muted)] space-y-1">
                              {event.project_id && (
                                <div>{projectsMap[event.project_id] || "Unknown Project"}</div>
                              )}
                              {event.task_id && (
                                <div>{tasksMap[event.task_id] || "Unknown Task"}</div>
                              )}
                            </div>
                          )}
                        </AixiaWorkspaceCard>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-calendar-section-card">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-dash-panel-hd">
                  <h2 className="aixia-dash-panel-title">
                    {t("calendarDay.sections.tasksDue")}
                  </h2>
                </div>

                <div className="aixia-calendar-item-list mt-3">
                  {isBootstrapping ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`task-skeleton-${index}`}
                        className="aixia-workspace-card aixia-workspace-card-neutral aixia-workspace-card--compact animate-pulse"
                      >
                        <div className="aixia-workspace-card-body">
                          <div className="h-3 w-20 rounded aixia-projects-skeleton-bar mb-2" />
                          <div className="h-5 w-44 rounded aixia-projects-skeleton-bar mb-2" />
                          <div className="h-4 w-full rounded aixia-projects-skeleton-bar" />
                        </div>
                      </div>
                    ))
                  ) : tasks.length === 0 ? (
                    <p className="aixia-calendar-empty">{t("calendarDay.empty.noTasksDue")}</p>
                  ) : (
                    tasks.map((task) => (
                      <AixiaWorkspaceCard
                        key={task.id}
                        as="div"
                        size="compact"
                        icon={CheckSquare}
                        eyebrow={t("calendarDay.sections.tasksDue", "TASKS DUE").toUpperCase()}
                        label={getTaskCardTitle(
                          task,
                          t("taskDetail.fallbacks.untitled", "Untitled task"),
                        )}
                        description={
                          (task.description ?? "").trim()
                            ? getTaskCardDescription(task, "")
                            : undefined
                        }
                        statusLabel={task.status?.replaceAll("_", " ").toUpperCase() || "OPEN"}
                        summary={
                          task.project_id
                            ? projectsMap[task.project_id] || "Unknown Project"
                            : t("calendarDay.empty.noProject", "No project")
                        }
                        tone={getTaskWorkspaceTone(task.status)}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </AixiaPage>
  );
}
