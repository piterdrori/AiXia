import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { uploadProfilePhoto } from "@/lib/profilePhotoUpload";

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
  Plus,
  Mail,
  Image as ImageIcon,
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
  shipping_address?: string | null;
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

function splitMultiValue(value?: string | null) {
  const items = (value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [""];
}

function joinMultiValue(values: string[]) {
  const cleaned = values.map((item) => item.trim()).filter(Boolean).join("\n");
  return cleaned || null;
}

function firstFilled(values: string[]) {
  return values.find((item) => item.trim()) || "";
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [user, setUser] = useState<ProfileRow | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditor, setActiveEditor] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [companies, setCompanies] = useState<string[]>([""]);
  const [departments, setDepartments] = useState<string[]>([""]);
  const [jobTitles, setJobTitles] = useState<string[]>([""]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [wechats, setWechats] = useState<string[]>([""]);
  const [whatsapps, setWhatsapps] = useState<string[]>([""]);
  const [role, setRole] = useState<Role>("employee");
  const [status, setStatus] = useState<Status>("active");
  const [profileCompleted, setProfileCompleted] = useState(false);

  const canManage = currentUserRole === "admin";
  const isOwnProfile = currentUserId === id;
  const canEditProfileFields = canManage || isOwnProfile;

  const fillForm = useCallback((profile: ProfileRow) => {
    setUser(profile);
    setFullName(profile.full_name || "");
    setEmail(profile.email || "");
    setDisplayName(profile.display_name || "");
    setPhones(splitMultiValue(profile.phone));
    setCountry(profile.country || "");
    setCity(profile.city || "");
    setShippingAddress(profile.shipping_address || "");
    setCompanies(splitMultiValue(profile.company));
    setDepartments(splitMultiValue(profile.department));
    setJobTitles(splitMultiValue(profile.job_title));
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
    setWechats(splitMultiValue(profile.wechat));
    setWhatsapps(splitMultiValue(profile.whatsapp));
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

  const displayPhone = useMemo(() => firstFilled(phones), [phones]);
  const displayCompany = useMemo(() => firstFilled(companies), [companies]);
  const displayDepartment = useMemo(() => firstFilled(departments), [departments]);
  const displayJobTitle = useMemo(() => firstFilled(jobTitles), [jobTitles]);
  const displayWhatsapp = useMemo(() => firstFilled(whatsapps), [whatsapps]);
  const displayWechat = useMemo(() => firstFilled(wechats), [wechats]);

  const beginEditing = (fieldKey: string) => {
    setIsEditing(true);
    setActiveEditor(fieldKey);
  };

  const clearField = (fieldKey: string) => {
    switch (fieldKey) {
      case "registered_email":
        setEmail("");
        break;
      case "display_name":
        setDisplayName("");
        break;
      case "phone":
        setPhones([""]);
        break;
      case "company":
        setCompanies([""]);
        break;
      case "department":
        setDepartments([""]);
        break;
      case "job_title":
        setJobTitles([""]);
        break;
      case "whatsapp":
        setWhatsapps([""]);
        break;
      case "wechat":
        setWechats([""]);
        break;
      case "bio":
        setBio("");
        break;
      case "profile_photo":
        setAvatarUrl("");
        break;
      case "location":
        setCountry("");
        setCity("");
        setShippingAddress("");
        break;
      default:
        break;
    }

    setIsEditing(true);
    setActiveEditor(fieldKey);
  };

  const updateArrayValue = (
    values: string[],
    setValues: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    nextValue: string
  ) => {
    setValues(values.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));
  };

  const addArrayValue = (
    values: string[],
    setValues: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const hasEmpty = values.some((item) => !item.trim());
    if (!hasEmpty) {
      setValues([...values, ""]);
    }
  };

  const removeArrayValue = (
    values: string[],
    setValues: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    const next = values.filter((_, itemIndex) => itemIndex !== index);
    setValues(next.length > 0 ? next : [""]);
  };

  const handleProfilePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploadingPhoto(true);
    setSaveError("");
    setIsEditing(true);
    setActiveEditor("profile_photo");

    try {
      const result = await uploadProfilePhoto({
        file,
        userId: id,
      });

      setAvatarUrl(result.publicUrl);
    } catch (err) {
      console.error("Profile photo upload error:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to upload profile photo."
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const renderActionButtons = ({
    fieldKey,
    filled,
    canEditThisField,
    addLabel = "Add",
    alwaysShowAdd = false,
  }: {
    fieldKey: string;
    filled: boolean;
    canEditThisField: boolean;
    addLabel?: string;
    alwaysShowAdd?: boolean;
  }) => {
    if (!canEditThisField) return null;

    return (
      <div className="flex items-center gap-2">
        {(alwaysShowAdd || !filled) && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => beginEditing(fieldKey)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {addLabel}
          </Button>
        )}

        {filled && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => beginEditing(fieldKey)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={() => clearField(fieldKey)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderSingleFieldCard = ({
    fieldKey,
    label,
    value,
    setValue,
    adminOnly = false,
    multiline = false,
    helperText,
  }: {
    fieldKey: string;
    label: string;
    value: string;
    setValue: (value: string) => void;
    adminOnly?: boolean;
    multiline?: boolean;
    helperText?: string;
  }) => {
    const canEditThisField = adminOnly ? canManage : canEditProfileFields;
    const isThisEditing = isEditing && activeEditor === fieldKey;
    const filled = hasText(value);

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">{label}</h4>
            <p className="text-xs text-slate-500">
              {helperText || (adminOnly ? "Admin-controlled field" : "Profile field")}
            </p>
          </div>

          {renderActionButtons({
            fieldKey,
            filled,
            canEditThisField,
          })}
        </div>

        <div className="mt-4">
          {isThisEditing ? (
            multiline ? (
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={5}
                className="bg-slate-950 border-slate-800 text-white resize-none"
              />
            ) : (
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            )
          ) : (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 text-sm text-slate-200 min-h-[52px] flex items-center">
              {filled ? value : <span className="text-slate-500">No value added yet</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMultiFieldCard = ({
    fieldKey,
    label,
    values,
    setValues,
    helperText,
  }: {
    fieldKey: string;
    label: string;
    values: string[];
    setValues: React.Dispatch<React.SetStateAction<string[]>>;
    helperText?: string;
  }) => {
    const filledValues = values.map((item) => item.trim()).filter(Boolean);
    const isThisEditing = isEditing && activeEditor === fieldKey;
    const filled = filledValues.length > 0;

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">{label}</h4>
            <p className="text-xs text-slate-500">
              {helperText || "You can add more than one value here."}
            </p>
          </div>

          {renderActionButtons({
            fieldKey,
            filled,
            canEditThisField: canEditProfileFields,
            alwaysShowAdd: true,
            addLabel: "Add",
          })}
        </div>

        <div className="mt-4">
          {isThisEditing ? (
            <div className="space-y-3">
              {values.map((value, index) => (
                <div key={`${fieldKey}-${index}`} className="flex items-center gap-2">
                  <Input
                    value={value}
                    onChange={(e) =>
                      updateArrayValue(values, setValues, index, e.target.value)
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder={`${label} ${index + 1}`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-900/20 shrink-0"
                    onClick={() => removeArrayValue(values, setValues, index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => addArrayValue(values, setValues)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add another {label.toLowerCase()}
              </Button>
            </div>
          ) : filled ? (
            <div className="space-y-2">
              {filledValues.map((item, index) => (
                <div
                  key={`${fieldKey}-display-${index}`}
                  className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 text-sm text-slate-500">
              No value added yet
            </div>
          )}
        </div>
      </div>
    );
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
      phone: joinMultiValue(phones),
      country: country.trim() || null,
      city: city.trim() || null,
      shipping_address: shippingAddress.trim() || null,
      company: joinMultiValue(companies),
      department: joinMultiValue(departments),
      job_title: joinMultiValue(jobTitles),
      bio: normalizeOptional(bio),
      avatar_url: normalizeOptional(avatarUrl),
      wechat: joinMultiValue(wechats),
      whatsapp: joinMultiValue(whatsapps),
      updated_at: nextUpdatedAt,
    };

    if (canManage) {
      payload.email = email.trim() || null;
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
      setActiveEditor(null);
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-slate-300 hover:bg-slate-800"
            onClick={() => navigate("/employees")}
            disabled={isSaving || isUploadingPhoto || isDeactivating || isDeleting}
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
            disabled={
              isRefreshing ||
              isSaving ||
              isUploadingPhoto ||
              isDeactivating ||
              isDeleting
            }
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {canManage && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/employees/${id}/permissions`)}
              disabled={isSaving || isUploadingPhoto || isDeactivating || isDeleting}
            >
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </Button>
          )}

          {(canManage || isOwnProfile) && !isEditing && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                setIsEditing(true);
                setActiveEditor(null);
              }}
              disabled={isUploadingPhoto || isDeactivating || isDeleting}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Mode
            </Button>
          )}

          {canManage && (
            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={() => void handleDeactivateUser()}
              disabled={isDeactivating || isSaving || isUploadingPhoto || isDeleting}
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
              disabled={isDeleting || isSaving || isUploadingPhoto || isDeactivating}
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

      <div className="grid xl:grid-cols-[320px,1fr] gap-6">
        <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
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
                <Avatar className="w-28 h-28 mb-4 ring-4 ring-slate-800">
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
                  <Badge className={getStatusColor(status)}>
                    {getStatusLabel(status)}
                  </Badge>
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

                <div className="w-full mt-6 space-y-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>{email || "No email"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{displayPhone || "No phone"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <div>
                          {[city, country].filter(Boolean).join(", ") || "No location"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {shippingAddress || "No shipping address"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span>{displayCompany || "No company"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      <span>{displayJobTitle || "No job title"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{displayDepartment || "No department"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageCircle className="w-4 h-4 text-slate-500" />
                      <span>WhatsApp: {displayWhatsapp || "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageCircle className="w-4 h-4 text-slate-500" />
                      <span>WeChat: {displayWechat || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white">
              {isEditing ? "Edit Profile Details" : "Profile Details"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {isBootstrapping && !user ? (
              <div className="space-y-6 animate-pulse">
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-24" />
                      <div className="h-10 bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-6">
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Admin-Controlled Identity
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Registered Email is the official system email and can only be changed by admin.
                      </p>
                    </div>

                    {renderSingleFieldCard({
                      fieldKey: "registered_email",
                      label: "Registered Email",
                      value: email,
                      setValue: setEmail,
                      adminOnly: true,
                      helperText: "Only admin can add, edit, or remove this field.",
                    })}
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">User Profile</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Cleaner layout with compact cards and support for multiple values where needed.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-white">Location</h4>
                            <p className="text-xs text-slate-500">
                              Country, City, and Shipping Address are grouped here.
                            </p>
                          </div>

                          {renderActionButtons({
                            fieldKey: "location",
                            filled: Boolean(country || city || shippingAddress),
                            canEditThisField: canEditProfileFields,
                            alwaysShowAdd: true,
                          })}
                        </div>

                        <div className="mt-4">
                          {isEditing && activeEditor === "location" ? (
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label className="text-slate-300">Country</Label>
                                <Input
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-slate-300">City</Label>
                                <Input
                                  value={city}
                                  onChange={(e) => setCity(e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-slate-300">Shipping Address</Label>
                                <Input
                                  value={shippingAddress}
                                  onChange={(e) => setShippingAddress(e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                                <div className="text-xs text-slate-500 mb-1">Country</div>
                                <div className="text-sm text-slate-200">
                                  {country || "No value added yet"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                                <div className="text-xs text-slate-500 mb-1">City</div>
                                <div className="text-sm text-slate-200">
                                  {city || "No value added yet"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                                <div className="text-xs text-slate-500 mb-1">Shipping Address</div>
                                <div className="text-sm text-slate-200">
                                  {shippingAddress || "No value added yet"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {renderSingleFieldCard({
                        fieldKey: "display_name",
                        label: "Display Name",
                        value: displayName,
                        setValue: setDisplayName,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "phone",
                        label: "Phone",
                        values: phones,
                        setValues: setPhones,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "company",
                        label: "Company",
                        values: companies,
                        setValues: setCompanies,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "department",
                        label: "Department",
                        values: departments,
                        setValues: setDepartments,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "job_title",
                        label: "Job Title",
                        values: jobTitles,
                        setValues: setJobTitles,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "whatsapp",
                        label: "WhatsApp",
                        values: whatsapps,
                        setValues: setWhatsapps,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "wechat",
                        label: "WeChat",
                        values: wechats,
                        setValues: setWechats,
                      })}

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-white">Profile Photo</h4>
                            <p className="text-xs text-slate-500">
                              Upload, replace, or remove the profile image.
                            </p>
                          </div>

                          {canEditProfileFields && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-700 text-slate-200 hover:bg-slate-800"
                                onClick={() => {
                                  setIsEditing(true);
                                  setActiveEditor("profile_photo");
                                  profilePhotoInputRef.current?.click();
                                }}
                                disabled={isUploadingPhoto}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>

                              {avatarUrl && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                                    onClick={() => {
                                      setIsEditing(true);
                                      setActiveEditor("profile_photo");
                                      profilePhotoInputRef.current?.click();
                                    }}
                                    disabled={isUploadingPhoto}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                                    onClick={() => clearField("profile_photo")}
                                    disabled={isUploadingPhoto}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <input
                          ref={profilePhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfilePhotoUpload}
                        />

                        <div className="mt-4">
                          {avatarUrl ? (
                            <div className="flex items-center gap-4 rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-4">
                              <Avatar className="w-20 h-20">
                                <AvatarImage src={avatarUrl || undefined} />
                                <AvatarFallback className="bg-indigo-600 text-white">
                                  {getInitials(fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm text-white font-medium">
                                  Profile image uploaded
                                </div>
                                <div className="text-xs text-slate-500 break-all mt-1">
                                  {avatarUrl}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-4 text-sm text-slate-400 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              No profile photo added yet
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        {renderSingleFieldCard({
                          fieldKey: "bio",
                          label: "Bio",
                          value: bio,
                          setValue: setBio,
                          multiline: true,
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Core Account Details</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Main account information and approval controls.
                      </p>
                    </div>

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
                            onValueChange={(value) =>
                              setProfileCompleted(value === "yes")
                            }
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
                  </section>
                </div>

                {(canManage || isOwnProfile) && isEditing && (
                  <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
                    <Button
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => {
                        setIsEditing(false);
                        setActiveEditor(null);
                        if (user) fillForm(user);
                      }}
                      disabled={isSaving || isUploadingPhoto}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => void handleSave()}
                      disabled={isSaving || isUploadingPhoto}
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
