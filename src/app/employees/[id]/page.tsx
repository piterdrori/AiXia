import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Shield,
  User,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  MessageCircle,
  AlertCircle,
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
  role: Role;
  status: Status;
  requested_role: Role | null;
  display_name?: string | null;
  bio?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  company?: string | null;
  department?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  wechat?: string | null;
  whatsapp?: string | null;
  profile_completed?: boolean | null;
  permissions?: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
};

type CurrentUserRoleRow = {
  role: Role;
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [user, setUser] = useState<ProfileRow | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [status, setStatus] = useState<Status>("active");
  const [profileCompleted, setProfileCompleted] = useState(false);

  const canManage = currentUserRole === "admin";
  const isOwnProfile = currentUserId === id;

  const fillForm = useCallback((profile: ProfileRow) => {
    setUser(profile);
    setFullName(profile.full_name || "");
    setEmail(profile.email || "");
    setDisplayName(profile.display_name || "");
    setPhone(profile.phone || "");
    setCountry(profile.country || "");
    setCity(profile.city || "");
    setCompany(profile.company || "");
    setDepartment(profile.department || "");
    setJobTitle(profile.job_title || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
    setWechat(profile.wechat || "");
    setWhatsapp(profile.whatsapp || "");
    setRole(profile.role);
    setStatus(profile.status);
    setProfileCompleted(Boolean(profile.profile_completed));
  }, []);

  const loadUser = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) {
        navigate("/employees");
        return;
      }

      const requestId = requestTracker.current.next();

      if (mode === "initial") {
        setIsBootstrapping(true);
      } else {
        setIsRefreshing(true);
      }

      setSaveError("");

      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (authError || !authUser) {
          navigate("/login");
          return;
        }

        setCurrentUserId(authUser.id);

        const [
          { data: me, error: meError },
          { data: profileData, error: profileError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("user_id", authUser.id)
            .single(),
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", id)
            .maybeSingle(),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (meError || !me) {
          navigate("/employees");
          return;
        }

        setCurrentUserRole((me as CurrentUserRoleRow).role);

        if (profileError || !profileData) {
          setSaveError("User not found.");
          setUser(null);
          return;
        }

        fillForm(profileData as ProfileRow);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Employee detail load error:", err);
        setSaveError("Failed to load user profile.");
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;

        if (mode === "initial") {
          setIsBootstrapping(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [fillForm, id, navigate]
  );

  useEffect(() => {
    void loadUser("initial");
  }, [loadUser]);

  const showSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";

    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (value: Role) => {
    switch (value) {
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

  const getStatusColor = (value: Status) => {
    switch (value) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending_verification":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      case "pending_profile":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pending_approval":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected":
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  const getStatusLabel = (value: Status) => {
    switch (value) {
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

  const handleSave = async () => {
    if (!id || !user) return;

    setIsSaving(true);
    setSaveError("");
    setSaved(false);

    const nextUpdatedAt = new Date().toISOString();

    const payload: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      company: company.trim() || null,
      department: department.trim() || null,
      job_title: jobTitle.trim() || null,
      bio: normalizeOptional(bio),
      avatar_url: normalizeOptional(avatarUrl),
      wechat: normalizeOptional(wechat),
      whatsapp: normalizeOptional(whatsapp),
      updated_at: nextUpdatedAt,
    };

    if (canManage) {
      payload.role = role;
      payload.status = status;
      payload.profile_completed = profileCompleted;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", id);

      if (error) {
        setSaveError(error.message || "Failed to save user.");
        return;
      }

      const nextUser: ProfileRow | null = user
        ? ({
            ...user,
            ...payload,
          } as ProfileRow)
        : null;

      if (nextUser) {
        fillForm(nextUser);
      }

      setIsEditing(false);
      showSaved();
    } catch (err) {
      console.error("Save employee error:", err);
      setSaveError("Failed to save user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!id || !canManage) return;

    const confirmed = window.confirm(
      "Are you sure you want to reject/deactivate this user? They will not be able to access the system."
    );
    if (!confirmed) return;

    setIsDeactivating(true);
    setSaveError("");

    try {
      const nextUpdatedAt = new Date().toISOString();

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "rejected",
          updated_at: nextUpdatedAt,
        })
        .eq("user_id", id);

      if (error) {
        setSaveError(error.message || "Failed to deactivate user.");
        return;
      }

      const nextUser = user
        ? {
            ...user,
            status: "rejected" as Status,
            updated_at: nextUpdatedAt,
          }
        : null;

      if (nextUser) {
        fillForm(nextUser);
      }
    } catch (err) {
      console.error("Deactivate employee error:", err);
      setSaveError("Failed to deactivate user.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !canManage) return;

    const confirmed = window.confirm(
      "This will permanently delete the user. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setSaveError("");

    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        target_user_id: id,
      });

      if (error) {
        setSaveError(error.message || "Failed to delete user.");
        return;
      }

      window.alert("User deleted successfully.");
      navigate("/employees");
    } catch (err) {
      console.error("Delete user error:", err);
      setSaveError("Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user && !isBootstrapping) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-red-900/10 border-red-800/30">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="text-red-300">{saveError || "User not found."}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-slate-300 hover:bg-slate-800"
            onClick={() => navigate("/employees")}
            disabled={isSaving || isDeactivating || isDeleting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-white">User Profile</h1>
            <p className="text-slate-400">View and manage user details</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadUser("refresh")}
            disabled={isRefreshing || isSaving || isDeactivating || isDeleting}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {canManage && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/employees/${id}/permissions`)}
              disabled={isSaving || isDeactivating || isDeleting}
            >
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </Button>
          )}

          {(canManage || isOwnProfile) && !isEditing && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsEditing(true)}
              disabled={isDeactivating || isDeleting}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}

          {canManage && (
            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={() => void handleDeactivateUser()}
              disabled={isDeactivating || isSaving || isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeactivating ? "Deactivating..." : "Reject / Deactivate"}
            </Button>
          )}

          {canManage && (
            <Button
              variant="destructive"
              className="bg-red-700 hover:bg-red-800 text-white"
              onClick={() => void handleDeleteUser()}
              disabled={isDeleting || isSaving || isDeactivating}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          )}
        </div>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>User profile saved successfully.</AlertDescription>
        </Alert>
      )}

      {saveError && user && (
        <Alert className="bg-red-900/20 border-red-800 text-red-400">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="grid xl:grid-cols-[340px,1fr] gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            {isBootstrapping && !user ? (
              <div className="animate-pulse space-y-4">
                <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto" />
                <div className="h-6 bg-slate-800 rounded w-40 mx-auto" />
                <div className="h-4 bg-slate-800 rounded w-28 mx-auto" />
                <div className="space-y-3 pt-4">
                  <div className="h-4 bg-slate-800 rounded" />
                  <div className="h-4 bg-slate-800 rounded" />
                  <div className="h-4 bg-slate-800 rounded" />
                  <div className="h-4 bg-slate-800 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>

                <h2 className="text-xl font-semibold text-white">
                  {fullName || "Unnamed user"}
                </h2>
                <p className="text-slate-400">{displayName || "No display name"}</p>

                <div className="flex items-center gap-2 flex-wrap justify-center mt-4">
                  <Badge className={getRoleColor(role)}>{role.toUpperCase()}</Badge>
                  <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                  {!profileCompleted && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      PROFILE INCOMPLETE
                    </Badge>
                  )}
                                    {user?.requested_role && user.requested_role !== role && (
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      REQUESTED {user.requested_role.toUpperCase()}
                    </Badge>
                  )}
                </div>

                <<div className="w-full mt-6 space-y-3 text-left">
  <div className="flex items-center gap-2 text-slate-300">
    <span className="w-4 h-4 text-slate-500 flex items-center justify-center text-xs font-semibold">
      @
    </span>
    <span>{email || "No email"}</span>
  </div>
  <div className="flex items-center gap-2 text-slate-300">
    <Phone className="w-4 h-4 text-slate-500" />
    <span>{phone || "No phone"}</span>
  </div>>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{[city, country].filter(Boolean).join(", ") || "No location"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{company || "No company"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span>{jobTitle || "No job title"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{department || "No department"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <span>WhatsApp: {whatsapp || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <span>WeChat: {wechat || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              {isEditing ? "Edit Profile Details" : "Profile Details"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {isBootstrapping && !user ? (
              <div className="space-y-6 animate-pulse">
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-24" />
                      <div className="h-10 bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-28" />
                  <div className="h-28 bg-slate-800 rounded" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label className="text-slate-300">Full Name</Label>
    <Input
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
      disabled={!isEditing}
      className="bg-slate-950 border-slate-800 text-white"
    />
  </div>

  <div className="space-y-2">
    <Label className="text-slate-300">Display Name</Label>
    <Input
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      disabled={!isEditing}
      className="bg-slate-950 border-slate-800 text-white"
    />
  </div>

  <div className="space-y-2">
    <Label className="text-slate-300">Email</Label>
    <Input
      value={email}
      disabled
      className="bg-slate-950 border-slate-800 text-white"
    />
  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Country</Label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Company</Label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Department</Label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Job Title</Label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">WhatsApp</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">WeChat</Label>
                    <Input
                      value={wechat}
                      onChange={(e) => setWechat(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300">Profile Photo URL</Label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      disabled={!isEditing}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300">Short Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      disabled={!isEditing}
                      rows={5}
                      className="bg-slate-950 border-slate-800 text-white resize-none"
                    />
                  </div>
                </div>

                {canManage && (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Role</Label>
                      <Select
                        value={role}
                        onValueChange={(value) => setRole(value as Role)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Status</Label>
                      <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as Status)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending_verification">
                            Pending Verification
                          </SelectItem>
                          <SelectItem value="pending_profile">
                            Pending Profile
                          </SelectItem>
                          <SelectItem value="pending_approval">
                            Pending Approval
                          </SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Profile Completion</Label>
                      <Select
                        value={profileCompleted ? "yes" : "no"}
                        onValueChange={(value) => setProfileCompleted(value === "yes")}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="yes">Completed</SelectItem>
                          <SelectItem value="no">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(canManage || isOwnProfile) && isEditing && (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => {
                        setIsEditing(false);
                        if (user) fillForm(user);
                      }}
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
