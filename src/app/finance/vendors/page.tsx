import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVendors, createVendor } from "@/lib/finance/vendors";
import type { FinanceVendor } from "@/lib/finance/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FinanceVendorsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<FinanceVendor[]>([]);
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
      const data = await getVendors();
      setVendors(data);
    } catch (error) {
      console.error("Failed to load vendors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVendor() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedContactPerson = contactPerson.trim();

    if (!trimmedName) {
      setSaveError("Vendor name is required");
      return;
    }

    try {
      setCreating(true);
      setSaveError("");

      const created = await createVendor({
        name: trimmedName,
        email: trimmedEmail || null,
        contact_person: trimmedContactPerson || null,
        status: "active",
      });

      setVendors((prev) => [created, ...prev]);
      setName("");
      setEmail("");
      setContactPerson("");
    } catch (error) {
      console.error("Failed to create vendor:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to create vendor");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Vendors
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage vendors and payable counterparties.
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
            onClick={() => navigate("/finance/clients")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Clients
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 bg-background/40">
        <div className="flex flex-col gap-3">
          <div className="text-white font-medium">Create Vendor</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vendor name"
              className="border-border bg-background/60 text-white"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vendor email"
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
              onClick={() => void handleCreateVendor()}
              disabled={creating}
              className="text-white"
            >
              {creating ? "Creating..." : "Create Vendor"}
            </Button>
          </div>
        </div>
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
                <div className="text-white font-medium">{vendor.name}</div>
                <div className="text-xs text-muted-foreground">
                  {vendor.email || "No email"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {vendor.contact_person || "No contact person"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
