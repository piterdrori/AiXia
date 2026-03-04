import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react';
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
} from 'date-fns';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents, tasks, projects, refreshData } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    refreshData();
  }, []);

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => {
      const eventStart = format(parseISO(event.startDate), 'yyyy-MM-dd');
      const eventEnd = format(parseISO(event.endDate), 'yyyy-MM-dd');
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.dueDate && isSameDay(parseISO(task.dueDate), date)
    );
  };

  // Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="space-y-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="text-center text-sm font-medium text-slate-400 py-2">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((date, dateIndex) => {
                const events = getEventsForDate(date);
                const dayTasks = getTasksForDate(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={dateIndex}
                    onClick={() => navigate(`/calendar/new?date=${format(date, 'yyyy-MM-dd')}`)}
                    className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all hover:border-indigo-500/30 ${
                      isCurrentMonth 
                        ? 'bg-slate-900/50 border-slate-800' 
                        : 'bg-slate-950/50 border-slate-800/50'
                    } ${isTodayDate ? 'ring-1 ring-indigo-500' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate ? 'text-indigo-400' : isCurrentMonth ? 'text-white' : 'text-slate-600'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 truncate"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map((task, i) => (
                        <div
                          key={`task-${i}`}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            task.priority === 'URGENT' ? 'bg-red-500/20 text-red-300' :
                            task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          {task.title}
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
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {days.map((date, index) => {
            const events = getEventsForDate(date);
            const dayTasks = getTasksForDate(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                onClick={() => navigate(`/calendar/new?date=${format(date, 'yyyy-MM-dd')}`)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-indigo-500/30 ${
                  isTodayDate ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className={`text-center mb-4 ${isTodayDate ? 'text-indigo-400' : 'text-white'}`}>
                  <div className="text-sm">{format(date, 'EEE')}</div>
                  <div className="text-2xl font-bold">{format(date, 'd')}</div>
                </div>
                <div className="space-y-2">
                  {events.map((event, i) => (
                    <div
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300"
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayTasks.map((task, i) => (
                    <div
                      key={`task-${i}`}
                      className={`text-xs px-2 py-1 rounded ${
                        task.priority === 'URGENT' ? 'bg-red-500/20 text-red-300' :
                        task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {task.title}
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

  // Day View
  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    const dayTasks = getTasksForDate(currentDate);

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">{format(currentDate, 'EEEE, MMMM d')}</h2>
        </div>

        {/* Events */}
        {events.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">Events</h3>
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/calendar/${event.id}/edit`)}
                    className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-slate-500 text-sm">{event.description}</p>
                      )}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {format(parseISO(event.startDate), 'h:mm a')} - {format(parseISO(event.endDate), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        {dayTasks.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">Tasks Due</h3>
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'URGENT' ? 'bg-red-500' :
                      task.priority === 'HIGH' ? 'bg-orange-500' :
                      'bg-slate-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white font-medium">{task.title}</p>
                      <p className="text-slate-500 text-sm">{task.projectId && projects.find(p => p.id === task.projectId)?.name}</p>
                    </div>
                    <Badge className={
                      task.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' :
                      task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-500/20 text-slate-400'
                    }>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-slate-400">View and manage your schedule</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => navigate('/calendar/new')}
        >
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
            onClick={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : addDays(currentDate, -7))}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
            {viewMode === 'day' 
              ? format(currentDate, 'MMMM d, yyyy')
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addDays(currentDate, 7))}
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
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
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
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </CardContent>
      </Card>

      {/* Mini Calendar & Upcoming */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium text-white mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {calendarEvents
                .filter(e => parseISO(e.startDate) >= new Date())
                .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/calendar/${event.id}/edit`)}
                    className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{event.title}</p>
                      <p className="text-slate-500 text-sm">
                        {format(parseISO(event.startDate), 'MMM d, yyyy')} at {format(parseISO(event.startDate), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              {calendarEvents.filter(e => parseISO(e.startDate) >= new Date()).length === 0 && (
                <p className="text-slate-500 text-center py-4">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium text-white mb-4">Filter by Project</h3>
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-300 text-sm">{project.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
