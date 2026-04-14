import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import {
  archiveItem,
  createItem,
  getItems,
  permanentlyDeleteItem,
  restoreItem,
  updateItem,
  type FinanceItemRow,
  type FinanceItemStatus,
  type FinanceItemType,
  type ItemUpsertInput,
} from "@/lib/finance/items";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type OptionRow = {
  id: string;
  code?: string | null;
  name: string;
};

type CurrencyOption = {
  code: string;
};

type FormState = {
  code: string;
  name: string;
  status: FinanceItemStatus;
  item_type: FinanceItemType;
  sales_price: string;
  purchase_price: string;
  currency_code: string;
  standard_cost: string;
  last_purchase_cost: string;
  revenue_category_id: string;
  expense_category_id: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  preferred_vendor_id: string;
  is_active_for_sales: boolean;
  is_active_for_purchase: boolean;
  track_inventory: boolean;
  is_manufactured: boolean;
  description: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  item_type: "product",
  sales_price: "0",
  purchase_price: "0",
  currency_code: "",
  standard_cost: "0",
  last_purchase_cost: "0",
  revenue_category_id: "",
  expense_category_id: "",
  tax_code_id: "",
  unit_of_measure_id: "",
  preferred_vendor_id: "",
  is_active_for_sales: true,
  is_active_for_purchase: true,
  track_inventory: false,
  is_manufactured: false,
  description: "",
  notes: "",
};

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoneyLabel(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return numeric.toFixed(2);
}

function generateItemCode(name: string, itemType: FinanceItemType) {
  const normalizedName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  const typePrefixMap: Record<FinanceItemType, string> = {
    product: "PRD",
    service: "SRV",
    component: "CMP",
    assembly: "ASM",
  };

  if (!normalizedName) {
    return typePrefixMap[itemType];
  }

  return `${typePrefixMap[itemType]}_${normalizedName}`;
}

export default function FinanceItemsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceItemRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const [revenueCategories, setRevenueCategories] = useState<OptionRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<OptionRow[]>([]);
  const [taxCodes, setTaxCodes] = useState<OptionRow[]>([]);
  const [units, setUnits] = useState<OptionRow[]>([]);
  const [vendors, setVendors] = useState<OptionRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const loadPage = useCallback(async () => {
    setLoading(true);

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

      const [
        items,
        revenueResult,
        expenseResult,
        taxResult,
        unitsResult,
        vendorResult,
        currenciesResult,
      ] = await Promise.all([
        getItems(),
        supabase.from("finance_revenue_categories").select("id, code, name").eq("status", "active").order("name"),
        supabase.from("finance_expense_categories").select("id, code, name").eq("status", "active").order("name"),
        supabase.from("finance_tax_codes").select("id, code, name").eq("status", "active").order("name"),
        supabase.from("finance_units_of_measure").select("id, code, name").eq("status", "active").order("name"),
        supabase.from("finance_vendors").select("id, code, name").eq("status", "active").order("name"),
        supabase
          .from("finance_exchange_rates")
          .select("from_currency_code, to_currency_code")
          .eq("status", "active")
          .order("from_currency_code"),
      ]);

      setRows(items);
      setRevenueCategories((revenueResult.data ?? []) as OptionRow[]);
      setExpenseCategories((expenseResult.data ?? []) as OptionRow[]);
      setTaxCodes((taxResult.data ?? []) as OptionRow[]);
      setUnits((unitsResult.data ?? []) as OptionRow[]);
            setVendors((vendorResult.data ?? []) as OptionRow[]);

      const distinctCurrencies = Array.from(
        new Set(
          ((currenciesResult.data ?? []) as Array<{
            from_currency_code: string;
            to_currency_code: string;
          }>)
            .flatMap((row) => [row.from_currency_code, row.to_currency_code])
            .filter(Boolean)
        )
      )
        .sort()
        .map((code) => ({ code }));

      setCurrencies(distinctCurrencies);
    } catch (loadError) {
      console.error("Failed to load items:", loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q) ||
        row.item_type.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceItemRow) {
    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status,
      item_type: row.item_type,
      sales_price: row.sales_price,
      purchase_price: row.purchase_price,
      currency_code: row.currency_code ?? "",
      standard_cost: row.standard_cost,
      last_purchase_cost: row.last_purchase_cost,
      revenue_category_id: row.revenue_category_id ?? "",
      expense_category_id: row.expense_category_id ?? "",
      tax_code_id: row.tax_code_id ?? "",
      unit_of_measure_id: row.unit_of_measure_id ?? "",
      preferred_vendor_id: row.preferred_vendor_id ?? "",
      is_active_for_sales: row.is_active_for_sales,
      is_active_for_purchase: row.is_active_for_purchase,
      track_inventory: row.track_inventory,
      is_manufactured: row.is_manufactured,
      description: row.description ?? "",
      notes: row.notes ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: ItemUpsertInput = {
        code: generateItemCode(form.name, form.item_type),
        name: form.name,
        status: form.status,
        item_type: form.item_type,
        sales_price: form.sales_price,
        purchase_price: form.purchase_price,
        currency_code: form.currency_code || null,
        standard_cost: form.standard_cost,
        last_purchase_cost: form.last_purchase_cost,
        revenue_category_id: form.revenue_category_id || null,
        expense_category_id: form.expense_category_id || null,
        tax_code_id: form.tax_code_id || null,
        unit_of_measure_id: form.unit_of_measure_id || null,
        preferred_vendor_id: form.preferred_vendor_id || null,
        is_active_for_sales: form.is_active_for_sales,
        is_active_for_purchase: form.is_active_for_purchase,
        track_inventory: form.track_inventory,
        is_manufactured: form.is_manufactured,
        description: form.description || null,
        notes: form.notes || null,
      };

      if (editingRow) {
        await updateItem(editingRow.id, payload);
      } else {
        await createItem(payload);
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save item:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: FinanceItemRow) {
    try {
      await archiveItem(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive item:", actionError);
    }
  }

  async function handleRestore(row: FinanceItemRow) {
    try {
      await restoreItem(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore item:", actionError);
    }
  }

  async function handleHardDelete(row: FinanceItemRow) {
    try {
      await permanentlyDeleteItem(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete item:", actionError);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70 shadow-none">Master Data</Badge>
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">Items</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Items</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                  Define products, services, components, and assemblies for R&amp;D, manufacturing,
                  invoices, bills, purchasing, and future inventory flows.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("/finance/master-data")} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={() => void loadPage()} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canCreate ? (
                <Button onClick={openCreateDialog} className="h-11 rounded-2xl px-4 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Item
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name, type, description, or notes..."
              className="h-11 max-w-xl rounded-2xl border-white/10 bg-black/15 text-white placeholder:text-white/35"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setStatusFilter(value)}
                  className={`h-11 rounded-2xl border-white/10 px-4 text-white ${
                    statusFilter === value ? "bg-white/10" : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value === "all" ? "All" : value === "active" ? "Active" : value === "inactive" ? "Inactive" : "Archived"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px]">
              <thead>
                <tr className="border-b border-white/8 text-left">
                  {["Code", "Name", "Type", "Sales", "Purchase", "Cost", "Status", "Updated", "Actions"].map((label) => (
                    <th key={label} className="px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/38">{label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-sm text-white/50">Loading items...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-sm text-white/50">No items found.</td></tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/6 last:border-b-0">
                      <td className="px-5 py-4 text-sm font-medium text-white">{row.code ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-white">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-white/55">{row.item_type}</td>
                      <td className="px-5 py-4 text-sm text-white/55">{formatMoneyLabel(row.sales_price)}</td>
                      <td className="px-5 py-4 text-sm text-white/55">{formatMoneyLabel(row.purchase_price)}</td>
                      <td className="px-5 py-4 text-sm text-white/55">{formatMoneyLabel(row.standard_cost)}</td>
                      <td className="px-5 py-4">
                        <Badge className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${
                          row.status === "archived"
                            ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                            : row.status === "inactive"
                            ? "border-slate-400/20 bg-slate-500/10 text-slate-200"
                            : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        }`}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/45">{formatDateLabel(row.updated_at)}</td>
                      <td className="px-5 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#101522] text-white">
                            {canEdit ? <DropdownMenuItem onClick={() => openEditDialog(row)}>Edit</DropdownMenuItem> : null}
                            {canArchive ? (
                              row.status === "archived" ? (
                                <>
                                  <DropdownMenuItem onClick={() => void handleRestore(row)}>Restore</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void handleHardDelete(row)} className="text-red-400 focus:text-red-400">
                                    Hard Delete
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onClick={() => void handleDelete(row)}>Delete</DropdownMenuItem>
                              )
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0f1726] text-white sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Item" : "Create Item"}</DialogTitle>
             <DialogDescription className="text-white/45">
              Build reusable item records for manufacturing, sourcing, procurement, costing, invoicing, and future inventory workflows. Items can carry both sales revenue classification and cost classification.
            </DialogDescription>
                    </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Item Code
                </div>
                <Input
                  value={generateItemCode(form.name, form.item_type)}
                  readOnly
                  placeholder="Auto generated"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white/70"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Name
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Name"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Item Type
                </div>
                <select
                  value={form.item_type}
                  onChange={(e) => setForm((p) => ({ ...p, item_type: e.target.value as FinanceItemType }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                  <option value="component">Component</option>
                  <option value="assembly">Assembly</option>
                </select>
              </div>
            </div>

                        <div className="grid gap-2 sm:grid-cols-4">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Sales Price
                </div>
                <Input
                  value={form.sales_price}
                  onChange={(e) => setForm((p) => ({ ...p, sales_price: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Purchase Price
                </div>
                <Input
                  value={form.purchase_price}
                  onChange={(e) => setForm((p) => ({ ...p, purchase_price: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Standard Cost
                </div>
                <Input
                  value={form.standard_cost}
                  onChange={(e) => setForm((p) => ({ ...p, standard_cost: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Last Purchase Cost
                </div>
                <Input
                  value={form.last_purchase_cost}
                  onChange={(e) => setForm((p) => ({ ...p, last_purchase_cost: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
                />
              </div>
            </div>

             <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Currency
                </div>
                <select
                  value={form.currency_code}
                  onChange={(e) => setForm((p) => ({ ...p, currency_code: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Revenue Category (Sales)
                </div>
                <select
                  value={form.revenue_category_id}
                  onChange={(e) => setForm((p) => ({ ...p, revenue_category_id: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">Revenue category</option>
                  {revenueCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} · ` : ""}{item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Cost / Expense Category
                </div>
                <select
                  value={form.expense_category_id}
                  onChange={(e) => setForm((p) => ({ ...p, expense_category_id: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">Cost / expense category</option>
                  {expenseCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} · ` : ""}{item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

             <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Tax Code
                </div>
                <select
                  value={form.tax_code_id}
                  onChange={(e) => setForm((p) => ({ ...p, tax_code_id: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">Tax code</option>
                  {taxCodes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} · ` : ""}{item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Unit Of Measure
                </div>
                <select
                  value={form.unit_of_measure_id}
                  onChange={(e) => setForm((p) => ({ ...p, unit_of_measure_id: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">Unit of measure</option>
                  {units.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} · ` : ""}{item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Preferred Vendor (Optional / Sourced Items)
                </div>
                <select
                  value={form.preferred_vendor_id}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_vendor_id: e.target.value }))}
                  className="h-11 rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
                >
                  <option value="">No preferred vendor</option>
                  {vendors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} · ` : ""}{item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={form.is_active_for_sales} onChange={(e) => setForm((p) => ({ ...p, is_active_for_sales: e.target.checked }))} className="h-4 w-4" />Active for sales</label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={form.is_active_for_purchase} onChange={(e) => setForm((p) => ({ ...p, is_active_for_purchase: e.target.checked }))} className="h-4 w-4" />Active for purchase</label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={form.track_inventory} onChange={(e) => setForm((p) => ({ ...p, track_inventory: e.target.checked }))} className="h-4 w-4" />Track inventory</label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={form.is_manufactured} onChange={(e) => setForm((p) => ({ ...p, is_manufactured: e.target.checked }))} className="h-4 w-4" />Manufactured item</label>
              <div className="flex gap-2">
                {(["active", "inactive", "archived"] as const).map((value) => (
                  <Button key={value} type="button" variant="outline" onClick={() => setForm((p) => ({ ...p, status: value }))} className={`h-10 rounded-2xl border-white/10 px-4 text-white ${form.status === value ? "bg-white/10" : "bg-black/15 hover:bg-white/10"}`}>
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 rounded-2xl border-white/10 bg-black/15 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !(editingRow ? canEdit : canCreate)} className="h-11 rounded-2xl px-4 text-white">
              {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
