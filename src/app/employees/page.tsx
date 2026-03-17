import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

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
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type Status =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email?: string | null;
  additional_emails?: string | null;
  display_name?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  shipping_address?: string | null;
  company?: string | null;
  department?: string | null;
  job_title?: string | null;
  wechat?: string | null;
  whatsapp?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  requested_role: Role | null;
  role: Role;
  status: Status;
  profile_completed?: boolean | null;
  created_at: string;
  updated_at: string;
};

type CurrentUserRoleRow = {
  role: Role;
};

type TabValue = "all" | "pending" | "active" | "rejected";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function splitMultiValue(value?: string | null) {
  return (value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .14 5.35.14 11.93c0 2.1.55 4.14 1.58 5.94L0 24l6.3-1.65a11.87 11.87 0 0 0 5.77 1.47h.01c6.57 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.17-3.49-8.41Zm-8.45 18.3h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.65-.24-.38a9.88 9.88 0 0 1-1.51-5.21c0-5.46 4.44-9.9 9.91-9.9 2.64 0 5.11 1.03 6.98 2.89a9.82 9.82 0 0 1 2.9 7c0 5.46-4.45 9.9-9.89 9.9Zm5.43-7.41c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.69.15-.2.3-.79.98-.96 1.18-.18.2-.35.23-.65.08-.3-.15-1.28-.47-2.43-1.49-.89-.8-1.49-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.69-1.66-.94-2.27-.25-.6-.5-.51-.69-.52h-.59c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.9 1.23 3.1.15.2 2.13 3.26 5.16 4.57.72.31 1.29.5 1.73.64.73.23 1.39.2 1.91.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

function WeChatIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M8.67 2C4.44 2 1 4.82 1 8.3c0 1.99 1.12 3.76 2.87 4.92L3.1 16l3.17-1.58c.45.09.91.14 1.4.14h.29c-.08-.39-.12-.79-.12-1.2 0-3.87 3.86-7.01 8.6-7.01.24 0 .47 0 .7.03C16.37 3.78 12.84 2 8.67 2Zm-3 5.14c-.48 0-.87-.39-.87-.87s.39-.87.87-.87.87.39.87.87-.39.87-.87.87Zm5.85 0c-.48 0-.87-.39-.87-.87s.39-.87.87-.87.87.39.87.87-.39.87-.87.87Z" />
      <path d="M15.7 7.85c-4.03 0-7.3 2.58-7.3 5.76 0 1.73.98 3.28 2.52 4.34l-.7 2.55 2.8-1.4c.39.08.79.12 1.2.12 4.03 0 7.3-2.58 7.3-5.76s-3.27-5.61-7.3-5.61Zm-2.43 6.17c-.39 0-.7-.31-.7-.7s.31-.7.7-.7.7.31.7.7-.31.7-.7.7Zm4.83 0c-.39 0-.7-.31-.7-.7s.31-.7.7-.7.7.31.7.7-.31.7-.7.7Z" />
    </svg>
  );
}

type EmployeeField = {
  key: string;
  label: string;
  values: string[];
  icon: "email" | "phone" | "location" | "company" | "department" | "job" | "whatsapp" | "wechat" | "bio";
  fullWidth?: boolean;
};

function buildEmployeeFields(user: ProfileRow): EmployeeField[] {
  const phones = splitMultiValue(user.phone);
  const additionalEmails = splitMultiValue(user.additional_emails);
  const companies = splitMultiValue(user.company);
  const departments = splitMultiValue(user.department);
  const jobTitles = splitMultiValue(user.job_title);
  const whatsapps = splitMultiValue(user.whatsapp);
  const wechats = splitMultiValue(user.wechat);

  const locationParts = [user.city, user.country].filter(Boolean) as string[];
  const locationValue = locationParts.length > 0 ? locationParts.join(", ") : null;

  return [
    user.email
      ? { key: "registered-email", label: "Registered Email", values: [user.email], icon: "email" }
      : null,
    additionalEmails.length > 0
      ? { key: "additional-emails", label: "Additional Emails", values: additionalEmails, icon: "email" }
      : null,
    phones.length > 0
      ? { key: "phone", label: "Phone", values: phones, icon: "phone" }
      : null,
    locationValue
      ? { key: "location", label: "Location", values: [locationValue], icon: "location" }
      : null,
    user.shipping_address
      ? { key: "shipping-address", label: "Shipping Address", values: [user.shipping_address], icon: "location" }
      : null,
    user.display_name
      ? { key: "display-name", label: "Display Name", values: [user.display_name], icon: "department" }
      : null,
    companies.length > 0
      ? { key: "company", label: "Company", values: companies, icon: "company" }
      : null,
    departments.length > 0
      ? { key: "department", label: "Department", values: departments, icon: "department" }
      : null,
    jobTitles.length > 0
      ? { key: "job-title", label: "Job Title", values: jobTitles, icon: "job" }
      : null,
    whatsapps.length > 0
      ? { key: "whatsapp", label: "WhatsApp", values: whatsapps, icon: "whatsapp" }
      : null,
    wechats.length > 0
      ? { key: "wechat", label: "WeChat", values: wechats, icon: "wechat" }
      : null,
    user.bio
      ? { key: "bio", label: "Bio", values: [user.bio], icon: "bio", fullWidth: true }
      : null,
  ].filter(Boolean) as EmployeeField[];
}

function getFieldIcon(icon: EmployeeField["icon"]) {
  switch (icon) {
    case "email":
      return <Mail className="w-4 h-4 text-slate-400 shrink-0" />;
    case "phone":
      return <Phone className="w-4 h-4 text-slate-400 shrink-0" />;
    case "location":
      return <MapPin className="w-4 h-4 text-slate-400 shrink-0" />;
    case "company":
      return <Building2 className="w-4 h-4 text-slate-400 shrink-0" />;
    case "job":
      return <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />;
    case "whatsapp":
      return <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />;
    case "wechat":
      return <WeChatIcon className="w-4 h-4 text-[#07C160] shrink-0" />;
    case "department":
    case "bio":
    default:
      return <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

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
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const canManageUsers = currentUserRole === "admin";

  const loadProfiles = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const requestId = requestTracker.current.next();

      if (mode === "initial") {
        setIsBootstrapping(true);
      } else {
        setIsRefreshing(true);
      }

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

        const [{ data: me, error: meError }, { data: profilesData, error: profilesError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("role")
              .eq("user_id", user.id)
              .single(),
            supabase
              .from("profiles")
              .select("*")
              .order("created_at", { ascending: false }),
          ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (meError || !me) {
          navigate("/login");
          return;
        }

        setCurrentUserRole((me as CurrentUserRoleRow).role);

        if (profilesError) {
          setProfiles([]);
          setError(profilesError.message || "Failed to load employees.");
          return;
        }

        setProfiles((profilesData as ProfileRow[]) || []);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Employees page load error:", err);
        setProfiles([]);
        setError("Failed to load employees.");
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;

        if (mode === "initial") {
          setIsBootstrapping(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    void loadProfiles("initial");
  }, [loadProfiles]);

  const approveUser = async (userId: string) => {
    if (!canManageUsers) return;

    const target = profiles.find((profile) => profile.user_id === userId);
    if (!target) return;

    const roleToApply = target.requested_role || "employee";
    const updatedAt = new Date().toISOString();

    setActionLoadingUserId(userId);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          role: roleToApply,
          profile_completed: true,
          updated_at: updatedAt,
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.user_id === userId
            ? {
                ...profile,
                status: "active",
                role: roleToApply,
                profile_completed: true,
                updated_at: updatedAt,
              }
            : profile
        )
      );
    } catch (err) {
      console.error("Approve user error:", err);
      setError("Failed to approve user.");
    } finally {
      setActionLoadingUserId(null);
    }
  };

  const rejectUser = async (userId: string) => {
    if (!canManageUsers) return;

    const updatedAt = new Date().toISOString();

    setActionLoadingUserId(userId);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          status: "rejected",
          updated_at: updatedAt,
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.user_id === userId
            ? {
                ...profile,
                status: "rejected",
                updated_at: updatedAt,
              }
            : profile
        )
      );
    } catch (err) {
      console.error("Reject user error:", err);
      setError("Failed to reject user.");
    } finally {
      setActionLoadingUserId(null);
    }
  };

  const pendingUsers = useMemo(
    () => profiles.filter((profile) => profile.status === "pending_approval"),
    [profiles]
  );

  const visibleUsers = useMemo(() => {
    const baseUsers = profiles.filter(
      (profile) =>
        profile.status !== "pending_verification" &&
        profile.status !== "pending_profile"
    );

    const normalizedQuery = normalizeSearch(searchQuery);

    const searchedUsers = normalizedQuery
      ? baseUsers.filter((profile) => {
          const searchableText = [
  profile.full_name,
  profile.email,
  profile.display_name,
  profile.phone,
  profile.additional_emails,
  profile.company,
  profile.department,
  profile.job_title,
  profile.city,
  profile.country,
  profile.shipping_address,
  profile.whatsapp,
  profile.wechat,
  profile.bio,
  profile.role,
  profile.requested_role,
  profile.status,
]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedQuery);
        })
      : baseUsers;

    switch (activeTab) {
      case "pending":
        return searchedUsers.filter((profile) => profile.status === "pending_approval");

      case "active":
        return searchedUsers.filter((profile) => profile.status === "active");

      case "rejected":
        return searchedUsers.filter((profile) => profile.status === "rejected");

      case "all":
      default:
        return searchedUsers;
    }
  }, [profiles, searchQuery, activeTab]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "employee":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "guest":
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending_approval":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending_verification":
      case "pending_profile":
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case "pending_verification":
        return "EMAIL NOT VERIFIED";
      case "pending_profile":
        return "PROFILE NOT SUBMITTED";
      case "pending_approval":
        return "PENDING APPROVAL";
      case "rejected":
        return "REJECTED";
      case "active":
      default:
        return "ACTIVE";
    }
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return "U";

    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400">
            View, approve, and manage platform members
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadProfiles("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

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
                    <p className="text-slate-500 text-sm truncate">
                      {[
                        user.company,
                        user.department,
                        user.job_title,
                        [user.city, user.country].filter(Boolean).join(", "),
                      ]
                        .filter(Boolean)
                        .join(" • ") || "No full details provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => void approveUser(user.user_id)}
                    disabled={actionLoadingUserId === user.user_id}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                    onClick={() => void rejectUser(user.user_id)}
                    disabled={actionLoadingUserId === user.user_id}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => navigate(`/employees/${user.user_id}`)}
                    disabled={actionLoadingUserId === user.user_id}
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
            placeholder="Search by name, company, department, city, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 text-white"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
        >
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
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
      ) : visibleUsers.length > 0 ? (
        <div className="grid xl:grid-cols-2 gap-4">
          {visibleUsers.map((user) => (
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
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusLabel(user.status)}
                      </Badge>
                      {!user.profile_completed && user.status === "active" && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          PROFILE INCOMPLETE
                        </Badge>
                      )}
                    </div>

                    {(() => {
                      const employeeFields = buildEmployeeFields(user);

                      return employeeFields.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {employeeFields.map((field) => (
                            <div
                              key={`${user.user_id}-${field.key}`}
                              className={[
                                "rounded-xl border border-slate-800 bg-slate-950/60 p-3 min-w-0",
                                field.fullWidth ? "md:col-span-2" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5">{getFieldIcon(field.icon)}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-slate-500 mb-1 text-xs uppercase tracking-[0.12em]">
                                    {field.label}
                                  </p>
                                  <div className="space-y-1">
                                    {field.values.map((value, index) => (
                                      <p
                                        key={`${user.user_id}-${field.key}-${index}`}
                                        className={field.label === "Bio" ? "text-slate-300 leading-relaxed break-words whitespace-pre-wrap" : "text-slate-300 break-words"}
                                      >
                                        {value}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No profile details added yet.</p>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-10 text-center text-slate-500">
            No users found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
