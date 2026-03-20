import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { uploadProfilePhoto } from "@/lib/profilePhotoUpload";
import { useLanguage } from "@/lib/i18n";

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
  AlertCircle,
  Plus,
  Mail,
  Image as ImageIcon,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type MemberType =
  | "client"
  | "supplier"
  | "investor"
  | "consultant"
  | "visitor"
  | "partner"
  | "engineer"
  | "designer"
  | "sourcing"
  | "purchasing"
  | "sales"
  | "marketing"
  | "finance"
  | "operations"
  | "qc"
  | "assistant"
  | "project_manager"
  | "operations_manager"
  | "department_manager"
  | "sales_manager"
  | "factory_manager";

type Status =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected";

const MEMBER_TYPE_OPTIONS: Record<
  Exclude<Role, "admin">,
  Array<{ value: MemberType; label: string }>
> = {
  guest: [
    { value: "client", label: "Client" },
    { value: "supplier", label: "Supplier" },
    { value: "investor", label: "Investor" },
    { value: "consultant", label: "Consultant" },
    { value: "visitor", label: "Visitor" },
    { value: "partner", label: "Partner" },
  ],
  employee: [
    { value: "engineer", label: "Engineer" },
    { value: "designer", label: "Designer" },
    { value: "sourcing", label: "Sourcing" },
    { value: "purchasing", label: "Purchasing" },
    { value: "sales", label: "Sales" },
    { value: "marketing", label: "Marketing" },
    { value: "finance", label: "Finance" },
    { value: "operations", label: "Operations" },
    { value: "qc", label: "QC" },
    { value: "assistant", label: "Assistant" },
  ],
  manager: [
    { value: "project_manager", label: "Project Manager" },
    { value: "operations_manager", label: "Operations Manager" },
    { value: "department_manager", label: "Department Manager" },
    { value: "sales_manager", label: "Sales Manager" },
    { value: "factory_manager", label: "Factory Manager" },
  ],
};

function getMemberTypeLabel(value: string | null | undefined) {
  if (!value) return "";

  for (const options of Object.values(MEMBER_TYPE_OPTIONS)) {
    const found = options.find((option) => option.value === value);
    if (found) return found.label;
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email?: string | null;
  additional_emails?: string | null;
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
  member_type?: MemberType | null;
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

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function hasText(value: string) {
  return value.trim().length > 0;
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

export default function EmployeeDetailPage() {
  const { t } = useLanguage();
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
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([""]);
  const [displayName, setDisplayName] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [companies, setCompanies] = useState<string[]>([""]);
  const [memberType, setMemberType] = useState<MemberType | "">("");
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

  const getTranslatedMemberTypeLabel = useCallback(
    (value: string | null | undefined) => {
      if (!value) return "";

      switch (value) {
        case "client":
          return t("employeeDetail.memberTypes.client");
        case "supplier":
          return t("employeeDetail.memberTypes.supplier");
        case "investor":
          return t("employeeDetail.memberTypes.investor");
        case "consultant":
          return t("employeeDetail.memberTypes.consultant");
        case "visitor":
          return t("employeeDetail.memberTypes.visitor");
        case "partner":
          return t("employeeDetail.memberTypes.partner");
        case "engineer":
          return t("employeeDetail.memberTypes.engineer");
        case "designer":
          return t("employeeDetail.memberTypes.designer");
        case "sourcing":
          return t("employeeDetail.memberTypes.sourcing");
        case "purchasing":
          return t("employeeDetail.memberTypes.purchasing");
        case "sales":
          return t("employeeDetail.memberTypes.sales");
        case "marketing":
          return t("employeeDetail.memberTypes.marketing");
        case "finance":
          return t("employeeDetail.memberTypes.finance");
        case "operations":
          return t("employeeDetail.memberTypes.operations");
        case "qc":
          return t("employeeDetail.memberTypes.qc");
        case "assistant":
          return t("employeeDetail.memberTypes.assistant");
        case "project_manager":
          return t("employeeDetail.memberTypes.projectManager");
        case "operations_manager":
          return t("employeeDetail.memberTypes.operationsManager");
        case "department_manager":
          return t("employeeDetail.memberTypes.departmentManager");
        case "sales_manager":
          return t("employeeDetail.memberTypes.salesManager");
        case "factory_manager":
          return t("employeeDetail.memberTypes.factoryManager");
        default:
          return getMemberTypeLabel(value);
      }
    },
    [t]
  );

  const fillForm = useCallback((profile: ProfileRow) => {
    setUser(profile);
    setFullName(profile.full_name || "");
    setEmail(profile.email || "");
    setAdditionalEmails(splitMultiValue(profile.additional_emails));
    setDisplayName(profile.display_name || "");
    setPhones(splitMultiValue(profile.phone));
    setCountry(profile.country || "");
    setCity(profile.city || "");
    setShippingAddress(profile.shipping_address || "");
    setCompanies(splitMultiValue(profile.company));
    setMemberType(profile.member_type || "");
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
          supabase.from("profiles").select("role").eq("user_id", authUser.id).single(),
          supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (meError || !me) {
          navigate("/employees");
          return;
        }

        setCurrentUserRole((me as CurrentUserRoleRow).role);

        if (profileError || !profileData) {
          setSaveError(t("employeeDetail.errors.userNotFound"));
          setUser(null);
          return;
        }

        fillForm(profileData as ProfileRow);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Employee detail load error:", err);
        setSaveError(t("employeeDetail.errors.loadFailed"));
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;

        if (mode === "initial") {
          setIsBootstrapping(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [fillForm, id, navigate, t]
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
        return t("employeeDetail.status.emailNotVerified");
      case "pending_profile":
        return t("employeeDetail.status.profileNotSubmitted");
      case "pending_approval":
        return t("employeeDetail.status.pendingApproval");
      case "rejected":
        return t("employeeDetail.status.rejected");
      case "active":
      default:
        return t("employeeDetail.status.active");
    }
  };

  const beginEditing = (fieldKey: string) => {
    setIsEditing(true);
    setActiveEditor(fieldKey);
  };

  const clearField = (fieldKey: string) => {
    switch (fieldKey) {
      case "registered_email":
        setEmail("");
        break;
      case "additional_emails":
        setAdditionalEmails([""]);
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
      case "member_type":
        setMemberType("");
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
    setValues: Dispatch<SetStateAction<string[]>>,
    index: number,
    nextValue: string
  ) => {
    setValues(values.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));
  };

  const addArrayValue = (
    values: string[],
    setValues: Dispatch<SetStateAction<string[]>>
  ) => {
    const hasEmpty = values.some((item) => !item.trim());
    if (!hasEmpty) {
      setValues([...values, ""]);
    }
  };

  const removeArrayValue = (
    values: string[],
    setValues: Dispatch<SetStateAction<string[]>>,
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
        err instanceof Error ? err.message : t("employeeDetail.errors.photoUploadFailed")
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
    addLabel = t("employeeDetail.actions.add"),
    alwaysShowAdd = false,
  }: {
    fieldKey: string;
    filled: boolean;
    canEditThisField: boolean;
    addLabel?: string;
    alwaysShowAdd?: boolean;
  }) => {
    if (!canEditThisField) return null;

    const showAdd =
      fieldKey === "registered_email"
        ? !filled
        : alwaysShowAdd || !filled;

    return (
      <div className="flex items-center gap-2">
        {showAdd && (
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
              {t("employeeDetail.actions.edit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={() => clearField(fieldKey)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t("employeeDetail.actions.delete")}
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
  }: {
    fieldKey: string;
    label: string;
    value: string;
    setValue: (value: string) => void;
    adminOnly?: boolean;
    multiline?: boolean;
  }) => {
    const canEditThisField = adminOnly ? canManage : canEditProfileFields;
    const isThisEditing = isEditing && activeEditor === fieldKey;
    const filled = hasText(value);

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">{label}</h4>
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
              {filled ? value : <span className="text-slate-500">{t("employeeDetail.empty.noValue")}</span>}
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
    alwaysShowAdd = true,
  }: {
    fieldKey: string;
    label: string;
    values: string[];
    setValues: Dispatch<SetStateAction<string[]>>;
    alwaysShowAdd?: boolean;
  }) => {
    const filledValues = values.map((item) => item.trim()).filter(Boolean);
    const isThisEditing = isEditing && activeEditor === fieldKey;
    const filled = filledValues.length > 0;

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">{label}</h4>
          </div>

          {renderActionButtons({
            fieldKey,
            filled,
            canEditThisField: canEditProfileFields,
            alwaysShowAdd,
            addLabel: t("employeeDetail.actions.add"),
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
                    placeholder={t("employeeDetail.placeholders.numberedField", undefined, {
                      label,
                      index: index + 1,
                    })}
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
                {fieldKey === "additional_emails"
                  ? t("employeeDetail.actions.addAnotherAdditionalEmail")
                  : fieldKey === "phone"
                    ? t("employeeDetail.actions.addAnotherPhone")
                    : fieldKey === "company"
                      ? t("employeeDetail.actions.addAnotherCompany")
                      : fieldKey === "job_title"
                        ? t("employeeDetail.actions.addAnotherJobTitle")
                        : fieldKey === "whatsapp"
                          ? t("employeeDetail.actions.addAnotherWhatsApp")
                          : fieldKey === "wechat"
                            ? t("employeeDetail.actions.addAnotherWeChat")
                            : t("employeeDetail.actions.add")}
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
              {t("employeeDetail.empty.noValue")}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSidebarCard = (children: React.ReactNode, key: string) => (
    <div
      key={key}
      className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 min-h-[72px] flex items-center"
    >
      {children}
    </div>
  );

  const handleSave = async () => {
    if (!id || !user) return;

    setIsSaving(true);
    setSaveError("");
    setSaved(false);

    const nextUpdatedAt = new Date().toISOString();

    const payload: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      display_name: displayName.trim() || null,
      additional_emails: joinMultiValue(additionalEmails),
      phone: joinMultiValue(phones),
      country: country.trim() || null,
      city: city.trim() || null,
      shipping_address: shippingAddress.trim() || null,
      company: joinMultiValue(companies),
      member_type: memberType || null,
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
        setSaveError(error.message || t("employeeDetail.errors.saveFailed"));
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
      setSaveError(t("employeeDetail.errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!id || !canManage) return;

    const confirmed = window.confirm(
      t("employeeDetail.confirmations.deactivateUser")
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
        setSaveError(error.message || t("employeeDetail.errors.deactivateFailed"));
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
      setSaveError(t("employeeDetail.errors.deactivateFailed"));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !canManage) return;

    const confirmed = window.confirm(
      t("employeeDetail.confirmations.deleteUser")
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setSaveError("");

    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        target_user_id: id,
      });

      if (error) {
        setSaveError(error.message || t("employeeDetail.errors.deleteFailed"));
        return;
      }

      window.alert(t("employeeDetail.success.deleted"));
      navigate("/employees");
    } catch (err) {
      console.error("Delete user error:", err);
      setSaveError(t("employeeDetail.errors.deleteFailed"));
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
            <div className="text-red-300">{saveError || t("employeeDetail.errors.userNotFound")}</div>
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
            {t("employeeDetail.actions.back")}
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-white">{t("employeeDetail.header.title")}</h1>
            <p className="text-slate-400">{t("employeeDetail.header.subtitle")}</p>
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
            {isRefreshing ? t("employeeDetail.actions.refreshing") : t("employeeDetail.actions.refresh")}
          </Button>

          {canManage && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/employees/${id}/permissions`)}
              disabled={isSaving || isUploadingPhoto || isDeactivating || isDeleting}
            >
              <Shield className="w-4 h-4 mr-2" />
              {t("employeeDetail.actions.permissions")}
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
              {t("employeeDetail.actions.editMode")}
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
              {isDeactivating ? t("employeeDetail.actions.deactivating") : t("employeeDetail.actions.deactivate")}
            </Button>
          )}

          {canManage && (
            <Button
              variant="destructive"
              className="bg-red-700 hover:bg-red-800 text-white"
              onClick={() => void handleDeleteUser()}
              disabled={isDeleting || isSaving || isUploadingPhoto || isDeactivating}
            >
              {isDeleting ? t("employeeDetail.actions.deleting") : t("employeeDetail.actions.deleteUser")}
            </Button>
          )}
        </div>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>{t("employeeDetail.success.saved")}</AlertDescription>
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
              <div className="flex flex-col items-start text-left">
                <div className="w-full flex flex-col items-center border-b border-slate-800 pb-6">
                  <Avatar className="w-28 h-28 mb-4 ring-4 ring-slate-800">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-xl font-semibold text-white text-center">
                    {fullName || t("employeeDetail.empty.unnamedUser")}
                  </h2>
                  <p className="text-slate-400 text-center">
                    {displayName || t("employeeDetail.empty.noDisplayName")}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap justify-center mt-4">
                    <Badge className={getRoleColor(role)}>{role.toUpperCase()}</Badge>
                    <Badge className={getStatusColor(status)}>
                      {getStatusLabel(status)}
                    </Badge>
                    {!profileCompleted && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {t("employeeDetail.badges.profileIncomplete")}
                      </Badge>
                    )}
                    {user?.requested_role && user.requested_role !== role && (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        {t("employeeDetail.badges.requestedRole", undefined, {
                          role: user.requested_role.toUpperCase(),
                        })}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full mt-6 grid gap-3">
                  {email &&
                    renderSidebarCard(
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="break-all">{email}</span>
                      </div>,
                      "sidebar-registered-email"
                    )}

                  {additionalEmails.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {additionalEmails.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-additional-email-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="break-all">{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-additional-emails"
                    )}

                  {phones.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {phones.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-phone-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-phones"
                    )}

                  {(country || city || shippingAddress) &&
                    renderSidebarCard(
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <div>{[city, country].filter(Boolean).join(", ")}</div>
                          {shippingAddress && (
                            <div className="text-xs text-slate-500">{shippingAddress}</div>
                          )}
                        </div>
                      </div>,
                      "sidebar-location"
                    )}

                  {companies.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {companies.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-company-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-companies"
                    )}

                  {memberType &&
                    renderSidebarCard(
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{getTranslatedMemberTypeLabel(memberType)}</span>
                      </div>,
                      "sidebar-member-type"
                    )}

                  {jobTitles.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {jobTitles.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-job-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-job-titles"
                    )}

                  {whatsapps.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {whatsapps.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-whatsapp-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                              <span>{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-whatsapp"
                    )}

                  {wechats.some((item) => item.trim()) &&
                    renderSidebarCard(
                      <div className="space-y-2 w-full">
                        {wechats.map((item, index) =>
                          item.trim() ? (
                            <div
                              key={`sidebar-wechat-${index}`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <WeChatIcon className="w-4 h-4 text-[#07C160] shrink-0" />
                              <span>{item}</span>
                            </div>
                          ) : null
                        )}
                      </div>,
                      "sidebar-wechat"
                    )}

                  {bio &&
                    renderSidebarCard(
                      <div className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                        {bio}
                      </div>,
                      "sidebar-bio"
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white">
              {isEditing ? t("employeeDetail.sections.editProfileDetails") : t("employeeDetail.sections.profileDetails")}
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
                        {t("employeeDetail.sections.adminControlledIdentity")}
                      </h3>
                    </div>

                    {renderSingleFieldCard({
                      fieldKey: "registered_email",
                      label: t("employeeDetail.fields.registeredEmail"),
                      value: email,
                      setValue: setEmail,
                      adminOnly: true,
                    })}

                    {renderMultiFieldCard({
                      fieldKey: "additional_emails",
                      label: t("employeeDetail.fields.additionalEmails"),
                      values: additionalEmails,
                      setValues: setAdditionalEmails,
                      alwaysShowAdd: true,
                    })}
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t("employeeDetail.sections.userProfile")}</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-white">{t("employeeDetail.fields.location")}</h4>
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
                                <Label className="text-slate-300">{t("employeeDetail.fields.country")}</Label>
                                <Input
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-slate-300">{t("employeeDetail.fields.city")}</Label>
                                <Input
                                  value={city}
                                  onChange={(e) => setCity(e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-slate-300">{t("employeeDetail.fields.shippingAddress")}</Label>
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
                                <div className="text-xs text-slate-500 mb-1">{t("employeeDetail.fields.country")}</div>
                                <div className="text-sm text-slate-200">
                                  {country || t("employeeDetail.empty.noValue")}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                                <div className="text-xs text-slate-500 mb-1">{t("employeeDetail.fields.city")}</div>
                                <div className="text-sm text-slate-200">
                                  {city || t("employeeDetail.empty.noValue")}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                                <div className="text-xs text-slate-500 mb-1">{t("employeeDetail.fields.shippingAddress")}</div>
                                <div className="text-sm text-slate-200">
                                  {shippingAddress || t("employeeDetail.empty.noValue")}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {renderSingleFieldCard({
                        fieldKey: "display_name",
                        label: t("employeeDetail.fields.displayName"),
                        value: displayName,
                        setValue: setDisplayName,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "phone",
                        label: t("employeeDetail.fields.phone"),
                        values: phones,
                        setValues: setPhones,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "company",
                        label: t("employeeDetail.fields.company"),
                        values: companies,
                        setValues: setCompanies,
                      })}

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-white">
                              {t("employeeDetail.fields.memberType")}
                            </h4>
                          </div>

                          {renderActionButtons({
                            fieldKey: "member_type",
                            filled: Boolean(memberType),
                            canEditThisField: canEditProfileFields,
                          })}
                        </div>

                        <div className="mt-4">
                          {isEditing && activeEditor === "member_type" ? (
                            role === "admin" ? (
                              <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 text-sm text-slate-500">
                                {t("employeeDetail.messages.adminNoMemberType")}
                              </div>
                            ) : (
                              <Select
                                value={memberType}
                                onValueChange={(value) =>
                                  setMemberType(value as MemberType)
                                }
                              >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                  <SelectValue placeholder={t("employeeDetail.placeholders.selectMemberType")} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                  {MEMBER_TYPE_OPTIONS[role].map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {getTranslatedMemberTypeLabel(option.value)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          ) : (
                            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 text-sm text-slate-200 min-h-[52px] flex items-center">
                              {memberType ? (
                                getTranslatedMemberTypeLabel(memberType)
                              ) : (
                                <span className="text-slate-500">{t("employeeDetail.empty.noValue")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {renderMultiFieldCard({
                        fieldKey: "job_title",
                        label: t("employeeDetail.fields.jobTitle"),
                        values: jobTitles,
                        setValues: setJobTitles,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "whatsapp",
                        label: t("employeeDetail.fields.whatsApp"),
                        values: whatsapps,
                        setValues: setWhatsapps,
                      })}

                      {renderMultiFieldCard({
                        fieldKey: "wechat",
                        label: t("employeeDetail.fields.weChat"),
                        values: wechats,
                        setValues: setWechats,
                      })}

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-white">{t("employeeDetail.fields.profilePhoto")}</h4>
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
                                {t("employeeDetail.actions.add")}
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
                                    {t("employeeDetail.actions.edit")}
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
                                    {t("employeeDetail.actions.delete")}
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
                                  {t("employeeDetail.messages.profileImageUploaded")}
                                </div>
                                <div className="text-xs text-slate-500 break-all mt-1">
                                  {avatarUrl}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-4 text-sm text-slate-400 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              {t("employeeDetail.empty.noProfilePhoto")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        {renderSingleFieldCard({
                          fieldKey: "bio",
                          label: t("employeeDetail.fields.bio"),
                          value: bio,
                          setValue: setBio,
                          multiline: true,
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t("employeeDetail.sections.coreAccountDetails")}</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">{t("employeeDetail.fields.fullName")}</Label>
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
                          <Label className="text-slate-300">{t("employeeDetail.fields.role")}</Label>
                          <Select
                            value={role}
                            onValueChange={(value) => {
                              const nextRole = value as Role;
                              setRole(nextRole);

                              if (nextRole === "admin") {
                                setMemberType("");
                                return;
                              }

                              const allowedValues = MEMBER_TYPE_OPTIONS[nextRole].map(
                                (option) => option.value
                              );

                              if (memberType && !allowedValues.includes(memberType)) {
                                setMemberType("");
                              }
                            }}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-white">
                              <SelectItem value="admin">{t("employeeDetail.roles.admin")}</SelectItem>
                              <SelectItem value="manager">{t("employeeDetail.roles.manager")}</SelectItem>
                              <SelectItem value="employee">{t("employeeDetail.roles.employee")}</SelectItem>
                              <SelectItem value="guest">{t("employeeDetail.roles.guest")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300">{t("employeeDetail.fields.status")}</Label>
                          <Select
                            value={status}
                            onValueChange={(value) => setStatus(value as Status)}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-white">
                              <SelectItem value="active">{t("employeeDetail.status.activeLabel")}</SelectItem>
                              <SelectItem value="pending_verification">
                                {t("employeeDetail.status.pendingVerificationLabel")}
                              </SelectItem>
                              <SelectItem value="pending_profile">
                                {t("employeeDetail.status.pendingProfileLabel")}
                              </SelectItem>
                              <SelectItem value="pending_approval">
                                {t("employeeDetail.status.pendingApprovalLabel")}
                              </SelectItem>
                              <SelectItem value="rejected">{t("employeeDetail.status.rejectedLabel")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300">{t("employeeDetail.fields.profileCompletion")}</Label>
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
                              <SelectItem value="yes">{t("employeeDetail.profile.completed")}</SelectItem>
                              <SelectItem value="no">{t("employeeDetail.profile.incomplete")}</SelectItem>
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
                      {t("employeeDetail.actions.cancel")}
                    </Button>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => void handleSave()}
                      disabled={isSaving || isUploadingPhoto}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? t("employeeDetail.actions.saving") : t("employeeDetail.actions.saveChanges")}
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
