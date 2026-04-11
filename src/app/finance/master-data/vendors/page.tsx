import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
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
  getVendors,
  archiveVendor,
  type FinanceVendorListRow,
} from "@/lib/finance/vendors";
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

export default function FinanceMasterDataVendorsPage() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState<FinanceVendorListRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "archived"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [archivingVendorId, setArchivingVendorId] = useState<string | null>(null);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const loadVendors = useCallback(async () => {
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

      const rows = await getVendors();
      setVendors(rows);
    } catch (error) {
      console.error("Failed to load finance vendors:", error);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateVendors = !!effectivePermissions?.createFinanceRecords;
  const canEditVendors = !!effectivePermissions?.editFinanceRecords;
  const canArchiveVendors = !!effectivePermissions?.archiveFinanceRecords;

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesStatus =
        statusFilter === "all" ? true : vendor.status === statusFilter;

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        vendor.code,
        vendor.legal_name,
        vendor.name,
        vendor.company_related_personnel,
        vendor.company_email,
        vendor.personnel_email,
        vendor.company_phone,
        vendor.personnel_phone,
        vendor.country,
        vendor.currency_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [vendors, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: vendors.length,
      active: vendors.filter((vendor) => vendor.status === "active").length,
      archived: vendors.filter((vendor) => vendor.status === "archived").length,
    };
  }, [vendors]);

  async function handleArchiveVendor(vendorId: string) {
    if (!canArchiveVendors) return;

    try {
      setArchivingVendorId(vendorId);
      const archived = await archiveVendor(vendorId);
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId
            ? {
                ...vendor,
                status: archived.status,
                updated_at: archived.updated_at,
              }
            : vendor
        )
      );
    } catch (error) {
      console.error("Failed to archive finance vendor:", error);
    } finally {
      setArchivingVendorId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Master Data
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Vendors
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Define and manage finance suppliers and vendor entities.
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

              {canCreateVendors ? (
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/master-data/vendors/new")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Vendor
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={() => void loadVendors()}
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
                    Total Vendors
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {counts.total.toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm text-white/50">
                    Full finance vendor registry
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

          <section className="min-h-0 flex-1">
            <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="flex-shrink-0 border-b border-white/8 pb-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="space-y-2">
                    <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                      Vendor Registry
                    </Badge>
                    <CardTitle className="text-white">
                      Finance Vendor Records
                    </CardTitle>
                    <CardDescription className="text-white/45">
                      Legal identity, contact, finance defaults, and lifecycle status.
                    </CardDescription>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-[260px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search vendors"
                        className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as
                            | "all"
                            | "active"
                            | "inactive"
                            | "archived"
                        )
                      }
                      className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                    >
                      <option value="all" className="bg-slate-900">
                        All statuses
                      </option>
                      <option value="active" className="bg-slate-900">
                        Active
                      </option>
                      <option value="inactive" className="bg-slate-900">
                        Inactive
                      </option>
                      <option value="archived" className="bg-slate-900">
                        Archived
                      </option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {isLoading ? (
                  <div className="p-6 text-sm text-white/50">Loading vendors...</div>
                ) : filteredVendors.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                    <div className="max-w-md text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-white">
                        No vendors found
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/50">
                        Create your first finance vendor to start building the vendor
                        master-data registry.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="space-y-3">
                      {filteredVendors.map((vendor) => {
                        const displayLegalName = vendor.legal_name || vendor.name;
                        const displayPhone =
                          vendor.personnel_phone || vendor.company_phone || "—";
                        const displayEmail =
                          vendor.company_email || vendor.personnel_email || "—";

                        return (
                          <div
                            key={vendor.id}
                            className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70 shadow-none">
                                    {vendor.code || "No code"}
                                  </Badge>
                                  <Badge
                                    className={`rounded-full px-2.5 py-1 text-[11px] shadow-none ${getStatusTone(
                                      vendor.status
                                    )}`}
                                  >
                                    {vendor.status}
                                  </Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
                                  <div className="min-w-[240px]">
                                    <div className="text-lg font-semibold text-white">
                                      {displayLegalName}
                                    </div>
                                    <div className="mt-1 text-sm text-white/50">
                                      Contact: {vendor.company_related_personnel || "—"}
                                    </div>
                                  </div>

                                  <div className="flex min-w-[220px] items-start gap-2 text-sm text-white/55">
                                    <Mail className="mt-0.5 h-4 w-4 text-white/35" />
                                    <span className="break-all">{displayEmail}</span>
                                  </div>

                                  <div className="flex min-w-[180px] items-start gap-2 text-sm text-white/55">
                                    <Phone className="mt-0.5 h-4 w-4 text-white/35" />
                                    <span>{displayPhone}</span>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Country
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {vendor.country || "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Currency
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {vendor.currency_code || "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Payment Terms
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {vendor.payment_terms_id || "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Created
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {formatDateLabel(vendor.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-wrap gap-3 xl:pl-4">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    navigate(`/finance/master-data/vendors/${vendor.id}`)
                                  }
                                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                >
                                  Open
                                </Button>

                                {canEditVendors ? (
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/master-data/vendors/${vendor.id}/edit`
                                      )
                                    }
                                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                  >
                                    Edit
                                  </Button>
                                ) : null}

                                {canArchiveVendors && vendor.status !== "archived" ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => void handleArchiveVendor(vendor.id)}
                                    disabled={archivingVendorId === vendor.id}
                                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                  >
                                    {archivingVendorId === vendor.id
                                      ? "Archiving..."
                                      : "Archive"}
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
  );
}
