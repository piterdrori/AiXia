import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";

import { getVisibleProjectIds } from "@/lib/permissions";

import { useAppClock } from "@/lib/clock/provider";
import { AixiaButton, AixiaCommandMetrics, AixiaHero, AixiaPage } from "@/components/aixia";
import { Card, CardContent } from "@/components/ui/card";
import { PageError } from "@/components/ui/PageError";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  CalendarDays,
  CheckSquare,
} from "lucide-react";
import { getTaskCardTitle } from "@/lib/tasks/display";

import "@/styles/calendar/calendar-visual.css";

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  all_day: boolean | null;
  project_id: string | null;
  created_by: string | null;
};

type TaskRow = {
  id: string;
  title: string;
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

type CalendarEventAccessRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  all_day: boolean | null;
  project_id: string | null;
  created_by: string | null;
};

function toYYYYMMDD(date: Date, clock?: ReturnType<typeof useAppClock>) {
  return format(clock ? clock.shiftDate(date) : date, "yyyy-MM-dd");
}

const CALENDAR_SELECTED_DAY_KEY = "aixia-calendar-selected-day";
const MONTH_CELL_PREVIEW_COUNT = 2;

type CalendarDayItem =
  | { kind: "event"; id: string; title: string }
  | { kind: "task"; id: string; title: string };

function buildDayItems(
  dayEvents: CalendarEventRow[],
  dayTasks: TaskRow[],
  untitledTaskLabel: string
): CalendarDayItem[] {
  return [
    ...dayEvents.map((event) => ({
      kind: "event" as const,
      id: event.id,
      title: event.title,
    })),
    ...dayTasks.map((task) => ({
      kind: "task" as const,
      id: task.id,
      title: getTaskCardTitle(task, untitledTaskLabel),
    })),
  ];
}

function stopDayCellNav(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

type CalendarMonthDayCellProps = {
  dayKey: string;
  dayLabel: number;
  inMonth: boolean;
  isTodayDate: boolean;
  isSelectedDay: boolean;
  dayEvents: CalendarEventRow[];
  dayTasks: TaskRow[];
  todayLabel: string;
  onOpenDay: () => void;
  t: ReturnType<typeof useLanguage>["t"];
};

function CalendarMonthDayCell({
  dayKey,
  dayLabel,
  inMonth,
  isTodayDate,
  isSelectedDay,
  dayEvents,
  dayTasks,
  todayLabel,
  onOpenDay,
  t,
}: CalendarMonthDayCellProps) {
  const dayItems = useMemo(
    () =>
      buildDayItems(
        dayEvents,
        dayTasks,
        t("taskDetail.fallbacks.untitled", "Untitled task")
      ),
    [dayEvents, dayTasks, t]
  );
  const hiddenCount = Math.max(0, dayItems.length - MONTH_CELL_PREVIEW_COUNT);
  const popoverDateLabel = useMemo(() => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return format(new Date(year, month - 1, day), "EEE, MMM d");
  }, [dayKey]);

  const handleCellKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    onOpenDay();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={popoverDateLabel}
      onClick={onOpenDay}
      onKeyDown={handleCellKeyDown}
      className={[
        "aixia-calendar-day-cell",
        !inMonth ? "aixia-calendar-day-cell--outside" : "",
        isTodayDate ? "aixia-calendar-day-cell--today" : "",
        isSelectedDay ? "aixia-calendar-day-cell--selected" : "",
        dayItems.length > MONTH_CELL_PREVIEW_COUNT
          ? "aixia-calendar-day-cell--dense"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="aixia-calendar-day-cell-hd">
        <div className="aixia-calendar-day-cell-date">{dayLabel}</div>

        <div className="aixia-calendar-day-cell-meta">
          {dayItems.length > 0 && (
            <span className="aixia-calendar-day-cell-count">{dayItems.length}</span>
          )}

          {isTodayDate && (
            <span className="aixia-dash-pill aixia-projects-pill--review text-[10px] px-1.5 py-0">
              {todayLabel}
            </span>
          )}
        </div>
      </div>

      {dayItems.length > 0 && (
        <div className="aixia-calendar-day-cell-body">
          <div className="aixia-calendar-day-cell-stack" aria-label={popoverDateLabel}>
            {dayItems.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className={[
                  "aixia-calendar-chip",
                  item.kind === "event"
                    ? "aixia-calendar-chip--event"
                    : "aixia-calendar-chip--task",
                ].join(" ")}
                title={item.title}
              >
                {item.title}
              </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="aixia-calendar-more-badge"
                  onPointerDown={stopDayCellNav}
                  onClick={stopDayCellNav}
                  aria-label={t("calendar.labels.moreItems", undefined, {
                    total: hiddenCount,
                  })}
                >
                  {t("calendar.labels.moreItems", undefined, { total: hiddenCount })}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="aixia-calendar-day-popover aixia-dash-panel aixia-dash-glass border-0 p-0 shadow-xl"
                onPointerDown={stopDayCellNav}
                onClick={stopDayCellNav}
              >
                <div className="aixia-calendar-day-popover-hd">
                  <p className="aixia-calendar-day-popover-date">{popoverDateLabel}</p>
                  <span className="aixia-calendar-day-cell-count">{dayItems.length}</span>
                </div>

                <div className="aixia-calendar-day-popover-list">
                  {dayItems.map((item) => (
                    <div
                      key={`popover-${item.kind}-${item.id}`}
                      className="aixia-calendar-day-popover-row"
                    >
                      <span
                        className={[
                          "aixia-calendar-day-popover-dot",
                          item.kind === "event"
                            ? "aixia-calendar-day-popover-dot--event"
                            : "aixia-calendar-day-popover-dot--task",
                        ].join(" ")}
                        aria-hidden
                      />
                      <div className="aixia-calendar-day-popover-row-text">
                        <span className="aixia-calendar-day-popover-kind">
                          {item.kind === "event"
                            ? t("calendar.labels.eventKind")
                            : t("calendar.labels.taskKind")}
                        </span>
                        <span className="aixia-calendar-day-popover-title">{item.title}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="aixia-calendar-day-popover-ft">
                  <button
                    type="button"
                    className="aixia-calendar-day-popover-open"
                    onClick={() => onOpenDay()}
                  >
                    {t("calendar.labels.viewDay")}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(cursor: Date) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();
  const clock = useAppClock();

  const [cursor, setCursor] = useState(clock.now);
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const gridDays = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const loadCalendar = async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    const monthStart = format(clock.shiftDate(startOfMonth(cursor)), "yyyy-MM-dd");
const monthEnd = format(clock.shiftDate(endOfMonth(cursor)), "yyyy-MM-dd");

    try {
      const session = await supabase.auth.getSession();
const user = session.data.session?.user;

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, role")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (profileError || !profileData) {
        console.error("Load profile error:", profileError);
        setEvents([]);
        setTasks([]);
        setLoadError(t("calendar.errors.failedToLoadCalendar"));
        return;
      }

      const currentProfile = profileData as ProfileRow;
     let visibleProjectIds = new Set<string>();

if (currentProfile.role !== "admin") {
  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, created_by");

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id, user_id")
    .eq("user_id", user.id);

  visibleProjectIds = getVisibleProjectIds(
    user.id,
    currentProfile.role,
    (allProjects || []) as ProjectRow[],
    (memberRows || []) as ProjectMemberRow[]
  );
}

                 const visibleProjectIdList = Array.from(visibleProjectIds);

      const eventsQuery =
        currentProfile.role === "admin"
          ? supabase
              .from("calendar_events")
              .select("id, title, description, event_type, start_date, all_day, project_id, created_by")
              .gte("start_date", monthStart)
              .lte("start_date", monthEnd)
              .order("start_date", { ascending: true })
          : visibleProjectIdList.length > 0
          ? supabase
              .from("calendar_events")
              .select("id, title, description, event_type, start_date, all_day, project_id, created_by")
              .gte("start_date", monthStart)
              .lte("start_date", monthEnd)
              .or(
                `created_by.eq.${user.id},project_id.in.(${visibleProjectIdList.join(",")})`
              )
              .order("start_date", { ascending: true })
          : supabase
              .from("calendar_events")
              .select("id, title, description, event_type, start_date, all_day, project_id, created_by")
              .gte("start_date", monthStart)
              .lte("start_date", monthEnd)
              .eq("created_by", user.id)
              .order("start_date", { ascending: true });

      const tasksQuery =
        currentProfile.role === "admin"
          ? supabase
              .from("tasks")
              .select("id, title, due_date, status, project_id")
              .is("deleted_at", null)
              .gte("due_date", monthStart)
              .lte("due_date", monthEnd)
              .order("due_date", { ascending: true })
          : visibleProjectIdList.length > 0
          ? supabase
              .from("tasks")
              .select("id, title, due_date, status, project_id")
              .is("deleted_at", null)
              .gte("due_date", monthStart)
              .lte("due_date", monthEnd)
              .in("project_id", visibleProjectIdList)
              .order("due_date", { ascending: true })
          : supabase
              .from("tasks")
              .select("id, title, due_date, status, project_id")
              .is("deleted_at", null)
              .gte("due_date", monthStart)
              .lte("due_date", monthEnd)
              .eq("project_id", "__no_visible_projects__")
              .order("due_date", { ascending: true });

      const [{ data: eventsData, error: eventsError }, { data: tasksData, error: tasksError }] =
        await Promise.all([eventsQuery, tasksQuery]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (eventsError) {
        console.error("Load calendar events error:", eventsError);
      }

      if (tasksError) {
        console.error("Load calendar tasks error:", tasksError);
      }

           const safeEvents = (eventsData || []) as CalendarEventAccessRow[];
      const safeTasks = (tasksData || []) as TaskRow[];

      setEvents(safeEvents);
      setTasks(safeTasks);

      if (eventsError || tasksError) {
        setLoadError(t("calendar.errors.someCalendarDataCouldNotBeLoaded"));
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load calendar error:", error);
      setEvents([]);
      setTasks([]);
      setLoadError(t("calendar.errors.failedToLoadCalendar"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCalendar("initial");
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();

    for (const event of events) {
      const key = event.start_date;
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    }

    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();

    for (const task of tasks) {
      if (!task.due_date) continue;
      const current = map.get(task.due_date) || [];
      current.push(task);
      map.set(task.due_date, current);
    }

    return map;
  }, [tasks]);

  const todayKey = clock.todayKey;

  const [activeSelectedDay, setActiveSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("day");
    if (fromQuery && /^\d{4}-\d{2}-\d{2}$/.test(fromQuery)) {
      setActiveSelectedDay(fromQuery);
      return;
    }
    try {
      const stored = sessionStorage.getItem(CALENDAR_SELECTED_DAY_KEY);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        setActiveSelectedDay(stored);
        return;
      }
    } catch {
      /* ignore storage errors */
    }
    setActiveSelectedDay(null);
  }, [searchParams]);

  const todayCount = useMemo(() => {
    const dayEvents = eventsByDay.get(todayKey) || [];
    const dayTasks = tasksByDay.get(todayKey) || [];
    return dayEvents.length + dayTasks.length;
  }, [eventsByDay, tasksByDay, todayKey]);

  const monthLabel = format(clock.shiftDate(cursor), "MMMM yyyy");

  const calendarMetricItems = useMemo(
    () => [
      {
        key: "today",
        title: t("calendar.badges.today"),
        value: String(todayCount),
        icon: Calendar,
        tone: "violet" as const,
      },
      {
        key: "events",
        title: "Events",
        value: String(events.length),
        icon: CalendarDays,
        tone: "indigo" as const,
      },
      {
        key: "tasksDue",
        title: "Tasks due",
        value: String(tasks.length),
        icon: CheckSquare,
        tone: "emerald" as const,
      },
    ],
    [todayCount, events.length, tasks.length, t]
  );

  const goPrevMonth = () => setCursor((prev) => subMonths(prev, 1));
  const goNextMonth = () => setCursor((prev) => addMonths(prev, 1));
  const goToday = () => setCursor(clock.now);

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-calendar-page h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        gradientTitle={t("calendar.header.title")}
        title={t("calendar.header.title")}
        subtitle={t("calendar.header.subtitle")}
        actions={
          <>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => void loadCalendar("refresh")}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? t("calendar.buttons.refreshing") : t("calendar.buttons.refresh")}
            </AixiaButton>

            <AixiaButton
              variant="primary"
              type="button"
              className="h-9"
              onClick={() => navigate("/calendar/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("calendar.buttons.newEvent")}
            </AixiaButton>
          </>
        }
      >
        <AixiaCommandMetrics items={calendarMetricItems} />

        <div className="aixia-command-toolbar">
          <div className="aixia-calendar-nav">
            <AixiaButton variant="icon" type="button" onClick={goPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </AixiaButton>

            <div className="aixia-calendar-nav-label">
              {monthLabel}
            </div>

            <AixiaButton variant="icon" type="button" onClick={goNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </AixiaButton>

            <AixiaButton type="button" onClick={goToday}>
              {t("calendar.buttons.today")}
            </AixiaButton>
          </div>
        </div>

        <PageError message={loadError} />
      </AixiaHero>

        <div className="aixia-command-scroll aixia-calendar-scroll">
      <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-calendar-month-panel">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="aixia-calendar-weekdays">
          {[
            t("calendar.weekdays.sun"),
            t("calendar.weekdays.mon"),
            t("calendar.weekdays.tue"),
            t("calendar.weekdays.wed"),
            t("calendar.weekdays.thu"),
            t("calendar.weekdays.fri"),
            t("calendar.weekdays.sat"),
          ].map((dayName) => (
            <div key={dayName} className="aixia-calendar-weekday">
              {dayName}
            </div>
          ))}
        </div>

        <div className="aixia-calendar-grid">
          {isBootstrapping
            ? Array.from({ length: 35 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="aixia-calendar-skeleton-cell"
                >
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-6 rounded aixia-projects-skeleton-bar" />
                      <div className="h-5 w-10 rounded aixia-projects-skeleton-bar" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-full rounded aixia-projects-skeleton-bar" />
                      <div className="h-5 w-5/6 rounded aixia-projects-skeleton-bar" />
                    </div>
                  </div>
                </div>
              ))
            : gridDays.map((day) => {
                const key = toYYYYMMDD(day, clock);
                const inMonth = isSameMonth(day, cursor);
                const isTodayDate = isSameDay(day, clock.now);
                const isSelectedDay = activeSelectedDay === key;

                const dayEvents = eventsByDay.get(key) || [];
                const dayTasks = tasksByDay.get(key) || [];
                return (
                  <CalendarMonthDayCell
                    key={key}
                    dayKey={key}
                    dayLabel={day.getDate()}
                    inMonth={inMonth}
                    isTodayDate={isTodayDate}
                    isSelectedDay={isSelectedDay}
                    dayEvents={dayEvents}
                    dayTasks={dayTasks}
                    todayLabel={t("calendar.badges.today")}
                    t={t}
                    onOpenDay={() => {
                      setActiveSelectedDay(key);
                      try {
                        sessionStorage.setItem(CALENDAR_SELECTED_DAY_KEY, key);
                      } catch {
                        /* ignore storage errors */
                      }
                      navigate(`/calendar/day/${key}`);
                    }}
                  />
                );
              })}
        </div>
        </CardContent>
      </Card>
        </div>
    </AixiaPage>
  );
}

