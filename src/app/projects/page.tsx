import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FolderKanban,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  role: Role;
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("newest");

  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      const requestId = requestTracker.current.next();
      setIsLoading(true);

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

        const { data: me, error: meError } = await supabase
          .from("profiles")
          .select("user_id, role")
          .eq("user_id", user.id)
          .single();

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (meError) {
          console.error("Load current profile error:", meError);
          setCurrentUserRole(null);
        } else {
          setCurrentUserRole((me as ProfileRow | null)?.role || null);
        }

        const { data, error } = await supabase
          .from("projects")
          .select(
            "id, name, description, status, progress, created_by, start_date, end_date, created_at"
          )
          .order("created_at", { ascending: false });

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (error) {
          console.error("Load projects error:", error);
          setProjects([]);
        } else {
          setProjects((data || []) as ProjectRow[]);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Projects page load error:", error);
        if (!requestTracker.current.isLatest(requestId)) return;
        setProjects([]);
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const canCreateProjects =
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "guest";

  const canDeleteProject = (project: ProjectRow) => {
    if (currentUserRole === "admin") return true;
    if (currentUserRole === "manager" && currentUserId && project.created_by === currentUserId) {
      return true;
    }
    return false;
  };

  const filteredProjects = useMemo(() => {
    return [...projects]
      .filter((project) => {
        const name = (project.name || "").toLowerCase();
        const description = (project.description || "").toLowerCase();
        const query = searchQuery.toLowerCase();

        const matchesSearch = name.includes(query) || description.includes(query);
        const matchesStatus =
          statusFilter === "ALL" || (project.status || "").toUpperCase() === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case "name":
            return a.name.localeCompare(b.name);
          case "progress":
            return (b.progress || 0) - (a.progress || 0);
          default:
            return 0;
        }
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  const getStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "PLANNING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ON_HOLD":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "COMPLETED":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const handleDelete = async (projectId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this project?");
    if (!confirmed) return;

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      console.error("Delete project error:", error);
      alert(error.message || "Failed to delete project");
      return;
    }

    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400">Manage and track your projects</p>
        </div>

        {canCreateProjects && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate("/projects/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            if (v) setViewMode(v as "grid" | "list");
          }}
        >
          <ToggleGroupItem value="grid" className="data-[state=on]:bg-slate-800">
            <Grid3X3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="data-[state=on]:bg-slate-800">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-indigo-400" />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.id}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>

                      {canDeleteProject(project) && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(project.id);
                          }}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>

                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {project.description || "No description"}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <Badge className={getStatusColor(project.status)}>
                    {(project.status || "UNKNOWN").toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-white">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-2 bg-slate-800" />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {project.end_date ? format(new Date(project.end_date), "MMM d") : "No date"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{project.name}</h4>
                    <p className="text-slate-500 text-sm truncate">
                      {project.description || "No description"}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-4">
                    <Badge className={getStatusColor(project.status)}>
                      {(project.status || "UNKNOWN").toUpperCase()}
                    </Badge>

                    <div className="w-32">
                      <Progress value={project.progress || 0} className="h-2 bg-slate-800" />
                    </div>

                    <span className="text-sm text-slate-500">
                      {project.end_date ? format(new Date(project.end_date), "MMM d") : "No date"}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.id}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>

                      {canDeleteProject(project) && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(project.id);
                          }}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your filters"
              : "Create your first project to get started"}
          </p>

          {!searchQuery && statusFilter === "ALL" && canCreateProjects && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/projects/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
