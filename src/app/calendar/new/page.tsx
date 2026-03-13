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
import { ArrowLeft, Loader2 } from "lucide-react";

type EventType =
  | "meeting"
  | "task"
  | "reminder"
  | "deadline"
  | "call"
  | "personal"
  | "other";

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

export default function CalendarNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());

  const presetDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [startDate, setStartDate] = useState(presetDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(presetDate);
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("NONE");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("NONE");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      const requestId = requestTracker.current.next();
      setIsLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

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

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (meError || !me) {
          navigate("/calendar");
          return;
        }

        if (projectsError) {
          setError(projectsError.message || "Failed to load projects.");
          setProjects([]);
        } else {
          const projectList = (allProjects || []) as ProjectRow[];
          const memberList = (allProjectMembers || []) as ProjectMemberRow[];

          const visibleProjectIds =
            me.role === "admin"
              ? new Set(projectList.map((p) => p.id))
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

          const visibleProjects = projectList.filter((p) => visibleProjectIds.has(p.id));
          setProjects(visibleProjects);

          if (
            selectedProjectId !== "NONE" &&
            !visibleProjects.some((project) => project.id === selectedProjectId)
          ) {
            setSelectedProjectId("NONE");
          }
        }

        if (tasksError || membersError) {
          setTasks([]);
        } else {
          setTasks((allTasks || []) as TaskRow[]);
        }
      } catch (err) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Load calendar new page error:", err);
        setError("Failed to load calendar form.");
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [navigate, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "NONE") return [];
    return tasks.filter((task) => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) return;

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
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
        start_time: allDay ? null : startTime || null,
        end_date: endDate || startDate,
        end_time: allDay ? null : endTime || null,
        all_day: allDay,
        project_id: selectedProjectId === "NONE" ? null : selectedProjectId,
        task_id: selectedTaskId === "NONE" ? null : selectedTaskId,
        created_by: currentUserId,
      };

      const { data: insertedEvent, error: insertError } = await supabase
        .from("calendar_events")
        .insert(payload)
        .select("id, project_id, task_id, title, start_date")
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (insertError || !insertedEvent) {
        setError(insertError?.message || "Failed to create event.");
        setIsSaving(false);
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

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <p className="text-slate-400">Add a calendar event and connect it to projects or tasks</p>
        </div>
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
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
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

              <div className="flex items-center gap-3 pt-8">
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
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {!allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {!allDay && (
                <div className="space-y-2">
                  <Label className="text-slate-300">End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
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
