import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClients, createClient } from "@/lib/finance/clients";
import type { FinanceClient } from "@/lib/finance/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FinanceClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClient() {
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
      setSaveError(error instanceof Error ? error.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Clients
          </h1>
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

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-muted-foreground">No clients yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="border border-border rounded-lg p-3 bg-background/40"
              >
                <div className="text-white font-medium">{client.name}</div>
                <div className="text-xs text-muted-foreground">
                  {client.email || "No email"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {client.contact_person || "No contact person"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
