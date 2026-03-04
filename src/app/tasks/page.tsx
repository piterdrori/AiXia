import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  CheckSquare,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { TaskStatus, TaskPriority } from '@/types';

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'bg-slate-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500' },
  { id: 'DONE', label: 'Done', color: 'bg-green-500' },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const { 
    tasks, 
    projects, 
    users, 
    hasPermission,
    moveTask,
    deleteTask,
    refreshData,
  } = useStore();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>(projectId || 'ALL');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const filteredTasks = tasks
    .filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchesProject = projectFilter === 'ALL' || t.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask) {
      moveTask(draggedTask, status);
      setDraggedTask(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400">Manage and organize your tasks</p>
        </div>
        {hasPermission('createTasks') && (
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate(`/tasks/new${projectId ? `?projectId=${projectId}` : ''}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
            <ToggleGroupItem value="board" className="data-[state=on]:bg-slate-800">
              <Grid3X3 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="data-[state=on]:bg-slate-800">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <div
                key={column.id}
                className="bg-slate-900/30 rounded-lg border border-slate-800"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-white">{column.label}</h3>
                    <Badge variant="default" className="bg-slate-800 text-slate-400">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-3 min-h-[200px]">
                  {columnTasks.map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all group"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-3 h-3 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}/edit`); }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                className="text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h4 className="text-white font-medium mb-2">{task.title}</h4>
                        {task.checklist.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500">
                                {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                              </span>
                            </div>
                            <Progress 
                              value={(task.checklist.filter(i => i.completed).length / task.checklist.length) * 100} 
                              className="h-1 bg-slate-800"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {task.assignees.slice(0, 3).map((userId) => {
                              const user = users.find(u => u.id === userId);
                              return (
                                <Avatar key={userId} className="w-6 h-6 border-2 border-slate-900">
                                  <AvatarImage src={user?.avatar} />
                                  <AvatarFallback className="bg-indigo-600 text-white text-[10px]">
                                    {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                          </div>
                          {task.dueDate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.dueDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <CheckSquare className={`w-5 h-5 ${
                    task.status === 'DONE' ? 'text-green-400' : 'text-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${
                      task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'
                    }`}>
                      {task.title}
                    </h4>
                    <p className="text-slate-500 text-sm truncate">{task.description || 'No description'}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 3).map((userId) => {
                        const user = users.find(u => u.id === userId);
                        return (
                          <Avatar key={userId} className="w-7 h-7 border-2 border-slate-900">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                    {task.dueDate && (
                      <span className="text-sm text-slate-500">
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}/edit`); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        className="text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || projectFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && priorityFilter === 'ALL' && projectFilter === 'ALL' && hasPermission('createTasks') && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate(`/tasks/new${projectId ? `?projectId=${projectId}` : ''}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
