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

type FinanceRevenueCategoryRow = {
  id: string;
  name: string;
  description: string | null;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export default function FinanceRevenueCategoriesPage() {
  const navigate = useNavigate();

  const [revenueCategories, setRevenueCategories] = useState<
    FinanceRevenueCategoryRow[]
  >([]);
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
        .from("finance_revenue_categories")
        .select("id, name, description")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setRevenueCategories((data || []) as FinanceRevenueCategoryRow[]);
    } catch (error) {
      console.error("Failed to load revenue categories:", error);
    } finally {
      setLoading(false);
    }
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateRevenueCategories = !!permissions?.createFinanceRecords;

  async function handleCreateRevenueCategory() {
    if (!canCreateRevenueCategories) {
      setSaveError("You do not have permission to create finance records");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setSaveError("Revenue category name is required");
      return;
    }

    try {
      setCreating(true);
      setSaveError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("finance_revenue_categories")
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

      setRevenueCategories(
        (prev) => [data as FinanceRevenueCategoryRow, ...prev]
      );
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Failed to create revenue category:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to create revenue category"
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
            Finance — Revenue Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage finance revenue categories.
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
            onClick={() => navigate("/finance/expense-categories")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Expense Categories
          </Button>
        </div>
      </div>

      {canCreateRevenueCategories ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="flex flex-col gap-3">
            <div className="text-white font-medium">Create Revenue Category</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Revenue category name"
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
                onClick={() => void handleCreateRevenueCategory()}
                disabled={creating}
                className="text-white"
              >
                {creating ? "Creating..." : "Create Revenue Category"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          You can view revenue categories, but you do not have permission to create finance records.
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : revenueCategories.length === 0 ? (
          <div className="text-muted-foreground">No revenue categories yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {revenueCategories.map((category) => (
              <div
                key={category.id}
                className="border border-border rounded-lg p-3 bg-background/40"
              >
                <div className="text-white font-medium">{category.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {category.description || "No description"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
