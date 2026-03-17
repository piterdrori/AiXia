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

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadProjects = async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [profileResult, projectsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, role")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("projects")
          .select(
            "id, name, description, status, progress, created_by, start_date, end_date, created_at"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (profileResult.error) {
        console.error("Load current profile error:", profileResult.error);
        setCurrentUserRole(null);
      } else {
        setCurrentUserRole((profileResult.data as ProfileRow | null)?.role || null);
      }

      if (projectsResult.error) {
        console.error("Load projects error:", projectsResult.error);
        setProjects([]);
        setLoadError(projectsResult.error.message || "Failed to load projects.");
      } else {
        setProjects((projectsResult.data || []) as ProjectRow[]);
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Projects page load error:", error);
      setProjects([]);
      setLoadError("Failed to load projects.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProjects("initial");
  }, []);

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

    const previousProjects = projects;
    setProjects((prev) => prev.filter((project) => project.id !== projectId));

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      console.error("Delete project error:", error);
      setProjects(previousProjects);
      alert(error.message || "Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400">Manage and track your projects</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadProjects("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

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

      {loadError && (
        <Card className="bg-red-950/20 border-red-900/40">
          <CardContent className="p-4 text-sm text-red-300">{loadError}</CardContent>
        </Card>
      )}

      {isBootstrapping ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-slate-800" />
                      <div className="w-8 h-8 rounded bg-slate-800" />
                    </div>
                    <div className="h-5 w-2/3 rounded bg-slate-800" />
                    <div className="h-4 w-full rounded bg-slate-800" />
                    <div className="h-4 w-3/4 rounded bg-slate-800" />
                    <div className="h-6 w-24 rounded bg-slate-800" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-16 rounded bg-slate-800" />
                        <div className="h-4 w-10 rounded bg-slate-800" />
                      </div>
                      <div className="h-2 w-full rounded bg-slate-800" />
                    </div>
                    <div className="h-4 w-20 rounded bg-slate-800" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="p-4">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 rounded bg-slate-800" />
                        <div className="h-4 w-72 rounded bg-slate-800" />
                      </div>
                      <div className="hidden sm:block h-6 w-20 rounded bg-slate-800" />
                      <div className="hidden sm:block h-2 w-32 rounded bg-slate-800" />
                      <div className="hidden sm:block h-4 w-16 rounded bg-slate-800" />
                      <div className="h-8 w-8 rounded bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/40 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.18)]"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                     <FolderKanban className="w-4 h-4 text-indigo-400" />
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

                <h3 className="text-base font-semibold text-white mb-1 truncate group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>

                <p className="text-slate-400 text-xs mb-3 line-clamp-2 min-h-[2.5rem]">
                  {project.description || "No description"}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getStatusColor(project.status)}>
                    {(project.status || "UNKNOWN").toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-white">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-1.5 bg-slate-800" />
               </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
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

      {!isBootstrapping && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3
            className="text-lg font-medium text-white mb-2">No projects found</h3>
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
