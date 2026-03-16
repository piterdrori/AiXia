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
type Status = "active" | "pending_verification" | "pending_approval" | "rejected" | "pending_profile";

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
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const canManageUsers = currentUserRole === "admin";

  const loadProfiles = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") setIsBootstrapping(true);
    else setIsRefreshing(true);

    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!requestTracker.current.isLatest(requestId)) return;
      if (authError || !user) { navigate("/login"); return; }

      const [
        { data: me, error: meError },
        { data: profilesData, error: profilesError }
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;
      if (meError || !me) { navigate("/login"); return; }

      setCurrentUserRole(me.role as Role);

      if (profilesError) { setProfiles([]); setError(profilesError.message || "Failed to load employees."); return; }

      setProfiles(profilesData || []);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Employees page load error:", err);
      setProfiles([]);
      setError("Failed to load employees.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      if (mode === "initial") setIsBootstrapping(false);
      else setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => { void loadProfiles("initial"); }, [loadProfiles]);

  const approveUser = async (userId: string) => {
    const target = profiles.find(p => p.user_id === userId);
    if (!target) return;
    const roleToApply = target.requested_role || "employee";
    const updatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "active", role: roleToApply, updated_at: updatedAt })
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, status: "active", role: roleToApply, updated_at: updatedAt } : p));
    } catch (err) { console.error(err); setError("Failed to approve user."); }
    finally { setActionLoadingUserId(null); }
  };

  const rejectUser = async (userId: string) => {
    const updatedAt = new Date().toISOString();
    setActionLoadingUserId(userId);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "rejected", updated_at: updatedAt })
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, status: "rejected", updated_at: updatedAt } : p));
    } catch (err) { console.error(err); setError("Failed to reject user."); }
    finally { setActionLoadingUserId(null); }
  };

  const filteredUsers = useMemo(() => profiles.filter(u => u.status !== "pending_verification" && u.status !== "pending_profile"), [profiles]);
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
      case "pending_approval": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
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
    return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400">View, approve, and manage platform members</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => void loadProfiles("refresh")} disabled={isRefreshing}>Refresh</Button>
          {canManageUsers && <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate("/register")}><Plus className="w-4 h-4 mr-2" />Invite Member</Button>}
        </div>
      </div>

      {error && (
        <Card className="bg-red-900/10 border-red-800/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="text-sm text-red-300">{error}</div>
          </CardContent>
        </Card>
      )}

      {pendingUsers.length > 0 && canManageUsers && (
        <Card className="bg-amber-900/10 border-amber-800/30">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-lg font-medium text-amber-400">Pending Approvals ({pendingUsers.length})</h3>
            {pendingUsers.map(user => (
              <div key={user.user_id} className="flex items-center justify-between gap-4 p-3 bg-slate-950/50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10"><AvatarFallback className="bg-indigo-600 text-white">{getInitials(user.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{user.full_name || "Unnamed user"}</p>
                    <p className="text-slate-500 text-sm">requested: {(user.requested_role || "employee").toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => void approveUser(user.user_id)} disabled={actionLoadingUserId === user.user_id}><UserCheck className="w-4 h-4 mr-1" />Approve</Button>
                  <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => void rejectUser(user.user_id)} disabled={actionLoadingUserId === user.user_id}><UserX className="w-4 h-4 mr-1" />Reject</Button>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => navigate(`/employees/${user.user_id}`)} disabled={actionLoadingUserId === user.user_id}><Eye className="w-4 h-4 mr-1" />View</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search by name, company, department, city..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-slate-950 border-slate-800 text-white" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isBootstrapping ? (
        <div className="grid xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-5">
                <div className="animate-pulse flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-40 rounded bg-slate-800" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 rounded bg-slate-800" />
                      <div className="h-6 w-20 rounded bg-slate-800" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="h-4 rounded bg-slate-800" />
                      <div className="h-4 rounded bg-slate-800" />
                      <div className="h-4 rounded bg-slate-800" />
                      <div className="h-4 rounded bg-slate-800" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid xl:grid-cols-2 gap-4">
          {filteredUsers.map(user => (
            <Card key={user.user_id} className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => navigate(`/employees/${user.user_id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-indigo-600 text-white">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-white font-semibold truncate">{user.full_name || "Unnamed user"}</h3>
                      {user.role === "admin" ? <Shield className="w-4 h-4 text-red-400" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge className={getRoleColor(user.role)}>{user.role.toUpperCase()}</Badge>
                      <Badge className={getStatusColor(user.status)}>{getStatusLabel(user.status)}</Badge>
                      {!user.profile_completed && user.status === "active" && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">PROFILE INCOMPLETE</Badge>}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-400"><span className="text-slate-500">Display:</span> {user.display_name || "—"}</p>
                      <p className="text-slate-400"><span className="text-slate-500">Phone:</span> {user.phone || "—"}</p>
                      <p className="text-slate-400"><span className="text-slate-500">Company:</span> {user.company || "—"}</p>
                      <p className="text-slate-400"><span className="text-slate-500">Department:</span> {user.department || "—"}</p>
                      <p className="text-slate-400"><span className="text-slate-500">Job Title:</span> {user.job_title || "—"}</p>
                      <p className="text-slate-400"><span className="text-slate-500">Location:</span> {[user.city, user.country].filter(Boolean).join(", ") || "—"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-10 text-center text-slate-500">No users found.</CardContent>
        </Card>
      )}
    </div>
  );
}
