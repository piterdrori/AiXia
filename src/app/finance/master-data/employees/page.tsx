import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  User2,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  member_type?: string | null;
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

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function splitMultiValue(value?: string | null) {
  return (value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRoleBadgeClass(role: Role) {
  switch (role) {
    case "admin":
      return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 shadow-none";
    case "manager":
      return "rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 shadow-none";
    case "employee":
      return "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none";
    case "guest":
    default:
      return "rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 text-[11px] text-slate-200 shadow-none";
  }
}

function getStatusBadgeClass(status: Status) {
  switch (status) {
    case "active":
      return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 shadow-none";
    case "pending_approval":
      return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none";
    case "rejected":
      return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 shadow-none";
    case "pending_verification":
    case "pending_profile":
    default:
      return "rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 text-[11px] text-slate-200 shadow-none";
  }
}

function getStatusLabel(status: Status) {
  switch (status) {
    case "pending_verification":
      return "Pending Verification";
    case "pending_profile":
      return "Pending Profile";
    case "pending_approval":
      return "Pending Approval";
    case "active":
      return "Active";
    case "rejected":
    default:
      return "Rejected";
  }
}

function getMemberTypeLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPrimaryEmail(profile: ProfileRow) {
  if (profile.email?.trim()) return profile.email.trim();

  const additionalEmails = splitMultiValue(profile.additional_emails);
  return additionalEmails[0] || "—";
}

function getPrimaryPhone(profile: ProfileRow) {
  const phones = splitMultiValue(profile.phone);
  return phones[0] || "—";
}

function getLocation(profile: ProfileRow) {
  const parts = [profile.city, profile.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export default function FinanceMasterDataEmployeesPage() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          [
            "user_id",
            "full_name",
            "email",
            "additional_emails",
            "display_name",
            "phone",
            "country",
            "city",
            "shipping_address",
            "company",
            "member_type",
            "job_title",
            "wechat",
            "whatsapp",
            "bio",
            "avatar_url",
            "requested_role",
            "role",
            "status",
            "profile_completed",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEmployees(((data || []) as unknown as ProfileRow[]) ?? []);
    } catch (error) {
      console.error("Failed to load finance employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((profile) => {
      if (!query) return true;

      const searchableText = [
        profile.full_name,
        profile.email,
        profile.additional_emails,
        profile.display_name,
        profile.phone,
        profile.country,
        profile.city,
        profile.shipping_address,
        profile.company,
        profile.member_type,
        profile.job_title,
        profile.role,
        profile.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [employees, search]);

  const stats = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter((item) => item.status === "active").length,
      managers: employees.filter((item) => item.role === "manager").length,
      employeesOnly: employees.filter((item) => item.role === "employee").length,
    };
  }, [employees]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70 shadow-none">
                  Master Data
                </Badge>
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Linked Module
                </Badge>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Employees
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                  Finance-facing employee reference view pulled from the main employee
                  system. This page is read-only and links back to the main employee
                  records.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 xl:max-w-[720px] xl:justify-end">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="outline"
                onClick={() => void loadEmployees()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Total Profiles
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : formatCount(stats.total)}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Pulled from profiles
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Active
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : formatCount(stats.active)}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Active employee records
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Managers
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : formatCount(stats.managers)}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Manager role profiles
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Employees
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : formatCount(stats.employeesOnly)}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Employee role profiles
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/8 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                  Employee Registry
                </Badge>
                <CardTitle className="text-white">
                  Employee Reference View
                </CardTitle>
                <CardDescription className="text-white/45">
                  Read-only finance access to employee records from the main system.
                </CardDescription>
              </div>

              <div className="flex w-full max-w-md items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search employees..."
                    className="h-11 rounded-2xl border-white/10 bg-black/15 pl-10 text-white"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                  {filteredEmployees.length} rows
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {loading ? (
                <div className="col-span-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-400">
                  Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-400">
                  No employees found.
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <button
                    key={employee.user_id}
                    type="button"
                    onClick={() => navigate(`/employees/${employee.user_id}`)}
                    className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-white">
                            {employee.full_name || "Unnamed User"}
                          </div>
                          <Badge className={getRoleBadgeClass(employee.role)}>
                            {employee.role.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusBadgeClass(employee.status)}>
                            {getStatusLabel(employee.status)}
                          </Badge>
                        </div>

                        <div className="text-sm text-white/45">
                          {employee.display_name || "No display name"}
                        </div>
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                        {employee.role === "admin" ? (
                          <Shield className="h-5 w-5" />
                        ) : employee.role === "manager" ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          <User2 className="h-5 w-5" />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </div>
                        <div className="text-sm text-white/80 break-all">
                          {getPrimaryEmail(employee)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <Phone className="h-3.5 w-3.5" />
                          Phone
                        </div>
                        <div className="text-sm text-white/80">
                          {getPrimaryPhone(employee)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <Building2 className="h-3.5 w-3.5" />
                          Company
                        </div>
                        <div className="text-sm text-white/80">
                          {splitMultiValue(employee.company)[0] || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <Briefcase className="h-3.5 w-3.5" />
                          Job Title
                        </div>
                        <div className="text-sm text-white/80">
                          {splitMultiValue(employee.job_title)[0] || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <Users className="h-3.5 w-3.5" />
                          Member Type
                        </div>
                        <div className="text-sm text-white/80">
                          {getMemberTypeLabel(splitMultiValue(employee.member_type)[0] || null)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                          <MapPin className="h-3.5 w-3.5" />
                          Location
                        </div>
                        <div className="text-sm text-white/80">
                          {getLocation(employee)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/8 pt-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Updated
                      </div>
                      <div className="text-sm text-white/60">
                        {formatDateLabel(employee.updated_at)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
