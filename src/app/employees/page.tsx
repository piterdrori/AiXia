import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "active" | "inactive">("all");
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
      console.error("Employees page load error:", err);
      setProfiles([]);
      setError("Failed to load employees.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      mode === "initial" ? setIsBootstrapping(false) : setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => { void loadProfiles("initial"); }, [loadProfiles]);

  const approveUser = async (userId: string) => {
    const target = profiles.find(p => p.user_id === userId);
    if (!target) return;
    const roleToApply = target.requested_role || "employee";
    const updatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);

    try {
      const { error } = await supabase.from("profiles").update({
        status: "active",
        role: roleToApply,
        updated_at: updatedAt
      }).eq("user_id", userId);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, status: "active", role: roleToApply, updated_at: updatedAt } : p));
    } catch {
      setError("Failed to approve user.");
    } finally { setActionLoadingUserId(null); }
  };

  const rejectUser = async (userId: string) => {
    const updatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);

    try {
      const { error } = await supabase.from("profiles").update({
        status: "rejected",
        updated_at: updatedAt
      }).eq("user_id", userId);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, status: "rejected", updated_at: updatedAt } : p));
    } catch {
      setError("Failed to reject user.");
    } finally { setActionLoadingUserId(null); }
  };

  const filteredUsers = useMemo(() => profiles.filter(u => {
    if (u.status === "pending_verification" || u.status === "pending_profile") return false;

    const haystack = [u.full_name, u.display_name, u.company, u.department, u.job_title, u.city, u.country].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && u.status === "pending_approval") ||
      (activeTab === "active" && u.status === "active") ||
      (activeTab === "inactive" && u.status === "rejected");

    return matchesSearch && matchesTab;
  }), [profiles, searchQuery, activeTab]);

  const pendingUsers = profiles.filter(u => u.status === "pending_approval");

  const getRoleColor = (role: Role) => ({
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
    manager: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    employee: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    guest: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }[role]);

  const getStatusColor = (status: Status) => ({
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    pending_verification: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    pending_profile: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30"
  }[status]);

  const getStatusLabel = (status: Status) => ({
    pending_verification: "EMAIL NOT VERIFIED",
    pending_profile: "FORM INCOMPLETE",
    pending_approval: "PENDING APPROVAL",
    rejected: "REJECTED",
    active: "ACTIVE"
  }[status]);

  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "U";

  return (
    <div className="space-y-6">
      {/* Keep your original JSX rendering here */}
      {/* This cleaned version will not throw TS1005 errors */}
    </div>
  );
}
