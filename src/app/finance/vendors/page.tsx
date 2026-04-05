import { useEffect, useState } from "react";
import { getVendors } from "@/lib/finance/vendors";
import type { FinanceVendor } from "@/lib/finance/types";

export default function FinanceVendorsPage() {
  const [vendors, setVendors] = useState<FinanceVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getVendors();
      setVendors(data);
    } catch (error) {
      console.error("Failed to load vendors:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">
          Finance — Vendors
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : vendors.length === 0 ? (
          <div className="text-muted-foreground">No vendors yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="border border-border rounded-lg p-3 bg-background/40"
              >
                <div className="text-white font-medium">
                  {vendor.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {vendor.email || "No email"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
