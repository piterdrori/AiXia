import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Project = {
  id: string;
  name: string;
  status: string | null;
  progress: number | null;
  start_date: string | null;
  end_date: string | null;
};

export default function FinanceProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, status, progress, start_date, end_date")
      .order("created_at", { ascending: false });

    setProjects((data as Project[]) || []);
  };

  const getStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return "bg-green-500/20 text-green-400";
      case "PLANNING":
        return "bg-blue-500/20 text-blue-400";
      case "COMPLETED":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">
          Projects (Finance Reference)
        </h1>
        <p className="text-slate-400 text-sm">
          View projects used across the system
        </p>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">

          {projects.map((project) => (
            <Card
              key={project.id}
              className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/40 cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-4 space-y-3">
                
                <div className="flex justify-between">
                  <h3 className="text-white font-semibold">
                    {project.name}
                  </h3>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status || "UNKNOWN"}
                  </Badge>
                </div>

                <div className="text-xs text-slate-400">
                  Progress: {project.progress || 0}%
                </div>

                <div className="text-xs text-slate-500">
                  {project.start_date || "—"} → {project.end_date || "—"}
                </div>

              </CardContent>
            </Card>
          ))}

        </div>
      </div>
    </div>
  );
}
