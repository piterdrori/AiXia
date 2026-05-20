import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadDashboardProjectsAndMembers } from "@/lib/dashboard/loadDashboardWorkspaceData";
import { useLanguage } from "@/lib/i18n";
import {
  DashboardMemberStatusDot,
  initialsFromDisplayName,
} from "./DashboardMemberStatusDot";

type ProjectRow = {
  id: string;
  name: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  role: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: string | null;
};

export function DashboardProjectTeammatesCard({
  projects,
  projectMembers,
  onlineUsers,
}: {
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  onlineUsers: Record<string, boolean>;
}) {
  const { t } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [localProjects, setLocalProjects] = useState<ProjectRow[]>([]);
  const [localProjectMembers, setLocalProjectMembers] = useState<ProjectMemberRow[]>([]);

  const resolvedProjects = projects.length > 0 ? projects : localProjects;
  const resolvedProjectMembers =
    projectMembers.length > 0 ? projectMembers : localProjectMembers;

  useEffect(() => {
    if (projects.length > 0 && projectMembers.length > 0) return;

    let cancelled = false;
    void (async () => {
      const workspace = await loadDashboardProjectsAndMembers();
      if (cancelled) return;
      if (workspace.projects.length > 0) setLocalProjects(workspace.projects);
      if (workspace.projectMembers.length > 0) {
        setLocalProjectMembers(workspace.projectMembers);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projects.length, projectMembers.length]);

  useEffect(() => {
    if (resolvedProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(resolvedProjects[0].id);
    }
  }, [resolvedProjects, selectedProjectId]);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .order("full_name");

      if (cancelled) return;
      setProfiles(error || !data ? [] : (data as ProfileRow[]));
      setProfilesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  const projectMembersForSelection = useMemo(() => {
    if (!selectedProjectId) return [];
    return resolvedProjectMembers.filter((pm) => pm.project_id === selectedProjectId);
  }, [resolvedProjectMembers, selectedProjectId]);

  const memberRows = useMemo(() => {
    return projectMembersForSelection
      .map((pm) => {
        const profile = profileMap.get(pm.user_id);
        const label = profile?.full_name?.trim() || pm.user_id.slice(0, 8);
        return {
          user_id: pm.user_id,
          label,
          projectRole: pm.role,
          profileRole: profile?.role,
          online: Boolean(onlineUsers[pm.user_id]),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projectMembersForSelection, profileMap, onlineUsers]);

  return (
    <section
      className="aixia-dash-presence aixia-dash-project-teammates"
      aria-label={t("dashboard.projectTeammatesAria", "Project teammates")}
    >
      <div className="aixia-dash-presence-hd">
        <h2 className="aixia-dash-presence-title">
          {t("dashboard.projectTeammatesTitle", "Project teammates")}
        </h2>
      </div>

      <div className="aixia-dash-admin-teammates-filters">
        <label>
          {t("dashboard.projectTeammatesProject", "Project")}
          <select
            className="aixia-dash-usage-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={resolvedProjects.length === 0}
          >
            {resolvedProjects.length === 0 ? (
              <option value="">{t("dashboard.noProjects", "No projects")}</option>
            ) : (
              resolvedProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div className="aixia-dash-presence-scroll aixia-dash-presence-scroll--tiles">
        {profilesLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aixia-dash-presence-tile aixia-dash-presence-tile--skeleton">
                <div className="aixia-dash-skel-line !h-9 !w-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
                  <div className="aixia-dash-skel-line h-3 w-[58%]" />
                  <div className="aixia-dash-skel-line h-2.5 w-[40%]" />
                </div>
              </div>
            ))
          : null}

        {!profilesLoading && memberRows.length === 0 ? (
          <p className="aixia-dash-empty px-2 pb-2">
            {t("dashboard.projectTeammatesEmpty", "No members on this project yet.")}
          </p>
        ) : null}

        {!profilesLoading
          ? memberRows.map((member) => (
              <div
                key={member.user_id}
                className={`aixia-dash-presence-tile aixia-dash-glass aixia-dash-tilt-metric${
                  member.online ? " aixia-dash-presence-tile--online" : ""
                }`}
                aria-label={`${member.label}, ${member.online ? "Online" : "Offline"}`}
              >
                <DashboardMemberStatusDot online={member.online} />
                <span className="aixia-dash-presence-avatar" aria-hidden>
                  {initialsFromDisplayName(member.label)}
                </span>
                <span className="aixia-dash-presence-meta">
                  <span className="aixia-dash-presence-name">{member.label}</span>
                  <span className="aixia-dash-presence-role">
                    {member.projectRole || member.profileRole || "—"}
                  </span>
                </span>
              </div>
            ))
          : null}
      </div>
    </section>
  );
}
