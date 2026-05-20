import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, Calculator, Coins, Database, Landmark, Loader2, Pencil, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaCheckboxField,
  AixiaCurrencyBadge,
  AixiaDefaultBadge,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaModal,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
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
import { type Permission, type Role } from "@/lib/permissions";

import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";

import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
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


type MetricCardData = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type CurrencySortKey =
  | "code"
  | "name"
  | "symbol"
  | "decimals"
  | "base"
  | "status"
  | "updated";

type RateSortKey = "pair" | "rate" | "effectiveDate" | "status" | "updated";
type SortDirection = "asc" | "desc";

type PageAction =
  | null
  | "archive-currency"
  | "restore-currency"
  | "hard-delete-currency"
  | "archive-rate"
  | "restore-rate"
  | "hard-delete-rate";

const CUSTOM_CURRENCY_KEY = "__custom__";

const CURRENCY_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const;

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
  { code: "USD", name: "US Dollar", symbol: "$", decimal_places: "2", region: "North America" },
  { code: "EUR", name: "Euro", symbol: "€", decimal_places: "2", region: "Europe" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimal_places: "2", region: "Asia" },
  { code: "GBP", name: "British Pound Sterling", symbol: "£", decimal_places: "2", region: "Europe" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimal_places: "0", region: "Asia" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", decimal_places: "2", region: "Middle East" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimal_places: "2", region: "Asia" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimal_places: "2", region: "Asia" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimal_places: "2", region: "Oceania" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimal_places: "2", region: "North America" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimal_places: "2", region: "Europe" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimal_places: "2", region: "Europe" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimal_places: "2", region: "Europe" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", decimal_places: "2", region: "Europe" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimal_places: "2", region: "Oceania" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimal_places: "0", region: "Asia" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimal_places: "2", region: "Asia" },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimal_places: "2", region: "Asia" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimal_places: "2", region: "Asia" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimal_places: "2", region: "Asia" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimal_places: "2", region: "Asia" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimal_places: "0", region: "Asia" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$", decimal_places: "2", region: "Asia" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimal_places: "2", region: "Middle East" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimal_places: "2", region: "Middle East" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق", decimal_places: "2", region: "Middle East" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimal_places: "2", region: "Middle East / Europe" },
  { code: "ZAR", name: "South African Rand", symbol: "R", decimal_places: "2", region: "Africa" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", decimal_places: "2", region: "Africa" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", decimal_places: "2", region: "Africa" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", decimal_places: "2", region: "North America" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimal_places: "2", region: "South America" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", decimal_places: "2", region: "South America" },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP$", decimal_places: "0", region: "South America" },
  { code: "COP", name: "Colombian Peso", symbol: "COL$", decimal_places: "2", region: "South America" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", decimal_places: "2", region: "Europe" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", decimal_places: "2", region: "Europe" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", decimal_places: "2", region: "Europe" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", decimal_places: "2", region: "Europe" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", decimal_places: "2", region: "Europe / Asia" },
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

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

function normalizeCurrencySymbol(value: string) {
  return value.trim().slice(0, 8);
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(first: number | string | null | undefined, second: number | string | null | undefined) {
  return Number(first || 0) - Number(second || 0);
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getCurrencyOptionLabel(row: FinanceCurrencyRow) {
  return `${row.currency_code} — ${row.currency_name}`;
}

function getPresetSelectLabel(preset: CurrencyPreset) {
  return `${preset.code} — ${preset.name} • ${preset.region}`;
}

async function loadCurrencyEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Rates / Currency");
}

function makeRateResultFromStoredRate(row: FinanceExchangeRateRow): LiveConversionResult {
  return {
    amount: 1,
    base: row.from_currency_code,
    date: row.effective_date,
    rates: {
      [row.to_currency_code]: Number(row.exchange_rate),
    },
    convertedAmount: Number(row.exchange_rate),
    rate: Number(row.exchange_rate),
    targetCurrency: row.to_currency_code,
  };
}

export default function FinanceMasterDataCurrenciesPage() {
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [currencies, setCurrencies] = useState<FinanceCurrencyRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<FinanceExchangeRateRow[]>([]);
  const [archivedCurrencies, setArchivedCurrencies] = useState<FinanceCurrencyRow[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [, setBackgroundRefreshing] = useState(false);

  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<PageAction>(null);

  const [editingCurrency, setEditingCurrency] =
    useState<FinanceCurrencyRow | null>(null);
  const [editingRate, setEditingRate] =
    useState<FinanceExchangeRateRow | null>(null);

  const [currencyForm, setCurrencyForm] =
    useState<CurrencyFormState>(EMPTY_CURRENCY_FORM);
  const [rateForm, setRateForm] = useState<ExchangeRateFormState>(EMPTY_RATE_FORM);

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

  const [currencySortKey, setCurrencySortKey] =
    useState<CurrencySortKey>("updated");
  const [currencySortDirection, setCurrencySortDirection] =
    useState<SortDirection>("desc");
  const [rateSortKey, setRateSortKey] = useState<RateSortKey>("updated");
  const [rateSortDirection, setRateSortDirection] =
    useState<SortDirection>("desc");

  const [convertAmount, setConvertAmount] = useState("1");
  const [convertFrom, setConvertFrom] = useState("USD");
  const [convertTo, setConvertTo] = useState("CNY");
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] =
    useState<LiveConversionResult | null>(null);

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent currencies profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data || null) as ProfilePermissionRow | null;

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent currencies profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadCurrencyEffectivePermissions(
        authUserId,
        mode
      );

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent currencies profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent currencies permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (error) {
      console.error("Failed to load currencies profile permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadFinanceCurrencyData = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingData(true);
      setPageError("");
    } else {
      setBackgroundRefreshing(true);
    }

    try {
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
        activeRows.find((row) => row.currency_code !== baseRow?.currency_code) ??
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
          error instanceof Error ? error.message : "Failed to load currencies page."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingData(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedCurrencies = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError("");
    } else {
      setBackgroundRefreshing(true);
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
        setIsLoadingArchive(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadFinanceCurrencyData("initial"),
    ]);
  }, [loadCurrentProfile, loadFinanceCurrencyData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-currencies-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => {
          void loadFinanceCurrencyData("silent");
          if (archiveDialogOpen) void loadArchivedCurrencies("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_exchange_rates" },
        () => void loadFinanceCurrencyData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadFinanceCurrencyData("silent"),
        archiveDialogOpen ? loadArchivedCurrencies("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [
    archiveDialogOpen,
    loadArchivedCurrencies,
    loadCurrentProfile,
    loadFinanceCurrencyData,
  ]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: CURRENCY_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

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

  const archivedExchangeRates = useMemo(
    () => exchangeRates.filter((row) => row.status === "archived"),
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
          comparison = compareStrings(first.currency_symbol, second.currency_symbol);
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

    return visibleExchangeRates
      .filter((row) => {
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
      })
      .sort((first, second) => {
        let comparison = 0;

        if (rateSortKey === "pair") {
          comparison = compareStrings(
            `${first.from_currency_code}-${first.to_currency_code}`,
            `${second.from_currency_code}-${second.to_currency_code}`
          );
        }

        if (rateSortKey === "rate") {
          comparison = compareNumbers(first.exchange_rate, second.exchange_rate);
        }

        if (rateSortKey === "effectiveDate") {
          comparison = compareDates(first.effective_date, second.effective_date);
        }

        if (rateSortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (rateSortKey === "updated") {
          comparison = compareDates(first.updated_at, second.updated_at);
        }

        return rateSortDirection === "asc" ? comparison : -comparison;
      });
  }, [rateSearch, rateSortDirection, rateSortKey, visibleExchangeRates]);

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

  const filteredArchivedExchangeRates = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedExchangeRates.filter((row) => {
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
  }, [archiveSearch, archivedExchangeRates]);

  const metricCards = useMemo<MetricCardData[]>(
    () => [
      {
        label: "Active Currencies",
        value: isLoadingData ? "—" : activeCurrencies.length.toLocaleString(),
        description: "Available for finance operations.",
        icon: Coins,
        tone: "cyan",
      },
      {
        label: "Base Currency",
        value: isLoadingData ? "—" : baseCurrency?.currency_code ?? "—",
        description: baseCurrency?.currency_name ?? "No base currency set.",
        icon: Landmark,
        tone: "emerald",
      },
      {
        label: "Stored Rates",
        value: isLoadingData ? "—" : visibleExchangeRates.length.toLocaleString(),
        description: latestStoredRate
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
      isLoadingData,
      latestStoredRate,
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

  function toggleCurrencySort(nextKey: CurrencySortKey) {
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

  function toggleRateSort(nextKey: RateSortKey) {
    setRateSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setRateSortDirection("asc");
        return nextKey;
      }

      setRateSortDirection((currentDirection) =>
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
    setAutoRate(makeRateResultFromStoredRate(row));
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
    if (!(editingCurrency ? permissionState.canUpdate : permissionState.canCreate)) return;

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
      await loadFinanceCurrencyData("silent");
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
    if (!(editingRate ? permissionState.canUpdate : permissionState.canCreate)) return;

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
      await loadFinanceCurrencyData("silent");
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
    if (!permissionState.canDeleteArchive || runningActionId) return;

    try {
      setRunningAction("archive-currency");
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await archiveCurrency(row.id);
      await loadFinanceCurrencyData("silent");
      setPageMessage("Currency archived.");
    } catch (error) {
      console.error("Failed to archive currency:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to archive currency."
      );
    } finally {
      setRunningAction(null);
      setRunningActionId(null);
    }
  }

  async function handleRestoreCurrency(id: string) {
    if (!permissionState.canDeleteArchive || runningActionId) return;

    try {
      setRunningAction("restore-currency");
      setRunningActionId(id);
      setPageError("");
      setPageMessage("");

      await restoreCurrency(id);
      await Promise.all([
        loadArchivedCurrencies("silent"),
        loadFinanceCurrencyData("silent"),
      ]);
      setPageMessage("Currency restored.");
    } catch (error) {
      console.error("Failed to restore currency:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to restore currency."
      );
    } finally {
      setRunningAction(null);
      setRunningActionId(null);
    }
  }

  async function handleHardDeleteCurrency(id: string) {
    if (!permissionState.canDeleteArchive || runningActionId) return;

    const confirmed = window.confirm(
      "Permanently delete this archived currency? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setRunningAction("hard-delete-currency");
      setRunningActionId(id);
      setPageError("");
      setPageMessage("");

      await permanentlyDeleteCurrency(id);
      await Promise.all([
        loadArchivedCurrencies("silent"),
        loadFinanceCurrencyData("silent"),
      ]);
      setPageMessage("Archived currency permanently deleted.");
    } catch (error) {
      console.error("Failed to permanently delete currency:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete currency."
      );
    } finally {
      setRunningAction(null);
      setRunningActionId(null);
    }
  }

  async function handleArchiveRate(row: FinanceExchangeRateRow) {
    if (!permissionState.canDeleteArchive || runningActionId) return;

    try {
      setRunningAction("archive-rate");
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await archiveExchangeRate(row.id);
      await loadFinanceCurrencyData("silent");
      setPageMessage("Exchange rate archived.");
    } catch (error) {
      console.error("Failed to archive exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to archive exchange rate."
      );
    } finally {
      setRunningAction(null);
      setRunningActionId(null);
    }
  }

  async function handleRestoreRate(row: FinanceExchangeRateRow) {
    if (!permissionState.canDeleteArchive || runningActionId) return;

    try {
      setRunningAction("restore-rate");
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await restoreExchangeRate(row.id);
      await loadFinanceCurrencyData("silent");
      setPageMessage("Exchange rate restored.");
    } catch (error) {
      console.error("Failed to restore exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to restore exchange rate."
      );
    } finally {
      setRunningAction(null);
      setRunningActionId(null);
    }
  }

  async function handleHardDeleteRate(row: FinanceExchangeRateRow) {
    if (!permissionState.canDeleteArchive || runningActionId) return;

    const confirmed = window.confirm(
      "Permanently delete this exchange rate? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setRunningAction("hard-delete-rate");
      setRunningActionId(row.id);
      setPageError("");
      setPageMessage("");

      await permanentlyDeleteExchangeRate(row.id);
      await loadFinanceCurrencyData("silent");
      setPageMessage("Exchange rate permanently deleted.");
    } catch (error) {
      console.error("Failed to permanently delete exchange rate:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete exchange rate."
      );
    } finally {
      setRunningAction(null);
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
    if (!permissionState.canDeleteArchive) return;

    setArchiveDialogOpen(true);
    await loadArchivedCurrencies("initial");
  }

  function closeArchiveModal() {
    setArchiveDialogOpen(false);
    setArchiveSearch("");
  }

  const isPageLoading = isLoadingProfile || isLoadingData;

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading rates / currency"
        description="Currency master data and permission state are being checked."
      />
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        gradientTitle="Rates / Currency"
        title="Master Data"
        subtitle="Currency Engine"
        />

      <div className="aixia-command-scroll">
{pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No currency master-data access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance view and Master Data access."
        />
      ) : (
        <>
          <AixiaReviewGrid variant="metrics">
            {metricCards.map((metric) => (
              <AixiaReviewBlock
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
                icon={metric.icon}
                tone={metric.tone}
              />
            ))}
          </AixiaReviewGrid>

          <AixiaSection
            title="Live Currency Converter"
            description="Signature live tool. Convert active master-data currencies using live rates. This quick operational calculator does not save exchange-rate history."
            icon={Calculator}
          >
            <AixiaReviewGrid variant="cards">
              <AixiaReviewBlock
                label="Current Pair"
                value={`${convertFrom || "—"} → ${convertTo || "—"}`}
                description="Live converter pair"
              />
            </AixiaReviewGrid>

            <AixiaFormGrid columns="three">
              <AixiaFormField>
                <AixiaFieldLabel label="Amount" />
                <AixiaInputField
                  type="number"
                  value={convertAmount}
                  onChange={(event) => setConvertAmount(event.target.value)}
                  placeholder="Amount"
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="From Currency" />
                <AixiaSelectField
                  value={convertFrom}
                  onChange={(event) => setConvertFrom(event.target.value)}
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
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="To Currency" />
                <AixiaSelectField
                  value={convertTo}
                  onChange={(event) => setConvertTo(event.target.value)}
                >
                  {activeCurrencies.map((row) => (
                    <option
                      key={`to-${row.id}`}
                      value={row.currency_code}
                      className="bg-[#05070d]"
                    >
                      {getCurrencyOptionLabel(row)}
                    </option>
                  ))}
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaFormFullWidth>
                <AixiaActionStack>
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => void handleConvertLive()}
                    disabled={conversionLoading || !canUseConverter}
                  >
                    {conversionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4" />
                    )}
                    {conversionLoading ? "Converting..." : "Convert Live"}
                  </AixiaButton>
                </AixiaActionStack>
              </AixiaFormFullWidth>
            </AixiaFormGrid>

            {conversionError ? (
              <AixiaAlert tone="error">{conversionError}</AixiaAlert>
            ) : null}

            <AixiaReviewGrid>
              {conversionResult ? (
                <>
                  <AixiaReviewBlock
                    label="Converted Amount"
                    value={formatNumberLabel(conversionResult.convertedAmount, 6)}
                    description={convertTo}
                  />
                  <AixiaReviewBlock
                    label="Live Rate"
                    value={`1 ${convertFrom} = ${formatNumberLabel(
                      conversionResult.rate,
                      8
                    )} ${convertTo}`}
                    description={`Source: Frankfurter • Date: ${conversionResult.date}`}
                  />
                </>
              ) : (
                <>
                  <AixiaReviewBlock
                    label="Result"
                    value="Ready to convert"
                    description="Select two active currencies and press Convert Live."
                  />
                  <AixiaReviewBlock
                    label="History"
                    value="Not saved"
                    description="Use Stored Exchange Rates to create auditable snapshots."
                  />
                </>
              )}
            </AixiaReviewGrid>
          </AixiaSection>

          <AixiaSection
            title="Currency Master Data"
            description="Allowed currencies for the finance engine. Create from major presets or add a manual currency."
            icon={Coins}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="wide"
                  value={currencySearch}
                  onChange={(event) => setCurrencySearch(event.target.value)}
                  placeholder="Search currencies"
                />
              }
              filters={
                <AixiaBadge tone="neutral">{filteredCurrencies.length} Rows</AixiaBadge>
              }
              archiveAction={
                permissionState.canDeleteArchive ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void openArchiveModal()}
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </AixiaButton>
                ) : null
              }
              primaryAction={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={openCreateCurrencyDialog}
                  >
                    <Plus className="h-4 w-4" />
                    New Currency
                  </AixiaButton>
                ) : null
              }
            />
            {filteredCurrencies.length === 0 ? (
              <AixiaEmptyState
                icon={Coins}
                title="No visible currencies found"
                description="Create a currency or adjust the search filter."
              />
            ) : (
              <AixiaTableShell variant="registry">
                <thead className="aixia-table-head">
                  <tr>
                    <th>
                      <AixiaSortableHeader
                        label="Code"
                        sortKey="code"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Name"
                        sortKey="name"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Symbol"
                        sortKey="symbol"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Decimals"
                        sortKey="decimals"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Base"
                        sortKey="base"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Updated"
                        sortKey="updated"
                        activeSortKey={currencySortKey}
                        sortDirection={currencySortDirection}
                        onSort={toggleCurrencySort}
                      />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCurrencies.map((row) => (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableBadgeCell width="sm">
                        <AixiaCurrencyBadge value={row.currency_code} />
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.currency_name}
                        secondary={row.notes || "General currency master data"}
                      />

                      <AixiaTableTextCell
                        width="sm"
                        primary={row.currency_symbol || "—"}
                      />

                      <AixiaTableTextCell
                        width="sm"
                        primary={String(row.decimal_places)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaDefaultBadge isDefault={row.is_base_currency} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        {permissionState.canUpdate ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => openEditCurrencyDialog(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </AixiaButton>
                        ) : null}

                        {permissionState.canDeleteArchive &&
                        row.status !== "archived" ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchiveCurrency(row)}
                            disabled={Boolean(runningActionId)}
                          >
                            {runningActionId === row.id &&
                            runningAction === "archive-currency" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                            Archive
                          </AixiaButton>
                        ) : null}
                      </AixiaTableActionsCell>
                    </tr>
                  ))}
                </tbody>
              </AixiaTableShell>
            )}
          </AixiaSection>

          <AixiaSection
            title="Stored Exchange Rates"
            description="Create auditable exchange-rate records from automatic live conversion. Manual rate typing is not the normal workflow."
            icon={Database}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="wide"
                  value={rateSearch}
                  onChange={(event) => setRateSearch(event.target.value)}
                  placeholder="Search exchange rates"
                />
              }
              filters={
                <AixiaBadge tone="neutral">
                  {filteredExchangeRates.length} Rows
                </AixiaBadge>
              }
              primaryAction={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={openCreateRateDialog}
                  >
                    <Plus className="h-4 w-4" />
                    New Automatic Rate
                  </AixiaButton>
                ) : null
              }
            />
            {filteredExchangeRates.length === 0 ? (
              <AixiaEmptyState
                icon={Database}
                title="No stored exchange rates found"
                description="Create an automatic exchange-rate snapshot when audit history is needed."
              />
            ) : (
              <AixiaTableShell variant="registry">
                <thead className="aixia-table-head">
                  <tr>
                    <th>
                      <AixiaSortableHeader
                        label="Pair"
                        sortKey="pair"
                        activeSortKey={rateSortKey}
                        sortDirection={rateSortDirection}
                        onSort={toggleRateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Rate"
                        sortKey="rate"
                        activeSortKey={rateSortKey}
                        sortDirection={rateSortDirection}
                        onSort={toggleRateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Effective Date"
                        sortKey="effectiveDate"
                        activeSortKey={rateSortKey}
                        sortDirection={rateSortDirection}
                        onSort={toggleRateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={rateSortKey}
                        sortDirection={rateSortDirection}
                        onSort={toggleRateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Updated"
                        sortKey="updated"
                        activeSortKey={rateSortKey}
                        sortDirection={rateSortDirection}
                        onSort={toggleRateSort}
                      />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExchangeRates.map((row) => (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="md"
                        primary={`${row.from_currency_code} → ${row.to_currency_code}`}
                        secondary="Automatic snapshot"
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={formatNumberLabel(row.exchange_rate, 8)}
                        secondary={`1 ${row.from_currency_code}`}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.effective_date)}
                      </AixiaTableDateCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        {permissionState.canUpdate ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => openEditRateDialog(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </AixiaButton>
                        ) : null}

                        {permissionState.canDeleteArchive &&
                        row.status !== "archived" ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchiveRate(row)}
                            disabled={Boolean(runningActionId)}
                          >
                            {runningActionId === row.id &&
                            runningAction === "archive-rate" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                            Archive
                          </AixiaButton>
                        ) : null}
                      </AixiaTableActionsCell>
                    </tr>
                  ))}
                </tbody>
              </AixiaTableShell>
            )}
          </AixiaSection>

          <AixiaAccessRule
            title="Locked access rule"
            description="Finance registry pages must show the shared Locked access rule block."
          >
            Currency master data is general master data. Dropdowns across company and bank account pages must use this source. Silent refresh must not wipe existing visible currency data or permission state on temporary failures.
          </AixiaAccessRule>
        </>
      )}

      <AixiaModal
        open={currencyDialogOpen}
        title={editingCurrency ? "Edit Currency" : "Create Currency"}
        description="Choose from 40 major currencies or add a manual custom currency. Presets auto-fill code, name, symbol, and decimals."
        onClose={() => setCurrencyDialogOpen(false)}
        badge={<AixiaBadge tone="cyan">Currency</AixiaBadge>}
        footer={
          <>
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => setCurrencyDialogOpen(false)}
            >
              Cancel
            </AixiaButton>

            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void handleSaveCurrency()}
              disabled={
                savingCurrency ||
                !(editingCurrency
                  ? permissionState.canUpdate
                  : permissionState.canCreate)
              }
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
            </AixiaButton>
          </>
        }
      >
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleSaveCurrency();
          }}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormFullWidth>
              <AixiaFieldLabel
                label="Currency Preset"
                required={!editingCurrency}
              />
              <AixiaSelectField
                value={currencyForm.preset_key}
                onChange={(event) => handleCurrencyPresetChange(event.target.value)}
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
                    {getPresetSelectLabel(preset)}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaAlert tone="info">
                <AixiaAlertText
                  title="Automatic preset fields"
                  description="When a preset is selected, Currency Code, Currency Name, Symbol, and Decimal Places are filled automatically and locked. Choose Manual custom currency only when the currency is not in the preset list."
                />
              </AixiaAlert>
            </AixiaFormFullWidth>

            <AixiaFormField>
              <AixiaFieldLabel label="Currency Code" required />
              <AixiaInputField
                value={currencyForm.currency_code}
                onChange={(event) =>
                  handleCustomCurrencyCodeChange(event.target.value)
                }
                placeholder="Automatic from preset"
                readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Currency Name" required />
              <AixiaInputField
                value={currencyForm.currency_name}
                onChange={(event) =>
                  handleCustomCurrencyNameChange(event.target.value)
                }
                placeholder="Automatic from preset"
                readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Currency Symbol" />
              <AixiaInputField
                value={currencyForm.currency_symbol}
                onChange={(event) =>
                  handleCustomCurrencySymbolChange(event.target.value)
                }
                placeholder="Automatic from preset"
                readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Decimal Places" required />
              <AixiaInputField
                type="number"
                value={currencyForm.decimal_places}
                onChange={(event) =>
                  setCurrencyForm((previous) => ({
                    ...previous,
                    decimal_places: event.target.value,
                    preset_key: CUSTOM_CURRENCY_KEY,
                  }))
                }
                placeholder="Automatic from preset"
                readOnly={currencyForm.preset_key !== CUSTOM_CURRENCY_KEY}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaCheckboxField
                checked={currencyForm.is_base_currency}
                onChange={(event) =>
                  setCurrencyForm((previous) => ({
                    ...previous,
                    is_base_currency: event.target.checked,
                  }))
                }
                label="Set as base currency"
                description="Used as the main reference currency across finance workflows."
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" />
              <AixiaSelectField
                value={currencyForm.status}
                onChange={(event) =>
                  setCurrencyForm((previous) => ({
                    ...previous,
                    status: event.target.value as FinanceRecordStatus,
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
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Notes" />
              <AixiaInputField
                value={currencyForm.notes}
                onChange={(event) =>
                  setCurrencyForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional notes"
              />
            </AixiaFormFullWidth>

            {currencyError ? (
              <AixiaFormFullWidth>
                <AixiaAlert tone="error">{currencyError}</AixiaAlert>
              </AixiaFormFullWidth>
            ) : null}
          </AixiaFormGrid>
        </form>
      </AixiaModal>

      <AixiaModal
        open={rateDialogOpen}
        title={editingRate ? "Edit Automatic Exchange Rate" : "Create Automatic Exchange Rate"}
        description="Select a currency pair and the system will calculate the live rate automatically. Manual rate typing is not used here."
        onClose={() => setRateDialogOpen(false)}
        badge={<AixiaBadge tone="violet">Automatic Rate</AixiaBadge>}
        footer={
          <>
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => setRateDialogOpen(false)}
            >
              Cancel
            </AixiaButton>

            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void handleSaveRate()}
              disabled={
                savingRate ||
                autoRateLoading ||
                !autoRate ||
                !(editingRate
                  ? permissionState.canUpdate
                  : permissionState.canCreate)
              }
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
            </AixiaButton>
          </>
        }
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaFieldLabel label="From Currency" required />
            <AixiaSelectField
              value={rateForm.from_currency_code}
              onChange={(event) => handleRateFromChange(event.target.value)}
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
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="To Currency" required />
            <AixiaSelectField
              value={rateForm.to_currency_code}
              onChange={(event) => handleRateToChange(event.target.value)}
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
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Effective Date" required />
            <AixiaInputField
              type="date"
              value={rateForm.effective_date}
              onChange={(event) =>
                setRateForm((previous) => ({
                  ...previous,
                  effective_date: event.target.value,
                }))
              }
              placeholder="Effective date"
              disabled={savingRate}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Status" />
            <AixiaSelectField
              value={rateForm.status}
              onChange={(event) =>
                setRateForm((previous) => ({
                  ...previous,
                  status: event.target.value as FinanceRecordStatus,
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
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaReviewGrid>
              {autoRateLoading ? (
                <AixiaReviewBlock
                  label="Automatic Rate"
                  value="Calculating..."
                  description="Calculating live exchange rate."
                />
              ) : autoRate ? (
                <AixiaReviewBlock
                  label="Automatic Rate"
                  value={formatNumberLabel(autoRate.rate, 8)}
                  description={`1 ${rateForm.from_currency_code} = ${formatNumberLabel(
                    autoRate.rate,
                    8
                  )} ${rateForm.to_currency_code} • Frankfurter • ${autoRate.date}`}
                />
              ) : (
                <AixiaReviewBlock
                  label="Automatic Rate"
                  value="Not calculated"
                  description="Select two different currencies to calculate the live rate."
                />
              )}

              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() =>
                  void calculateRateForForm(
                    rateForm.from_currency_code,
                    rateForm.to_currency_code
                  )
                }
                disabled={autoRateLoading || !canAutoCalculateRate}
              >
                {autoRateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Recalculate
              </AixiaButton>
            </AixiaReviewGrid>
          </AixiaFormFullWidth>

          {autoRateError ? (
            <AixiaFormFullWidth>
              <AixiaAlert tone="error">{autoRateError}</AixiaAlert>
            </AixiaFormFullWidth>
          ) : null}

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            <AixiaInputField
              value={rateForm.notes}
              onChange={(event) =>
                setRateForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional notes"
              disabled={savingRate}
            />
          </AixiaFormFullWidth>

          {rateError ? (
            <AixiaFormFullWidth>
              <AixiaAlert tone="error">{rateError}</AixiaAlert>
            </AixiaFormFullWidth>
          ) : null}
        </AixiaFormGrid>
      </AixiaModal>

      <AixiaArchiveManagerModal
        open={archiveDialogOpen}
        title="Archived Rates / Currency"
        description="Archived currencies and archived exchange rates can be restored or permanently deleted."
        archivedCount={filteredArchivedCurrencies.length + filteredArchivedExchangeRates.length}
        onClose={closeArchiveModal}
      >
        <div className="space-y-5">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived currencies and rates"
          />

          {isLoadingArchive ? (
            <AixiaEmptyState
              icon={Loader2}
              title="Loading archived records"
              description="Archived currency records are being loaded."
            />
          ) : filteredArchivedCurrencies.length === 0 &&
            filteredArchivedExchangeRates.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived rates / currency"
              description="Archived currencies and archived exchange rates will appear here after they are removed from active operational use."
            />
          ) : (
            <>
              {filteredArchivedCurrencies.length > 0 ? (
                <AixiaSection
                  title="Archived Currencies"
                  description="Restore or permanently delete archived currencies."
                  icon={Coins}
                >
                  <AixiaTableShell variant="archive">
                    <thead className="aixia-table-head">
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Symbol</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredArchivedCurrencies.map((row) => (
                        <tr key={row.id} className="aixia-table-row">
                          <AixiaTableBadgeCell width="sm">
                            <AixiaCurrencyBadge value={row.currency_code} />
                          </AixiaTableBadgeCell>

                          <AixiaTableTextCell
                            width="xl"
                            primary={row.currency_name}
                            secondary={row.notes || "Archived currency"}
                          />

                          <AixiaTableTextCell
                            width="sm"
                            primary={row.currency_symbol || "—"}
                          />

                          <AixiaTableDateCell width="sm">
                            {formatDateLabel(row.updated_at)}
                          </AixiaTableDateCell>

                          <AixiaTableActionsCell>
                            {permissionState.canUpdate ? (
                              <AixiaButton
                                type="button"
                                variant="primary"
                                onClick={() => openEditCurrencyDialog(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Open
                              </AixiaButton>
                            ) : null}

                            <AixiaButton
                              type="button"
                              variant="secondary"
                              onClick={() => void handleRestoreCurrency(row.id)}
                              disabled={Boolean(runningActionId)}
                            >
                              {runningActionId === row.id &&
                              runningAction === "restore-currency" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                              )}
                              Restore
                            </AixiaButton>

                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleHardDeleteCurrency(row.id)}
                              disabled={Boolean(runningActionId)}
                            >
                              {runningActionId === row.id &&
                              runningAction === "hard-delete-currency" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete Permanently
                            </AixiaButton>
                          </AixiaTableActionsCell>
                        </tr>
                      ))}
                    </tbody>
                  </AixiaTableShell>
                </AixiaSection>
              ) : null}

              {filteredArchivedExchangeRates.length > 0 ? (
                <AixiaSection
                  title="Archived Exchange Rates"
                  description="Restore or permanently delete archived automatic rate snapshots."
                  icon={Database}
                >
                  <AixiaTableShell variant="archive">
                    <thead className="aixia-table-head">
                      <tr>
                        <th>Pair</th>
                        <th>Rate</th>
                        <th>Effective Date</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredArchivedExchangeRates.map((row) => (
                        <tr key={row.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="md"
                            primary={`${row.from_currency_code} → ${row.to_currency_code}`}
                            secondary="Archived automatic snapshot"
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={formatNumberLabel(row.exchange_rate, 8)}
                            secondary={`1 ${row.from_currency_code}`}
                          />

                          <AixiaTableDateCell width="sm">
                            {formatDateLabel(row.effective_date)}
                          </AixiaTableDateCell>

                          <AixiaTableDateCell width="sm">
                            {formatDateLabel(row.updated_at)}
                          </AixiaTableDateCell>

                          <AixiaTableActionsCell>
                            {permissionState.canUpdate ? (
                              <AixiaButton
                                type="button"
                                variant="primary"
                                onClick={() => openEditRateDialog(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Open
                              </AixiaButton>
                            ) : null}

                            <AixiaButton
                              type="button"
                              variant="secondary"
                              onClick={() => void handleRestoreRate(row)}
                              disabled={Boolean(runningActionId)}
                            >
                              {runningActionId === row.id &&
                              runningAction === "restore-rate" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                              )}
                              Restore
                            </AixiaButton>

                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleHardDeleteRate(row)}
                              disabled={Boolean(runningActionId)}
                            >
                              {runningActionId === row.id &&
                              runningAction === "hard-delete-rate" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete Permanently
                            </AixiaButton>
                          </AixiaTableActionsCell>
                        </tr>
                      ))}
                    </tbody>
                  </AixiaTableShell>
                </AixiaSection>
              ) : null}
            </>
          )}
        </div>
      </AixiaArchiveManagerModal>
      </div>
    </FinancePage>
  );
}
