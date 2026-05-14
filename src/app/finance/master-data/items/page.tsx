import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Edit3,
  Factory,
  Landmark,
  Loader2,
  LockKeyhole,
  Package,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaCurrencyBadge,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaModal,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSelectableTile,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
} from "@/components/aixia";

import { type Permission, type Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
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
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type OptionRow = {
  id: string;
  code?: string | null;
  name: string;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
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

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | FinanceItemType;

type SortKey =
  | "code"
  | "name"
  | "item_type"
  | "sales_price"
  | "purchase_price"
  | "standard_cost"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";

type PageAction =
  | null
  | "create"
  | "edit"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete";

type MetricCardData = {
  key: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type HeaderStatusCardData = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
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

const ITEM_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const;

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyLabel(
  value: string | number | null | undefined,
  currencyCode?: string | null
) {
  const numeric = toNumber(value);

  return `${currencyCode || "—"} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function getDefaultCurrencyCode(currencies: CurrencyOption[]) {
  return (
    currencies.find((currency) => currency.is_base_currency)?.currency_code ||
    currencies[0]?.currency_code ||
    ""
  );
}

function getItemTypeTone(itemType: FinanceItemType) {
  if (itemType === "service") return "cyan";
  if (itemType === "component") return "amber";
  if (itemType === "assembly") return "violet";
  return "emerald";
}

function optionLabel(row: OptionRow) {
  return `${row.code ? `${row.code} · ` : ""}${row.name}`;
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(first: string | number | null | undefined, second: string | number | null | undefined) {
  return toNumber(first) - toNumber(second);
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

async function loadItemEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Items");
}

function CategorySelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionRow[];
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <AixiaFormField>
      <AixiaFieldLabel label={label} />
      <AixiaSelectField
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" className="bg-[#05070d]">
          {placeholder}
        </option>
        {options.map((item) => (
          <option key={item.id} value={item.id} className="bg-[#05070d]">
            {optionLabel(item)}
          </option>
        ))}
      </AixiaSelectField>
    </AixiaFormField>
  );
}

function ItemFormModal({
  open,
  editingRow,
  form,
  revenueCategories,
  expenseCategories,
  taxCodes,
  units,
  vendors,
  currencies,
  saving,
  error,
  canSave,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editingRow: FinanceItemRow | null;
  form: FormState;
  revenueCategories: OptionRow[];
  expenseCategories: OptionRow[];
  taxCodes: OptionRow[];
  units: OptionRow[];
  vendors: OptionRow[];
  currencies: CurrencyOption[];
  saving: boolean;
  error: string | null;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  const itemTypes: Array<{
    value: FinanceItemType;
    label: string;
    description: string;
    icon: LucideIcon;
    tone: "cyan" | "emerald" | "amber" | "violet";
  }> = [
    {
      value: "product",
      label: "Product",
      description: "Sellable or purchasable item.",
      icon: Package,
      tone: "emerald",
    },
    {
      value: "service",
      label: "Service",
      description: "Non-inventory service or work.",
      icon: ShoppingCart,
      tone: "cyan",
    },
    {
      value: "component",
      label: "Component",
      description: "Part used in sourcing or manufacturing.",
      icon: Boxes,
      tone: "amber",
    },
    {
      value: "assembly",
      label: "Assembly",
      description: "Built from components or internal process.",
      icon: Factory,
      tone: "violet",
    },
  ];

  return (
    <AixiaModal
      open={open}
      title={editingRow ? "Edit Item" : "Create Item"}
      description="Build reusable product, service, component, and assembly records for sales, purchasing, costing, manufacturing, and future inventory flows."
      badge={<AixiaBadge tone="cyan">Item Master Data</AixiaBadge>}
      onClose={onClose}
      maxWidthClassName="max-w-6xl"
      footer={
        <>
          <AixiaButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AixiaButton>

          <AixiaButton type="button" variant="primary" onClick={onSave} disabled={saving || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Item"}
          </AixiaButton>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Item Identity"
          description="Type, code, name, status, and core description."
          icon={Package}
        >
          <AixiaReviewGrid variant="metrics">
            {itemTypes.map((item) => (
              <AixiaSelectableTile
                key={item.value}
                title={item.label}
                description={item.description}
                icon={item.icon}
                tone={item.tone}
                selected={form.item_type === item.value}
                disabled={saving}
                onClick={() => onChange("item_type", item.value)}
              />
            ))}
          </AixiaReviewGrid>

          <AixiaFormGrid columns="three" className="mt-5">
            <AixiaFormField>
              <AixiaFieldLabel label="Generated Item Code" />
              <AixiaInputField
                value={generateItemCode(form.name, form.item_type)}
                readOnly
                placeholder="Auto generated"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Item Name" required />
              <AixiaInputField
                value={form.name}
                disabled={saving}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Item name"
              />
            </AixiaFormFullWidth>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" />
              <AixiaSelectField
                value={form.status}
                disabled={saving}
                onChange={(event) =>
                  onChange("status", event.target.value as FinanceItemStatus)
                }
              >
                <option value="active" className="bg-[#05070d]">
                  Active
                </option>
                <option value="inactive" className="bg-[#05070d]">
                  Inactive
                </option>
                <option value="archived" className="bg-[#05070d]">
                  Archived
                </option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                disabled={saving}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Short item description"
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaTextareaField
                value={form.notes}
                disabled={saving}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        <AixiaSection
          title="Sales & Purchase Values"
          description="Pricing, cost, currency, and commercial availability."
          icon={ShoppingCart}
        >
          <AixiaFormGrid columns="three">
            <AixiaFormField>
              <AixiaFieldLabel label="Currency" />
              <AixiaSelectField
                value={form.currency_code}
                disabled={saving}
                onChange={(event) => onChange("currency_code", event.target.value)}
              >
                <option value="" className="bg-[#05070d]">
                  Select currency
                </option>
                {currencies.map((currency) => (
                  <option
                    key={currency.id}
                    value={currency.currency_code}
                    className="bg-[#05070d]"
                  >
                    {currency.currency_code} · {currency.currency_name}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Sales Price" />
              <AixiaInputField
                type="number"
                min="0"
                step="0.01"
                value={form.sales_price}
                disabled={saving}
                onChange={(event) => onChange("sales_price", event.target.value)}
                placeholder="0.00"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Purchase Price" />
              <AixiaInputField
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price}
                disabled={saving}
                onChange={(event) => onChange("purchase_price", event.target.value)}
                placeholder="0.00"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Standard Cost" />
              <AixiaInputField
                type="number"
                min="0"
                step="0.01"
                value={form.standard_cost}
                disabled={saving}
                onChange={(event) => onChange("standard_cost", event.target.value)}
                placeholder="0.00"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Last Purchase Cost" />
              <AixiaInputField
                type="number"
                min="0"
                step="0.01"
                value={form.last_purchase_cost}
                disabled={saving}
                onChange={(event) =>
                  onChange("last_purchase_cost", event.target.value)
                }
                placeholder="0.00"
              />
            </AixiaFormField>
          </AixiaFormGrid>

          <AixiaReviewGrid variant="metrics" className="mt-5">
            <AixiaSelectableTile
              title="Active for Sales"
              description="Can be selected in sales-side documents."
              icon={ShoppingCart}
              tone="emerald"
              selected={form.is_active_for_sales}
              disabled={saving}
              onClick={() => onChange("is_active_for_sales", !form.is_active_for_sales)}
            />

            <AixiaSelectableTile
              title="Active for Purchase"
              description="Can be selected in procurement documents."
              icon={Landmark}
              tone="cyan"
              selected={form.is_active_for_purchase}
              disabled={saving}
              onClick={() =>
                onChange("is_active_for_purchase", !form.is_active_for_purchase)
              }
            />

            <AixiaSelectableTile
              title="Track Inventory"
              description="Reserved for inventory-aware items."
              icon={Boxes}
              tone="amber"
              selected={form.track_inventory}
              disabled={saving}
              onClick={() => onChange("track_inventory", !form.track_inventory)}
            />

            <AixiaSelectableTile
              title="Manufactured Item"
              description="Built internally or assembled from parts."
              icon={Factory}
              tone="violet"
              selected={form.is_manufactured}
              disabled={saving}
              onClick={() => onChange("is_manufactured", !form.is_manufactured)}
            />
          </AixiaReviewGrid>
        </AixiaSection>

        <AixiaSection
          title="Classification Links"
          description="Connect the item to revenue, cost, tax, unit, and vendor master data."
          icon={Landmark}
        >
          <AixiaFormGrid columns="two">
            <CategorySelect
              label="Revenue Category"
              value={form.revenue_category_id}
              options={revenueCategories}
              placeholder="No revenue category"
              disabled={saving}
              onChange={(value) => onChange("revenue_category_id", value)}
            />

            <CategorySelect
              label="Cost / Expense Category"
              value={form.expense_category_id}
              options={expenseCategories}
              placeholder="No cost category"
              disabled={saving}
              onChange={(value) => onChange("expense_category_id", value)}
            />

            <CategorySelect
              label="Tax Code"
              value={form.tax_code_id}
              options={taxCodes}
              placeholder="No tax code"
              disabled={saving}
              onChange={(value) => onChange("tax_code_id", value)}
            />

            <CategorySelect
              label="Unit of Measure"
              value={form.unit_of_measure_id}
              options={units}
              placeholder="No unit selected"
              disabled={saving}
              onChange={(value) => onChange("unit_of_measure_id", value)}
            />

            <AixiaFormFullWidth>
              <CategorySelect
                label="Preferred Vendor"
                value={form.preferred_vendor_id}
                options={vendors}
                placeholder="No preferred vendor"
                disabled={saving}
                onChange={(value) => onChange("preferred_vendor_id", value)}
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      </div>
    </AixiaModal>
  );
}

export default function FinanceItemsPage() {

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);

  const [rows, setRows] = useState<FinanceItemRow[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<OptionRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<OptionRow[]>([]);
  const [taxCodes, setTaxCodes] = useState<OptionRow[]>([]);
  const [units, setUnits] = useState<OptionRow[]>([]);
  const [vendors, setVendors] = useState<OptionRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceItemRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<PageAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent items profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data || null) as ProfilePermissionRow | null;

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent items profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadItemEffectivePermissions(authUserId, mode);

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent items profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent items permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (error) {
      console.error("Failed to load items profile permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadData = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingData(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
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
        supabase
          .from("finance_revenue_categories")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_expense_categories")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_tax_codes")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_units_of_measure")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_vendors")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
          )
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
      ]);

      if (revenueResult.error) throw revenueResult.error;
      if (expenseResult.error) throw expenseResult.error;
      if (taxResult.error) throw taxResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (vendorResult.error) throw vendorResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      setRows(items);
      setRevenueCategories((revenueResult.data ?? []) as OptionRow[]);
      setExpenseCategories((expenseResult.data ?? []) as OptionRow[]);
      setTaxCodes((taxResult.data ?? []) as OptionRow[]);
      setUnits((unitsResult.data ?? []) as OptionRow[]);
      setVendors((vendorResult.data ?? []) as OptionRow[]);
      setCurrencies((currenciesResult.data ?? []) as CurrencyOption[]);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load items:", error);

      if (mode === "initial") {
        setRows([]);
        setRevenueCategories([]);
        setExpenseCategories([]);
        setTaxCodes([]);
        setUnits([]);
        setVendors([]);
        setCurrencies([]);
        setPageError(error instanceof Error ? error.message : "Failed to load items.");
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingData(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadData("initial"),
    ]);
  }, [loadCurrentProfile, loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-items-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_items" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_revenue_categories" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expense_categories" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_tax_codes" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_units_of_measure" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_vendors" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => void loadData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadData("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadData]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: ITEM_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const stats = useMemo(() => {
    return {
      totalVisible: visibleRows.length,
      active: rows.filter((row) => row.status === "active").length,
      sales: visibleRows.filter((row) => row.is_active_for_sales).length,
      purchase: visibleRows.filter((row) => row.is_active_for_purchase).length,
      inventory: visibleRows.filter((row) => row.track_inventory).length,
      manufactured: visibleRows.filter((row) => row.is_manufactured).length,
      archived: archivedRows.length,
    };
  }, [archivedRows.length, rows, visibleRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleRows
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (typeFilter !== "all" && row.item_type !== typeFilter) return false;

        if (!query) return true;

        return [
          row.code,
          row.name,
          row.item_type,
          row.description,
          row.notes,
          row.currency_code,
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "code") comparison = compareStrings(first.code, second.code);
        if (sortKey === "name") comparison = compareStrings(first.name, second.name);
        if (sortKey === "item_type") {
          comparison = compareStrings(first.item_type, second.item_type);
        }
        if (sortKey === "sales_price") {
          comparison = compareNumbers(first.sales_price, second.sales_price);
        }
        if (sortKey === "purchase_price") {
          comparison = compareNumbers(first.purchase_price, second.purchase_price);
        }
        if (sortKey === "standard_cost") {
          comparison = compareNumbers(first.standard_cost, second.standard_cost);
        }
        if (sortKey === "status") comparison = compareStrings(first.status, second.status);
        if (sortKey === "updated_at") {
          comparison = compareDates(first.updated_at, second.updated_at);
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [search, sortDirection, sortKey, statusFilter, typeFilter, visibleRows]);

  const filteredArchivedRows = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedRows
      .filter((row) => {
        if (!query) return true;

        return [
          row.code,
          row.name,
          row.item_type,
          row.description,
          row.notes,
          row.currency_code,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => -compareDates(first.updated_at, second.updated_at));
  }, [archiveSearch, archivedRows]);

  const metricCards = useMemo<MetricCardData[]>(() => {
    return [
      {
        key: "total",
        label: "Visible Items",
        value: isLoadingData ? "—" : formatCount(stats.totalVisible),
        description: "Active and inactive item records.",
        icon: Package,
        tone: "cyan",
      },
      {
        key: "active",
        label: "Active",
        value: isLoadingData ? "—" : formatCount(stats.active),
        description: "Available for selection.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "sales",
        label: "Sales",
        value: isLoadingData ? "—" : formatCount(stats.sales),
        description: "Enabled for sales flows.",
        icon: ShoppingCart,
        tone: "violet",
      },
      {
        key: "purchase",
        label: "Purchase",
        value: isLoadingData ? "—" : formatCount(stats.purchase),
        description: "Enabled for procurement flows.",
        icon: Landmark,
        tone: "amber",
      },
      {
        key: "inventory",
        label: "Inventory",
        value: isLoadingData ? "—" : formatCount(stats.inventory),
        description: "Inventory tracking enabled.",
        icon: Boxes,
        tone: "cyan",
      },
      {
        key: "manufactured",
        label: "Manufactured",
        value: isLoadingData ? "—" : formatCount(stats.manufactured),
        description: "Built or assembled internally.",
        icon: Factory,
        tone: "rose",
      },
    ];
  }, [isLoadingData, stats]);

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        description: "This page requires Finance read access or Master Data admin access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Lifecycle Access",
        value: permissionState.canDeleteArchive
          ? "Archive Enabled"
          : permissionState.canCreate
            ? "Create Enabled"
            : "Read Only",
        description: backgroundRefreshing
          ? "Silent refresh is updating items without resetting filters, table state, or modals."
          : "Create, Edit, Archive, Restore, and Permanent Delete follow Finance permissions.",
        icon: permissionState.canDeleteArchive ? Archive : Landmark,
        tone: permissionState.canDeleteArchive ? "amber" : "cyan",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canCreate,
    permissionState.canDeleteArchive,
    permissionState.canRead,
  ]);

  const isPageLoading = isLoadingProfile || isLoadingData;
  const isActionRunning = Boolean(runningAction);

  function toggleSort(nextKey: SortKey) {
    setSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setSortDirection(nextKey === "updated_at" ? "desc" : "asc");
        return nextKey;
      }

      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return currentKey;
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    if (!permissionState.canCreate) {
      setPageError("Create access is not enabled for this user.");
      return;
    }

    setEditingRow(null);
    setForm({
      ...EMPTY_FORM,
      currency_code: getDefaultCurrencyCode(currencies),
    });
    setFormError(null);
    setPageError(null);
    setPageMessage(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceItemRow) {
    if (!permissionState.canUpdate) {
      setPageError("Update access is not enabled for this user.");
      return;
    }

    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status,
      item_type: row.item_type,
      sales_price: String(row.sales_price ?? "0"),
      purchase_price: String(row.purchase_price ?? "0"),
      currency_code: row.currency_code ?? "",
      standard_cost: String(row.standard_cost ?? "0"),
      last_purchase_cost: String(row.last_purchase_cost ?? "0"),
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
    setFormError(null);
    setPageError(null);
    setPageMessage(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function openArchiveModal() {
    if (!permissionState.canDeleteArchive) return;

    setArchiveModalOpen(true);
    setRunningAction("archive-modal");
    window.setTimeout(() => {
      setRunningAction(null);
    }, 0);
  }

  function closeArchiveModal() {
    setArchiveModalOpen(false);
    setArchiveSearch("");
  }

  async function handleSave() {
    if (!(editingRow ? permissionState.canUpdate : permissionState.canCreate)) return;

    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      setPageError(null);
      setPageMessage(null);

      const payload: ItemUpsertInput = {
        code: generateItemCode(form.name, form.item_type),
        name: form.name.trim(),
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
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingRow) {
        await updateItem(editingRow.id, payload);
        setPageMessage("Item updated successfully.");
      } else {
        await createItem(payload);
        setPageMessage("Item created successfully.");
      }

      closeDialog();
      await loadData("silent");
    } catch (error) {
      console.error("Failed to save item:", error);
      setFormError(error instanceof Error ? error.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinanceItemRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await archiveItem(row.id);
      setPageMessage("Item archived successfully.");
      await loadData("silent");
    } catch (error) {
      console.error("Failed to archive item:", error);
      setPageError(error instanceof Error ? error.message : "Failed to archive item.");
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleRestore(row: FinanceItemRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await restoreItem(row.id);
      setPageMessage("Item restored successfully.");
      await loadData("silent");
    } catch (error) {
      console.error("Failed to restore item:", error);
      setPageError(error instanceof Error ? error.message : "Failed to restore item.");
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleHardDelete(row: FinanceItemRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    const confirmed = window.confirm(
      "Permanently delete this item? Existing transaction line items will keep historical text but may lose the item link."
    );

    if (!confirmed) return;

    try {
      setRunningAction("hard-delete");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await permanentlyDeleteItem(row.id);
      setPageMessage("Item permanently deleted.");
      await loadData("silent");
    } catch (error) {
      console.error("Failed to permanently delete item:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to permanently delete item."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading items"
        description="Item records, linked master data, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Item Master Data", tone: "cyan" },
          { label: "Sales & Procurement", tone: "emerald" },
          { label: "Permission filtered", tone: "cyan" },
          { label: "Realtime + 60s fallback", tone: "neutral" },
        ]}
        gradientTitle="Items"
        title="Registry"
        subtitle="Product, Service, Component & Assembly Master Data"
        description="Master records for products, services, components, and assemblies used across quotations, invoices, purchasing, costing, sourcing, and future inventory or manufacturing workflows."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No item finance access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read or Master Data access."
        />
      ) : (
        <AixiaSection
          title="Item Registry"
          description="Active and inactive item records. Archived items are managed only through the archive modal."
          icon={Package}
        >
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code, name, type, description, notes, or currency..."
              />
            }
            filters={
              <>
                <AixiaSelectField
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="all" className="bg-[#05070d]">
                    All Statuses
                  </option>
                  <option value="active" className="bg-[#05070d]">
                    Active
                  </option>
                  <option value="inactive" className="bg-[#05070d]">
                    Inactive
                  </option>
                </AixiaSelectField>

                <AixiaSelectField
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                >
                  <option value="all" className="bg-[#05070d]">
                    All Types
                  </option>
                  <option value="product" className="bg-[#05070d]">
                    Product
                  </option>
                  <option value="service" className="bg-[#05070d]">
                    Service
                  </option>
                  <option value="component" className="bg-[#05070d]">
                    Component
                  </option>
                  <option value="assembly" className="bg-[#05070d]">
                    Assembly
                  </option>
                </AixiaSelectField>
              </>
            }
            primaryAction={
              permissionState.canCreate ? (
                <AixiaButton type="button" variant="primary" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  New Item
                </AixiaButton>
              ) : null
            }
            archiveAction={
              permissionState.canDeleteArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={openArchiveModal}
                  disabled={isActionRunning}
                >
                  {runningAction === "archive-modal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  Archive
                </AixiaButton>
              ) : null
            }
          />
          {filteredRows.length === 0 ? (
            <AixiaEmptyState
              icon={Package}
              title="No visible items found"
              description="Create an item or adjust search and filters to find product, service, component, or assembly records."
            />
          ) : (
            <AixiaTableShell variant="registry">
              <thead className="aixia-table-head">
                <tr>
                  <th>
                    <AixiaSortableHeader
                      label="Code"
                      sortKey="code"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Name"
                      sortKey="name"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Type"
                      sortKey="item_type"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Sales"
                      sortKey="sales_price"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Purchase"
                      sortKey="purchase_price"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Cost"
                      sortKey="standard_cost"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Status"
                      sortKey="status"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Updated"
                      sortKey="updated_at"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="md"
                        primary={row.code || "—"}
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.description?.trim() || "No description"}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone={getItemTypeTone(row.item_type)}>
                          {formatStatusLabel(row.item_type)}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="md"
                        primary={formatMoneyLabel(row.sales_price, row.currency_code)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={formatMoneyLabel(row.purchase_price, row.currency_code)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={formatMoneyLabel(row.standard_cost, row.currency_code)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        {permissionState.canUpdate ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => openEditDialog(row)}
                            disabled={saving}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </AixiaButton>
                        ) : null}

                        {permissionState.canDeleteArchive ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchive(row)}
                            disabled={isActionRunning || saving}
                          >
                            {isRowActionRunning && runningAction === "archive" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                            Archive
                          </AixiaButton>
                        ) : null}
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </AixiaSection>
      )}

      <AixiaAccessRule
        title="Locked access rule"
        description="Finance registry pages must show the shared Locked access rule block."
      >
        This registry shows active and inactive item records only. Archived records are managed from the archive modal. Edit uses primary styling, Restore uses secondary styling, and Archive/Delete Permanently use danger styling. Silent refresh must not reset filters, sorting, modals, or table position.
      </AixiaAccessRule>

      <AixiaArchiveManagerModal
        open={archiveModalOpen}
        title="Archived Items"
        description="Archived items can be restored or permanently deleted. Permanent delete is restricted to Delete/Archive access."
        archivedCount={archivedRows.length}
        onClose={closeArchiveModal}
      >
        <div className="space-y-4">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived items"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived items"
              description="Archived product, service, component, and assembly records will appear here."
            />
          ) : (
            <AixiaTableShell variant="archive">
              <thead className="aixia-table-head">
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Currency</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={`${row.code || "No code"} • ${
                          row.description?.trim() || "No description"
                        }`}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone={getItemTypeTone(row.item_type)}>
                          {formatStatusLabel(row.item_type)}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaCurrencyBadge value={row.currency_code} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        {permissionState.canUpdate ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => openEditDialog(row)}
                            disabled={saving}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </AixiaButton>
                        ) : null}

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestore(row)}
                          disabled={isRowActionRunning || saving}
                        >
                          {isRowActionRunning && runningAction === "restore" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => void handleHardDelete(row)}
                          disabled={isRowActionRunning || saving}
                        >
                          {isRowActionRunning && runningAction === "hard-delete" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete Permanently
                        </AixiaButton>
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>

      <ItemFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        revenueCategories={revenueCategories}
        expenseCategories={expenseCategories}
        taxCodes={taxCodes}
        units={units}
        vendors={vendors}
        currencies={currencies}
        saving={saving}
        error={formError}
        canSave={editingRow ? permissionState.canUpdate : permissionState.canCreate}
        onClose={closeDialog}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </AixiaPage>
  );
}
