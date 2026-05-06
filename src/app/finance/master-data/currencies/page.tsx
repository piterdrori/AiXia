import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Coins,
  Database,
  Globe2,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  type LiveConversionResult,
  convertCurrencyLive,
} from "@/lib/integrations/frankfurter";
import {
  archiveCurrency,
  archiveExchangeRate,
  createCurrency,
  createExchangeRate,
  getArchivedCurrencies,
  getCurrencies,
  getExchangeRates,
  permanentlyDeleteCurrency,
  permanentlyDeleteExchangeRate,
  restoreCurrency,
  restoreExchangeRate,
  updateCurrency,
  updateExchangeRate,
  type CurrencyUpsertInput,
  type ExchangeRateUpsertInput,
  type FinanceCurrencyRow,
  type FinanceExchangeRateRow,
  type FinanceRecordStatus,
} from "@/lib/finance/currencies";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type CurrencyFormState = {
  preset_key: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  decimal_places: string;
  is_base_currency: boolean;
  status: FinanceRecordStatus;
  notes: string;
};

type ExchangeRateFormState = {
  from_currency_code: string;
  to_currency_code: string;
  effective_date: string;
  status: FinanceRecordStatus;
  notes: string;
};

type CurrencyPreset = {
  code: string;
  name: string;
  symbol: string;
  decimal_places: string;
  region: string;
};

type MetricCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type SortKey =
  | "code"
  | "name"
  | "symbol"
  | "decimals"
  | "base"
  | "status"
  | "updated";

type SortDirection = "asc" | "desc";

const CUSTOM_CURRENCY_KEY = "__custom__";

const EMPTY_CURRENCY_FORM: CurrencyFormState = {
  preset_key: "",
  currency_code: "",
  currency_name: "",
  currency_symbol: "",
  decimal_places: "2",
  is_base_currency: false,
  status: "active",
  notes: "",
};

const EMPTY_RATE_FORM: ExchangeRateFormState = {
  from_currency_code: "",
  to_currency_code: "",
  effective_date: new Date().toISOString().slice(0, 10),
  status: "active",
  notes: "",
};

const MAJOR_CURRENCY_PRESETS: CurrencyPreset[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimal_places: "2",
    region: "North America",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "GBP",
    name: "British Pound Sterling",
    symbol: "£",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    decimal_places: "0",
    region: "Asia",
  },
  {
    code: "ILS",
    name: "Israeli New Shekel",
    symbol: "₪",
    decimal_places: "2",
    region: "Middle East",
  },
  {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    decimal_places: "2",
    region: "Oceania",
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    decimal_places: "2",
    region: "North America",
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    decimal_places: "2",
    region: "Oceania",
  },
  {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    decimal_places: "0",
    region: "Asia",
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    decimal_places: "0",
    region: "Asia",
  },
  {
    code: "TWD",
    name: "New Taiwan Dollar",
    symbol: "NT$",
    decimal_places: "2",
    region: "Asia",
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    decimal_places: "2",
    region: "Middle East",
  },
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    decimal_places: "2",
    region: "Middle East",
  },
  {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "ر.ق",
    decimal_places: "2",
    region: "Middle East",
  },
  {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    decimal_places: "2",
    region: "Middle East / Europe",
  },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    decimal_places: "2",
    region: "Africa",
  },
  {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    decimal_places: "2",
    region: "Africa",
  },
  {
    code: "MAD",
    name: "Moroccan Dirham",
    symbol: "د.م.",
    decimal_places: "2",
    region: "Africa",
  },
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "Mex$",
    decimal_places: "2",
    region: "North America",
  },
  {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    decimal_places: "2",
    region: "South America",
  },
  {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "$",
    decimal_places: "2",
    region: "South America",
  },
  {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "CLP$",
    decimal_places: "0",
    region: "South America",
  },
  {
    code: "COP",
    name: "Colombian Peso",
    symbol: "COL$",
    decimal_places: "2",
    region: "South America",
  },
  {
    code: "PLN",
    name: "Polish Zloty",
    symbol: "zł",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    decimal_places: "2",
    region: "Europe",
  },
  {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    decimal_places: "2",
    region: "Europe / Asia",
  },
];

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

function formatNumberLabel(value: number | string, maximumFractionDigits = 6) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) return "—";

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function getStatusLabel(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string | null | undefined) {
  if (status === "archived") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }

  if (status === "inactive") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
}

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

function normalizeCurrencySymbol(value: string) {
  return value.trim().slice(0, 8);
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getCurrencyOptionLabel(row: FinanceCurrencyRow) {
  return `${row.currency_code} — ${row.currency_name}`;
}

function getPresetSelectLabel(preset: CurrencyPreset) {
  return `${preset.code} — ${preset.name}`;
}

function getToneClasses(tone: MetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        value: "text-emerald-100",
        dot: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        value: "text-amber-100",
        dot: "bg-amber-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
        dot: "bg-violet-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
        dot: "bg-rose-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        value: "text-cyan-100",
        dot: "bg-cyan-400",
      };
  }
}

function MetricCardBlock({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon;
  const tone = getToneClasses(metric.tone);

  return (
    <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {metric.title}
            </div>
            <div
              className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${tone.value}`}
            >
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
            {metric.subtitle}
          </div>
          <div className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusClass(
        value
      )}`}
    >
      <span className="truncate">{getStatusLabel(value)}</span>
    </span>
  );
}

function BaseBadge({ isBase }: { isBase: boolean }) {
  if (!isBase) {
    return <span className="text-sm text-slate-600">—</span>;
  }

  return (
    <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
      Base
    </span>
  );
}

function SectionCard({
  title,
  badge,
  description,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {badge}
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div>{children}</div>
    </section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`h-11 w-full rounded-2xl border border-white/10 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        readOnly
          ? "bg-black/30 text-slate-400"
          : "bg-black/20 focus:bg-black/30"
      }`}
    />
  );
}

function SelectField({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 pl-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
      />
    </label>
  );
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
      {required ? <span className="ml-1 text-rose-300">*</span> : null}
    </label>
  );
}

function SortButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onClick: (sortKey: SortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`inline-flex items-center gap-1 transition hover:text-cyan-200 ${
        isActive ? "text-cyan-200" : "text-slate-500"
      }`}
    >
      {label}
      {isActive ? <span>{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-500">
        <Icon className="h-6 w-6" />
      </div>

      <div className="mt-4 text-sm font-semibold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
      {message}
    </div>
  );
}

function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1726] shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xl font-semibold tracking-[-0.025em] text-white">
              {title}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-5">
          {footer}
        </div>
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <SectionCard
      title="Rates / Currency Access Locked"
      badge="Access"
      description="The logged-in user does not have permission to view this master-data module."
      icon={LockKeyhole}
    >
      <div className="p-5">
        <EmptyState
          icon={LockKeyhole}
          title="No currency master-data access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance view and Master Data access."
        />
      </div>
    </SectionCard>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  tone = "cyan",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "cyan" | "rose" | "emerald" | "neutral";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
        : tone === "neutral"
          ? "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
          : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function getCurrencyPairLabel(
  currencies: FinanceCurrencyRow[],
  fromCurrencyCode: string,
  toCurrencyCode: string
) {
  const from = currencies.find((row) => row.currency_code === fromCurrencyCode);
  const to = currencies.find((row) => row.currency_code === toCurrencyCode);

  if (!from || !to) {
    return `${fromCurrencyCode || "From"} → ${toCurrencyCode || "To"}`;
  }

  return `${from.currency_code} → ${to.currency_code}`;
}

export default function FinanceMasterDataCurrenciesPage() {
  const navigate = useNavigate();

  const [currencies, setCurrencies] = useState<FinanceCurrencyRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<FinanceExchangeRateRow[]>(
    []
  );
  const [archivedCurrencies, setArchivedCurrencies] = useState<
    FinanceCurrencyRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);

  const [editingCurrency, setEditingCurrency] =
    useState<FinanceCurrencyRow | null>(null);
  const [editingRate, setEditingRate] =
    useState<FinanceExchangeRateRow | null>(null);

  const [currencyForm, setCurrencyForm] =
    useState<CurrencyFormState>(EMPTY_CURRENCY_FORM);
  const [rateForm, setRateForm] =
    useState<ExchangeRateFormState>(EMPTY_RATE_FORM);

  const [currencyError, setCurrencyError] = useState("");
  const [rateError, setRateError] = useState("");
  const [autoRate, setAutoRate] = useState<LiveConversionResult | null>(null);
  const [autoRateLoading, setAutoRateLoading] = useState(false);
  const [autoRateError, setAutoRateError] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");
  const [rateSearch, setRateSearch] = useState("");

  const [currencySortKey, setCurrencySortKey] = useState<SortKey>("updated");
  const [currencySortDirection, setCurrencySortDirection] =
    useState<SortDirection>("desc");

  const [convertAmount, setConvertAmount] = useState("1");
  const [convertFrom, setConvertFrom] = useState("USD");
  const [convertTo, setConvertTo] = useState("CNY");
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] =
    useState<LiveConversionResult | null>(null);

  const loadPage = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
        setPageError("");
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, permissions")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile) {
            const typedProfile = profile as ProfilePermissionRow;
            setRole(typedProfile.role);
            setPermissionOverrides(typedProfile.permissions || null);
          }
        }

        const [currencyRows, exchangeRateRows] = await Promise.all([
          getCurrencies(),
          getExchangeRates(),
        ]);

        setCurrencies(currencyRows);
        setExchangeRates(exchangeRateRows);

        const activeRows = currencyRows.filter((row) => row.status === "active");
        const baseRow =
          activeRows.find((row) => row.is_base_currency) ?? activeRows[0];
        const secondRow =
          activeRows.find(
            (row) => row.currency_code !== baseRow?.currency_code
          ) ??
          activeRows[1] ??
          activeRows[0];

        if (baseRow?.currency_code && mode === "initial") {
          setConvertFrom(baseRow.currency_code);
        }

        if (secondRow?.currency_code && mode === "initial") {
          setConvertTo(secondRow.currency_code);
        }
      } catch (error) {
        console.error("Failed to load currencies page:", error);

        if (mode === "initial") {
          setCurrencies([]);
          setExchangeRates([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load currencies page."
          );
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        }
      }
    },
    []
  );

  const loadArchived = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setArchiveLoading(true);
      }

      try {
        const rows = await getArchivedCurrencies();
        setArchivedCurrencies(rows);
      } catch (error) {
        console.error("Failed to load archived currencies:", error);

        if (mode === "initial") {
          setArchivedCurrencies([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load archived currencies."
          );
        }
      } finally {
        if (mode === "initial") {
          setArchiveLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-currencies-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => {
          void loadPage("silent");
          if (archiveDialogOpen) void loadArchived("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_exchange_rates" },
        () => void loadPage("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
      if (archiveDialogOpen) void loadArchived("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [archiveDialogOpen, loadArchived, loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canView =
    !!permissions?.accessFinance &&
    (!!permissions?.viewFinance || !!permissions?.manageFinanceMasterData);

  const canCreate =
    !!permissions?.manageFinanceMasterData || !!permissions?.createFinanceRecords;
  const canEdit =
    !!permissions?.manageFinanceMasterData || !!permissions?.editFinanceRecords;
  const canArchive =
    !!permissions?.manageFinanceMasterData || !!permissions?.archiveFinanceRecords;

  const activeCurrencies = useMemo(
    () => currencies.filter((row) => row.status === "active"),
    [currencies]
  );

  const visibleCurrencies = useMemo(
    () => currencies.filter((row) => row.status !== "archived"),
    [currencies]
  );

  const visibleExchangeRates = useMemo(
    () => exchangeRates.filter((row) => row.status !== "archived"),
    [exchangeRates]
  );

  const baseCurrency = useMemo(
    () => currencies.find((row) => row.is_base_currency) ?? null,
    [currencies]
  );

  const latestStoredRate = useMemo(
    () => exchangeRates.find((row) => row.status === "active") ?? null,
    [exchangeRates]
  );

  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase();

    return visibleCurrencies
      .filter((row) => {
        if (!query) return true;

        return [
          row.currency_code,
          row.currency_name,
          row.currency_symbol,
          row.status,
          row.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (currencySortKey === "code") {
          comparison = compareStrings(first.currency_code, second.currency_code);
        }

        if (currencySortKey === "name") {
          comparison = compareStrings(first.currency_name, second.currency_name);
        }

        if (currencySortKey === "symbol") {
          comparison = compareStrings(
            first.currency_symbol,
            second.currency_symbol
          );
        }

        if (currencySortKey === "decimals") {
          comparison = first.decimal_places - second.decimal_places;
        }

        if (currencySortKey === "base") {
          comparison =
            Number(first.is_base_currency) - Number(second.is_base_currency);
        }

        if (currencySortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (currencySortKey === "updated") {
          comparison = compareDates(first.updated_at, second.updated_at);
        }

        return currencySortDirection === "asc" ? comparison : -comparison;
      });
  }, [currencySearch, currencySortDirection, currencySortKey, visibleCurrencies]);

  const filteredExchangeRates = useMemo(() => {
    const query = rateSearch.trim().toLowerCase();

    return visibleExchangeRates.filter((row) => {
      if (!query) return true;

      return [
        row.from_currency_code,
        row.to_currency_code,
        row.exchange_rate,
        row.effective_date,
        row.status,
        row.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rateSearch, visibleExchangeRates]);

  const filteredArchivedCurrencies = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedCurrencies.filter((row) => {
      if (!query) return true;

      return [
        row.currency_code,
        row.currency_name,
        row.currency_symbol,
        row.status,
        row.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedCurrencies]);

  const metricCards = useMemo<MetricCard[]>(
    () => [
      {
        title: "Active Currencies",
        value: loading ? "—" : activeCurrencies.length.toLocaleString(),
        subtitle: "Available for finance operations.",
        icon: Coins,
        tone: "cyan",
      },
      {
        title: "Base Currency",
        value: loading ? "—" : baseCurrency?.currency_code ?? "—",
        subtitle: baseCurrency?.currency_name ?? "No base currency set.",
        icon: Landmark,
        tone: "emerald",
      },
      {
        title: "Stored Rates",
        value: loading ? "—" : visibleExchangeRates.length.toLocaleString(),
        subtitle: latestStoredRate
          ? `${latestStoredRate.from_currency_code}/${
              latestStoredRate.to_currency_code
            } • ${formatDateLabel(latestStoredRate.effective_date)}`
          : "No stored rate found.",
        icon: Database,
        tone: "violet",
      },
    ],
    [
      activeCurrencies.length,
      baseCurrency?.currency_code,
      baseCurrency?.currency_name,
      latestStoredRate,
      loading,
      visibleExchangeRates.length,
    ]
  );

  const canUseConverter =
    activeCurrencies.length >= 2 &&
    Boolean(convertFrom) &&
    Boolean(convertTo) &&
    convertFrom !== convertTo;

  const canAutoCalculateRate =
    Boolean(rateForm.from_currency_code) &&
    Boolean(rateForm.to_currency_code) &&
    rateForm.from_currency_code !== rateForm.to_currency_code;

  function toggleCurrencySort(nextKey: SortKey) {
    setCurrencySortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setCurrencySortDirection("asc");
        return nextKey;
      }

      setCurrencySortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return currentKey;
    });
  }

  function openCreateCurrencyDialog() {
    setEditingCurrency(null);
    setCurrencyForm(EMPTY_CURRENCY_FORM);
    setCurrencyError("");
    setCurrencyDialogOpen(true);
  }

  function openEditCurrencyDialog(row: FinanceCurrencyRow) {
    setEditingCurrency(row);
    setCurrencyForm({
      preset_key: CUSTOM_CURRENCY_KEY,
      currency_code: row.currency_code,
      currency_name: row.currency_name,
      currency_symbol: row.currency_symbol ?? "",
      decimal_places: String(row.decimal_places),
      is_base_currency: row.is_base_currency,
      status: row.status,
      notes: row.notes ?? "",
    });
    setCurrencyError("");
    setCurrencyDialogOpen(true);
  }

  function handleCurrencyPresetChange(value: string) {
    if (value === CUSTOM_CURRENCY_KEY) {
      setCurrencyForm((previous) => ({
        ...previous,
        preset_key: CUSTOM_CURRENCY_KEY,
      }));
      return;
    }

    const preset = MAJOR_CURRENCY_PRESETS.find((item) => item.code === value);

    if (!preset) {
      setCurrencyForm(EMPTY_CURRENCY_FORM);
      return;
    }

    setCurrencyForm((previous) => ({
      ...previous,
      preset_key: preset.code,
      currency_code: preset.code,
      currency_name: preset.name,
      currency_symbol: preset.symbol,
      decimal_places: preset.decimal_places,
    }));
  }

  function handleCustomCurrencyCodeChange(value: string) {
    setCurrencyForm((previous) => ({
      ...previous,
      currency_code: normalizeCurrencyCode(value),
      preset_key: CUSTOM_CURRENCY_KEY,
    }));
  }

  function handleCustomCurrencyNameChange(value: string) {
    setCurrencyForm((previous) => ({
      ...previous,
      currency_name: value,
      preset_key: CUSTOM_CURRENCY_KEY,
    }));
  }

  function handleCustomCurrencySymbolChange(value: string) {
    setCurrencyForm((previous) => ({
      ...previous,
      currency_symbol: normalizeCurrencySymbol(value),
      preset_key: CUSTOM_CURRENCY_KEY,
    }));
  }

  async function calculateRateForForm(
    fromCurrencyCode: string,
    toCurrencyCode: string
  ) {
    if (!fromCurrencyCode || !toCurrencyCode || fromCurrencyCode === toCurrencyCode) {
      setAutoRate(null);
      setAutoRateError("");
      return;
    }

    try {
      setAutoRateLoading(true);
      setAutoRateError("");
      const result = await convertCurrencyLive(1, fromCurrencyCode, toCurrencyCode);
      setAutoRate(result);
    } catch (error) {
      console.error("Failed to calculate exchange rate:", error);
      setAutoRate(null);
      setAutoRateError(
        error instanceof Error
          ? error.message
          : "Failed to calculate live exchange rate."
      );
    } finally {
      setAutoRateLoading(false);
    }
  }

  function openCreateRateDialog() {
    const defaultFrom = activeCurrencies[0]?.currency_code ?? "";
    const defaultTo =
      activeCurrencies.find((row) => row.currency_code !== defaultFrom)
        ?.currency_code ?? "";

    setEditingRate(null);
    setRateForm({
      ...EMPTY_RATE_FORM,
      from_currency_code: defaultFrom,
      to_currency_code: defaultTo,
    });
    setAutoRate(null);
    setAutoRateError("");
    setRateError("");
    setRateDialogOpen(true);

    if (defaultFrom && defaultTo && defaultFrom !== defaultTo) {
      void calculateRateForForm(defaultFrom, defaultTo);
    }
  }

  function openEditRateDialog(row: FinanceExchangeRateRow) {
    setEditingRate(row);
    setRateForm({
      from_currency_code: row.from_currency_code,
      to_currency_code: row.to_currency_code,
      effective_date: row.effective_date,
      status: row.status,
      notes: row.notes ?? "",
    });
    setAutoRate({
      amount: 1,
      from: row.from_currency_code,
      to: row.to_currency_code,
      convertedAmount: Number(row.exchange_rate),
      rate: Number(row.exchange_rate),
      date: row.effective_date,
    });
    setAutoRateError("");
    setRateError("");
    setRateDialogOpen(true);
  }

  function handleRateFromChange(value: string) {
    setRateForm((previous) => ({
      ...previous,
      from_currency_code: value,
    }));
    void calculateRateForForm(value, rateForm.to_currency_code);
  }

  function handleRateToChange(value: string) {
    setRateForm((previous) => ({
      ...previous,
      to_currency_code: value,
    }));
    void calculateRateForForm(rateForm.from_currency_code, value);
  }

  async function handleSaveCurrency() {
    if (!(editingCurrency ? canEdit : canCreate)) return;

    const currencyCode = currencyForm.currency_code.trim().toUpperCase();
    const currencyName = currencyForm.currency_name.trim();
    const currencySymbol = currencyForm.currency_symbol.trim();
    const decimalPlaces = Number(currencyForm.decimal_places);

    if (!currencyCode || !currencyName) {
      setCurrencyError(
        "Currency is required. Select a preset or enter a manual currency."
      );
      return;
    }

    if (currencyCode.length !== 3) {
      setCurrencyError("Currency code must be 3 letters.");
      return;
    }

    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
      setCurrencyError("Decimal places must be a whole number 0 or greater.");
      return;
    }

    try {
      setSavingCurrency(true);
      setCurrencyError("");
      setPageError("");
      setPageMessage("");

      const payload: CurrencyUpsertInput = {
        currency_code: currencyCode,
        currency_name: currencyName,
        currency_symbol: currencySymbol || null,
        decimal_places: decimalPlaces,
        is_base_currency: currencyForm.is_base_currency,
        status: currencyForm.status,
        notes: currencyForm.notes || null,
      };

      if (editingCurrency) {
        await updateCurrency(editingCurrency.id, payload);
        setPageMessage("Currency updated.");
      } else {
        await createCurrency(payload);
        setPageMessage("Currency created.");
      }

      setCurrencyDialogOpen(false);
      setCurrencyForm(EMPTY_CURRENCY_FORM);
      setEditingCurrency(null);
      await loadPage("silent");
    } catch (error) {
      console.error("Failed to save currency:", error);
      setCurrencyError(
        error instanceof Error ? error.message : "Failed to save currency."
      );
    } finally {
      setSavingCurrency(false);
    }
  }

  async function handleSaveRate() {
    if (!(editingRate ? canEdit : canCreate)) return;

    if (
      !rateForm.from_currency_code.trim() ||
      !rateForm.to_currency_code.trim() ||
      !rateForm.effective_date.trim()
    ) {
      setRateError("From currency, To currency, and Effective date are required.");
      return;
    }

    if (rateForm.from_currency_code === rateForm.to_currency_code) {
      setRateError("From and To currencies must be different.");
      return;
    }

    if (!autoRate || !Number.isFinite(autoRate.rate) || autoRate.rate <= 0) {
      setRateError("Automatic exchange rate is required before saving.");
      return;
    }

    try {
      setSavingRate(true);
      setRateError("");
      setPageError("");
      setPageMessage("");

      const payload: ExchangeRateUpsertInput = {
        from_currency_code: rateForm.from_currency_code,
        to_currency_code: rateForm.to_currency_code,
        exchange_rate: String(autoRate.rate),
        effective_date: rateForm.effective_date,
        status: rateForm.status,
        notes: rateForm.notes || null,
      };

      if (editingRate) {
        await updateExchangeRate(editingRate.id, payload);
        setPageMessage("Exchange rate updated from automatic live rate.");
      } else {
        await createExchangeRate(payload);
        setPageMessage("Exchange rate created from automatic live rate.");
      }

      setRateDialogOpen(false);
      setRateForm(EMPTY_RATE_FORM);
      setEditingRate(null);
      setAutoRate(null);
      setAutoRateError("");
      await loadPage("silent");
    } catch (error) {
      console.error("Failed to save exchange rate:", error);
      setRateError(
        error instanceof Error ? error.message : "Failed to save exchange rate."
      );
    } finally {
      setSavingRate(false);
    }
  }

  async function handleArchiveCurrency(row: FinanceCurrencyRow) {
    if (!canArchive || runningActionId) return;

    try {
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await archiveCurrency(row.id);
      await loadPage("silent");
      setPageMessage("Currency archived.");
    } catch (error) {
      console.error("Failed to archive currency:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to archive currency."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  async function handleRestoreCurrency(id: string) {
    if (!canArchive || runningActionId) return;

    try {
      setRunningActionId(id);
      setPageError("");
      setPageMessage("");

      await restoreCurrency(id);
      await Promise.all([loadArchived("silent"), loadPage("silent")]);
      setPageMessage("Currency restored.");
    } catch (error) {
      console.error("Failed to restore currency:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to restore currency."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  async function handleHardDeleteCurrency(id: string) {
    if (!canArchive || runningActionId) return;

    const confirmed = window.confirm(
      "Permanently delete this archived currency? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setRunningActionId(id);
      setPageError("");
      setPageMessage("");

      await permanentlyDeleteCurrency(id);
      await Promise.all([loadArchived("silent"), loadPage("silent")]);
      setPageMessage("Archived currency permanently deleted.");
    } catch (error) {
      console.error("Failed to permanently delete currency:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete currency."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  async function handleArchiveRate(row: FinanceExchangeRateRow) {
    if (!canArchive || runningActionId) return;

    try {
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await archiveExchangeRate(row.id);
      await loadPage("silent");
      setPageMessage("Exchange rate archived.");
    } catch (error) {
      console.error("Failed to archive exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to archive exchange rate."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  async function handleRestoreRate(row: FinanceExchangeRateRow) {
    if (!canArchive || runningActionId) return;

    try {
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await restoreExchangeRate(row.id);
      await loadPage("silent");
      setPageMessage("Exchange rate restored.");
    } catch (error) {
      console.error("Failed to restore exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to restore exchange rate."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  async function handleHardDeleteRate(row: FinanceExchangeRateRow) {
    if (!canArchive || runningActionId) return;

    const confirmed = window.confirm(
      "Permanently delete this exchange rate? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await permanentlyDeleteExchangeRate(row.id);
      await loadPage("silent");
      setPageMessage("Exchange rate permanently deleted.");
    } catch (error) {
      console.error("Failed to permanently delete exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete exchange rate."
      );
    } finally {
      setRunningActionId(null);
    }
  }

  const handleConvertLive = useCallback(async () => {
    try {
      setConversionLoading(true);
      setConversionError(null);
      setConversionResult(null);

      const numericAmount = Number(convertAmount);
      const result = await convertCurrencyLive(numericAmount, convertFrom, convertTo);

      setConversionResult(result);
    } catch (error) {
      setConversionResult(null);
      setConversionError(
        error instanceof Error ? error.message : "Failed to fetch live rate."
      );
    } finally {
      setConversionLoading(false);
    }
  }, [convertAmount, convertFrom, convertTo]);

  async function openArchiveModal() {
    if (!canArchive) return;

    setArchiveDialogOpen(true);
    await loadArchived("initial");
  }

  return (
    <>
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/finance/master-data")}
                  className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Master Data
                </button>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Rates / Currency
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Rates / Currency
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Manage general currency master data, automatic exchange-rate snapshots,
                  and a prominent live currency converter for daily finance operations.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    General master data
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Prominent live converter
                  </span>
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Automatic rates
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Read Access
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {loading ? "Checking" : canView ? "Enabled" : "Locked"}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      {canView ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Requires Finance view and Master Data access.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Currency Presets
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {MAJOR_CURRENCY_PRESETS.length} Major
                      </div>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Globe2 className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Presets auto-fill code, name, symbol, and decimal places.
                  </div>
                </div>
              </div>
            </div>
          </header>

                    {pageError ? (
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{pageError}</div>
              </div>
            </div>
          ) : null}

          {pageMessage ? (
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{pageMessage}</div>
              </div>
            </div>
          ) : null}

          {!loading && !canView ? (
            <LockedState />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                {metricCards.map((metric) => (
                  <MetricCardBlock key={metric.title} metric={metric} />
                ))}
              </section>

              <section className="relative overflow-hidden rounded-[34px] border border-cyan-400/20 bg-white/[0.045] p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_center,rgba(139,92,246,0.12),transparent_42%)]" />
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

                <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                      <Calculator className="h-3.5 w-3.5" />
                      Signature Live Tool
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                          Live Currency Converter
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                          Convert active master-data currencies using live rates. This
                          is the quick operational calculator; stored exchange-rate
                          records are managed separately below.
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Current Pair
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">
                          {convertFrom || "—"} → {convertTo || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[28px] border border-white/10 bg-black/25 p-5">
                      <div className="grid gap-4 xl:grid-cols-[minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] xl:items-end">
                        <div>
                          <FieldLabel label="Amount" />
                          <TextInput
                            type="number"
                            value={convertAmount}
                            onChange={setConvertAmount}
                            placeholder="Amount"
                          />
                        </div>

                        <div>
                          <FieldLabel label="From Currency" />
                          <SelectField
                            value={convertFrom}
                            onChange={setConvertFrom}
                          >
                            {activeCurrencies.map((row) => (
                              <option
                                key={`from-${row.id}`}
                                value={row.currency_code}
                                className="bg-[#05070d]"
                              >
                                {getCurrencyOptionLabel(row)}
                              </option>
                            ))}
                          </SelectField>
                        </div>

                        <div>
                          <FieldLabel label="To Currency" />
                          <SelectField value={convertTo} onChange={setConvertTo}>
                            {activeCurrencies.map((row) => (
                              <option
                                key={`to-${row.id}`}
                                value={row.currency_code}
                                className="bg-[#05070d]"
                              >
                                {getCurrencyOptionLabel(row)}
                              </option>
                            ))}
                          </SelectField>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleConvertLive()}
                          disabled={conversionLoading || !canUseConverter}
                          className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400 px-5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {conversionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Calculator className="h-4 w-4" />
                          )}
                          {conversionLoading ? "Converting..." : "Convert Live"}
                        </button>
                      </div>

                      {conversionError ? (
                        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                          {conversionError}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-500/10 p-5">
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div>
                        <div className="inline-flex rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                          Result
                        </div>

                        {conversionResult ? (
                          <>
                            <div className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                              Converted Amount
                            </div>
                            <div className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-white">
                              {formatNumberLabel(
                                conversionResult.convertedAmount,
                                6
                              )}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-emerald-100">
                              {convertTo}
                            </div>

                            <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                                Live Rate
                              </div>
                              <div className="mt-2 text-sm leading-6 text-white">
                                1 {convertFrom} ={" "}
                                {formatNumberLabel(conversionResult.rate, 8)}{" "}
                                {convertTo}
                              </div>
                              <div className="mt-1 text-xs text-emerald-100/70">
                                Source: Frankfurter • Date: {conversionResult.date}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
                            <div className="text-2xl font-semibold tracking-[-0.035em] text-white">
                              Ready to convert
                            </div>
                            <div className="mt-2 text-sm leading-6 text-emerald-100/75">
                              Select two active currencies and press Convert Live to
                              show the result here.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs leading-5 text-emerald-100/65">
                        Live converter does not save exchange-rate history. Use
                        Stored Exchange Rates to create automatic auditable snapshots.
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <SectionCard
                title="Currency Master Data"
                badge="Currency Registry"
                description="Allowed currencies for the finance engine. Create from major presets or add a manual currency."
                icon={Coins}
                right={
                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {filteredCurrencies.length} Rows
                    </div>

                    {canArchive ? (
                      <button
                        type="button"
                        onClick={() => void openArchiveModal()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    ) : null}

                    {canCreate ? (
                      <button
                        type="button"
                        onClick={openCreateCurrencyDialog}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Plus className="h-4 w-4" />
                        New Currency
                      </button>
                    ) : null}
                  </div>
                }
              >
                <div className="border-b border-white/10 p-5">
                  <SearchInput
                    value={currencySearch}
                    onChange={setCurrencySearch}
                    placeholder="Search by code, name, symbol, status, or notes"
                  />
                </div>

                <div className="overflow-x-auto">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1240px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Code"
                              sortKey="code"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Name"
                              sortKey="name"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Symbol"
                              sortKey="symbol"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Decimals"
                              sortKey="decimals"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Base"
                              sortKey="base"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Status"
                              sortKey="status"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <SortButton
                              label="Updated"
                              sortKey="updated"
                              activeSortKey={currencySortKey}
                              direction={currencySortDirection}
                              onClick={toggleCurrencySort}
                            />
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                                            <tbody>
                        {loading ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-5 py-10 text-sm text-slate-500"
                            >
                              Loading currencies...
                            </td>
                          </tr>
                        ) : filteredCurrencies.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-10">
                              <EmptyState
                                icon={Coins}
                                title="No visible currencies found"
                                description="Create a currency or adjust the search filter."
                              />
                            </td>
                          </tr>
                        ) : (
                          filteredCurrencies.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4">
                                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                                  {row.currency_code}
                                </div>
                              </td>

                              <td className="min-w-[260px] px-5 py-4">
                                <div className="font-semibold text-white">
                                  {row.currency_name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row.notes || "General currency master data"}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-white">
                                {row.currency_symbol || "—"}
                              </td>

                              <td className="px-5 py-4">
                                {row.decimal_places}
                              </td>

                              <td className="px-5 py-4">
                                <BaseBadge isBase={row.is_base_currency} />
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge value={row.status} />
                              </td>

                              <td className="px-5 py-4">
                                {formatDateLabel(row.updated_at)}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {canEdit ? (
                                    <ActionButton
                                      onClick={() => openEditCurrencyDialog(row)}
                                      tone="cyan"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </ActionButton>
                                  ) : null}

                                  {canArchive && row.status !== "archived" ? (
                                    <ActionButton
                                      onClick={() => void handleArchiveCurrency(row)}
                                      disabled={Boolean(runningActionId)}
                                      tone="rose"
                                    >
                                      {runningActionId === row.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Archive className="h-3.5 w-3.5" />
                                      )}
                                      Archive
                                    </ActionButton>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Stored Exchange Rates"
                badge="Automatic Rate Snapshots"
                description="Create auditable exchange-rate records from automatic live conversion. Manual rate typing is not the normal workflow."
                icon={Database}
                right={
                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {filteredExchangeRates.length} Rows
                    </div>

                    {canCreate ? (
                      <button
                        type="button"
                        onClick={openCreateRateDialog}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Plus className="h-4 w-4" />
                        New Automatic Rate
                      </button>
                    ) : null}
                  </div>
                }
              >
                <div className="border-b border-white/10 p-5">
                  <SearchInput
                    value={rateSearch}
                    onChange={setRateSearch}
                    placeholder="Search by currency pair, rate, date, status, or notes"
                  />
                </div>

                <div className="p-5">
                  {loading ? (
                    <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-slate-500">
                      Loading exchange rates...
                    </div>
                  ) : filteredExchangeRates.length === 0 ? (
                    <EmptyState
                      icon={Database}
                      title="No stored exchange rates found"
                      description="Create an automatic exchange-rate snapshot when you need audit history."
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                      <div className="max-h-[720px] overflow-y-auto">
                        <table className="w-full min-w-[1100px] border-collapse">
                          <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                            <tr>
                              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Pair
                              </th>
                              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Rate
                              </th>
                              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Effective Date
                              </th>
                              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Status
                              </th>
                              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Updated
                              </th>
                              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredExchangeRates.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                              >
                                <td className="min-w-[220px] px-5 py-4">
                                  <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">
                                    {row.from_currency_code} →{" "}
                                    {row.to_currency_code}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Automatic snapshot
                                  </div>
                                </td>

                                <td className="min-w-[180px] px-5 py-4">
                                  <div className="font-semibold text-white">
                                    {formatNumberLabel(row.exchange_rate, 8)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    1 {row.from_currency_code}
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  {formatDateLabel(row.effective_date)}
                                </td>

                                <td className="px-5 py-4">
                                  <StatusBadge value={row.status} />
                                </td>

                                <td className="px-5 py-4">
                                  {formatDateLabel(row.updated_at)}
                                </td>

                                <td className="px-5 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    {canEdit ? (
                                      <ActionButton
                                        onClick={() => openEditRateDialog(row)}
                                        tone="cyan"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                      </ActionButton>
                                    ) : null}

                                    {canArchive && row.status !== "archived" ? (
                                      <ActionButton
                                        onClick={() => void handleArchiveRate(row)}
                                        disabled={Boolean(runningActionId)}
                                        tone="rose"
                                      >
                                        {runningActionId === row.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Archive className="h-3.5 w-3.5" />
                                        )}
                                        Archive
                                      </ActionButton>
                                    ) : null}

                                    {canArchive && row.status === "archived" ? (
                                      <>
                                        <ActionButton
                                          onClick={() => void handleRestoreRate(row)}
                                          disabled={Boolean(runningActionId)}
                                          tone="emerald"
                                        >
                                          <RefreshCcw className="h-3.5 w-3.5" />
                                          Restore
                                        </ActionButton>

                                        <ActionButton
                                          onClick={() =>
                                            void handleHardDeleteRate(row)
                                          }
                                          disabled={Boolean(runningActionId)}
                                          tone="rose"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete
                                        </ActionButton>
                                      </>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>

            {currencyDialogOpen ? (
        <ModalShell
          title={editingCurrency ? "Edit Currency" : "Create Currency"}
          description="Choose from 40 major currencies or add a manual custom currency. Presets auto-fill code, name, symbol, and decimals."
          onClose={() => setCurrencyDialogOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setCurrencyDialogOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveCurrency()}
                disabled={savingCurrency || !(editingCurrency ? canEdit : canCreate)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingCurrency ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingCurrency
                  ? "Saving..."
                  : editingCurrency
                    ? "Save Changes"
                    : "Create Currency"}
              </button>
            </>
          }
        >
          <div className="grid gap-5">
            <div>
              <FieldLabel label="Currency Preset" required={!editingCurrency} />
              <SelectField
                value={currencyForm.preset_key}
                onChange={handleCurrencyPresetChange}
              >
                <option value="" className="bg-[#05070d]">
                  Select one of 40 major currencies
                </option>
                <option value={CUSTOM_CURRENCY_KEY} className="bg-[#05070d]">
                  Manual custom currency
                </option>
                {MAJOR_CURRENCY_PRESETS.map((preset) => (
                  <option
                    key={preset.code}
                    value={preset.code}
                    className="bg-[#05070d]"
                  >
                    {getPresetSelectLabel(preset)} • {preset.region}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div className="text-sm font-semibold text-white">
                Automatic preset fields
              </div>
              <div className="mt-1 text-xs leading-5 text-cyan-100/80">
                When a preset is selected, Currency Code, Currency Name, Symbol,
                and Decimal Places are filled automatically and locked. Choose
                Manual custom currency only when the currency is not in the preset list.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="Currency Code" required />
                <TextInput
                  value={currencyForm.currency_code}
                  onChange={handleCustomCurrencyCodeChange}
                  placeholder="Automatic from preset"
                  readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
                />
              </div>

              <div>
                <FieldLabel label="Currency Name" required />
                <TextInput
                  value={currencyForm.currency_name}
                  onChange={handleCustomCurrencyNameChange}
                  placeholder="Automatic from preset"
                  readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
                />
              </div>

              <div>
                <FieldLabel label="Currency Symbol" />
                <TextInput
                  value={currencyForm.currency_symbol}
                  onChange={handleCustomCurrencySymbolChange}
                  placeholder="Automatic from preset"
                  readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
                />
              </div>

              <div>
                <FieldLabel label="Decimal Places" required />
                <TextInput
                  type="number"
                  value={currencyForm.decimal_places}
                  onChange={(value) =>
                    setCurrencyForm((previous) => ({
                      ...previous,
                      decimal_places: value,
                      preset_key: CUSTOM_CURRENCY_KEY,
                    }))
                  }
                  placeholder="Automatic from preset"
                  readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                <input
                  id="currency-base"
                  type="checkbox"
                  checked={currencyForm.is_base_currency}
                  onChange={(event) =>
                    setCurrencyForm((previous) => ({
                      ...previous,
                      is_base_currency: event.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-white">
                    Set as base currency
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Used as the main reference currency across finance workflows.
                  </span>
                </span>
              </label>

              <div>
                <FieldLabel label="Status" />
                <SelectField
                  value={currencyForm.status}
                  onChange={(value) =>
                    setCurrencyForm((previous) => ({
                      ...previous,
                      status: value as FinanceRecordStatus,
                    }))
                  }
                >
                  <option value="active" className="bg-[#05070d]">
                    Active
                  </option>
                  <option value="inactive" className="bg-[#05070d]">
                    Inactive
                  </option>
                  <option value="archived" className="bg-[#05070d]">
                    Archived
                  </option>
                </SelectField>
              </div>
            </div>

            <div>
              <FieldLabel label="Notes" />
              <TextInput
                value={currencyForm.notes}
                onChange={(value) =>
                  setCurrencyForm((previous) => ({
                    ...previous,
                    notes: value,
                  }))
                }
                placeholder="Optional notes"
              />
            </div>

            {currencyError ? <FormError message={currencyError} /> : null}
          </div>
        </ModalShell>
      ) : null}

      {rateDialogOpen ? (
        <ModalShell
          title={editingRate ? "Edit Automatic Exchange Rate" : "Create Automatic Exchange Rate"}
          description="Select a currency pair and the system will calculate the live rate automatically. Manual rate typing is not used here."
          onClose={() => setRateDialogOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRateDialogOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveRate()}
                disabled={
                  savingRate ||
                  autoRateLoading ||
                  !autoRate ||
                  !(editingRate ? canEdit : canCreate)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingRate
                  ? "Saving..."
                  : editingRate
                    ? "Save Automatic Rate"
                    : "Create Automatic Rate"}
              </button>
            </>
          }
        >
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="From Currency" required />
                <SelectField
                  value={rateForm.from_currency_code}
                  onChange={handleRateFromChange}
                  disabled={autoRateLoading || savingRate}
                >
                  <option value="" className="bg-[#05070d]">
                    From currency
                  </option>
                  {activeCurrencies.map((row) => (
                    <option
                      key={`rate-from-${row.id}`}
                      value={row.currency_code}
                      className="bg-[#05070d]"
                    >
                      {getCurrencyOptionLabel(row)}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <FieldLabel label="To Currency" required />
                <SelectField
                  value={rateForm.to_currency_code}
                  onChange={handleRateToChange}
                  disabled={autoRateLoading || savingRate}
                >
                  <option value="" className="bg-[#05070d]">
                    To currency
                  </option>
                  {activeCurrencies.map((row) => (
                    <option
                      key={`rate-to-${row.id}`}
                      value={row.currency_code}
                      className="bg-[#05070d]"
                    >
                      {getCurrencyOptionLabel(row)}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="Effective Date" required />
                <TextInput
                  type="date"
                  value={rateForm.effective_date}
                  onChange={(value) =>
                    setRateForm((previous) => ({
                      ...previous,
                      effective_date: value,
                    }))
                  }
                  placeholder="Effective date"
                  disabled={savingRate}
                />
              </div>

              <div>
                <FieldLabel label="Status" />
                <SelectField
                  value={rateForm.status}
                  onChange={(value) =>
                    setRateForm((previous) => ({
                      ...previous,
                      status: value as FinanceRecordStatus,
                    }))
                  }
                  disabled={savingRate}
                >
                  <option value="active" className="bg-[#05070d]">
                    Active
                  </option>
                  <option value="inactive" className="bg-[#05070d]">
                    Inactive
                  </option>
                  <option value="archived" className="bg-[#05070d]">
                    Archived
                  </option>
                </SelectField>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/70">
                    Automatic Rate
                  </div>

                  {autoRateLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-100">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculating live exchange rate...
                    </div>
                  ) : autoRate ? (
                    <>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white">
                        {formatNumberLabel(autoRate.rate, 8)}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-emerald-100/80">
                        1 {rateForm.from_currency_code} ={" "}
                        {formatNumberLabel(autoRate.rate, 8)}{" "}
                        {rateForm.to_currency_code}
                      </div>
                      <div className="mt-1 text-xs text-emerald-100/65">
                        Source: Frankfurter • Date: {autoRate.date}
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-sm leading-6 text-emerald-100/75">
                      Select two different currencies to calculate the live rate.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void calculateRateForForm(
                      rateForm.from_currency_code,
                      rateForm.to_currency_code
                    )
                  }
                  disabled={autoRateLoading || !canAutoCalculateRate}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {autoRateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Recalculate
                </button>
              </div>

              {autoRateError ? (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                  {autoRateError}
                </div>
              ) : null}
            </div>

            <div>
              <FieldLabel label="Notes" />
              <TextInput
                value={rateForm.notes}
                onChange={(value) =>
                  setRateForm((previous) => ({
                    ...previous,
                    notes: value,
                  }))
                }
                placeholder="Optional notes"
                disabled={savingRate}
              />
            </div>

            {rateError ? <FormError message={rateError} /> : null}
          </div>
        </ModalShell>
      ) : null}

            {archiveDialogOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#05070d] shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-white">
                  Archived Currencies
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  Archived currencies can be opened, restored, or permanently deleted.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setArchiveDialogOpen(false);
                  setArchiveSearch("");
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4">
              <SearchInput
                value={archiveSearch}
                onChange={setArchiveSearch}
                placeholder="Search archived currencies"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {archiveLoading ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    Loading archived currencies
                  </div>
                </div>
              ) : filteredArchivedCurrencies.length === 0 ? (
                <EmptyState
                  icon={Archive}
                  title="No archived currencies"
                  description="Archived currencies will appear here after they are removed from active operational use."
                />
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Code
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Name
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Symbol
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredArchivedCurrencies.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                              {row.currency_code}
                            </div>
                          </td>

                          <td className="min-w-[260px] px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.currency_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.notes || "Archived currency"}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-white">
                            {row.currency_symbol || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {formatDateLabel(row.updated_at)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {canEdit ? (
                                <ActionButton
                                  onClick={() => openEditCurrencyDialog(row)}
                                  tone="cyan"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Open
                                </ActionButton>
                              ) : null}

                              <ActionButton
                                onClick={() => void handleRestoreCurrency(row.id)}
                                disabled={Boolean(runningActionId)}
                                tone="emerald"
                              >
                                {runningActionId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCcw className="h-3.5 w-3.5" />
                                )}
                                Restore
                              </ActionButton>

                              <ActionButton
                                onClick={() =>
                                  void handleHardDeleteCurrency(row.id)
                                }
                                disabled={Boolean(runningActionId)}
                                tone="rose"
                              >
                                {runningActionId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Delete
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
