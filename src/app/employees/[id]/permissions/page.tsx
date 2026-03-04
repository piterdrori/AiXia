import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const permissionLabels: Record<string, { label: string; description: string }> = {
  createProjects: {
    label: 'Create Projects',
    description: 'Can create new projects',
  },
  editAllProjects: {
    label: 'Edit All Projects',
    description: 'Can edit any project in the system',
  },
  deleteProjects: {
    label: 'Delete Projects',
    description: 'Can delete projects',
  },
  createTasks: {
    label: 'Create Tasks',
    description: 'Can create new tasks',
  },
  editTasks: {
    label: 'Edit Tasks',
    description: 'Can edit tasks',
  },
  deleteTasks: {
    label: 'Delete Tasks',
    description: 'Can delete tasks',
  },
  manageUsers: {
    label: 'Manage Users',
    description: 'Can manage user accounts and approvals',
  },
  viewReports: {
    label: 'View Reports',
    description: 'Can view reports and analytics',
  },
  accessChat: {
    label: 'Access Chat',
    description: 'Can use the chat feature',
  },
  changeSettings: {
    label: 'Change Settings',
    description: 'Can change personal and system settings',
  },
  visibility: {
    label: 'Visibility',
    description: 'Can view sensitive information',
  },
};

export default function EmployeePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getUserById, updateUserPermissions, currentUser } = useStore();

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const user = id ? getUserById(id) : undefined;

  useEffect(() => {
    if (user) {
      setPermissions((user.permissions || {}) as Record<string, boolean>);
    }
  }, [user]);

  useEffect(() => {
    if (!user && id) {
      navigate('/employees');
    }
  }, [user, id, navigate]);

  // Only admins can access this page
  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') {
      navigate('/employees');
    }
  }, [currentUser, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleToggle = (permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    updateUserPermissions(user.id, permissions);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(`/employees/${id}`)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Permissions</h1>
          <p className="text-slate-400">Manage permissions for {user.fullName}</p>
        </div>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>Permissions saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <CardTitle className="text-white">Permission Overrides</CardTitle>
          </div>
          <p className="text-slate-400 text-sm">
            Toggle permissions to override the default role-based permissions for this user.
            Changes take effect immediately.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(permissionLabels).map(([key, { label, description }]) => (
            <div key={key} className="flex items-start justify-between">
              <div className="flex-1">
                <Label htmlFor={key} className="text-white font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-slate-500 text-sm">{description}</p>
              </div>
              <Switch
                id={key}
                checked={permissions[key] || false}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}

          <Separator className="bg-slate-800" />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/employees/${id}`)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Permissions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Current Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-4">
            This user has the <Badge className="mx-1">{user.role}</Badge> role which grants the following default permissions:
          </p>
          <div className="flex flex-wrap gap-2">
            {user.role === 'ADMIN' && (
              <>
                <Badge className="bg-green-500/20 text-green-400">All Permissions</Badge>
              </>
            )}
            {user.role === 'MANAGER' && (
              <>
                <Badge className="bg-blue-500/20 text-blue-400">Create Projects</Badge>
                <Badge className="bg-blue-500/20 text-blue-400">Edit Projects</Badge>
                <Badge className="bg-blue-500/20 text-blue-400">Create Tasks</Badge>
                <Badge className="bg-blue-500/20 text-blue-400">Edit Tasks</Badge>
                <Badge className="bg-blue-500/20 text-blue-400">View Reports</Badge>
              </>
            )}
            {user.role === 'EMPLOYEE' && (
              <>
                <Badge className="bg-slate-500/20 text-slate-400">Create Tasks</Badge>
                <Badge className="bg-slate-500/20 text-slate-400">Edit Own Tasks</Badge>
                <Badge className="bg-slate-500/20 text-slate-400">Access Chat</Badge>
              </>
            )}
            {user.role === 'GUEST' && (
              <>
                <Badge className="bg-slate-500/20 text-slate-400">View Projects</Badge>
                <Badge className="bg-slate-500/20 text-slate-400">Create Tasks</Badge>
                <Badge className="bg-slate-500/20 text-slate-400">View Reports</Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
