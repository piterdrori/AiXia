import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Calendar,
  FolderKanban,
  Flag,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getTaskById, 
    getProjectById,
    users,
    hasPermission,
    updateTask,
    deleteTask,
    createComment,
    getCommentsByTask,
    currentUser,
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [progress, setProgress] = useState(0);

  const task = id ? getTaskById(id) : undefined;
  const project = task ? getProjectById(task.projectId) : undefined;
  const comments = id ? getCommentsByTask(id) : [];

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description);
      setProgress(task.progress);
    }
  }, [task]);

  useEffect(() => {
    if (!task && id) {
      navigate('/tasks');
    }
  }, [task, id, navigate]);

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IN_REVIEW': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleSave = () => {
    updateTask(task.id, {
      title: editedTitle,
      description: editedDescription,
      progress,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      navigate('/tasks');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      createComment(task.id, newComment.trim());
      setNewComment('');
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask(task.id, { checklist: updatedChecklist });
  };

  const completedChecklistItems = task.checklist.filter(i => i.completed).length;
  const checklistProgress = task.checklist.length > 0 
    ? (completedChecklistItems / task.checklist.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/tasks')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('editTasks', { isOwner: task.createdBy === currentUser?.id }) && (
            <Button 
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/tasks/${task.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {hasPermission('deleteTasks', { isOwner: task.createdBy === currentUser?.id }) && (
            <Button 
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={6}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setEditedDescription(task.description);
                      }}
                      className="border-slate-700 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 whitespace-pre-wrap">
                    {task.description || 'No description provided.'}
                  </p>
                  {hasPermission('editTasks', { isOwner: task.createdBy === currentUser?.id }) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="mt-4 text-indigo-400 hover:text-indigo-300"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Description
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          {task.checklist.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">
                      {completedChecklistItems} of {task.checklist.length} completed
                    </span>
                    <span className="text-white">{Math.round(checklistProgress)}%</span>
                  </div>
                  <Progress value={checklistProgress} className="h-2 bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {task.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                      />
                      <span className={`flex-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Comment */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs">
                      {currentUser?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                    />
                    <Button onClick={handleAddComment} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Comments List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const user = users.find(u => u.id === comment.userId);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{user?.fullName}</span>
                              <span className="text-slate-500 text-xs">
                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    {comments.length === 0 && (
                      <p className="text-slate-500 text-center py-8">No comments yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Properties */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <FolderKanban className="w-4 h-4" />
                  <span>Project</span>
                </div>
                <span 
                  className="text-white cursor-pointer hover:text-indigo-400"
                  onClick={() => navigate(`/projects/${project?.id}`)}
                >
                  {project?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Flag className="w-4 h-4" />
                  <span>Priority</span>
                </div>
                <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckSquare className="w-4 h-4" />
                  <span>Status</span>
                </div>
                <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Due Date</span>
                </div>
                <span className="text-white">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Created</span>
                </div>
                <span className="text-white">
                  {format(new Date(task.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Assignees */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Assignees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {task.assignees.map((userId) => {
                  const user = users.find(u => u.id === userId);
                  return (
                    <div key={userId} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-indigo-600 text-white text-xs">
                          {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm">{user?.fullName}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Completion</span>
                  <span className="text-white">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-800" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => {
                    setProgress(Number(e.target.value));
                    updateTask(task.id, { progress: Number(e.target.value) });
                  }}
                  className="w-full mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {task.tags.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} className="bg-slate-800 text-slate-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
