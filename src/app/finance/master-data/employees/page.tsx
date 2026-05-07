import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  Briefcase,
  CalendarDays,
  Clock3,
  Edit3,
  ExternalLink,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
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
type PayProfileStatus = "draft" | "active" | "inactive" | "archived";
type DatabasePayType = "salary" | "hourly" | "contractor";
type PaycheckType = "salary" | "contractor" | "one_time_contractor";
type PaymentFrequency = "weekly" | "biweekly" | "semi_monthly" | "monthly" | "one_time";
type FormMode = "create" | "edit";

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
  pay_type: DatabasePayType;
  payment_frequency: PaymentFrequency;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean;
  status: PayProfileStatus;
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

type HourlyStructure = {
  enabled: boolean;
  hourly_rate: number | null;
  default_hours: number | null;
};

type PayProfileFormState = {
  paycheckType: PaycheckType;
  paySchedule: PaymentFrequency;
  defaultGrossPay: string;
  currencyCode: string;
  startDate: string;
  futureTerminationDate: string;
  hourlyEnabled: boolean;
  hourlyRate: string;
  defaultHours: string;
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

function nullablePositiveNumber(value: string) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : null;
}

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return `${currencyCode} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getHourlyStructure(profile: PayProfileRow | null | undefined): HourlyStructure {
  if (!profile) {
    return {
      enabled: false,
      hourly_rate: null,
      default_hours: null,
    };
  }

  const metadata = isRecord(profile.metadata) ? profile.metadata : {};
  const rawHourly = metadata.hourly_structure;

  if (isRecord(rawHourly)) {
    const enabled = rawHourly.enabled === true;
    const hourlyRate = nullablePositiveNumber(String(rawHourly.hourly_rate ?? ""));
    const defaultHours = nullablePositiveNumber(String(rawHourly.default_hours ?? ""));

    return {
      enabled,
      hourly_rate: hourlyRate,
      default_hours: defaultHours,
    };
  }

  if (profile.pay_type === "hourly" || profile.hourly_rate || profile.default_hours) {
    return {
      enabled: true,
      hourly_rate: nullablePositiveNumber(String(profile.hourly_rate ?? "")),
      default_hours: nullablePositiveNumber(String(profile.default_hours ?? "")),
    };
  }

  return {
    enabled: false,
    hourly_rate: null,
    default_hours: null,
  };
}

function getPaycheckType(profile: PayProfileRow | null | undefined): PaycheckType {
  if (!profile) return "salary";
  if (profile.pay_type === "salary") return "salary";
  if (profile.payment_frequency === "one_time") return "one_time_contractor";
  return "contractor";
}

function getPaycheckTypeLabel(profileOrType: PayProfileRow | PaycheckType | null | undefined) {
  const value = typeof profileOrType === "string" ? profileOrType : getPaycheckType(profileOrType);

  if (value === "one_time_contractor") return "One-Time Contractor";
  return formatLabel(value);
}

function getPrimaryGrossPay(profile: PayProfileRow | null | undefined) {
  if (!profile) return 0;

  if (profile.base_salary) return toNumber(profile.base_salary);
  if (profile.pay_type === "hourly" && profile.hourly_rate && profile.default_hours) {
    return toNumber(profile.hourly_rate) * toNumber(profile.default_hours);
  }

  return 0;
}

function getStatusBadgeClass(status: string) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none";
  }

  if (status === "draft") {
    return "rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 shadow-none";
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
  return "text-sm font-medium text-slate-300";
}

function buildEmployeeName(row: FinanceEmployeeRow | null) {
  if (!row) return "—";
  return row.profile?.full_name || row.profile?.email || `Employee ${row.code}`;
}

function buildPayProfileTitle(profile: PayProfileRow | null | undefined) {
  if (!profile) return "No active pay profile";

  return [
    profile.profile_number || "Pay Profile",
    getPaycheckTypeLabel(profile),
    formatLabel(profile.payment_frequency),
    profile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildDefaultPayProfileForm(currencyCode: string): PayProfileFormState {
  return {
    paycheckType: "salary",
    paySchedule: "monthly",
    defaultGrossPay: "",
    currencyCode,
    startDate: todayDate(),
    futureTerminationDate: "",
    hourlyEnabled: false,
    hourlyRate: "",
    defaultHours: "",
    notes: "",
  };
}

function buildPayProfileFormFromProfile(profile: PayProfileRow): PayProfileFormState {
  const hourlyStructure = getHourlyStructure(profile);

  return {
    paycheckType: getPaycheckType(profile),
    paySchedule: profile.payment_frequency,
    defaultGrossPay: profile.base_salary ? String(profile.base_salary) : String(getPrimaryGrossPay(profile) || ""),
    currencyCode: profile.currency_code,
    startDate: profile.effective_from || todayDate(),
    futureTerminationDate: profile.effective_to || "",
    hourlyEnabled: hourlyStructure.enabled,
    hourlyRate: hourlyStructure.hourly_rate ? String(hourlyStructure.hourly_rate) : "",
    defaultHours: hourlyStructure.default_hours ? String(hourlyStructure.default_hours) : "",
    notes: profile.notes || "",
  };
}

function buildMetadata(
  selected: FinanceEmployeeRow,
  form: PayProfileFormState,
  existingMetadata: Record<string, unknown> | null = null
) {
  return {
    ...(existingMetadata || {}),
    source: "finance_master_data_employees_page",
    ui_model: "global_paycheck_profile_with_optional_hourly_structure",
    paycheck_structure: {
      paycheck_type: form.paycheckType,
      pay_schedule: form.paySchedule,
      default_gross_pay: nullablePositiveNumber(form.defaultGrossPay),
      start_date: form.startDate,
      future_termination_date: form.futureTerminationDate || null,
    },
    hourly_structure: {
      enabled: form.hourlyEnabled,
      hourly_rate: form.hourlyEnabled ? nullablePositiveNumber(form.hourlyRate) : null,
      default_hours: form.hourlyEnabled ? nullablePositiveNumber(form.defaultHours) : null,
    },
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
  };
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
}) {
  const toneMap = {
    cyan: {
      shell:
        "border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))]",
      icon:
        "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      dot: "bg-cyan-300",
      label: "text-cyan-100/75",
    },
    emerald: {
      shell:
        "border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))]",
      icon:
        "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      dot: "bg-emerald-300",
      label: "text-emerald-100/75",
    },
    amber: {
      shell:
        "border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))]",
      icon:
        "border-amber-400/20 bg-amber-500/10 text-amber-200",
      dot: "bg-amber-300",
      label: "text-amber-100/75",
    },
    violet: {
      shell:
        "border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))]",
      icon:
        "border-violet-400/20 bg-violet-500/10 text-violet-200",
      dot: "bg-violet-300",
      label: "text-violet-100/75",
    },
    rose: {
      shell:
        "border-rose-400/15 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))]",
      icon:
        "border-rose-400/20 bg-rose-500/10 text-rose-200",
      dot: "bg-rose-300",
      label: "text-rose-100/75",
    },
  }[tone];

  return (
    <Card
      className={`min-h-[156px] overflow-hidden rounded-[28px] border backdrop-blur-xl ${toneMap.shell}`}
    >
      <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-xs uppercase tracking-[0.18em] ${toneMap.label}`}
            >
              {label}
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-400">Current snapshot</div>
          <div className={`h-2.5 w-2.5 rounded-full ${toneMap.dot}`} />
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
      className={`rounded-[24px] border border-white/10 bg-black/20 p-4 text-white/80 ${className}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 break-words text-sm text-white">{value || "—"}</div>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-2xl border px-4 text-sm font-semibold transition ${
        active
          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
          : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function PayProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: PayProfileRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hourlyStructure = getHourlyStructure(profile);
  const grossPay = getPrimaryGrossPay(profile);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_36%)]" />

      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                {profile.active && profile.status === "active" ? "Active Profile" : formatLabel(profile.status)}
              </Badge>
              <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                {getPaycheckTypeLabel(profile)}
              </Badge>
              <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-violet-200 shadow-none">
                {formatLabel(profile.payment_frequency)}
              </Badge>
              {hourlyStructure.enabled ? (
                <Badge className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-200 shadow-none">
                  Hourly Enabled
                </Badge>
              ) : null}
            </div>

            <div>
              <div className="text-2xl font-semibold tracking-tight text-white">
                {profile.profile_number || "Active Pay Profile"}
              </div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Global paycheck setup for payroll defaults. Hourly structure is separated
                as an optional add-on and does not control the main paycheck amount.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[390px]">
            <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                Default Gross Pay
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {formatMoney(grossPay, profile.currency_code)}
              </div>
              <div className="mt-2 text-xs leading-5 text-emerald-100/65">
                {getPaycheckTypeLabel(profile)} · {formatLabel(profile.payment_frequency)}
              </div>
            </div>

            <div className="rounded-[26px] border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                Hourly Structure
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {hourlyStructure.enabled ? "On" : "Off"}
              </div>
              <div className="mt-2 text-xs leading-5 text-amber-100/65">
                {hourlyStructure.enabled && hourlyStructure.hourly_rate
                  ? `${formatMoney(hourlyStructure.hourly_rate, profile.currency_code)} / hour`
                  : "Optional only"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[26px] border border-cyan-400/15 bg-cyan-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
              Paycheck Model
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              {getPaycheckTypeLabel(profile)}
            </div>
            <div className="mt-1 text-sm text-cyan-100/65">
              {formatLabel(profile.payment_frequency)} · {profile.currency_code}
            </div>
          </div>

          <div className="rounded-[26px] border border-violet-400/15 bg-violet-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
              Start Date
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              {formatDateLabel(profile.effective_from)}
            </div>
            <div className="mt-1 text-sm text-violet-100/65">
              Payroll profile begins here
            </div>
          </div>

          <div className="rounded-[26px] border border-rose-400/15 bg-rose-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200/70">
              Future Termination
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              {profile.effective_to ? formatDateLabel(profile.effective_to) : "Not Planned"}
            </div>
            <div className="mt-1 text-sm text-rose-100/65">
              Optional future payroll stop date
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-white/10 bg-black/25 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Clock3 className="h-4 w-4 text-amber-200" />
                Optional Hourly Structure
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                This is separate from the global paycheck amount. It is used only when
                payroll needs hourly calculation, overtime, or variable-hour requests.
              </p>
            </div>

            <Badge
              className={
                hourlyStructure.enabled
                  ? "w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none"
                  : "w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400 shadow-none"
              }
            >
              {hourlyStructure.enabled ? "Enabled" : "Not Enabled"}
            </Badge>
          </div>

          {hourlyStructure.enabled ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                  Hourly Rate
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {hourlyStructure.hourly_rate
                    ? `${formatMoney(hourlyStructure.hourly_rate, profile.currency_code)} / hour`
                    : "—"}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                  Default Hours Per Pay Period
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {hourlyStructure.default_hours ? String(hourlyStructure.default_hours) : "—"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {profile.notes ? (
          <div className="mt-5 rounded-[26px] border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
            {profile.notes}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-5 text-rose-100 hover:bg-rose-500/15"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function PayProfileForm({
  mode,
  form,
  currencies,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  form: PayProfileFormState;
  currencies: CurrencyRow[];
  saving: boolean;
  onChange: <K extends keyof PayProfileFormState>(
    key: K,
    value: PayProfileFormState[K]
  ) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const paycheckTypes: Array<{ value: PaycheckType; label: string; description: string }> = [
    {
      value: "salary",
      label: "Salary",
      description: "Fixed recurring paycheck amount.",
    },
    {
      value: "contractor",
      label: "Contractor",
      description: "Recurring contractor payment profile.",
    },
    {
      value: "one_time_contractor",
      label: "One-Time",
      description: "Single paycheck or one-time contractor payout.",
    },
  ];

  const schedules: Array<{ value: PaymentFrequency; label: string }> = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Biweekly" },
    { value: "semi_monthly", label: "Semi-Monthly" },
    { value: "monthly", label: "Monthly" },
    { value: "one_time", label: "One-Time" },
  ];

  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border border-cyan-400/15 bg-cyan-500/10">
      <div className="border-b border-white/10 bg-black/20 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">
                {mode === "edit" ? "Edit Pay Profile" : "Create Active Pay Profile"}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
                The global paycheck profile is the default source for payroll and paycheck
                requests. Optional hourly structure is separate and only used when hourly
                calculation is needed.
              </p>
            </div>
          </div>

          <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100 shadow-none">
            Global Paycheck Setup
          </Badge>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex flex-col gap-2">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Global Paycheck Profile
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Main compensation profile used for normal paycheck defaults.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-3">
              <div className="mb-2 text-sm font-medium text-slate-300">
                Paycheck Type
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {paycheckTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange("paycheckType", item.value);
                      if (item.value === "one_time_contractor") {
                        onChange("paySchedule", "one_time");
                      }
                    }}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      form.paycheckType === item.value
                        ? "border-cyan-400/30 bg-cyan-500/15"
                        : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {item.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className={labelClass()}>Pay Schedule</span>
              <select
                value={form.paySchedule}
                onChange={(event) =>
                  onChange("paySchedule", event.target.value as PaymentFrequency)
                }
                className={selectClass()}
              >
                {schedules.map((schedule) => (
                  <option key={schedule.value} value={schedule.value}>
                    {schedule.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Currency</span>
              <select
                value={form.currencyCode}
                onChange={(event) =>
                  onChange("currencyCode", event.target.value.toUpperCase())
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
                    {currency.currency_code} · {currency.currency_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Default Gross Pay</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.defaultGrossPay}
                onChange={(event) => onChange("defaultGrossPay", event.target.value)}
                placeholder="Required"
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Start Date</span>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => onChange("startDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <div className="grid gap-2">
              <span className={labelClass()}>Future Termination Date</span>
              <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-3">
                <label className="group flex h-11 cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white transition hover:border-rose-400/30 hover:bg-black/30">
                  <span className={form.futureTerminationDate ? "text-white" : "text-slate-500"}>
                    {form.futureTerminationDate
                      ? formatDateLabel(form.futureTerminationDate)
                      : "Select termination date"}
                  </span>
                  <CalendarDays className="h-4 w-4 text-rose-200/80 transition group-hover:text-rose-100" />
                  <input
                    type="date"
                    value={form.futureTerminationDate}
                    onChange={(event) =>
                      onChange("futureTerminationDate", event.target.value)
                    }
                    className="sr-only"
                  />
                </label>

                {form.futureTerminationDate ? (
                  <button
                    type="button"
                    onClick={() => onChange("futureTerminationDate", "")}
                    className="mt-2 text-xs font-semibold text-rose-100/80 transition hover:text-rose-100"
                  >
                    Clear termination date
                  </button>
                ) : null}
              </div>
              <span className="text-[11px] leading-4 text-slate-500">
                Optional. Use only when there is a known future payroll stop date.
              </span>
            </div>

            <label className="grid gap-2 xl:col-span-3">
              <span className={labelClass()}>Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes about this pay profile"
                className={textareaClass()}
              />
            </label>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Clock3 className="h-4 w-4 text-amber-200" />
                Optional Hourly Structure
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                Hourly rate is not mandatory. Enable this only when the employee may
                also need hourly calculations, overtime handling, or variable-hour
                paycheck requests.
              </p>
            </div>

            <div className="flex gap-2">
              <ToggleButton
                active={!form.hourlyEnabled}
                label="Not Enabled"
                onClick={() => onChange("hourlyEnabled", false)}
              />
              <ToggleButton
                active={form.hourlyEnabled}
                label="Enabled"
                onClick={() => onChange("hourlyEnabled", true)}
              />
            </div>
          </div>

          {form.hourlyEnabled ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className={labelClass()}>Hourly Rate</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(event) => onChange("hourlyRate", event.target.value)}
                  placeholder="Required when hourly structure is enabled"
                  className={inputClass()}
                />
              </label>

              <label className="grid gap-2">
                <span className={labelClass()}>Default Hours Per Pay Period</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultHours}
                  onChange={(event) => onChange("defaultHours", event.target.value)}
                  placeholder="Optional"
                  className={inputClass()}
                />
              </label>
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">
              Hourly structure is disabled. This profile will use the global paycheck
              amount only.
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 rounded-2xl border-white/10 bg-black/15 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Pay Profile"}
          </Button>
        </div>
      </div>
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
  const [payProfileFormMode, setPayProfileFormMode] = useState<FormMode>("create");
  const [editingPayProfileId, setEditingPayProfileId] = useState<string | null>(null);
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
    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
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
            getPaycheckTypeLabel(profile),
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

    const hourlyEnabled = payProfiles.filter(
      (profile) =>
        profile.active &&
        profile.status === "active" &&
        getHourlyStructure(profile).enabled
    ).length;

    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      activeProfiles,
      hourlyEnabled,
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

  function openCreatePayProfile() {
    const defaultCurrency =
      currencies.find((row) => row.is_base_currency)?.currency_code ||
      currencies[0]?.currency_code ||
      "USD";

    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
    setShowPayProfileForm(true);
    setActionError(null);
    setActionMessage(null);
  }

  function openEditPayProfile(profile: PayProfileRow) {
    setPayProfileFormMode("edit");
    setEditingPayProfileId(profile.id);
    setPayProfileForm(buildPayProfileFormFromProfile(profile));
    setShowPayProfileForm(true);
    setActionError(null);
    setActionMessage(null);
  }

  function closePayProfileForm() {
    const defaultCurrency =
      currencies.find((row) => row.is_base_currency)?.currency_code ||
      currencies[0]?.currency_code ||
      "USD";

    setShowPayProfileForm(false);
    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
  }

  function validatePayProfileForm() {
    if (!selected) return "Select an employee first.";
    if (!currentUserId) return "You must be signed in.";
    if (!payProfileForm.paycheckType) return "Paycheck type is required.";
    if (!payProfileForm.paySchedule) return "Pay schedule is required.";
    if (!payProfileForm.currencyCode.trim()) return "Currency is required.";
    if (!payProfileForm.startDate) return "Start date is required.";

    if (
      payProfileForm.futureTerminationDate &&
      new Date(payProfileForm.futureTerminationDate) < new Date(payProfileForm.startDate)
    ) {
      return "Future termination date must be after the start date.";
    }

    const defaultGrossPay = toNumber(payProfileForm.defaultGrossPay);
    const hourlyRate = toNumber(payProfileForm.hourlyRate);
    const defaultHours = toNumber(payProfileForm.defaultHours);

    if (defaultGrossPay <= 0) {
      return "Default gross pay is required.";
    }

    if (defaultGrossPay < 0 || hourlyRate < 0 || defaultHours < 0) {
      return "Amounts and hours cannot be negative.";
    }

    if (payProfileForm.hourlyEnabled && hourlyRate <= 0) {
      return "Hourly rate is required only when hourly structure is enabled.";
    }

    return null;
  }

  function buildPayProfilePayload() {
    if (!selected || !currentUserId) {
      throw new Error("Missing selected employee or user context.");
    }

    const defaultGrossPay = toNumber(payProfileForm.defaultGrossPay);

    const databasePayType: DatabasePayType =
      payProfileForm.paycheckType === "salary" ? "salary" : "contractor";

    const paymentFrequency: PaymentFrequency =
      payProfileForm.paycheckType === "one_time_contractor"
        ? "one_time"
        : payProfileForm.paySchedule;

    return {
      user_id: selected.user_id,
      pay_type: databasePayType,
      payment_frequency: paymentFrequency,
      base_salary: defaultGrossPay,
      hourly_rate: null,
      default_hours: null,
      currency_code: payProfileForm.currencyCode.trim().toUpperCase(),
      active: true,
      status: "active" as PayProfileStatus,
      effective_from: payProfileForm.startDate,
      effective_to: payProfileForm.futureTerminationDate || null,
      notes: payProfileForm.notes.trim() || null,
      metadata: buildMetadata(selected, payProfileForm, null),
      updated_by: currentUserId,
    };
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

      const currentEditingProfile =
        editingPayProfileId && payProfileFormMode === "edit"
          ? payProfiles.find((profile) => profile.id === editingPayProfileId) || null
          : null;

      const payload = buildPayProfilePayload();

      const finalPayload = {
        ...payload,
        metadata: buildMetadata(
          selected,
          payProfileForm,
          currentEditingProfile?.metadata || null
        ),
      };

      if (payProfileFormMode === "edit" && editingPayProfileId) {
        const updateResult = await supabase
          .from("finance_pay_profiles")
          .update(finalPayload)
          .eq("id", editingPayProfileId)
          .select("id")
          .single();

        if (updateResult.error) throw updateResult.error;

        setActionMessage("Pay profile updated successfully.");
      } else {
        const insertResult = await supabase
          .from("finance_pay_profiles")
          .insert({
            ...finalPayload,
            created_by: currentUserId,
          })
          .select("id")
          .single();

        if (insertResult.error) throw insertResult.error;

        setActionMessage("Pay profile created successfully.");
      }

      closePayProfileForm();
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

  async function deletePayProfile(profile: PayProfileRow) {
    if (!currentUserId) {
      setActionError("You must be signed in.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this pay profile permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    setProfileSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await supabase
        .from("finance_pay_profiles")
        .delete()
        .eq("id", profile.id)
        .select("id")
        .single();

      if (result.error) throw result.error;

      if (editingPayProfileId === profile.id) {
        closePayProfileForm();
      }

      setActionMessage("Pay profile deleted successfully.");
      await loadData();
    } catch (error) {
      console.error("Failed to delete pay profile:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to delete pay profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
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
                    <Badge className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300 shadow-none">
                      Master Data
                    </Badge>
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Employees
                    </Badge>
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                      Payroll Defaults
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                      Employee Pay Profiles
                    </h1>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 md:text-base">
                      Finance employee master data for payroll defaults, global paycheck
                      profiles, and optional hourly structures. Each employee keeps a clear
                      global paycheck setup while hourly calculation remains optional.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                  <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                      Main Structure
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      Global Paycheck Profile
                    </div>
                    <p className="mt-1 text-xs leading-5 text-cyan-100/65">
                      Salary, contractor, or one-time paycheck defaults.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                      Optional Add-On
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      Hourly Structure
                    </div>
                    <p className="mt-1 text-xs leading-5 text-amber-100/65">
                      Enabled only when hourly calculation is needed.
                    </p>
                  </div>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <SummaryTile
                label="Total Employees"
                value={loading ? "—" : stats.total}
                icon={Users}
                tone="cyan"
              />
              <SummaryTile
                label="Active Employees"
                value={loading ? "—" : stats.active}
                icon={User2}
                tone="emerald"
              />
              <SummaryTile
                label="Inactive"
                value={loading ? "—" : stats.inactive}
                icon={Briefcase}
                tone="amber"
              />
              <SummaryTile
                label="Archived"
                value={loading ? "—" : stats.archived}
                icon={Shield}
                tone="rose"
              />
              <SummaryTile
                label="Active Profiles"
                value={loading ? "—" : stats.activeProfiles}
                icon={BadgeDollarSign}
                tone="violet"
              />
              <SummaryTile
                label="Hourly Enabled"
                value={loading ? "—" : stats.hourlyEnabled}
                icon={Clock3}
                tone="amber"
              />
            </div>
          </section>

          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 shadow-none">
                    Finance Reference Registry
                  </Badge>
                  <CardTitle className="text-white">
                    Employee Reference Records
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Search employee references and open each record to manage payroll defaults.
                  </CardDescription>
                </div>

                <div className="flex w-full flex-col gap-3 lg:max-w-[760px] lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search employees, codes, email, job title, pay profile..."
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
                          className={`h-11 rounded-2xl border-white/10 px-4 capitalize text-white ${
                            statusFilter === value
                              ? "bg-cyan-500/15 text-cyan-100"
                              : "bg-black/20 hover:bg-white/[0.06]"
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

                        <CardContent className="p-5">
              <div className="max-h-[720px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {loading ? (
                    <div className="col-span-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-10 text-center text-slate-400">
                      Loading employees...
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <div className="col-span-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-10 text-center text-slate-400">
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
                      const rowHourlyStructure = getHourlyStructure(rowActiveProfile);

                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setSelected(row)}
                          className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-white/15 hover:bg-white/[0.055]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold text-white">
                                  {buildEmployeeName(row)}
                                </div>
                                <Badge className={getStatusBadgeClass(row.status)}>
                                  {formatLabel(row.status)}
                                </Badge>
                                {row.mark ? (
                                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                                    {row.mark}
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="mt-2 text-sm text-slate-500">
                                {row.code}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-300">
                                <Icon className="h-4 w-4" />
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/employees/${row.user_id}`);
                                }}
                                className="h-10 rounded-xl border-white/10 bg-black/20 px-3 text-white hover:bg-white/10"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Source
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-slate-300">
                              {row.profile?.email || "—"}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-slate-300">
                              {row.profile?.job_title || "—"}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-slate-300">
                              {[row.profile?.city, row.profile?.country]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </div>
                          </div>

                          {rowActiveProfile ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-500/10 px-4 py-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                                  Global Paycheck
                                </div>
                                <div className="mt-1 text-sm font-semibold text-white">
                                  {formatMoney(
                                    getPrimaryGrossPay(rowActiveProfile),
                                    rowActiveProfile.currency_code
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-emerald-100/65">
                                  {getPaycheckTypeLabel(rowActiveProfile)} ·{" "}
                                  {formatLabel(rowActiveProfile.payment_frequency)}
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                                  Hourly Structure
                                </div>
                                <div className="mt-1 text-sm font-semibold text-white">
                                  {rowHourlyStructure.enabled ? "Enabled" : "Not Enabled"}
                                </div>
                                <div className="mt-1 text-xs text-amber-100/65">
                                  {rowHourlyStructure.enabled &&
                                  rowHourlyStructure.hourly_rate
                                    ? `${formatMoney(
                                        rowHourlyStructure.hourly_rate,
                                        rowActiveProfile.currency_code
                                      )} / hour`
                                    : "Optional only"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[22px] border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                              No active pay profile found.
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#0b111f] shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 bg-white/[0.035] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                      Employee Pay Profile
                    </Badge>
                    <Badge className={getStatusBadgeClass(selected.status)}>
                      {formatLabel(selected.status)}
                    </Badge>
                  </div>

                  <div className="mt-3 text-2xl font-semibold text-white">
                    {buildEmployeeName(selected)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selected.code} · {selected.profile?.email || "No email"}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelected(null)}
                  className="h-10 rounded-xl border-white/10 bg-black/20 px-3 text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid gap-6">
                <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                          <User2 className="h-4 w-4 text-cyan-200" />
                          Employee Details
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Finance employee reference linked to the source employee record.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => navigate(`/employees/${selected.user_id}`)}
                        className="h-11 rounded-2xl border-white/10 bg-black/20 px-4 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Source Record
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailBlock label="Finance Status" value={formatLabel(selected.status)} />
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
                  </div>
                </section>

                <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                          <WalletCards className="h-4 w-4 text-emerald-200" />
                          Payroll Defaults
                        </div>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                          Manage the employee global paycheck profile and optional hourly
                          structure. The paycheck request flow uses these values as defaults.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={openCreatePayProfile}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/15"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Pay Profile
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    {selectedActivePayProfile ? (
                      <PayProfileCard
                        profile={selectedActivePayProfile}
                        onEdit={() => openEditPayProfile(selectedActivePayProfile)}
                        onDelete={() => void deletePayProfile(selectedActivePayProfile)}
                      />
                    ) : (
                      <div className="rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-5 text-amber-100">
                        <div className="text-sm font-semibold">
                          No active pay profile found for this employee.
                        </div>
                        <p className="mt-2 text-xs leading-5 text-amber-100/75">
                          Create a global paycheck profile. After it is saved, the paycheck
                          request page can automatically pull employee defaults.
                        </p>
                      </div>
                    )}

                    {showPayProfileForm ? (
                      <PayProfileForm
                        mode={payProfileFormMode}
                        form={payProfileForm}
                        currencies={currencies}
                        saving={profileSaving}
                        onChange={updatePayProfileForm}
                        onCancel={closePayProfileForm}
                        onSave={() => void savePayProfile()}
                      />
                    ) : null}

                    {selectedPayProfiles.length > 0 ? (
                      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/20">
                        <div className="border-b border-white/10 px-5 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Pay Profile History
                          </div>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto p-4">
                          <div className="space-y-3">
                            {selectedPayProfiles.map((profile) => {
                              const hourlyStructure = getHourlyStructure(profile);

                              return (
                                <div
                                  key={profile.id}
                                  className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-sm xl:grid-cols-[minmax(0,1fr)_180px_140px_220px]"
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white">
                                      {buildPayProfileTitle(profile)}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      Start {formatDateLabel(profile.effective_from)}
                                      {profile.effective_to
                                        ? ` · Future Termination ${formatDateLabel(
                                            profile.effective_to
                                          )}`
                                        : " · No future termination"}
                                    </div>
                                  </div>

                                  <div className="text-slate-300">
                                    {formatMoney(
                                      getPrimaryGrossPay(profile),
                                      profile.currency_code
                                    )}
                                  </div>

                                  <div>
                                    <Badge className={getStatusBadgeClass(profile.status)}>
                                      {profile.active ? "Active" : formatLabel(profile.status)}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                                    <Badge
                                      className={
                                        hourlyStructure.enabled
                                          ? "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none"
                                          : "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 shadow-none"
                                      }
                                    >
                                      {hourlyStructure.enabled ? "Hourly On" : "Hourly Off"}
                                    </Badge>

                                    <>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => openEditPayProfile(profile)}
                                        disabled={profileSaving}
                                        className="h-8 rounded-xl border-cyan-400/20 bg-cyan-500/10 px-3 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-50"
                                      >
                                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                        Edit
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void deletePayProfile(profile)}
                                        disabled={profileSaving}
                                        className="h-8 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                      >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                        Delete
                                      </Button>
                                    </>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 bg-white/[0.025] px-6 py-5">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/10"
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
