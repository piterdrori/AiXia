import { useEffect, useState } from "react";
import { getClients } from "@/lib/finance/clients";
import type { FinanceClient } from "@/lib/finance/types";

export default function FinanceClientsPage() {
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">
          Finance — Clients
        </h1>
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
                <div className="text-white font-medium">
                  {client.name}
                </div>
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
