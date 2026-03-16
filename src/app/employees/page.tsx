import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Role = "admin" | "manager" | "employee" | "guest";
type Status =
  | "active"
  | "pending_verification"
  | "pending_approval"
  | "rejected"
  | "pending_profile"; // <-- added pending_profile to prevent TS error

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  company?: string | null;
  department?: string | null;
  job_title?: string | null;
  requested_role: Role | null;
  role: Role;
  status: Status;
  profile_completed?: boolean | null;
  created_at: string;
  updated_at: string;
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    const requestId = requestTracker.current.next();
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (authError || !user) {
        navigate("/login");
        return;
      }

      const [
        { data: me },
        { data: profilesData, error: profilesError },
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      setCurrentUserRole(me?.role || null);

      if (profilesError) {
        setProfiles([]);
        setError(profilesError.message || "Failed to load employees.");
        return;
      }

      setProfiles(profilesData || []);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error(err);
      setProfiles([]);
      setError("Failed to load employees.");
    }
  }, [navigate]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const approveUser = async (userId: string) => {
    const target = profiles.find((p) => p.user_id === userId);
    if (!target) return;

    const roleToApply = target.requested_role || "employee";
    const updatedAt = new Date().toISOString();

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "active", role: roleToApply, updated_at: updatedAt })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setProfiles((prev) =>
        prev.map((p) =>
          p.user_id === userId ? { ...p, status: "active", role: roleToApply, updated_at: updatedAt } : p
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to approve user.");
    }
  };

  const rejectUser = async (userId: string) => {
    const updatedAt = new Date().toISOString();
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "rejected", updated_at: updatedAt })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setProfiles((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, status: "rejected", updated_at: updatedAt } : p))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to reject user.");
    }
  };

  const filteredUsers = useMemo(() => {
    return profiles.filter((user) => user.status !== "pending_verification" && user.status !== "pending_profile");
  }, [profiles]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "employee": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case "pending_verification": return "EMAIL NOT VERIFIED";
      case "pending_approval": return "PENDING APPROVAL";
      case "rejected": return "REJECTED";
      default: return status.toUpperCase();
    }
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-red-400">{error}</div>}
      <div className="grid xl:grid-cols-2 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-indigo-600 text-white">{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">{user.full_name}</p>
                  <Badge className={getRoleColor(user.role)}>{user.role.toUpperCase()}</Badge>
                  <Badge>{getStatusLabel(user.status)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
