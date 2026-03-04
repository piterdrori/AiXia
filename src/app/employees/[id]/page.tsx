import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  FolderKanban,
  CheckSquare,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@/types';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getUserById, 
    projects, 
    tasks, 
    activities,
    hasPermission,
    updateUser,
    currentUser,
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [status, setStatus] = useState<'ACTIVE' | 'PENDING' | 'INACTIVE'>('ACTIVE');

  const user = id ? getUserById(id) : undefined;

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  useEffect(() => {
    if (!user && id) {
      navigate('/employees');
    }
  }, [user, id, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const userProjects = projects.filter(p => 
    p.members.some(m => m.userId === user.id) || p.createdBy === user.id
  );

  const userTasks = tasks.filter(t => 
    t.assignees.includes(user.id) || t.createdBy === user.id
  );

  const userActivities = activities.filter(a => a.userId === user.id);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MANAGER': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'EMPLOYEE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'GUEST': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PENDING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'INACTIVE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleSave = () => {
    updateUser(user.id, { role, status });
    setIsEditing(false);
  };

  const isOwnProfile = currentUser?.id === user.id;
  const canEdit = hasPermission('manageUsers') || isOwnProfile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/employees')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Employee Profile</h1>
        </div>
        {canEdit && (
          <Button 
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        )}
        {hasPermission('manageUsers') && (
          <Button 
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => navigate(`/employees/${user.id}/permissions`)}
          >
            <Shield className="w-4 h-4 mr-2" />
            Permissions
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                {user.fullName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{user.fullName}</h2>
                {isEditing && hasPermission('manageUsers') ? (
                  <>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger className="w-32 bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="GUEST">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                      <SelectTrigger className="w-32 bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                    <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                  </>
                )}
              </div>

              <p className="text-slate-400 mb-4">{user.email}</p>

              {user.bio && (
                <p className="text-slate-300 mb-4">{user.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {user.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-4 h-4" />
                    {user.phone}
                  </div>
                )}
                {user.location && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    {user.location}
                  </div>
                )}
                {user.department && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Briefcase className="w-4 h-4" />
                    {user.department}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{userProjects.length}</p>
            <p className="text-slate-500 text-sm">Projects</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{userTasks.length}</p>
            <p className="text-slate-500 text-sm">Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {userTasks.filter(t => t.status === 'DONE').length}
            </p>
            <p className="text-slate-500 text-sm">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {userTasks.length > 0 
                ? Math.round((userTasks.filter(t => t.status === 'DONE').length / userTasks.length) * 100)
                : 0}%
            </p>
            <p className="text-slate-500 text-sm">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="projects" className="data-[state=active]:bg-slate-800">Projects</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800">Tasks</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProjects.map((project) => (
              <Card 
                key={project.id}
                className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{project.name}</h4>
                    </div>
                  </div>
                  <Progress value={project.progress} className="h-2 bg-slate-800 mb-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{project.progress}% complete</span>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {userProjects.length === 0 && (
            <p className="text-slate-500 text-center py-8">No projects yet</p>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="space-y-3">
            {userTasks.map((task) => (
              <Card 
                key={task.id}
                className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckSquare className={`w-5 h-5 ${
                        task.status === 'DONE' ? 'text-green-400' : 'text-slate-500'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </h4>
                        <p className="text-slate-500 text-sm">
                          {projects.find(p => p.id === task.projectId)?.name}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {userTasks.length === 0 && (
            <p className="text-slate-500 text-center py-8">No tasks yet</p>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="space-y-4">
                {userActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-slate-300">
                        {activity.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {userActivities.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
