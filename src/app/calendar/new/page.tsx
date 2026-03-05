import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

const NONE = "__none__";

export default function CalendarNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");

  const { createCalendarEvent, projects, tasks } = useStore();

  const today = format(new Date(), "yyyy-MM-dd");
  const initialDate = dateParam || today;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(initialDate);
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);

  const [projectId, setProjectId] = useState<string>(NONE);
  const [taskId, setTaskId] = useState<string>(NONE);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredTasks = useMemo(() => {
    const list = tasks || [];
    if (projectId === NONE) return list;
    return list.filter((t: any) => t.projectId === projectId);
  }, [tasks, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Event title is required");
      return;
    }

    setIsLoading(true);

    try {
      const startDateTime = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
      const endDateTime = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;

      createCalendarEvent({
        title: title.trim(),
        description: description.trim(),
        startDate: startDateTime,
        endDate: endDateTime,
        allDay,
        projectId: projectId === NONE ? undefined : projectId,
        taskId: taskId === NONE ? undefined : taskId,
      });

      navigate("/calendar");
    } catch {
      setError("Failed to create event");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
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
          <p className="text-slate-400">Add a new event to your calendar</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">
                Event Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={allDay}
                onCheckedChange={(checked) => setAllDay(checked as boolean)}
              />
              <Label htmlFor="allDay" className="text-slate-300 cursor-pointer">
                All Day Event
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-300">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
              {!allDay && (
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-slate-300">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-slate-300">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
              {!allDay && (
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-slate-300">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Related Project</Label>
              <Select value={projectId} onValueChange={(v) => { setProjectId(v); setTaskId(NONE); }}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value={NONE}>None</SelectItem>
                  {(projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Related Task</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Select task (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value={NONE}>None</SelectItem>
                  {filteredTasks.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/calendar")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
