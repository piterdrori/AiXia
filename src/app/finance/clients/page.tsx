import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getClients,
  createClient,
  updateClient,
  archiveClient,
} from "@/lib/finance/clients";
import type { FinanceClient } from "@/lib/finance/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function FinanceClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [archivingClientId, setArchivingClientId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [saveError, setSaveError] = useState("");

  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editError, setEditError] = useState("");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
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

      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  }

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateClients = !!effectivePermissions?.createFinanceRecords;
  const canEditClients = !!effectivePermissions?.editFinanceRecords;
  const canArchiveClients = !!effectivePermissions?.archiveFinanceRecords;

  async function handleCreateClient() {
    if (!canCreateClients) {
      setSaveError("You do not have permission to create finance records");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedContactPerson = contactPerson.trim();

    if (!trimmedName) {
      setSaveError("Client name is required");
      return;
    }

    try {
      setCreating(true);
      setSaveError("");

      const created = await createClient({
        name: trimmedName,
        email: trimmedEmail || null,
        contact_person: trimmedContactPerson || null,
        status: "active",
      });

      setClients((prev) => [created, ...prev]);
      setName("");
      setEmail("");
      setContactPerson("");
    } catch (error) {
      console.error("Failed to create client:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to create client"
      );
    } finally {
      setCreating(false);
    }
  }

  function startEditClient(client: FinanceClient) {
    setEditingClientId(client.id);
    setEditName(client.name ?? "");
    setEditEmail(client.email ?? "");
    setEditContactPerson(client.contact_person ?? "");
    setEditError("");
  }

  function cancelEditClient() {
    setEditingClientId(null);
    setEditName("");
    setEditEmail("");
    setEditContactPerson("");
    setEditError("");
  }

  async function handleSaveClient(clientId: string) {
    if (!canEditClients) {
      setEditError("You do not have permission to edit finance records");
      return;
    }

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedContactPerson = editContactPerson.trim();

    if (!trimmedName) {
      setEditError("Client name is required");
      return;
    }

    try {
      setSavingClientId(clientId);
      setEditError("");

      const updated = await updateClient(clientId, {
        name: trimmedName,
        email: trimmedEmail || null,
        contact_person: trimmedContactPerson || null,
      });

      setClients((prev) =>
        prev.map((client) => (client.id === clientId ? updated : client))
      );

      cancelEditClient();
    } catch (error) {
      console.error("Failed to update client:", error);
      setEditError(
        error instanceof Error ? error.message : "Failed to update client"
      );
    } finally {
      setSavingClientId(null);
    }
  }

  async function handleArchiveClient(clientId: string) {
    if (!canArchiveClients) {
      return;
    }

    try {
      setArchivingClientId(clientId);

      const archived = await archiveClient(clientId);

      setClients((prev) =>
        prev.map((client) => (client.id === clientId ? archived : client))
      );

      if (editingClientId === clientId) {
        cancelEditClient();
      }
    } catch (error) {
      console.error("Failed to archive client:", error);
    } finally {
      setArchivingClientId(null);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Finance — Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage finance clients and billing entities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Finance Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/vendors")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Vendors
          </Button>
        </div>
      </div>

      {canCreateClients ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="flex flex-col gap-3">
            <div className="text-white font-medium">Create Client</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name"
                className="border-border bg-background/60 text-white"
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Client email"
                className="border-border bg-background/60 text-white"
              />
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contact person"
                className="border-border bg-background/60 text-white"
              />
            </div>

            {saveError ? (
              <div className="text-sm text-red-400">{saveError}</div>
            ) : null}

            <div className="flex justify-start">
              <Button
                onClick={() => void handleCreateClient()}
                disabled={creating}
                className="text-white"
              >
                {creating ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          You can view clients, but you do not have permission to create finance
          records.
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-muted-foreground">No clients yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map((client) => {
              const isEditing = editingClientId === client.id;
              const isSaving = savingClientId === client.id;
              const isArchiving = archivingClientId === client.id;
              const isArchived = client.status === "archived";

              return (
                <div
                  key={client.id}
                  className="border border-border rounded-lg p-4 bg-background/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Client name"
                            className="border-border bg-background/60 text-white"
                          />
                          <Input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Client email"
                            className="border-border bg-background/60 text-white"
                          />
                          <Input
                            value={editContactPerson}
                            onChange={(e) => setEditContactPerson(e.target.value)}
                            placeholder="Contact person"
                            className="border-border bg-background/60 text-white"
                          />

                          {editError ? (
                            <div className="text-sm text-red-400">{editError}</div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => void handleSaveClient(client.id)}
                              disabled={isSaving}
                              className="text-white"
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditClient}
                              disabled={isSaving}
                              className="border-border bg-background/40 text-white hover:bg-background/60"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-white font-medium">
                              {client.name}
                            </div>
                            <div
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                isArchived
                                  ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                                  : "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                              }`}
                            >
                              {isArchived ? "Archived" : "Active"}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {client.email || "No email"}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {client.contact_person || "No contact person"}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Comments and attachments hooks will connect here later.
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {canEditClients && !isArchived ? (
                          <Button
                            variant="outline"
                            onClick={() => startEditClient(client)}
                            className="border-border bg-background/40 text-white hover:bg-background/60"
                          >
                            Edit
                          </Button>
                        ) : null}

                        {canArchiveClients && !isArchived ? (
                          <Button
                            variant="outline"
                            onClick={() => void handleArchiveClient(client.id)}
                            disabled={isArchiving}
                            className="border-border bg-background/40 text-white hover:bg-background/60"
                          >
                            {isArchiving ? "Archiving..." : "Archive"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
