import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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
import { ArrowLeft, Trash2 } from "lucide-react";

type EventType =
  | "meeting"
  | "task"
  | "reminder"
  | "deadline"
  | "call"
  | "personal"
  | "other";

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

export default function CalendarEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("NONE");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("NONE");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      if (!id) {
        navigate("/calendar");
        return;
      }

      setIsLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

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
              "id, title, description, event_type, start_date, start_time, end_date, end_time, all_day, project_id, task_id, created_by"
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

      setProjects((projectsData || []) as ProjectRow[]);
      setTasks((tasksData || []) as TaskRow[]);
      setIsLoading(false);
    };

    loadPage();
  }, [id, navigate]);

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "NONE") return [];
    return tasks.filter((task) => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUserId) return;

    setIsSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message || "Failed to update event.");
      setIsSaving(false);
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

    setIsSaving(false);
    navigate("/calendar");
  };

  const handleDelete = async () => {
    if (!id || !currentUserId) return;

    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    const { error: deleteError } = await supabase.from("calendar_events").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete event.");
      setIsDeleting(false);
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

    navigate("/calendar");
  };

  if (isLoading) {
    return <div className="text-slate-400">Loading event...</div>;
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
          <h1 className="text-2xl font-bold text-white">Edit Event</h1>
          <p className="text-slate-400">Update or delete this calendar event</p>
        </div>
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                  disabled={selectedProjectId === "NONE"}
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
                onClick={handleDelete}
                disabled={isDeleting}
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
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
