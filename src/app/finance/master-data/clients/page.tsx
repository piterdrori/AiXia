import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Building2
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
  getClients,
  getArchivedClients,
  archiveClient,
  restoreClient,
  permanentlyDeleteClient,
  type FinanceClientListRow,
} from "@/lib/finance/clients";
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

export default function FinanceMasterDataClientsPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<FinanceClientListRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [archivingClientId, setArchivingClientId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedClients, setArchivedClients] = useState<FinanceClientListRow[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const loadClients = useCallback(async () => {
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

      const rows = await getClients();
      setClients(rows);
    } catch (error) {
      console.error("Failed to load finance clients:", error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateClients = !!effectivePermissions?.createFinanceRecords;
  const canArchiveClients = !!effectivePermissions?.archiveFinanceRecords;

   const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (client.status === "archived") return false;

      if (!query) return true;

      const haystack = [
        client.code,
        client.legal_name,
        client.name,
        client.company_related_personnel,
        client.company_email,
        client.personnel_email,
        client.company_phone,
        client.personnel_phone,
        client.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clients, search]);

  
  const filteredArchived = useMemo(() => {
  const q = archiveSearch.toLowerCase().trim();

  return archivedClients.filter((c) => {
    if (!q) return true;

    return (
      c.legal_name?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q)
    );
  });
}, [archivedClients, archiveSearch]);
  
  const counts = useMemo(() => {
    return {
      total: clients.length,
      active: clients.filter((client) => client.status === "active").length,
      archived: clients.filter((client) => client.status === "archived").length,
    };
  }, [clients]);

async function loadArchived() {
  try {
    setArchiveLoading(true);
    const rows = await getArchivedClients();
    setArchivedClients(rows);
  } catch (e) {
    console.error(e);
  } finally {
    setArchiveLoading(false);
  }
}
  
 async function handleRestore(id: string) {
  try {
    await restoreClient(id);
    await loadArchived();
    await loadClients();
  } catch (error) {
    console.error("Failed to restore finance client:", error);
  }
}

async function handleDelete(id: string) {
  if (!confirm("Permanently delete this client?")) return;

  try {
    await permanentlyDeleteClient(id);
    await loadArchived();
    await loadClients();
  } catch (error) {
    console.error("Failed to permanently delete finance client:", error);
  }
}
  
  async function handleArchiveClient(clientId: string) {
    if (!canArchiveClients) return;

    try {
      setArchivingClientId(clientId);
      const archived = await archiveClient(clientId);
      setClients((prev) =>
        prev.map((client) =>
          client.id === clientId
            ? {
                ...client,
                status: archived.status,
                updated_at: archived.updated_at,
              }
            : client
        )
      );
    } catch (error) {
      console.error("Failed to archive finance client:", error);
    } finally {
      setArchivingClientId(null);
    }
  }

  return (
    <>
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
                Clients
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Define and manage finance customers and billing entities.
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

              {canCreateClients ? (
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/master-data/clients/new")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Client
                </Button>
              ) : null}

              {canArchiveClients ? (
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
                onClick={() => void loadClients()}
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
                    Total Clients
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {counts.total.toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm text-white/50">
                    Full finance client registry
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
                      Client Registry
                    </Badge>
                    <CardTitle className="text-white">
                      Finance Client Records
                    </CardTitle>
                     <CardDescription className="text-white/45">
                      Legal identity, communication, location, and lifecycle status.
                    </CardDescription>
                  </div>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-[260px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search active clients"
                        className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {isLoading ? (
                  <div className="p-6 text-sm text-white/50">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                    <div className="max-w-md text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-white">
                        No clients found
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/50">
                        Create your first finance client to start building the client
                        master-data registry.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 min-h-0">
                    <div className="space-y-3">
                      {filteredClients.map((client) => {
                        const displayLegalName = client.legal_name || client.name;
                        const displayPhone =
                          client.personnel_phone || client.company_phone || "—";
                        const displayEmail =
                          client.company_email || client.personnel_email || "—";

                        return (
                          <div
                            key={client.id}
                            className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70 shadow-none">
                                    {client.code || "No code"}
                                  </Badge>
                                  <Badge
                                    className={`rounded-full px-2.5 py-1 text-[11px] shadow-none ${getStatusTone(
                                      client.status
                                    )}`}
                                  >
                                    {client.status}
                                  </Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
                                  <div className="min-w-[240px]">
                                    <div className="text-lg font-semibold text-white">
                                      {displayLegalName}
                                    </div>
                                    <div className="mt-1 text-sm text-white/50">
                                      Contact: {client.company_related_personnel || "—"}
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

                                                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Country
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {client.country || "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                      Created
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {formatDateLabel(client.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                                                            <div className="flex shrink-0 flex-wrap gap-3 xl:pl-4">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    navigate(`/finance/master-data/clients/${client.id}`)
                                  }
                                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                >
                                  Open / Edit
                                </Button>

                                                                {canArchiveClients ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => void handleArchiveClient(client.id)}
                                    disabled={archivingClientId === client.id}
                                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                                  >
                                    {archivingClientId === client.id
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
                Archived Clients
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
                <div className="text-sm text-white/50">No archived clients</div>
              ) : (
                filteredArchived.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-[20px] border border-white/10 p-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {c.legal_name || c.name}
                      </div>
                      <div className="text-sm text-white/40">
                        {c.code || "No code"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/finance/master-data/clients/${c.id}`)
                        }
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                      >
                        Open
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleRestore(c.id)}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100"
                      >
                        Restore
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => void handleDelete(c.id)}
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
