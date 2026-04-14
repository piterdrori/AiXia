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
  getVendorBankAccounts,
  getArchivedVendorBankAccounts,
  archiveVendorBankAccount,
  restoreVendorBankAccount,
  permanentlyDeleteVendorBankAccount,
  type FinanceVendorBankAccountListRow,
} from "@/lib/finance/vendor-bank-accounts";

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

export default function FinanceMasterDataVendorBankAccountsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceVendorBankAccountListRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [archivingId, setArchivingId] = useState<string | null>(null);

  const [showArchive, setShowArchive] = useState(false);
  const [archivedRows, setArchivedRows] = useState<
    FinanceVendorBankAccountListRow[]
  >([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

 const [role, setRole] = useState<Role | null>(null);
const [permissionOverrides, setPermissionOverrides] = useState<
  Partial<Record<Permission, boolean>> | null
>(null);
const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>(
  {}
);

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

      const data = await getVendorBankAccounts();
      setRows(data);
    } catch (e) {
      console.error("Failed to load vendor bank accounts:", e);
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
        r.vendor_code,
        r.vendor_name,
        r.vendor_legal_name,
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
  const map = new Map<string, FinanceVendorBankAccountListRow[]>();

  filtered.forEach((row) => {
    const key = row.vendor_id || "unknown";

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(row);
  });

  return Array.from(map.entries());
}, [filtered]);

function toggleVendor(vendorId: string) {
  setExpandedVendors((prev) => ({
    ...prev,
    [vendorId]: !prev[vendorId],
  }));
}

  const counts = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      archived: rows.filter((r) => r.status === "archived").length,
    };
  }, [rows]);

  useEffect(() => {
  const next: Record<string, boolean> = {};

  grouped.forEach(([vendorId]) => {
    next[vendorId] = true; // default expanded
  });

  setExpandedVendors(next);
}, [grouped]);

  const filteredArchived = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();

    return archivedRows.filter((r) => {
      if (!q) return true;

      return (
        r.bank_id?.toLowerCase().includes(q) ||
        r.vendor_code?.toLowerCase().includes(q) ||
        r.vendor_name?.toLowerCase().includes(q) ||
        r.vendor_legal_name?.toLowerCase().includes(q) ||
        r.bank_name?.toLowerCase().includes(q)
      );
    });
  }, [archivedRows, archiveSearch]);

  async function loadArchived() {
    try {
      setArchiveLoading(true);
      const data = await getArchivedVendorBankAccounts();
      setArchivedRows(data);
    } catch (e) {
      console.error("Failed to load archived vendor bank accounts:", e);
      setArchivedRows([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreVendorBankAccount(id);
      await loadArchived();
      await loadRows();
    } catch (e) {
      console.error("Failed to restore vendor bank account:", e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this vendor bank account?")) return;

    try {
      await permanentlyDeleteVendorBankAccount(id);
      await loadArchived();
      await loadRows();
    } catch (e) {
      console.error("Failed to permanently delete vendor bank account:", e);
    }
  }

  async function handleArchive(id: string) {
    if (!canArchive) return;

    try {
      setArchivingId(id);
      const archived = await archiveVendorBankAccount(id);

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
      console.error("Failed to archive vendor bank account:", e);
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <>
      <div className="flex h-[calc(100vh-140px)] min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

            <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                  Master Data
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Vendor Bank Accounts
                </h1>

                <div className="mt-2 text-sm text-white/45">
                  Manage vendor-linked bank accounts for AP payment operations.
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/master-data")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {canCreate ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate("/finance/master-data/vendor-bank-accounts/new")
                    }
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Vendor Bank Account
                  </Button>
                ) : null}

                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setShowArchive(true);
                      await loadArchived();
                    }}
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    Archive
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => void loadRows()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
            <section>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Total Accounts
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {counts.total.toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Full vendor bank account registry
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Active
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {counts.active.toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Available for finance operations
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Archived
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {counts.archived.toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Hidden from new operational use
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="min-h-0 flex-1 h-full">
              <Card className="flex h-full min-h-[860px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="flex-shrink-0 border-b border-white/8 pb-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-2">
                      <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                        Vendor Bank Account Registry
                      </Badge>
                      <CardTitle className="text-white">
                        Finance Vendor Bank Account Records
                      </CardTitle>
                      <CardDescription className="text-white/45">
                        Vendor linkage, banking details, currency, and lifecycle
                        status.
                      </CardDescription>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative min-w-[260px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search active vendor bank accounts"
                          className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                  {isLoading ? (
                    <div className="p-6 text-sm text-white/50">
                      Loading vendor bank accounts...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                      <div className="max-w-md text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-white">
                          No vendor bank accounts found
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/50">
                          Create your first vendor bank account to start building
                          the payment account registry.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 min-h-[700px]">
                      <div className="space-y-3">

             {grouped.map(([vendorId, vendorAccounts]) => {
  const first = vendorAccounts[0];

  const vendorDisplayName =
    first.vendor_legal_name || first.vendor_name || "—";

  return (
    <div key={vendorId} className="space-y-3">
      
      {/* 🔹 Vendor Header */}
      <div
  className="flex items-center justify-between px-2 cursor-pointer"
  onClick={() => toggleVendor(vendorId)}
>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
  {expandedVendors[vendorId] ? (
    <ChevronDown className="h-4 w-4 text-white/40" />
  ) : (
    <ChevronRight className="h-4 w-4 text-white/40" />
  )}
  {vendorDisplayName}
</div>

        <Badge className="border-white/10 bg-white/5 text-white">
          {vendorAccounts.length} Account
          {vendorAccounts.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* 🔹 Accounts */}
      {expandedVendors[vendorId] &&
  vendorAccounts.map((row) => (
        <div
          key={row.id}
          className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            
            <div className="min-w-0 flex-1">
              
              {/* badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70">
                  {row.bank_id || "No bank ID"}
                </Badge>

                <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70">
                  {row.vendor_code || "No vendor code"}
                </Badge>

                {row.is_default && (
                  <Badge className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
                    Default
                  </Badge>
                )}

                <Badge
                  className={`rounded-full px-2.5 py-1 text-[11px] ${getStatusTone(
                    row.status
                  )}`}
                >
                  {row.status}
                </Badge>
              </div>

              {/* content */}
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                <div className="min-w-[220px] text-sm text-white/55">
                  <div className="text-white/35">Bank</div>
                  <div className="mt-1">{row.bank_name || "—"}</div>
                </div>

                <div className="min-w-[160px] text-sm text-white/55">
                  <div className="text-white/35">Currency</div>
                  <div className="mt-1">{row.currency_code || "—"}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs text-white/35">Country</div>
                  <div className="mt-2 text-sm text-white">
                    {row.country || "—"}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs text-white/35">City</div>
                  <div className="mt-2 text-sm text-white">
                    {row.city || "—"}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs text-white/35">Created</div>
                  <div className="mt-2 text-sm text-white">
                    {formatDateLabel(row.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="flex shrink-0 gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/finance/master-data/vendor-bank-accounts/${row.id}`
                  )
                }
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
              >
                Open / Edit
              </Button>

              {canArchive && (
                <Button
                  variant="outline"
                  onClick={() => void handleArchive(row.id)}
                  disabled={archivingId === row.id}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
                >
                  {archivingId === row.id
                    ? "Archiving..."
                    : "Remove / Delete"}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>                        

      {showArchive && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-black/90">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-lg font-semibold text-white">
                Archived Vendor Bank Accounts
              </div>

              <Button
                variant="outline"
                onClick={() => setShowArchive(false)}
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
              ) : filteredArchived.length === 0 ? (
                <div className="text-sm text-white/50">
                  No archived vendor bank accounts
                </div>
              ) : (
                filteredArchived.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-[20px] border border-white/10 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {row.bank_name || row.bank_id}
                      </div>
                      <div className="text-sm text-white/40">
                        {(row.vendor_legal_name || row.vendor_name || "—") +
                          (row.vendor_code ? ` • ${row.vendor_code}` : "")}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/master-data/vendor-bank-accounts/${row.id}`
                          )
                        }
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                      >
                        Open
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleRestore(row.id)}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100"
                      >
                        Restore
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleDelete(row.id)}
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
      )}
    </>
  );
}
