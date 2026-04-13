import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
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
import { supabase } from "@/lib/supabase";
import {
  archiveCompany,
  getArchivedCompanies,
  getCompanies,
  permanentlyDeleteCompany,
  restoreCompany,
  type FinanceCompanyListRow,
} from "@/lib/finance/companies";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

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

export default function FinanceMasterDataCompaniesPage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<FinanceCompanyListRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [archivingCompanyId, setArchivingCompanyId] = useState<string | null>(
    null
  );
  const [showArchive, setShowArchive] = useState(false);
  const [archivedCompanies, setArchivedCompanies] = useState<
    FinanceCompanyListRow[]
  >([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const loadCompanies = useCallback(async () => {
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
          const typedProfile = profile as ProfilePermissionRow;
          setRole(typedProfile.role);
          setPermissionOverrides(typedProfile.permissions || null);
        }
      }

      const rows = await getCompanies();
      setCompanies(rows);
    } catch (error) {
      console.error("Failed to load finance companies:", error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateCompanies = !!effectivePermissions?.createFinanceRecords;
  const canArchiveCompanies = !!effectivePermissions?.archiveFinanceRecords;

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((company) => {
      if (company.status === "archived") return false;
      if (!query) return true;

      const haystack = [
        company.code,
        company.legal_name,
        company.name,
        company.contact_person,
        company.email,
        company.phone,
        company.country,
        company.city,
        company.currency_code,
        company.company_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [companies, search]);

  const filteredArchived = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedCompanies.filter((company) => {
      if (!query) return true;

      return (
        company.legal_name?.toLowerCase().includes(query) ||
        company.name?.toLowerCase().includes(query) ||
        company.code?.toLowerCase().includes(query) ||
        company.company_code?.toLowerCase().includes(query)
      );
    });
  }, [archivedCompanies, archiveSearch]);

  const counts = useMemo(() => {
    return {
      total: companies.length,
      active: companies.filter((company) => company.status === "active").length,
      archived: companies.filter((company) => company.status === "archived")
        .length,
    };
  }, [companies]);

  async function loadArchived() {
    try {
      setArchiveLoading(true);
      const rows = await getArchivedCompanies();
      setArchivedCompanies(rows);
    } catch (error) {
      console.error("Failed to load archived finance companies:", error);
      setArchivedCompanies([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreCompany(id);
      await loadArchived();
      await loadCompanies();
    } catch (error) {
      console.error("Failed to restore finance company:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this company?")) return;

    try {
      await permanentlyDeleteCompany(id);
      await loadArchived();
      await loadCompanies();
    } catch (error) {
      console.error("Failed to permanently delete finance company:", error);
    }
  }

  async function handleArchiveCompany(companyId: string) {
    if (!canArchiveCompanies) return;

    try {
      setArchivingCompanyId(companyId);
      const archived = await archiveCompany(companyId);

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === companyId
            ? {
                ...company,
                status: archived.status,
                updated_at: archived.updated_at,
              }
            : company
        )
      );
    } catch (error) {
      console.error("Failed to archive finance company:", error);
    } finally {
      setArchivingCompanyId(null);
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
                  Companies
                </h1>

                <div className="mt-2 text-sm text-white/45">
                  Define and manage internal legal entities for finance
                  ownership and accounting structure.
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

                {canCreateCompanies ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate("/finance/master-data/companies/new")
                    }
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Company
                  </Button>
                ) : null}

                {canArchiveCompanies ? (
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
                  onClick={() => void loadCompanies()}
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
                      Total Companies
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {counts.total.toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Full internal company registry
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
                        Company Registry
                      </Badge>
                      <CardTitle className="text-white">
                        Finance Company Records
                      </CardTitle>
                      <CardDescription className="text-white/45">
                        Legal identity, communication, location, currency, and
                        lifecycle status.
                      </CardDescription>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative min-w-[260px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search active companies"
                          className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                  {isLoading ? (
                    <div className="p-6 text-sm text-white/50">
                      Loading companies...
                    </div>
                  ) : filteredCompanies.length === 0 ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                      <div className="max-w-md text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-white">
                          No companies found
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/50">
                          Create your first finance company to start building the
                          internal legal-entity registry.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 min-h-[700px]">
                      <div className="space-y-3">
                        {filteredCompanies.map((company) => {
                          const displayLegalName =
                            company.legal_name || company.name;
                          const displayPhone = company.phone || "—";
                          const displayEmail = company.email || "—";

                          return (
                            <div
                              key={company.id}
                              className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5"
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70 shadow-none">
                                      {company.code || "No code"}
                                    </Badge>

                                    <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70 shadow-none">
                                      {company.company_code || "No company code"}
                                    </Badge>

                                    <Badge
                                      className={`rounded-full px-2.5 py-1 text-[11px] shadow-none ${getStatusTone(
                                        company.status
                                      )}`}
                                    >
                                      {company.status}
                                    </Badge>
                                  </div>

                                  <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
                                    <div className="min-w-[240px]">
                                      <div className="text-lg font-semibold text-white">
                                        {displayLegalName}
                                      </div>
                                      <div className="mt-1 text-sm text-white/50">
                                        Contact: {company.contact_person || "—"}
                                      </div>
                                    </div>

                                    <div className="flex min-w-[220px] items-start gap-2 text-sm text-white/55">
                                      <Mail className="mt-0.5 h-4 w-4 text-white/35" />
                                      <span className="break-all">
                                        {displayEmail}
                                      </span>
                                    </div>

                                    <div className="flex min-w-[180px] items-start gap-2 text-sm text-white/55">
                                      <Phone className="mt-0.5 h-4 w-4 text-white/35" />
                                      <span>{displayPhone}</span>
                                    </div>

                                    <div className="flex min-w-[180px] items-start gap-2 text-sm text-white/55">
                                      <Globe className="mt-0.5 h-4 w-4 text-white/35" />
                                      <span>{company.currency_code || "—"}</span>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                        Country
                                      </div>
                                      <div className="mt-2 text-sm font-medium text-white">
                                        {company.country || "—"}
                                      </div>
                                    </div>

                                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                        City
                                      </div>
                                      <div className="mt-2 text-sm font-medium text-white">
                                        {company.city || "—"}
                                      </div>
                                    </div>

                                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                        Created
                                      </div>
                                      <div className="mt-2 text-sm font-medium text-white">
                                        {formatDateLabel(company.created_at)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-3 xl:pl-4">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/master-data/companies/${company.id}`
                                      )
                                    }
                                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                  >
                                    Open / Edit
                                  </Button>

                                  {canArchiveCompanies ? (
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        void handleArchiveCompany(company.id)
                                      }
                                      disabled={archivingCompanyId === company.id}
                                      className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                    >
                                      {archivingCompanyId === company.id
                                        ? "Archiving..."
                                        : "Remove / Delete"}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
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
                Archived Companies
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {archiveLoading ? (
                <div className="text-sm text-white/50">Loading...</div>
              ) : filteredArchived.length === 0 ? (
                <div className="text-sm text-white/50">
                  No archived companies
                </div>
              ) : (
                filteredArchived.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between rounded-[20px] border border-white/10 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {company.legal_name || company.name}
                      </div>
                      <div className="text-sm text-white/40">
                        {company.code || "No code"}
                        {company.company_code
                          ? ` • ${company.company_code}`
                          : ""}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/master-data/companies/${company.id}`
                          )
                        }
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                      >
                        Open
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleRestore(company.id)}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100"
                      >
                        Restore
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleDelete(company.id)}
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
