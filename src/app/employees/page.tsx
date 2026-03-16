import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserCheck, UserX, Shield, User as UserIcon, Plus, Eye, AlertCircle } from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";
type Status = "active" | "pending_verification" | "pending_profile" | "pending_approval" | "rejected";

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
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState("");

  const canManageUsers = currentUserRole === "admin";

  const loadProfiles = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();
    setError("");

    if (mode === "initial") setIsBootstrapping(true);
    else setIsRefreshing(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!requestTracker.current.isLatest(requestId)) return;
      if (authError || !user) return navigate("/login");

      const [{ data: me }, { data: profilesData, error: profilesError }] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;
      if (!me) return navigate("/login");
      setCurrentUserRole(me.role as Role);

      if (profilesError) {
        console.error("Load profiles error:", profilesError);
        setProfiles([]);
        setError(profilesError.message || "Failed to load employees.");
        return;
      }

      setProfiles((profilesData || []) as ProfileRow[]);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Employees page load error:", err);
      setProfiles([]);
      setError("Failed to load employees.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      mode === "initial" ? setIsBootstrapping(false) : setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProfiles("initial");
  }, [loadProfiles]);

  const approveUser = async (userId: string) => {
    const target = profiles.find((p) => p.user_id === userId);
    if (!target) return;

    const roleToApply = target.requested_role || "employee";
    const nextUpdatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);
    setError("");

    try {
      const { error: updateError } = await supabase.from("profiles").update({
        status: "active",
        role: roleToApply,
        updated_at: nextUpdatedAt
      }).eq("user_id", userId);

      if (updateError) throw updateError;

      setProfiles((prev) =>
        prev.map((p) => p.user_id === userId ? { ...p, status: "active", role: roleToApply, updated_at: nextUpdatedAt } : p)
      );
    } catch (err) {
      console.error("Approve user error:", err);
      setError("Failed to approve user.");
    } finally {
      setActionLoadingUserId(null);
    }
  };

  const rejectUser = async (userId: string) => {
    const nextUpdatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);
    setError("");

    try {
      const { error: updateError } = await supabase.from("profiles").update({
        status: "rejected",
        updated_at: nextUpdatedAt
      }).eq("user_id", userId);

      if (updateError) throw updateError;

      setProfiles((prev) =>
        prev.map((p) => p.user_id === userId ? { ...p, status: "rejected", updated_at: nextUpdatedAt } : p)
      );
    } catch (err) {
      console.error("Reject user error:", err);
      setError("Failed to reject user.");
    } finally {
      setActionLoadingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => profiles.filter((user) => {
    if (user.status === "pending_verification" || user.status === "pending_profile") return false;

    const haystack = [
      user.full_name || "",
      user.display_name || "",
      user.company || "",
      user.department || "",
      user.job_title || "",
      user.city || "",
      user.country || ""
    ].join(" ").toLowerCase();

    const matchesSearch = haystack.includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && user.status === "pending_approval") ||
      (activeTab === "active" && user.status === "active") ||
      (activeTab === "inactive" && user.status === "rejected");

    return matchesSearch && matchesTab;
  }), [profiles, searchQuery, activeTab]);

  const pendingUsers = profiles.filter(u => u.status === "pending_approval");

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "employee": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending_verification": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      case "pending_profile": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      case "pending_approval": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case "pending_verification": return "EMAIL NOT VERIFIED";
      case "pending_profile": return "FORM INCOMPLETE";
      case "pending_approval": return "PENDING APPROVAL";
      case "rejected": return "REJECTED";
      default: return status.toUpperCase();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* ... UI rendering is identical to your previous code ... */}
    </div>
  );
}
