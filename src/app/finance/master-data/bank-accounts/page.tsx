import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  getBankAccounts,
  archiveBankAccount,
  type FinanceBankAccountListRow,
} from "@/lib/finance/bankAccounts";

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

function formatDateLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-400/15 bg-emerald-500/10 text-emerald-200";
    case "inactive":
      return "border-amber-400/15 bg-amber-500/10 text-amber-200";
    case "archived":
      return "border-rose-400/15 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/8 text-white/70";
  }
}

export default function FinanceMasterDataBankAccountsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceBankAccountListRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [archivingId, setArchivingId] = useState<string | null>(null);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});

  const loadRows = useCallback(async () => {
    setIsLoading(true);

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
          const typed = profile as ProfilePermissionRow;
          setRole(typed.role);
          setPermissionOverrides(typed.permissions || null);
        }
      }

      const data = await getBankAccounts();
      setRows(data);
    } catch (e) {
      console.error("Failed to load bank accounts:", e);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreate = !!effectivePermissions?.createFinanceRecords;
  const canArchive = !!effectivePermissions?.archiveFinanceRecords;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      if (r.status === "archived") return false;
      if (!q) return true;

      const haystack = [
        r.bank_id,
        r.company_code,
        r.company_name,
        r.company_legal_name,
        r.bank_name,
        r.city,
        r.country,
        r.currency_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, FinanceBankAccountListRow[]>();

    filtered.forEach((row) => {
      const key = row.company_id || "unknown";

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(row);
    });

    return Array.from(map.entries());
  }, [filtered]);

  function toggleCompany(companyId: string) {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  }

  useEffect(() => {
    const next: Record<string, boolean> = {};

    grouped.forEach(([companyId]) => {
      next[companyId] = true;
    });

    setExpandedCompanies(next);
  }, [grouped]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      archived: rows.filter((r) => r.status === "archived").length,
    };
  }, [rows]);

  async function handleArchive(id: string) {
    if (!canArchive) return;

    try {
      setArchivingId(id);
      const archived = await archiveBankAccount(id);

      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: archived.status,
                updated_at: archived.updated_at,
              }
            : row
        )
      );
    } catch (e) {
      console.error("Failed to archive bank account:", e);
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">

        {/* HEADER */}
        <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="relative flex items-center justify-between gap-4 px-5 py-5">

            <div>
              <h1 className="text-2xl font-semibold text-white">
                Company Bank Accounts
              </h1>
              <div className="text-sm text-white/45">
                Manage company bank accounts for payments and treasury.
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {canCreate && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("/finance/master-data/bank-accounts/new")
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bank Account
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => void loadRows()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">

          {/* STATS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-[26px] border border-white/10 bg-white/[0.045]">
              <CardContent className="p-5">
                <div className="text-xs text-white/35">Total</div>
                <div className="text-3xl text-white">{counts.total}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[26px] border border-white/10 bg-white/[0.045]">
              <CardContent className="p-5">
                <div className="text-xs text-white/35">Active</div>
                <div className="text-3xl text-white">{counts.active}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[26px] border border-white/10 bg-white/[0.045]">
              <CardContent className="p-5">
                <div className="text-xs text-white/35">Archived</div>
                <div className="text-3xl text-white">{counts.archived}</div>
              </CardContent>
            </Card>
          </div>

                    {/* MAIN LIST */}
          <Card className="flex flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]">
            <CardHeader className="border-b border-white/8">
              <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                <div>
                  <CardTitle className="text-white">
                    Company Bank Accounts
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Grouped by company
                  </CardDescription>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="text-white/50">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-white/50">
                  No bank accounts found
                </div>
              ) : (
                <div className="space-y-4">

                  {grouped.map(([companyId, companyAccounts]) => {
                    const first = companyAccounts[0];

                    const companyDisplayName =
                      first.company_legal_name ||
                      first.company_name ||
                      "—";

                    return (
                      <div key={companyId} className="space-y-3">

                        {/* COMPANY HEADER */}
                        <div
                          className="flex cursor-pointer items-center justify-between"
                          onClick={() => toggleCompany(companyId)}
                        >
                          <div className="flex items-center gap-2 text-white font-semibold">
                            {expandedCompanies[companyId] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {companyDisplayName}
                          </div>

                          <Badge>
                            {companyAccounts.length} Account
                            {companyAccounts.length === 1 ? "" : "s"}
                          </Badge>
                        </div>

                        {/* ACCOUNTS */}
                        {expandedCompanies[companyId] &&
                          companyAccounts.map((row) => (
                            <div
                              key={row.id}
                              className="rounded-[24px] border border-white/8 p-5"
                            >
                              <div className="flex justify-between">

                                <div>
                                  <div className="flex gap-2 mb-2">
                                    <Badge>{row.bank_id}</Badge>
                                    {row.is_default && (
                                      <Badge className="bg-green-500/20 text-green-200">
                                        Default
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-white">
                                    {row.bank_name || "—"}
                                  </div>

                                  <div className="text-white/50 text-sm">
                                    {row.currency_code} • {row.city} • {row.country}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/master-data/bank-accounts/${row.id}`
                                      )
                                    }
                                    className="text-white"
                                  >
                                    Open
                                  </Button>

                                  {canArchive && (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleArchive(row.id)}
                                      className="text-white"
                                    >
                                      Archive
                                    </Button>
                                  )}
                                </div>

                              </div>
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
         </div>
      </div>
    </div>
  );
}
