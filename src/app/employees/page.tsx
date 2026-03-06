import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Search, UserCheck, UserX, Shield, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";
type Status = "active" | "pending" | "inactive" | "denied";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: Status;
  requested_role: Role | null;
  created_at: string;
  updated_at: string;
};

export default function EmployeesPage() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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
    return profiles.filter((u) => {
      const matchesSearch =
        (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.user_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;
      const matchesStatus = statusFilter === "ALL" || u.status.toUpperCase() === statusFilter;

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" && u.status === "active") ||
        (activeTab === "inactive" && (u.status === "inactive" || u.status === "denied"));

      return matchesSearch && matchesRole && matchesStatus && matchesTab;
    });
  }, [profiles, searchQuery, roleFilter, statusFilter, activeTab]);

  const pendingUsers = profiles.filter((u) => u.status === "pending");

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "employee":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "guest":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
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
      case "inactive":
      case "denied":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "manager":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400">Manage team members and permissions</p>
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-amber-400 flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Pending Approvals ({pendingUsers.length})
              </h3>
            </div>

            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-white font-medium">{user.full_name || "Unnamed user"}</p>
                      <p className="text-slate-500 text-sm">
                        requested: {(user.requested_role || "employee").toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
            All Members
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
            Active
          </TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:bg-slate-800">
            Inactive
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DENIED">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading employees...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No employees found</h3>
              <p className="text-slate-500">
                {searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "No employees in the system yet"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUsers.map((user) => (
                <Card
                  key={user.user_id}
                  className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="bg-indigo-600 text-white text-lg">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <Badge className={getStatusColor(user.status)}>
                        {user.status.toUpperCase()}
                      </Badge>
                    </div>

                    <h3 className="text-white font-semibold mb-1">
                      {user.full_name || "Unnamed user"}
                    </h3>

                    <p className="text-slate-500 text-sm mb-3 break-all">{user.user_id}</p>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role.toUpperCase()}</span>
                      </Badge>
                    </div>

                    <p className="text-slate-600 text-xs mt-3">
                      Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                    </p>

                    {canManageUsers && (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => navigate(`/employees/${user.user_id}/permissions`)}
                        >
                          Permissions
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
