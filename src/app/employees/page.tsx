import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  User as UserIcon,
  Plus,
  Eye,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";
type Status = "active" | "pending" | "inactive" | "denied";

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

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const canManageUsers = currentUserRole === "admin";

  const loadProfiles = async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfiles([]);
      setCurrentUserRole(null);
      setIsLoading(false);
      return;
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setCurrentUserRole((me?.role as Role) || null);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data as ProfileRow[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const approveUser = async (userId: string) => {
    const target = profiles.find((p) => p.user_id === userId);
    if (!target) return;

    const roleToApply = target.requested_role || "employee";

    await supabase
      .from("profiles")
      .update({
        status: "active",
        role: roleToApply,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    loadProfiles();
  };

  const rejectUser = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({
        status: "denied",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    loadProfiles();
  };

  const filteredUsers = useMemo(() => {
    return profiles.filter((user) => {
      const haystack = [
        user.full_name || "",
        user.display_name || "",
        user.company || "",
        user.department || "",
        user.job_title || "",
        user.city || "",
        user.country || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "pending" && user.status === "pending") ||
        (activeTab === "active" && user.status === "active") ||
        (activeTab === "inactive" &&
          (user.status === "inactive" || user.status === "denied"));

      return matchesSearch && matchesTab;
    });
  }, [profiles, searchQuery, activeTab]);

  const pendingUsers = profiles.filter((u) => u.status === "pending");

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "employee":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
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
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400">View, approve, and manage platform members</p>
        </div>

        {canManageUsers && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate("/register")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {pendingUsers.length > 0 && canManageUsers && (
        <Card className="bg-amber-900/10 border-amber-800/30">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-lg font-medium text-amber-400">
              Pending Approvals ({pendingUsers.length})
            </h3>

            {pendingUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between gap-4 p-3 bg-slate-950/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-indigo-600 text-white">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {user.full_name || "Unnamed user"}
                    </p>
                    <p className="text-slate-500 text-sm">
                      requested: {(user.requested_role || "employee").toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveUser(user.user_id)}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                    onClick={() => rejectUser(user.user_id)}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => navigate(`/employees/${user.user_id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, company, department, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 text-white"
          />
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

      <div className="grid xl:grid-cols-2 gap-4">
        {filteredUsers.map((user) => (
          <Card
            key={user.user_id}
            className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer"
            onClick={() => navigate(`/employees/${user.user_id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-white font-semibold truncate">
                      {user.full_name || "Unnamed user"}
                    </h3>

                    {user.role === "admin" ? (
                      <Shield className="w-4 h-4 text-red-400" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge className={getRoleColor(user.role)}>{user.role.toUpperCase()}</Badge>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status.toUpperCase()}
                    </Badge>
                    {!user.profile_completed && user.status === "active" && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        PROFILE INCOMPLETE
                      </Badge>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <p className="text-slate-400">
                      <span className="text-slate-500">Display:</span>{" "}
                      {user.display_name || "—"}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-500">Phone:</span> {user.phone || "—"}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-500">Company:</span> {user.company || "—"}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-500">Department:</span> {user.department || "—"}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-500">Job Title:</span> {user.job_title || "—"}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-500">Location:</span>{" "}
                      {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-10 text-center text-slate-500">
            No users found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
