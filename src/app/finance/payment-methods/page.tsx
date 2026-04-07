import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type FinancePaymentMethodRow = {
  id: string;
  name: string;
  description: string | null;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export default function FinancePaymentMethodsPage() {
  const navigate = useNavigate();

  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saveError, setSaveError] = useState("");

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

      const { data, error } = await supabase
        .from("finance_payment_methods")
        .select("id, name, description")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPaymentMethods((data || []) as FinancePaymentMethodRow[]);
    } catch (error) {
      console.error("Failed to load payment methods:", error);
    } finally {
      setLoading(false);
    }
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreatePaymentMethods = !!permissions?.createFinanceRecords;

  async function handleCreatePaymentMethod() {
    if (!canCreatePaymentMethods) {
      setSaveError("You do not have permission to create finance records");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setSaveError("Payment method name is required");
      return;
    }

    try {
      setCreating(true);
      setSaveError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("finance_payment_methods")
        .insert({
          name: trimmedName,
          description: trimmedDescription || null,
          status: "active",
          notes: null,
          metadata: {},
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select("id, name, description")
        .single();

      if (error) {
        throw error;
      }

      setPaymentMethods((prev) => [data as FinancePaymentMethodRow, ...prev]);
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Failed to create payment method:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to create payment method"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payment Methods
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage finance payment methods.
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
            onClick={() => navigate("/finance/bank-accounts")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Bank Accounts
          </Button>
        </div>
      </div>

      {canCreatePaymentMethods ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="flex flex-col gap-3">
            <div className="text-white font-medium">Create Payment Method</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payment method name"
                className="border-border bg-background/60 text-white"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="border-border bg-background/60 text-white"
              />
            </div>

            {saveError ? (
              <div className="text-sm text-red-400">{saveError}</div>
            ) : null}

            <div className="flex justify-start">
              <Button
                onClick={() => void handleCreatePaymentMethod()}
                disabled={creating}
                className="text-white"
              >
                {creating ? "Creating..." : "Create Payment Method"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          You can view payment methods, but you do not have permission to create finance records.
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-muted-foreground">No payment methods yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="border border-border rounded-lg p-3 bg-background/40"
              >
                <div className="text-white font-medium">{method.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {method.description || "No description"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
