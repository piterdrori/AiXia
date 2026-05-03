import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  Briefcase,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  User2,
  Users,
  WalletCards,
  X,
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

type FilterStatus = "all" | "active" | "inactive" | "archived";

type FinanceEmployeeRow = {
  id: string;
  user_id: string;
  code: string;
  status: "active" | "inactive" | "archived";
  mark: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  profile: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
    company: string | null;
    member_type: string | null;
    job_title: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: "salary" | "hourly" | "contractor";
  payment_frequency: "weekly" | "biweekly" | "semi_monthly" | "monthly" | "one_time";
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean;
  status: "draft" | "active" | "inactive" | "archived";
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type PayProfileFormState = {
  payType: "salary" | "hourly" | "contractor";
  paymentFrequency: "weekly" | "biweekly" | "semi_monthly" | "monthly" | "one_time";
  baseSalary: string;
  hourlyRate: string;
  defaultHours: string;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return `${currencyCode} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusBadgeClass(status: string) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 shadow-none";
}

function getRoleIcon(role: string | null) {
  if (role === "admin") return Shield;
  if (role === "manager") return Users;
  return User2;
}

function inputClass() {
  return "h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:ring-cyan-400/10";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[112px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-white/70";
}

function buildEmployeeName(row: FinanceEmployeeRow | null) {
  if (!row) return "—";
  return row.profile?.full_name || row.profile?.email || `Employee ${row.code}`;
}

function buildPayProfileTitle(profile: PayProfileRow | null | undefined) {
  if (!profile) return "No active pay profile";

  return [
    profile.profile_number || "Pay Profile",
    formatLabel(profile.pay_type),
    formatLabel(profile.payment_frequency),
    profile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildDefaultPayProfileForm(currencyCode: string): PayProfileFormState {
  return {
    payType: "salary",
    paymentFrequency: "monthly",
    baseSalary: "",
    hourlyRate: "",
    defaultHours: "",
    currencyCode,
    effectiveFrom: todayDate(),
    effectiveTo: "",
    notes: "",
  };
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80 ${className}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 break-words text-sm text-white">{value || "—"}</div>
    </div>
  );
}

function PayProfileCard({ profile }: { profile: PayProfileRow }) {
  const primaryAmount =
    profile.pay_type === "salary"
      ? formatMoney(profile.base_salary, profile.currency_code)
      : profile.pay_type === "hourly"
        ? `${formatMoney(profile.hourly_rate, profile.currency_code)} / hour`
        : profile.base_salary
          ? formatMoney(profile.base_salary, profile.currency_code)
          : `${formatMoney(profile.hourly_rate, profile.currency_code)} / hour`;

  return (
    <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-500/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 shadow-none">
              {profile.active && profile.status === "active" ? "Active" : formatLabel(profile.status)}
            </Badge>
            <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
              {formatLabel(profile.pay_type)}
            </Badge>
            <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 shadow-none">
              {formatLabel(profile.payment_frequency)}
            </Badge>
          </div>

          <div className="mt-3 text-lg font-semibold text-white">
            {buildPayProfileTitle(profile)}
          </div>
          <div className="mt-1 text-sm text-white/50">
            Effective {formatDateLabel(profile.effective_from)}
            {profile.effective_to ? ` → ${formatDateLabel(profile.effective_to)}` : ""}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Default Pay
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{primaryAmount}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DetailBlock
          label="Base Salary"
          value={profile.base_salary ? formatMoney(profile.base_salary, profile.currency_code) : "—"}
        />
        <DetailBlock
          label="Hourly Rate"
          value={profile.hourly_rate ? formatMoney(profile.hourly_rate, profile.currency_code) : "—"}
        />
        <DetailBlock
          label="Default Hours"
          value={profile.default_hours ? String(profile.default_hours) : "—"}
        />
      </div>

      {profile.notes ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/70">
          {profile.notes}
        </div>
      ) : null}
    </div>
  );
}

export default function FinanceMasterDataEmployeesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceEmployeeRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<FinanceEmployeeRow | null>(null);
  const [showPayProfileForm, setShowPayProfileForm] = useState(false);
  const [payProfileForm, setPayProfileForm] = useState<PayProfileFormState>(
    buildDefaultPayProfileForm("USD")
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const defaultCurrency =
      currencies.find((row) => row.is_base_currency)?.currency_code ||
      currencies[0]?.currency_code ||
      "USD";

    setPayProfileForm((current) => ({
      ...current,
      currencyCode: current.currencyCode || defaultCurrency,
    }));
  }, [currencies]);

  useEffect(() => {
    if (!selected) return;

    const defaultCurrency =
      currencies.find((row) => row.is_base_currency)?.currency_code ||
      currencies[0]?.currency_code ||
      "USD";

    setShowPayProfileForm(false);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
    setActionError(null);
    setActionMessage(null);
  }, [currencies, selected]);

  async function loadData() {
    setLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);

      const { data: refData, error: refError } = await supabase
        .from("finance_employee_refs")
        .select(
          `
          id,
          user_id,
          code,
          status,
          mark,
          notes,
          metadata,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (refError) throw refError;

      const refs = ((refData || []) as unknown) as Array<{
        id: string;
        user_id: string;
        code: string;
        status: "active" | "inactive" | "archived";
        mark: string | null;
        notes: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;

      const { data: currencyData, error: currencyError } = await supabase
        .from("finance_currencies")
        .select(
          "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
        )
        .eq("status", "active")
        .order("currency_code", { ascending: true });

      if (currencyError) throw currencyError;

      setCurrencies((currencyData || []) as CurrencyRow[]);

      if (refs.length === 0) {
        setRows([]);
        setPayProfiles([]);
        return;
      }

      const userIds = refs.map((row) => row.user_id);

      const [profileResult, payProfileResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
            user_id,
            full_name,
            email,
            role,
            status,
            company,
            member_type,
            job_title,
            phone,
            city,
            country
          `
          )
          .in("user_id", userIds),

        supabase
          .from("finance_pay_profiles")
          .select(
            `
            id,
            profile_number,
            user_id,
            pay_type,
            payment_frequency,
            base_salary,
            hourly_rate,
            default_hours,
            currency_code,
            active,
            status,
            effective_from,
            effective_to,
            notes,
            metadata,
            created_at,
            updated_at
          `
          )
          .in("user_id", userIds)
          .order("effective_from", { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (payProfileResult.error) throw payProfileResult.error;

      const profileMap = new Map(
        ((((profileResult.data || []) as unknown) as NonNullable<
          FinanceEmployeeRow["profile"]
        >[]) || []).map((profile) => [profile.user_id, profile])
      );

      const mergedRows: FinanceEmployeeRow[] = refs.map((ref) => ({
        ...ref,
        profile: profileMap.get(ref.user_id) || null,
      }));

      setRows(mergedRows);
      setPayProfiles(((payProfileResult.data || []) as unknown) as PayProfileRow[]);
    } catch (error) {
      console.error("Failed to load finance employees:", error);
      setRows([]);
      setPayProfiles([]);
      setActionError(
        error instanceof Error ? error.message : "Failed to load finance employees."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedPayProfiles = useMemo(() => {
    if (!selected) return [];

    return payProfiles
      .filter((profile) => profile.user_id === selected.user_id)
      .sort((a, b) => {
        const first = new Date(a.effective_from).getTime();
        const second = new Date(b.effective_from).getTime();
        return second - first;
      });
  }, [payProfiles, selected]);

  const selectedActivePayProfile = useMemo(() => {
    return (
      selectedPayProfiles.find(
        (profile) => profile.active && profile.status === "active"
      ) || null
    );
  }, [selectedPayProfiles]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;

      const employeePayProfiles = payProfiles.filter(
        (profile) => profile.user_id === row.user_id
      );

      const source = [
        row.code,
        row.mark,
        row.status,
        row.profile?.full_name,
        row.profile?.email,
        row.profile?.company,
        row.profile?.job_title,
        ...employeePayProfiles.map((profile) =>
          [
            profile.profile_number,
            profile.pay_type,
            profile.payment_frequency,
            profile.currency_code,
            profile.status,
          ]
            .filter(Boolean)
            .join(" ")
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return source.includes(query);
    });
  }, [payProfiles, rows, search, statusFilter]);

  const stats = useMemo(() => {
    const activeProfiles = payProfiles.filter(
      (profile) => profile.active && profile.status === "active"
    ).length;

    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      activeProfiles,
    };
  }, [payProfiles, rows]);

  function updatePayProfileForm<K extends keyof PayProfileFormState>(
    key: K,
    value: PayProfileFormState[K]
  ) {
    setPayProfileForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validatePayProfileForm() {
    if (!selected) return "Select an employee first.";
    if (!currentUserId) return "You must be signed in.";
    if (!payProfileForm.payType) return "Pay type is required.";
    if (!payProfileForm.paymentFrequency) return "Payment frequency is required.";
    if (!payProfileForm.currencyCode.trim()) return "Currency is required.";
    if (!payProfileForm.effectiveFrom) return "Effective from date is required.";

    if (
      payProfileForm.effectiveTo &&
      new Date(payProfileForm.effectiveTo) < new Date(payProfileForm.effectiveFrom)
    ) {
      return "Effective to date must be after effective from date.";
    }

    const baseSalary = toNumber(payProfileForm.baseSalary);
    const hourlyRate = toNumber(payProfileForm.hourlyRate);
    const defaultHours = toNumber(payProfileForm.defaultHours);

    if (baseSalary < 0 || hourlyRate < 0 || defaultHours < 0) {
      return "Amounts and hours cannot be negative.";
    }

    if (payProfileForm.payType === "salary") {
      if (baseSalary <= 0) return "Salary pay profile requires a base salary.";
    }

    if (payProfileForm.payType === "hourly") {
      if (hourlyRate <= 0) return "Hourly pay profile requires an hourly rate.";
    }

    if (payProfileForm.payType === "contractor") {
      if (baseSalary <= 0 && hourlyRate <= 0) {
        return "Contractor pay profile requires a base salary or hourly rate.";
      }
    }

    return null;
  }

  async function savePayProfile() {
    setProfileSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const validationError = validatePayProfileForm();

      if (validationError) {
        throw new Error(validationError);
      }

      if (!selected || !currentUserId) {
        throw new Error("Missing selected employee or user context.");
      }

      const baseSalary = toNumber(payProfileForm.baseSalary);
      const hourlyRate = toNumber(payProfileForm.hourlyRate);
      const defaultHours = toNumber(payProfileForm.defaultHours);

      const payload = {
        user_id: selected.user_id,
        pay_type: payProfileForm.payType,
        payment_frequency: payProfileForm.paymentFrequency,
        base_salary:
          payProfileForm.payType === "salary"
            ? baseSalary
            : payProfileForm.payType === "contractor" && baseSalary > 0
              ? baseSalary
              : null,
        hourly_rate:
          payProfileForm.payType === "hourly"
            ? hourlyRate
            : payProfileForm.payType === "contractor" && hourlyRate > 0
              ? hourlyRate
              : null,
        default_hours:
          payProfileForm.payType === "salary" || defaultHours <= 0
            ? null
            : defaultHours,
        currency_code: payProfileForm.currencyCode.trim().toUpperCase(),
        active: true,
        status: "active",
        effective_from: payProfileForm.effectiveFrom,
        effective_to: payProfileForm.effectiveTo || null,
        notes: payProfileForm.notes.trim() || null,
        metadata: {
          source: "finance_master_data_employees_page",
          employee_snapshot: {
            employee_ref_id: selected.id,
            employee_user_id: selected.user_id,
            employee_code: selected.code,
            employee_mark: selected.mark,
            employee_name: buildEmployeeName(selected),
            employee_email: selected.profile?.email || null,
            employee_job_title: selected.profile?.job_title || null,
            employee_company: selected.profile?.company || null,
          },
        },
        created_by: currentUserId,
        updated_by: currentUserId,
      };

      const insertResult = await supabase
        .from("finance_pay_profiles")
        .insert(payload)
        .select("id")
        .single();

      if (insertResult.error) throw insertResult.error;

      setActionMessage("Pay profile created successfully.");
      setShowPayProfileForm(false);

      const defaultCurrency =
        currencies.find((row) => row.is_base_currency)?.currency_code ||
        currencies[0]?.currency_code ||
        "USD";

      setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));

      await loadData();
    } catch (error) {
      console.error("Failed to save pay profile:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to save pay profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative">
              <button
                type="button"
                onClick={() => navigate("/finance/master-data")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Master Data
              </button>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70 shadow-none">
                      Master Data
                    </Badge>
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Finance Employees
                    </Badge>
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                      Pay Profiles
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                      Employees
                    </h1>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55 md:text-base">
                      Finance reference view of employee records. Create the employee pay
                      profile here so paycheck requests can automatically pull salary,
                      frequency, currency, and gross pay defaults.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 xl:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => void loadData()}
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {actionError ? (
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
              {actionError}
            </div>
          ) : null}

          {actionMessage ? (
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
              {actionMessage}
            </div>
          ) : null}

          <section>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryTile
                label="Total Employees"
                value={loading ? "—" : stats.total}
                icon={Users}
              />
              <SummaryTile
                label="Active"
                value={loading ? "—" : stats.active}
                icon={User2}
              />
              <SummaryTile
                label="Inactive"
                value={loading ? "—" : stats.inactive}
                icon={Briefcase}
              />
              <SummaryTile
                label="Archived"
                value={loading ? "—" : stats.archived}
                icon={Shield}
              />
              <SummaryTile
                label="Active Pay Profiles"
                value={loading ? "—" : stats.activeProfiles}
                icon={BadgeDollarSign}
              />
            </div>
          </section>

          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                    Finance Reference Registry
                  </Badge>
                  <CardTitle className="text-white">
                    Employee Reference Records
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Search, filter, inspect, and manage employee pay profiles.
                  </CardDescription>
                </div>

                <div className="flex w-full flex-col gap-3 lg:max-w-[760px] lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search employees, codes, marks, pay profiles..."
                      className={`${inputClass()} pl-10`}
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(["all", "active", "inactive", "archived"] as FilterStatus[]).map(
                      (value) => (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          onClick={() => setStatusFilter(value)}
                          className={`h-11 rounded-2xl border-white/10 px-4 text-white ${
                            statusFilter === value
                              ? "bg-white/10"
                              : "bg-black/15 hover:bg-white/10"
                          }`}
                        >
                          {value}
                        </Button>
                      )
                    )}
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
                ) : filteredRows.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-400">
                    No finance employee references found.
                  </div>
                ) : (
                  filteredRows.map((row) => {
                    const Icon = getRoleIcon(row.profile?.role || null);
                    const rowActiveProfile =
                      payProfiles.find(
                        (profile) =>
                          profile.user_id === row.user_id &&
                          profile.active &&
                          profile.status === "active"
                      ) || null;

                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-white">
                                {buildEmployeeName(row)}
                              </div>
                              <Badge className={getStatusBadgeClass(row.status)}>
                                {row.status}
                              </Badge>
                              {row.mark ? (
                                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                                  {row.mark}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-2 text-sm text-white/45">{row.code}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-white/70">
                              <Icon className="h-4 w-4" />
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/employees/${row.user_id}`);
                              }}
                              className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Source
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">
                            {row.profile?.email || "—"}
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">
                            {row.profile?.job_title || "—"}
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">
                            {[row.profile?.city, row.profile?.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                          {rowActiveProfile
                            ? `Pay Profile: ${buildPayProfileTitle(rowActiveProfile)}`
                            : "No active pay profile found"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1726] shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <div className="text-xl font-semibold text-white">
                  {buildEmployeeName(selected)}
                </div>
                <div className="mt-1 text-sm text-white/45">
                  {selected.code} · {selected.profile?.email || "No email"}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid gap-6">
                <section className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
                        Employee Details
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/40">
                        Finance employee reference linked to the source employee record.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => navigate(`/employees/${selected.user_id}`)}
                      className="h-11 rounded-2xl border-white/10 bg-black/15 px-4 text-white hover:bg-white/10"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Source Record
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailBlock label="Finance Status" value={selected.status} />
                    <DetailBlock label="Finance Mark" value={selected.mark || "—"} />
                    <DetailBlock label="Role" value={selected.profile?.role || "—"} />
                    <DetailBlock
                      label="Source Status"
                      value={selected.profile?.status || "—"}
                    />
                    <DetailBlock label="Email" value={selected.profile?.email || "—"} />
                    <DetailBlock label="Phone" value={selected.profile?.phone || "—"} />
                    <DetailBlock
                      label="Company"
                      value={selected.profile?.company || "—"}
                    />
                    <DetailBlock
                      label="Job Title"
                      value={selected.profile?.job_title || "—"}
                    />
                    <DetailBlock
                      label="Member Type"
                      value={selected.profile?.member_type || "—"}
                    />
                    <DetailBlock
                      label="Location"
                      value={
                        [selected.profile?.city, selected.profile?.country]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }
                    />
                    <DetailBlock
                      label="Notes"
                      value={selected.notes || "—"}
                      className="md:col-span-2"
                    />
                    <DetailBlock
                      label="Updated"
                      value={formatDateLabel(selected.updated_at)}
                      className="md:col-span-2"
                    />
                  </div>
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                  <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
                        <WalletCards className="h-4 w-4 text-emerald-200" />
                        Pay Profile
                      </div>
                      <p className="mt-1 max-w-3xl text-xs leading-5 text-white/40">
                        This is the source used by the paycheck request page to fill pay
                        type, payment frequency, profile currency, and default gross amount.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPayProfileForm((current) => !current)}
                      className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/15"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {showPayProfileForm ? "Close Form" : "Create Pay Profile"}
                    </Button>
                  </div>

                  {selectedActivePayProfile ? (
                    <PayProfileCard profile={selectedActivePayProfile} />
                  ) : (
                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
                      <div className="text-sm font-semibold">
                        No active pay profile found for this employee.
                      </div>
                      <p className="mt-2 text-xs leading-5 text-amber-100/75">
                        Create a pay profile here. After it is saved, the new paycheck
                        request page will automatically pull it for this employee.
                      </p>
                    </div>
                  )}

                  {selectedPayProfiles.length > 0 ? (
                    <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                        Pay Profile History
                      </div>

                      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                        {selectedPayProfiles.map((profile) => (
                          <div
                            key={profile.id}
                            className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm md:grid-cols-[minmax(0,1fr)_160px_130px]"
                          >
                            <div>
                              <div className="font-semibold text-white">
                                {buildPayProfileTitle(profile)}
                              </div>
                              <div className="mt-1 text-xs text-white/45">
                                Effective {formatDateLabel(profile.effective_from)}
                                {profile.effective_to
                                  ? ` → ${formatDateLabel(profile.effective_to)}`
                                  : ""}
                              </div>
                            </div>

                            <div className="text-white/70">
                              {profile.pay_type === "salary"
                                ? formatMoney(profile.base_salary, profile.currency_code)
                                : profile.hourly_rate
                                  ? `${formatMoney(profile.hourly_rate, profile.currency_code)} / hour`
                                  : formatMoney(profile.base_salary, profile.currency_code)}
                            </div>

                            <div>
                              <Badge className={getStatusBadgeClass(profile.status)}>
                                {profile.active ? "active" : profile.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {showPayProfileForm ? (
                    <div className="mt-5 rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-5">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                          <BadgeDollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Create Active Pay Profile
                          </div>
                          <p className="mt-1 text-xs leading-5 text-white/45">
                            Save salary, hourly, or contractor defaults for this employee.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="grid gap-2">
                          <span className={labelClass()}>Pay Type</span>
                          <select
                            value={payProfileForm.payType}
                            onChange={(event) =>
                              updatePayProfileForm(
                                "payType",
                                event.target.value as PayProfileFormState["payType"]
                              )
                            }
                            className={selectClass()}
                          >
                            <option value="salary">Salary</option>
                            <option value="hourly">Hourly</option>
                            <option value="contractor">Contractor</option>
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Payment Frequency</span>
                          <select
                            value={payProfileForm.paymentFrequency}
                            onChange={(event) =>
                              updatePayProfileForm(
                                "paymentFrequency",
                                event.target
                                  .value as PayProfileFormState["paymentFrequency"]
                              )
                            }
                            className={selectClass()}
                          >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Biweekly</option>
                            <option value="semi_monthly">Semi Monthly</option>
                            <option value="monthly">Monthly</option>
                            <option value="one_time">One Time</option>
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Currency</span>
                          <select
                            value={payProfileForm.currencyCode}
                            onChange={(event) =>
                              updatePayProfileForm(
                                "currencyCode",
                                event.target.value.toUpperCase()
                              )
                            }
                            className={selectClass()}
                          >
                            {(currencies.length > 0
                              ? currencies
                              : [
                                  {
                                    id: "USD",
                                    currency_code: "USD",
                                    currency_name: "US Dollar",
                                    currency_symbol: "$",
                                    decimal_places: 2,
                                    is_base_currency: true,
                                    status: "active",
                                  },
                                ]
                            ).map((currency) => (
                              <option key={currency.id} value={currency.currency_code}>
                                {currency.currency_code}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Effective From</span>
                          <Input
                            type="date"
                            value={payProfileForm.effectiveFrom}
                            onChange={(event) =>
                              updatePayProfileForm("effectiveFrom", event.target.value)
                            }
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Base Salary</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payProfileForm.baseSalary}
                            onChange={(event) =>
                              updatePayProfileForm("baseSalary", event.target.value)
                            }
                            placeholder="Required for salary"
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Hourly Rate</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payProfileForm.hourlyRate}
                            onChange={(event) =>
                              updatePayProfileForm("hourlyRate", event.target.value)
                            }
                            placeholder="Required for hourly"
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Default Hours</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payProfileForm.defaultHours}
                            onChange={(event) =>
                              updatePayProfileForm("defaultHours", event.target.value)
                            }
                            placeholder="Optional"
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className={labelClass()}>Effective To</span>
                          <Input
                            type="date"
                            value={payProfileForm.effectiveTo}
                            onChange={(event) =>
                              updatePayProfileForm("effectiveTo", event.target.value)
                            }
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-2 md:col-span-2 xl:col-span-4">
                          <span className={labelClass()}>Notes</span>
                          <textarea
                            value={payProfileForm.notes}
                            onChange={(event) =>
                              updatePayProfileForm("notes", event.target.value)
                            }
                            placeholder="Optional internal notes about this pay profile"
                            className={textareaClass()}
                          />
                        </label>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPayProfileForm(false)}
                          className="h-11 rounded-2xl border-white/10 bg-black/15 px-4 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          onClick={() => void savePayProfile()}
                          disabled={profileSaving}
                          className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {profileSaving ? "Saving..." : "Save Pay Profile"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-5">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
