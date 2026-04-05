import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClients } from "@/lib/finance/clients";
import type { FinanceClient } from "@/lib/finance/types";
import { Button } from "@/components/ui/button";

export default function FinanceClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [loading, setLoading] = useState(true);

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
