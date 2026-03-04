import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { db } from '@/server/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderKanban,
  CheckSquare,
  Users,
  TrendingUp,
  Plus,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format, isBefore, addDays, parseISO } from 'date-fns';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    projects, 
    tasks, 
    activities, 
    users,
    hasPermission,
    refreshData 
  } = useStore();

  useEffect(() => {
    refreshData();
  }, []);

  const stats = db.getStats();
  
  // Get recent projects (last 5)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get my tasks
  const myTasks = currentUser 
    ? tasks.filter(t => t.assignees.includes(currentUser.id))
    : [];

  // Get upcoming deadlines (tasks due within 7 days)
  const upcomingDeadlines = myTasks
    .filter(t => t.status !== 'DONE' && t.dueDate)
    .filter(t => {
      const dueDate = parseISO(t.dueDate!);
      const today = new Date();
      const nextWeek = addDays(today, 7);
      return isBefore(dueDate, nextWeek) || dueDate.getTime() === nextWeek.getTime();
    })
    .sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime())
    .slice(0, 5);

  // Get recent activities
  const recentActivities = activities.slice(0, 10);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500/20 text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400';
      case 'IN_REVIEW': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Welcome back, {currentUser?.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('createProjects') && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate('/projects/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
          {hasPermission('createTasks') && (
            <Button 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate('/tasks/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Projects</p>
                <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{stats.activeProjects}</span>
              <span className="text-slate-500">active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Tasks</p>
                <p className="text-2xl font-bold text-white">{stats.activeTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{stats.completedTasks}</span>
              <span className="text-slate-500">completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              {stats.pendingUsers > 0 && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">{stats.pendingUsers}</span>
                  <span className="text-slate-500">pending</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completion Rate</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalTasks > 0 
                    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0} 
                className="h-2 bg-slate-800"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Projects</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-400 hover:text-indigo-300"
              onClick={() => navigate('/projects')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No projects yet</p>
              ) : (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{project.name}</h4>
                      <p className="text-slate-500 text-sm truncate">{project.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">
                        <Progress value={project.progress} className="w-24 h-2 bg-slate-800" />
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      isBefore(parseISO(task.dueDate!), new Date()) 
                        ? 'bg-red-500' 
                        : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <p className="text-slate-500 text-xs">
                        Due {format(parseISO(task.dueDate!), 'MMM d')}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks & Activity Feed */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">My Tasks</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-400 hover:text-indigo-300"
              onClick={() => navigate('/tasks')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  <CheckSquare className={`w-5 h-5 ${
                    task.status === 'DONE' ? 'text-green-400' : 'text-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'
                    }`}>
                      {task.title}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {myTasks.length === 0 && (
                <p className="text-slate-500 text-center py-8">No tasks assigned to you</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No recent activity</p>
                ) : (
                  recentActivities.map((activity) => {
                    const user = users.find(u => u.id === activity.userId);
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="bg-indigo-600 text-white text-xs">
                            {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">
                            <span className="text-white font-medium">{user?.fullName || 'Unknown'}</span>
                            {' '}{activity.type.toLowerCase().replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
