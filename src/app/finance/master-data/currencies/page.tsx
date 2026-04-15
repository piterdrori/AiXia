import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: "active" | "inactive" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ExchangeRateRow = {
  id: string;
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: string;
  effective_date: string;
  status: "active" | "inactive" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
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

export default function FinanceMasterDataCurrenciesPage() {
  const navigate = useNavigate();

  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [search, setSearch] = useState("");

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

      const [currenciesResult, exchangeRatesResult] = await Promise.all([
        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status, notes, created_at, updated_at",
          )
          .order("is_base_currency", { ascending: false })
          .order("currency_code", { ascending: true }),
        supabase
          .from("finance_exchange_rates")
          .select(
            "id, from_currency_code, to_currency_code, exchange_rate, effective_date, status, notes, created_at, updated_at",
          )
          .order("effective_date", { ascending: false })
          .order("from_currency_code", { ascending: true })
          .order("to_currency_code", { ascending: true }),
      ]);

      if (currenciesResult.error) throw currenciesResult.error;
      if (exchangeRatesResult.error) throw exchangeRatesResult.error;

      const currencyRows = (currenciesResult.data ?? []) as CurrencyRow[];
      const exchangeRateRows = (exchangeRatesResult.data ?? []) as ExchangeRateRow[];

      setCurrencies(currencyRows);
      setExchangeRates(exchangeRateRows);

      const activeCurrencies = currencyRows.filter(
        (row) => row.status !== "archived",
      );

      const baseCurrency =
        activeCurrencies.find((row) => row.is_base_currency) ?? activeCurrencies[0];

      const secondaryCurrency =
        activeCurrencies.find(
          (row) =>
            row.currency_code !== (baseCurrency?.currency_code ?? "") &&
            row.status === "active",
        ) ?? activeCurrencies[1] ?? activeCurrencies[0];

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

  const visibleCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return currencies.filter((row) => {
      if (!query) return true;

      return (
        row.currency_code.toLowerCase().includes(query) ||
        row.currency_name.toLowerCase().includes(query) ||
        (row.currency_symbol ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [currencies, search]);

  const visibleExchangeRates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exchangeRates.filter((row) => {
      if (!query) return true;

      return (
        row.from_currency_code.toLowerCase().includes(query) ||
        row.to_currency_code.toLowerCase().includes(query) ||
        row.exchange_rate.toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [exchangeRates, search]);

  const activeCurrencies = useMemo(
    () => currencies.filter((row) => row.status === "active"),
    [currencies],
  );

  const activeCurrencyOptions = useMemo(() => {
    return activeCurrencies.map((row) => ({
      code: row.currency_code,
      label: `${row.currency_code} — ${row.currency_name}`,
    }));
  }, [activeCurrencies]);

  const baseCurrency = useMemo(
    () => currencies.find((row) => row.is_base_currency) ?? null,
    [currencies],
  );

  const latestStoredRate = useMemo(() => {
    return exchangeRates.find((row) => row.status === "active") ?? null;
  }, [exchangeRates]);

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
        error instanceof Error ? error.message : "Failed to convert currency.",
      );
    } finally {
      setConversionLoading(false);
    }
  }, [convertAmount, convertFrom, convertTo]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/finance/master-data")}
                className="h-9 w-fit rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/80 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Master Data
              </Button>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Rates / Currency
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  Manage allowed currencies and use a live converter for quick
                  reference. Stored exchange rates stay in your database for
                  audit and future finance workflows.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search currencies or rates"
                className="h-11 min-w-[260px] rounded-xl border-white/10 bg-slate-950/60 text-white placeholder:text-white/35"
              />
              <Button
                type="button"
                onClick={() => void loadPage()}
                variant="outline"
                className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {!loading && !canView ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
            You do not have permission to view this module.
          </div>
        ) : null}

        {canView || loading ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="text-sm text-slate-400">Active currencies</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : activeCurrencies.length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="text-sm text-slate-400">Base currency</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading ? "—" : (baseCurrency?.currency_code ?? "—")}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {baseCurrency?.currency_name ?? "No base currency set"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="text-sm text-slate-400">Latest stored rate</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {loading
                    ? "—"
                    : latestStoredRate
                      ? `${latestStoredRate.from_currency_code}/${latestStoredRate.to_currency_code}`
                      : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {latestStoredRate
                    ? formatDateLabel(latestStoredRate.effective_date)
                    : "No stored rate found"}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">
                  Live Currency Converter
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Use live rates for quick conversion. This tool does not replace
                  your stored exchange-rate history.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Amount
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={convertAmount}
                    onChange={(event) => setConvertAmount(event.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-slate-950/60 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    From
                  </label>
                  <select
                    value={convertFrom}
                    onChange={(event) => setConvertFrom(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {activeCurrencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    To
                  </label>
                  <select
                    value={convertTo}
                    onChange={(event) => setConvertTo(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {activeCurrencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => void handleConvertLive()}
                    disabled={conversionLoading || activeCurrencyOptions.length === 0}
                    className="h-11 w-full rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Currency Master Data
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Allowed currencies for the finance engine.
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-white"
                  >
                    {visibleCurrencies.length} rows
                  </Badge>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
                        <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-400">
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Decimals</th>
                          <th className="px-4 py-3">Base</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-slate-400"
                            >
                              Loading currencies...
                            </td>
                          </tr>
                        ) : visibleCurrencies.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-slate-400"
                            >
                              No currencies found.
                            </td>
                          </tr>
                        ) : (
                          visibleCurrencies.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-white/5 text-white/90"
                            >
                              <td className="px-4 py-3 font-medium text-white">
                                {row.currency_code}
                              </td>
                              <td className="px-4 py-3">
                                <div>{row.currency_name}</div>
                                <div className="text-xs text-slate-400">
                                  Updated {formatDateLabel(row.updated_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {row.currency_symbol || "—"}
                              </td>
                              <td className="px-4 py-3">{row.decimal_places}</td>
                              <td className="px-4 py-3">
                                {row.is_base_currency ? (
                                  <Badge className="border border-cyan-400/20 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/15">
                                    Base
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={
                                    row.status === "active"
                                      ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/15"
                                      : row.status === "inactive"
                                        ? "border border-amber-500/20 bg-amber-500/15 text-amber-100 hover:bg-amber-500/15"
                                        : "border border-white/10 bg-white/10 text-white/80 hover:bg-white/10"
                                  }
                                >
                                  {row.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Stored Exchange Rates
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Current database snapshots for rate history and audit.
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-white"
                  >
                    {visibleExchangeRates.length} rows
                  </Badge>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-8 text-center text-slate-400">
                      Loading exchange rates...
                    </div>
                  ) : visibleExchangeRates.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-8 text-center text-slate-400">
                      No stored exchange rates found.
                    </div>
                  ) : (
                    visibleExchangeRates.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-400">
                              {row.from_currency_code} → {row.to_currency_code}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {formatNumberLabel(row.exchange_rate, 8)}
                            </div>
                          </div>

                          <Badge
                            className={
                              row.status === "active"
                                ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/15"
                                : row.status === "inactive"
                                  ? "border border-amber-500/20 bg-amber-500/15 text-amber-100 hover:bg-amber-500/15"
                                  : "border border-white/10 bg-white/10 text-white/80 hover:bg-white/10"
                            }
                          >
                            {row.status}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-300">
                          <div>
                            Effective date:{" "}
                            <span className="text-white">
                              {formatDateLabel(row.effective_date)}
                            </span>
                          </div>
                          <div>
                            Notes:{" "}
                            <span className="text-white/80">
                              {row.notes || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
