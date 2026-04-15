import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
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
} from "@/lib/finance/currencies";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type CurrencyFormState = {
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  decimal_places: string;
  is_base_currency: boolean;
  status: "active" | "inactive" | "archived";
  notes: string;
};

type ExchangeRateFormState = {
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: string;
  effective_date: string;
  status: "active" | "inactive" | "archived";
  notes: string;
};

const EMPTY_CURRENCY_FORM: CurrencyFormState = {
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
  exchange_rate: "",
  effective_date: new Date().toISOString().slice(0, 10),
  status: "active",
  notes: "",
};

const CURRENCY_PRESETS: Record<
  string,
  { name: string; symbol: string; decimal_places: string }
> = {
  USD: { name: "US Dollar", symbol: "$", decimal_places: "2" },
  EUR: { name: "Euro", symbol: "€", decimal_places: "2" },
  CNY: { name: "Chinese Yuan", symbol: "¥", decimal_places: "2" },
  GBP: { name: "British Pound", symbol: "£", decimal_places: "2" },
  JPY: { name: "Japanese Yen", symbol: "¥", decimal_places: "0" },
  ILS: { name: "Israeli New Shekel", symbol: "₪", decimal_places: "2" },
  SGD: { name: "Singapore Dollar", symbol: "$", decimal_places: "2" },
  HKD: { name: "Hong Kong Dollar", symbol: "$", decimal_places: "2" },
  AUD: { name: "Australian Dollar", symbol: "$", decimal_places: "2" },
  CAD: { name: "Canadian Dollar", symbol: "$", decimal_places: "2" },
};

function formatDateLabel(value: string) {
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
  if (Number.isNaN(numeric)) return "—";

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function getStatusBadgeClass(status: string) {
  if (status === "archived") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 text-[11px] text-slate-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 shadow-none";
}

function applyCurrencyPreset(
  current: CurrencyFormState,
  nextCode: string,
): CurrencyFormState {
  const normalizedCode = nextCode.trim().toUpperCase();
  const preset = CURRENCY_PRESETS[normalizedCode];

  if (!preset) {
    return {
      ...current,
      currency_code: normalizedCode,
    };
  }

  return {
    ...current,
    currency_code: normalizedCode,
    currency_name: current.currency_name.trim() ? current.currency_name : preset.name,
    currency_symbol: preset.symbol,
    decimal_places: preset.decimal_places,
  };
}

export default function FinanceMasterDataCurrenciesPage() {
  const navigate = useNavigate();

  const [currencies, setCurrencies] = useState<FinanceCurrencyRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<FinanceExchangeRateRow[]>([]);
  const [archivedCurrencies, setArchivedCurrencies] = useState<FinanceCurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");

  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const [editingCurrency, setEditingCurrency] = useState<FinanceCurrencyRow | null>(null);
  const [editingRate, setEditingRate] = useState<FinanceExchangeRateRow | null>(null);

  const [currencyForm, setCurrencyForm] = useState<CurrencyFormState>(EMPTY_CURRENCY_FORM);
  const [rateForm, setRateForm] = useState<ExchangeRateFormState>(EMPTY_RATE_FORM);

  const [currencyError, setCurrencyError] = useState("");
  const [rateError, setRateError] = useState("");

  const [convertAmount, setConvertAmount] = useState("1");
  const [convertFrom, setConvertFrom] = useState("USD");
  const [convertTo, setConvertTo] = useState("EUR");
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] =
    useState<LiveConversionResult | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);

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

      const activeCurrencyRows = currencyRows.filter((row) => row.status === "active");
      const baseCurrency =
        activeCurrencyRows.find((row) => row.is_base_currency) ?? activeCurrencyRows[0];
      const secondaryCurrency =
        activeCurrencyRows.find(
          (row) => row.currency_code !== (baseCurrency?.currency_code ?? ""),
        ) ?? activeCurrencyRows[1] ?? activeCurrencyRows[0];

      if (baseCurrency?.currency_code) {
        setConvertFrom(baseCurrency.currency_code);
      }

      if (secondaryCurrency?.currency_code) {
        setConvertTo(secondaryCurrency.currency_code);
      }
    } catch (error) {
      console.error("Failed to load currencies page:", error);
      setCurrencies([]);
      setExchangeRates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchived = useCallback(async () => {
    try {
      setArchiveLoading(true);
      const rows = await getArchivedCurrencies();
      setArchivedCurrencies(rows);
    } catch (error) {
      console.error("Failed to load archived currencies:", error);
      setArchivedCurrencies([]);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canView =
    !!permissions?.accessFinance &&
    (!!permissions?.viewFinance || !!permissions?.manageFinanceMasterData);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;

  const activeCurrencies = useMemo(
    () => currencies.filter((row) => row.status === "active"),
    [currencies],
  );

  const filteredCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return currencies.filter((row) => {
      if (row.status === "archived") return false;
      if (!query) return true;

      return (
        row.currency_code.toLowerCase().includes(query) ||
        row.currency_name.toLowerCase().includes(query) ||
        (row.currency_symbol ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [currencies, search]);

  const filteredExchangeRates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exchangeRates.filter((row) => {
      if (row.status === "archived") return false;
      if (!query) return true;

      return (
        row.from_currency_code.toLowerCase().includes(query) ||
        row.to_currency_code.toLowerCase().includes(query) ||
        row.exchange_rate.toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [exchangeRates, search]);

  const filteredArchivedCurrencies = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedCurrencies.filter((row) => {
      if (!query) return true;

      return (
        row.currency_code.toLowerCase().includes(query) ||
        row.currency_name.toLowerCase().includes(query) ||
        (row.currency_symbol ?? "").toLowerCase().includes(query)
      );
    });
  }, [archivedCurrencies, archiveSearch]);

  const baseCurrency = useMemo(
    () => currencies.find((row) => row.is_base_currency) ?? null,
    [currencies],
  );

  const latestStoredRate = useMemo(() => {
    return exchangeRates.find((row) => row.status === "active") ?? null;
  }, [exchangeRates]);

  function openCreateCurrencyDialog() {
    setEditingCurrency(null);
    setCurrencyForm(EMPTY_CURRENCY_FORM);
    setCurrencyError("");
    setCurrencyDialogOpen(true);
  }

  function openEditCurrencyDialog(row: FinanceCurrencyRow) {
    setEditingCurrency(row);
    setCurrencyForm({
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

  function openCreateRateDialog() {
    const defaultFrom = activeCurrencies[0]?.currency_code ?? "";
    const defaultTo =
      activeCurrencies.find((row) => row.currency_code !== defaultFrom)?.currency_code ??
      defaultFrom;

    setEditingRate(null);
    setRateForm({
      ...EMPTY_RATE_FORM,
      from_currency_code: defaultFrom,
      to_currency_code: defaultTo,
    });
    setRateError("");
    setRateDialogOpen(true);
  }

  function openEditRateDialog(row: FinanceExchangeRateRow) {
    setEditingRate(row);
    setRateForm({
      from_currency_code: row.from_currency_code,
      to_currency_code: row.to_currency_code,
      exchange_rate: row.exchange_rate,
      effective_date: row.effective_date,
      status: row.status,
      notes: row.notes ?? "",
    });
    setRateError("");
    setRateDialogOpen(true);
  }

  async function handleSaveCurrency() {
    if (!(editingCurrency ? canEdit : canCreate)) return;

    if (!currencyForm.currency_code.trim() || !currencyForm.currency_name.trim()) {
      setCurrencyError("Currency code and name are required.");
      return;
    }

    const decimalPlaces = Number(currencyForm.decimal_places);

    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
      setCurrencyError("Decimal places must be a whole number 0 or greater.");
      return;
    }

    try {
      setSavingCurrency(true);
      setCurrencyError("");

      const payload: CurrencyUpsertInput = {
        currency_code: currencyForm.currency_code,
        currency_name: currencyForm.currency_name,
        currency_symbol: currencyForm.currency_symbol || null,
        decimal_places: decimalPlaces,
        is_base_currency: currencyForm.is_base_currency,
        status: currencyForm.status,
        notes: currencyForm.notes || null,
      };

      if (editingCurrency) {
        await updateCurrency(editingCurrency.id, payload);
      } else {
        await createCurrency(payload);
      }

      setCurrencyDialogOpen(false);
      setCurrencyForm(EMPTY_CURRENCY_FORM);
      setEditingCurrency(null);
      await loadPage();
    } catch (error) {
      console.error("Failed to save currency:", error);
      setCurrencyError(
        error instanceof Error ? error.message : "Failed to save currency.",
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
      !rateForm.exchange_rate.trim() ||
      !rateForm.effective_date.trim()
    ) {
      setRateError("From, to, rate, and effective date are required.");
      return;
    }

    const numericRate = Number(rateForm.exchange_rate);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setRateError("Exchange rate must be greater than 0.");
      return;
    }

    try {
      setSavingRate(true);
      setRateError("");

      const payload: ExchangeRateUpsertInput = {
        from_currency_code: rateForm.from_currency_code,
        to_currency_code: rateForm.to_currency_code,
        exchange_rate: rateForm.exchange_rate,
        effective_date: rateForm.effective_date,
        status: rateForm.status,
        notes: rateForm.notes || null,
      };

      if (editingRate) {
        await updateExchangeRate(editingRate.id, payload);
      } else {
        await createExchangeRate(payload);
      }

      setRateDialogOpen(false);
      setRateForm(EMPTY_RATE_FORM);
      setEditingRate(null);
      await loadPage();
    } catch (error) {
      console.error("Failed to save exchange rate:", error);
      setRateError(
        error instanceof Error ? error.message : "Failed to save exchange rate.",
      );
    } finally {
      setSavingRate(false);
    }
  }

  async function handleArchiveCurrency(row: FinanceCurrencyRow) {
    try {
      await archiveCurrency(row.id);
      await loadPage();
    } catch (error) {
      console.error("Failed to archive currency:", error);
    }
  }

  async function handleRestoreCurrency(id: string) {
    try {
      await restoreCurrency(id);
      await loadArchived();
      await loadPage();
    } catch (error) {
      console.error("Failed to restore currency:", error);
    }
  }

  async function handleHardDeleteCurrency(id: string) {
    if (!confirm("Permanently delete this currency?")) return;

    try {
      await permanentlyDeleteCurrency(id);
      await loadArchived();
      await loadPage();
    } catch (error) {
      console.error("Failed to permanently delete currency:", error);
    }
  }

  async function handleArchiveRate(row: FinanceExchangeRateRow) {
    try {
      await archiveExchangeRate(row.id);
      await loadPage();
    } catch (error) {
      console.error("Failed to archive exchange rate:", error);
    }
  }

  async function handleRestoreRate(row: FinanceExchangeRateRow) {
    try {
      await restoreExchangeRate(row.id);
      await loadPage();
    } catch (error) {
      console.error("Failed to restore exchange rate:", error);
    }
  }

  async function handleHardDeleteRate(row: FinanceExchangeRateRow) {
    if (!confirm("Permanently delete this exchange rate?")) return;

    try {
      await permanentlyDeleteExchangeRate(row.id);
      await loadPage();
    } catch (error) {
      console.error("Failed to permanently delete exchange rate:", error);
    }
  }

  const handleConvertLive = useCallback(async () => {
    try {
      setConversionLoading(true);
      setConversionError(null);

      const numericAmount = Number(convertAmount);

      const result = await convertCurrencyLive(
        numericAmount,
        convertFrom,
        convertTo,
      );

      setConversionResult(result);
    } catch (error) {
      setConversionResult(null);
      setConversionError(
        error instanceof Error ? error.message : "Failed to fetch",
      );
    } finally {
      setConversionLoading(false);
    }
  }, [convertAmount, convertFrom, convertTo]);

  return (
    <>
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
                    Rates / Currency
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white">
                    Rates / Currency
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                    Manage allowed currencies, maintain stored exchange rates,
                    and use a live converter for quick reference.
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

                {canCreate ? (
                  <>
                    <Button
                      onClick={openCreateCurrencyDialog}
                      className="h-11 rounded-2xl px-4 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Currency
                    </Button>

                    <Button
                      variant="outline"
                      onClick={openCreateRateDialog}
                      className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Exchange Rate
                    </Button>
                  </>
                ) : null}

                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setArchiveDialogOpen(true);
                      await loadArchived();
                    }}
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    Archive
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => void loadPage()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          {!loading && !canView ? (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
              You do not have permission to view this module.
            </div>
          ) : null}

          {canView || loading ? (
            <>
              <section>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Active Currencies
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {loading ? "—" : activeCurrencies.length.toLocaleString()}
                      </div>
                      <div className="mt-2 text-sm text-white/50">
                        Available for finance operations
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Base Currency
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {loading ? "—" : baseCurrency?.currency_code ?? "—"}
                      </div>
                      <div className="mt-2 text-sm text-white/50">
                        {baseCurrency?.currency_name ?? "No base currency set"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Latest Stored Rate
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {loading
                          ? "—"
                          : latestStoredRate
                            ? `${latestStoredRate.from_currency_code}/${latestStoredRate.to_currency_code}`
                            : "—"}
                      </div>
                      <div className="mt-2 text-sm text-white/50">
                        {latestStoredRate
                          ? formatDateLabel(latestStoredRate.effective_date)
                          : "No stored rate found"}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <div className="border-b border-white/8 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                        Live Converter
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold text-white">
                      Live Currency Converter
                    </h2>
                    <p className="text-sm text-white/45">
                      Use live rates for quick conversion. This tool does not replace
                      your stored exchange-rate history.
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                        Amount
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={convertAmount}
                        onChange={(event) => setConvertAmount(event.target.value)}
                        className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                        From
                      </div>
                      <select
                        value={convertFrom}
                        onChange={(event) => setConvertFrom(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                      >
                        {activeCurrencies.map((row) => (
                          <option key={row.id} value={row.currency_code}>
                            {row.currency_code} — {row.currency_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                        To
                      </div>
                      <select
                        value={convertTo}
                        onChange={(event) => setConvertTo(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                      >
                        {activeCurrencies.map((row) => (
                          <option key={row.id} value={row.currency_code}>
                            {row.currency_code} — {row.currency_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => void handleConvertLive()}
                        disabled={conversionLoading || activeCurrencies.length === 0}
                        className="h-11 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                      >
                        {conversionLoading ? "Converting..." : "Convert"}
                      </Button>
                    </div>
                  </div>

                  {conversionError ? (
                    <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {conversionError}
                    </div>
                  ) : null}

                  {conversionResult ? (
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="text-lg font-semibold text-white">
                        {formatNumberLabel(convertAmount, 6)} {convertFrom} ={" "}
                        {formatNumberLabel(conversionResult.convertedAmount, 6)}{" "}
                        {convertTo}
                      </div>
                      <div className="mt-2 text-sm text-emerald-100/90">
                        Rate: 1 {convertFrom} ={" "}
                        {formatNumberLabel(conversionResult.rate, 6)} {convertTo}
                      </div>
                      <div className="mt-1 text-xs text-emerald-100/70">
                        Source: Frankfurter • Date: {conversionResult.date}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.95fr)]">
                <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardHeader className="border-b border-white/8 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                          Currency Registry
                        </Badge>
                        <CardTitle className="text-white">
                          Currency Master Data
                        </CardTitle>
                        <CardDescription className="text-white/45">
                          Allowed currencies for the finance engine.
                        </CardDescription>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                        {filteredCurrencies.length} rows
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px]">
                        <thead>
                          <tr className="border-b border-white/8 text-left">
                            {[
                              "Code",
                              "Name",
                              "Symbol",
                              "Decimals",
                              "Base",
                              "Status",
                              "Updated",
                              "Actions",
                            ].map((label) => (
                              <th
                                key={label}
                                className="px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/38"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={8} className="px-5 py-10 text-sm text-white/50">
                                Loading currencies...
                              </td>
                            </tr>
                          ) : filteredCurrencies.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-5 py-10 text-sm text-white/50">
                                No currencies found.
                              </td>
                            </tr>
                          ) : (
                            filteredCurrencies.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-white/6 last:border-b-0"
                              >
                                <td className="px-5 py-4 text-sm font-medium text-white">
                                  {row.currency_code}
                                </td>

                                <td className="px-5 py-4 text-sm text-white">
                                  {row.currency_name}
                                </td>

                                <td className="px-5 py-4 text-sm text-white/55">
                                  {row.currency_symbol || "—"}
                                </td>

                                <td className="px-5 py-4 text-sm text-white/55">
                                  {row.decimal_places}
                                </td>

                                <td className="px-5 py-4">
                                  {row.is_base_currency ? (
                                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                                      Base
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-white/35">—</span>
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  <Badge className={getStatusBadgeClass(row.status)}>
                                    {row.status}
                                  </Badge>
                                </td>

                                <td className="px-5 py-4 text-sm text-white/45">
                                  {formatDateLabel(row.updated_at)}
                                </td>

                                <td className="px-5 py-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48 border-white/10 bg-[#101522] text-white"
                                    >
                                      {canEdit ? (
                                        <DropdownMenuItem
                                          onClick={() => openEditCurrencyDialog(row)}
                                        >
                                          Edit
                                        </DropdownMenuItem>
                                      ) : null}

                                      {canArchive ? (
                                        row.status === "archived" ? (
                                          <DropdownMenuItem
                                            onClick={() => void handleRestoreCurrency(row.id)}
                                          >
                                            Restore
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            onClick={() => void handleArchiveCurrency(row)}
                                          >
                                            Delete
                                          </DropdownMenuItem>
                                        )
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardHeader className="border-b border-white/8 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                          Rate Snapshots
                        </Badge>
                        <CardTitle className="text-white">
                          Stored Exchange Rates
                        </CardTitle>
                        <CardDescription className="text-white/45">
                          Current database snapshots for rate history and audit.
                        </CardDescription>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                        {filteredExchangeRates.length} rows
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5">
                    <div className="space-y-3">
                      {loading ? (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-8 text-center text-slate-400">
                          Loading exchange rates...
                        </div>
                      ) : filteredExchangeRates.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-8 text-center text-slate-400">
                          No stored exchange rates found.
                        </div>
                      ) : (
                        filteredExchangeRates.map((row) => (
                          <div
                            key={row.id}
                            className="rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm text-white/50">
                                  {row.from_currency_code} → {row.to_currency_code}
                                </div>
                                <div className="mt-1 text-xl font-semibold text-white">
                                  {formatNumberLabel(row.exchange_rate, 8)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge className={getStatusBadgeClass(row.status)}>
                                  {row.status}
                                </Badge>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48 border-white/10 bg-[#101522] text-white"
                                  >
                                    {canEdit ? (
                                      <DropdownMenuItem
                                        onClick={() => openEditRateDialog(row)}
                                      >
                                        Edit
                                      </DropdownMenuItem>
                                    ) : null}

                                    {canArchive ? (
                                      row.status === "archived" ? (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => void handleRestoreRate(row)}
                                          >
                                            Restore
                                          </DropdownMenuItem>

                                          <DropdownMenuItem
                                            onClick={() => void handleHardDeleteRate(row)}
                                            className="text-red-400 focus:text-red-400"
                                          >
                                            Hard Delete
                                          </DropdownMenuItem>
                                        </>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => void handleArchiveRate(row)}
                                        >
                                          Delete
                                        </DropdownMenuItem>
                                      )
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm text-white/60">
                              <div>
                                Effective date:{" "}
                                <span className="text-white">
                                  {formatDateLabel(row.effective_date)}
                                </span>
                              </div>
                              <div>
                                Notes:{" "}
                                <span className="text-white/80">{row.notes || "—"}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0f1726] text-white sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>
              {editingCurrency ? "Edit Currency" : "Create Currency"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Configure allowed currencies for the finance system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Currency Code
                </div>
                <Input
                  value={currencyForm.currency_code}
                  onChange={(e) =>
                    setCurrencyForm((prev) =>
                      applyCurrencyPreset(prev, e.target.value),
                    )
                  }
                  placeholder="Automatic from code"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Currency Name
                </div>
                <Input
                  value={currencyForm.currency_name}
                  onChange={(e) =>
                    setCurrencyForm((p) => ({ ...p, currency_name: e.target.value }))
                  }
                  placeholder="Currency name"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Currency Symbol
                </div>
                <Input
                  value={currencyForm.currency_symbol}
                  onChange={(e) =>
                    setCurrencyForm((p) => ({ ...p, currency_symbol: e.target.value }))
                  }
                  placeholder="Automatic from code"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Decimal Places
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={currencyForm.decimal_places}
                  onChange={(e) =>
                    setCurrencyForm((p) => ({ ...p, decimal_places: e.target.value }))
                  }
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
              <input
                id="currency-base"
                type="checkbox"
                checked={currencyForm.is_base_currency}
                onChange={(e) =>
                  setCurrencyForm((p) => ({
                    ...p,
                    is_base_currency: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              <label htmlFor="currency-base" className="text-sm text-white/80">
                Set as base currency
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                Notes
              </div>
              <Input
                value={currencyForm.notes}
                onChange={(e) =>
                  setCurrencyForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Optional notes"
                className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
              />
            </div>

            <div className="flex gap-2">
              {(["active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCurrencyForm((p) => ({ ...p, status: value }))
                  }
                  className={`h-10 rounded-2xl border-white/10 px-4 text-white ${
                    currencyForm.status === value
                      ? "bg-white/10"
                      : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value}
                </Button>
              ))}
            </div>

            {currencyError ? (
              <div className="text-sm text-red-400">{currencyError}</div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCurrencyDialogOpen(false)}
              className="h-11 rounded-2xl border-white/10 bg-black/15 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleSaveCurrency()}
              disabled={savingCurrency || !(editingCurrency ? canEdit : canCreate)}
              className="h-11 rounded-2xl px-4 text-white"
            >
              {savingCurrency
                ? "Saving..."
                : editingCurrency
                  ? "Save Changes"
                  : "Create Currency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0f1726] text-white sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Exchange Rate" : "Create Exchange Rate"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Store exchange-rate snapshots for audit and finance workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  From Currency
                </div>
                <select
                  value={rateForm.from_currency_code}
                  onChange={(e) =>
                    setRateForm((p) => ({
                      ...p,
                      from_currency_code: e.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">From currency</option>
                  {activeCurrencies.map((row) => (
                    <option key={`from-${row.id}`} value={row.currency_code}>
                      {row.currency_code} — {row.currency_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  To Currency
                </div>
                <select
                  value={rateForm.to_currency_code}
                  onChange={(e) =>
                    setRateForm((p) => ({
                      ...p,
                      to_currency_code: e.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">To currency</option>
                  {activeCurrencies.map((row) => (
                    <option key={`to-${row.id}`} value={row.currency_code}>
                      {row.currency_code} — {row.currency_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Exchange Rate
                </div>
                <Input
                  value={rateForm.exchange_rate}
                  onChange={(e) =>
                    setRateForm((p) => ({ ...p, exchange_rate: e.target.value }))
                  }
                  placeholder="Exchange rate"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Effective Date
                </div>
                <Input
                  type="date"
                  value={rateForm.effective_date}
                  onChange={(e) =>
                    setRateForm((p) => ({ ...p, effective_date: e.target.value }))
                  }
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                Notes
              </div>
              <Input
                value={rateForm.notes}
                onChange={(e) =>
                  setRateForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Optional notes"
                className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
              />
            </div>

            <div className="flex gap-2">
              {(["active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setRateForm((p) => ({ ...p, status: value }))}
                  className={`h-10 rounded-2xl border-white/10 px-4 text-white ${
                    rateForm.status === value
                      ? "bg-white/10"
                      : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value}
                </Button>
              ))}
            </div>

            {rateError ? <div className="text-sm text-red-400">{rateError}</div> : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRateDialogOpen(false)}
              className="h-11 rounded-2xl border-white/10 bg-black/15 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleSaveRate()}
              disabled={savingRate || !(editingRate ? canEdit : canCreate)}
              className="h-11 rounded-2xl px-4 text-white"
            >
              {savingRate
                ? "Saving..."
                : editingRate
                  ? "Save Changes"
                  : "Create Exchange Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {archiveDialogOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-black/90">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-lg font-semibold text-white">
                Archived Currencies
              </div>

              <Button
                variant="outline"
                onClick={() => setArchiveDialogOpen(false)}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
              >
                Close
              </Button>
            </div>

            <div className="border-b border-white/10 p-4">
              <Input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Search archived..."
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
              />
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {archiveLoading ? (
                <div className="text-sm text-white/50">Loading...</div>
              ) : filteredArchivedCurrencies.length === 0 ? (
                <div className="text-sm text-white/50">No archived currencies</div>
              ) : (
                filteredArchivedCurrencies.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-[20px] border border-white/10 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {row.currency_name}
                      </div>
                      <div className="text-sm text-white/40">
                        {row.currency_code}
                        {row.currency_symbol ? ` · ${row.currency_symbol}` : ""}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openEditCurrencyDialog(row)}
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                      >
                        Open
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleRestoreCurrency(row.id)}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100"
                      >
                        Restore
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleHardDeleteCurrency(row.id)}
                        className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
